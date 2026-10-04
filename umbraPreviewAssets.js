(function () {
  "use strict";

  // Phase 1 display metadata only. No storage, network, gameplay, or physics access.
  // Pivots follow the torso root, not the wing/exhaust bounding box. These are
  // visual calibration values for review, not final mech size or combat tuning.
  const basePath = "画像/player/KGK-02_UMBRA_SERAPH/";
  const directionOrder = ["down", "downLeft", "left", "upLeft", "up", "upRight", "right", "downRight"];
  const modeOrder = ["idle", "move", "boost"];

  function pose(fileName, width, height, pivotX, pivotY, displayScale, offsetX, offsetY) {
    return {
      key: `umbra-phase1-pose-${fileName.replace(/\.png$/, "")}`,
      path: `${basePath}character/${fileName}`,
      fileName,
      width,
      height,
      pivotPx: { x: pivotX, y: pivotY },
      origin: { x: pivotX / width, y: pivotY / height },
      displayScale,
      offset: { x: offsetX, y: offsetY }
    };
  }

  const directions = {
    down: { angleLabel: "000", label: "下", poses: {
      idle: pose("KGK_000.png", 1080, 1080, 540, 450, 0.220, 0, 0),
      move: pose("KGK_000_MOOVE.png", 1254, 1254, 627, 498, 0.198, 0, 0),
      boost: pose("KGK_000_BOOST.png", 1254, 1254, 625, 478, 0.214, 0, 0)
    } },
    downLeft: { angleLabel: "45", label: "左下", poses: {
      idle: pose("KGK_45.png", 1080, 1080, 470, 460, 0.220, 0, 0),
      move: pose("KGK_45_MOOVE.png", 1254, 1254, 499, 692, 0.200, 0, 0),
      boost: pose("KGK_45_BOOST.png", 1254, 1254, 482, 746, 0.204, 0, 0)
    } },
    left: { angleLabel: "90", label: "左", poses: {
      idle: pose("KGK_90.png", 1080, 1080, 462, 471, 0.225, 0, 0),
      move: pose("KGK_90_MOOVE.png", 1254, 1254, 419, 664, 0.205, 0, 0),
      boost: pose("KGK_90_BOOST.png", 1254, 1254, 390, 733, 0.208, 0, 0)
    } },
    upLeft: { angleLabel: "135", label: "左上", poses: {
      idle: pose("KGK_135.png", 1080, 1080, 553, 467, 0.220, 0, 0),
      move: pose("KGK_135_MOOVE.png", 1254, 1254, 610, 551, 0.213, 0, 0),
      boost: pose("KGK_135_BOOST.png", 1254, 1254, 543, 499, 0.222, 0, 0)
    } },
    up: { angleLabel: "180", label: "上", poses: {
      idle: pose("KGK_180.png", 1080, 1080, 535, 470, 0.220, 0, 0),
      move: pose("KGK_180_MOOVE.png", 1254, 1254, 650, 507, 0.190, 0, 0),
      boost: pose("KGK_180_BOOST.png", 1254, 1254, 673, 505, 0.192, 0, 0)
    } },
    upRight: { angleLabel: "225", label: "右上", poses: {
      idle: pose("KGK_225.png", 1080, 1080, 624, 430, 0.225, 0, 0),
      move: pose("KGK_225_MOOVE.png", 1254, 1254, 956, 516, 0.198, 0, 0),
      boost: pose("KGK_225_BOOST.png", 1254, 1254, 983, 501, 0.202, 0, 0)
    } },
    right: { angleLabel: "270", label: "右", poses: {
      idle: pose("KGK_270.png", 1080, 1080, 592, 470, 0.225, 0, 0),
      move: pose("KGK_270_MOOVE.png", 1254, 1254, 940, 709, 0.200, 0, 0),
      boost: pose("KGK_270_BOOST.png", 1254, 1254, 934, 735, 0.200, 0, 0)
    } },
    downRight: { angleLabel: "315", label: "右下", poses: {
      idle: pose("KGK_315.png", 1080, 1080, 579, 491, 0.225, 0, 0),
      move: pose("KGK_315_MOOVE.png", 1254, 1254, 822, 743, 0.210, 0, 0),
      boost: pose("KGK_315_BOOST.png", 1254, 1254, 807, 793, 0.208, 0, 0)
    } }
  };

  function frame(index, x, y, width, height, pivotX, pivotY) {
    return {
      name: `frame-${index + 1}`,
      index,
      x,
      y,
      width,
      height,
      pivotPx: { x: pivotX, y: pivotY },
      origin: { x: pivotX / width, y: pivotY / height }
    };
  }

  // Frame rectangles are measured source-pixel coordinates, never inferred by
  // Phaser's equal-cell spritesheet parser. Every effect uses one uniform scale
  // across its eight frames, preserving authored expansion and contraction.
  const effects = {
    umbraMoonlight: {
      key: "umbra-phase1-sheet-moonlight",
      animationKey: "umbra-phase1-animation-moonlight",
      path: `${basePath}skilleffect/MOONLIGHT.png`,
      fileName: "MOONLIGHT.png",
      width: 1774,
      height: 887,
      label: "MOONLIGHT",
      pivotLabel: "命中中心",
      frameRate: 10,
      repeat: 0,
      displayScale: 0.38,
      frames: [
        frame(0, 0, 0, 444, 444, 221, 226),
        frame(1, 444, 0, 443, 444, 220, 232),
        frame(2, 887, 0, 443, 444, 234, 229),
        frame(3, 1330, 0, 444, 444, 223, 241),
        frame(4, 0, 444, 444, 443, 235, 208),
        frame(5, 444, 444, 443, 443, 259, 213),
        frame(6, 887, 444, 443, 443, 257, 185),
        frame(7, 1330, 444, 444, 443, 214, 209)
      ]
    },
    umbraBloodSpike: {
      key: "umbra-phase1-sheet-blood-spike",
      animationKey: "umbra-phase1-animation-blood-spike",
      path: `${basePath}skilleffect/bloodspike.png`,
      fileName: "bloodspike.png",
      width: 2048,
      height: 682,
      label: "BLOOD SPIKE",
      pivotLabel: "地面の接地点",
      frameRate: 10,
      repeat: 0,
      displayScale: 0.38,
      // User-approved resized compression. Restore the original displayed size
      // independently on each axis; frame rectangles remain native PNG pixels.
      resolutionScale: { x: 2172 / 2048, y: 724 / 682 },
      frames: [
        frame(0, 0, 0, 512, 369, 254.586, 320.276),
        frame(1, 512, 0, 512, 369, 256.471, 329.696),
        frame(2, 1024, 0, 512, 369, 278.158, 338.174),
        frame(3, 1536, 0, 512, 369, 266.843, 346.652),
        frame(4, 0, 369, 512, 313, 248.928, 285.682),
        frame(5, 512, 369, 512, 313, 261.186, 285.682),
        frame(6, 1024, 369, 512, 313, 262.129, 281.914),
        frame(7, 1536, 369, 512, 313, 258.357, 283.798)
      ]
    },
    umbraPhantomNova: {
      key: "umbra-phase1-sheet-phantom-nova",
      animationKey: "umbra-phase1-animation-phantom-nova",
      path: `${basePath}skilleffect/nova.png`,
      fileName: "nova.png",
      width: 1774,
      height: 887,
      label: "PHANTOM NOVA",
      pivotLabel: "球の中心",
      frameRate: 8,
      repeat: -1,
      displayScale: 0.38,
      frames: [
        frame(0, 0, 0, 444, 468, 226, 247),
        frame(1, 444, 0, 443, 468, 225, 244),
        frame(2, 887, 0, 430, 468, 220, 252),
        frame(3, 1317, 0, 457, 468, 232, 249),
        frame(4, 0, 468, 444, 419, 230, 215),
        frame(5, 444, 468, 443, 419, 225, 213),
        frame(6, 887, 468, 430, 419, 220, 214),
        frame(7, 1317, 468, 457, 419, 228, 214)
      ]
    }
  };

  function getPose(direction, mode) {
    return directions[direction]?.poses[mode] || null;
  }

  function applyPose(image, direction, mode, x, y, scale = 1) {
    const definition = getPose(direction, mode);
    if (!definition || !image?.scene?.textures?.exists(definition.key)) {
      return false;
    }
    // Only a non-physics Image is accepted. Never resize a player hitbox/body.
    if (image.body) {
      return false;
    }
    const multiplier = Number.isFinite(scale) && scale > 0 ? scale : 1;
    image.setTexture(definition.key);
    image.setOrigin(definition.origin.x, definition.origin.y);
    image.setScale(definition.displayScale * multiplier);
    image.setPosition(x + definition.offset.x * multiplier, y + definition.offset.y * multiplier);
    return true;
  }

  function freezeTree(value) {
    Object.values(value).forEach((entry) => {
      if (entry && typeof entry === "object") freezeTree(entry);
    });
    return Object.freeze(value);
  }

  window.umbraPreviewAssets = freezeTree({
    version: 1,
    mechId: "umbraSeraph",
    directionOrder,
    modeOrder,
    directions,
    effects,
    getPose,
    applyPose
  });
}());
