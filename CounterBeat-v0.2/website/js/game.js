/* game.js - the CounterBeat prototype, drawn on a 2D canvas.
   Everything is in this one file for now: movement, the beat, the judging and
   the drawing. */

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const scoreText = document.getElementById('score');
const comboText = document.getElementById('combo');
const judgementText = document.getElementById('judgement');
const startButton = document.getElementById('startButton');

/* ---------------------------------------------------------------- settings */
const BEAT_MS = 600;            // one beat every 600 ms, which is 100 BPM
const TIMING_WINDOW_MS = 150;   // how far off the beat a shot can be
const STOPPED_SPEED = 40;       // pixels per second that still counts as stopped
const WINDOW_HALF_WIDTH = 45;   // how close to the middle of a window you must be

const ACCELERATION = 1800;      // pixels per second per second while a key is held
const MAX_SPEED = 520;
const FRICTION = 700;           // slow deceleration when you just let go: you slide
const COUNTER_DECELERATION = 3600;  // fast deceleration when you press the opposite key

const WINDOW_CENTRES = [150, 400, 650];     // the three gaps in the wall

/* ------------------------------------------------------------------- state */
let running = false;
let startedAt = 0;              // when the run began, from performance.now()
let lastFrameAt = 0;
let currentBeat = -1;
let lastShotBeat = -1;          // stops one key press scoring twice on a beat

let playerX = 400;
let velocity = 0;
let targetWindow = 1;           // index into WINDOW_CENTRES

let score = 0;
let combo = 0;

const keysDown = {};            // which movement keys are held right now

/* ------------------------------------------------------------------- input */
document.addEventListener('keydown', function (event) {
    if (event.code === 'KeyA' || event.code === 'KeyD' || event.code === 'Space') {
        event.preventDefault();         // stop Space scrolling the page
    }
    if (event.repeat) {
        return;                         // ignore the key repeating while held
    }
    keysDown[event.code] = true;

    if (event.code === 'Space' && running) {
        shoot();
    }
});

document.addEventListener('keyup', function (event) {
    keysDown[event.code] = false;
});

startButton.addEventListener('click', function () {
    if (running) {
        running = false;
        startButton.textContent = 'Start';
        return;
    }
    score = 0;
    combo = 0;
    playerX = 400;
    velocity = 0;
    currentBeat = -1;
    lastShotBeat = -1;
    startedAt = performance.now();
    lastFrameAt = startedAt;
    running = true;
    startButton.textContent = 'Stop';
    updateScoreboard('—');
    requestAnimationFrame(loop);
});

/* -------------------------------------------------------------- the clock */

/* How many beats have passed since the run started. */
function beatNumber(now) {
    return Math.floor((now - startedAt) / BEAT_MS);
}

/* How far this moment is from the nearest beat, in milliseconds.
   Negative means early, positive means late. */
function timingError(now) {
    const sinceStart = now - startedAt;
    const nearestBeat = Math.round(sinceStart / BEAT_MS) * BEAT_MS;
    return sinceStart - nearestBeat;
}

/* ----------------------------------------------------------------- shooting */
function shoot() {
    const now = performance.now();
    const beat = Math.round((now - startedAt) / BEAT_MS);

    if (beat === lastShotBeat) {
        return;                         // already fired on this beat
    }
    lastShotBeat = beat;

    const error = timingError(now);
    const distance = Math.abs(playerX - WINDOW_CENTRES[targetWindow]);
    const speed = Math.abs(velocity);

    /* All three conditions have to be true. The order of these checks decides
       which reason the player is told about first. */
    if (distance > WINDOW_HALF_WIDTH) {
        missed('WRONG WINDOW');
    } else if (speed > STOPPED_SPEED) {
        missed('STILL MOVING');
    } else if (Math.abs(error) > TIMING_WINDOW_MS) {
        missed(error < 0 ? 'TOO EARLY' : 'TOO LATE');
    } else {
        combo = combo + 1;
        score = score + 100 + combo * 10;
        updateScoreboard('HIT');
    }
}

function missed(reason) {
    combo = 0;
    updateScoreboard(reason);
}

function updateScoreboard(judgement) {
    scoreText.textContent = score;
    comboText.textContent = combo;
    judgementText.textContent = judgement;
}

/* ----------------------------------------------------------------- movement */

