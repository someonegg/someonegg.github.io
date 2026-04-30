(function () {
  const BACKGROUNDS = {
    themes: [
      {
        id: "theme-meadow-mint",
        bgLayers: [
          "radial-gradient(circle at 16% 20%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 11%)",
          "radial-gradient(circle at 24% 22%, rgba(255,255,255,.9) 0 7%, rgba(255,255,255,0) 9%)",
          "radial-gradient(circle at 72% 16%, rgba(255,255,255,.92) 0 10%, rgba(255,255,255,0) 12%)",
          "linear-gradient(180deg, #dff4ff 0%, #c5ecff 49%, #b9e7b5 56%, #9cd985 63%, #7fc96a 100%)"
        ],
        sunLayers: [
          "radial-gradient(circle at 90% 11%, rgba(255,227,123,.95) 0 6.3%, rgba(255,227,123,.35) 8.3%, rgba(255,227,123,0) 13%)",
          "radial-gradient(circle at 90% 11%, rgba(255,173,55,.32) 0 11%, rgba(255,173,55,0) 18.5%)",
          "radial-gradient(circle at 18% 36%, rgba(255,255,255,.7) 0 2.2%, rgba(255,255,255,0) 3.2%)",
          "radial-gradient(circle at 28% 32%, rgba(255,255,255,.62) 0 1.9%, rgba(255,255,255,0) 2.9%)",
          "radial-gradient(circle at 74% 34%, rgba(255,255,255,.66) 0 2.1%, rgba(255,255,255,0) 3.1%)",
          "radial-gradient(circle at 67% 40%, rgba(255,255,255,.6) 0 1.8%, rgba(255,255,255,0) 2.7%)"
        ]
      },
      {
        id: "theme-meadow-breeze",
        bgLayers: [
          "radial-gradient(circle at 14% 22%, rgba(255,255,255,.94) 0 8%, rgba(255,255,255,0) 10%)",
          "radial-gradient(circle at 29% 20%, rgba(255,255,255,.88) 0 6.2%, rgba(255,255,255,0) 8.2%)",
          "radial-gradient(circle at 70% 18%, rgba(255,255,255,.9) 0 9%, rgba(255,255,255,0) 11%)",
          "linear-gradient(180deg, #e7f6ff 0%, #cceeff 48%, #c1ebb0 55%, #a6de8f 62%, #87ce72 100%)"
        ],
        sunLayers: [
          "radial-gradient(circle at 88% 10%, rgba(255,232,132,.95) 0 6.2%, rgba(255,232,132,.36) 8.2%, rgba(255,232,132,0) 12.8%)",
          "radial-gradient(circle at 88% 10%, rgba(255,177,66,.3) 0 10.8%, rgba(255,177,66,0) 18.2%)",
          "radial-gradient(circle at 18% 36%, rgba(255,255,255,.68) 0 2.1%, rgba(255,255,255,0) 3.1%)",
          "radial-gradient(circle at 28% 33%, rgba(255,255,255,.6) 0 1.8%, rgba(255,255,255,0) 2.8%)",
          "radial-gradient(circle at 72% 35%, rgba(255,255,255,.64) 0 2%, rgba(255,255,255,0) 3%)",
          "radial-gradient(circle at 64% 40%, rgba(255,255,255,.58) 0 1.7%, rgba(255,255,255,0) 2.7%)"
        ]
      },
      {
        id: "theme-meadow-daylight",
        bgLayers: [
          "radial-gradient(circle at 18% 18%, rgba(255,255,255,.95) 0 7.8%, rgba(255,255,255,0) 10%)",
          "radial-gradient(circle at 34% 23%, rgba(255,255,255,.86) 0 6.5%, rgba(255,255,255,0) 8.5%)",
          "radial-gradient(circle at 77% 14%, rgba(255,255,255,.9) 0 8.6%, rgba(255,255,255,0) 10.6%)",
          "linear-gradient(180deg, #d7f0ff 0%, #bfe8ff 47%, #b4e39d 54%, #99d681 61%, #79c763 100%)"
        ],
        sunLayers: [
          "radial-gradient(circle at 86% 13%, rgba(255,223,118,.95) 0 6.6%, rgba(255,223,118,.34) 8.6%, rgba(255,223,118,0) 13.4%)",
          "radial-gradient(circle at 86% 13%, rgba(255,167,52,.3) 0 11.2%, rgba(255,167,52,0) 18.8%)",
          "radial-gradient(circle at 20% 37%, rgba(255,255,255,.67) 0 2.2%, rgba(255,255,255,0) 3.2%)",
          "radial-gradient(circle at 31% 31%, rgba(255,255,255,.6) 0 1.8%, rgba(255,255,255,0) 2.8%)",
          "radial-gradient(circle at 75% 34%, rgba(255,255,255,.64) 0 2.1%, rgba(255,255,255,0) 3.1%)",
          "radial-gradient(circle at 67% 39%, rgba(255,255,255,.58) 0 1.7%, rgba(255,255,255,0) 2.6%)"
        ]
      }
    ],
    skyDecors: [
      {
        id: "sky-soft-a",
        clouds: [
          { left: 9, top: 13, scale: 1.0, opacity: 0.92 },
          { left: 66, top: 25, scale: 1.04, opacity: 0.86 },
          { left: 45, top: 10, scale: 0.92, opacity: 0.9 }
        ],
        birds: [
          { left: 24, top: 20, scale: 0.9, rotate: -4, opacity: 0.84 },
          { left: 57, top: 17, scale: 1.04, rotate: 5, opacity: 0.9 },
          { left: 86, top: 28, scale: 0.82, rotate: -6, opacity: 0.8 }
        ]
      },
      {
        id: "sky-soft-b",
        clouds: [
          { left: 13, top: 15, scale: 0.94, opacity: 0.86 },
          { left: 62, top: 21, scale: 1.1, opacity: 0.9 },
          { left: 38, top: 9, scale: 0.88, opacity: 0.84 }
        ],
        birds: [
          { left: 20, top: 24, scale: 0.86, rotate: -8, opacity: 0.78 },
          { left: 52, top: 16, scale: 1.1, rotate: 3, opacity: 0.92 },
          { left: 82, top: 30, scale: 0.88, rotate: -4, opacity: 0.82 }
        ]
      },
      {
        id: "sky-soft-c",
        clouds: [
          { left: 8, top: 12, scale: 1.08, opacity: 0.9 },
          { left: 69, top: 24, scale: 0.98, opacity: 0.88 },
          { left: 49, top: 11, scale: 0.9, opacity: 0.82 }
        ],
        birds: [
          { left: 28, top: 18, scale: 0.94, rotate: -2, opacity: 0.86 },
          { left: 61, top: 20, scale: 1.0, rotate: 6, opacity: 0.88 },
          { left: 88, top: 27, scale: 0.78, rotate: -9, opacity: 0.76 }
        ]
      }
    ],
    groundDecors: [
      {
        id: "ground-gentle-a",
        flowers: [
          { left: 12, bottom: 12, scale: 1, rotate: -3, opacity: 0.96 },
          { left: 22, bottom: 10, scale: 0.92, rotate: 8, opacity: 0.9 },
          { left: 82, bottom: 13, scale: 0.98, rotate: -5, opacity: 0.94 },
          { left: 91, bottom: 10, scale: 1.08, rotate: 7, opacity: 0.96 }
        ],
        sprouts: [
          { left: 30, bottom: 10, scale: 0.92, rotate: -5, opacity: 0.84 },
          { left: 70, bottom: 11, scale: 1.04, rotate: 3, opacity: 0.88 },
          { left: 82, bottom: 9, scale: 0.84, rotate: -8, opacity: 0.8 }
        ],
        pebbles: [
          { left: 17, bottom: 8, scale: 0.9, rotate: -7, opacity: 0.78 },
          { left: 56, bottom: 9, scale: 1.06, rotate: 4, opacity: 0.84 },
          { left: 90, bottom: 8, scale: 0.82, rotate: -9, opacity: 0.74 }
        ],
        spots: [
          { pos: "12% 88.8%", size: "10.8% 4.9%", alpha: 0.39 },
          { pos: "33% 85.2%", size: "14.6% 6.5%", alpha: 0.42 },
          { pos: "62% 88.6%", size: "11.1% 5.2%", alpha: 0.36 },
          { pos: "84% 89.4%", size: "12.2% 5.4%", alpha: 0.35 }
        ]
      },
      {
        id: "ground-gentle-b",
        flowers: [
          { left: 10, bottom: 11.5, scale: 1.06, rotate: -10, opacity: 0.94 },
          { left: 25, bottom: 9.8, scale: 0.9, rotate: 6, opacity: 0.88 },
          { left: 78, bottom: 12.6, scale: 1.02, rotate: 4, opacity: 0.92 },
          { left: 88, bottom: 10.1, scale: 0.96, rotate: -6, opacity: 0.9 }
        ],
        sprouts: [
          { left: 33, bottom: 10.2, scale: 0.88, rotate: -10, opacity: 0.8 },
          { left: 68, bottom: 11.4, scale: 1.08, rotate: 6, opacity: 0.9 },
          { left: 80, bottom: 8.6, scale: 0.82, rotate: -4, opacity: 0.78 }
        ],
        pebbles: [
          { left: 15, bottom: 8.4, scale: 0.86, rotate: -4, opacity: 0.74 },
          { left: 59, bottom: 8.8, scale: 1.14, rotate: 8, opacity: 0.82 },
          { left: 87, bottom: 8.2, scale: 0.88, rotate: -12, opacity: 0.72 }
        ],
        spots: [
          { pos: "15% 89.1%", size: "12.7% 5.7%", alpha: 0.43 },
          { pos: "39% 85.8%", size: "10.9% 5%", alpha: 0.34 },
          { pos: "66% 88.4%", size: "13.2% 6.2%", alpha: 0.4 },
          { pos: "88% 89.9%", size: "9.8% 4.6%", alpha: 0.33 }
        ]
      },
      {
        id: "ground-gentle-c",
        flowers: [
          { left: 14, bottom: 12.4, scale: 0.98, rotate: -4, opacity: 0.92 },
          { left: 20, bottom: 9.7, scale: 0.9, rotate: 9, opacity: 0.9 },
          { left: 84, bottom: 12.8, scale: 1.04, rotate: -7, opacity: 0.94 },
          { left: 93, bottom: 9.8, scale: 1.12, rotate: 4, opacity: 0.98 }
        ],
        sprouts: [
          { left: 28, bottom: 9.8, scale: 0.94, rotate: -7, opacity: 0.82 },
          { left: 72, bottom: 10.9, scale: 1.0, rotate: 7, opacity: 0.86 },
          { left: 85, bottom: 8.7, scale: 0.8, rotate: -11, opacity: 0.76 }
        ],
        pebbles: [
          { left: 18, bottom: 8.3, scale: 0.92, rotate: -9, opacity: 0.76 },
          { left: 53, bottom: 9.1, scale: 0.98, rotate: 5, opacity: 0.8 },
          { left: 92, bottom: 8.1, scale: 0.8, rotate: -7, opacity: 0.7 }
        ],
        spots: [
          { pos: "11% 89.3%", size: "9.6% 4.4%", alpha: 0.35 },
          { pos: "35% 86.4%", size: "12.9% 6.1%", alpha: 0.41 },
          { pos: "63% 88.9%", size: "11.4% 5.2%", alpha: 0.37 },
          { pos: "86% 90.2%", size: "13.6% 6.4%", alpha: 0.39 }
        ]
      }
    ]
  };

  window.SAVE_THE_DOGE_BACKGROUNDS = BACKGROUNDS;
})();
