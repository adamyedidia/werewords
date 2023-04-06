const leaderboardTitle = document.getElementById('leaderboard-page-title');
const goalWordInput = document.getElementById('goal-word-input');
const submitGoalWord = document.getElementById('submit-goal-word');
let leaderboardMessage = document.createElement('div');
let goalWord = '';
let gameId = '123';

URL = CONFIG.URL;

function handleSubmitGoalWord() {
    goalWord = goalWordInput.value;

    displayLeaderboard();
}

submitGoalWord.addEventListener('click', handleSubmitGoalWord);

goalWordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSubmitGoalWord();
    }
});

async function displayLeaderboard() {
    let [goalWordTypeContainer, goalWordContainer] = await leaderboardElements(goalWord, gameId);

    while (leaderboardMessage.firstChild) {
        leaderboardMessage.removeChild(leaderboardMessage.firstChild)
    }

    leaderboardMessage.appendChild(goalWordTypeContainer);
    leaderboardMessage.appendChild(goalWordContainer);

    document.body.appendChild(leaderboardMessage);
}

window.addEventListener('load', goalWordInput.focus());