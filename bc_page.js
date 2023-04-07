const bcInput = document.getElementById('bc-input');
const bcAnswer = document.getElementById('bc-answer');

URL = CONFIG.URL;

async function evaluate(bc) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bc: bc }),
    }

    const response = await fetch(`${URL}/bc`, requestOptions);
    return await response.json();
}

async function getFunctions() {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
    }

    const response = await fetch(`${URL}/bc/functions`, requestOptions);
    return await response.json();
}

async function handleSubmitBc() {
    let answer = await evaluate(bcInput.value);
    if (answer === 'parse failure') {
        bcAnswer.style.color = 'red';
    } else {
        bcAnswer.style.color = 'black';
    }
    bcAnswer.textContent = answer;
}

bcInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        handleSubmitBc();
    }
})

async function onLoad() {
    let functions = await getFunctions();   
    
    let functionsContent = `<h3>Functions</h3><ol>`;

    functions.forEach(f => {
        functionsContent += `<ul>${f}</ul>`;
    });

    const functionsContainer = document.createElement('div');
    functionsContainer.innerHTML = functionsContent;

    document.body.appendChild(functionsContainer);

    bcInput.focus();
}

window.addEventListener('load', onLoad);