// DOM Elements
const recordButton = document.getElementById('recordButton');
const scriptInput = document.getElementById('scriptInput');
const wordCountElement = document.getElementById('wordCount');
const estimatedTimeElement = document.getElementById('estimatedTime');
const scriptDisplay = document.getElementById('scriptDisplay');
const feedbackElement = document.getElementById('feedback');
const targetTimeInput = document.getElementById('targetTime');
const timer = new Timer();

let isRecording = false;
let currentWordIndex = 0;
let scriptWords = [];
let spokenWords;
let targetTime = -1;

// Initialize Speech Recognition API
let recognition = null;
if (checkSpeechRecognitionSupport()) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.lang = "en-US";

    recognition.onresult = function(event) {
        if (!isRecording) {
            return; 
        }

        // Create a transcript of the speech recognition results as an array of words
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ');
        
        if (!timer.isRunning) {
            timer.start();
        }
        
        const words = transcript.split(' ');
        spokenWords = matchWords(scriptWords, words, spokenWords);
        updateWordHighlighting();
        realTimeFeedback();
    };


    addListeners();
}

// Check if Speech Recognition API is supported by browser and display error message if not
function checkSpeechRecognitionSupport() {
    const errorMessage = document.getElementById('errorModal');
    
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        // Speech recognition API not supported by browser
        errorMessage.style.display = 'block';
        recordButton.disabled = true;
        return false;
    }
    
    errorMessage.style.display = 'none';
    return true;
}

function addListeners() {
    document.addEventListener('DOMContentLoaded', function() {
        const howToToggle = document.getElementById('howToToggle');
        const howToContent = document.getElementById('howToContent');
    
        howToToggle.addEventListener('click', () => {
            const isExpanded = howToToggle.getAttribute('aria-expanded') === 'true';
            howToToggle.setAttribute('aria-expanded', !isExpanded);
            howToContent.classList.toggle('show');
        });
    });

    recordButton.addEventListener('click', function() {
        const that = this;
        if (!isRecording) {
            // check if script is empty
            if (!scriptInput.value.trim()) {
                const warningModal = document.getElementById('warningModal');
                warningModal.style.display = 'block';
                
                document.getElementById('okWarning').onclick = function() {
                    warningModal.style.display = 'none';
                };
                return;
            }

            // check if target time is empty
            if (!targetTimeInput.value) {
                const modal = document.getElementById('timeModal');
                const modalEstTime = document.getElementById('modalEstimatedTime');
                const estimatedSeconds = estimateSpeechLength(scriptInput.value);
                
                modalEstTime.textContent = estimatedSeconds;
                modal.style.display = 'block';
                
                // user can also use estimated time as target time, if not provided
                document.getElementById('useEstimatedTime').onclick = function() {
                    targetTime = estimatedSeconds;
                    modal.style.display = 'none';
                    startRecording();
                    that.textContent = 'Stop Recording';
                    that.classList.add('recording');
                    scriptInput.disabled = true;
                };
                
                document.getElementById('cancelModal').onclick = function() {
                    modal.style.display = 'none';
                };
                
                return;
            }

            startRecording();
            this.textContent = 'Stop Recording';
            this.classList.add('recording');
            scriptInput.disabled = true;
        } else {
            stopRecording();
            this.textContent = 'Start Recording';
            this.classList.remove('recording');
            scriptInput.disabled = false;
        }
    });

    scriptInput.addEventListener('input', function() {
        const text = this.value;
        const wordCount = calculateWordCount(text);
        const estimatedTime = estimateSpeechLength(text);
        
        wordCountElement.textContent = `Word Count: ${wordCount}`;
        estimatedTimeElement.textContent = `Estimated Time: ${estimatedTime}s`;
        updateScriptDisplay(text);
    });
}

function startRecording() {
    timer.reset();
    recognition.start();
    isRecording = true;
    currentWordIndex = 0;
    scriptWords = scriptInput.value.trim().split(/[\s-]+/);
    spokenWords = [];
    updateScriptDisplay(scriptInput.value);
}

function updateScriptDisplay(text) {
    scriptDisplay.innerHTML = '';
    const words = text.trim().split(/[\s-]+/);
    
    words.forEach(word => {
        if (word) {  // Only create spans for non-empty words
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.classList.add('word', 'unspoken');
            scriptDisplay.appendChild(span);
        }
    });
}

function stopRecording() {
    isRecording = false;
    recognition.stop();
    timer.stop();

    const results = analyzeResults(spokenWords, targetTime, scriptInput.value);
    showResults(results);
}

function showResults(results) {
    const resultsModal = document.getElementById('resultsModal');
    
    document.getElementById('accuracyResult').innerHTML = 
            `<span class="value">${results.accuracyPercentage}%</span><small>of words spoken correctly</small>`;
        
    document.getElementById('timingResult').innerHTML = 
            `<span class="value">${results.actualDuration}s / ${results.targetTime}s</span><small>actual/target time</small>`;
        
    document.getElementById('skippedResult').innerHTML = 
            `<span class="value">${results.skippedPercentage}%</span><small>${results.skippedWords} words</small>`;
    
    const timeline = document.getElementById('paceTimeline');
    timeline.innerHTML = results.paceAnalysis.map(segment => `
        <div class="pace-segment ${segment.state}">
            <strong>${Math.round(segment.start)}s - ${Math.round(segment.end)}s:</strong>
            ${segment.words.join(' ')}
        </div>
    `).join('');
    
    resultsModal.style.display = 'block';
    
    document.getElementById('closeResults').onclick = function() {
        resultsModal.style.display = 'none';
    };
}

function updateWordHighlighting() {
    const wordElements = scriptDisplay.getElementsByClassName('word');
    Array.from(wordElements).forEach((element, index) => {
        element.classList.remove('unspoken', 'spoken', 'missed', 'skipped');
        element.classList.add(spokenWords[index].state);
    });
}

function realTimeFeedback() {
    const elapsedTime = timer.elapsedTime / 1000;
    const totalWords = scriptWords.length;

    let wordsSpoken = 0;
    
    // Get words spoken by getting the index of the last spoken word
    // This is more accurate than counting the number of spoken words
    // because some words may be skipped
    for (let i = spokenWords.length - 1; i >= 0; i--) {
        if (spokenWords[i].state === 'spoken') {
            wordsSpoken = i + 1;
            break;
        }
    }
    
    // Check last 20 words for clarity
    const lastTwentyWords = spokenWords.slice(Math.max(0, wordsSpoken - 20), wordsSpoken);
    const missedWords = lastTwentyWords.filter(word => word.state === 'missed').length;
    const missedRatio = missedWords / lastTwentyWords.length;
    
    const expectedWordsAtCurrentTime = (totalWords * elapsedTime) / targetTime;
    
    if (missedRatio > 0.3) {
        // If more than 30% of last 20 words were missed
        feedbackElement.textContent = 'Speak more clearly!';
        feedbackElement.className = 'feedback too-unclear';
    } else if (wordsSpoken < expectedWordsAtCurrentTime - 5) {
        // If spoken words are more than 5 words behind expected words
        feedbackElement.textContent = 'Speak faster!';
        feedbackElement.className = 'feedback too-slow';
    } else if (wordsSpoken > expectedWordsAtCurrentTime + 5) {
        // If spoken words are more than 5 words ahead of expected words
        feedbackElement.textContent = 'Speak slower!';
        feedbackElement.className = 'feedback too-fast';
    } else {
        feedbackElement.textContent = 'Good pace!';
        feedbackElement.className = 'feedback';
    }
}