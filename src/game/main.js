const CELL = 28;
const TICK_NORMAL = 120;
const TICK_BOOST = 80;
const BASE_TICK = 40;
const BOOST_DURATION = 3000;
const POWERUP_INTERVAL = 8000;
const POWERUP_KICKOFF_DELAY = 2800;
const DEFAULT_WINS_NEEDED = 3;

const PLAYER_COLOR_POOL = [
  "#ff6b35",
  "#2ee6d6",
  "#ff4fa3",
  "#f7b801",
  "#7b61ff",
  "#8cfb5c",
  "#ff7b72",
  "#4fb3ff",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function mixWithWhite(rgb, amount) {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * amount),
    g: Math.round(rgb.g + (255 - rgb.g) * amount),
    b: Math.round(rgb.b + (255 - rgb.b) * amount),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function assignRandomColors() {
  const shuffled = [...PLAYER_COLOR_POOL].sort(() => Math.random() - 0.5);
  const [p1Color, p2Color, p3Color] = shuffled;
  const p1Rgb = hexToRgb(p1Color);
  const p2Rgb = hexToRgb(p2Color);
  const p3Rgb = hexToRgb(p3Color);
  const root = document.documentElement.style;

  root.setProperty("--p1-color", p1Color);
  root.setProperty("--p1-head-color", rgbToHex(mixWithWhite(p1Rgb, 0.28)));
  root.setProperty("--p1-boost-color", rgbToHex(mixWithWhite(p1Rgb, 0.52)));
  root.setProperty("--p1-glow", `rgba(${p1Rgb.r}, ${p1Rgb.g}, ${p1Rgb.b}, 0.42)`);
  root.setProperty("--p1-glow-boost", `rgba(${p1Rgb.r}, ${p1Rgb.g}, ${p1Rgb.b}, 0.78)`);

  root.setProperty("--p2-color", p2Color);
  root.setProperty("--p2-head-color", rgbToHex(mixWithWhite(p2Rgb, 0.28)));
  root.setProperty("--p2-boost-color", rgbToHex(mixWithWhite(p2Rgb, 0.52)));
  root.setProperty("--p2-glow", `rgba(${p2Rgb.r}, ${p2Rgb.g}, ${p2Rgb.b}, 0.42)`);
  root.setProperty("--p2-glow-boost", `rgba(${p2Rgb.r}, ${p2Rgb.g}, ${p2Rgb.b}, 0.78)`);

  root.setProperty("--p3-color", p3Color);
  root.setProperty("--p3-head-color", rgbToHex(mixWithWhite(p3Rgb, 0.28)));
  root.setProperty("--p3-boost-color", rgbToHex(mixWithWhite(p3Rgb, 0.52)));
  root.setProperty("--p3-glow", `rgba(${p3Rgb.r}, ${p3Rgb.g}, ${p3Rgb.b}, 0.42)`);
  root.setProperty("--p3-glow-boost", `rgba(${p3Rgb.r}, ${p3Rgb.g}, ${p3Rgb.b}, 0.78)`);
}

function formatRound(round) {
  return String(round).padStart(2, "0");
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function normalizeCells(cells, cols, rows) {
  const keys = new Set();

  return cells.filter(({ x, y }) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) {
      return false;
    }

    const key = cellKey(x, y);
    if (keys.has(key)) {
      return false;
    }

    keys.add(key);
    return true;
  });
}

function splitChamber(cols, rows) {
  const cells = [];
  const wallX = Math.floor(cols / 2);
  const gateHeight = Math.max(2, Math.floor(rows * 0.14));
  const topGateStart = Math.max(2, Math.floor(rows * 0.2));
  const bottomGateStart = Math.max(rows - gateHeight - 3, Math.floor(rows * 0.62));

  for (let y = 1; y < rows - 1; y += 1) {
    const inTopGate = y >= topGateStart && y < topGateStart + gateHeight;
    const inBottomGate = y >= bottomGateStart && y < bottomGateStart + gateHeight;
    if (!inTopGate && !inBottomGate) {
      cells.push({ x: wallX, y });
    }
  }

  return cells;
}

function crossfire(cols, rows) {
  const cells = [];
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);
  const armLengthX = Math.max(4, Math.floor(cols * 0.18));
  const armLengthY = Math.max(4, Math.floor(rows * 0.22));
  const gateRadius = 2;

  for (let x = centerX - armLengthX; x <= centerX + armLengthX; x += 1) {
    if (Math.abs(x - centerX) > gateRadius) {
      cells.push({ x, y: centerY });
    }
  }

  for (let y = centerY - armLengthY; y <= centerY + armLengthY; y += 1) {
    if (Math.abs(y - centerY) > gateRadius) {
      cells.push({ x: centerX, y });
    }
  }

  return cells;
}

