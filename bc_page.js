const bcInput = document.getElementById('bc-input');
const bcAnswer = document.getElementById('bc-answer');

URL = CONFIG.URL;

async function evaluate(bc) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bc }),
    }

    const response = await fetch(`${URL}/bc`, requestOptions);
    return await response.json();
}

async function format(bc) {
    const requestOptions = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bc }),
    }

    const response = await fetch(`${URL}/bc/format`, requestOptions);
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

function isNumeric(str) {
  var regex = /^-?[0-9.]+$/;
  
  return regex.test(str);
}

async function handleSubmitBc() {
    let answer = bcInput.value === '' ? '' : await evaluate(bcInput.value);
    bcAnswer.style.color = isNumeric(answer) ? 'black' : 'red';
    bcAnswer.textContent = answer;
}

async function handleFormatBc() {
    let answer = await format(bcInput.value);
    bcInput.value = answer;
}

bcInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        handleSubmitBc();
    }
    if (event.key === 'Enter' && event.altKey) {
        handleFormatBc();
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