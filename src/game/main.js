import {
  BASE_TICK,
  BOOST_DURATION,
  CELL,
  DEFAULT_WINS_NEEDED,
  POWERUP_INTERVAL,
  POWERUP_KICKOFF_DELAY,
  TICK_BOOST,
  TICK_NORMAL,
  assignRandomColors,
  cellKey,
  clamp,
  formatRound,
} from "./config.js";
import { ARENA_LAYOUTS, buildObstacleMap, getLayoutById } from "./layouts.js";

const dom = {
  screens: document.querySelectorAll(".screen"),
  p1NameInput: document.getElementById("p1Name"),
  p2NameInput: document.getElementById("p2Name"),
  goBtn: document.getElementById("goBtn"),
  roundButtons: Array.from(document.querySelectorAll(".round-opt")),
  layoutList: document.getElementById("layoutList"),
  arenaGrid: document.getElementById("arenaGrid"),
  countdownOverlay: document.getElementById("countdownOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  roundMsg: document.getElementById("roundMsg"),
  countdownText: document.getElementById("countdownText"),
  resumeBtn: document.getElementById("resumeBtn"),
  hudP1Name: document.getElementById("hudP1Name"),
  hudP2Name: document.getElementById("hudP2Name"),
  hudP1Score: document.getElementById("hudP1Score"),
  hudP2Score: document.getElementById("hudP2Score"),
  hudP1Wins: document.getElementById("hudP1Wins"),
  hudP2Wins: document.getElementById("hudP2Wins"),
  hudRound: document.getElementById("hudRound"),
  hudLayoutName: document.getElementById("hudLayoutName"),
  hudLayoutDifficulty: document.getElementById("hudLayoutDifficulty"),
  moWinnerName: document.getElementById("moWinnerName"),
  moLayoutName: document.getElementById("moLayoutName"),
  moLayoutDifficulty: document.getElementById("moLayoutDifficulty"),
  moP1Label: document.getElementById("moP1Label"),
  moP2Label: document.getElementById("moP2Label"),
  moP1Score: document.getElementById("moP1Score"),
  moP2Score: document.getElementById("moP2Score"),
  moP1Badge: document.getElementById("moP1Badge"),
  moP2Badge: document.getElementById("moP2Badge"),
  moRounds: document.getElementById("moRounds"),
  moTicks: document.getElementById("moTicks"),
  moPowerups: document.getElementById("moPowerups"),
  rematchBtn: document.getElementById("rematchBtn"),
  lobbyBtn: document.getElementById("lobbyBtn"),
  quitMatchBtn: document.getElementById("quitMatchBtn"),
};

const state = {
  screen: "lobby",
  selectedLayoutId: ARENA_LAYOUTS[0].id,
  p1Name: "",
  p2Name: "",
  p1Score: 0,
  p2Score: 0,
  p1Wins: 0,
  p2Wins: 0,
  round: 1,
  winsNeeded: DEFAULT_WINS_NEEDED,
  totalTicks: 0,
  totalPowerups: 0,
};

let cols = 0;
let rows = 0;
let obstacles = [];
let obstacleSet = new Set();
let gameLoop = null;
let powerupTimer = null;
let powerupKickoffTimer = null;
let countdownInterval = null;
let countdownFinishTimer = null;
let powerup = null;
let p1 = null;
let p2 = null;
let paused = false;
let gameRunning = false;
let countdownActive = false;
let p1Accum = 0;
let p2Accum = 0;

function showScreen(name) {
  state.screen = name;
  dom.screens.forEach((screen) => screen.classList.remove("screen--active"));
  document.getElementById(name).classList.add("screen--active");
}

function buildLayoutPicker() {
  dom.layoutList.innerHTML = "";

  ARENA_LAYOUTS.forEach((layout) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "layout-card";
    button.dataset.layoutId = layout.id;
    button.setAttribute("aria-pressed", String(layout.id === state.selectedLayoutId));

    const preview = layout.preview
      .map((row) =>
        row
          .split("")
          .map((cell) => `<span class="${cell === "#" ? "is-blocked" : ""}"></span>`)
          .join(""),
      )
      .join("");

    button.innerHTML = `
      <div class="layout-card__top">
        <div>
          <h4 class="layout-card__title">${layout.name}</h4>
          <p class="layout-card__tagline">${layout.tagline}</p>
        </div>
        <span class="difficulty-pill">${layout.difficulty}</span>
      </div>
      <p class="layout-card__copy">${layout.description}</p>
      <div class="layout-card__bottom">
        <div class="layout-card__preview" aria-hidden="true">${preview}</div>
      </div>
    `;

    button.addEventListener("click", () => selectLayout(layout.id));
    dom.layoutList.appendChild(button);
  });

  syncLayoutSelection();
}

