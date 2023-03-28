const questionArea = document.getElementById('question-area');
const messages = document.getElementById('messages');
let questions = ['Is it a noun?'];
questions.forEach(processQuestion)

// URL = 'http://127.0.0.1:5001'
URL = 'http://ec2-34-192-101-140.compute-1.amazonaws.com:5000'

let soundsLikeHints = [];
let meaningHints = [];
let startTime = null;

let timerInterval = null;
let garbageHints = [];
let gameId = null;

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function addMessage(message, isQuestion) {
    const li = document.createElement('li');
    li.classList.add('speech-bubble');
    if (isQuestion) {
        li.classList.add('question-bubble');
    }

    // Split the message into words and create clickable elements
    const words = message.replace(/\s+/g, ' ').split(' ');
    words.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        if (word !== 'Q:' && word !== 'A:' && isQuestion) {
            wordSpan.classList.add('clickable-word');
            wordSpan.addEventListener('click', async () => {
                const data = await makeWordIntoHint(word, false);
                // Do something with the hint, like displaying it
                soundsLikeHints = data.soundsLikeHints;
                meaningHints = data.meaningHints;
                updateHintsWidget();
            });
            wordSpan.addEventListener('contextmenu', async (e) => {
                e.preventDefault()
                const data = await makeWordIntoHint(word, true);
                // Do something with the hint, like displaying it
                soundsLikeHints = data.soundsLikeHints;
                meaningHints = data.meaningHints;
                updateHintsWidget();
            });
        }

        li.appendChild(wordSpan);

        // Add space after each word except for the last word
        if (index !== words.length - 1) {
            li.appendChild(document.createTextNode(' '));
        }
    });

    messages.appendChild(li);
}

function fadeOutAndRemove(element, delay) {
    setTimeout(() => {
        element.classList.add('fade-out');
        setTimeout(() => {
            element.remove();
        }, 1000);
    }, delay);
}

function stripPunctuation(str) {
    return str.replace(/[^\w\s-]/g, '').replace(/[\s]+/g, ' ').trim().toLowerCase();
}

async function makeWordIntoHint(word, isSoundsLike) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: stripPunctuation(word), hintType: isSoundsLike ? 'sounds_like' : 'meaning', gameId}),
    };

    const response = await fetch(`${URL}/hints`, requestOptions);
    const data = await response.json();
    return data;
}

// function fadeOutAndRemove(element) {
//     let opacity = 1;
//     const start = Date.now();
//     const interval = setInterval(() => {
//       const elapsed = Date.now() - start;
//       if (elapsed >= 5000 && elapsed < 8000) {
//         opacity -= 0.01;
//         element.style.opacity = opacity;
//         setTimeout(() => {
//             element.style.transition = 'opacity 2s ease-in-out';
//             element.style.opacity = '0';
//         }, 5000);
//       } else if (elapsed >= 8000) {
//         clearInterval(interval);
//         element.remove();
//       }
//     }, 10);
// }

function fadeOutAndRemove(element, duration) {
const start = Date.now();

function update() {
    const elapsed = Date.now() - start;
    const opacity = 1 - Math.min(1, elapsed / duration);
    element.style.opacity = opacity;

    if (opacity === 0) {
        element.removeEventListener('click', handleClick);
        element.removeEventListener('contextmenu', handleClick);
        element.parentNode.removeChild(element);
    } else {
        requestAnimationFrame(update);
    }
}

setTimeout(() => {
    requestAnimationFrame(update);
}, 10000); // start fading out after 5 seconds
}

async function getNewQuestions(newQuestion, answer) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newQuestion: newQuestion, userReply: answer, password: localStorage.getItem('password'), gameId }),
    };

    console.log("Sending request to /questions", requestOptions);

    const response = await fetch(`${URL}/questions`, requestOptions);
    const data = await response.json();

    if (data.victory) {
        displayVictoryMessage(data.goalWord, data.victoryTime, data.winningQuestion);
    } else {
        return data.questions;
    }    
}

function formatTimeDelta(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;
    const roundedSec = Math.round(sec * 10) / 10;
  
    const formatUnit = (value, unit) => {
      return value > 0 ? `${value} ${unit}${value === 1 ? '' : 's'}` : '';
    };
  
    const formattedHours = formatUnit(hours, 'hour');
    const formattedMinutes = formatUnit(minutes, 'minute');
    const formattedSeconds = formatUnit(roundedSec, 'second');
  
    const timeStringArray = [formattedHours, formattedMinutes, formattedSeconds].filter(str => str.length > 0);
    const lastElement = timeStringArray.pop();
    const timeString = timeStringArray.length > 0 ? `${timeStringArray.join(', ')} and ${lastElement}` : lastElement;
  
    return timeString;
}