function hazardRing(cols, rows) {
  const cells = [];
  const boxWidth = Math.max(8, Math.floor(cols * 0.34));
  const boxHeight = Math.max(6, Math.floor(rows * 0.32));
  const startX = Math.floor((cols - boxWidth) / 2);
  const startY = Math.floor((rows - boxHeight) / 2);
  const endX = startX + boxWidth - 1;
  const endY = startY + boxHeight - 1;
  const gateSpanX = Math.max(2, Math.floor(boxWidth * 0.16));
  const gateSpanY = Math.max(2, Math.floor(boxHeight * 0.2));
  const midX = Math.floor((startX + endX) / 2);
  const midY = Math.floor((startY + endY) / 2);

  for (let x = startX; x <= endX; x += 1) {
    const topGate = Math.abs(x - midX) <= gateSpanX;
    if (!topGate) {
      cells.push({ x, y: startY });
      cells.push({ x, y: endY });
    }
  }

  for (let y = startY + 1; y < endY; y += 1) {
    const sideGate = Math.abs(y - midY) <= gateSpanY;
    if (!sideGate) {
      cells.push({ x: startX, y });
      cells.push({ x: endX, y });
    }
  }

  return cells;
}

const ARENA_LAYOUTS = [
  {
    id: "open-circuit",
    name: "Open Circuit",
    difficulty: "Starter",
    tagline: "Pure trail reads with no blockers.",
    description: "A clean field for classic duels. Best for testing speed changes and score tuning.",
    preview: [
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
    ],
    systems: {},
    build() {
      return [];
    },
  },
  {
    id: "split-chamber",
    name: "Split Chamber",
    difficulty: "Advanced",
    tagline: "One divider wall, two rotating gates.",
    description: "The center split creates lane fights and punishes late turns near the gate openings.",
    preview: [
      "...#...",
      "...#...",
      ".......",
      "...#...",
      "...#...",
    ],
    systems: {
      beacon: {
        label: "Objective Beacon",
        status: "Live",
        description: "A roaming 2x2 control zone awards bonus score when a rider breaks through and captures it.",
        bonusScore: 40,
        size: 2,
        spawnDelayMs: 2400,
        durationMs: 7000,
        respawnDelayMs: 2600,
      },
      summaries: [
        {
          label: "Objective Beacon",
          status: "Live",
          description: "A roaming 2x2 control zone awards bonus score when a rider breaks through and captures it.",
        },
      ],
    },
    build: splitChamber,
  },
  {
    id: "crossfire",
    name: "Crossfire",
    difficulty: "Expert",
    tagline: "A central cross forces diagonal feints.",
    description: "Players orbit the middle and collide over the short gate windows near center mass.",
    preview: [
      "...#...",
      "...#...",
      "##...##",
      "...#...",
      "...#...",
    ],
    systems: {
      beacon: {
        label: "Objective Beacon",
        status: "Live",
        description: "Central pressure is rewarded with a score beacon that relocates after each capture.",
        bonusScore: 50,
        size: 2,
        spawnDelayMs: 2200,
        durationMs: 6200,
        respawnDelayMs: 2200,
      },
      sweep: {
        label: "Sweep Hazard",
        status: "Live",
        description: "Warning strips flash before a lethal cross-lane sweep activates across a row or column.",
        axisMode: "alternate",
        intervalMs: 5000,
        warningMs: 1400,
        activeMs: 1000,
      },
      summaries: [
        {
          label: "Objective Beacon",
          status: "Live",
          description: "Central pressure is rewarded with a score beacon that relocates after each capture.",
        },
        {
          label: "Sweep Hazard",
          status: "Live",
          description: "Warning strips flash before a lethal cross-lane sweep activates across a row or column.",
        },
      ],
    },
    build: crossfire,
  },
  {
    id: "hazard-ring",
    name: "Hazard Ring",
    difficulty: "Expert",
    tagline: "An inner box with limited breach points.",
    description: "Outer lanes stay fast while the ring interior becomes a trap if you commit too early.",
    preview: [
      ".#####.",
      ".#...#.",
      ".#...#.",
      ".#...#.",
      ".#####.",
    ],
    systems: {
      beacon: {
        label: "Objective Beacon",
        status: "Live",
        description: "A high-value beacon can spawn inside or around the ring, baiting risky dives through narrow gates.",
        bonusScore: 60,
        size: 2,
        spawnDelayMs: 2600,
        durationMs: 5600,
        respawnDelayMs: 2200,
      },
      sweep: {
        label: "Sweep Hazard",
        status: "Live",
        description: "Timed sweep waves cut across the box and punish players who overstay in the ring.",
        axisMode: "row",
        intervalMs: 4600,
        warningMs: 1200,
        activeMs: 1100,
      },
      summaries: [
        {
          label: "Objective Beacon",
          status: "High Value",
          description: "A high-value beacon can spawn inside or around the ring, baiting risky dives through narrow gates.",
        },
        {
          label: "Sweep Hazard",
          status: "Live",
          description: "Timed sweep waves cut across the box and punish players who overstay in the ring.",
        },
      ],
    },
    build: hazardRing,
  },
];

