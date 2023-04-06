const goalWordInput = document.getElementById('goal-word-input');
const submitGoalWord = document.getElementById('submit-goal-word');
let goalWord = '';
let gameId = '123';

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

function onLoad () {
    goalWordInput.focus();
}

async function displayLeaderboard() {
    let [goalWordTypeContainer, goalWordContainer] = await leaderboardElements(goalWord, gameId);
    const leaderboardMessage = document.createElement('div');

    leaderboardMessage.appendChild(goalWordTypeContainer);
    leaderboardMessage.appendChild(goalWordContainer);

    document.body.innerHMTL = '';

    document.body.appendChild(leaderboardMessage);
}

window.addEventListener('load', onLoad);