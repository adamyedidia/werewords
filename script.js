const startingQuestions = ['Is it a noun?', 'Is it a verb?', 'Is it an adjective?'];
// Removing these starting indices wouldn't really do anything right now since it defaults 
// to this order anyway. I wanted to look at other ones but then I think
// the default is just fine, but I guess I'll leave it here in case.
const startingRows = [0, 0, 0]
const startingColumns = [0, 1, 2]
const questionArea = document.getElementById('question-area');
const messages = document.getElementById('messages');
const goalWordTypeDisplay = document.getElementById('new-word-type');
const grid = new Array(3).fill(null).map(() => new Array(4).fill(null));

function addToGrid(question, useThisRow, useThisColumn) {

    let oldestTimestamp = Infinity;
    let oldestRow = 0;
    let oldestColumn = 0;

    if (useThisRow != undefined && useThisColumn != undefined) {
        current = grid[useThisRow][useThisColumn];
        current && current.element.remove();
        grid[useThisRow][useThisColumn] = question;
        return { row: useThisRow , column: useThisColumn }
    }


    for (let row = 0; row < grid.length; row++) {
      for (let column = 0; column < grid[row].length; column++) {
        const currentQuestion = grid[row][column];
        
        if (!currentQuestion) {
          grid[row][column] = question;
          return { row, column };
        } else if (currentQuestion.timestamp < oldestTimestamp) {
          oldestTimestamp = currentQuestion.timestamp;
          oldestQuestion = currentQuestion;
          oldestRow = row;
          oldestColumn = column;
        }
      }
    }
  
    // Replace the oldest question with the new question
    grid[oldestRow][oldestColumn].element.remove()
    grid[oldestRow][oldestColumn] = question;
    return { row: oldestRow, column: oldestColumn };
  }

let questions = [...startingQuestions];
// questions.forEach(processQuestion)

let goalWordDefinition = "";
const goalWordDisplay = document.getElementById('goal-word-display');

goalWordDisplay.addEventListener('mouseenter', () => {
    goalWordDisplay.title = goalWordDefinition;
});

const URL = CONFIG.URL;

let soundsLikeHints = [];
let meaningHints = [];
let startTime = null;

let timerInterval = null;
let garbageHints = [];
let gameId = null;
let messageMousedOver = null;

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

function removeQuestionAreaBubble(question) {
    if (question.dataset.row && question.dataset.column) {
        grid[question.dataset.row][question.dataset.column] = null;
    }
    setTimeout(() => {
        question.remove();
      }, 200);
}

function addMessage(message, isQuestion, questionAnswerPairId) {
    const li = document.createElement('li');
    li.classList.add('speech-bubble');
    if (isQuestion) {
        li.classList.add('question-bubble');
    }

    // Check if the message is "A: yes" or "A: no" and add the appropriate class
    if (!isQuestion && message.trim().toLowerCase() === "a: yes") {
        li.classList.add('answer-yes');
    } else if (!isQuestion && message.trim().toLowerCase() === "a: no") {
        li.classList.add('answer-no');
    }

    // Set the questionAnswerPairId as a data attribute
    li.setAttribute('data-question-answer-pair-id', questionAnswerPairId);

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

    li.addEventListener('mouseenter', () => { messageMousedOver = li });
    li.addEventListener('mouseleave', () => { messageMousedOver = null });

    messages.appendChild(li);    
}

// This code was dead anyways and confusing since it had the same name as live code

// function fadeOutAndRemove(element, delay) {
//     setTimeout(() => {
//         element.classList.add('fade-out');
//         setTimeout(() => {
//             element.remove();
//         }, 1000);
//     }, delay);
// }

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

function fadeOut(element, duration) {
const start = Date.now();

function update() {
    const elapsed = Date.now() - start;
    const redComponent = 0;
    const greenComponent = 170 * Math.min(1, elapsed / duration);
    const blueComponent = 255 - ((255 - 187) * Math.min(1, elapsed / duration));
    color = `rgba(${redComponent}, ${greenComponent}, ${blueComponent}, 1)`
    element.style.background = color;
    element.style.borderTopColor = color;

    requestAnimationFrame(update);
}

    requestAnimationFrame(update);
}

