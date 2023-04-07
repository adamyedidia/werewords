const requestOptions = {
      method: 'GET',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' }
}

async function fetchLeaderboards(goalWord, leaderboardType) {
    let target = `${URL}/leaderboard?${goalWord ? 'goalWord' : 'goalWordType'}=${goalWord ? goalWord : leaderboardType}`;
    const response = await fetch(target, requestOptions);
    const leaderboardData = await response.json();
    return leaderboardData;
}

// Passing no goal word and a leaderboard type lets you get a leaderboard without having a specific word in mind
async function leaderboardElements(goalWord, leaderboardType, gameId) {
    gameId = gameId ? gameId : 'not a real game id';
    const { goalWordType, goalWordTypeLeaderboard, goalWordLeaderboard } = await fetchLeaderboards(goalWord, leaderboardType);

    let goalWordTypeContent = `<h3>${capitalizeWords(goalWordType)} Words Leaderboard</h3><ol>`;
    for (let entry of goalWordTypeLeaderboard) {
        const [goalWord, leaderboardGameId, playerName, timeTaken] = entry;
        const listItem = `${playerName || 'Anonymous'} - ${goalWord} - ${formatTimeDelta(timeTaken)}`;
        goalWordTypeContent += `<li${(leaderboardGameId === gameId) ? ' class="bold"' : ''}>${listItem}</li>`;
    }
    goalWordTypeContent += '</ol>';

    let goalWordContent = goalWord ? `<h3>Leaderboard for "${goalWord}"</h3><ol>` : '';
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