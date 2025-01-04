function matchWords(script, words, wordStates, minSpeakTimeThreshold = 300) {
    // Initialize wordStates array if it doesn't exist
    if (!wordStates || wordStates.length === 0) {
        wordStates = script.map(word => ({
            word: word.replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase(),
            state: "unspoken",
            lastMatchTime: 0
        }));
    }

    if (words.length === 0) {
        return wordStates;
    }

    // Get last spoken word in lowercase
    const currentTime = Date.now();

    // Find matching word in script
    let matchedWord;
    let matchedWordIndex = -1;
    for (let j = 0; j < words.length; j++) {
        for (let i = 0; i < wordStates.length; i++) {
            if (wordStates[i].word === words[j].toLowerCase()) {

                if (wordStates[i].state === "spoken") {
                    break;
                }

                // Find last word that was spoken
                let lastSpokenTime = 0;
                let lastSpokenIndex = -1;
                for (let j = wordStates.length - 1; j >= 0; j--) {
                    if (wordStates[j].state === "spoken") {
                        lastSpokenTime = wordStates[j].lastMatchTime;
                        lastSpokenIndex = j;
                    }
                }

                // Check if user is skipping words
                if (currentTime - lastSpokenTime < minSpeakTimeThreshold * (i - lastSpokenIndex)) {
                    break;
                }

                matchedWord = wordStates[i];

                // Mark word as spoken and update timestamp
                updateWordStates(matchedWord, "spoken", currentTime);

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