function displayVictoryMessage(goalWord, victoryTime, winningQuestion) {
    const victoryMessage = document.createElement('div');
    victoryMessage.innerHTML = `You win! You got to the word <strong>${goalWord}</strong> in <strong>${formatTimeDelta(victoryTime)}</strong>. You won when ChatGPT asked: ${winningQuestion} `;
    victoryMessage.style.fontSize = '2em';
    victoryMessage.style.textAlign = 'center';
    victoryMessage.style.marginTop = '2em';

    // Clear the current content
    document.body.innerHTML = '';

    // Add the victory message to the body
    document.body.appendChild(victoryMessage);
}

function handleClick(e) {
    e.preventDefault(); 

    const answer = e.button === 0 ? 'yes' : 'no';
    const question = e.target.textContent;
    addMessage(`Q: ${question}`, true);
    addMessage(`A: ${answer}`, false);

    e.target.remove();
    askQuestion(question, answer);
}

function hintReminder() {
    addMessage(`Q: I'm a bit stuck. What should I do?`, true);
    addMessage(`A: Remember your hints. Try guessing my word!`, false);

    askQuestion('', 'hints_reminder');
}

function rootsReminder() {
    addMessage(`Q: I'm a bit stuck. What should I do?`, true);
    addMessage(`A: Try guessing a word that shares a root with a word in the list of hints`, false);

    askQuestion('', 'roots_reminder');
}

function removeHint() {
    mousedOver && mousedOver.remove()
}


function processQuestion(question) {
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = question;
    bubble.addEventListener('click', handleClick);
    bubble.addEventListener('contextmenu', handleClick);

    bubble.addEventListener('mouseenter', () => { mousedOver = bubble });
    bubble.addEventListener('mouseleave', () => { mousedOver = null});
    questionArea.appendChild(bubble);

    fadeOutAndRemove(bubble, 30000);    
}


async function askQuestion(question, answer) {
    try {
        const newQuestion = answer === 'hints_reminder' || answer === 'roots_reminder' ? "I'm a bit stuck. What should I do?" : question;
        const newQuestionsFromServer = await getNewQuestions(newQuestion, answer);
        questions.push(...newQuestionsFromServer);

        newQuestionsFromServer.forEach(processQuestion);
    } catch (error) {
        console.error('Error:', error);
    }
}

function clearQuestions() {
    questionArea.innerHTML = '';
    messages.innerHTML = '';
    questions = ['Is it a noun?'];
    questions.forEach(processQuestion)
}

async function startOver() {
    clearQuestions();
    await getNewQuestions(null, null);
}

async function startNewGame() {
    try {
        const goalWordDisplay = document.getElementById('new-word-text-field');
        console.log(goalWordDisplay)
        const newGoalWord = goalWordDisplay?.value;
        const body = JSON.stringify({ goalWord: newGoalWord })
        console.log(newGoalWord)
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body,
        };
        const response = await fetch(`${URL}/new_game`, requestOptions);
        const data = await response.json();
        startTime = data.gameStartTime * 1000;
        goalWord = data.goalWord;
        gameId = data.gameId;
        // const goalWordDisplay = document.getElementById('goal-word-display');
        // goalWordDisplay.textContent = `The word is ${goalWord}`;
      } catch (error) {
        console.error('Error:', error);
      }
    
      startOver();
      meaningHints = [];
      soundsLikeHints = [];
      garbageHints = [];
      updateHintsWidget();
      updateGarbageWidget();
      await getNewQuestions(null, null);

      if (goalWord) {
        const goalWordDisplay = document.getElementById('goal-word-display');
        goalWordDisplay.textContent = `The goal word is ${goalWord}`;
        startTimer();
      }

}


