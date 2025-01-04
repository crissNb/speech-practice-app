const PUNCTUATION_REGEX = /[^\w\s]|_/g;

function matchWords(script, words, wordStates, minSpeakTimeThreshold = 300, minSkipThreshold = 3) {
    // Initialize wordStates array if it doesn't exist
    if (!wordStates || wordStates.length === 0) {
        wordStates = script.map(word => ({
            word: word.replace(PUNCTUATION_REGEX, '').toLowerCase().trim(),
            state: "unspoken",
            lastMatchTime: 0
        }));
    }

    if (words.length === 0) {
        return wordStates;
    }

    // Get last spoken word in lowercase
    const currentTime = Date.now();

    // Find last word that was spoken
    let lastSpokenIndex = 0;
    let lastSpokenTime = currentTime;
    for (let k = wordStates.length - 1; k >= 0; k--) {
        if (wordStates[k].state === "spoken") {
            lastSpokenTime = wordStates[k].lastMatchTime;
            lastSpokenIndex = k;
            break;
        }
    }

    // Remove words that have already been spoken
    for (let i = 0; i < wordStates.length; i++) {
        for (let j = 0; j < words.length; j++) {
            if (wordStates[i].word === words[j].toLowerCase() && wordStates[i].state === "spoken") {
                words.splice(j, 1);
                break;
            }
        }
    }

    let skipCounter = 0;

    // Find matching word in script
    for (let j = 0; j < words.length; j++) {
        for (let i = 0; i < wordStates.length; i++) {
            if (wordStates[i].word === words[j].toLowerCase() && wordStates[i].state !== "skipped" && wordStates[i].state !== "spoken") {
                // Check if user is skipping words
                if (currentTime - lastSpokenTime < minSpeakTimeThreshold * (i - lastSpokenIndex) && i - lastSpokenIndex > minSkipThreshold) {
                    skipCounter++;
                    console.log(skipCounter + " skips, due to: " + wordStates[i].word + " reason: " + (currentTime - lastSpokenTime) + " < " + minSpeakTimeThreshold * (i - lastSpokenIndex));
                    if (skipCounter > minSkipThreshold) {
                        // User has skipped words and said the matching words more than three times
                        for (let k = lastSpokenIndex + 1; k < i - minSkipThreshold; k++) {
                            if (wordStates[k].state === "unspoken") {
                                updateWordStates(wordStates[k], "skipped", currentTime);
                            }
                        }
                    } else {
                        break;
                    }
                }

                // Mark word as spoken and update timestamp
                updateWordStates(wordStates[i], "spoken", currentTime);

                // Mark previous unspoken words as missed
                for (let k = 0; k < i; k++) {
                    if (wordStates[k].state === "unspoken") {
                        updateWordStates(wordStates[k], "missed", currentTime);
                    }
                }
                break;
            }
        }
    }

    return wordStates;
}

function updateWordStates(wordState, newWordState, matchTime) {
    if (wordState.state === newWordState) {
        return wordState;
    }

    wordState.state = newWordState;
    wordState.lastMatchTime = matchTime;
    return wordState;
}


function calculateWordCount(script) {
    return script.split(' ').length;
}

function estimateSpeechLength(script, averageWordDuration = 0.5) {
    if (!script) {
        return 0;
    }
    const wordCount = calculateWordCount(script);
    return wordCount * averageWordDuration;
}

function analyzeResults(spokenWords, targetTime) {
    const totalWords = spokenWords.length;
    const missedWords = spokenWords.filter(w => w.state === 'missed').length;
    const skippedWords = spokenWords.filter(w => w.state === 'skipped').length;
    const spokenWordsCount = spokenWords.filter(w => w.state === 'spoken').length;
    
    const lastTime = Math.max(...spokenWords.filter(w => w.state === 'spoken').map(w => w.lastMatchTime));
    const firstTime = Math.min(...spokenWords.filter(w => w.state === 'spoken').map(w => w.lastMatchTime));
    const actualDuration = (lastTime - firstTime) / 1000; // in seconds
    
    // Analyze pace variations
    const paceAnalysis = [];
    const expectedWordsPerSecond = totalWords / targetTime;
    let currentSegment = { start: 0, end: 0, state: 'normal', words: [] };
    
    spokenWords.forEach((word, index) => {
        if (word.state === 'spoken') {
            const prevTime = index > 0 ? spokenWords[index - 1].lastMatchTime : firstTime;
            const timeDiff = (word.lastMatchTime - prevTime) / 1000;
            const wordsPerSecond = 1 / timeDiff;
            
            const paceState = wordsPerSecond > expectedWordsPerSecond * 1.2 ? 'too-fast' :
                             wordsPerSecond < expectedWordsPerSecond * 0.8 ? 'too-slow' : 'normal';
                             
            if (paceState !== currentSegment.state) {
                if (currentSegment.words.length > 0) {
                    paceAnalysis.push(currentSegment);
                }
                currentSegment = {
                    start: prevTime - firstTime,
                    end: word.lastMatchTime - firstTime,
                    state: paceState,
                    words: [word.word]
                };
            } else {
                currentSegment.end = word.lastMatchTime - firstTime;
                currentSegment.words.push(word.word);
            }
        }
    });
    
    if (currentSegment.words.length > 0) {
        paceAnalysis.push(currentSegment);
    }

    return {
        totalWords,
        missedWords,
        skippedWords,
        spokenWordsCount,
        missedPercentage: (missedWords / totalWords * 100).toFixed(1),
        skippedPercentage: (skippedWords / totalWords * 100).toFixed(1),
        accuracyPercentage: (spokenWordsCount / totalWords * 100).toFixed(1),
        targetTime,
        actualDuration: actualDuration.toFixed(1),
        paceAnalysis
    };
}