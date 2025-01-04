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

// Initialize Speech Recognition API
let recognition = null;
if (checkSpeechRecognitionSupport()) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.lang = "en-US";

    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ');
        
        const words = transcript.split(' ');
        console.log(words);
        spokenWords = matchWords(scriptWords, words, spokenWords);
        console.log(spokenWords);
        updateWordHighlighting();
        checkSpeakingSpeed();
    };


    addListeners();
}

// Check if Speech Recognition API is supported by browser and display error message if not
function checkSpeechRecognitionSupport() {
    const errorMessage = document.getElementById('errorMessage');
    
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
    recordButton.addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
            this.textContent = 'Stop Recording';
            this.classList.add('recording');
        } else {
            stopRecording();
            this.textContent = 'Start Recording';
            this.classList.remove('recording');
        }
        isRecording = !isRecording;
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
    recognition.start();
    timer.start();
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
    recognition.stop();
    timer.stop();
}

function updateWordHighlighting() {
    const wordElements = scriptDisplay.getElementsByClassName('word');
    
    Array.from(wordElements).forEach((element, index) => {
        if (element.classList.contains('unspoken')) {
            element.classList.remove('unspoken');
            element.classList.add(spokenWords[index].state);
            return;
        }
    });
}

function checkSpeakingSpeed() {
    const targetTime = parseInt(targetTimeInput.value) || 60;
    const elapsedTime = timer.elapsedTime / 1000;
    const wordsSpoken = spokenWords.totalWordCount;
    const totalWords = scriptWords.length;
    
    const expectedWordsAtCurrentTime = (totalWords * elapsedTime) / targetTime;
    
    if (wordsSpoken < expectedWordsAtCurrentTime - 5) {
        feedbackElement.textContent = 'Speak faster!';
        feedbackElement.className = 'feedback too-slow';
    } else if (wordsSpoken > expectedWordsAtCurrentTime + 5) {
        feedbackElement.textContent = 'Speak slower!';
        feedbackElement.className = 'feedback too-fast';
    } else {
        feedbackElement.textContent = 'Good pace!';
        feedbackElement.className = 'feedback';
    }
}