function updateHintsWidget() {
    const meaningHintsList = document.getElementById('meaning-hints');
    const soundsLikeHintsList = document.getElementById('sounds-like-hints');
  
    // Clear existing hints
    meaningHintsList.innerHTML = '';
    soundsLikeHintsList.innerHTML = '';
  
    // Add meaning hints
    meaningHints.forEach((hint) => {
      const li = document.createElement('li');
      li.textContent = hint;
      li.classList.add('clickable-hint');
      li.addEventListener('click', async (e) => {
        e.preventDefault();
        await deleteHint(hint, 'meaning');
      })
      li.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        await deleteHint(hint, 'meaning');
        const data = await makeWordIntoHint(hint, true);
        // Do something with the hint, like displaying it
        soundsLikeHints = data.soundsLikeHints;
        meaningHints = data.meaningHints;
        updateHintsWidget();
      });
      meaningHintsList.appendChild(li);
    });
  
    // Add sounds like hints
    soundsLikeHints.forEach((hint) => {
      const li = document.createElement('li');
      li.textContent = hint;
      li.classList.add('clickable-hint');
      li.addEventListener('click', async (e) => {
        e.preventDefault();
        await deleteHint(hint, 'sounds_like');
        const data = await makeWordIntoHint(hint, false);
        // Do something with the hint, like displaying it
        soundsLikeHints = data.soundsLikeHints;
        meaningHints = data.meaningHints;
        updateHintsWidget();
      })
      li.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        await deleteHint(hint, 'sounds_like');
      });
      soundsLikeHintsList.appendChild(li);
    });
  }

  async function deleteHint(hint, hintType) {
    const requestOptions = {
      method: 'DELETE',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hint: hint, hintType: hintType, gameId }),
    };
  
    const response = await fetch(`${URL}/hints`, requestOptions);
  
    if (response.ok) {
      // Move the hint to the garbage and update the widgets
      await moveToGarbage(hint, hintType);
    } else {
      console.error('Error deleting the hint:', response.statusText);
    }
  }
  
  function updateGarbageWidget() {
    const garbageHintsList = document.getElementById('hints-garbage');

    // Clear existing hints
    garbageHintsList.innerHTML = '';

    // Add hints to the garbage widget
    garbageHints.forEach((hint) => {
        const li = document.createElement('li');
        li.textContent = hint;
        li.classList.add('clickable-word');
        li.addEventListener('click', async () => {
            const data = await makeWordIntoHint(hint, false);
            // Do something with the hint, like displaying it
            soundsLikeHints = data.soundsLikeHints;
            meaningHints = data.meaningHints;
            updateHintsWidget();
        });
        li.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            const data = await makeWordIntoHint(hint, true);
            // Do something with the hint, like displaying it
            soundsLikeHints = data.soundsLikeHints;
            meaningHints = data.meaningHints;
            updateHintsWidget();
        });

        garbageHintsList.appendChild(li);
    });
}

function updateGarbageWidget() {
    const garbageHintsList = document.getElementById('hints-garbage');

    // Clear existing hints
    garbageHintsList.innerHTML = '';

    // Add hints to the garbage widget
    garbageHints.forEach((hint) => {
        const li = document.createElement('li');
        li.textContent = hint;
        li.classList.add('clickable-word');
        li.addEventListener('click', async () => {
            const data = await makeWordIntoHint(hint, false);
            // Do something with the hint, like displaying it
            soundsLikeHints = data.soundsLikeHints;
            meaningHints = data.meaningHints;
            updateHintsWidget();
        });
        li.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            const data = await makeWordIntoHint(hint, true);
            // Do something with the hint, like displaying it
            soundsLikeHints = data.soundsLikeHints;
            meaningHints = data.meaningHints;
            updateHintsWidget();
        });

        garbageHintsList.appendChild(li);
    });
}

async function moveToGarbage(hint, hintType) {
    // Add the hint to the garbageHints array
    if (!garbageHints.includes(hint)) {
        garbageHints.push(hint);
    }

    // Remove the hint from the original array and update the widgets
    if (hintType === 'meaning') {
        meaningHints = meaningHints.filter((item) => item !== hint);
    } else if (hintType === 'sounds_like') {
        soundsLikeHints = soundsLikeHints.filter((item) => item !== hint);
    }
    updateHintsWidget();
    updateGarbageWidget();
}

window.addEventListener('load', () => {
    startNewGame();
    askQuestion();
    mousedOver = null;
});


window.addEventListener('load', () => {
    // startOver();

    const handleKeyDown = async (event) => {
        if (event.key === 's') {
            await startOver();
        }
        if (event.key === 'n') {
            await startNewGame();
        }
        if (event.key === 'h') {
            await hintReminder();
        }
        if (event.key === 'r') {
            await rootsReminder();
        }
        if (event.key === 'd') {
            removeHint();
        }
        if (event.key === 'Escape') {
            exitHowToPlay();
        }

    }

    document.addEventListener('keydown', handleKeyDown);
    const startNewGameButton = document.getElementById('start-new-game-btn');
    startNewGameButton.addEventListener('click', async () => {
        await startNewGame();
    });
    const startOverButton = document.getElementById('start-over-btn');
    startOverButton.addEventListener('click', async () => {
        await startOver();
    });    

    const inputField = document.getElementById('new-word-text-field');

    // Add focus and blur event listeners to the input field
    inputField.addEventListener('focus', () => {
    // Remove the keydown listener from the document when the input field is focused
    document.removeEventListener('keydown', handleKeyDown);
    });

    inputField.addEventListener('blur', () => {
    // Add the keydown listener back to the document when the input field is blurred 
    document.addEventListener('keydown', handleKeyDown);
    });

});

function exitHowToPlay() {
    const howToPlayPopup = document.getElementById('how-to-play-popup');
    howToPlayPopup.style.visibility = 'hidden';
    howToPlayPopup.style.opacity = '0';
}


function toggleHowToPlay() {
    const howToPlayPopup = document.getElementById('how-to-play-popup');
    console.log(howToPlayPopup);
    if (howToPlayPopup.style.visibility === 'hidden') {
      howToPlayPopup.style.visibility = 'visible';
      howToPlayPopup.style.opacity = '1';
    } else {
      howToPlayPopup.style.visibility = 'hidden';
      howToPlayPopup.style.opacity = '0';
    }
  }