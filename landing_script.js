const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');

function handlePasswordSubmit() {
    console.log('handle password submit');
    localStorage.setItem('alerted','');
    const password = passwordInput.value;
    localStorage.setItem('password', password);

    passwordInput.value = '';
    if (password !== "" && password !== null && password !== undefined) {
        window.location.href = 'game_page.html';
    }
}

// Listen for the click event on the submit button
submitPassword.addEventListener('click', handlePasswordSubmit);

// Listen for the "Enter" key press event on the password input
passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handlePasswordSubmit();
    }
});

passwordInput.focus();