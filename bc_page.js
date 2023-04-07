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
    let answer = bcInput.value === '' ? '' : await evaluate(bcInput.value);
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
    
    let functionsContent = `<h3>Function</h3>`;
    let functionsExamplesContent = `<h3>Example</h3>`;

    for (let f in functions) {
        functionsContent += `<ul>${f}</ul>`
        functionsExamplesContent += `<ul>${functions[f]}</ul>`
    }

    const functionsContainer = document.createElement('div');
    const functionsExamplesContainer = document.createElement('div');

    functionsContainer.style.width = '25%';
    functionsContainer.style.display = 'inline-block';
    functionsContainer.style.verticalAlign = 'top';
    functionsExamplesContainer.style.width = '25%';
    functionsExamplesContainer.style.display = 'inline-block';
    functionsExamplesContainer.style.verticalAlign = 'top';


    functionsContainer.innerHTML = functionsContent;
    functionsExamplesContainer.innerHTML = functionsExamplesContent;

    document.body.appendChild(functionsContainer);
    document.body.appendChild(functionsExamplesContainer);

    bcInput.focus();
}

window.addEventListener('load', onLoad);