function syncLayoutSelection() {
  const selectedLayout = getLayoutById(state.selectedLayoutId);

  document.querySelectorAll(".layout-card").forEach((card) => {
    const isSelected = card.dataset.layoutId === state.selectedLayoutId;
    card.classList.toggle("layout-card--selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  dom.hudLayoutName.textContent = selectedLayout.name;
  dom.hudLayoutDifficulty.textContent = selectedLayout.difficulty;
  dom.moLayoutName.textContent = selectedLayout.name;
  dom.moLayoutDifficulty.textContent = selectedLayout.difficulty;
}

function selectLayout(layoutId) {
  state.selectedLayoutId = layoutId;
  syncLayoutSelection();
}

function sizeArena() {
  const maxWidth = window.innerWidth - 88;
  const maxHeight = window.innerHeight - 240;
  cols = clamp(Math.floor(maxWidth / CELL), 20, 44);
  rows = clamp(Math.floor(maxHeight / CELL), 16, 28);

  document.documentElement.style.setProperty("--cell-size", `${CELL}px`);
  dom.arenaGrid.style.width = `${cols * CELL}px`;
  dom.arenaGrid.style.height = `${rows * CELL}px`;

  rebuildArenaLayout();
}

function rebuildArenaLayout() {
  obstacles = buildObstacleMap(state.selectedLayoutId, cols, rows);
  obstacleSet = new Set(obstacles.map(({ x, y }) => cellKey(x, y)));
}

function getCandidateRows() {
  const middle = Math.floor(rows / 2);
  return [
    middle,
    middle - 2,
    middle + 2,
    middle - 4,
    middle + 4,
    middle - 1,
    middle + 1,
  ].filter((row, index, values) => row >= 1 && row < rows - 1 && values.indexOf(row) === index);
}

function isCellFree(x, y) {
  return !obstacleSet.has(cellKey(x, y));
}

function findSpawn(side) {
  const movingRight = side === "left";
  const xCandidates = movingRight
    ? [2, 3, 4, 5, 6]
    : [cols - 3, cols - 4, cols - 5, cols - 6, cols - 7];

  for (const y of getCandidateRows()) {
    for (const x of xCandidates) {
      const nextX = movingRight ? x + 1 : x - 1;
      if (isCellFree(x, y) && isCellFree(nextX, y)) {
        return { x, y };
      }
    }
  }

  return side === "left" ? { x: 2, y: 2 } : { x: cols - 3, y: rows - 3 };
}

function resetPositions() {
  const p1Spawn = findSpawn("left");
  const p2Spawn = findSpawn("right");

  p1 = {
    segments: [{ x: p1Spawn.x, y: p1Spawn.y }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    boost: false,
    boostEnd: 0,
  };

  p2 = {
    segments: [{ x: p2Spawn.x, y: p2Spawn.y }],
    dir: { x: -1, y: 0 },
    nextDir: { x: -1, y: 0 },
    boost: false,
    boostEnd: 0,
  };

  powerup = null;
  paused = false;
  gameRunning = false;
  countdownActive = false;
  p1Accum = 0;
  p2Accum = 0;
}

function startMatch() {
  showScreen("arena");
  sizeArena();
  startRound();
}

function clearTickTimer() {
  if (gameLoop) {
    window.clearTimeout(gameLoop);
    gameLoop = null;
  }
}

function clearPowerupTimers() {
  if (powerupTimer) {
    window.clearInterval(powerupTimer);
    powerupTimer = null;
  }

  if (powerupKickoffTimer) {
    window.clearTimeout(powerupKickoffTimer);
    powerupKickoffTimer = null;
  }
}

function clearCountdownTimers() {
  if (countdownInterval) {
    window.clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (countdownFinishTimer) {
    window.clearTimeout(countdownFinishTimer);
    countdownFinishTimer = null;
  }
}

function startRound() {
  clearTickTimer();
  clearPowerupTimers();
  clearCountdownTimers();
  dom.pauseOverlay.classList.remove("overlay--active");
  dom.arenaGrid.innerHTML = "";

  sizeArena();
  resetPositions();
  updateHUD();
  render();

  countdownActive = true;
  showCountdown(`Round ${formatRound(state.round)}`, 3, () => {
    countdownActive = false;
    beginGameplay();
  });
}

function beginGameplay() {
  gameRunning = true;
  scheduleTick();
  powerupTimer = window.setInterval(spawnPowerup, POWERUP_INTERVAL);
  powerupKickoffTimer = window.setTimeout(spawnPowerup, POWERUP_KICKOFF_DELAY);
}

function showCountdown(message, seconds, onDone) {
  clearCountdownTimers();
  dom.countdownOverlay.classList.add("overlay--active");
  dom.roundMsg.textContent = message;

  let remaining = seconds;
  dom.countdownText.textContent = String(remaining);

  countdownInterval = window.setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      clearCountdownTimers();
      dom.countdownText.textContent = "GO!";
      countdownFinishTimer = window.setTimeout(() => {
        dom.countdownOverlay.classList.remove("overlay--active");
        onDone();
      }, 500);
      return;
    }

    dom.countdownText.textContent = String(remaining);
  }, 1000);
}

function scheduleTick() {
  clearTickTimer();
  if (!gameRunning || paused) {
    return;
  }

  gameLoop = window.setTimeout(gameTick, BASE_TICK);
}

function movePlayer(player, otherPlayer, isPlayerOne) {
  player.dir = { ...player.nextDir };
  const currentHead = player.segments[player.segments.length - 1];
  const head = {
    x: currentHead.x + player.dir.x,
    y: currentHead.y + player.dir.y,
  };

  if (checkCollision(head, player.segments, otherPlayer.segments)) {
    return { head, dead: true };
  }

  player.segments.push(head);

  if (powerup && head.x === powerup.x && head.y === powerup.y) {
    player.boost = true;
    player.boostEnd = Date.now() + BOOST_DURATION;
    powerup = null;
    state.totalPowerups += 1;
  }

  if (isPlayerOne) {
    state.p1Score += player.boost ? 15 : 10;
  } else {
    state.p2Score += player.boost ? 15 : 10;
  }

  return { head, dead: false };
}

function gameTick() {
  if (!gameRunning || paused) {
    return;
  }

  const now = Date.now();
  if (p1.boost && now >= p1.boostEnd) p1.boost = false;
  if (p2.boost && now >= p2.boostEnd) p2.boost = false;

  p1Accum += BASE_TICK;
  p2Accum += BASE_TICK;

  const p1Tick = p1.boost ? TICK_BOOST : TICK_NORMAL;
  const p2Tick = p2.boost ? TICK_BOOST : TICK_NORMAL;

  let p1Moved = false;
  let p2Moved = false;
  let p1Result = null;
  let p2Result = null;

  if (p1Accum >= p1Tick) {
    p1Accum -= p1Tick;
    p1Moved = true;
    p1Result = movePlayer(p1, p2, true);
  }

  if (p2Accum >= p2Tick) {
    p2Accum -= p2Tick;
    p2Moved = true;
    p2Result = movePlayer(p2, p1, false);
  }

  if (
    p1Moved &&
    p2Moved &&
    p1Result &&
    p2Result &&
    !p1Result.dead &&
    !p2Result.dead &&
    p1Result.head.x === p2Result.head.x &&
    p1Result.head.y === p2Result.head.y
  ) {
    handleDraw();
    return;
  }

  const p1Dead = Boolean(p1Moved && p1Result?.dead);
  const p2Dead = Boolean(p2Moved && p2Result?.dead);

  if (p1Dead && p2Dead) {
    handleDraw();
    return;
  }

  if (p1Dead) {
    endRound(2);
    return;
  }

  if (p2Dead) {
    endRound(1);
    return;
  }

  if (p1Moved || p2Moved) {
    state.totalTicks += 1;
    render();
    updateHUD();
  }

  scheduleTick();
}

function handleDraw() {
  gameRunning = false;
  clearPowerupTimers();
  render();

  window.setTimeout(() => {
    showBetweenRounds(`Draw. Replaying Round ${formatRound(state.round)}`);
  }, 700);
}

function checkCollision(head, ownSegments, otherSegments) {
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    return true;
  }

  if (obstacleSet.has(cellKey(head.x, head.y))) {
    return true;
  }

  for (const segment of ownSegments) {
    if (segment.x === head.x && segment.y === head.y) {
      return true;
    }
  }

  for (const segment of otherSegments) {
    if (segment.x === head.x && segment.y === head.y) {
      return true;
    }
  }

  return false;
}

function endRound(winner) {
  gameRunning = false;
  clearPowerupTimers();

  if (winner === 1) {
    state.p1Wins += 1;
  } else {
    state.p2Wins += 1;
  }

  updateHUD();
  render();

  const loserClass = winner === 1 ? ".p2-trail, .p2-head" : ".p1-trail, .p1-head";
  const loserCells = Array.from(document.querySelectorAll(loserClass));
  loserCells.forEach((cell, index) => {
    window.setTimeout(() => cell.classList.add("dissolving"), index * 12);
  });

  const dissolveTime = Math.min(loserCells.length * 12 + 300, 1300);

  if (state.p1Wins >= state.winsNeeded || state.p2Wins >= state.winsNeeded) {
    window.setTimeout(showMatchOver, dissolveTime + 450);
    return;
  }

  state.round += 1;
  const winnerName = winner === 1 ? state.p1Name : state.p2Name;
  window.setTimeout(() => {
    showBetweenRounds(`${winnerName} takes the room`);
  }, dissolveTime);
}

function showBetweenRounds(message) {
  countdownActive = true;
  showCountdown(message, 3, () => {
    countdownActive = false;
    startRound();
  });
}

function spawnPowerup() {
  if (!gameRunning || paused || powerup) {
    return;
  }

  const occupied = new Set(obstacles.map(({ x, y }) => cellKey(x, y)));
  p1.segments.forEach(({ x, y }) => occupied.add(cellKey(x, y)));
  p2.segments.forEach(({ x, y }) => occupied.add(cellKey(x, y)));

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const x = Math.floor(Math.random() * (cols - 4)) + 2;
    const y = Math.floor(Math.random() * (rows - 4)) + 2;

    if (!occupied.has(cellKey(x, y))) {
      powerup = { x, y };
      render();
      return;
    }
  }
}

