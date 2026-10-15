/* login.js - checks the login form with regular expressions, then looks the
   account up in the list that register.js saved in local storage. */

/* Email: something, an @, something, a dot, then 2 or more letters. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/* Password: at least 8 characters with a lower case letter, an upper case
   letter, a digit and a symbol. Each (?=...) is a lookahead - it checks the
   rest of the string contains that thing without consuming any characters. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

const STORAGE_KEY = 'counterbeat:users';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const message = document.getElementById('message');

/* Finds a registered account by email, or null when there is no match. */
function findUser(email) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
        return null;                    // nobody has registered yet
    }
    const needle = email.trim().toLowerCase();
    const found = JSON.parse(raw).find(function (user) {
        return user.email === needle;
    });
    return found === undefined ? null : found;
}

/* Shows a message above the form. No alert boxes anywhere on the site. */
function showMessage(text, isGood) {
    message.textContent = text;
    message.className = isGood ? 'message ok' : 'message bad';
}

/* Checks the email box and returns true when it is acceptable. */
function checkEmail() {
    const email = emailInput.value.trim();

    if (email === '') {
        emailError.textContent = 'Email address is required.';
        return false;
    }
    if (!EMAIL_PATTERN.test(email)) {
        emailError.textContent = 'Enter a valid email address, for example you@example.com.';
        return false;
    }
    emailError.textContent = '';
    return true;
}

/* Checks the password box and returns true when it is acceptable. */
function checkPassword() {
    const password = passwordInput.value;

    if (password === '') {
        passwordError.textContent = 'Password is required.';
        return false;
    }
    if (!PASSWORD_PATTERN.test(password)) {
        passwordError.textContent = 'At least 8 characters, with upper and lower case, a number and a symbol.';
        return false;
    }
    passwordError.textContent = '';
    return true;
}

/* Checking on blur looks tidy but breaks the page: the message appearing makes
   the form taller, so the Log in button slides out from under the mouse and the
   click does nothing. Instead the form is checked when it is submitted, and
   from then on each box is re-checked as the user types in it. */
let submitted = false;

emailInput.addEventListener('input', function () {
    if (submitted) {
        checkEmail();
    }
});

passwordInput.addEventListener('input', function () {
    if (submitted) {
        checkPassword();
    }
});

form.addEventListener('submit', function (event) {
    event.preventDefault();             // stop the browser reloading the page
    submitted = true;
    showMessage('', true);

    /* Both checks run before the if, so both messages appear at once.
       Writing checkEmail() && checkPassword() would skip the second one. */
    const emailOk = checkEmail();
    const passwordOk = checkPassword();

    if (!emailOk || !passwordOk) {
        showMessage('Please fix the errors below.', false);
        return;
    }

    const user = findUser(emailInput.value);

    if (user === null) {
        emailError.textContent = 'No account was found with that email address.';
        showMessage('Login failed.', false);
        return;
    }
    if (user.password !== passwordInput.value) {
        passwordError.textContent = 'That password is not correct.';
        showMessage('Login failed.', false);
        return;
    }

    /* Remember who is logged in. localStorage only stores strings, so the
       whole site keeps its data as JSON. */
    localStorage.setItem('counterbeat:user', JSON.stringify({
        username: user.username,
        email: user.email,
    }));

    showMessage('Logged in. Taking you to the game...', true);
    setTimeout(function () {
        window.location.href = 'game.html';
    }, 800);
});
