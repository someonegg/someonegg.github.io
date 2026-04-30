(function () {
  const LEVELS = [
    {
      id: "l1-bridge",
      name: "第一关：稳住小狗",
      timeLimitSec: 25,
      beeDelaySec: 5,
      inkBudget: 0.65,
      strokeLimit: 2,
      dog: { x: 0.26, y: 0.48, r: 18 },
      hive: { x: 0.82, y: 0.24, beeCount: 8, beeSpeed: 0.0005 },
      obstacles: [
        { type: "rect", x: 0.24, y: 0.66, w: 0.26, h: 0.03 },
        { type: "rect", x: 0.66, y: 0.76, w: 0.24, h: 0.03 }
      ],
      bounds: { floorY: 1.08 }
    },
    {
      id: "l2-gap",
      name: "第二关：越过断层",
      timeLimitSec: 25,
      beeDelaySec: 5,
      inkBudget: 0.65,
      strokeLimit: 2,
      dog: { x: 0.18, y: 0.44, r: 18 },
      hive: { x: 0.78, y: 0.22, beeCount: 9, beeSpeed: 0.00053 },
      obstacles: [
        { type: "rect", x: 0.16, y: 0.66, w: 0.24, h: 0.03 },
        { type: "rect", x: 0.52, y: 0.72, w: 0.2, h: 0.03 },
        { type: "rect", x: 0.84, y: 0.64, w: 0.22, h: 0.03 }
      ],
      bounds: { floorY: 1.1 }
    },
    {
      id: "l3-cage",
      name: "第三关：双向蜂群",
      timeLimitSec: 25,
      beeDelaySec: 5,
      inkBudget: 0.75,
      strokeLimit: 3,
      dog: { x: 0.5, y: 0.5, r: 18 },
      hive: { x: 0.18, y: 0.2, beeCount: 6, beeSpeed: 0.00057 },
      extraHives: [
        { x: 0.82, y: 0.24, beeCount: 6, beeSpeed: 0.00055 }
      ],
      obstacles: [
        { type: "rect", x: 0.5, y: 0.72, w: 0.28, h: 0.03 },
        { type: "rect", x: 0.5, y: 0.34, w: 0.12, h: 0.02 }
      ],
      bounds: { floorY: 1.12 }
    },
    {
      id: "l4-fall",
      name: "第四关：防坠落",
      timeLimitSec: 25,
      beeDelaySec: 5,
      inkBudget: 0.70,
      strokeLimit: 2,
      dog: { x: 0.5, y: 0.36, r: 18 },
      hive: { x: 0.74, y: 0.2, beeCount: 11, beeSpeed: 0.00059 },
      obstacles: [
        { type: "rect", x: 0.24, y: 0.74, w: 0.28, h: 0.03 },
        { type: "rect", x: 0.76, y: 0.74, w: 0.28, h: 0.03 },
        { type: "rect", x: 0.5, y: 0.58, w: 0.16, h: 0.025 }
      ],
      bounds: { floorY: 1.04 }
    },
    {
      id: "l5-final",
      name: "第五关：终局",
      timeLimitSec: 25,
      beeDelaySec: 5,
      inkBudget: 0.80,
      strokeLimit: 3,
      dog: { x: 0.5, y: 0.42, r: 18 },
      hive: { x: 0.2, y: 0.2, beeCount: 8, beeSpeed: 0.0006 },
      extraHives: [
        { x: 0.82, y: 0.2, beeCount: 8, beeSpeed: 0.0006 }
      ],
      obstacles: [
        { type: "rect", x: 0.5, y: 0.72, w: 0.18, h: 0.03 },
        { type: "rect", x: 0.34, y: 0.58, w: 0.12, h: 0.025 },
        { type: "rect", x: 0.66, y: 0.58, w: 0.12, h: 0.025 }
      ],
      bounds: { floorY: 1.08 }
    }
  ];

  window.SAVE_THE_DOGE_LEVELS = LEVELS;
})();