function render() {
  dom.arenaGrid.innerHTML = "";

  obstacles.forEach(({ x, y }) => {
    const cell = document.createElement("div");
    cell.className = "obstacle-cell";
    cell.style.left = `${x * CELL}px`;
    cell.style.top = `${y * CELL}px`;
    dom.arenaGrid.appendChild(cell);
  });

  p1.segments.forEach((segment, index) => {
    const cell = document.createElement("div");
    cell.className = `cell ${index === p1.segments.length - 1 ? "p1-head" : "p1-trail"}`;
    if (p1.boost) cell.classList.add("boost");
    cell.style.left = `${segment.x * CELL}px`;
    cell.style.top = `${segment.y * CELL}px`;
    dom.arenaGrid.appendChild(cell);
  });

  p2.segments.forEach((segment, index) => {
    const cell = document.createElement("div");
    cell.className = `cell ${index === p2.segments.length - 1 ? "p2-head" : "p2-trail"}`;
    if (p2.boost) cell.classList.add("boost");
    cell.style.left = `${segment.x * CELL}px`;
    cell.style.top = `${segment.y * CELL}px`;
    dom.arenaGrid.appendChild(cell);
  });

  if (powerup) {
    const orb = document.createElement("div");
    orb.className = "power-up";
    orb.style.left = `${powerup.x * CELL}px`;
    orb.style.top = `${powerup.y * CELL}px`;
    dom.arenaGrid.appendChild(orb);
  }
}