/* The counter-strafe: holding a direction accelerates, letting go only slides,
   but pressing the OPPOSITE direction brakes hard and stops at zero. */
function movePlayer(seconds) {
    let direction = 0;
    if (keysDown['KeyA']) {
        direction = direction - 1;
    }
    if (keysDown['KeyD']) {
        direction = direction + 1;
    }

    if (direction !== 0 && Math.sign(velocity) === -direction && velocity !== 0) {
        /* Pressing against the way you are moving: brake hard. */
        const next = velocity + direction * COUNTER_DECELERATION * seconds;
        velocity = Math.sign(next) === Math.sign(velocity) ? next : 0;   // stop dead at zero
    } else if (direction !== 0) {
        velocity = velocity + direction * ACCELERATION * seconds;
    } else if (velocity !== 0) {
        /* Nothing held: friction, which is deliberately weak so you slide. */
        const next = velocity - Math.sign(velocity) * FRICTION * seconds;
        velocity = Math.sign(next) === Math.sign(velocity) ? next : 0;
    }

    velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
    playerX = playerX + velocity * seconds;

    /* Keep the player on screen. */
    if (playerX < 30) {
        playerX = 30;
        velocity = 0;
    }
    if (playerX > canvas.width - 30) {
        playerX = canvas.width - 30;
        velocity = 0;
    }
}

/* --------------------------------------------------------------- main loop */
function loop(now) {
    if (!running) {
        return;
    }
    const seconds = Math.min((now - lastFrameAt) / 1000, 0.05);  // cap it if the tab stalls
    lastFrameAt = now;

    /* Move the target to a different window every other beat. */
    const beat = beatNumber(now);
    if (beat !== currentBeat) {
        currentBeat = beat;
        if (beat % 2 === 0) {
            let next = Math.floor(Math.random() * WINDOW_CENTRES.length);
            if (next === targetWindow) {
                next = (next + 1) % WINDOW_CENTRES.length;   // always somewhere new
            }
            targetWindow = next;
        }
    }

    movePlayer(seconds);
    draw(now);
    requestAnimationFrame(loop);
}

/* ----------------------------------------------------------------- drawing */
function draw(now) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    /* The wall, with a gap at each window. */
    context.fillStyle = '#1c2430';
    context.fillRect(0, 120, canvas.width, 40);
    for (let i = 0; i < WINDOW_CENTRES.length; i = i + 1) {
        context.clearRect(WINDOW_CENTRES[i] - 45, 120, 90, 40);
        context.strokeStyle = i === targetWindow ? '#ff8a2a' : '#2a3140';
        context.lineWidth = 2;
        context.strokeRect(WINDOW_CENTRES[i] - 45, 120, 90, 40);
    }

    /* The target, behind the lit window. */
    context.fillStyle = '#ff8a2a';
    context.fillRect(WINDOW_CENTRES[targetWindow] - 16, 60, 32, 52);

    /* The player. Green when stopped, because that is when a shot counts. */
    context.fillStyle = Math.abs(velocity) <= STOPPED_SPEED ? '#7effba' : '#8894a8';
    context.fillRect(playerX - 14, 210, 28, 40);

    /* A ring that shrinks towards each beat, so the beat can be seen as well
       as heard - there is no sound in this version yet. */
    const progress = ((now - startedAt) % BEAT_MS) / BEAT_MS;
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(canvas.width / 2, 275, 6 + 14 * (1 - progress), 0, Math.PI * 2);
    context.stroke();

    /* Speed bar: the marker sits in the middle when the player is stopped. */
    context.fillStyle = '#2a3140';
    context.fillRect(canvas.width / 2 - 100, 288, 200, 6);
    context.fillStyle = Math.abs(velocity) <= STOPPED_SPEED ? '#7effba' : '#ff5f6d';
    context.fillRect(canvas.width / 2 - 2 + (velocity / MAX_SPEED) * 100, 285, 4, 12);
}

/* ------------------------------------------------------- who is logged in */
const saved = localStorage.getItem('counterbeat:user');
if (saved !== null) {
    const user = JSON.parse(saved);
    document.getElementById('player').textContent =
        'Playing as ' + user.username + ' — scores are not saved yet.';
}

/* Draw one frame straight away so the canvas is not blank before Start. */
draw(performance.now());
