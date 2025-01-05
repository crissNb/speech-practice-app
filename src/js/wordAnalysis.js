const PUNCTUATION_REGEX = /[^\w\s]|_/g;
/**
 * Initializes word states from script
 * @param {string[]} script 
 * @returns {WordState[]}
 */
function initializeWordStates(script) {
    return script.map(word => ({
        word: word.replace(PUNCTUATION_REGEX, '').toLowerCase().trim(),
        state: "unspoken",
        lastMatchTime: 0
    }));
}

function _findLastSpokenWord(wordStates) {
    const currentTime = Date.now();
    for (let i = wordStates.length - 1; i >= 0; i--) {
        if (wordStates[i].state === "spoken") {
            return {
                index: i,
                time: wordStates[i].lastMatchTime
            };
        }
    }
    return { index: 0, time: currentTime };
}


function _removeSpokenWords(wordStates, words) {
    for (const state of wordStates) {
        const index = words.findIndex(word => 
            state.word === word.toLowerCase() && state.state === "spoken"
        );
        if (index !== -1) {
            words.splice(index, 1);
        }
    }
}

/**
 * Match spoken words with script words
 * @param {string[]} script
 * @param {string[]} words 
 * @param {WordState[]} wordStates 
 * @param {number} minSpeakTimeThreshold 
 * @param {number} minSkipThreshold 
 * @returns {WordState[]}
 */
function matchWords(script, words, wordStates, minSpeakTimeThreshold = 300, minSkipThreshold = 3) {
    if (!wordStates?.length) {
        wordStates = initializeWordStates(script);
    }

    if (!words.length) {
        return wordStates;
    }

    const currentTime = Date.now();
    const { index: lastSpokenIndex } = _findLastSpokenWord(wordStates);
    
    _removeSpokenWords(wordStates, words);

    let skipCounter = 0;

    for (const word of words) {
        const wordLower = word.toLowerCase();
        
        for (let i = 0; i < wordStates.length; i++) {
            const state = wordStates[i];
            
            if (state.word === wordLower && state.state !== "skipped" && state.state !== "spoken") {
                // Check if user is skipping words
                if (currentTime - wordStates[lastSpokenIndex].lastMatchTime < minSpeakTimeThreshold * (i - lastSpokenIndex) && i - lastSpokenIndex > minSkipThreshold) {
                    skipCounter++;
                    if (skipCounter > minSkipThreshold) {
                        // User has skipped words and said the matching words more than three times
                        for (let k = lastSpokenIndex + 1; k < i - minSkipThreshold; k++) {
                            if (wordStates[k].state === "unspoken") {
                                _updateWordStates(wordStates[k], "skipped", currentTime);
                            }
                        }
                    } else {
                        break;
                    }
                }

                _updateWordStates(state, "spoken", currentTime);
                
                // Mark previous unspoken words as missed
                for (let k = 0; k < i; k++) {
                    if (wordStates[k].state === "unspoken") {
                        _updateWordStates(wordStates[k], "missed", currentTime);
                    }
                }
                break;
            }
        }
    }

    return wordStates;
}

function _updateWordStates(wordState, newWordState, matchTime) {
    if (wordState.state === newWordState) {
        return wordState;
    }

    wordState.state = newWordState;

    if (wordState.state === "unspoken") {
        wordState.lastMatchTime = matchTime;
    }
    return wordState;
}


/**
 * Caluclate word count in a script
 * @param {string[]} script 
 * @returns {number}
 */
function calculateWordCount(script) {
    if (!script) {
        return 0;
    }
    return script.split(' ').length;
}

/**
 * Calculate estimated speech length based on word count and average word duration
 * @param {string[]} script 
 * @param {number} averageWordDuration 
 * @returns {number}
 */
function estimateSpeechLength(script, averageWordDuration = 0.5) {
    if (!script) {
        return 0;
    }
    const wordCount = calculateWordCount(script);
    return wordCount * averageWordDuration;
}

/**
 * Analyze spoken words and calculate results
 * @param {WordState[]} spokenWords 
 * @param {number} targetTime 
 * @param {string[]} originalScript 
 * @returns {Object} data analysis results
 */
function analyzeResults(spokenWords, targetTime, originalScript) {
    const totalWords = spokenWords.length;
    const skippedWords = spokenWords.filter(w => w.state === 'skipped').length;
    const spokenWordsCount = spokenWords.filter(w => w.state === 'spoken' || w.state === 'skipped').length;
    
    const lastTime = Math.max(...spokenWords.filter(w => w.state === 'spoken').map(w => w.lastMatchTime));
    const firstTime = Math.min(...spokenWords.filter(w => w.state === 'spoken').map(w => w.lastMatchTime));
    const actualDuration = (lastTime - firstTime) / 1000; // in seconds
    
    // Analyze pace variations
    const paceAnalysis = [];
    const sentences = originalScript.split(/[.!?]+/).filter(s => s.trim());
    let wordIndex = 0;
    
    // Analyze each sentence
    sentences.forEach(sentence => {
        const sentenceWords = sentence.trim().split(/\s+/);
        const sentenceLength = sentenceWords.length;
        
        // Get spoken words for this sentence
        const sentenceSpokenWords = spokenWords.slice(wordIndex, wordIndex + sentenceLength);
        
        // Get timing data
        const spokenInSentence = sentenceSpokenWords.filter(w => w.state === 'spoken');
        if (spokenInSentence.length > 0) {
            const sentenceStart = Math.min(...spokenInSentence.map(w => w.lastMatchTime));
            const sentenceEnd = Math.max(...spokenInSentence.map(w => w.lastMatchTime));
            const actualTime = (sentenceEnd - sentenceStart) / 1000; // convert to seconds
            
            // Calculate expected time for this sentence
            const expectedTime = (sentenceLength / spokenWords.length) * targetTime;
            
            // Analyze pace and clarity
            const missedWords = sentenceSpokenWords.filter(w => w.state === 'missed').length;
            const missedRatio = missedWords / sentenceLength;
            
            let state = 'normal';
            if (missedRatio > 0.3) {
                state = 'unclear';
            } else if (actualTime < expectedTime * 0.7) {
                state = 'too-fast';
            } else if (actualTime > expectedTime * 1.3) {
                state = 'too-slow';
            }
            
            paceAnalysis.push({
                start: (sentenceStart - firstTime) / 1000,
                end: (sentenceEnd - firstTime) / 1000,
                words: sentenceWords,
                expectedTime,
                actualTime,
                state
            });
        }
        
        wordIndex += sentenceLength;
    });

    return {
        totalWords,
        skippedWords,
        spokenWordsCount,
        skippedPercentage: (skippedWords / totalWords * 100).toFixed(1),
        accuracyPercentage: (spokenWordsCount / totalWords * 100).toFixed(1),
        targetTime,
        actualDuration: actualDuration.toFixed(1),
        paceAnalysis
    };
}