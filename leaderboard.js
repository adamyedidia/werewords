async function fetchLeaderboard() {
    const response = await fetch(`${URL}/leaderboard?goalWordType=${localStorage.getItem('goalWordType')}`);
    const leaderboardData = await response.json();
    return leaderboardData;
}

const URL = CONFIG.URL;

async function onLoad() {
    const leaderboardMessage = document.createElement('div');
    const leaderboardData = await fetchLeaderboard();

    let leaderboardContent = '<h3>Leaderboard</h3><ol>';
    for (let entry of leaderboardData) {
        const [goalWord, playerName, timeTaken] = entry;
        leaderboardContent += `<li>${playerName || 'Anonymous'} - ${goalWord} - ${formatTimeDelta(timeTaken)}</li>`;
    }
    leaderboardContent += '</ol>';

    leaderboardMessage.innerHTML = leaderboardContent;

    document.body.innerHTML = '';

    document.body.appendChild(leaderboardMessage);
}

window.addEventListener('load', onLoad);