async function getNewQuestions(newQuestion, answer, questionAnswerPairId) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            newQuestion: newQuestion, 
            userReply: answer, 
            password: localStorage.getItem('password'), 
            gameId, 
            questionAnswerPairId,
        }),
    };

    // console.log("Sending request to /questions", requestOptions);

    const response = await fetch(`${URL}/questions`, requestOptions);
    const data = await response.json();
    const reason = data.reason;

    if (reason === 'Wrong password') {
        localStorage.setItem('password', '');
        if (!localStorage.getItem('alerted')) {
            localStorage.setItem('alerted','true');
            alert('password was rejected by the server');
        }
        window.location.href = 'index.html';
    }

    if (data.victory) {
        await displayVictoryMessage(data.goalWord, data.victoryTime, data.winningQuestion);
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

async function fetchLeaderboard() {
    const response = await fetch(`${URL}/leaderboard?goalWordType=${localStorage.getItem('goalWordType')}`);
    const leaderboardData = await response.json();
    return leaderboardData;
  }

  async function displayVictoryMessage(goalWord, victoryTime, winningQuestion) {
    // Fetch leaderboard data
    const leaderboardData = await fetchLeaderboard();
  
    // Generate leaderboard content
    let leaderboardContent = '<h3>Leaderboard</h3><ol>';
    for (let entry of leaderboardData) {
      const [goalWord, playerName, timeTaken] = entry;
      leaderboardContent += `<li>${playerName} - ${goalWord} - ${formatTimeDelta(timeTaken)}</li>`;
    }
    leaderboardContent += '</ol>';
  
    const victoryMessage = document.createElement('div');
    const leaderboardMessage = document.createElement('div');
    const refreshMessage = document.createElement('div');
    const leaderboardNameInput = document.createElement('input');
    const submitLeaderboardNameButton = document.createElement('button');
  
    victoryMessage.innerHTML = `You win! You got to the word <strong>${goalWord}</strong> in <strong>${formatTimeDelta(victoryTime)}</strong>. You won when ChatGPT asked: ${winningQuestion} `;
    leaderboardMessage.innerHTML = leaderboardContent;
    refreshMessage.innerHTML = `(n to restart)`;
    leaderboardNameInput.placeholder = 'Leaderboard name';
    submitLeaderboardNameButton.textContent = 'Submit';
  
    victoryMessage.style.fontSize = '2em';
    victoryMessage.style.textAlign = 'center';
    victoryMessage.style.marginTop = '2em';
    leaderboardMessage.style.fontSize = '1em';
    leaderboardMessage.style.textAlign = 'center';
    leaderboardMessage.style.marginTop = '2em';
    leaderboardNameInput.style.display = 'block';
    leaderboardNameInput.style.margin = '2em auto';
    submitLeaderboardNameButton.style.display = 'block';
    submitLeaderboardNameButton.style.margin = '1em auto';
    refreshMessage.style.fontSize = '2em';
    refreshMessage.style.textAlign = 'center';
    refreshMessage.style.marginTop = '2em';
  
    // Clear the current content
    document.body.innerHTML = '';
  
    const handleKeyDownOnVictoryPage = async (e) => {
      if (e.key === 'n') {
        location.reload();
      }
    }
  
    document.body.addEventListener('keydown', handleKeyDownOnVictoryPage);
  
    // Add the victory message, leaderboard, and submission widget to the body
    document.body.appendChild(victoryMessage);
    document.body.appendChild(leaderboardMessage);
    document.body.appendChild(leaderboardNameInput);
    document.body.appendChild(submitLeaderboardNameButton);
    document.body.appendChild(refreshMessage);
  
    submitLeaderboardNameButton.addEventListener('click', async () => {
      const leaderboardName = leaderboardNameInput.value;
      if (leaderboardName) {
        // Make a POST request to /leaderboard_names with gameId and leaderboardName in the json body
        await fetch(`${URL}/leaderboard_names`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameId, leaderboardName }),
        });
  
        // Refresh the page to show the updated leaderboard
        location.reload();
      }
    });
  }

function generateRandomURLSafeString(bits) {
    const urlSafeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const charsInUrlSafeString = Math.ceil(bits / 6);
    let randomString = '';
  
    for (let i = 0; i < charsInUrlSafeString; i++) {
      const randomIndex = Math.floor(Math.random() * urlSafeChars.length);
      randomString += urlSafeChars.charAt(randomIndex);
    }
  
    return randomString;
}

function generateQuestionAnswerPairId() {
    return generateRandomURLSafeString(100);
}