function renderPips(target, wins, className) {
  target.innerHTML = "";
  for (let index = 0; index < state.winsNeeded; index += 1) {
    const pip = document.createElement("div");
    pip.className = `pip${index < wins ? ` ${className}` : ""}`;
    target.appendChild(pip);
  }
}

function updateHUD() {
  dom.hudP1Name.textContent = state.p1Name;
  dom.hudP2Name.textContent = state.p2Name;
  dom.hudP1Score.textContent = state.p1Score.toLocaleString();
  dom.hudP2Score.textContent = state.p2Score.toLocaleString();
  dom.hudRound.textContent = formatRound(state.round);
  renderPips(dom.hudP1Wins, state.p1Wins, "won-p1");
  renderPips(dom.hudP2Wins, state.p2Wins, "won-p2");
}

function clearGame() {
  gameRunning = false;
  paused = false;
  countdownActive = false;
  clearTickTimer();
  clearPowerupTimers();
  clearCountdownTimers();
  dom.pauseOverlay.classList.remove("overlay--active");
  dom.countdownOverlay.classList.remove("overlay--active");
  dom.arenaGrid.innerHTML = "";
}

function showMatchOver() {
  clearGame();
  showScreen("matchOver");

  const winner = state.p1Wins >= state.winsNeeded ? 1 : 2;
  dom.moWinnerName.textContent = winner === 1 ? state.p1Name : state.p2Name;
  dom.moP1Label.textContent = state.p1Name;
  dom.moP2Label.textContent = state.p2Name;
  dom.moP1Score.textContent = state.p1Score.toLocaleString();
  dom.moP2Score.textContent = state.p2Score.toLocaleString();
  dom.moP1Badge.textContent = winner === 1 ? "Champion" : "Runner Up";
  dom.moP2Badge.textContent = winner === 2 ? "Champion" : "Runner Up";
  dom.moRounds.textContent = String(state.round);
  dom.moTicks.textContent = state.totalTicks.toLocaleString();
  dom.moPowerups.textContent = state.totalPowerups.toLocaleString();
}

