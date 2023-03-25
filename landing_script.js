const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');

function handlePasswordSubmit() {
    const password = passwordInput.value;
    // Store the password in localStorage
    localStorage.setItem('password', password);

    if (password !== "" && password !== null && password !== undefined) {
        // Redirect to the existing index.html file
        window.location.href = 'index.html';
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