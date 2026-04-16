import { cellKey } from "./config.js";

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

export const ARENA_LAYOUTS = [
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
    systems: {
      summaries: [
        {
          label: "Core Duel",
          status: "Stable",
          description: "Only trails, walls, and boost orbs are active here. Use it for pure head-to-head routing.",
        },
      ],
    },
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

export function getLayoutById(id) {
  return ARENA_LAYOUTS.find((layout) => layout.id === id) ?? ARENA_LAYOUTS[0];
}

export function buildObstacleMap(layoutId, cols, rows) {
  const layout = getLayoutById(layoutId);
  return normalizeCells(layout.build(cols, rows), cols, rows);
}