function handleClick(e) {
    e.preventDefault(); 

    const answer = e.button === 0 ? 'yes' : 'no';
    const question = e.target.textContent;

    if (answer.toLowerCase() === 'yes') {
        e.target.classList.add('green-flash');
    } else if (answer.toLowerCase() === 'no') {
        e.target.classList.add('red-flash');
    }

    const questionAnswerPairId = generateQuestionAnswerPairId();

    setTimeout(() => {
        e.target.classList.remove('green-flash', 'red-flash');
    }, 500);

    addMessage(`Q: ${question}`, true, questionAnswerPairId);
    addMessage(`A: ${answer}`, false, questionAnswerPairId);

    removeQuestionAreaBubble(e.target)
    // e.target.remove();
    askQuestion(question, answer, questionAnswerPairId);
}

function hintReminder() {
    const questionAnswerPairId = generateQuestionAnswerPairId();

    addMessage(`Q: I'm a bit stuck. What should I do?`, true, questionAnswerPairId);
    addMessage(`A: Remember your hints. Try guessing my word!`, false, questionAnswerPairId);

    askQuestion('', 'hints_reminder', questionAnswerPairId);
}

function rootsReminder() {
    const questionAnswerPairId = generateQuestionAnswerPairId();

    addMessage(`Q: I'm a bit stuck. What should I do?`, true, questionAnswerPairId);
    addMessage(`A: Try guessing a word that shares a root with a word in the list of hints`, false, questionAnswerPairId);

    askQuestion('', 'roots_reminder', questionAnswerPairId);
}

function removeHint() {
    mousedOver && removeQuestionAreaBubble(mousedOver)
}


function processQuestion(question, useThisRow, useThisColumn) {
    const bubble = document.createElement('div');
    bubble.className = 'new-question-bubble speech-bubble';
    bubble.textContent = question;
    bubble.addEventListener('click', handleClick);
    bubble.addEventListener('contextmenu', handleClick);

    bubble.addEventListener('mouseenter', () => { mousedOver = bubble });
    bubble.addEventListener('mouseleave', () => { mousedOver = null});
    questionArea.appendChild(bubble);

    // Add the animation class
    bubble.classList.add('new-question-animation');

    // Remove the animation class after the animation is completed (0.5 seconds)
    setTimeout(() => {
        bubble.classList.remove('new-question-animation');
    }, 500);

    fadeOut(bubble, 20000);    

    const newQuestion = {
        element: bubble,
        timestamp: Date.now(),
        // other properties if needed
      };
      
      const position = addToGrid(newQuestion, useThisRow, useThisColumn);
      newQuestion.row = position.row;
      newQuestion.column = position.column;

      const containerWidth = 180; // change this to the desired container width
    const containerHeight = 200; // change this to the desired container height

    newQuestion.element.style.top = `${position.row * containerHeight}px`;
    newQuestion.element.style.left = `${position.column * containerWidth}px`;
    newQuestion.element.dataset.row = position.row;
    newQuestion.element.dataset.column = position.column;

}


async function askQuestion(question, answer, questionAnswerPairId) {
    try {
        const newQuestion = answer === 'hints_reminder' || answer === 'roots_reminder' ? "I'm a bit stuck. What should I do?" : question;
        const newQuestionsFromServer = await getNewQuestions(newQuestion, answer, questionAnswerPairId);
        questions.push(...newQuestionsFromServer);

        // Foreach passes the index and array if you don't do this little trivial anonymous function
        newQuestionsFromServer.forEach((q) => processQuestion(q) );
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteQuestion(questionAnswerPairId) {
    const requestOptions = {
        method: 'DELETE',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            questionAnswerPairId,
            password: localStorage.getItem('password'),
            gameId,
        }),
    };

    const response = await fetch(`${URL}/questions`, requestOptions);
    const data = await response.json();
    const reason = data.reason;

    if (data.victory) {
        displayVictoryMessage(data.goalWord, data.victoryTime, data.winningQuestion);
    } else {
        return data.questions;
    }    
}

async function editQuestion(questionAnswerPairId) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            questionAnswerPairId,
            password: localStorage.getItem('password'),
            gameId,
        }),
    };

    const response = await fetch(`${URL}/questions/edit`, requestOptions);

    const data = await response.json();
    const reason = data.reason;

    if (data.victory) {
        displayVictoryMessage(data.goalWord, data.victoryTime, data.winningQuestion);
    } else {
        return data.questions;
    }    
}


function clearQuestions() {
    grid.forEach((l) => l.fill(null));
    
    questionArea.innerHTML = '';
    messages.innerHTML = '';

    startingQuestions.forEach((q, i) => {
        processQuestion(q, startingRows[i], startingColumns[i])
    })
    
}