function getLayoutById(id) {
  return ARENA_LAYOUTS.find((layout) => layout.id === id) ?? ARENA_LAYOUTS[0];
}

function buildObstacleMap(layoutId, cols, rows) {
  const layout = getLayoutById(layoutId);
  return normalizeCells(layout.build(cols, rows), cols, rows);
}

const PLAYER_IDS = ["p1", "p2", "p3"];

const PLAYER_META = {
  p1: {
    label: "Player 1",
    defaultName: "ORANGE_CRUSH",
    spawn: "left",
    trailClass: "p1-trail",
    headClass: "p1-head",
    pipClass: "won-p1",
    nameInputId: "p1Name",
    hudNameId: "hudP1Name",
    hudScoreId: "hudP1Score",
    hudWinsId: "hudP1Wins",
    resultLabelId: "moP1Label",
    resultScoreId: "moP1Score",
    resultBadgeId: "moP1Badge",
  },
  p2: {
    label: "Player 2",
    defaultName: "CYAN_DRIFT",
    spawn: "right",
    trailClass: "p2-trail",
    headClass: "p2-head",
    pipClass: "won-p2",
    nameInputId: "p2Name",
    hudNameId: "hudP2Name",
    hudScoreId: "hudP2Score",
    hudWinsId: "hudP2Wins",
    resultLabelId: "moP2Label",
    resultScoreId: "moP2Score",
    resultBadgeId: "moP2Badge",
  },
  p3: {
    label: "Player 3",
    defaultName: "LIME_RUSH",
    spawn: "top",
    trailClass: "p3-trail",
    headClass: "p3-head",
    pipClass: "won-p3",
    nameInputId: "p3Name",
    hudNameId: "hudP3Name",
    hudScoreId: "hudP3Score",
    hudWinsId: "hudP3Wins",
    resultLabelId: "moP3Label",
    resultScoreId: "moP3Score",
    resultBadgeId: "moP3Badge",
  },
};

const INPUT_BINDINGS = [
  { key: "w", playerId: "p1", dir: { x: 0, y: -1 } },
  { key: "a", playerId: "p1", dir: { x: -1, y: 0 } },
  { key: "s", playerId: "p1", dir: { x: 0, y: 1 } },
  { key: "d", playerId: "p1", dir: { x: 1, y: 0 } },
  { key: "arrowup", playerId: "p2", dir: { x: 0, y: -1 } },
  { key: "arrowleft", playerId: "p2", dir: { x: -1, y: 0 } },
  { key: "arrowdown", playerId: "p2", dir: { x: 0, y: 1 } },
  { key: "arrowright", playerId: "p2", dir: { x: 1, y: 0 } },
  { key: "z", playerId: "p3", dir: { x: 0, y: -1 } },
  { key: "g", playerId: "p3", dir: { x: -1, y: 0 } },
  { key: "h", playerId: "p3", dir: { x: 0, y: 1 } },
  { key: "j", playerId: "p3", dir: { x: 1, y: 0 } },
];

