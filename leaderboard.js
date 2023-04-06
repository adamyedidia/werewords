async function fetchLeaderboards(goalWord) {
    const response = await fetch(`${URL}/leaderboard?goalWordType=${localStorage.getItem('goalWordType')}&goalWord=${goalWord}`);
    const leaderboardData = await response.json();
    return leaderboardData;
}

async function leaderboardElements(goalWord, gameId) {
    const { goalWordTypeLeaderboard, goalWordLeaderboard } = await fetchLeaderboards(goalWord);

    let goalWordTypeContent = '<h3>Overall Leaderboard</h3><ol>';
    for (let entry of goalWordTypeLeaderboard) {
        const [goalWord, leaderboardGameId, playerName, timeTaken] = entry;
        const listItem = `${playerName || 'Anonymous'} - ${goalWord} - ${formatTimeDelta(timeTaken)}`;
        goalWordTypeContent += `<li${(leaderboardGameId === gameId) ? ' class="bold"' : ''}>${listItem}</li>`;
    }
    goalWordTypeContent += '</ol>';

    let goalWordContent = `<h3>Leaderboard for ${goalWord}</h3><ol>`;
    for (let entry of goalWordLeaderboard) {
        const [goalWord, leaderboardGameId, playerName, timeTaken] = entry;
        const listItem = `${playerName || 'Anonymous'} - ${goalWord} - ${formatTimeDelta(timeTaken)}`;
        goalWordContent += `<li${(leaderboardGameId === gameId) ? ' class="bold"' : ''}>${listItem}</li>`;
    }
    goalWordContent += '</ol>';

    const goalWordTypeContainer = document.createElement('div');
    const goalWordContainer = document.createElement('div');

    goalWordTypeContainer.innerHTML = goalWordTypeContent;
    goalWordContainer.innerHTML = goalWordContent;

    goalWordTypeContainer.style.width = '50%';
    goalWordTypeContainer.style.display = 'inline-block';
    goalWordTypeContainer.style.verticalAlign = 'top';
    goalWordContainer.style.width = '50%';
    goalWordContainer.style.display = 'inline-block';
    goalWordContainer.style.verticalAlign = 'top';

    return [goalWordTypeContainer, goalWordContainer];
}