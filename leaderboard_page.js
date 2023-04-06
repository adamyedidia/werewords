const goalWordInput = document.getElementById('goalWordInput');
const submitGoalWord = document.getElementById('submitGoalWord');
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