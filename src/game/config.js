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

window.TrailBattleConfig = {
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
};
