(function (root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else (root.SaveTheDoge || (root.SaveTheDoge = {})).config = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const config = {
    world: {
      width: 600,
      height: 1080,
      safeMargin: 6
    },
    stroke: {
      width: 7,
      minimumLength: 8,
      maximumPoints: 2048,
      segmentEpsilon: 0.01,
      comparisonEpsilon: 1e-8,
      planBudgetEpsilon: 0.01,
      simplifyTolerance: 0.7,
      sampleSpacing: 2,
      cornerCosine: Math.SQRT1_2,
      smoothingDivisor: 4,
      friction: 0.85,
      staticFriction: 1,
      restitution: 0,
      density: 0.006,
      airFriction: 0.015,
      joinSides: 12
    },
    simulation: {
      stepsPerSecond: 60,
      totalSteps: 900,
      gravityY: 0.65,
      positionIterations: 8,
      velocityIterations: 8,
      navigationRefreshSteps: 30
    },
    dog: {
      radius: 18,
      density: 0.003,
      friction: 0.8,
      airFriction: 0.02,
      restitution: 0
    },
    bee: {
      radius: 7,
      hiveRadius: 32,
      hiveSpawnRadius: 18,
      normalSpeed: 3.3,
      impactBaseSpeed: 4.9,
      impactSpeedVariants: 501,
      impactSpeedDivisor: 1000,
      impactDurationSteps: 12,
      impactCooldownSteps: 60,
      impactTimingVariants: 31,
      impactHashShift: 10,
      propulsion: 0.00065,
      impactPropulsionMultiplier: 1.5,
      density: 0.001,
      airFriction: 0.045,
      restitution: 0.1,
      friction: 0.02,
      collisionCategory: 2,
      collisionMask: 1,
      pathArrivalDistance: 8,
      waypointDistance: 12,
      shortcutLookahead: 8
    },
    terrain: {
      friction: 0.9,
      restitution: 0
    },
    navigation: {
      cellSize: 12,
      clearance: 9,
      rayWidth: 18,
      escapeRayWidth: 12,
      startSearchRadiusCells: 3
    },
    input: {
      dragThresholdPixels: 4,
      sampleDistance: 0.5,
      hitDistance: 18,
      budgetTolerance: 0.1
    },
    timing: {
      noticeMilliseconds: 2200,
      maximumFrameDelta: 100,
      accumulatorEpsilon: 1e-7
    },
    display: {
      maximumPixelRatio: 3,
      inkRoundingEpsilon: 1e-6,
      percentScale: 100,
      clockDecimals: 1,
      cursorHotspotX: 3,
      cursorHotspotY: 29,
      dogSpriteSize: 62,
      beeSpriteSize: 28,
      dogSpriteCentreY: 52 / 96,
      beeSpriteCentreY: 40 / 72,
      selectionWidth: 13,
      failureRadius: 33
    },
    render: {
      boardColor: '#eaf1f4',
      dangerAreaColor: '#f0e6df',
      gridColor: '#dce6e8',
      gridSpacing: 30,
      gridDotRadius: 0.85,
      dangerLineColor: '#b98670',
      dangerLineWidth: 1.5,
      dangerDash: [6, 7],
      platformColor: '#b7c8bc',
      platformTopColor: '#7f9b87',
      platformBottomColor: '#9bb3a1',
      platformEdgeWidth: 4,
      hiveColor: '#ede3c8',
      hiveBorderColor: '#c6a361',
      hiveDash: [3, 5],
      strokeColor: '#294b40',
      selectedColor: '#b84b41',
      spriteFallbackColor: '#c69432',
      impactColor: '#b18b48',
      impactLineWidth: 1.5,
      impactTilt: 0.18,
      impactTiltDivisor: 3,
      failureLineWidth: 3
    },
    storage: {
      key: 'save-the-doge:v4',
      version: 4,
      legacyKeys: ['save-the-doge:v3', 'save-the-doge:v2']
    }
  };

  function deepFreeze(value) {
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
    }
    return Object.freeze(value);
  }

  return deepFreeze(config);
});
