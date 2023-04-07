const leaderboardTitle = document.getElementById('leaderboard-page-title');
const goalWordInput = document.getElementById('goal-word-input');
const submitGoalWord = document.getElementById('submit-goal-word');
const toGamePage = document.getElementById('to-game-page');
const goalWordTypeDisplay = document.getElementById('leaderboard-word-type');
let leaderboardMessage = document.createElement('div');
let goalWord = '';

URL = CONFIG.URL;

if (localStorage.getItem('goalWordType')) {
    goalWordTypeDisplay.value = localStorage.getItem('goalWordType'); 
}

function handleSubmitGoalWord() {
    goalWord = goalWordInput.value;
    goalWordType = goalWordTypeDisplay.value;
    displayLeaderboard();
}

toGamePage.addEventListener('click', () => {
    window.location.href = 'game_page.html';
})

submitGoalWord.addEventListener('click', handleSubmitGoalWord);

goalWordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSubmitGoalWord();
    }
});

async function displayLeaderboard() {
    let [goalWordTypeContainer, goalWordContainer] = await leaderboardElements(goalWord, goalWordType);

    while (leaderboardMessage.firstChild) {
        leaderboardMessage.removeChild(leaderboardMessage.firstChild)
    }

    leaderboardMessage.appendChild(goalWordTypeContainer);
    leaderboardMessage.appendChild(goalWordContainer);

    document.body.appendChild(leaderboardMessage);
}

function handleKeyDown(e) {
    if (e.key === 'g') {
        e.preventDefault();
        goalWordInput.focus();
    }
}

document.addEventListener('keydown', handleKeyDown);

goalWordInput.addEventListener('focus', () => {
    document.removeEventListener('keydown', handleKeyDown);
});

goalWordInput.addEventListener('blur', () => {
    document.addEventListener('keydown', handleKeyDown);
});

window.addEventListener('load', goalWordInput.focus());