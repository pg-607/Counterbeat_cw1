/* register.js - checks the registration form with regular expressions and
   saves the account as JSON in local storage.

   v0.2 keeps the password exactly as it was typed. That is only acceptable
   because nothing leaves this browser; a later version hashes it with a
   random salt. */

/* ---------------------------------------------------------------- patterns */

/* Username: 3 to 16 letters, numbers or underscores, and nothing else.
   {3,16} is the length, and ^...$ anchor it so "ab cd" cannot sneak through. */
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

/* Email: something, an @, something, a dot, then 2 or more letters.
   [^\s@]+ means "one or more characters that are not a space or an @". */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/* Phone: an optional +, then 7 to 15 digits. Spaces and hyphens are stripped
   out before this runs, because people write numbers in all sorts of ways. */
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

/* Password: at least 8 characters including a lower case letter, an upper
   case letter, a digit and a symbol. Each (?=...) is a lookahead: it checks
   the rest of the string contains that thing without using up any characters,
   so all four have to be true at once. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

const STORAGE_KEY = 'counterbeat:users';

/* ------------------------------------------------------------------ the page */
const form = document.getElementById('registerForm');
const message = document.getElementById('message');

const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const countryInput = document.getElementById('country');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');

/* --------------------------------------------------------------- storage */

/* Reads the saved accounts. Local storage only holds strings, so everything
   goes in and out as JSON. */
function loadUsers() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
        return [];                      // nobody has registered yet
    }
    return JSON.parse(raw);
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/* Is this username or email already used? Compared in lower case so that
   "Girik" and "girik" cannot both be registered. */
function isTaken(field, value) {
    const needle = value.trim().toLowerCase();
    return loadUsers().some(function (user) {
        return user[field].toLowerCase() === needle;
    });
}

/* ------------------------------------------------------------------ errors */

/* Puts a message under one field, or clears it when the message is empty.
   Returns true when the field is acceptable, so the checks below can be
   written as one line each. */
function setError(field, text) {
    document.getElementById(field + 'Error').textContent = text;
    return text === '';
}

function showMessage(text, isGood) {
    message.textContent = text;
    message.className = isGood ? 'message ok' : 'message bad';
}

/* ------------------------------------------------------------------ checks */
function checkUsername() {
    const username = usernameInput.value.trim();

    if (username === '') {
        return setError('username', 'Username is required.');
    }
    if (!USERNAME_PATTERN.test(username)) {
        return setError('username', '3 to 16 characters: letters, numbers and underscores only.');
    }
    if (isTaken('username', username)) {
        return setError('username', 'That username is already taken.');
    }
    return setError('username', '');
}

function checkEmail() {
    const email = emailInput.value.trim();

    if (email === '') {
        return setError('email', 'Email address is required.');
    }
    if (!EMAIL_PATTERN.test(email)) {
        return setError('email', 'Enter a valid email address, for example you@example.com.');
    }
    if (isTaken('email', email)) {
        return setError('email', 'An account already uses that email address.');
    }
    return setError('email', '');
}

function checkPhone() {
    /* Take out spaces and hyphens first: +44 7700 900123 and +447700900123
       are the same number, so the pattern should not care which was typed. */
    const phone = phoneInput.value.replace(/[\s-]/g, '');

    if (phone === '') {
        return setError('phone', 'Phone number is required.');
    }
    if (!PHONE_PATTERN.test(phone)) {
        return setError('phone', 'Enter 7 to 15 digits, optionally starting with +.');
    }
    return setError('phone', '');
}

function checkCountry() {
    if (countryInput.value === '') {
        return setError('country', 'Please choose a country.');
    }
    return setError('country', '');
}

function checkPassword() {
    const password = passwordInput.value;

    if (password === '') {
        return setError('password', 'Password is required.');
    }
    if (!PASSWORD_PATTERN.test(password)) {
        return setError('password', 'At least 8 characters, with upper and lower case, a number and a symbol.');
    }
    return setError('password', '');
}

function checkConfirmPassword() {
    if (confirmInput.value === '') {
        return setError('confirmPassword', 'Please type the password again.');
    }
    if (confirmInput.value !== passwordInput.value) {
        return setError('confirmPassword', 'The two passwords do not match.');
    }
    return setError('confirmPassword', '');
}

/* --------------------------------------------------------------- the form */

/* Checking as soon as a box loses focus would move the page: the message
   appearing makes the form taller, so the button slides out from under the
   mouse and the click does nothing. So the form is checked when it is
   submitted, and each box is only re-checked while it is being edited. */
let submitted = false;

const checks = [
    [usernameInput, checkUsername],
    [emailInput, checkEmail],
    [phoneInput, checkPhone],
    [countryInput, checkCountry],
    [passwordInput, checkPassword],
    [confirmInput, checkConfirmPassword],
];

for (const pair of checks) {
    pair[0].addEventListener('input', function () {
        if (submitted) {
            pair[1]();
        }
    });
    pair[0].addEventListener('change', function () {
        if (submitted) {
            pair[1]();               // the country drop-down fires change, not input
        }
    });
}

form.addEventListener('submit', function (event) {
    event.preventDefault();          // stop the browser reloading the page
    submitted = true;
    showMessage('', true);

    /* Every check runs, so the user sees all of their mistakes at once rather
       than fixing them one at a time. */
    let valid = true;
    for (const pair of checks) {
        if (!pair[1]()) {
            valid = false;
        }
    }

    if (!valid) {
        showMessage('Please fix the errors below.', false);
        return;
    }

    /* Add the new account to the list and write the whole list back. */
    const users = loadUsers();
    users.push({
        username: usernameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        phone: phoneInput.value.replace(/[\s-]/g, ''),
        country: countryInput.value,
        password: passwordInput.value,
        createdAt: new Date().toISOString(),
    });
    saveUsers(users);

    /* Log the new player straight in, the same way login.js does. */
    localStorage.setItem('counterbeat:user', JSON.stringify({
        username: usernameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
    }));

    showMessage('Account created. Taking you to the game...', true);
    setTimeout(function () {
        window.location.href = 'game.html';
    }, 900);
});