const dom = {
  screens: document.querySelectorAll(".screen"),
  playerModeButtons: Array.from(document.querySelectorAll(".mode-toggle__button")),
  p3Group: document.getElementById("p3Group"),
  controlP3Card: document.getElementById("controlP3Card"),
  goBtn: document.getElementById("goBtn"),
  roundButtons: Array.from(document.querySelectorAll(".round-opt")),
  layoutList: document.getElementById("layoutList"),
  systemList: document.getElementById("systemList"),
  arenaGrid: document.getElementById("arenaGrid"),
  countdownOverlay: document.getElementById("countdownOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  roundMsg: document.getElementById("roundMsg"),
  countdownText: document.getElementById("countdownText"),
  resumeBtn: document.getElementById("resumeBtn"),
  arenaSystemStatus: document.getElementById("arenaSystemStatus"),
  hudP3: document.getElementById("hudP3"),
  hudRound: document.getElementById("hudRound"),
  hudLayoutName: document.getElementById("hudLayoutName"),
  hudLayoutDifficulty: document.getElementById("hudLayoutDifficulty"),
  moWinnerName: document.getElementById("moWinnerName"),
  moLayoutName: document.getElementById("moLayoutName"),
  moLayoutDifficulty: document.getElementById("moLayoutDifficulty"),
  moP3Card: document.getElementById("moP3Card"),
  moRounds: document.getElementById("moRounds"),
  moTicks: document.getElementById("moTicks"),
  moPowerups: document.getElementById("moPowerups"),
  moBeacons: document.getElementById("moBeacons"),
  moHazards: document.getElementById("moHazards"),
  rematchBtn: document.getElementById("rematchBtn"),
  lobbyBtn: document.getElementById("lobbyBtn"),
  quitMatchBtn: document.getElementById("quitMatchBtn"),
};

const state = {
  screen: "lobby",
  selectedLayoutId: ARENA_LAYOUTS[0].id,
  isThreePlayer: false,
  playerNames: {
    p1: PLAYER_META.p1.defaultName,
    p2: PLAYER_META.p2.defaultName,
    p3: PLAYER_META.p3.defaultName,
  },
  playerScores: {
    p1: 0,
    p2: 0,
    p3: 0,
  },
  playerWins: {
    p1: 0,
    p2: 0,
    p3: 0,
  },
  round: 1,
  winsNeeded: DEFAULT_WINS_NEEDED,
  totalTicks: 0,
  totalPowerups: 0,
  totalBeaconCaptures: 0,
  totalHazardWaves: 0,
};

let cols = 0;
let rows = 0;
let players = {};
let playerAccums = {};
let obstacles = [];
let obstacleSet = new Set();
let gameLoop = null;
let powerupTimer = null;
let powerupKickoffTimer = null;
let countdownInterval = null;
let countdownFinishTimer = null;
let powerup = null;
let objective = null;
let sweep = null;
let paused = false;
let gameRunning = false;
let countdownActive = false;

function getActivePlayerIds() {
  return state.isThreePlayer ? PLAYER_IDS : PLAYER_IDS.slice(0, 2);
}

function getCurrentLayout() {
  return getLayoutById(state.selectedLayoutId);
}

function showScreen(name) {
  state.screen = name;
  dom.screens.forEach((screen) => screen.classList.remove("screen--active"));
  document.getElementById(name).classList.add("screen--active");
}

function syncThreePlayerUI() {
  const enabled = state.isThreePlayer;
  dom.playerModeButtons.forEach((button) => {
    const isSelected = button.dataset.threePlayer === String(enabled);
    button.classList.toggle("mode-toggle__button--selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  dom.p3Group.classList.toggle("is-hidden", !enabled);
  dom.controlP3Card.classList.toggle("is-hidden", !enabled);
  dom.hudP3.classList.toggle("is-hidden", !enabled);
  dom.moP3Card.classList.toggle("is-hidden", !enabled);
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
      .map((row) => row.split("").map((cell) => `<span class="${cell === "#" ? "is-blocked" : ""}"></span>`).join(""))
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

function renderSystemList() {
  const summaries = getCurrentLayout().systems?.summaries ?? [];
  dom.systemList.innerHTML = "";

  if (summaries.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "system-card system-card--empty";
    emptyState.innerHTML = `
      <div class="system-card__top">
        <p class="system-card__title">No Live Modifiers</p>
        <span class="system-badge">Clean</span>
      </div>
      <p class="system-card__copy">This blueprint runs the base duel only. No beacon or hazard systems are active.</p>
    `;
    dom.systemList.appendChild(emptyState);
    return;
  }

  summaries.forEach((summary) => {
    const card = document.createElement("article");
    card.className = "system-card";
    card.innerHTML = `
      <div class="system-card__top">
        <p class="system-card__title">${summary.label}</p>
        <span class="system-badge">${summary.status}</span>
      </div>
      <p class="system-card__copy">${summary.description}</p>
    `;
    dom.systemList.appendChild(card);
  });
}

function syncLayoutSelection() {
  const layout = getCurrentLayout();

  document.querySelectorAll(".layout-card").forEach((card) => {
    const isSelected = card.dataset.layoutId === state.selectedLayoutId;
    card.classList.toggle("layout-card--selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  dom.hudLayoutName.textContent = layout.name;
  dom.hudLayoutDifficulty.textContent = layout.difficulty;
  dom.moLayoutName.textContent = layout.name;
  dom.moLayoutDifficulty.textContent = layout.difficulty;
  renderSystemList();
  updateSystemStatus();
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
  return [middle, middle - 2, middle + 2, middle - 4, middle + 4, middle - 1, middle + 1]
    .filter((row, index, values) => row >= 1 && row < rows - 1 && values.indexOf(row) === index);
}

function getCandidateCols() {
  const middle = Math.floor(cols / 2);
  return [middle, middle - 3, middle + 3, middle - 1, middle + 1, middle - 5, middle + 5]
    .filter((col, index, values) => col >= 1 && col < cols - 1 && values.indexOf(col) === index);
}

function isCellFree(x, y) {
  return !obstacleSet.has(cellKey(x, y));
}

function findSpawn(spawnType) {
  if (spawnType === "left") {
    for (const y of getCandidateRows()) {
      for (const x of [2, 3, 4, 5, 6]) {
        if (isCellFree(x, y) && isCellFree(x + 1, y)) {
          return { x, y, dir: { x: 1, y: 0 } };
        }
      }
    }
    return { x: 2, y: 2, dir: { x: 1, y: 0 } };
  }

  if (spawnType === "right") {
    for (const y of getCandidateRows()) {
      for (const x of [cols - 3, cols - 4, cols - 5, cols - 6, cols - 7]) {
        if (isCellFree(x, y) && isCellFree(x - 1, y)) {
          return { x, y, dir: { x: -1, y: 0 } };
        }
      }
    }
    return { x: cols - 3, y: rows - 3, dir: { x: -1, y: 0 } };
  }

  for (const x of getCandidateCols()) {
    for (const y of [2, 3, 4, 5]) {
      if (isCellFree(x, y) && isCellFree(x, y + 1)) {
        return { x, y, dir: { x: 0, y: 1 } };
      }
    }
  }

  return { x: Math.floor(cols / 2), y: 2, dir: { x: 0, y: 1 } };
}

function resetPlayers() {
  players = {};
  playerAccums = {};

  getActivePlayerIds().forEach((playerId) => {
    const spawn = findSpawn(PLAYER_META[playerId].spawn);
    players[playerId] = {
      id: playerId,
      segments: [{ x: spawn.x, y: spawn.y }],
      dir: { ...spawn.dir },
      nextDir: { ...spawn.dir },
      boost: false,
      boostEnd: 0,
      alive: true,
    };
    playerAccums[playerId] = 0;
  });
}

function resetModifierState() {
  const systems = getCurrentLayout().systems ?? {};

  objective = systems.beacon
    ? {
        config: systems.beacon,
        cells: [],
        cooldownRemaining: systems.beacon.spawnDelayMs,
        activeRemaining: 0,
      }
    : null;

  sweep = systems.sweep
    ? {
        config: systems.sweep,
        phase: "idle",
        cells: [],
        timer: systems.sweep.intervalMs,
        label: "Sweep standby",
        sequenceIndex: 0,
      }
    : null;

  updateSystemStatus();
}

function resetRoundState() {
  powerup = null;
  paused = false;
  gameRunning = false;
  countdownActive = false;
  resetPlayers();
  resetModifierState();
}

function startMatch() {
  showScreen("arena");
  syncThreePlayerUI();
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
  resetRoundState();
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

function getAllTrailCells(excludeId = null) {
  const segments = [];
  getActivePlayerIds().forEach((playerId) => {
    if (playerId !== excludeId && players[playerId]) {
      segments.push(...players[playerId].segments);
    }
  });
  return segments;
}

function getReservedCells() {
  const occupied = new Set(obstacles.map(({ x, y }) => cellKey(x, y)));

  getActivePlayerIds().forEach((playerId) => {
    const player = players[playerId];
    if (!player) {
      return;
    }
    player.segments.forEach(({ x, y }) => occupied.add(cellKey(x, y)));
  });

  if (powerup) {
    occupied.add(cellKey(powerup.x, powerup.y));
  }

  if (objective) {
    objective.cells.forEach(({ x, y }) => occupied.add(cellKey(x, y)));
  }

  if (sweep) {
    sweep.cells.forEach(({ x, y }) => occupied.add(cellKey(x, y)));
  }

  return occupied;
}

function spawnObjective() {
  if (!objective) {
    return;
  }

  const occupied = getReservedCells();
  const size = objective.config.size ?? 2;
  const maxX = cols - size - 1;
  const maxY = rows - size - 1;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const startX = Math.floor(Math.random() * Math.max(1, maxX - 1)) + 1;
    const startY = Math.floor(Math.random() * Math.max(1, maxY - 1)) + 1;
    const cells = [];
    let blocked = false;

    for (let x = startX; x < startX + size; x += 1) {
      for (let y = startY; y < startY + size; y += 1) {
        const key = cellKey(x, y);
        if (occupied.has(key)) {
          blocked = true;
          break;
        }
        cells.push({ x, y });
      }
      if (blocked) {
        break;
      }
    }

    if (!blocked) {
      objective.cells = cells;
      objective.activeRemaining = objective.config.durationMs;
      objective.cooldownRemaining = 0;
      return;
    }
  }
}

function clearObjective(cooldown) {
  if (!objective) {
    return;
  }

  objective.cells = [];
  objective.activeRemaining = 0;
  objective.cooldownRemaining = cooldown;
}

function isObjectiveCell(head) {
  return Boolean(objective && objective.cells.some((cell) => cell.x === head.x && cell.y === head.y));
}

function getSweepLaneCandidates(length) {
  return [Math.floor(length * 0.22), Math.floor(length * 0.38), Math.floor(length * 0.5), Math.floor(length * 0.66), Math.floor(length * 0.8)]
    .filter((value, index, values) => value > 0 && value < length - 1 && values.indexOf(value) === index);
}

function getSweepPattern(sequenceIndex) {
  const axisMode = sweep.config.axisMode ?? "alternate";
  const axis = axisMode === "alternate" ? (sequenceIndex % 2 === 0 ? "row" : "column") : axisMode;
  const laneCandidates = axis === "row" ? getSweepLaneCandidates(rows) : getSweepLaneCandidates(cols);
  const lane = laneCandidates[sequenceIndex % laneCandidates.length];
  const cells = [];

  if (axis === "row") {
    for (let x = 0; x < cols; x += 1) {
      if (!obstacleSet.has(cellKey(x, lane))) {
        cells.push({ x, y: lane });
      }
    }
  } else {
    for (let y = 0; y < rows; y += 1) {
      if (!obstacleSet.has(cellKey(lane, y))) {
        cells.push({ x: lane, y });
      }
    }
  }

  return {
    cells,
    label: `${axis === "row" ? "Row" : "Column"} ${formatRound(lane + 1)}`,
  };
}

function isActiveSweepCell(head) {
  return Boolean(
    sweep &&
      sweep.phase === "active" &&
      sweep.cells.some((cell) => cell.x === head.x && cell.y === head.y),
  );
}

function resolveAfterDeaths() {
  const alivePlayerIds = getActivePlayerIds().filter((playerId) => players[playerId]?.alive);

  if (alivePlayerIds.length === 0) {
    handleDraw();
    return true;
  }

  if (alivePlayerIds.length === 1) {
    endRound(alivePlayerIds[0]);
    return true;
  }

  return false;
}

function resolveSweepActivation() {
  const hitPlayerIds = getActivePlayerIds().filter((playerId) => {
    const player = players[playerId];
    if (!player?.alive) {
      return false;
    }
    const head = player.segments[player.segments.length - 1];
    return isActiveSweepCell(head);
  });

  hitPlayerIds.forEach((playerId) => {
    players[playerId].alive = false;
  });

  if (hitPlayerIds.length === 0) {
    return false;
  }

  return resolveAfterDeaths();
}

function updateObjective() {
  if (!objective) {
    return;
  }

  if (objective.cells.length > 0) {
    objective.activeRemaining -= BASE_TICK;
    if (objective.activeRemaining <= 0) {
      clearObjective(objective.config.respawnDelayMs);
    }
    return;
  }

  objective.cooldownRemaining -= BASE_TICK;
  if (objective.cooldownRemaining <= 0) {
    spawnObjective();
  }
}

function updateSweep() {
  if (!sweep) {
    return false;
  }

  sweep.timer -= BASE_TICK;
  if (sweep.timer > 0) {
    return false;
  }

  if (sweep.phase === "idle") {
    const pattern = getSweepPattern(sweep.sequenceIndex);
    sweep.phase = "warning";
    sweep.cells = pattern.cells;
    sweep.label = `Warning ${pattern.label}`;
    sweep.timer = sweep.config.warningMs;
    return false;
  }

  if (sweep.phase === "warning") {
    const pattern = getSweepPattern(sweep.sequenceIndex);
    sweep.phase = "active";
    sweep.cells = pattern.cells;
    sweep.label = `Live ${pattern.label}`;
    sweep.timer = sweep.config.activeMs;
    state.totalHazardWaves += 1;
    return resolveSweepActivation();
  }

  sweep.phase = "idle";
  sweep.cells = [];
  sweep.label = "Sweep standby";
  sweep.timer = sweep.config.intervalMs;
  sweep.sequenceIndex += 1;
  return false;
}

function updateModifiers() {
  updateObjective();
  const roundEnded = updateSweep();
  updateSystemStatus();
  return roundEnded;
}

function updateSystemStatus() {
  const parts = [];

  if (objective) {
    parts.push(objective.cells.length > 0 ? `Beacon live: +${objective.config.bonusScore}` : "Beacon charging");
  }

  if (sweep) {
    parts.push(sweep.phase === "warning" || sweep.phase === "active" ? sweep.label : "Sweep cycling");
  }

  dom.arenaSystemStatus.textContent = parts.length > 0 ? parts.join(" | ") : "Clean duel. No live room modifiers.";
}

function setPlayerDirection(playerId, dir) {
  if (!getActivePlayerIds().includes(playerId)) {
    return;
  }

  const player = players[playerId];
  if (!player?.alive) {
    return;
  }

  if ((dir.x !== 0 && player.dir.x === -dir.x) || (dir.y !== 0 && player.dir.y === -dir.y)) {
    return;
  }

  player.nextDir = { ...dir };
}

function handlePlayerPickup(playerId, head) {
  const player = players[playerId];

  if (powerup && head.x === powerup.x && head.y === powerup.y) {
    player.boost = true;
    player.boostEnd = Date.now() + BOOST_DURATION;
    powerup = null;
    state.totalPowerups += 1;
  }

  state.playerScores[playerId] += player.boost ? 15 : 10;

  if (isObjectiveCell(head)) {
    state.playerScores[playerId] += objective.config.bonusScore;
    state.totalBeaconCaptures += 1;
    clearObjective(objective.config.respawnDelayMs);
  }
}

function checkCollision(playerId, head) {
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    return true;
  }

  if (obstacleSet.has(cellKey(head.x, head.y)) || isActiveSweepCell(head)) {
    return true;
  }

  const ownSegments = players[playerId].segments;
  const otherSegments = getAllTrailCells(playerId);
  return [...ownSegments, ...otherSegments].some((segment) => segment.x === head.x && segment.y === head.y);
}

function processMovement() {
  const movingPlayerIds = [];
  const proposedMoves = [];

  getActivePlayerIds().forEach((playerId) => {
    const player = players[playerId];
    if (!player?.alive) {
      return;
    }

    if (player.boost && Date.now() >= player.boostEnd) {
      player.boost = false;
    }

    playerAccums[playerId] += BASE_TICK;
    const moveTick = player.boost ? TICK_BOOST : TICK_NORMAL;

    if (playerAccums[playerId] < moveTick) {
      return;
    }

    playerAccums[playerId] -= moveTick;
    movingPlayerIds.push(playerId);
    player.dir = { ...player.nextDir };

    const currentHead = player.segments[player.segments.length - 1];
    const head = { x: currentHead.x + player.dir.x, y: currentHead.y + player.dir.y };

    if (checkCollision(playerId, head)) {
      player.alive = false;
      return;
    }

    proposedMoves.push({ playerId, head });
  });

  proposedMoves.forEach(({ playerId, head }) => {
    players[playerId].segments.push(head);
  });

  const headGroups = new Map();
  proposedMoves.forEach(({ playerId, head }) => {
    const key = cellKey(head.x, head.y);
    const ids = headGroups.get(key) ?? [];
    ids.push(playerId);
    headGroups.set(key, ids);
  });

  headGroups.forEach((playerIds) => {
    if (playerIds.length > 1) {
      playerIds.forEach((playerId) => {
        players[playerId].alive = false;
      });
    }
  });

  proposedMoves.forEach(({ playerId, head }) => {
    if (players[playerId].alive) {
      handlePlayerPickup(playerId, head);
    }
  });

  if (movingPlayerIds.length > 0) {
    state.totalTicks += 1;
  }
}

function gameTick() {
  if (!gameRunning || paused) {
    return;
  }

  if (updateModifiers()) {
    render();
    updateHUD();
    return;
  }

  processMovement();

  if (resolveAfterDeaths()) {
    render();
    updateHUD();
    return;
  }

  render();
  updateHUD();
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

function endRound(winnerId) {
  gameRunning = false;
  clearPowerupTimers();
  state.playerWins[winnerId] += 1;

  updateHUD();
  render();

  const loserSelectors = getActivePlayerIds()
    .filter((playerId) => playerId !== winnerId)
    .map((playerId) => `.${PLAYER_META[playerId].trailClass}, .${PLAYER_META[playerId].headClass}`);
  const loserCells = Array.from(document.querySelectorAll(loserSelectors.join(", ")));

  loserCells.forEach((cell, index) => {
    window.setTimeout(() => cell.classList.add("dissolving"), index * 12);
  });

  const dissolveTime = Math.min(loserCells.length * 12 + 300, 1300);

  if (state.playerWins[winnerId] >= state.winsNeeded) {
    window.setTimeout(() => showMatchOver(winnerId), dissolveTime + 450);
    return;
  }

  state.round += 1;
  window.setTimeout(() => {
    showBetweenRounds(`${state.playerNames[winnerId]} takes the room`);
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

  const occupied = getReservedCells();

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

function placeCell(className, x, y) {
  const cell = document.createElement("div");
  cell.className = className;
  cell.style.left = `${x * CELL}px`;
  cell.style.top = `${y * CELL}px`;
  dom.arenaGrid.appendChild(cell);
}

function render() {
  dom.arenaGrid.innerHTML = "";

  obstacles.forEach(({ x, y }) => placeCell("obstacle-cell", x, y));

  if (objective) {
    objective.cells.forEach(({ x, y }) => placeCell("objective-cell", x, y));
  }

  if (sweep?.phase === "warning") {
    sweep.cells.forEach(({ x, y }) => placeCell("hazard-cell--warning", x, y));
  }

  getActivePlayerIds().forEach((playerId) => {
    const player = players[playerId];
    if (!player) {
      return;
    }

    player.segments.forEach((segment, index) => {
      const baseClass = index === player.segments.length - 1 ? PLAYER_META[playerId].headClass : PLAYER_META[playerId].trailClass;
      const className = `cell ${baseClass}${player.boost ? " boost" : ""}`;
      placeCell(className, segment.x, segment.y);
    });
  });

  if (sweep?.phase === "active") {
    sweep.cells.forEach(({ x, y }) => placeCell("hazard-cell--active", x, y));
  }

  if (powerup) {
    placeCell("power-up", powerup.x, powerup.y);
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
  getActivePlayerIds().forEach((playerId) => {
    const meta = PLAYER_META[playerId];
    document.getElementById(meta.hudNameId).textContent = state.playerNames[playerId];
    document.getElementById(meta.hudScoreId).textContent = state.playerScores[playerId].toLocaleString();
    renderPips(document.getElementById(meta.hudWinsId), state.playerWins[playerId], meta.pipClass);
  });

  dom.hudRound.textContent = formatRound(state.round);
}

function clearGame() {
  gameRunning = false;
  paused = false;
  countdownActive = false;
  clearTickTimer();
  clearPowerupTimers();
  clearCountdownTimers();
  objective = null;
  sweep = null;
  players = {};
  playerAccums = {};
  dom.pauseOverlay.classList.remove("overlay--active");
  dom.countdownOverlay.classList.remove("overlay--active");
  dom.arenaGrid.innerHTML = "";
  updateSystemStatus();
}

function getStandings() {
  return [...getActivePlayerIds()].sort((left, right) => {
    if (state.playerWins[right] !== state.playerWins[left]) {
      return state.playerWins[right] - state.playerWins[left];
    }
    return state.playerScores[right] - state.playerScores[left];
  });
}

function getStandingLabel(index) {
  if (index === 0) {
    return "Champion";
  }
  if (index === 1) {
    return "Runner Up";
  }
  return "Third Place";
}

function showMatchOver(winnerId) {
  clearGame();
  showScreen("matchOver");

  const standings = getStandings();
  const championId = winnerId ?? standings[0];
  dom.moWinnerName.textContent = state.playerNames[championId];

  getActivePlayerIds().forEach((playerId) => {
    const meta = PLAYER_META[playerId];
    document.getElementById(meta.resultLabelId).textContent = state.playerNames[playerId];
    document.getElementById(meta.resultScoreId).textContent = state.playerScores[playerId].toLocaleString();
    document.getElementById(meta.resultBadgeId).textContent = getStandingLabel(standings.indexOf(playerId));
  });

  dom.moRounds.textContent = String(state.round);
  dom.moTicks.textContent = state.totalTicks.toLocaleString();
  dom.moPowerups.textContent = state.totalPowerups.toLocaleString();
  dom.moBeacons.textContent = state.totalBeaconCaptures.toLocaleString();
  dom.moHazards.textContent = state.totalHazardWaves.toLocaleString();
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

function resetMatchScores() {
  PLAYER_IDS.forEach((playerId) => {
    state.playerScores[playerId] = 0;
    state.playerWins[playerId] = 0;
  });
  state.round = 1;
  state.totalTicks = 0;
  state.totalPowerups = 0;
  state.totalBeaconCaptures = 0;
  state.totalHazardWaves = 0;
}

function startSetupFromLobby() {
  syncThreePlayerUI();

  getActivePlayerIds().forEach((playerId) => {
    const input = document.getElementById(PLAYER_META[playerId].nameInputId);
    state.playerNames[playerId] = input.value.trim() || PLAYER_META[playerId].defaultName;
  });

  if (!state.isThreePlayer) {
    state.playerNames.p3 = PLAYER_META.p3.defaultName;
  }

  resetMatchScores();
  const selectedRoundButton = document.querySelector(".round-opt--selected");
  state.winsNeeded = Number.parseInt(selectedRoundButton?.dataset.wins ?? DEFAULT_WINS_NEEDED, 10);

  assignRandomColors();
  syncLayoutSelection();
  startMatch();
}

function resetMatchStateForRematch() {
  resetMatchScores();
  assignRandomColors();
  startMatch();
}

dom.playerModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.isThreePlayer = button.dataset.threePlayer === "true";
    syncThreePlayerUI();
  });
});

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
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  if (event.key === "Escape" && state.screen === "arena" && !countdownActive) {
    togglePause();
    return;
  }

  if (!gameRunning || paused) {
    return;
  }

  const binding = INPUT_BINDINGS.find((candidate) => candidate.key === key);
  if (binding) {
    setPlayerDirection(binding.playerId, binding.dir);
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
syncThreePlayerUI();
syncLayoutSelection();