async function startOver() {
    clearQuestions();
    await getNewQuestions(null, null);
}

async function getGoalWordDefinition(goalWord) {
    const body = JSON.stringify({ word: goalWord });
    const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body,
    }
    const response = await fetch(`${URL}/definitions`, requestOptions);
    const data = await response.json();
    return data
}
async function startNewGame() {
    try {  
        const customGoalWordField = document.getElementById('new-word-text-field');
        const newGoalWord = customGoalWordField?.value;
        const newGoalWordType = goalWordTypeDisplay?.value ;
        if (newGoalWordType) {
            localStorage.setItem('goalWordType', newGoalWordType)
        }
        const body = JSON.stringify({ goalWord: newGoalWord , goalWordType: newGoalWordType === 'category' ? null : newGoalWordType })
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
        customGoalWordField.value = null;
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
        goalWordDefinition = await getGoalWordDefinition(goalWord);
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

function onLoad () {
    if (localStorage.getItem('goalWordType')) {
        goalWordTypeDisplay.value = localStorage.getItem('goalWordType'); 
    }

    startNewGame();
    mousedOver = null;
   
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
            
            if (messageMousedOver) {
                const questionAnswerPairId = messageMousedOver.getAttribute('data-question-answer-pair-id');
                const newQuestionsFromServer = await deleteQuestion(questionAnswerPairId);

                questions.push(...newQuestionsFromServer);
                newQuestionsFromServer.forEach((q) => processQuestion(q));

                for (let i = messages.children.length - 1; i >= 0; i--) {
                    const otherQuestionAnswerPairId = messages.children[i].getAttribute('data-question-answer-pair-id');
                                
                    if (questionAnswerPairId === otherQuestionAnswerPairId) {
                        // console.log(`deleting ${questionAnswerPairId}`);
                        messages.children[i].remove();
                    }
                }    
            } else {
                removeHint();
            }
        }
        if (event.key == 'e') {
            if (messageMousedOver) {
                const questionAnswerPairId = messageMousedOver.getAttribute('data-question-answer-pair-id');
                const newQuestionsFromServer = await editQuestion(questionAnswerPairId);

                questions.push(...newQuestionsFromServer);
                newQuestionsFromServer.forEach((q) => processQuestion(q) );

                for (let i = messages.children.length - 1; i >= 0; i--) {
                    if (questionAnswerPairId === messages.children[i].getAttribute('data-question-answer-pair-id') && messages.children[i].className == 'speech-bubble') {
                        tc = messages.children[i].children[1].textContent;
                        messages.children[i].children[1].textContent = tc === 'no' ? 'yes' : tc === 'yes' ? 'no' : tc;
                    }
                }    


            }
        }
        if (event.key === 'g') {
            event.preventDefault();
            inputField.focus();
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

    inputField.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            await startNewGame();
        }
        if (e.key === 'Escape') {
            inputField.blur();
        }
    })

    // Add focus and blur event listeners to the input field
    inputField.addEventListener('focus', () => {
    // Remove the keydown listener from the document when the input field is focused
    document.removeEventListener('keydown', handleKeyDown);
    });

    inputField.addEventListener('blur', () => {
    // Add the keydown listener back to the document when the input field is blurred 
    document.addEventListener('keydown', handleKeyDown);
    });

};

window.addEventListener('load', onLoad);

function exitHowToPlay() {
    const howToPlayPopup = document.getElementById('how-to-play-popup');
    // Without this, you hit escape on the victory screen it gets mad
    if (!howToPlayPopup) {
        return
    }
    howToPlayPopup.style.visibility = 'hidden';
    howToPlayPopup.style.opacity = '0';
}

document.addEventListener('DOMContentLoaded', function () {
    const howToPlayPopup = document.getElementById('how-to-play-popup');
    howToPlayPopup.style.visibility = 'hidden';
});

function toggleHowToPlay(event) {
    event.stopPropagation();
    const howToPlayPopup = document.getElementById('how-to-play-popup');
    const howToPlayBtnText = document.getElementById('how-to-play-btn-text');
    if (howToPlayPopup.style.visibility === 'hidden') {
      howToPlayPopup.style.visibility = 'visible';
      howToPlayPopup.style.opacity = '1';
      howToPlayBtnText.textContent = 'Close how to play';
    } else {
      howToPlayPopup.style.visibility = 'hidden';
      howToPlayPopup.style.opacity = '0';
      howToPlayBtnText.textContent = 'How to play';
    }
  }