function togglePause() {
  if (!gameRunning && !paused) {
    return;
  }

  paused = !paused;
  dom.pauseOverlay.classList.toggle("overlay--active", paused);

  if (paused) {
    clearTickTimer();
    clearPowerupTimers();
    return;
  }

  powerupTimer = window.setInterval(spawnPowerup, POWERUP_INTERVAL);
  scheduleTick();
}

function startSetupFromLobby() {
  state.p1Name = dom.p1NameInput.value.trim() || "PLAYER 1";
  state.p2Name = dom.p2NameInput.value.trim() || "PLAYER 2";
  state.p1Score = 0;
  state.p2Score = 0;
  state.p1Wins = 0;
  state.p2Wins = 0;
  state.round = 1;
  state.totalTicks = 0;
  state.totalPowerups = 0;

  const selectedRoundButton = document.querySelector(".round-opt--selected");
  state.winsNeeded = Number.parseInt(selectedRoundButton?.dataset.wins ?? DEFAULT_WINS_NEEDED, 10);

  assignRandomColors();
  syncLayoutSelection();
  startMatch();
}

function resetMatchStateForRematch() {
  state.p1Score = 0;
  state.p2Score = 0;
  state.p1Wins = 0;
  state.p2Wins = 0;
  state.round = 1;
  state.totalTicks = 0;
  state.totalPowerups = 0;
  assignRandomColors();
  startMatch();
}

dom.roundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    dom.roundButtons.forEach((candidate) => candidate.classList.remove("round-opt--selected"));
    button.classList.add("round-opt--selected");
  });
});

dom.goBtn.addEventListener("click", startSetupFromLobby);
dom.resumeBtn.addEventListener("click", togglePause);
dom.rematchBtn.addEventListener("click", resetMatchStateForRematch);

dom.lobbyBtn.addEventListener("click", () => {
  clearGame();
  assignRandomColors();
  showScreen("lobby");
});

dom.quitMatchBtn.addEventListener("click", () => {
  clearGame();
  assignRandomColors();
  showScreen("lobby");
});

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === "Escape" && state.screen === "arena" && !countdownActive) {
    togglePause();
    return;
  }

  if (!gameRunning || paused) {
    return;
  }

  switch (event.key.toLowerCase()) {
    case "w":
      if (p1.dir.y !== 1) p1.nextDir = { x: 0, y: -1 };
      break;
    case "s":
      if (p1.dir.y !== -1) p1.nextDir = { x: 0, y: 1 };
      break;
    case "a":
      if (p1.dir.x !== 1) p1.nextDir = { x: -1, y: 0 };
      break;
    case "d":
      if (p1.dir.x !== -1) p1.nextDir = { x: 1, y: 0 };
      break;
    default:
      break;
  }

  switch (event.key) {
    case "ArrowUp":
      if (p2.dir.y !== 1) p2.nextDir = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (p2.dir.y !== -1) p2.nextDir = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (p2.dir.x !== 1) p2.nextDir = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (p2.dir.x !== -1) p2.nextDir = { x: 1, y: 0 };
      break;
    default:
      break;
  }
});

window.addEventListener("resize", () => {
  if (state.screen !== "arena" || gameRunning || paused || countdownActive) {
    return;
  }

  sizeArena();
  render();
});

buildLayoutPicker();
assignRandomColors();
syncLayoutSelection();
