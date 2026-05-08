const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;
const WORLD_VIEW_SCALE = 1.2;
const WORLD_CAMERA_ZOOM = 1 / WORLD_VIEW_SCALE;
const PLAYER_SCALE = 0.192;
const PLAYER_HITBOX_RADIUS = 22;
const PLAYER_SPRITE_OFFSET_Y = -19;
const PLAYER_SHADOW_OFFSET_Y = 32;
const PLAYER_SHADOW_WIDTH = 56;
const PLAYER_SHADOW_HEIGHT = 16;
const DEFAULT_SKILL_ID = "basicSkill";
const SKILL_DEFINITIONS = window.skillDefinitions || {};
const STAGE_DEFINITIONS = window.stageDefinitions || {};
const ACTIVE_STAGE_ID = "shibuyaStage1";
const STARTING_UPGRADE_CHOICES = 3;
const DASH_SPEED_MULTIPLIER = 1.68;
const DASH_STAMINA_DRAIN_PER_SECOND = 38;
const DASH_STAMINA_REGEN_PER_SECOND = 24;
const DASH_STAMINA_REGEN_DELAY_MS = 320;
const DASH_MIN_START_STAMINA = 8;
const DASH_HUD_CONFIG = {
  x: 684,
  y: 642,
  radius: 45
};
const BOSS_SPAWN_DELAY_MS = 15000;
const ENEMY_SPAWN_EDGE_PADDING = 180;
const ENEMY_SPAWN_OBSTACLE_PADDING = 46;
const ENEMY_SPAWN_POINT_ATTEMPTS = 24;
const BEST_RECORD_STORAGE_KEY = "lastmemoVansabaBestRecord";
const KILL_RANKING_STORAGE_KEY = "lastmemoVansabaKillRanking";
const COIN_WALLET_STORAGE_KEY = "lastmemoVansabaCoins";
const SHOP_STATE_STORAGE_KEY = "lastmemoVansabaShopState";
const DEFAULT_PLAYER_NAME = "anju";
const PLAYER_NAME_MAX_LENGTH = 16;
const MAX_KILL_RANKING_ENTRIES = 10;
const FIREBASE_SDK_VERSION = "12.13.0";
const FIREBASE_APP_NAME = "lastmemoVansabaLeaderboard";
const FIREBASE_LEADERBOARD_COLLECTION = "leaderboardKills";
const FIREBASE_REMOTE_RANKING_LIMIT = 10;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDgtQSaiTrWUfrP0p4spYm5N3rTi8DWjBk",
  authDomain: "anju-3f26d.firebaseapp.com",
  databaseURL: "https://anju-3f26d-default-rtdb.firebaseio.com",
  projectId: "anju-3f26d",
  storageBucket: "anju-3f26d.firebasestorage.app",
  messagingSenderId: "334005157098",
  appId: "1:334005157098:web:cf01b31045f48cc3746b93",
  measurementId: "G-L48G6S33X7"
};
const DEFAULT_CD_ID = "anju";
const DEFAULT_BGM_VOLUME = 0.52;
const SUPPORT_ATTACK_BGM_DUCK_VOLUME = 0.34;
const SUPPORT_ATTACK_BGM_DUCK_IN_MS = 260;
const SUPPORT_ATTACK_BGM_DUCK_OUT_MS = 520;
const GENSO_KNIGHTS_SUPPORT_CHANCE = 0.05;
const GENSO_KNIGHTS_INTRO_MS = 13000;
const GENSO_KNIGHTS_ATTACK_END_MS = 75000;
const GENSO_KNIGHTS_EVENT_END_MS = 77000;
const GENSO_KNIGHTS_DAMAGE = 99999;
const GENSO_KNIGHTS_BOSS_COIN_DROPS = 5;
const GENSO_KNIGHTS_TOTAL_COIN_DROPS = 20;
const GENSO_KNIGHTS_BOSS_LONGEST_SIDE = 490;
const GENSO_KNIGHTS_CHARACTER_HEIGHT_MULTIPLIER = 1.3;
const GENSO_KNIGHTS_CUTIN_HOLD_MS = 2200;
const GENSO_KNIGHTS_BOSS_MOVE_SPEED = 62;
const GENSO_KNIGHTS_BOSS_STOP_DISTANCE = 210;
const GENSO_KNIGHTS_BOSS_WARN_MS = 620;
const GENSO_KNIGHTS_BOSS_LUNGE_DISTANCE = 96;
const GENSO_KNIGHTS_ARROW_BARRAGE_COUNT = 9;
const GENSO_KNIGHTS_ARROW_BARRAGE_RADIUS = 340;
const GENSO_KNIGHTS_ARROW_BARRAGE_HIT_CAP = 10;
const GENSO_KNIGHTS_SUPPORT_DASH_SPEED = 980;
const GENSO_KNIGHTS_SUPPORT_RETREAT_SPEED = 560;
const GENSO_KNIGHTS_SUPPORT_MELEE_RANGE = 118;
const GENSO_KNIGHTS_SUPPORT_RANGED_KEEP_DISTANCE = 340;
const GENSO_KNIGHTS_SUPPORT_HOME_RETURN_SPEED = 150;
const GENSO_KNIGHTS_DEFAULT_TARGET_SEARCH_PADDING = 80;
const GENSO_KNIGHTS_NORMAL_SWEEPER_SEARCH_PADDING = 560;
const GENSO_KNIGHTS_GUARD_KNOCKBACK_DISTANCE = 270;
const GENSO_KNIGHTS_GUARD_KNOCKBACK_MS = 300;
const GENSO_KNIGHTS_GUARD_RECOVER_MS = 360;
const GENSO_KNIGHTS_GUARD_EFFECT_FRAME_MS = 46;
const GENSO_KNIGHTS_GUARD_EFFECT_SIZE = 250;
const DAMAGE_TEXT_FONT_SIZE_MULTIPLIER = 2;
const CD_SHOP_SLOT_COUNT = 10;
const DEFAULT_BEST_RECORD = {
  survivalTimeMs: 0,
  level: 0,
  kills: 0,
  eliteKills: 0
};
const CD_CATALOG = [
  {
    id: "anju",
    title: "Anju",
    subtitle: "Purple Night Beat",
    price: 0,
    startsUnlocked: true,
    jacketTextureKey: "cd-jacket-anju",
    lockedJacketTextureKey: "cd-jacket-anju-locked",
    jacketPath: "./画像/cd/anju.png",
    lockedJacketPath: "./画像/cd/anju_locked.png",
    audioKey: "bgm-anju",
    audioPath: "./音声/bgm/anju.mp3"
  },
  {
    id: "nandeyanen",
    title: "なんでやねんねん",
    subtitle: "Akane Orange Beat",
    price: 5000,
    startsUnlocked: false,
    jacketTextureKey: "cd-jacket-nandeyanen",
    lockedJacketTextureKey: "cd-jacket-nandeyanen-locked",
    jacketPath: "./画像/cd/nandeyanen.png",
    lockedJacketPath: "./画像/cd/nandeyanen_locked.png",
    audioKey: "bgm-nandeyanen",
    audioPath: "./音声/bgm/nandeyanen.mp3"
  },
  {
    id: "hanseikai",
    title: "反省会",
    subtitle: "Neon HipHop Session",
    price: 8000,
    startsUnlocked: false,
    jacketTextureKey: "cd-jacket-hanseikai",
    lockedJacketTextureKey: "cd-jacket-hanseikai-locked",
    jacketPath: "./画像/cd/hanseikai.png",
    lockedJacketPath: "./画像/cd/hanseikai_locked.png",
    audioKey: "bgm-hanseikai",
    audioPath: "./音声/bgm/hanseikai.mp3"
  },
  {
    id: "miraiwoikiteru",
    title: "未来を生きてる",
    subtitle: "Beat Fusion Future",
    price: 12000,
    startsUnlocked: false,
    jacketTextureKey: "cd-jacket-miraiwoikiteru",
    lockedJacketTextureKey: "cd-jacket-miraiwoikiteru-locked",
    jacketPath: "./画像/cd/miraiwoikiteru.png",
    lockedJacketPath: "./画像/cd/miraiwoikiteru_locked.png",
    audioKey: "bgm-miraiwoikiteru",
    audioPath: "./音声/bgm/miraiwoikiteru.mp3"
  }
];
const SHOP_UPGRADE_DEFINITIONS = {
  weapon: {
    id: "weapon",
    title: "武器強化",
    shortTitle: "WEAPON",
    description: "攻撃力 +6% / Lv",
    maxLevel: 10,
    baseCost: 1000,
    costGrowth: 1.58,
    accent: 0xf0c463
  },
  armor: {
    id: "armor",
    title: "鎧強化",
    shortTitle: "ARMOR",
    description: "最大HP +10 / Lv",
    maxLevel: 10,
    baseCost: 1000,
    costGrowth: 1.52,
    accent: 0x66d25f
  },
  shoes: {
    id: "shoes",
    title: "靴強化",
    shortTitle: "SHOES",
    description: "移動速度 +8 / Lv",
    maxLevel: 10,
    baseCost: 1000,
    costGrowth: 1.48,
    accent: 0x45a9ff
  }
};
const DEFAULT_SHOP_STATE = {
  ownedCdIds: [DEFAULT_CD_ID],
  selectedCdId: DEFAULT_CD_ID,
  upgrades: {
    weapon: 0,
    armor: 0,
    shoes: 0
  }
};
const MAX_ACTIVE_SPECIAL_ITEMS = 6;
const SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER = 1.2;
const STAGE_DEBUG_OPTIONS = {
  enabled: false,
  showObstacleHitboxes: true,
  showObstacleLabels: true,
  showCounts: true,
  layerVisibility: {
    backdrop: true,
    ground: true,
    crosswalks: true,
    decals: true,
    boundaries: true,
    boundaryOcclusion: true,
    obstacleShadows: true,
    obstacles: true
  }
};
const HUD_STYLE = {
  panelFill: 0x06090b,
  panelAlpha: 0.72,
  panelStroke: 0xa9b7bb,
  accent: 0xd7e5e8,
  muted: "#a7b5b9",
  text: "#eef6f5",
  warn: "#f3c06b",
  danger: "#ff7970",
  hp: 0x66d25f,
  xp: 0x45a9ff,
  slotFill: 0x0b1013,
  slotStroke: 0xb8c4c8
};
const HUD_IMAGE_ASSETS = {
  overlayFrame: {
    textureKey: "hud-overlay-frame",
    imagePath: "./画像/ui/hud/hud_overlay_frame.png"
  }
};
const ITEM_IMAGE_ASSETS = {
  bronzeBox: {
    textureKey: "rare-box-bronze",
    imagePath: "./画像/items/rare/rare_box_bronze.png"
  },
  silverBox: {
    textureKey: "rare-box-silver",
    imagePath: "./画像/items/rare/rare_box_silver.png"
  },
  goldBox: {
    textureKey: "rare-box-gold",
    imagePath: "./画像/items/rare/rare_box_gold.png"
  },
  coin: {
    textureKey: "hud-coin-icon",
    imagePath: "./画像/ui/hud/coin.png"
  }
};
const ROBOT_MAX_LEVEL = 10;
const ROBOT_ABILITY_MAX_LEVEL = 20;
const ROBOT_BOSS_DROP_CHANCE = 0.32;
const ROBOT_VASE_XP_BONUS = 8;
const ROBOT_MISSILE_HIT_XP = 1;
const ROBOT_FIELD_PULSE_XP = 1;
const ROBOT_IMAGE_ASSETS = {
  robotLevels: Array.from({ length: ROBOT_MAX_LEVEL }, (_, index) => {
    const level = index + 1;
    return {
      textureKey: `robot-level-${level}`,
      imagePath: `./画像/robot/robot_lv${String(level).padStart(2, "0")}.png`
    };
  }),
  missileFrames: Array.from({ length: 8 }, (_, index) => {
    const frame = index + 1;
    return {
      textureKey: `robot-missile-frame-${frame}`,
      imagePath: `./画像/robot/missile_frame_${String(frame).padStart(2, "0")}.png`
    };
  }),
  explosionFrames: Array.from({ length: 8 }, (_, index) => {
    const frame = index + 1;
    return {
      textureKey: `robot-missile-explosion-frame-${frame}`,
      imagePath: `./画像/robot/missile_explosion_frame_${String(frame).padStart(2, "0")}.png`
    };
  }),
  recoveryFields: Array.from({ length: ROBOT_MAX_LEVEL }, (_, index) => {
    const level = index + 1;
    return {
      textureKey: `robot-recovery-field-${level}`,
      imagePath: `./画像/robot/recovery_field_lv${String(level).padStart(2, "0")}.png`
    };
  })
};
const ROBOT_ITEM_IMAGE_ASSETS = {
  missileChest: {
    textureKey: "robot-chest-gold",
    imagePath: "./画像/items/robot/robot_chest_gold.png"
  },
  healChest: {
    textureKey: "robot-chest-silver",
    imagePath: "./画像/items/robot/robot_chest_silver.png"
  },
  tuningVaseGold: {
    textureKey: "robot-vase-gold",
    imagePath: "./画像/items/robot/robot_vase_gold.png"
  },
  tuningVaseSilver: {
    textureKey: "robot-vase-silver",
    imagePath: "./画像/items/robot/robot_vase_silver.png"
  }
};
const BOSS_ATTACK_EFFECT_ASSETS = {
  crackShockwave: {
    textureKey: "boss-effect-crack-shockwave",
    imagePath: "./画像/effects/boss/crack_shockwave.png"
  },
  beamLance: {
    textureKey: "boss-effect-beam-lance",
    imagePath: "./画像/effects/boss/beam_lance.png"
  },
  fanBlast: {
    textureKey: "boss-effect-fan-blast",
    imagePath: "./画像/effects/boss/fan_blast.png"
  },
  tripleExplosion: {
    textureKey: "boss-effect-triple-explosion",
    imagePath: "./画像/effects/boss/triple_explosion.png"
  },
  lightningStrike: {
    textureKey: "boss-effect-lightning-strike",
    imagePath: "./画像/effects/boss/lightning_strike.png"
  },
  dashStreak: {
    textureKey: "boss-effect-dash-streak",
    imagePath: "./画像/effects/boss/dash_streak.png"
  }
};
const RARE_ITEM_PILLAR_EFFECT_ASSETS = {
  bronze: {
    animationKey: "rare-pillar-bronze",
    frameRate: 10,
    animationFrames: Array.from({ length: 8 }, (_, index) => ({
      textureKey: `rare-pillar-bronze-${index}`,
      imagePath: `./画像/effects/rare_pillars/bronze_${index}.png`
    }))
  },
  silver: {
    animationKey: "rare-pillar-silver",
    frameRate: 10,
    animationFrames: Array.from({ length: 8 }, (_, index) => ({
      textureKey: `rare-pillar-silver-${index}`,
      imagePath: `./画像/effects/rare_pillars/silver_${index}.png`
    }))
  },
  gold: {
    animationKey: "rare-pillar-gold",
    frameRate: 10,
    animationFrames: Array.from({ length: 8 }, (_, index) => ({
      textureKey: `rare-pillar-gold-${index}`,
      imagePath: `./画像/effects/rare_pillars/gold_${index}.png`
    }))
  }
};
const MONSTER_IMAGE_ASSETS = {
  slimeDefault: {
    textureKey: "monster-slime-default",
    imagePath: "./画像/monster/slime/sprite_2.png",
    sourceFile: "sprite_2.png",
    animationKey: "monster-slime-idle",
    animationFrameRate: 7,
    animationFrames: [
      { textureKey: "monster-slime-0", imagePath: "./画像/monster/slime/sprite_0.png", sourceFile: "sprite_0.png" },
      { textureKey: "monster-slime-1", imagePath: "./画像/monster/slime/sprite_1.png", sourceFile: "sprite_1.png" },
      { textureKey: "monster-slime-default", imagePath: "./画像/monster/slime/sprite_2.png", sourceFile: "sprite_2.png" },
      { textureKey: "monster-slime-3", imagePath: "./画像/monster/slime/sprite_3.png", sourceFile: "sprite_3.png" },
      { textureKey: "monster-slime-4", imagePath: "./画像/monster/slime/sprite_4.png", sourceFile: "sprite_4.png" }
    ]
  },
  goldSlime: {
    textureKey: "monster-gold-slime-0",
    imagePath: "./画像/monster/gold_slime/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-gold-slime-idle",
    animationFrameRate: 7,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-gold-slime-${index}`,
      imagePath: `./画像/monster/gold_slime/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  silverSlime: {
    textureKey: "monster-silver-slime-0",
    imagePath: "./画像/monster/silver_slime/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-silver-slime-idle",
    animationFrameRate: 7,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-silver-slime-${index}`,
      imagePath: `./画像/monster/silver_slime/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  roseFairyDash: {
    textureKey: "monster-rose-fairy-0",
    imagePath: "./画像/monster/rose_fairy/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-rose-fairy-flap",
    animationFrameRate: 12,
    animationYoyo: false,
    animationFrames: [
      { textureKey: "monster-rose-fairy-0", imagePath: "./画像/monster/rose_fairy/sprite_0.png", sourceFile: "sprite_0.png" },
      { textureKey: "monster-rose-fairy-1", imagePath: "./画像/monster/rose_fairy/sprite_1.png", sourceFile: "sprite_1.png" },
      { textureKey: "monster-rose-fairy-2", imagePath: "./画像/monster/rose_fairy/sprite_2.png", sourceFile: "sprite_2.png" },
      { textureKey: "monster-rose-fairy-3", imagePath: "./画像/monster/rose_fairy/sprite_3.png", sourceFile: "sprite_3.png" },
      { textureKey: "monster-rose-fairy-4", imagePath: "./画像/monster/rose_fairy/sprite_4.png", sourceFile: "sprite_4.png" },
      { textureKey: "monster-rose-fairy-5", imagePath: "./画像/monster/rose_fairy/sprite_5.png", sourceFile: "sprite_5.png" }
    ]
  },
  golemTank: {
    textureKey: "monster-golem-tank",
    imagePath: "./画像/monster/golem/sprite_1.png",
    sourceFile: "sprite_1.png",
    animationKey: "monster-golem-heavy-walk",
    animationFrameRate: 5,
    animationRepeatDelay: 90,
    animationFrames: [
      { textureKey: "monster-golem-0", imagePath: "./画像/monster/golem/sprite_0.png", sourceFile: "sprite_0.png" },
      { textureKey: "monster-golem-tank", imagePath: "./画像/monster/golem/sprite_1.png", sourceFile: "sprite_1.png" },
      { textureKey: "monster-golem-2", imagePath: "./画像/monster/golem/sprite_2.png", sourceFile: "sprite_2.png" },
      { textureKey: "monster-golem-3", imagePath: "./画像/monster/golem/sprite_3.png", sourceFile: "sprite_3.png" },
      { textureKey: "monster-golem-4", imagePath: "./画像/monster/golem/sprite_4.png", sourceFile: "sprite_4.png" }
    ]
  },
  laserDrone: {
    textureKey: "monster-laser-drone",
    imagePath: "./画像/monster/laser_drone/laser_drone_01.png",
    sourceFile: "laser_drone_01.png"
  },
  bossCrack: {
    textureKey: "monster-boss-crack-0",
    imagePath: "./画像/monster/boss_crack/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-crack-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-crack-${index}`,
      imagePath: `./画像/monster/boss_crack/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  bossBeam: {
    textureKey: "monster-boss-beam-0",
    imagePath: "./画像/monster/boss_beam/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-beam-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-beam-${index}`,
      imagePath: `./画像/monster/boss_beam/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  bossFan: {
    textureKey: "monster-boss-fan-0",
    imagePath: "./画像/monster/boss_fan/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-fan-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-fan-${index}`,
      imagePath: `./画像/monster/boss_fan/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  bossTripleBlast: {
    textureKey: "monster-boss-triple-blast-0",
    imagePath: "./画像/monster/boss_triple_blast/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-triple-blast-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-triple-blast-${index}`,
      imagePath: `./画像/monster/boss_triple_blast/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  bossRandomBlast: {
    textureKey: "monster-boss-random-blast-0",
    imagePath: "./画像/monster/boss_random_blast/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-random-blast-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-random-blast-${index}`,
      imagePath: `./画像/monster/boss_random_blast/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  },
  bossLightningDash: {
    textureKey: "monster-boss-lightning-dash-0",
    imagePath: "./画像/monster/boss_lightning_dash/sprite_0.png",
    sourceFile: "sprite_0.png",
    animationKey: "monster-boss-lightning-dash-idle",
    animationFrameRate: 6,
    animationFrames: Array.from({ length: 5 }, (_, index) => ({
      textureKey: `monster-boss-lightning-dash-${index}`,
      imagePath: `./画像/monster/boss_lightning_dash/sprite_${index}.png`,
      sourceFile: `sprite_${index}.png`
    }))
  }
};
const BOSS_TYPE_SEQUENCE = [
  "boss_crack",
  "boss_beam",
  "boss_fan",
  "boss_triple_blast",
  "boss_random_blast",
  "boss_lightning_dash"
];
const ENEMY_DEFINITIONS = {
  chaser: {
    id: "chaser",
    label: "Chaser",
    textureKey: MONSTER_IMAGE_ASSETS.slimeDefault.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.slimeDefault.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.slimeDefault.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 2.7,
    speed: 86,
    contactDamage: 13,
    xpValue: 1,
    scale: 0.98,
    spriteScale: 0.13,
    effectScale: 1,
    hitRadius: 18,
    hitboxCenterY: 0.58,
    aiBehavior: "chase",
    knockbackResist: 0.04
  },
  dash: {
    id: "dash",
    label: "Dash",
    textureKey: MONSTER_IMAGE_ASSETS.roseFairyDash.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.roseFairyDash.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.roseFairyDash.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 1.9,
    speed: 116,
    contactDamage: 12,
    xpValue: 1,
    scale: 0.86,
    spriteScale: 0.15,
    effectScale: 1.15,
    hitRadius: 15,
    hitboxCenterX: 0.64,
    hitboxCenterY: 0.58,
    aiBehavior: "dash",
    dashSpeed: 220,
    dashDurationMs: 320,
    dashCooldownMs: 1450,
    knockbackResist: 0.12
  },
  gold_slime: {
    id: "gold_slime",
    label: "Gold Slime",
    textureKey: MONSTER_IMAGE_ASSETS.goldSlime.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.goldSlime.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.goldSlime.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 7.8,
    speed: 92,
    contactDamage: 9,
    xpValue: 4,
    scale: 1.62,
    spriteScale: 0.255,
    effectScale: 2.01,
    hitRadius: 35,
    hitboxCenterY: 0.62,
    aiBehavior: "chase",
    guaranteedDrops: {
      rareItem: "gold",
      robotItem: "tuningVaseGold"
    },
    knockbackResist: 0.24
  },
  silver_slime: {
    id: "silver_slime",
    label: "Silver Slime",
    textureKey: MONSTER_IMAGE_ASSETS.silverSlime.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.silverSlime.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.silverSlime.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 6.9,
    speed: 96,
    contactDamage: 8,
    xpValue: 3,
    scale: 1.56,
    spriteScale: 0.255,
    effectScale: 1.92,
    hitRadius: 33,
    hitboxCenterY: 0.62,
    aiBehavior: "chase",
    guaranteedDrops: {
      rareItem: "silver",
      robotItem: "tuningVaseSilver"
    },
    knockbackResist: 0.2
  },
  tank: {
    id: "tank",
    label: "Tank",
    textureKey: MONSTER_IMAGE_ASSETS.golemTank.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.golemTank.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.golemTank.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 7.1,
    speed: 66,
    contactDamage: 20,
    xpValue: 2,
    scale: 2.56,
    spriteScale: 0.38,
    effectScale: 2.76,
    hitRadius: 52,
    hitboxCenterY: 0.62,
    aiBehavior: "chase",
    knockbackResist: 0.58
  },
  ranged: {
    id: "ranged",
    label: "Ranged",
    textureKey: MONSTER_IMAGE_ASSETS.laserDrone.textureKey,
    fallbackTextureKey: "enemy-ranged-core",
    tint: 0xffffff,
    hp: 4.6,
    speed: 78,
    contactDamage: 12,
    xpValue: 2,
    scale: 1.04,
    spriteScale: 0.16,
    effectScale: 1.2,
    hitRadius: 27,
    hitboxCenterY: 0.56,
    aiBehavior: "ranged",
    preferredRange: 620,
    keepAwayRange: 430,
    rangeTolerance: 90,
    strafeSpeed: 58,
    attackIntervalMs: 2300,
    beamRange: 920,
    beamChargeMs: 1800,
    beamDamage: 14,
    beamWidth: 34,
    beamTint: 0xff2f38,
    beamCoreTint: 0xffb8ba,
    knockbackResist: 0.16
  },
  boss_crack: {
    id: "boss_crack",
    label: "Crack Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossCrack.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossCrack.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossCrack.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 22,
    speed: 54,
    contactDamage: 18,
    xpValue: 12,
    scale: 2.2,
    spriteScale: 0.51,
    effectScale: 4.2,
    hitRadius: 87,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "radialCrack",
    bossPreferredRange: 250,
    attackIntervalMs: 4200,
    attackChargeMs: 1150,
    attackDamage: 18,
    attackRadius: 540,
    knockbackResist: 0.9
  },
  boss_beam: {
    id: "boss_beam",
    label: "Beam Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossBeam.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossBeam.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossBeam.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 20,
    speed: 64,
    contactDamage: 16,
    xpValue: 12,
    scale: 2.1,
    spriteScale: 0.48,
    effectScale: 3.83,
    hitRadius: 75,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "beam",
    bossPreferredRange: 520,
    attackIntervalMs: 3600,
    attackChargeMs: 1200,
    attackDamage: 17,
    beamRange: 1350,
    beamWidth: 126,
    knockbackResist: 0.86
  },
  boss_fan: {
    id: "boss_fan",
    label: "Fan Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossFan.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossFan.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossFan.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 21,
    speed: 62,
    contactDamage: 17,
    xpValue: 12,
    scale: 2.05,
    spriteScale: 0.465,
    effectScale: 3.75,
    hitRadius: 72,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "fanBlast",
    bossPreferredRange: 410,
    attackIntervalMs: 3900,
    attackChargeMs: 1200,
    attackDamage: 17,
    fanRange: 780,
    fanAngle: Math.PI * 0.62,
    knockbackResist: 0.88
  },
  boss_triple_blast: {
    id: "boss_triple_blast",
    label: "Triple Blast Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossTripleBlast.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossTripleBlast.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossTripleBlast.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 21,
    speed: 68,
    contactDamage: 16,
    xpValue: 12,
    scale: 2.05,
    spriteScale: 0.48,
    effectScale: 3.75,
    hitRadius: 75,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "tripleBlast",
    bossPreferredRange: 360,
    attackIntervalMs: 4000,
    attackChargeMs: 850,
    attackDamage: 13,
    blastRadius: 123,
    blastSpacing: 225,
    blastStartOffset: 120,
    knockbackResist: 0.86
  },
  boss_random_blast: {
    id: "boss_random_blast",
    label: "Random Blast Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossRandomBlast.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossRandomBlast.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossRandomBlast.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 20,
    speed: 70,
    contactDamage: 16,
    xpValue: 12,
    scale: 2.05,
    spriteScale: 0.465,
    effectScale: 3.72,
    hitRadius: 69,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "randomBlast",
    bossPreferredRange: 330,
    attackIntervalMs: 3600,
    attackChargeMs: 900,
    attackDamage: 14,
    blastRadius: 195,
    randomBlastRange: 630,
    knockbackResist: 0.84
  },
  boss_lightning_dash: {
    id: "boss_lightning_dash",
    label: "Lightning Dash Boss",
    textureKey: MONSTER_IMAGE_ASSETS.bossLightningDash.textureKey,
    animationKey: MONSTER_IMAGE_ASSETS.bossLightningDash.animationKey,
    animationFrameCount: MONSTER_IMAGE_ASSETS.bossLightningDash.animationFrames.length,
    fallbackTextureKey: "enemy-core",
    tint: 0xffffff,
    hp: 18,
    speed: 92,
    contactDamage: 17,
    xpValue: 12,
    scale: 2,
    spriteScale: 0.465,
    effectScale: 3.68,
    hitRadius: 68,
    hitboxCenterY: 0.58,
    aiBehavior: "bossSpecial",
    bossAttackPattern: "lightningDash",
    bossPreferredRange: 430,
    attackIntervalMs: 3300,
    attackChargeMs: 750,
    attackDamage: 15,
    dashRange: 780,
    dashSpeed: 360,
    dashDurationMs: 560,
    lightningRadius: 138,
    knockbackResist: 0.8
  }
};
const WAVE_DEFINITIONS = [
  {
    id: 1,
    label: "Assault",
    spawnInterval: 900,
    spawnBatch: [3, 4],
    maxEnemies: 44,
    hpScale: 1,
    speedScale: 1,
    damageScale: 1,
    enemyWeights: { chaser: 10, dash: 2, tank: 1, ranged: 1, gold_slime: 0.025, silver_slime: 0.05 },
    bossWeights: { boss_crack: 1 }
  }
];
const RARE_ITEM_DEFINITIONS = {
  bronze: {
    id: "bronze",
    label: "Bronze",
    textureKey: ITEM_IMAGE_ASSETS.bronzeBox.textureKey,
    xpValue: 10,
    coinValue: 100,
    dropChance: 0.0025,
    eliteBonusChance: 0.004,
    tint: 0x55f36f,
    glowTint: 0xb4ff92,
    scale: 0.24,
    effectScale: 1.06,
    pickupRadius: 26
  },
  silver: {
    id: "silver",
    label: "Silver",
    textureKey: ITEM_IMAGE_ASSETS.silverBox.textureKey,
    xpValue: 20,
    coinValue: 1000,
    dropChance: 0.0008,
    eliteBonusChance: 0.0016,
    tint: 0x39c8ff,
    glowTint: 0xa7eaff,
    scale: 0.25,
    effectScale: 1.14,
    pickupRadius: 27
  },
  gold: {
    id: "gold",
    label: "Gold",
    textureKey: ITEM_IMAGE_ASSETS.goldBox.textureKey,
    xpValue: 38,
    coinValue: 3000,
    dropChance: 0.00025,
    eliteBonusChance: 0.00055,
    tint: 0xff55e9,
    glowTint: 0xffb0ff,
    scale: 0.26,
    effectScale: 1.22,
    pickupRadius: 28
  }
};
const SPECIAL_ITEM_DEFINITIONS = {
  heal: {
    id: "heal",
    label: "Heal",
    textureKey: "pickup-heal",
    effectType: "heal",
    dropChance: 0.0022,
    eliteBonusChance: 0.0045,
    tint: 0x7de7a1,
    glowTint: 0xd6ffe6,
    scale: 0.92,
    healAmount: 24
  },
  magnet: {
    id: "magnet",
    label: "Magnet",
    textureKey: "pickup-magnet",
    effectType: "magnet",
    dropChance: 0.0015,
    eliteBonusChance: 0.0032,
    tint: 0x7caeff,
    glowTint: 0xd9e8ff,
    scale: 0.96,
    magnetRadius: 980,
    magnetDurationMs: 1600,
    magnetPullSpeed: 820
  },
  bomb: {
    id: "bomb",
    label: "Support",
    textureKey: "pickup-bomb",
    effectType: "bomb",
    // Debug tuning: temporarily raised so support attacks can be tested often.
    dropChance: 0.22,
    eliteBonusChance: 0.48,
    tint: 0xff8f69,
    glowTint: 0xffd9c9,
    scale: 0.98,
    damageAmount: 6,
    knockbackForce: 420,
    recoverMs: 180,
    screenPadding: 96
  }
};
const ROBOT_DROP_DEFINITIONS = {
  missileChest: {
    id: "robotMissileChest",
    label: "Missile Core",
    textureKey: ROBOT_ITEM_IMAGE_ASSETS.missileChest.textureKey,
    effectType: "robotMissileLevel",
    tint: 0xffcb55,
    glowTint: 0xfff0ae,
    scale: 0.24,
    pickupRadius: 28,
    weight: 5
  },
  healChest: {
    id: "robotHealChest",
    label: "Recovery Core",
    textureKey: ROBOT_ITEM_IMAGE_ASSETS.healChest.textureKey,
    effectType: "robotHealLevel",
    tint: 0xbfd2ff,
    glowTint: 0xf0f6ff,
    scale: 0.24,
    pickupRadius: 28,
    weight: 5
  },
  tuningVaseGold: {
    id: "robotTuningVaseGold",
    label: "Golden Tune Vase",
    textureKey: ROBOT_ITEM_IMAGE_ASSETS.tuningVaseGold.textureKey,
    effectType: "robotMissileAbilityChoice",
    tint: 0xffd468,
    glowTint: 0xfff2ba,
    scale: 0.25,
    pickupRadius: 30,
    weight: 2
  },
  tuningVaseSilver: {
    id: "robotTuningVaseSilver",
    label: "Silver Tune Vase",
    textureKey: ROBOT_ITEM_IMAGE_ASSETS.tuningVaseSilver.textureKey,
    effectType: "robotFieldAbilityChoice",
    tint: 0xd6dcff,
    glowTint: 0xf6f1ff,
    scale: 0.25,
    pickupRadius: 30,
    weight: 3
  }
};
const SUPPORT_ATTACK_DEFINITIONS = [
  {
    id: "popochan",
    label: "ぽぽちゃん",
    noticeLabel: "ARINA LEGEND",
    type: "pullBurst",
    tint: 0xff5a33,
    glowTint: 0xffd08b,
    frameCount: 8,
    frameMs: 165,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER,
    supportScaleReferenceHeight: 152,
    supportOffsetX: 150,
    supportOffsetY: -20,
    supportShadowOffsetY: 56,
    actionCenterOffsetY: 38,
    showFieldVisual: false,
    showArrivalRing: false,
    useSeparateAttackEffect: true,
    attackEffectFrameStartIndex: 1,
    attackEffectMatchPlayerUntilFrameIndex: 3,
    attackEffectLongestSide: 260,
    attackEffectOffsetX: 0,
    attackEffectOffsetY: -18,
    idleSpriteLongestSide: 120,
    attackSpriteLongestSide: 120,
    spriteLongestSide: 120,
    durationMs: 5000,
    suctionTargetMode: "screen",
    suctionScreenPadding: 180,
    suctionRadius: 2200,
    suctionForce: 96,
    suctionMoveSpeed: 760,
    suctionDurationMs: 3000,
    holdFirstFrameUntilMs: 3000,
    attackFrameStartIndex: 1,
    animationLoop: false,
    burstAtMs: 3000,
    damageRadius: 480,
    damageAmount: 9999,
    knockbackForce: 560
  },
  {
    id: "eitofo",
    label: "えいとふぉー",
    noticeLabel: "SLEEP FIELD",
    type: "statusField",
    statusType: "sleep",
    tint: 0x9dff5a,
    glowTint: 0xe9ff95,
    frameCount: 8,
    frameMs: 120,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER,
    supportScaleReferenceHeight: 306,
    holdFrameIndex: 6,
    holdFrameDurationMs: 10000,
    fieldEffectFrameCount: 1,
    fieldVisualRadius: 760,
    fieldVisualAnchor: "feet",
    fieldVisualOffsetY: 0,
    fieldVisualOriginY: 0.66,
    fieldVisualFootRatio: 0.46,
    fieldVisualWidthMultiplier: 2,
    fieldVisualHeightMultiplier: 1.25,
    fieldActiveStartFrameIndex: 5,
    fieldActiveDurationMs: 10120,
    arrivalSeKey: "support-eitofo-arrival-voice",
    arrivalSePath: "./音声/support/eitofo/voice.wav",
    arrivalSeVolume: 0.88,
    fieldStartSeKey: "support-eitofo-field-start-se",
    fieldStartSePath: "./音声/support/eitofo/se1.wav",
    fieldStartSeVolume: 0.78,
    statusApplySeKey: "support-eitofo-sleep-se",
    statusApplySePath: "./音声/support/eitofo/se2.wav",
    statusApplySeVolume: 0.42,
    statusApplySeCooldownMs: 180,
    statusPulseVisual: false,
    spriteLongestSide: 280,
    durationMs: 11320,
    radius: 760,
    tickMs: 110,
    statusHoldMs: 260
  },
  {
    id: "hametarou",
    label: "いもたろう",
    noticeLabel: "FREEZE FIELD",
    type: "statusField",
    statusType: "freeze",
    tint: 0x7fdcff,
    glowTint: 0xe1fbff,
    frameCount: 8,
    frameMs: 120,
    holdFrameIndex: 5,
    holdFrameDurationMs: 10000,
    fieldEffectFrameCount: 5,
    fieldVisualRadius: 760,
    fieldVisualOffsetY: 86,
    fieldActiveStartFrameIndex: 5,
    fieldActiveDurationMs: 10000,
    arrivalSeKey: "support-hametarou-arrival-se",
    arrivalSePath: "./音声/support/hametarou/se5.wav",
    arrivalSeVolume: 0.82,
    fieldStartSeKey: "support-hametarou-field-start-se",
    fieldStartSePath: "./音声/support/hametarou/se3.wav",
    fieldStartSeVolume: 0.78,
    statusApplySeKey: "support-hametarou-freeze-se",
    statusApplySePath: "./音声/support/hametarou/se4.wav",
    statusApplySeVolume: 0.78,
    statusApplySeCooldownMs: 180,
    statusPulseVisual: false,
    spriteLongestSide: 320,
    durationMs: 11600,
    radius: 760,
    tickMs: 110,
    statusHoldMs: 260
  },
  {
    id: "kapipi",
    label: "かぴぴ",
    noticeLabel: "HEAL FIELD",
    type: "healField",
    tint: 0x7dff72,
    glowTint: 0xf0ffb2,
    frameCount: 8,
    frameMs: 120,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER,
    supportScaleReferenceHeight: 263,
    holdFrameIndex: 4,
    holdFrameDurationMs: 10000,
    fieldEffectFrameCount: 1,
    fieldVisualRadius: 760,
    fieldVisualAnchor: "feet",
    fieldVisualOffsetY: 0,
    fieldVisualOriginY: 0.66,
    fieldVisualFootRatio: 0.46,
    fieldActiveStartFrameIndex: 4,
    fieldActiveDurationMs: 10000,
    spriteLongestSide: 260,
    durationMs: 11200,
    radius: 760,
    healAmount: 5,
    healTickMs: 500,
    supportBgmKey: "support-kapipi-bgm",
    supportBgmPath: "./音声/support/kapipi/bgm.wav",
    supportBgmVolume: 0.58,
    supportBgmFadeInMs: 520,
    supportBgmFadeOutMs: 560,
    cutinVoiceKey: "support-kapipi-cutin-voice",
    cutinVoicePath: "./音声/support/kapipi/voice.wav",
    cutinVoiceVolume: 0.9,
    healTickSeKey: "support-kapipi-heal-se",
    healTickSePath: "./音声/support/kapipi/se01.wav",
    healTickSeVolume: 0.72
  },
  {
    id: "emoko",
    label: "えも子",
    noticeLabel: "EMOKO THUNDER",
    type: "followThunder",
    tint: 0x8bf7ff,
    glowTint: 0xf4ffff,
    frameCount: 6,
    frameMs: 96,
    fieldEffectFrameCount: 6,
    fieldEffectFrameMs: 70,
    cutinVoiceKey: "support-emoko-cutin-voice",
    cutinVoicePath: "./音声/support/emoko/voice.wav",
    cutinVoiceVolume: 0.9,
    thunderSeKey: "support-emoko-thunder-se",
    thunderSePath: "./音声/support/emoko/lightning.wav",
    thunderSeVolume: 0.78,
    thunderSeCooldownMs: 160,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER,
    supportScaleReferenceHeight: 446,
    supportOffsetX: 118,
    supportOffsetY: -24,
    supportShadowOffsetY: 60,
    durationMs: 10000,
    targetRadius: 720,
    followSpeed: 620,
    followAdvanceDistance: 92,
    attackInitialDelayMs: 320,
    attackIntervalMs: 980,
    attackFrameIndex: 2,
    thunderRadiusStart: 96,
    thunderRadius: 560,
    thunderExpandMs: 540,
    thunderHitTickMs: 45,
    damageAmount: 16,
    stunHoldMs: 620,
    knockbackForce: 260,
    spriteLongestSide: 300
  },
  {
    id: "ishiden",
    label: "いしでん",
    noticeLabel: "出金戦争",
    type: "timingCoin",
    tint: 0xffd85c,
    glowTint: 0xfff5a8,
    frameCount: 5,
    frameMs: 135,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER * 1.15,
    supportScaleReferenceHeight: 276,
    startHidden: true,
    supportOffsetX: 120,
    supportOffsetY: -20,
    supportShadowOffsetY: 68,
    holdFrameIndex: 3,
    holdFrameDurationMs: 15400,
    fieldEffectFrameCount: 5,
    fieldVisualRadius: 780,
    fieldVisualAnchor: "feet",
    fieldVisualOffsetY: 20,
    fieldVisualOriginY: 0.62,
    fieldVisualFootRatio: 0.48,
    fieldVisualWidthMultiplier: 2.05,
    fieldVisualHeightMultiplier: 1.04,
    fieldActiveStartMs: 4200,
    fieldActiveDurationMs: 15800,
    titleLetterFrameCount: 6,
    titleStartMs: 160,
    titleLetterDelayMs: 190,
    titleHoldMs: 760,
    titleLetterDisplayHeight: 236,
    titleLetterMaxWidth: 1180,
    titleLetterY: GAME_HEIGHT / 2,
    titleLetterSeKey: "support-ishiden-title-se",
    titleLetterSePath: "./音声/support/ishiden/font1_5se.wav",
    titleLetterSeVolume: 0.78,
    titleFinalSeKey: "support-ishiden-title-final-se",
    titleFinalSePath: "./音声/support/ishiden/font6.wav",
    titleFinalSeVolume: 0.84,
    cutinAtMs: 2300,
    cutinVoiceKey: "support-ishiden-cutin-voice",
    cutinVoicePath: "./音声/support/ishiden/voice.wav",
    cutinVoiceVolume: 0.9,
    revealAtMs: 4000,
    countdownStartMs: 5000,
    countdownDurationMs: 13000,
    countdownPerfectOffsetMs: 10000,
    countdownClockStartMs: (11 * 60 * 60 + 59 * 60 + 50) * 1000,
    successWindowMs: 120,
    countdownBgmKey: "support-ishiden-countdown-bgm",
    countdownBgmPath: "./音声/support/ishiden/countdown.wav",
    countdownBgmVolume: 0.58,
    countdownBgmLoop: false,
    countdownBgmFadeInMs: 520,
    countdownBgmFadeOutMs: 560,
    hasPushButton: true,
    pushButtonDisplayWidth: 262,
    resultTextY: GAME_HEIGHT / 2 + 196,
    resultTextDepth: 672,
    rewardCoinDropCount: 20,
    radius: 780,
    tickMs: 80,
    statusHoldMs: 180,
    statusPulseVisual: false,
    durationMs: 18500
  },
  {
    id: "angura",
    label: "アシグラ",
    noticeLabel: "ASHIGURA SLASH",
    type: "dashSlash",
    tint: 0xff4d32,
    glowTint: 0xffd17c,
    frameCount: 8,
    frameMs: 82,
    matchPlayerDisplayHeight: true,
    scaleAllFramesToPlayerHeight: true,
    supportDisplayHeightMultiplier: SUPPORT_CHARACTER_BODY_HEIGHT_MULTIPLIER * 1.1,
    supportScaleReferenceHeight: 325,
    cutinVoiceKey: "support-angura-cutin-voice",
    cutinVoicePath: "./音声/support/angura/onsei1.wav",
    cutinVoiceVolume: 0.9,
    dashMoveSeKey: "support-angura-dash-move-se",
    dashMoveSePath: "./音声/support/angura/se1.wav",
    dashMoveSeVolume: 0.74,
    dashHitSeKey: "support-angura-dash-hit-se",
    dashHitSePath: "./音声/support/angura/se2.wav",
    dashHitSeVolume: 0.82,
    dashHitSeCooldownMs: 70,
    supportOffsetX: 150,
    supportOffsetY: -18,
    supportShadowOffsetY: 60,
    durationMs: 10400,
    targetRadius: 760,
    dashSpeed: 1380,
    dashOvershoot: 150,
    dashWindupMs: 130,
    dashRetargetDelayMs: 120,
    damageAmount: 14,
    slashRadius: 126,
    knockbackForce: 320
  }
].map((definition) => ({
  ...definition,
  cutinTextureKey: `support-${definition.id}-cutin`,
  cutinPath: `./画像/support/${definition.id}/cutin.png`,
  animationFrames: Array.from({ length: definition.frameCount }, (_, index) => ({
    textureKey: `support-${definition.id}-frame-${index + 1}`,
    imagePath: `./画像/support/${definition.id}/frame_${String(index + 1).padStart(2, "0")}.png`
  })),
  fieldEffectFrames: Array.from({ length: definition.fieldEffectFrameCount || 0 }, (_, index) => ({
    textureKey: `support-${definition.id}-field-effect-${index + 1}`,
    imagePath: `./画像/support/${definition.id}/field_effect_${String(index + 1).padStart(2, "0")}.png`
  })),
  ...(definition.titleLetterFrameCount ? {
    titleLetterFrames: Array.from({ length: definition.titleLetterFrameCount }, (_, index) => ({
      textureKey: `support-${definition.id}-title-letter-${index + 1}`,
      imagePath: `./画像/support/${definition.id}/title_font_${String(index + 1).padStart(2, "0")}.png`
    }))
  } : {}),
  ...(definition.hasPushButton ? {
    pushTextureKey: `support-${definition.id}-push`,
    pushPath: `./画像/support/${definition.id}/push.png`
  } : {})
}));
const GENSO_KNIGHTS_SUPPORT_DEFINITION = {
  id: "gensoKnights",
  label: "元素騎士",
  noticeLabel: "GENSO KNIGHTS",
  type: "gensoKnights",
  tint: 0x52d8ff,
  glowTint: 0xb8f5ff,
  cutinTextureKey: "support-genso-knights-cutin",
  cutinPath: "./画像/support/gensoKnights/cutin.png",
  bgmKey: "support-genso-knights-bgm",
  bgmPath: "./音声/support/gensoKnights/gensobgm.wav",
  bgmVolume: 0.74,
  characters: [
    {
      id: "hiromaro",
      label: "ひろまろ",
      role: "rangedSupport",
      frameMs: 135,
      attackIntervalMs: 940,
      offsetX: 0,
      offsetY: -58,
      targetIndex: 0,
      usesArrowEffect: true
    },
    {
      id: "alamode",
      label: "アラモード",
      role: "normalSweeper",
      frameMs: 120,
      attackIntervalMs: 820,
      offsetX: -170,
      offsetY: 28,
      targetIndex: 1
    },
    {
      id: "omaru",
      label: "オマル",
      role: "bossTank",
      frameMs: 120,
      attackIntervalMs: 850,
      offsetX: 260,
      offsetY: -72,
      targetIndex: 2,
      guardSeKey: "support-genso-knights-omaru-guard-se",
      guardSePath: "./音声/support/gensoKnights/omaru_guard.wav",
      guardSeVolume: 0.86
    },
    {
      id: "kurokage",
      label: "くろかげ",
      role: "bossTank",
      frameMs: 125,
      attackIntervalMs: 880,
      offsetX: -270,
      offsetY: 136,
      targetIndex: 3,
      guardSeKey: "support-genso-knights-kurokage-guard-se",
      guardSePath: "./音声/support/gensoKnights/kurokage_guard.wav",
      guardSeVolume: 0.86
    }
  ].map((character) => ({
    ...character,
    animationFrames: Array.from({ length: 8 }, (_, index) => ({
      textureKey: `support-genso-knights-${character.id}-frame-${index + 1}`,
      imagePath: `./画像/support/gensoKnights/${character.id}/frame_${String(index + 1).padStart(2, "0")}.png`
    })),
    guardEffectFrames: character.role === "bossTank"
      ? Array.from({ length: 8 }, (_, index) => ({
        textureKey: `support-genso-knights-${character.id}-guard-frame-${index + 1}`,
        imagePath: `./画像/support/gensoKnights/guard_${character.id}/frame_${String(index + 1).padStart(2, "0")}.png`
      }))
      : []
  })),
  bossAssets: Array.from({ length: 4 }, (_, index) => ({
    textureKey: `support-genso-knights-boss-${index + 1}`,
    imagePath: `./画像/support/gensoKnights/boss_${String(index + 1).padStart(2, "0")}.png`
  })),
  arrowFrames: Array.from({ length: 5 }, (_, index) => ({
    textureKey: `support-genso-knights-hiromaro-arrow-${index + 1}`,
    imagePath: `./画像/support/gensoKnights/hiromaro_arrow/frame_${String(index + 1).padStart(2, "0")}.png`
  }))
};

class SurvivalScene extends Phaser.Scene {
  constructor() {
    super("survival-scene");
  }

  preload() {
    this.loadImageIfNeeded("player-idle", "./画像/maincharactor/sprite_0.png");
    this.loadImageIfNeeded("player-walk-a", "./画像/maincharactor/sprite_3.png");
    this.loadImageIfNeeded("player-walk-b", "./画像/maincharactor/sprite_4.png");
    this.preloadHudAssets();
    this.preloadItemAssets();
    this.preloadRobotAssets();
    this.preloadShopAssets();
    this.preloadStageAssets();
    this.preloadEnemyAssets();
    this.preloadBossAttackEffectAssets();
    this.preloadSupportAttackAssets();
    this.preloadGensoKnightsSupportAssets();
    this.preloadSkillAssets();
  }

  loadImageIfNeeded(key, path) {
    if (!key || !path) {
      return;
    }

    if (!this.textures.exists(key)) {
      this.load.image(key, path);
    }
  }

  loadAudioIfNeeded(key, path) {
    if (!key || !path || this.cache.audio.exists(key)) {
      return;
    }

    this.load.audio(key, [path]);
  }

  preloadSkillAssets() {
    Object.values(SKILL_DEFINITIONS).forEach((definition) => {
      definition.stages.forEach((stage) => {
        if (stage.textureKey && stage.imagePath) {
          this.loadImageIfNeeded(stage.textureKey, stage.imagePath);
        }

        stage.animationFrames?.forEach((frame) => {
          this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
        });
      });
    });
  }

  preloadHudAssets() {
    Object.values(HUD_IMAGE_ASSETS).forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
  }

  preloadItemAssets() {
    Object.values(ITEM_IMAGE_ASSETS).forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
    Object.values(RARE_ITEM_PILLAR_EFFECT_ASSETS).forEach((asset) => {
      asset.animationFrames.forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
    });
  }

  preloadRobotAssets() {
    [
      ...ROBOT_IMAGE_ASSETS.robotLevels,
      ...ROBOT_IMAGE_ASSETS.missileFrames,
      ...ROBOT_IMAGE_ASSETS.explosionFrames,
      ...ROBOT_IMAGE_ASSETS.recoveryFields,
      ...Object.values(ROBOT_ITEM_IMAGE_ASSETS)
    ].forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
  }

  preloadShopAssets() {
    CD_CATALOG.forEach((cd) => {
      this.loadImageIfNeeded(cd.jacketTextureKey, cd.jacketPath);
      if (cd.lockedJacketTextureKey && cd.lockedJacketPath) {
        this.loadImageIfNeeded(cd.lockedJacketTextureKey, cd.lockedJacketPath);
      }
      this.loadAudioIfNeeded(cd.audioKey, cd.audioPath);
    });
  }

  preloadStageAssets() {
    const stage = this.getCurrentStageDefinition();
    if (!stage) {
      return;
    }

    this.getStageAssetEntries(stage).forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
  }

  preloadEnemyAssets() {
    const queuedKeys = new Set();
    const queueImage = (textureKey, imagePath) => {
      if (queuedKeys.has(textureKey)) {
        return;
      }

      queuedKeys.add(textureKey);
      this.loadImageIfNeeded(textureKey, imagePath);
    };

    Object.values(MONSTER_IMAGE_ASSETS).forEach((asset) => {
      queueImage(asset.textureKey, asset.imagePath);
      asset.animationFrames?.forEach((frame) => {
        queueImage(frame.textureKey, frame.imagePath);
      });
    });
  }

  preloadBossAttackEffectAssets() {
    Object.values(BOSS_ATTACK_EFFECT_ASSETS).forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
  }

  preloadSupportAttackAssets() {
    SUPPORT_ATTACK_DEFINITIONS.forEach((definition) => {
      this.loadImageIfNeeded(definition.cutinTextureKey, definition.cutinPath);
      this.loadAudioIfNeeded(definition.supportBgmKey, definition.supportBgmPath);
      this.loadAudioIfNeeded(definition.cutinVoiceKey, definition.cutinVoicePath);
      this.loadAudioIfNeeded(definition.arrivalSeKey, definition.arrivalSePath);
      this.loadAudioIfNeeded(definition.fieldStartSeKey, definition.fieldStartSePath);
      this.loadAudioIfNeeded(definition.statusApplySeKey, definition.statusApplySePath);
      this.loadAudioIfNeeded(definition.healTickSeKey, definition.healTickSePath);
      this.loadAudioIfNeeded(definition.dashMoveSeKey, definition.dashMoveSePath);
      this.loadAudioIfNeeded(definition.dashHitSeKey, definition.dashHitSePath);
      this.loadAudioIfNeeded(definition.thunderSeKey, definition.thunderSePath);
      this.loadAudioIfNeeded(definition.countdownBgmKey, definition.countdownBgmPath);
      this.loadAudioIfNeeded(definition.titleLetterSeKey, definition.titleLetterSePath);
      this.loadAudioIfNeeded(definition.titleFinalSeKey, definition.titleFinalSePath);
      this.loadImageIfNeeded(definition.pushTextureKey, definition.pushPath);
      definition.titleLetterFrames?.forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
      definition.animationFrames.forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
      definition.fieldEffectFrames?.forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
    });
  }

  preloadGensoKnightsSupportAssets() {
    const definition = GENSO_KNIGHTS_SUPPORT_DEFINITION;
    this.loadImageIfNeeded(definition.cutinTextureKey, definition.cutinPath);
    this.loadAudioIfNeeded(definition.bgmKey, definition.bgmPath);
    definition.bossAssets.forEach((asset) => {
      this.loadImageIfNeeded(asset.textureKey, asset.imagePath);
    });
    definition.characters.forEach((character) => {
      this.loadAudioIfNeeded(character.guardSeKey, character.guardSePath);
      character.animationFrames.forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
      (character.guardEffectFrames || []).forEach((frame) => {
        this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
      });
    });
    definition.arrowFrames.forEach((frame) => {
      this.loadImageIfNeeded(frame.textureKey, frame.imagePath);
    });
  }

  getCurrentStageDefinition() {
    return STAGE_DEFINITIONS[ACTIVE_STAGE_ID] || null;
  }

  getStagePlayBounds(stage = this.currentStage, padding = 0) {
    const source = stage?.playBounds || stage?.layout?.playBounds;
    if (!source) {
      return null;
    }

    const left = source.x + padding;
    const top = source.y + padding;
    const width = Math.max(1, source.width - padding * 2);
    const height = Math.max(1, source.height - padding * 2);
    const right = left + width;
    const bottom = top + height;

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      centerX: left + width * 0.5,
      centerY: top + height * 0.5
    };
  }

  getStageMovementBounds(stage = this.currentStage, padding = 0) {
    const source = stage?.playBounds || stage?.layout?.playBounds;
    if (!source) {
      return null;
    }

    const inset = source.movementInset || 0;
    const getInset = (side) => Math.max(0, typeof inset === "number" ? inset : inset[side] || 0);
    const safePadding = Math.max(0, padding);
    const leftInset = getInset("left") + safePadding;
    const rightInset = getInset("right") + safePadding;
    const topInset = getInset("top") + safePadding;
    const bottomInset = getInset("bottom") + safePadding;
    const left = source.x + leftInset;
    const top = source.y + topInset;
    const width = Math.max(1, source.width - leftInset - rightInset);
    const height = Math.max(1, source.height - topInset - bottomInset);
    const right = left + width;
    const bottom = top + height;

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      centerX: left + width * 0.5,
      centerY: top + height * 0.5
    };
  }

  getStageAssetEntries(stage) {
    if (!stage?.assets) {
      return [];
    }

    return [
      ...Object.values(stage.assets.ground || {}),
      ...Object.values(stage.assets.decals || {}),
      ...Object.values(stage.assets.boundaries || {}),
      ...Object.values(stage.assets.obstacleTypes || {})
    ];
  }

  create() {
    this.sound.stopAll();
    this.createGeneratedTextures();
    this.createEnemyAnimations();
    this.createRareItemPillarAnimations();
    this.createState();
    this.createWorld();
    this.createGroups();
    this.createPlayer();
    this.createRobotCompanion();
    this.createPlayerSkills();
    this.createInput();
    this.createHud();
    this.createOverlay();
    this.configureCameras();
    this.createColliders();
    this.spawnEnemyWave();
    this.shootTimer = this.stats.fireInterval * 0.6;
    this.syncPlayerVisuals();
    this.updateSkills(0);
    this.updateHud();
    this.showPreGameShop();
  }

  createEnemyAnimations() {
    Object.values(MONSTER_IMAGE_ASSETS).forEach((asset) => {
      if (!asset.animationKey || this.anims.exists(asset.animationKey)) {
        return;
      }

      const frames = (asset.animationFrames || [])
        .filter((frame) => this.textures.exists(frame.textureKey))
        .map((frame) => ({ key: frame.textureKey }));

      if (frames.length < 2) {
        return;
      }

      this.anims.create({
        key: asset.animationKey,
        frames,
        frameRate: asset.animationFrameRate || 6,
        repeat: -1,
        repeatDelay: asset.animationRepeatDelay || 0,
        yoyo: asset.animationYoyo !== false
      });
    });
  }

  createRareItemPillarAnimations() {
    Object.values(RARE_ITEM_PILLAR_EFFECT_ASSETS).forEach((asset) => {
      if (!asset.animationKey || this.anims.exists(asset.animationKey)) {
        return;
      }

      const frames = asset.animationFrames
        .filter((frame) => this.textures.exists(frame.textureKey))
        .map((frame) => ({ key: frame.textureKey }));

      if (frames.length < 2) {
        return;
      }

      this.anims.create({
        key: asset.animationKey,
        frames,
        frameRate: asset.frameRate || 10,
        repeat: -1
      });
    });
  }

  createGeneratedTextures() {
    if (
      this.textures.exists("floor-grid") &&
      this.textures.exists("enemy-core") &&
      this.textures.exists("enemy-ranged-core") &&
      this.textures.exists("enemy-shot-core") &&
      this.textures.exists("bullet-core") &&
      this.textures.exists("xp-orb") &&
      this.textures.exists("rare-token") &&
      this.textures.exists("pickup-heal") &&
      this.textures.exists("pickup-magnet") &&
      this.textures.exists("pickup-bomb") &&
      this.textures.exists("skill-hit-glow") &&
      this.textures.exists("skill-hit-ring") &&
      this.textures.exists("skill-hit-spark") &&
      this.textures.exists("wind-streak") &&
      this.textures.exists("hud-icon-basic-skill") &&
      this.textures.exists("hud-icon-tornado-skill")
    ) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0x08111b, 1);
    graphics.fillRect(0, 0, 96, 96);
    graphics.lineStyle(2, 0x102133, 0.8);
    graphics.strokeRect(0, 0, 96, 96);
    graphics.lineStyle(1, 0x16324c, 0.8);
    graphics.strokeLineShape(new Phaser.Geom.Line(48, 0, 48, 96));
    graphics.strokeLineShape(new Phaser.Geom.Line(0, 48, 96, 48));
    graphics.fillStyle(0x0d1d2f, 0.8);
    graphics.fillCircle(48, 48, 3);
    graphics.generateTexture("floor-grid", 96, 96);
    graphics.clear();

    graphics.fillStyle(0xd9534f, 1);
    graphics.fillCircle(20, 20, 20);
    graphics.lineStyle(3, 0xffb3b0, 0.9);
    graphics.strokeCircle(20, 20, 18);
    graphics.generateTexture("enemy-core", 40, 40);
    graphics.clear();

    graphics.fillStyle(0x70d7ff, 1);
    graphics.fillRoundedRect(6, 6, 28, 28, 7);
    graphics.lineStyle(3, 0xe9fbff, 0.96);
    graphics.strokeRoundedRect(7, 7, 26, 26, 6);
    graphics.lineStyle(2, 0x9ef0ff, 0.72);
    graphics.strokeLineShape(new Phaser.Geom.Line(12, 20, 28, 20));
    graphics.generateTexture("enemy-ranged-core", 40, 40);
    graphics.clear();

    graphics.fillStyle(0xf8f0a0, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.lineStyle(2, 0xffffff, 0.95);
    graphics.strokeCircle(8, 8, 6);
    graphics.generateTexture("bullet-core", 16, 16);
    graphics.clear();

    graphics.fillStyle(0x8bdcff, 1);
    graphics.fillCircle(10, 10, 8);
    graphics.lineStyle(2, 0xf6fdff, 0.96);
    graphics.strokeCircle(10, 10, 6);
    graphics.generateTexture("enemy-shot-core", 20, 20);
    graphics.clear();

    graphics.fillStyle(0x7ce7ff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.lineStyle(2, 0xffffff, 0.9);
    graphics.strokeCircle(10, 10, 7);
    graphics.generateTexture("xp-orb", 20, 20);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(3, 3, 26, 26, 5);
    graphics.lineStyle(2, 0xffffff, 0.98);
    graphics.strokeRoundedRect(3, 3, 26, 26, 5);
    graphics.fillStyle(0xffffff, 0.42);
    graphics.fillRoundedRect(7, 7, 18, 10, 4);
    graphics.generateTexture("rare-token", 32, 32);
    graphics.clear();

    graphics.fillStyle(0xffffff, 0.98);
    graphics.fillRoundedRect(4, 4, 28, 28, 8);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(14, 8, 8, 20);
    graphics.fillRect(8, 14, 20, 8);
    graphics.fillStyle(0xffffff, 0.34);
    graphics.fillEllipse(18, 10, 16, 8);
    graphics.generateTexture("pickup-heal", 36, 36);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(8, 7, 7, 18, 4);
    graphics.fillRoundedRect(21, 7, 7, 18, 4);
    graphics.fillRoundedRect(8, 20, 20, 9, 5);
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillRect(10, 6, 5, 4);
    graphics.fillRect(21, 6, 5, 4);
    graphics.generateTexture("pickup-magnet", 36, 36);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(18, 20, 10);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.strokeLineShape(new Phaser.Geom.Line(24, 11, 30, 6));
    graphics.fillCircle(31, 5, 3);
    graphics.fillStyle(0xffffff, 0.34);
    graphics.fillCircle(14, 15, 4);
    graphics.generateTexture("pickup-bomb", 36, 36);
    graphics.clear();

    graphics.fillStyle(0xd8efff, 0.92);
    graphics.fillCircle(32, 32, 17);
    graphics.lineStyle(4, 0xffffff, 0.78);
    graphics.strokeCircle(32, 32, 22);
    graphics.generateTexture("skill-hit-glow", 64, 64);
    graphics.clear();

    graphics.lineStyle(4, 0x97e0ff, 0.95);
    graphics.strokeCircle(32, 32, 18);
    graphics.lineStyle(2, 0xffffff, 0.85);
    graphics.strokeCircle(32, 32, 24);
    graphics.generateTexture("skill-hit-ring", 64, 64);
    graphics.clear();

    graphics.lineStyle(6, 0xfafdff, 0.96);
    graphics.strokeLineShape(new Phaser.Geom.Line(32, 6, 32, 58));
    graphics.strokeLineShape(new Phaser.Geom.Line(6, 32, 58, 32));
    graphics.lineStyle(3, 0x9fe3ff, 0.78);
    graphics.strokeLineShape(new Phaser.Geom.Line(14, 14, 50, 50));
    graphics.strokeLineShape(new Phaser.Geom.Line(50, 14, 14, 50));
    graphics.generateTexture("skill-hit-spark", 64, 64);
    graphics.clear();

    graphics.fillStyle(0xa8ffe0, 0.14);
    graphics.fillEllipse(44, 14, 68, 16);
    graphics.fillStyle(0xffffff, 0.82);
    graphics.fillEllipse(34, 14, 42, 5);
    graphics.fillStyle(0x8dffd2, 0.44);
    graphics.fillEllipse(20, 14, 26, 7);
    graphics.generateTexture("wind-streak", 88, 28);
    graphics.clear();

    graphics.fillStyle(0x0b1217, 0.96);
    graphics.fillCircle(24, 24, 22);
    graphics.lineStyle(3, 0x74e6ff, 0.82);
    graphics.strokeCircle(24, 24, 19);
    graphics.fillStyle(0xf6fdff, 0.96);
    graphics.beginPath();
    graphics.moveTo(14, 12);
    graphics.lineTo(27, 24);
    graphics.lineTo(14, 36);
    graphics.lineTo(14, 29);
    graphics.lineTo(20, 24);
    graphics.lineTo(14, 19);
    graphics.closePath();
    graphics.fillPath();
    graphics.beginPath();
    graphics.moveTo(25, 12);
    graphics.lineTo(38, 24);
    graphics.lineTo(25, 36);
    graphics.lineTo(25, 29);
    graphics.lineTo(31, 24);
    graphics.lineTo(25, 19);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(3, 0x93efff, 0.52);
    graphics.strokeLineShape(new Phaser.Geom.Line(7, 17, 16, 17));
    graphics.strokeLineShape(new Phaser.Geom.Line(6, 24, 14, 24));
    graphics.strokeLineShape(new Phaser.Geom.Line(7, 31, 16, 31));
    graphics.generateTexture("hud-icon-dash", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x111821, 0.94);
    graphics.fillCircle(24, 24, 22);
    graphics.lineStyle(3, 0x86dfff, 0.9);
    graphics.strokeCircle(24, 24, 19);
    graphics.lineStyle(4, 0xf8fdff, 0.96);
    graphics.beginPath();
    graphics.moveTo(28, 6);
    graphics.lineTo(17, 24);
    graphics.lineTo(25, 24);
    graphics.lineTo(19, 42);
    graphics.lineTo(34, 20);
    graphics.lineTo(25, 20);
    graphics.closePath();
    graphics.strokePath();
    graphics.fillStyle(0xaedcff, 0.32);
    graphics.fillCircle(24, 24, 8);
    graphics.generateTexture("hud-icon-basic-skill", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x101a16, 0.94);
    graphics.fillCircle(24, 24, 22);
    graphics.lineStyle(3, 0x7dffc5, 0.9);
    graphics.strokeCircle(24, 24, 19);
    graphics.lineStyle(4, 0xc8ffe4, 0.9);
    graphics.beginPath();
    graphics.arc(24, 25, 13, -0.25, Math.PI * 1.45, false);
    graphics.strokePath();
    graphics.lineStyle(3, 0x63efb7, 0.76);
    graphics.beginPath();
    graphics.arc(24, 25, 8, Math.PI * 0.55, Math.PI * 2.2, false);
    graphics.strokePath();
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(34, 13, 3);
    graphics.fillStyle(0x6affba, 0.34);
    graphics.fillCircle(24, 24, 8);
    graphics.generateTexture("hud-icon-tornado-skill", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x06090f, 1);
    graphics.fillRoundedRect(0, 0, 128, 128, 10);
    graphics.lineStyle(2, 0x40546a, 0.82);
    graphics.strokeRoundedRect(2, 2, 124, 124, 10);
    graphics.fillStyle(0x151f2b, 1);
    graphics.fillCircle(64, 64, 38);
    graphics.lineStyle(5, 0x5c6f83, 0.55);
    graphics.strokeCircle(64, 64, 35);
    graphics.lineStyle(2, 0x89a3b9, 0.4);
    graphics.strokeCircle(64, 64, 18);
    graphics.fillStyle(0x0a111a, 1);
    graphics.fillCircle(64, 64, 8);
    graphics.generateTexture("cd-placeholder-slot", 128, 128);

    graphics.destroy();
  }

  createState() {
    this.shopState = this.loadShopState();
    this.rebuildStartingStats();

    this.survivalTime = 0;
    this.enemySpawnTimer = 0;
    this.shootTimer = 0;
    this.walkFrameTimer = 0;
    this.playerAimAngle = 0;
    this.isDashing = false;
    this.dashLockedUntilRelease = false;
    this.dashRegenBlockedUntil = 0;
    this.invincibleUntil = 0;
    this.pendingLevelUps = 0;
    this.startingUpgradeSelectionsRemaining = STARTING_UPGRADE_CHOICES;
    this.levelUpActive = false;
    this.shopActive = false;
    this.shopStatusMessage = "";
    this.gameOver = false;
    this.currentWaveId = 1;
    this.waveStartedAt = 0;
    this.nextBossSpawnAt = BOSS_SPAWN_DELAY_MS;
    this.waveBossSpawned = false;
    this.activeWaveBoss = null;
    this.playerSkills = this.buildInitialSkillStates();
    this.robotState = this.createRobotState();
    this.activeSupportAttacks = [];
    this.lastSupportAttackId = null;
    this.gensoKnightsEvent = null;
    this.activeGensoKnightsBgm = null;
    this.gensoKnightsBgmTween = null;
    this.currentStage = this.getCurrentStageDefinition();
    this.runStats = {
      kills: 0,
      eliteKills: 0
    };
    this.bestRecord = this.loadBestRecord();
    this.killRanking = this.loadKillRanking();
    this.pendingRankingRecord = null;
    this.pendingRankingSaved = false;
    this.rankingPlayerName = DEFAULT_PLAYER_NAME;
    this.rankingNameEntryActive = false;
    this.rankingNameSelectAll = false;
    this.highlightRankingEntryId = null;
    this.rankingSaveMessage = "";
    this.remoteKillRanking = [];
    this.remoteRankingStatus = "ONLINE 未接続";
    this.remoteRankingRequestId = 0;
    this.gameOverRecordState = null;
    this.coins = this.loadCoinWallet();
    this.uiObjects = [];
    this.worldCamera = this.cameras.main;
    this.uiContainer = null;
    this.lastPickupNotice = "";
    this.lastPickupNoticeUntil = 0;
    this.activeBgm = null;
    this.activeBgmCdId = null;
    this.bgmVolumeTween = null;
    this.supportAttackBgmDuckingCount = 0;
    this.activeSupportAttackBgm = null;
    this.activeSupportAttackBgmDefinitionId = null;
    this.supportAttackBgmOverrideTween = null;
  }

  createBasePlayerStats() {
    return {
      maxHp: 100,
      hp: 100,
      level: 1,
      xp: 0,
      nextLevelXp: 5,
      moveSpeed: 310,
      maxStamina: 100,
      stamina: 100,
      bulletSpeed: 780,
      bulletDamage: 1,
      fireInterval: 540,
      damageMultiplier: 1
    };
  }

  createRobotState() {
    return {
      missileLevel: 1,
      healLevel: 1,
      missileXp: 0,
      healXp: 0,
      fireRateLevel: 0,
      damageLevel: 0,
      healIntervalLevel: 0,
      healAmountLevel: 0,
      visualLevel: 1,
      x: 0,
      y: 0,
      bobTimer: 0,
      missileTimer: 0,
      healTimer: 0,
      lastHealPulseAt: 0
    };
  }

  rebuildStartingStats() {
    this.stats = this.createBasePlayerStats();
    this.applyPermanentUpgradesToStats();
  }

  normalizeShopState(record) {
    const catalogIds = new Set(CD_CATALOG.map((cd) => cd.id));
    const state = {
      ownedCdIds: [...DEFAULT_SHOP_STATE.ownedCdIds],
      selectedCdId: DEFAULT_SHOP_STATE.selectedCdId,
      upgrades: { ...DEFAULT_SHOP_STATE.upgrades }
    };
    const addOwnedCd = (id) => {
      if (catalogIds.has(id) && !state.ownedCdIds.includes(id)) {
        state.ownedCdIds.push(id);
      }
    };

    CD_CATALOG.forEach((cd) => {
      if (cd.startsUnlocked) {
        addOwnedCd(cd.id);
      }
    });

    if (Array.isArray(record?.ownedCdIds)) {
      record.ownedCdIds.forEach((id) => addOwnedCd(id));
    }

    Object.entries(SHOP_UPGRADE_DEFINITIONS).forEach(([id, definition]) => {
      const value = Math.floor(Number(record?.upgrades?.[id]) || 0);
      state.upgrades[id] = Phaser.Math.Clamp(value, 0, definition.maxLevel);
    });

    const selectedId = typeof record?.selectedCdId === "string"
      ? record.selectedCdId
      : state.selectedCdId;
    state.selectedCdId = catalogIds.has(selectedId) && state.ownedCdIds.includes(selectedId)
      ? selectedId
      : (state.ownedCdIds[0] || DEFAULT_CD_ID);

    return state;
  }

  loadShopState() {
    let rawState = null;

    try {
      rawState = window.localStorage?.getItem(SHOP_STATE_STORAGE_KEY) || null;
    } catch (error) {
      rawState = null;
    }

    if (!rawState) {
      return this.normalizeShopState(DEFAULT_SHOP_STATE);
    }

    try {
      return this.normalizeShopState(JSON.parse(rawState));
    } catch (error) {
      return this.normalizeShopState(DEFAULT_SHOP_STATE);
    }
  }

  saveShopState() {
    this.shopState = this.normalizeShopState(this.shopState);

    try {
      window.localStorage?.setItem(SHOP_STATE_STORAGE_KEY, JSON.stringify(this.shopState));
    } catch (error) {
      // Ignore storage failures so the shop can still be used during this session.
    }
  }

  getPermanentUpgradeLevel(upgradeId) {
    const definition = SHOP_UPGRADE_DEFINITIONS[upgradeId];
    if (!definition) {
      return 0;
    }

    return Phaser.Math.Clamp(
      Math.floor(Number(this.shopState?.upgrades?.[upgradeId]) || 0),
      0,
      definition.maxLevel
    );
  }

  applyPermanentUpgradesToStats() {
    const weaponLevel = this.getPermanentUpgradeLevel("weapon");
    const armorLevel = this.getPermanentUpgradeLevel("armor");
    const shoesLevel = this.getPermanentUpgradeLevel("shoes");

    this.stats.damageMultiplier = 1 + weaponLevel * 0.06;
    this.stats.maxHp += armorLevel * 10;
    this.stats.hp = this.stats.maxHp;
    this.stats.moveSpeed += shoesLevel * 8;
  }

  getPermanentUpgradeCost(upgradeId) {
    const definition = SHOP_UPGRADE_DEFINITIONS[upgradeId];
    const level = this.getPermanentUpgradeLevel(upgradeId);

    if (!definition || level >= definition.maxLevel) {
      return null;
    }

    return Math.round((definition.baseCost * Math.pow(definition.costGrowth, level)) / 100) * 100;
  }

  getPermanentUpgradeEffectText(upgradeId, level = this.getPermanentUpgradeLevel(upgradeId)) {
    if (upgradeId === "weapon") {
      return `ATK +${Math.round(level * 6)}%`;
    }
    if (upgradeId === "armor") {
      return `HP +${level * 10}`;
    }
    if (upgradeId === "shoes") {
      return `SPD +${level * 8}`;
    }
    return "";
  }

  spendCoins(cost) {
    const value = this.normalizeCoinAmount(cost);
    if (value <= 0) {
      return true;
    }
    if (this.coins < value) {
      return false;
    }

    this.coins = this.normalizeCoinAmount(this.coins - value);
    this.saveCoinWallet();
    this.updateHud();
    return true;
  }

  purchasePermanentUpgrade(upgradeId) {
    const definition = SHOP_UPGRADE_DEFINITIONS[upgradeId];
    const level = this.getPermanentUpgradeLevel(upgradeId);
    const cost = this.getPermanentUpgradeCost(upgradeId);

    if (!definition || cost === null) {
      this.showPreGameShop("この強化は最大レベルです");
      return;
    }
    if (!this.spendCoins(cost)) {
      this.showPreGameShop(`${definition.title}: コイン不足`);
      return;
    }

    this.shopState.upgrades[upgradeId] = level + 1;
    this.saveShopState();
    this.rebuildStartingStats();
    this.showPreGameShop(`${definition.title} Lv.${level + 1} に強化`);
  }

  getCdDefinition(cdId) {
    return CD_CATALOG.find((cd) => cd.id === cdId) || null;
  }

  isCdOwned(cdId) {
    return Boolean(cdId && this.shopState?.ownedCdIds?.includes(cdId));
  }

  purchaseCd(cdId) {
    const cd = this.getCdDefinition(cdId);
    if (!cd) {
      this.showPreGameShop("このCDはまだ準備中です");
      return;
    }
    if (this.isCdOwned(cd.id)) {
      this.selectCd(cd.id);
      return;
    }
    if (!this.spendCoins(cd.price)) {
      this.showPreGameShop(`${cd.title}: コイン不足`);
      return;
    }

    this.shopState.ownedCdIds.push(cd.id);
    this.shopState.selectedCdId = cd.id;
    this.saveShopState();
    this.playSelectedBgm();
    this.showPreGameShop(`${cd.title} を解放しました`);
  }

  selectCd(cdId) {
    const cd = this.getCdDefinition(cdId);
    if (!cd || !this.isCdOwned(cd.id)) {
      this.showPreGameShop("未解放のCDです");
      return;
    }

    this.shopState.selectedCdId = cd.id;
    this.saveShopState();
    this.playSelectedBgm();
    this.showPreGameShop(`${cd.title} を選択中`);
  }

  getSelectedCdDefinition() {
    const selected = this.getCdDefinition(this.shopState?.selectedCdId);
    if (selected && this.isCdOwned(selected.id)) {
      return selected;
    }

    return CD_CATALOG.find((cd) => this.isCdOwned(cd.id)) || null;
  }

  playSelectedBgm() {
    const cd = this.getSelectedCdDefinition();
    if (!cd?.audioKey || !this.cache.audio.exists(cd.audioKey)) {
      return;
    }

    if (this.activeBgm && this.activeBgmCdId === cd.id) {
      if (!this.activeBgm.isPlaying) {
        this.activeBgm.play();
      }
      this.fadeBgmToVolume(this.getBgmTargetVolume(), 0);
      return;
    }

    this.stopBgm();
    const bgmVolume = this.getBgmTargetVolume();
    this.activeBgm = this.sound.add(cd.audioKey, {
      loop: true,
      volume: bgmVolume
    });
    this.activeBgmCdId = cd.id;
    this.activeBgm.play({ loop: true, volume: bgmVolume });
  }

  stopBgm() {
    if (this.bgmVolumeTween) {
      this.bgmVolumeTween.stop();
      this.bgmVolumeTween = null;
    }

    if (!this.activeBgm) {
      return;
    }

    this.activeBgm.stop();
    this.activeBgm.destroy();
    this.activeBgm = null;
    this.activeBgmCdId = null;
  }

  getBgmTargetVolume() {
    return (this.supportAttackBgmDuckingCount || 0) > 0
      ? SUPPORT_ATTACK_BGM_DUCK_VOLUME
      : DEFAULT_BGM_VOLUME;
  }

  fadeBgmToVolume(volume, durationMs = 0) {
    if (!this.activeBgm) {
      return;
    }

    const targetVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.bgmVolumeTween) {
      this.bgmVolumeTween.stop();
      this.bgmVolumeTween = null;
    }

    if (durationMs <= 0) {
      this.activeBgm.setVolume(targetVolume);
      return;
    }

    const volumeState = {
      volume: Number.isFinite(this.activeBgm.volume) ? this.activeBgm.volume : DEFAULT_BGM_VOLUME
    };
    this.bgmVolumeTween = this.tweens.add({
      targets: volumeState,
      volume: targetVolume,
      duration: durationMs,
      ease: "Sine.InOut",
      onUpdate: () => {
        if (this.activeBgm) {
          this.activeBgm.setVolume(volumeState.volume);
        }
      },
      onComplete: () => {
        if (this.activeBgm) {
          this.activeBgm.setVolume(targetVolume);
        }
        this.bgmVolumeTween = null;
      }
    });
  }

  startSupportAttackBgmDucking() {
    this.supportAttackBgmDuckingCount = Math.max(0, (this.supportAttackBgmDuckingCount || 0) + 1);
    if (this.supportAttackBgmDuckingCount === 1) {
      this.fadeBgmToVolume(SUPPORT_ATTACK_BGM_DUCK_VOLUME, SUPPORT_ATTACK_BGM_DUCK_IN_MS);
    }
  }

  stopSupportAttackBgmDucking() {
    this.supportAttackBgmDuckingCount = Math.max(0, (this.supportAttackBgmDuckingCount || 0) - 1);
    if (this.supportAttackBgmDuckingCount === 0) {
      this.fadeBgmToVolume(DEFAULT_BGM_VOLUME, SUPPORT_ATTACK_BGM_DUCK_OUT_MS);
    }
  }

  startSupportAttackAudio(definition) {
    if (definition?.supportBgmKey && this.cache.audio.exists(definition.supportBgmKey)) {
      this.playSupportAttackBgmOverride(definition);
      return;
    }

    this.startSupportAttackBgmDucking();
  }

  stopSupportAttackAudio(definition, restoreNormalBgm = true) {
    if (definition?.supportBgmKey) {
      this.stopSupportAttackBgmOverride(definition, restoreNormalBgm, true);
      return;
    }

    if (definition?.countdownBgmKey) {
      this.stopSupportAttackBgmOverride(definition, restoreNormalBgm, true);
      this.stopSupportAttackBgmDucking();
      return;
    }

    this.stopSupportAttackBgmDucking();
  }

  playSupportAttackBgmOverride(definition) {
    this.stopSupportAttackBgmOverride(null, false, false);

    if (!definition?.supportBgmKey || !this.cache.audio.exists(definition.supportBgmKey)) {
      this.startSupportAttackBgmDucking();
      return;
    }

    const normalBgm = this.activeBgm;
    if (this.bgmVolumeTween) {
      this.bgmVolumeTween.stop();
      this.bgmVolumeTween = null;
    }

    if (normalBgm) {
      const fadeOutMs = definition.supportBgmFadeOutMs ?? SUPPORT_ATTACK_BGM_DUCK_OUT_MS;
      const volumeState = {
        volume: Number.isFinite(normalBgm.volume) ? normalBgm.volume : DEFAULT_BGM_VOLUME
      };
      this.bgmVolumeTween = this.tweens.add({
        targets: volumeState,
        volume: 0,
        duration: fadeOutMs,
        ease: "Sine.InOut",
        onUpdate: () => {
          if (this.activeBgm === normalBgm) {
            normalBgm.setVolume(volumeState.volume);
          }
        },
        onComplete: () => {
          if (this.activeBgm === normalBgm) {
            normalBgm.stop();
            normalBgm.destroy();
            this.activeBgm = null;
            this.activeBgmCdId = null;
          }
          this.bgmVolumeTween = null;
        }
      });
    }

    const bgm = this.sound.add(definition.supportBgmKey, {
      loop: definition.supportBgmLoop ?? true,
      volume: 0
    });
    this.activeSupportAttackBgm = bgm;
    this.activeSupportAttackBgmDefinitionId = definition.id;
    bgm.play({ loop: definition.supportBgmLoop ?? true, volume: 0 });

    const targetVolume = Phaser.Math.Clamp(definition.supportBgmVolume ?? DEFAULT_BGM_VOLUME, 0, 1);
    const volumeState = { volume: 0 };
    const fadeInTween = this.tweens.add({
      targets: volumeState,
      volume: targetVolume,
      duration: definition.supportBgmFadeInMs ?? SUPPORT_ATTACK_BGM_DUCK_IN_MS,
      ease: "Sine.InOut",
      onUpdate: () => {
        if (this.activeSupportAttackBgm === bgm) {
          bgm.setVolume(volumeState.volume);
        }
      },
      onComplete: () => {
        if (this.activeSupportAttackBgm === bgm) {
          bgm.setVolume(targetVolume);
        }
        if (this.supportAttackBgmOverrideTween === fadeInTween) {
          this.supportAttackBgmOverrideTween = null;
        }
      }
    });
    this.supportAttackBgmOverrideTween = fadeInTween;
  }

  stopSupportAttackBgmOverride(definition = null, restoreNormalBgm = true, fade = true) {
    if (
      definition?.id
      && this.activeSupportAttackBgmDefinitionId
      && this.activeSupportAttackBgmDefinitionId !== definition.id
    ) {
      return;
    }

    if (this.supportAttackBgmOverrideTween) {
      this.supportAttackBgmOverrideTween.stop();
      this.supportAttackBgmOverrideTween = null;
    }

    const bgm = this.activeSupportAttackBgm;
    this.activeSupportAttackBgm = null;
    this.activeSupportAttackBgmDefinitionId = null;

    const restore = () => {
      if (restoreNormalBgm && !this.gameOver) {
        this.playSelectedBgm();
      }
    };

    if (!bgm) {
      restore();
      return;
    }

    if (!fade) {
      bgm.stop();
      bgm.destroy();
      restore();
      return;
    }

    const volumeState = {
      volume: Number.isFinite(bgm.volume) ? bgm.volume : DEFAULT_BGM_VOLUME
    };
    const fadeOutTween = this.tweens.add({
      targets: volumeState,
      volume: 0,
      duration: definition?.supportBgmFadeOutMs ?? SUPPORT_ATTACK_BGM_DUCK_OUT_MS,
      ease: "Sine.InOut",
      onUpdate: () => {
        bgm.setVolume(volumeState.volume);
      },
      onComplete: () => {
        bgm.stop();
        bgm.destroy();
        if (this.supportAttackBgmOverrideTween === fadeOutTween) {
          this.supportAttackBgmOverrideTween = null;
        }
        restore();
      }
    });
    this.supportAttackBgmOverrideTween = fadeOutTween;
  }

  scalePlayerDamage(damage) {
    return Math.max(0, Number(damage) || 0) * (this.stats.damageMultiplier || 1);
  }

  loadBestRecord() {
    let rawRecord = null;

    try {
      rawRecord = window.localStorage?.getItem(BEST_RECORD_STORAGE_KEY) || null;
    } catch (error) {
      rawRecord = null;
    }

    if (!rawRecord) {
      return { ...DEFAULT_BEST_RECORD };
    }

    try {
      return this.normalizeBestRecord(JSON.parse(rawRecord));
    } catch (error) {
      return { ...DEFAULT_BEST_RECORD };
    }
  }

  normalizeBestRecord(record) {
    return {
      survivalTimeMs: Math.max(0, Math.floor(Number(record?.survivalTimeMs) || 0)),
      level: Math.max(0, Math.floor(Number(record?.level) || 0)),
      kills: Math.max(0, Math.floor(Number(record?.kills) || 0)),
      eliteKills: Math.max(0, Math.floor(Number(record?.eliteKills) || 0))
    };
  }

  buildCurrentRunRecord() {
    return this.normalizeBestRecord({
      survivalTimeMs: this.survivalTime,
      level: this.stats.level,
      kills: this.runStats.kills,
      eliteKills: this.runStats.eliteKills
    });
  }

  saveBestRecordIfNeeded() {
    const currentRecord = this.buildCurrentRunRecord();
    const previousBest = this.normalizeBestRecord(this.bestRecord);
    const nextBest = {
      survivalTimeMs: Math.max(previousBest.survivalTimeMs, currentRecord.survivalTimeMs),
      level: Math.max(previousBest.level, currentRecord.level),
      kills: Math.max(previousBest.kills, currentRecord.kills),
      eliteKills: Math.max(previousBest.eliteKills, currentRecord.eliteKills)
    };
    const improved =
      nextBest.survivalTimeMs > previousBest.survivalTimeMs ||
      nextBest.level > previousBest.level ||
      nextBest.kills > previousBest.kills ||
      nextBest.eliteKills > previousBest.eliteKills;

    this.bestRecord = nextBest;

    try {
      window.localStorage?.setItem(BEST_RECORD_STORAGE_KEY, JSON.stringify(nextBest));
    } catch (error) {
      // Ignore storage failures so the run can still end cleanly.
    }

    return {
      currentRecord,
      bestRecord: nextBest,
      improved
    };
  }

  normalizePlayerName(value) {
    const trimmed = String(value ?? "").trim();
    return trimmed.length > 0
      ? trimmed.slice(0, PLAYER_NAME_MAX_LENGTH)
      : DEFAULT_PLAYER_NAME;
  }

  normalizeRankingEntry(entry) {
    const record = this.normalizeBestRecord(entry);
    const id = typeof entry?.id === "string" && entry.id.length > 0
      ? entry.id
      : `${Number(entry?.recordedAt) || 0}-${this.normalizePlayerName(entry?.name)}-${record.kills}`;

    return {
      id,
      name: this.normalizePlayerName(entry?.name),
      survivalTimeMs: record.survivalTimeMs,
      level: record.level,
      kills: record.kills,
      eliteKills: record.eliteKills,
      recordedAt: Math.max(0, Math.floor(Number(entry?.recordedAt) || 0))
    };
  }

  normalizeRemoteRankingEntry(documentSnapshot) {
    const data = typeof documentSnapshot?.data === "function"
      ? documentSnapshot.data()
      : documentSnapshot;
    const createdAt = data?.createdAt?.toMillis?.()
      ?? (Number(data?.createdAt?.seconds) > 0 ? Number(data.createdAt.seconds) * 1000 : undefined)
      ?? Number(data?.recordedAt)
      ?? 0;

    return this.normalizeRankingEntry({
      ...data,
      id: documentSnapshot?.id || data?.id,
      recordedAt: createdAt
    });
  }

  sortKillRanking(entries) {
    return entries
      .map((entry) => this.normalizeRankingEntry(entry))
      .sort((left, right) => {
        if (right.kills !== left.kills) {
          return right.kills - left.kills;
        }
        if (right.survivalTimeMs !== left.survivalTimeMs) {
          return right.survivalTimeMs - left.survivalTimeMs;
        }
        if (right.level !== left.level) {
          return right.level - left.level;
        }
        if (right.eliteKills !== left.eliteKills) {
          return right.eliteKills - left.eliteKills;
        }
        return left.recordedAt - right.recordedAt;
      })
      .slice(0, MAX_KILL_RANKING_ENTRIES);
  }

  loadKillRanking() {
    let rawRanking = null;

    try {
      rawRanking = window.localStorage?.getItem(KILL_RANKING_STORAGE_KEY) || null;
    } catch (error) {
      rawRanking = null;
    }

    if (!rawRanking) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawRanking);
      return Array.isArray(parsed) ? this.sortKillRanking(parsed) : [];
    } catch (error) {
      return [];
    }
  }

  saveKillRanking() {
    try {
      window.localStorage?.setItem(KILL_RANKING_STORAGE_KEY, JSON.stringify(this.killRanking));
    } catch (error) {
      // Ignore storage failures so the game over flow can still continue.
    }
  }

  addKillRankingEntry(name, record) {
    const entry = this.normalizeRankingEntry({
      ...this.normalizeBestRecord(record),
      id: `${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      name,
      recordedAt: Date.now()
    });

    this.killRanking = this.sortKillRanking([...(this.killRanking || []), entry]);
    this.saveKillRanking();

    return {
      entry,
      rank: this.killRanking.findIndex((rankingEntry) => rankingEntry.id === entry.id) + 1
    };
  }

  getFirebaseLeaderboardCache() {
    if (!window.__LASTMEMO_FIREBASE_LEADERBOARD__) {
      window.__LASTMEMO_FIREBASE_LEADERBOARD__ = {
        client: null,
        ready: null
      };
    }

    return window.__LASTMEMO_FIREBASE_LEADERBOARD__;
  }

  async getFirebaseLeaderboardClient() {
    const cache = this.getFirebaseLeaderboardCache();
    if (cache.client) {
      return cache.client;
    }
    if (cache.ready) {
      return cache.ready;
    }

    cache.ready = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ])
      .then(async ([appModule, authModule, firestoreModule]) => {
        const existingApp = appModule.getApps().find((app) => app.name === FIREBASE_APP_NAME);
        const app = existingApp || appModule.initializeApp(FIREBASE_CONFIG, FIREBASE_APP_NAME);
        const auth = authModule.getAuth(app);

        if (!auth.currentUser) {
          await authModule.signInAnonymously(auth);
        }

        const db = firestoreModule.getFirestore(app);
        cache.client = {
          app,
          auth,
          db,
          firestore: firestoreModule
        };
        return cache.client;
      })
      .catch((error) => {
        cache.ready = null;
        throw error;
      });

    return cache.ready;
  }

  getDisplayedKillRankingEntries() {
    return this.remoteKillRanking?.length > 0
      ? this.remoteKillRanking
      : this.killRanking || [];
  }

  getDisplayedKillRankingTitle() {
    return this.remoteKillRanking?.length > 0
      ? "ONLINE KILL RANKING"
      : "LOCAL KILL RANKING";
  }

  refreshGameOverRankingOverlay() {
    if (this.gameOver && this.overlayContainer) {
      this.showGameOverRankingOverlay();
    }
  }

  async loadRemoteKillRanking() {
    const requestId = this.remoteRankingRequestId + 1;
    this.remoteRankingRequestId = requestId;
    this.remoteRankingStatus = "ONLINE 読み込み中...";
    this.refreshGameOverRankingOverlay();

    try {
      const { db, firestore } = await this.getFirebaseLeaderboardClient();
      const rankingQuery = firestore.query(
        firestore.collection(db, FIREBASE_LEADERBOARD_COLLECTION),
        firestore.orderBy("kills", "desc"),
        firestore.limit(FIREBASE_REMOTE_RANKING_LIMIT)
      );
      const snapshot = await firestore.getDocs(rankingQuery);

      if (this.remoteRankingRequestId !== requestId) {
        return;
      }

      this.remoteKillRanking = this.sortKillRanking(
        snapshot.docs.map((documentSnapshot) => this.normalizeRemoteRankingEntry(documentSnapshot))
      );
      this.remoteRankingStatus = this.remoteKillRanking.length > 0
        ? "ONLINE 接続中"
        : "ONLINE 記録なし";
    } catch (error) {
      console.warn("Firebase leaderboard read failed.", error);
      if (this.remoteRankingRequestId !== requestId) {
        return;
      }
      this.remoteRankingStatus = "ONLINE 接続失敗 / LOCAL表示";
    }

    this.refreshGameOverRankingOverlay();
  }

  async submitRemoteKillRankingEntry(entry) {
    this.remoteRankingStatus = "ONLINE 送信中...";
    this.refreshGameOverRankingOverlay();

    try {
      const { auth, db, firestore } = await this.getFirebaseLeaderboardClient();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error("Anonymous auth is not ready.");
      }

      const normalizedEntry = this.normalizeRankingEntry(entry);
      await firestore.setDoc(
        firestore.doc(db, FIREBASE_LEADERBOARD_COLLECTION, normalizedEntry.id),
        {
          name: normalizedEntry.name,
          kills: normalizedEntry.kills,
          survivalTimeMs: normalizedEntry.survivalTimeMs,
          level: normalizedEntry.level,
          eliteKills: normalizedEntry.eliteKills,
          uid,
          createdAt: firestore.serverTimestamp()
        }
      );

      this.remoteRankingStatus = "ONLINE 登録しました";
      await this.loadRemoteKillRanking();
    } catch (error) {
      console.warn("Firebase leaderboard write failed.", error);
      this.remoteRankingStatus = "ONLINE 送信失敗 / LOCAL保存済み";
      this.refreshGameOverRankingOverlay();
    }
  }

  formatRankingName(name) {
    const normalized = this.normalizePlayerName(name);
    return normalized.length > 12 ? `${normalized.slice(0, 11)}.` : normalized;
  }

  formatKillRankingLines(highlightEntryId = null, sourceEntries = null) {
    const entries = this.sortKillRanking(sourceEntries || this.killRanking || []);
    if (entries.length <= 0) {
      return "まだ記録がありません";
    }

    return entries
      .map((entry, index) => {
        const marker = entry.id === highlightEntryId ? ">" : " ";
        const rank = String(index + 1).padStart(2, " ");
        const name = this.formatRankingName(entry.name).padEnd(12, " ");
        const kills = String(entry.kills).padStart(5, " ");
        const level = String(entry.level).padStart(2, " ");
        return `${marker}${rank} ${name} K ${kills}  ${this.formatTimeMs(entry.survivalTimeMs)}  LV ${level}`;
      })
      .join("\n");
  }

  normalizeCoinAmount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  loadCoinWallet() {
    try {
      return this.normalizeCoinAmount(window.localStorage?.getItem(COIN_WALLET_STORAGE_KEY));
    } catch (error) {
      return 0;
    }
  }

  saveCoinWallet() {
    try {
      window.localStorage?.setItem(COIN_WALLET_STORAGE_KEY, String(this.coins));
    } catch (error) {
      // Ignore storage failures so pickups still work during the run.
    }
  }

  addCoins(amount) {
    const value = this.normalizeCoinAmount(amount);
    if (value <= 0) {
      return;
    }

    this.coins = this.normalizeCoinAmount(this.coins) + value;
    this.saveCoinWallet();

    if (this.hudCoinText) {
      this.updateHud();
    }
  }

  formatRecordSummary(record) {
    return `${this.formatTimeMs(record.survivalTimeMs)} / LV ${record.level} / K ${record.kills} / E ${record.eliteKills}`;
  }

  formatHudBestSummary(record) {
    const robotText = this.robotState
      ? `\nROBOT M${this.robotState.missileLevel} / F${this.robotState.healLevel}`
      : "";
    return `BEST ${this.formatTimeMs(record.survivalTimeMs)} / LV ${record.level}\nK ${record.kills} / RUN E ${this.runStats.eliteKills}${robotText}`;
  }

  setLastPickupNotice(text) {
    this.lastPickupNotice = text;
    this.lastPickupNoticeUntil = this.time.now + 2200;
  }

  registerUiObject(object) {
    if (!object) {
      return object;
    }

    if (!this.uiObjects) {
      this.uiObjects = [];
    }

    if (!this.uiObjects.includes(object)) {
      this.uiObjects.push(object);
    }

    return object;
  }

  registerUiObjects(objects) {
    objects?.forEach((object) => this.registerUiObject(object));
    return objects;
  }

  beginStartingUpgradeDraft() {
    if (this.startingUpgradeSelectionsRemaining <= 0) {
      return;
    }

    this.pendingLevelUps += this.startingUpgradeSelectionsRemaining;
    this.showLevelUpChoices();
  }

  buildInitialSkillStates() {
    const skills = {};

    Object.values(SKILL_DEFINITIONS).forEach((definition) => {
      if (!definition.startsUnlocked || !definition.stages.length) {
        return;
      }

      skills[definition.id] = this.createSkillState(definition);
    });

    if (!skills[DEFAULT_SKILL_ID]) {
      throw new Error(`Missing starter skill definition: ${DEFAULT_SKILL_ID}`);
    }

    return skills;
  }

  createSkillState(definition) {
    return {
      id: definition.id,
      definition,
      stageIndex: 0,
      currentStage: definition.stages[0],
      orbitAngle: 0,
      pulseTimer: 0,
      dashCycleTimer: 0,
      orbitals: []
    };
  }

  createWorld() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.worldCamera = this.cameras.main;
    this.worldCamera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.worldCamera.setZoom(WORLD_CAMERA_ZOOM);
    this.currentStage = this.getCurrentStageDefinition();
    this.stageDebugEnabled = false;
    this.stageDebugOptions = { ...STAGE_DEBUG_OPTIONS, layerVisibility: { ...STAGE_DEBUG_OPTIONS.layerVisibility } };

    if (!this.currentStage) {
      this.worldCamera.setBackgroundColor("#040a11");
      this.add
        .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, "floor-grid")
        .setDepth(0);
      return;
    }

    this.stageDebugOptions = {
      ...STAGE_DEBUG_OPTIONS,
      ...(this.currentStage.debug || {}),
      layerVisibility: {
        ...STAGE_DEBUG_OPTIONS.layerVisibility,
        ...(this.currentStage.debug?.layerVisibility || {})
      }
    };
    this.stageDebugEnabled = Boolean(this.stageDebugOptions.enabled);
    this.worldCamera.setBackgroundColor(this.currentStage.backgroundColor || "#58625d");
    this.createStageLayers();
    this.buildStageBackdrop(this.currentStage);
    this.buildStageGround(this.currentStage);
    this.buildStageCrosswalks(this.currentStage);
    this.buildStageDecals(this.currentStage);
    this.buildStageObstacles(this.currentStage);
    this.buildStageBoundaryOcclusion(this.currentStage);
    this.buildStageBoundaries(this.currentStage);
    this.buildStagePlayBoundsCollision(this.currentStage);
  }

  createStageLayers() {
    this.stageBackdropLayer = this.add.layer().setDepth(-6);
    this.stageGroundLayer = this.add.layer().setDepth(-5);
    this.stageCrosswalkLayer = this.add.layer().setDepth(-4);
    this.stageDecalLayer = this.add.layer().setDepth(-3);
    this.stageObstacleShadowLayer = this.add.layer().setDepth(7.6);
    this.stageObstacleLayer = this.add.layer().setDepth(8.4);
    this.stageBoundaryOcclusionLayer = this.add.layer().setDepth(8.55);
    this.stageBoundaryLayer = this.add.layer().setDepth(8.7);
    this.stageDebugLayer = this.add.layer().setDepth(8.95);
    this.stageObstacleBodies = this.physics.add.staticGroup();
    this.stageDecalInstances = [];
    this.stageObstacleInstances = [];
    this.stageBoundaryInstances = [];

    this.stageBackdropLayer.setVisible(this.stageDebugOptions.layerVisibility.backdrop);
    this.stageGroundLayer.setVisible(this.stageDebugOptions.layerVisibility.ground);
    this.stageCrosswalkLayer.setVisible(this.stageDebugOptions.layerVisibility.crosswalks);
    this.stageDecalLayer.setVisible(this.stageDebugOptions.layerVisibility.decals);
    this.stageObstacleShadowLayer.setVisible(this.stageDebugOptions.layerVisibility.obstacleShadows);
    this.stageObstacleLayer.setVisible(this.stageDebugOptions.layerVisibility.obstacles);
    this.stageBoundaryOcclusionLayer.setVisible(this.stageDebugOptions.layerVisibility.boundaryOcclusion);
    this.stageBoundaryLayer.setVisible(this.stageDebugOptions.layerVisibility.boundaries);
    this.stageDebugLayer.setVisible(this.stageDebugEnabled);
  }

  buildStageBackdrop(stage) {
    const backdrop = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x626c66, 1)
      .setDepth(-6);
    const hazeA = this.add
      .ellipse(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 4200, 2800, 0xb0bcaa, 0.08)
      .setDepth(-5.8);
    const hazeB = this.add
      .ellipse(stage.worldCenter.x, stage.worldCenter.y, 2600, 1800, 0x4e5a54, 0.12)
      .setDepth(-5.7);
    const roadShadow = this.add
      .rectangle(stage.worldCenter.x, stage.worldCenter.y, 1960, 1960, 0x1e2525, 0.08)
      .setDepth(-5.6);

    this.stageBackdropLayer.add([backdrop, hazeA, hazeB, roadShadow]);
  }

  buildStageGround(stage) {
    if (stage.bakedGround?.textureKey && this.textures.exists(stage.bakedGround.textureKey)) {
      const baked = stage.bakedGround;
      const ground = this.add
        .image(
          baked.x + baked.width * 0.5,
          baked.y + baked.height * 0.5,
          baked.textureKey
        )
        .setDisplaySize(baked.width, baked.height)
        .setDepth(-5);
      this.stageGroundLayer.add(ground);
      return;
    }

    const tileSize = stage.tileSize || 128;

    for (let y = tileSize / 2; y <= WORLD_HEIGHT - tileSize / 2; y += tileSize) {
      for (let x = tileSize / 2; x <= WORLD_WIDTH - tileSize / 2; x += tileSize) {
        const key = this.pickStageGroundTexture(stage, x, y);
        const tile = this.add
          .image(x, y, key)
          .setDisplaySize(tileSize, tileSize)
          .setDepth(-5);
        this.stageGroundLayer.add(tile);
      }
    }
  }

  buildStageCrosswalks(stage) {
    if (stage.bakedGround?.includesCrosswalks) {
      return;
    }

    const tileSize = stage.tileSize || 128;
    const crosswalkKey = stage.assets.ground.crosswalk.textureKey;

    stage.layout.crosswalks.forEach((band) => {
      const halfWidth = (band.tilesWide - 1) * 0.5;
      const halfHeight = (band.tilesHigh - 1) * 0.5;
      const cos = Math.cos(band.rotation || 0);
      const sin = Math.sin(band.rotation || 0);

      for (let row = 0; row < band.tilesHigh; row += 1) {
        for (let column = 0; column < band.tilesWide; column += 1) {
          const localX = (column - halfWidth) * tileSize;
          const localY = (row - halfHeight) * tileSize;
          const worldX = band.x + localX * cos - localY * sin;
          const worldY = band.y + localX * sin + localY * cos;
          const tile = this.add
            .image(worldX, worldY, crosswalkKey)
            .setDisplaySize(tileSize, tileSize)
            .setRotation(band.rotation || 0)
            .setAlpha(0.96)
            .setDepth(-4);
          this.stageCrosswalkLayer.add(tile);
        }
      }
    });
  }

  buildStageDecals(stage) {
    const placements =
      Array.isArray(stage.decalPlacements) && stage.decalPlacements.length > 0
        ? stage.decalPlacements
        : this.buildLegacyStageDecalPlacements(stage);

    this.stageDecalInstances = [];

    placements.forEach((placement) => {
      const definition = stage.assets.decals[placement.sprite];
      if (!definition) {
        return;
      }

      const decal = this.add
        .image(placement.x, placement.y, definition.textureKey)
        .setDepth(-3)
        .setScale(placement.scale ?? 1)
        .setAlpha(placement.alpha ?? 1)
        .setRotation(placement.rotation || 0);

      this.stageDecalLayer.add(decal);
      this.stageDecalInstances.push({
        ...placement,
        displayObject: decal
      });
    });
  }

  buildStageObstacles(stage) {
    stage.obstaclePlacements.forEach((placement) => {
      const definition = stage.assets.obstacleTypes[placement.sprite];
      if (!definition) {
        return;
      }

      const depthBase = definition.depth || 8.4;
      const shadowWidth = placement.shadowWidth || definition.shadowWidth;
      const shadowHeight = placement.shadowHeight || definition.shadowHeight;

      if (shadowWidth && shadowHeight) {
        const shadow = this.add
          .ellipse(
            placement.x,
            placement.y + (placement.shadowOffsetY ?? definition.shadowOffsetY ?? shadowHeight * 0.16),
            shadowWidth,
            shadowHeight,
            0x000000,
            0.16
          )
          .setDepth(depthBase - 0.25);

        if (placement.rotation) {
          shadow.setRotation(placement.rotation * 0.45);
        }

        this.stageObstacleShadowLayer.add(shadow);
      }

      const sprite = this.add
        .image(placement.x, placement.y, definition.textureKey)
        .setDepth(depthBase);

      if (typeof placement.anchorX === "number" || typeof placement.anchorY === "number") {
        sprite.setOrigin(placement.anchorX ?? 0.5, placement.anchorY ?? 0.5);
      }

      if (placement.width && placement.height) {
        sprite.setDisplaySize(placement.width, placement.height);
      } else {
        sprite.setScale(placement.scale || definition.scale || 1);
      }

      if (placement.rotation) {
        sprite.setRotation(placement.rotation);
      }

      this.stageObstacleLayer.add(sprite);

      const collisionBox = this.getStageObstacleCollisionBox(placement);
      const hitbox = this.add
        .rectangle(
          placement.x + (collisionBox.offsetX || 0),
          placement.y + (collisionBox.offsetY || 0),
          collisionBox.width,
          collisionBox.height,
          0xff7373,
          this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes ? 0.14 : 0
        )
        .setDepth(depthBase + 0.2)
        .setVisible(this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes);

      if (this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes) {
        hitbox.setStrokeStyle(1, 0xff7373, 0.9);
      }

      this.physics.add.existing(hitbox, true);
      hitbox.body.updateFromGameObject();
      this.stageObstacleBodies.add(hitbox);
      const instance = {
        ...placement,
        sprite: placement.sprite,
        collisionBox,
        textureKey: definition.textureKey,
        displayObject: sprite,
        hitbox
      };

      if (this.stageDebugEnabled && this.stageDebugOptions.showObstacleLabels) {
        const debugLabel = this.add
          .text(
            placement.x,
            placement.y - (placement.height || 48) - 10,
            placement.id || placement.type || placement.sprite,
            {
              fontFamily: "Consolas, monospace",
              fontSize: "11px",
              color: "#ffd2d2",
              backgroundColor: "rgba(10, 16, 22, 0.55)",
              padding: { x: 3, y: 2 }
            }
          )
          .setOrigin(0.5, 1)
          .setDepth(depthBase + 0.35);
        this.stageDebugLayer.add(debugLabel);
        instance.debugLabel = debugLabel;
      }

      this.stageObstacleInstances.push(instance);
    });
  }

  buildStageBoundaries(stage) {
    const placements = stage.boundaryPlacements || [];
    this.stageBoundaryInstances = [];

    placements.forEach((placement) => {
      const definition = stage.assets.boundaries?.[placement.sprite];
      if (!definition) {
        return;
      }

      const boundary = this.add
        .image(placement.x, placement.y, definition.textureKey)
        .setDepth(placement.depth ?? 8.7)
        .setAlpha(placement.alpha ?? 1)
        .setRotation(placement.rotation || 0);

      if (placement.flipX || placement.flipY) {
        boundary.setFlip(placement.flipX, placement.flipY);
      }

      if (placement.width && placement.height) {
        boundary.setDisplaySize(placement.width, placement.height);
      }

      this.stageBoundaryLayer.add(boundary);
      this.stageBoundaryInstances.push({
        ...placement,
        textureKey: definition.textureKey,
        displayObject: boundary
      });
    });
  }

  buildStageBoundaryOcclusion(stage) {
    const bounds = this.getStagePlayBounds(stage);
    if (!bounds || !this.stageBoundaryOcclusionLayer) {
      return;
    }

    const color = 0x04080b;
    const alpha = 0.86;
    const zones = [
      { x: WORLD_WIDTH / 2, y: bounds.top * 0.5, width: WORLD_WIDTH, height: bounds.top },
      { x: WORLD_WIDTH / 2, y: bounds.bottom + (WORLD_HEIGHT - bounds.bottom) * 0.5, width: WORLD_WIDTH, height: WORLD_HEIGHT - bounds.bottom },
      { x: bounds.left * 0.5, y: bounds.centerY, width: bounds.left, height: bounds.height },
      { x: bounds.right + (WORLD_WIDTH - bounds.right) * 0.5, y: bounds.centerY, width: WORLD_WIDTH - bounds.right, height: bounds.height }
    ];

    zones.forEach((zone) => {
      const occlusion = this.add
        .rectangle(zone.x, zone.y, zone.width, zone.height, color, alpha)
        .setDepth(8.55);
      this.stageBoundaryOcclusionLayer.add(occlusion);
    });

    const innerShadowThickness = 76;
    const shadows = [
      { x: bounds.centerX, y: bounds.top + innerShadowThickness * 0.5, width: bounds.width, height: innerShadowThickness },
      { x: bounds.centerX, y: bounds.bottom - innerShadowThickness * 0.5, width: bounds.width, height: innerShadowThickness },
      { x: bounds.left + innerShadowThickness * 0.5, y: bounds.centerY, width: innerShadowThickness, height: bounds.height },
      { x: bounds.right - innerShadowThickness * 0.5, y: bounds.centerY, width: innerShadowThickness, height: bounds.height }
    ];

    shadows.forEach((shadow) => {
      const edgeShade = this.add
        .rectangle(shadow.x, shadow.y, shadow.width, shadow.height, 0x000000, 0.18)
        .setDepth(8.56);
      this.stageBoundaryOcclusionLayer.add(edgeShade);
    });
  }

  buildStagePlayBoundsCollision(stage) {
    const bounds = this.getStageMovementBounds(stage);
    if (!bounds) {
      return;
    }

    const thickness = stage.playBounds?.wallThickness || 96;
    const walls = [
      { id: "playbound_top", x: bounds.centerX, y: bounds.top - thickness * 0.5, width: bounds.width + thickness * 2, height: thickness },
      { id: "playbound_bottom", x: bounds.centerX, y: bounds.bottom + thickness * 0.5, width: bounds.width + thickness * 2, height: thickness },
      { id: "playbound_left", x: bounds.left - thickness * 0.5, y: bounds.centerY, width: thickness, height: bounds.height },
      { id: "playbound_right", x: bounds.right + thickness * 0.5, y: bounds.centerY, width: thickness, height: bounds.height }
    ];

    walls.forEach((wall) => {
      const debugWall = this.add
        .rectangle(
          wall.x,
          wall.y,
          wall.width,
          wall.height,
          0xff4b6a,
          this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes ? 0.12 : 0
        )
        .setDepth(8.92)
        .setVisible(this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes);

      if (this.stageDebugEnabled && this.stageDebugOptions.showObstacleHitboxes) {
        debugWall.setStrokeStyle(1, 0xff4b6a, 0.85);
      }

      this.physics.add.existing(debugWall, true);
      debugWall.body.updateFromGameObject();
      this.stageObstacleBodies.add(debugWall);
      this.stageObstacleInstances.push({
        id: wall.id,
        type: "playBoundsWall",
        sprite: null,
        x: wall.x,
        y: wall.y,
        collisionBox: {
          offsetX: 0,
          offsetY: 0,
          width: wall.width,
          height: wall.height
        },
        blocksMovement: true,
        layer: "boundaries",
        zone: "movementBounds",
        hitbox: debugWall
      });
    });
  }

  buildLegacyStageDecalPlacements(stage) {
    const rng = new Phaser.Math.RandomDataGenerator([`${stage.seed}-decals`]);
    const placements = [];

    (stage.decalScatter || []).forEach((rule) => {
      for (let index = 0; index < rule.count; index += 1) {
        const point = this.findStageDecalPoint(stage, rule, rng);
        if (!point) {
          continue;
        }

        placements.push({
          id: `legacy_${rule.sprite}_${String(index + 1).padStart(3, "0")}`,
          type: rule.type || rule.sprite,
          sprite: rule.sprite,
          x: point.x,
          y: point.y,
          scale: rng.realInRange(rule.minScale, rule.maxScale),
          rotation: rule.rotate ? rng.realInRange(-Math.PI, Math.PI) : 0,
          alpha: rng.realInRange(rule.minAlpha, rule.maxAlpha),
          layer: "decals",
          zone: rule.zone || "scatter"
        });
      }
    });

    return placements;
  }

  getStageObstacleCollisionBox(placement) {
    if (placement.collisionBox && !placement.collision) {
      return placement.collisionBox;
    }

    const collision = placement.collision || placement.collisionBox || {};
    if (collision.shape === "circle") {
      const radius = collision.radius || 0;
      return {
        offsetX: collision.offsetX || 0,
        offsetY: collision.offsetY || 0,
        width: radius * 2,
        height: radius * 2
      };
    }

    return {
      offsetX: collision.offsetX || 0,
      offsetY: collision.offsetY || 0,
      width: collision.width,
      height: collision.height
    };
  }

  pickStageGroundTexture(stage, x, y) {
    const ground = stage.assets.ground;
    const center = stage.worldCenter;
    const dx = Math.abs(x - center.x);
    const dy = Math.abs(y - center.y);
    const centerDistance = Phaser.Math.Distance.Between(x, y, center.x, center.y);
    const noise = this.getStageNoise(x, y, 0.12);
    const roadEdgeDistance = this.getRoadEdgeDistance(stage, x, y);

    if (!this.isPointInStageRoad(stage, x, y)) {
      return ground.sidewalk.textureKey;
    }

    if (centerDistance <= stage.layout.centerClearRadius + 110) {
      return noise > 0.84 ? ground.crackedAsphalt.textureKey : ground.asphalt.textureKey;
    }

    if (roadEdgeDistance >= 0 && roadEdgeDistance <= stage.layout.roadEdgeBand && noise > 0.18) {
      return noise > 0.62 ? ground.overgrownAsphalt.textureKey : ground.crackedAsphalt.textureKey;
    }

    if (noise > 0.82) {
      return ground.crackedAsphalt.textureKey;
    }

    if (noise > 0.92) {
      return ground.overgrownAsphalt.textureKey;
    }

    return ground.asphalt.textureKey;
  }

  findStageDecalPoint(stage, rule, rng) {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const point = this.sampleStageDecalPoint(stage, rule.zone, rng);
      if (!point) {
        continue;
      }

      if (this.isPointNearStageObstacle(stage, point.x, point.y, 26)) {
        continue;
      }

      return point;
    }

    return null;
  }

  sampleStageDecalPoint(stage, zone, rng) {
    const center = stage.worldCenter;
    const layout = stage.layout;
    const scatterRadius = layout.decalScatterRadius;

    if (zone === "perimeter") {
      const angle = rng.realInRange(-Math.PI, Math.PI);
      const radius = rng.realInRange(layout.roadHalfWidth + 620, scatterRadius);
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
    }

    if (zone === "crosswalkEdge") {
      const band = layout.crosswalks[rng.integerInRange(0, layout.crosswalks.length - 1)];
      const width = band.tilesWide * (stage.tileSize || 128) * 0.5;
      const height = band.tilesHigh * (stage.tileSize || 128) * 0.5;
      const localX = rng.realInRange(-width, width);
      const localY = rng.realInRange(-height - 90, height + 90);
      const cos = Math.cos(band.rotation || 0);
      const sin = Math.sin(band.rotation || 0);
      return {
        x: band.x + localX * cos - localY * sin,
        y: band.y + localX * sin + localY * cos
      };
    }

    const x = rng.realInRange(center.x - scatterRadius, center.x + scatterRadius);
    const y = rng.realInRange(center.y - scatterRadius, center.y + scatterRadius);
    const inRoad = this.isPointInStageRoad(stage, x, y);
    const nearRoadEdge = this.isPointNearStageRoadEdge(stage, x, y, layout.roadEdgeBand);
    const centerDistance = Phaser.Math.Distance.Between(x, y, center.x, center.y);
    const inCrosswalk = this.isPointInStageCrosswalk(stage, x, y, 24);

    if (centerDistance < layout.centerClearRadius * 0.86) {
      return null;
    }

    if (zone === "roadEdge" && inRoad && nearRoadEdge && !inCrosswalk) {
      return { x, y };
    }

    if (zone === "roadInterior" && inRoad && !nearRoadEdge && !inCrosswalk) {
      return { x, y };
    }

    if (zone === "sidewalk" && !inRoad) {
      return { x, y };
    }

    return null;
  }

  isPointInStageRoad(stage, x, y) {
    const center = stage.worldCenter;
    const dx = Math.abs(x - center.x);
    const dy = Math.abs(y - center.y);
    return dx <= stage.layout.roadHalfWidth || dy <= stage.layout.roadHalfWidth;
  }

  isPointNearStageRoadEdge(stage, x, y, edgeBand = 180) {
    const distance = this.getRoadEdgeDistance(stage, x, y);
    return distance >= 0 && distance <= edgeBand;
  }

  getRoadEdgeDistance(stage, x, y) {
    const center = stage.worldCenter;
    const dx = Math.abs(x - center.x);
    const dy = Math.abs(y - center.y);
    const half = stage.layout.roadHalfWidth;
    const insideVertical = dx <= half;
    const insideHorizontal = dy <= half;

    if (insideVertical && insideHorizontal) {
      return Math.min(half - dx, half - dy);
    }

    if (insideHorizontal) {
      return half - dy;
    }

    if (insideVertical) {
      return half - dx;
    }

    return -1;
  }

  isPointInStageCrosswalk(stage, x, y, padding = 0) {
    const tileSize = stage.tileSize || 128;

    return stage.layout.crosswalks.some((band) => {
      const dx = x - band.x;
      const dy = y - band.y;
      const cos = Math.cos(-(band.rotation || 0));
      const sin = Math.sin(-(band.rotation || 0));
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      const halfWidth = band.tilesWide * tileSize * 0.5 + padding;
      const halfHeight = band.tilesHigh * tileSize * 0.5 + padding;

      return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
    });
  }

  isPointNearStageObstacle(stage, x, y, padding = 0) {
    return stage.obstaclePlacements.some((placement) => {
      const box = this.getStageObstacleCollisionBox(placement);
      const left = placement.x + (box.offsetX || 0) - box.width * 0.5 - padding;
      const right = placement.x + (box.offsetX || 0) + box.width * 0.5 + padding;
      const top = placement.y + (box.offsetY || 0) - box.height * 0.5 - padding;
      const bottom = placement.y + (box.offsetY || 0) + box.height * 0.5 + padding;

      return x >= left && x <= right && y >= top && y <= bottom;
    });
  }

  getStageNoise(x, y, offset = 0) {
    const value = Math.sin(x * 0.0137 + y * 0.0213 + offset * 31.7) * 43758.5453;
    return value - Math.floor(value);
  }

  createGroups() {
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.robotMissiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.xpOrbs = this.physics.add.group();
    this.rareItems = this.physics.add.group();
    this.specialItems = this.physics.add.group();
    this.robotItems = this.physics.add.group();
    this.pickupEffectsLayer = this.add.layer().setDepth(11);
    this.skillEffectsLayer = this.add.layer().setDepth(21);
    this.robotEffectsLayer = this.add.layer().setDepth(22);
    this.supportEffectsLayer = this.add.layer().setDepth(24);
    this.combatTextLayer = this.add.layer().setDepth(30);
    this.floatingCombatTextCount = 0;
  }

  createPlayer() {
    const playBounds = this.getStagePlayBounds(this.currentStage);
    const startX = playBounds?.centerX || WORLD_WIDTH / 2;
    const startY = playBounds?.centerY || WORLD_HEIGHT / 2;

    this.playerHitbox = this.add.circle(startX, startY, PLAYER_HITBOX_RADIUS, 0xffffff, 0);
    this.physics.add.existing(this.playerHitbox);
    this.playerHitbox.body.setCircle(PLAYER_HITBOX_RADIUS);
    this.playerHitbox.body.setCollideWorldBounds(true);

    this.playerShadow = this.add
      .ellipse(
        startX,
        startY + PLAYER_SHADOW_OFFSET_Y,
        PLAYER_SHADOW_WIDTH,
        PLAYER_SHADOW_HEIGHT,
        0x000000,
        0.28
      )
      .setDepth(15);

    this.playerSprite = this.add
      .image(startX, startY + PLAYER_SPRITE_OFFSET_Y, "player-idle")
      .setScale(PLAYER_SCALE)
      .setDepth(20);

    this.damageFlash = this.registerUiObject(
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff5462, 0)
        .setScrollFactor(0)
        .setDepth(500)
    );

    this.worldCamera.startFollow(this.playerHitbox, true, 0.12, 0.12);
    this.worldCamera.setZoom(WORLD_CAMERA_ZOOM);
  }

  createRobotCompanion() {
    const startX = this.playerHitbox.x - 78;
    const startY = this.playerHitbox.y - 56;
    this.robotState.x = startX;
    this.robotState.y = startY;

    this.robotRecoveryField = this.add
      .image(this.playerHitbox.x, this.playerHitbox.y + 6, this.getRobotRecoveryFieldTextureKey())
      .setDepth(16)
      .setAlpha(0.24)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.robotShadow = this.add
      .ellipse(startX, startY + 42, 58, 16, 0x000000, 0.24)
      .setDepth(15.8);

    this.robotSprite = this.add
      .image(startX, startY, this.getRobotTextureKey())
      .setDepth(20.8)
      .setAlpha(0.96);

    this.robotMuzzleGlow = this.add
      .image(startX, startY + 4, "skill-hit-glow")
      .setDepth(20.7)
      .setScale(0.22)
      .setTint(0xff78ed)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.robotEffectsLayer.add(this.robotMuzzleGlow);
    this.updateRobotVisualLevel(true);
    this.updateRobotRecoveryFieldVisual(0);
  }

  getRobotTextureKey(level = this.getRobotVisualLevel()) {
    const asset = ROBOT_IMAGE_ASSETS.robotLevels[Phaser.Math.Clamp(level, 1, ROBOT_MAX_LEVEL) - 1];
    return this.textures.exists(asset?.textureKey) ? asset.textureKey : "hud-icon-basic-skill";
  }

  getRobotRecoveryFieldTextureKey(level = this.robotState?.healLevel || 1) {
    const asset = ROBOT_IMAGE_ASSETS.recoveryFields[Phaser.Math.Clamp(level, 1, ROBOT_MAX_LEVEL) - 1];
    return this.textures.exists(asset?.textureKey) ? asset.textureKey : "skill-hit-ring";
  }

  getRobotVisualLevel() {
    return Phaser.Math.Clamp(
      Math.max(this.robotState?.missileLevel || 1, this.robotState?.healLevel || 1),
      1,
      ROBOT_MAX_LEVEL
    );
  }

  scaleWorldImageToFit(image, longestSide) {
    const frame = image?.frame;
    const sourceLongestSide = Math.max(frame?.width || longestSide, frame?.height || longestSide, 1);
    image.setScale(longestSide / sourceLongestSide);
  }

  scaleImageToFitBox(image, maxWidth, maxHeight) {
    const frame = image?.frame;
    const width = Math.max(frame?.width || maxWidth, 1);
    const height = Math.max(frame?.height || maxHeight, 1);
    image.setScale(Math.min(maxWidth / width, maxHeight / height));
  }

  updateRobotVisualLevel(force = false) {
    if (!this.robotSprite || !this.robotState) {
      return;
    }

    const visualLevel = this.getRobotVisualLevel();
    if (force || visualLevel !== this.robotState.visualLevel) {
      this.robotState.visualLevel = visualLevel;
      this.robotSprite.setTexture(this.getRobotTextureKey(visualLevel));
      this.scaleWorldImageToFit(this.robotSprite, 72 + visualLevel * 3.4);
    }

    if (this.robotRecoveryField) {
      this.robotRecoveryField.setTexture(this.getRobotRecoveryFieldTextureKey(this.robotState.healLevel));
    }
  }

  getRobotSubsystemXpRequirement(type, level = 1) {
    const clampedLevel = Phaser.Math.Clamp(level, 1, ROBOT_MAX_LEVEL);
    const base = type === "field" ? 24 : 20;
    const growth = type === "field" ? 14 : 12;
    return base + (clampedLevel - 1) * growth;
  }

  getRobotSubsystemXpInfo(type) {
    const isField = type === "field";
    const levelKey = isField ? "healLevel" : "missileLevel";
    const xpKey = isField ? "healXp" : "missileXp";
    const level = Phaser.Math.Clamp(this.robotState?.[levelKey] || 1, 1, ROBOT_MAX_LEVEL);
    const xp = Math.max(0, Math.floor(this.robotState?.[xpKey] || 0));
    const required = this.getRobotSubsystemXpRequirement(type, level);
    const isMaxed = level >= ROBOT_MAX_LEVEL;

    return {
      type,
      level,
      xp: isMaxed ? 0 : xp,
      required,
      ratio: isMaxed ? 1 : Phaser.Math.Clamp(xp / Math.max(1, required), 0, 1),
      isMaxed
    };
  }

  addRobotSubsystemXp(type, amount, options = {}) {
    if (!this.robotState || amount <= 0) {
      return false;
    }

    const isField = type === "field";
    const levelKey = isField ? "healLevel" : "missileLevel";
    const xpKey = isField ? "healXp" : "missileXp";
    if ((this.robotState[levelKey] || 1) >= ROBOT_MAX_LEVEL) {
      this.robotState[xpKey] = 0;
      this.updateHudRobotPanel();
      return false;
    }

    this.robotState[xpKey] = Math.max(0, (this.robotState[xpKey] || 0) + amount);
    let leveledUp = false;
    while ((this.robotState[levelKey] || 1) < ROBOT_MAX_LEVEL) {
      const requirement = this.getRobotSubsystemXpRequirement(type, this.robotState[levelKey]);
      if (this.robotState[xpKey] < requirement) {
        break;
      }

      this.robotState[xpKey] -= requirement;
      this.robotState[levelKey] += 1;
      leveledUp = true;
    }

    if ((this.robotState[levelKey] || 1) >= ROBOT_MAX_LEVEL) {
      this.robotState[xpKey] = 0;
    }

    if (leveledUp) {
      if (isField) {
        this.robotState.healTimer = Math.min(this.robotState.healTimer, this.getRobotHealInterval() * 0.72);
        this.updateRobotRecoveryFieldVisual(0);
      }
      this.updateRobotVisualLevel();
      if (!options.silent) {
        this.setLastPickupNotice(isField ? `ROBOT FIELD Lv.${this.robotState.healLevel}` : `ROBOT MISSILE Lv.${this.robotState.missileLevel}`);
      }
    }

    this.updateHudRobotPanel();
    return leveledUp;
  }

  createPlayerSkills() {
    Object.values(this.playerSkills).forEach((skillState) => {
      this.applySkillStage(skillState, true);
    });
  }

  applySkillStage(skillState, resetMotion = false) {
    const stageData = skillState.definition.stages[skillState.stageIndex];
    const instanceCount = this.getSkillInstanceCount(skillState.definition, stageData);
    skillState.currentStage = stageData;

    if (resetMotion) {
      skillState.orbitAngle = 0;
      skillState.pulseTimer = 0;
    }

    while (skillState.orbitals.length > instanceCount) {
      this.destroySkillOrbital(skillState.orbitals.pop());
    }

    while (skillState.orbitals.length < instanceCount) {
      skillState.orbitals.push(this.createSkillOrbital(stageData));
    }

    // Stage data remains the single source of truth for orbital visuals and contact behavior.
    skillState.orbitals.forEach((orbital, index) => {
      orbital.angleOffset = (Math.PI * 2 * index) / Math.max(instanceCount, 1);
      orbital.pulseOffset = (Math.PI * 2 * index) / Math.max(instanceCount, 1);
      orbital.frameTimer = 0;
      orbital.sprite.setTexture(this.getSkillStageTextureKey(stageData));
      orbital.sprite.setScale(stageData.displayScale);
      orbital.sprite.setVisible(true);
      orbital.hitbox.damage = stageData.damage;
      orbital.hitbox.contactTickMs = stageData.contactTickMs;
      orbital.hitbox.skillId = skillState.id;
      orbital.hitbox.skillStage = stageData.stage;
      orbital.hitbox.skillHitRadius = stageData.hitRadius;
      orbital.hitbox.skillVisualScale = stageData.displayScale;
      orbital.hitbox.damageTint = stageData.damageTint || 0xf4c8ff;
      orbital.hitbox.effectTint = stageData.effectTint || 0xe0efff;
      orbital.aura.setTint(stageData.auraTint || (stageData.stage >= 7 ? 0x82e7ff : 0xcdf3ff));
      orbital.aura.setVisible(Boolean(stageData.pulseSpeed) || skillState.definition.behavior === "screenHoming");
      orbital.aura.setAlpha(0);
      orbital.sprite.setAlpha(stageData.pulseSpeed ? 0.82 : 0.94);
      orbital.trailTimer = 0;
      this.resizeSkillHitbox(orbital.hitbox, stageData.hitRadius);

      if (skillState.definition.behavior === "directionalDash") {
        this.resetDirectionalDashOrbital(orbital, stageData, resetMotion);
      }

      if (skillState.definition.behavior === "screenHoming" && resetMotion) {
        orbital.hitbox.setPosition(this.playerHitbox.x, this.playerHitbox.y - 32);
        orbital.hitbox.body.updateFromGameObject();
        orbital.aura.setPosition(orbital.hitbox.x, orbital.hitbox.y);
        orbital.sprite.setPosition(orbital.hitbox.x, orbital.hitbox.y);
      }
    });
  }

  getSkillInstanceCount(definition, stageData) {
    if (definition.behavior === "screenHoming" || definition.behavior === "directionalDash") {
      return stageData.unitCount || 1;
    }

    return stageData.orbitCount || 1;
  }

  getSkillStageTextureKey(stageData) {
    return stageData.animationFrames?.[0]?.textureKey || stageData.textureKey;
  }

  getSkillOrbitalFrameTextureKey(stageData, orbital) {
    const frames = stageData.animationFrames || [];
    if (!frames.length) {
      return this.getSkillStageTextureKey(stageData);
    }

    const frameDuration = Math.max(1, stageData.frameDurationMs || 80);
    const frameIndex = stageData.animationLoop === false
      ? Math.min(frames.length - 1, Math.floor((orbital.frameTimer || 0) / frameDuration))
      : Math.floor((orbital.frameTimer || 0) / frameDuration) % frames.length;

    return frames[frameIndex]?.textureKey || this.getSkillStageTextureKey(stageData);
  }

  resetDirectionalDashOrbital(orbital, stageData, readyToLaunch = false) {
    orbital.dashActive = false;
    orbital.dashElapsed = 0;
    orbital.dashCooldownTimer = readyToLaunch ? (stageData.cooldownMs || 1000) : 0;
    orbital.dashAngle = this.playerAimAngle || 0;
    orbital.frameTimer = 0;
    orbital.trailTimer = 0;
    orbital.hitbox.body.enable = false;
    orbital.hitbox.setPosition(this.playerHitbox.x, this.playerHitbox.y - 14);
    orbital.hitbox.body.updateFromGameObject();
    orbital.aura.setVisible(false);
    orbital.sprite.setVisible(false);
  }

  createSkillOrbital(stageData) {
    const hitbox = this.add.zone(
      this.playerHitbox.x,
      this.playerHitbox.y,
      stageData.hitRadius * 2,
      stageData.hitRadius * 2
    );

    this.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true);
    hitbox.body.moves = false;
    hitbox.damageCooldowns = new WeakMap();

    this.resizeSkillHitbox(hitbox, stageData.hitRadius);

    const aura = this.add
      .image(this.playerHitbox.x, this.playerHitbox.y, "skill-hit-glow")
      .setScale(stageData.displayScale * 1.55)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setVisible(false);

    const sprite = this.add
      .image(this.playerHitbox.x, this.playerHitbox.y, this.getSkillStageTextureKey(stageData))
      .setScale(stageData.displayScale)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setAlpha(0.94);

    const orbital = {
      hitbox,
      aura,
      sprite,
      collider: this.physics.add.overlap(hitbox, this.enemies, this.handleSkillHitboxOverlap, null, this),
      angleOffset: 0,
      pulseOffset: 0,
      spinAngle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      frameTimer: 0,
      trailTimer: 0
    };

    hitbox.orbital = orbital;
    return orbital;
  }

  resizeSkillHitbox(hitbox, hitRadius) {
    const diameter = hitRadius * 2;
    hitbox.setSize(diameter, diameter);
    hitbox.body.setCircle(hitRadius, 0, 0);
    hitbox.body.setOffset(0, 0);
    hitbox.body.updateFromGameObject();
  }

  destroySkillOrbital(orbital) {
    if (orbital.collider) {
      orbital.collider.destroy();
    }
    orbital.hitbox.destroy();
    orbital.aura.destroy();
    orbital.sprite.destroy();
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      dashAlt: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
    this.input.keyboard.off("keydown", this.handleRankingNameKeyDown, this);
    this.input.keyboard.on("keydown", this.handleRankingNameKeyDown, this);
  }

  handleRankingNameKeyDown(event) {
    if (!this.rankingNameEntryActive || !this.gameOver || this.pendingRankingSaved) {
      return;
    }

    event.preventDefault?.();
    event.stopPropagation?.();

    if (event.key === "Enter") {
      this.submitPendingRankingEntry();
      return;
    }

    if (event.key === "Backspace") {
      this.rankingPlayerName = this.rankingNameSelectAll
        ? ""
        : this.rankingPlayerName.slice(0, -1);
      this.rankingNameSelectAll = false;
      this.updateRankingNameInputText();
      return;
    }

    if (event.key === "Delete") {
      this.rankingPlayerName = "";
      this.rankingNameSelectAll = false;
      this.updateRankingNameInputText();
      return;
    }

    if (event.key === "Escape") {
      this.rankingNameSelectAll = false;
      this.updateRankingNameInputText();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
      return;
    }

    const currentName = this.rankingNameSelectAll ? "" : this.rankingPlayerName;
    this.rankingPlayerName = `${currentName}${event.key}`.slice(0, PLAYER_NAME_MAX_LENGTH);
    this.rankingNameSelectAll = false;
    this.updateRankingNameInputText();
  }

  createHud() {
    this.hudUsesFrameAsset = this.textures.exists(HUD_IMAGE_ASSETS.overlayFrame.textureKey);
    if (this.hudUsesFrameAsset) {
      this.hudFrameOverlay = this.registerUiObject(
        this.add
          .image(0, 0, HUD_IMAGE_ASSETS.overlayFrame.textureKey)
          .setOrigin(0, 0)
          .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
          .setScrollFactor(0)
          .setDepth(200)
      );
    }

    this.hudPanel = this.createHudPanel(12, 12, 316, 146);

    if (!this.hudUsesFrameAsset) {
      this.registerUiObject(
        this.add
          .rectangle(24, 24, 76, 92, 0x020507, 0.88)
          .setOrigin(0, 0)
          .setStrokeStyle(1, HUD_STYLE.slotStroke, 0.42)
          .setScrollFactor(0)
          .setDepth(201)
      );
    }

    this.registerUiObject(
      this.add
        .image(62, 70, "player-idle")
        .setScale(0.118)
        .setScrollFactor(0)
        .setDepth(202)
    );

    this.hudLevelText = this.createHudText(this.hudUsesFrameAsset ? 134 : 114, this.hudUsesFrameAsset ? 23 : 25, "Lv. 1", {
      fontSize: "28px",
      fontStyle: "bold"
    });

    const statusLabelX = this.hudUsesFrameAsset ? 134 : 92;
    const statusBarX = this.hudUsesFrameAsset ? 166 : 114;
    const statusHpBarWidth = this.hudUsesFrameAsset ? 238 : 170;
    const statusXpBarWidth = this.hudUsesFrameAsset ? 218 : 170;
    const statusValueX = this.hudUsesFrameAsset ? 418 : 292;
    this.createHudText(statusLabelX, this.hudUsesFrameAsset ? 54 : 55, "HP", {
      fontSize: "11px",
      color: HUD_STYLE.text,
      fontStyle: "bold"
    });
    this.hpBarFill = this.createHudBar(statusBarX, this.hudUsesFrameAsset ? 65 : 66, statusHpBarWidth, 9, HUD_STYLE.hp);
    this.hudHpText = this.createHudText(statusValueX, this.hudUsesFrameAsset ? 55 : 56, "0 / 0", {
      fontSize: "15px",
      align: "right"
    }).setOrigin(1, 0);

    this.createHudText(statusLabelX, this.hudUsesFrameAsset ? 87 : 88, "XP", {
      fontSize: "11px",
      color: HUD_STYLE.text,
      fontStyle: "bold"
    });
    this.xpBarFill = this.createHudBar(statusBarX, this.hudUsesFrameAsset ? 103 : 99, statusXpBarWidth, 9, HUD_STYLE.xp);
    this.hudXpText = this.createHudText(statusValueX, this.hudUsesFrameAsset ? 88 : 89, "0 / 0", {
      fontSize: "14px",
      color: HUD_STYLE.muted,
      align: "right"
    }).setOrigin(1, 0);

    this.hudPickupText = this.createHudText(24, 126, "", {
      fontSize: "13px",
      color: HUD_STYLE.warn
    });

    this.hudSkillSlots = [];
    for (let index = 0; index < 5; index += 1) {
      const skillX = this.hudUsesFrameAsset ? 16 + index * 76 : 24 + index * 58;
      const skillY = this.hudUsesFrameAsset ? 140 : 170;
      const skillSize = this.hudUsesFrameAsset ? 66 : 48;
      this.hudSkillSlots.push(this.createHudSlot(skillX, skillY, skillSize, {
        showStageDots: true,
        iconMaxSize: this.hudUsesFrameAsset ? 34 : 28,
        labelColor: "#f0c463"
      }));
    }

    this.createHudPanel(GAME_WIDTH / 2 - 84, 10, 168, 56);
    this.hudTimerLabel = this.createHudText(GAME_WIDTH / 2, 16, "TIMER", {
      fontSize: "11px",
      color: HUD_STYLE.warn,
      align: "center"
    }).setOrigin(0.5, 0);
    this.hudTimerText = this.createHudText(GAME_WIDTH / 2, this.hudUsesFrameAsset ? 38 : 28, "00:00", {
      fontSize: "30px",
      fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5, 0);

    this.createHudPanel(GAME_WIDTH - 304, 12, 132, 58);
    this.createHudPanel(GAME_WIDTH - 164, 12, 152, 58);
    const waveCenterX = this.hudUsesFrameAsset ? GAME_WIDTH - 270 : GAME_WIDTH - 238;
    const killsCenterX = this.hudUsesFrameAsset ? GAME_WIDTH - 96 : GAME_WIDTH - 88;
    this.createHudText(waveCenterX, this.hudUsesFrameAsset ? 23 : 18, "WAVE", {
      fontSize: "11px",
      color: HUD_STYLE.warn,
      align: "center"
    }).setOrigin(0.5, 0);
    this.hudWaveText = this.createHudText(waveCenterX, this.hudUsesFrameAsset ? 40 : 32, "01", {
      fontSize: "27px",
      fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5, 0);
    this.createHudText(killsCenterX, this.hudUsesFrameAsset ? 23 : 18, "KILLS", {
      fontSize: "11px",
      color: HUD_STYLE.warn,
      align: "center"
    }).setOrigin(0.5, 0);
    this.hudKillsText = this.createHudText(killsCenterX, this.hudUsesFrameAsset ? 40 : 32, "0", {
      fontSize: "27px",
      fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5, 0);

    this.createHudPanel(GAME_WIDTH - 246, 88, 232, 74);
    this.hudObjectiveTitle = this.createHudText(this.hudUsesFrameAsset ? GAME_WIDTH - 226 : GAME_WIDTH - 226, this.hudUsesFrameAsset ? 105 : 104, "OBJECTIVE", {
      fontSize: "13px",
      color: HUD_STYLE.warn,
      fontStyle: "bold"
    });
    this.hudObjectiveText = this.createHudText(this.hudUsesFrameAsset ? GAME_WIDTH - 226 : GAME_WIDTH - 226, this.hudUsesFrameAsset ? 128 : 126, "Survive and harvest XP", {
      fontSize: this.hudUsesFrameAsset ? "14px" : "15px",
      color: HUD_STYLE.text,
      wordWrap: { width: this.hudUsesFrameAsset ? 214 : 194 }
    });

    this.createHudPanel(12, this.hudUsesFrameAsset ? 466 : GAME_HEIGHT - 178, 252, this.hudUsesFrameAsset ? 242 : 166);
    this.hudAreaText = this.createHudText(this.hudUsesFrameAsset ? 36 : 28, this.hudUsesFrameAsset ? 482 : GAME_HEIGHT - 164, "AREA: SHIBUYA SCRAMBLE", {
      fontSize: "14px",
      color: HUD_STYLE.warn,
      fontStyle: "bold"
    });
    this.minimapConfig = {
      x: this.hudUsesFrameAsset ? 30 : 30,
      y: this.hudUsesFrameAsset ? 512 : GAME_HEIGHT - 136,
      width: this.hudUsesFrameAsset ? 214 : 206,
      height: this.hudUsesFrameAsset ? 172 : 112
    };
    this.minimapGraphics = this.registerUiObject(this.add.graphics().setScrollFactor(0).setDepth(202));
    this.nextMinimapRefreshAt = 0;

    const coinPanelX = GAME_WIDTH - 264;
    const coinPanelY = this.hudUsesFrameAsset ? 448 : GAME_HEIGHT - 128;
    this.createHudPanel(coinPanelX, coinPanelY, 252, 38, {
      forceShape: true,
      depth: 203,
      alpha: this.hudUsesFrameAsset ? 0.58 : 0.72,
      strokeAlpha: 0.42
    });
    const coinIconKey = this.textures.exists(ITEM_IMAGE_ASSETS.coin.textureKey)
      ? ITEM_IMAGE_ASSETS.coin.textureKey
      : "rare-token";
    this.hudCoinIcon = this.registerUiObject(
      this.add
        .image(coinPanelX + 30, coinPanelY + 19, coinIconKey)
        .setDisplaySize(28, 28)
        .setScrollFactor(0)
        .setDepth(204)
    );
    this.hudCoinText = this.createHudText(coinPanelX + 54, coinPanelY + 6, "0", {
      fontSize: "22px",
      color: HUD_STYLE.text,
      fontStyle: "bold",
      depth: 204
    });

    this.createHudPanel(GAME_WIDTH - 264, this.hudUsesFrameAsset ? 494 : GAME_HEIGHT - 84, 252, 72);
    this.hudResourceText = this.createHudText(this.hudUsesFrameAsset ? 1120 : GAME_WIDTH - 246, this.hudUsesFrameAsset ? 512 : GAME_HEIGHT - 68, "", {
      fontSize: this.hudUsesFrameAsset ? "12px" : "14px",
      color: HUD_STYLE.text,
      lineSpacing: 5
    });

    this.createRobotHudPanel();
    this.createDashStaminaGauge();

    this.hudConsumableSlots = [
      this.createHudSlot(this.hudUsesFrameAsset ? 986 : GAME_WIDTH - 152, this.hudUsesFrameAsset ? 598 : GAME_HEIGHT - 68, this.hudUsesFrameAsset ? 64 : 46, { textureKey: "pickup-heal", label: "HEAL", effectType: "heal" }),
      this.createHudSlot(this.hudUsesFrameAsset ? 1084 : GAME_WIDTH - 100, this.hudUsesFrameAsset ? 598 : GAME_HEIGHT - 68, this.hudUsesFrameAsset ? 64 : 46, { textureKey: "pickup-magnet", label: "MAG", effectType: "magnet" }),
      this.createHudSlot(this.hudUsesFrameAsset ? 1182 : GAME_WIDTH - 48, this.hudUsesFrameAsset ? 598 : GAME_HEIGHT - 68, this.hudUsesFrameAsset ? 64 : 46, { textureKey: "pickup-bomb", label: "SUP", effectType: "bomb" })
    ];

    if (this.stageDebugEnabled && this.stageDebugOptions.showCounts) {
      this.debugHudText = this.registerUiObject(
        this.add
          .text(42, GAME_HEIGHT - 86, "", {
            fontFamily: "Consolas, monospace",
            fontSize: "14px",
            color: "#ffcf9e",
            lineSpacing: 4
          })
          .setScrollFactor(0)
          .setDepth(203)
      );
    }
  }

  createRobotHudPanel() {
    const panelX = this.hudUsesFrameAsset ? 762 : GAME_WIDTH - 404;
    const panelY = this.hudUsesFrameAsset ? 590 : GAME_HEIGHT - 112;
    const panelWidth = 210;
    const panelHeight = this.hudUsesFrameAsset ? 106 : 94;
    const slotY = panelY + 12;
    const slotWidth = 92;
    const slotHeight = panelHeight - 24;
    const robotSlotX = panelX + 10;
    const fieldSlotX = panelX + 108;

    this.createHudPanel(panelX, panelY, panelWidth, panelHeight, {
      forceShape: true,
      depth: 203,
      alpha: this.hudUsesFrameAsset ? 0.56 : 0.72,
      strokeAlpha: 0.44
    });

    const createInfoSlot = (x, iconKey, label, xpTint) => {
      const cell = this.registerUiObject(
        this.add
          .rectangle(x, slotY, slotWidth, slotHeight, 0x0b1013, 0.54)
          .setOrigin(0, 0)
          .setStrokeStyle(1, HUD_STYLE.slotStroke, 0.22)
          .setScrollFactor(0)
          .setDepth(204)
      );
      const icon = this.registerUiObject(
        this.add
          .image(x + 25, slotY + 25, iconKey)
          .setAlpha(0.92)
          .setScrollFactor(0)
          .setDepth(205)
      );
      const levelText = this.createHudText(x + 50, slotY + 11, `${label}\nLv.1`, {
        fontSize: "12px",
        color: HUD_STYLE.text,
        fontStyle: "bold",
        lineSpacing: 3,
        depth: 205
      });
      const xpText = this.createHudText(x + slotWidth / 2, slotY + slotHeight - 26, "XP 0/0", {
        fontSize: "10px",
        color: HUD_STYLE.muted,
        align: "center",
        depth: 205
      }).setOrigin(0.5, 0);
      const xpBarWidth = slotWidth - 18;
      const xpBarX = x + 9;
      const xpBarY = slotY + slotHeight - 9;
      const xpBack = this.registerUiObject(
        this.add
          .rectangle(xpBarX, xpBarY, xpBarWidth, 7, 0x1b2528, 0.96)
          .setOrigin(0, 0.5)
          .setStrokeStyle(1, HUD_STYLE.slotStroke, 0.24)
          .setScrollFactor(0)
          .setDepth(205)
      );
      const xpFill = this.registerUiObject(
        this.add
          .rectangle(xpBarX, xpBarY, xpBarWidth, 7, xpTint, 0.94)
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
          .setDepth(206)
      );
      xpFill.maxWidth = xpBarWidth;

      return {
        cell,
        icon,
        levelText,
        xpText,
        xpBack,
        xpFill
      };
    };

    const robotSlot = createInfoSlot(robotSlotX, this.getRobotTextureKey(), "ROBOT", 0xffc94d);
    const fieldSlot = createInfoSlot(fieldSlotX, this.getRobotRecoveryFieldTextureKey(), "FIELD", 0x9be7ff);

    this.hudRobotPanel = {
      robotSlot,
      fieldSlot,
      robotIconMaxSize: this.hudUsesFrameAsset ? 38 : 34,
      fieldIconMaxSize: this.hudUsesFrameAsset ? 36 : 32
    };
    this.updateHudRobotPanel();
  }

  createDashStaminaGauge() {
    const { x, y, radius } = DASH_HUD_CONFIG;
    this.hudDashGaugeConfig = { x, y, radius };
    this.hudDashGaugeGraphics = this.registerUiObject(
      this.add
        .graphics()
        .setScrollFactor(0)
        .setDepth(204)
    );
    this.hudDashIcon = this.registerUiObject(
      this.add
        .image(x, y, "hud-icon-dash")
        .setDisplaySize(42, 42)
        .setScrollFactor(0)
        .setDepth(205)
    );
    this.updateDashStaminaGauge();
  }

  updateDashStaminaGauge() {
    if (!this.hudDashGaugeGraphics || !this.hudDashGaugeConfig || !this.stats) {
      return;
    }

    const { x, y, radius } = this.hudDashGaugeConfig;
    const maxStamina = Math.max(1, this.stats.maxStamina || 1);
    const ratio = Phaser.Math.Clamp((this.stats.stamina ?? maxStamina) / maxStamina, 0, 1);
    const fillColor = this.isDashing
      ? 0xa8f8ff
      : (ratio <= 0.18 ? 0xff7468 : (ratio <= 0.38 ? 0xf0c463 : 0x60e0ac));
    const graphics = this.hudDashGaugeGraphics;

    graphics.clear();
    graphics.fillStyle(0x02070a, this.hudUsesFrameAsset ? 0.54 : 0.78);
    graphics.fillCircle(x, y, radius + 8);
    graphics.lineStyle(2, 0x0f2229, 0.92);
    graphics.strokeCircle(x, y, radius + 7);
    graphics.lineStyle(8, 0x203038, 0.78);
    graphics.strokeCircle(x, y, radius);

    if (ratio > 0.001) {
      graphics.lineStyle(8, fillColor, this.isDashing ? 1 : 0.92);
      graphics.beginPath();
      graphics.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      graphics.strokePath();
    }

    graphics.lineStyle(1, 0xc8f7ff, 0.34);
    graphics.strokeCircle(x, y, radius - 10);
    graphics.lineStyle(1, 0xffffff, this.isDashing ? 0.5 : 0.22);
    graphics.strokeCircle(x, y, radius + 1);

    this.hudDashIcon?.setAlpha(this.dashLockedUntilRelease ? 0.38 : (this.isDashing ? 1 : 0.84));
  }

  createHudPanel(x, y, width, height, options = {}) {
    if (this.hudUsesFrameAsset && !options.forceShape) {
      return this.registerUiObject(
        this.add
          .zone(x, y, width, height)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(options.depth ?? 200)
      );
    }

    return this.registerUiObject(
      this.add
        .rectangle(x, y, width, height, options.fill ?? HUD_STYLE.panelFill, options.alpha ?? HUD_STYLE.panelAlpha)
        .setOrigin(0, 0)
        .setStrokeStyle(options.strokeWidth ?? 1, options.stroke ?? HUD_STYLE.panelStroke, options.strokeAlpha ?? 0.28)
        .setScrollFactor(0)
        .setDepth(options.depth ?? 200)
    );
  }

  createHudText(x, y, text, options = {}) {
    return this.registerUiObject(
      this.add
        .text(x, y, text, {
          fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
          fontSize: options.fontSize ?? "16px",
          color: options.color ?? HUD_STYLE.text,
          fontStyle: options.fontStyle ?? "",
          align: options.align ?? "left",
          lineSpacing: options.lineSpacing ?? 0,
          wordWrap: options.wordWrap
        })
        .setScrollFactor(0)
        .setDepth(options.depth ?? 202)
    );
  }

  createHudBar(x, y, width, height, fillColor, backgroundColor = 0x12191b) {
    this.registerUiObject(
      this.add
        .rectangle(x, y, width, height, backgroundColor, 1)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(201)
    );

    const fill = this.registerUiObject(this.add
      .rectangle(x, y, width, height, fillColor, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(202));
    fill.maxWidth = width;
    return fill;
  }

  setHudBarFill(fill, ratio) {
    if (!fill) {
      return;
    }
    fill.width = fill.maxWidth * Phaser.Math.Clamp(ratio, 0, 1);
  }

  createHudSlot(x, y, size, options = {}) {
    const panel = this.registerUiObject(this.add
      .rectangle(x, y, size, size, HUD_STYLE.slotFill, this.hudUsesFrameAsset ? 0 : 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201));

    if (!this.hudUsesFrameAsset) {
      panel.setStrokeStyle(1, HUD_STYLE.slotStroke, 0.36);
    }

    const icon = this.registerUiObject(this.add
      .image(x + size / 2, y + size / 2 - 4, options.textureKey || "skill-hit-glow")
      .setScale(options.iconScale ?? 0.42)
      .setAlpha(options.textureKey ? 0.9 : 0.18)
      .setVisible(Boolean(options.textureKey))
      .setScrollFactor(0)
      .setDepth(202));

    const label = this.createHudText(x + size / 2, y + size - (this.hudUsesFrameAsset ? 17 : 14), options.label || "", {
      fontSize: "10px",
      color: options.labelColor || HUD_STYLE.muted,
      align: "center",
      depth: 203
    }).setOrigin(0.5, 0);

    const stageDots = [];
    if (options.showStageDots) {
      const dotCount = 8;
      const left = x + 8;
      const spacing = (size - 16) / Math.max(1, dotCount - 1);
      for (let index = 0; index < dotCount; index += 1) {
        const dot = this.registerUiObject(this.add
          .circle(left + spacing * index, y + size - (this.hudUsesFrameAsset ? 7 : 5), 2, 0x596366, 0.42)
          .setScrollFactor(0)
          .setDepth(204));
        stageDots.push(dot);
      }
    }

    return {
      panel,
      icon,
      label,
      stageDots,
      size,
      iconMaxSize: options.iconMaxSize || Math.round(size * 0.54),
      baseLabel: options.label || "",
      effectType: options.effectType || null
    };
  }

  setHudIconToFit(icon, textureKey, maxSize) {
    icon.setTexture(textureKey);
    const frame = icon.frame;
    const longestSide = Math.max(frame?.width || maxSize, frame?.height || maxSize, 1);
    icon.setScale(maxSize / longestSide);
  }

  getSkillHudIconKey(definition) {
    if (definition?.hudIconTextureKey) {
      return definition.hudIconTextureKey;
    }

    if (definition?.behavior === "directionalDash") {
      return definition.stages?.[0]?.animationFrames?.[0]?.textureKey || definition.stages?.[0]?.textureKey || "hud-icon-basic-skill";
    }

    return definition?.behavior === "screenHoming" ? "hud-icon-tornado-skill" : "hud-icon-basic-skill";
  }

  setHudSkillStageDots(slot, stage, maxStage, active) {
    if (!slot.stageDots?.length) {
      return;
    }

    slot.stageDots.forEach((dot, index) => {
      const filled = active && index < stage;
      const available = index < maxStage;
      dot
        .setVisible(available)
        .setFillStyle(filled ? 0xf0c463 : 0x596366, filled ? 0.96 : 0.38);
    });
  }

  updateHudSkillSlots() {
    if (!this.hudSkillSlots) {
      return;
    }

    const skillIds = Object.keys(SKILL_DEFINITIONS);
    this.hudSkillSlots.forEach((slot, index) => {
      const skillId = skillIds[index];
      const skillState = skillId ? this.playerSkills[skillId] : null;
      const definition = skillId ? SKILL_DEFINITIONS[skillId] : null;

      if (!definition) {
        slot.icon.setVisible(false);
        slot.label.setText("");
        slot.panel.setAlpha(0.42);
        this.setHudSkillStageDots(slot, 0, 0, false);
        return;
      }

      const iconKey = this.getSkillHudIconKey(definition);
      const maxStage = definition.stages?.length || 0;
      const currentStage = skillState?.currentStage?.stage || 0;
      const hasIcon = this.textures.exists(iconKey);

      slot.icon
        .setVisible(hasIcon)
        .setAlpha(skillState ? 0.95 : 0.24);
      if (hasIcon) {
        this.setHudIconToFit(slot.icon, iconKey, slot.iconMaxSize);
      }
      slot.panel.setAlpha(skillState ? 0.88 : 0.46);
      slot.label
        .setText(skillState ? `Lv.${currentStage}` : "LOCK")
        .setColor(skillState ? "#f0c463" : HUD_STYLE.muted);
      this.setHudSkillStageDots(slot, currentStage, maxStage, Boolean(skillState));
    });
  }

  updateHudRobotPanel() {
    if (!this.hudRobotPanel || !this.robotState) {
      return;
    }

    const missileLevel = Phaser.Math.Clamp(this.robotState.missileLevel || 1, 1, ROBOT_MAX_LEVEL);
    const visualLevel = this.getRobotVisualLevel();
    const fieldLevel = Phaser.Math.Clamp(this.robotState.healLevel || 1, 1, ROBOT_MAX_LEVEL);
    const robotTextureKey = this.getRobotTextureKey(visualLevel);
    const fieldTextureKey = this.getRobotRecoveryFieldTextureKey(fieldLevel);
    const { robotSlot, fieldSlot } = this.hudRobotPanel;

    robotSlot.levelText.setText(`ROBOT\nLv.${missileLevel}`);
    fieldSlot.levelText.setText(`FIELD\nLv.${fieldLevel}`);
    this.updateHudRobotXpSlot(robotSlot, this.getRobotSubsystemXpInfo("missile"));
    this.updateHudRobotXpSlot(fieldSlot, this.getRobotSubsystemXpInfo("field"));

    if (this.textures.exists(robotTextureKey)) {
      robotSlot.icon.setVisible(true);
      this.setHudIconToFit(robotSlot.icon, robotTextureKey, this.hudRobotPanel.robotIconMaxSize);
    } else {
      robotSlot.icon.setVisible(false);
    }

    if (this.textures.exists(fieldTextureKey)) {
      fieldSlot.icon.setVisible(true);
      this.setHudIconToFit(fieldSlot.icon, fieldTextureKey, this.hudRobotPanel.fieldIconMaxSize);
    } else {
      fieldSlot.icon.setVisible(false);
    }
  }

  updateHudRobotXpSlot(slot, info) {
    if (!slot?.xpFill || !slot?.xpText || !info) {
      return;
    }

    if (info.isMaxed) {
      slot.xpText.setText("XP MAX");
    } else {
      slot.xpText.setText(`XP ${info.xp}/${info.required}`);
    }
    this.setHudBarFill(slot.xpFill, info.ratio);
  }

  countActiveSpecialItems(effectType) {
    return this.specialItems.getChildren().filter((item) => {
      return item.active && item.itemDefinition?.effectType === effectType;
    }).length;
  }

  updateMinimap(force = false) {
    if (!this.minimapGraphics || !this.minimapConfig) {
      return;
    }
    if (!force && this.time.now < this.nextMinimapRefreshAt) {
      return;
    }

    this.nextMinimapRefreshAt = this.time.now + 160;
    const { x, y, width, height } = this.minimapConfig;
    const mapBounds = this.getStagePlayBounds(this.currentStage) || {
      left: 0,
      top: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      centerX: WORLD_WIDTH / 2,
      centerY: WORLD_HEIGHT / 2
    };
    const mapX = (worldX) => x + Phaser.Math.Clamp((worldX - mapBounds.left) / mapBounds.width, 0, 1) * width;
    const mapY = (worldY) => y + Phaser.Math.Clamp((worldY - mapBounds.top) / mapBounds.height, 0, 1) * height;
    const graphics = this.minimapGraphics;
    const layout = this.currentStage?.layout || {};
    const centerX = mapX(this.currentStage?.worldCenter?.x || mapBounds.centerX);
    const centerY = mapY(this.currentStage?.worldCenter?.y || mapBounds.centerY);
    const roadHalfWidth = ((layout.roadHalfWidth || 704) / mapBounds.width) * width;
    const roadHalfHeight = ((layout.roadHalfWidth || 704) / mapBounds.height) * height;

    graphics.clear();
    graphics.fillStyle(0x05080a, 0.78);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(0x2d3533, 0.82);
    graphics.fillRect(centerX - roadHalfWidth, y, roadHalfWidth * 2, height);
    graphics.fillRect(x, centerY - roadHalfHeight, width, roadHalfHeight * 2);
    graphics.lineStyle(1, 0xc8d2cf, 0.25);
    graphics.strokeRect(x, y, width, height);
    graphics.lineStyle(2, 0xa34048, 0.72);
    graphics.strokeRect(x + 2, y + 2, width - 4, height - 4);
    graphics.lineStyle(1, 0xf2f0de, 0.22);
    graphics.lineBetween(centerX - roadHalfWidth, y, centerX - roadHalfWidth, y + height);
    graphics.lineBetween(centerX + roadHalfWidth, y, centerX + roadHalfWidth, y + height);
    graphics.lineBetween(x, centerY - roadHalfHeight, x + width, centerY - roadHalfHeight);
    graphics.lineBetween(x, centerY + roadHalfHeight, x + width, centerY + roadHalfHeight);

    graphics.fillStyle(0x70866c, 0.35);
    (this.stageObstacleInstances || []).forEach((obstacle, index) => {
      if (obstacle.type === "playBoundsWall") {
        return;
      }
      if (index % 3 !== 0) {
        return;
      }
      graphics.fillRect(mapX(obstacle.x) - 1, mapY(obstacle.y) - 1, 2, 2);
    });

    graphics.fillStyle(0xd45252, 0.82);
    this.enemies.getChildren().slice(0, 80).forEach((enemy) => {
      if (enemy.active && !enemy.isBoss) {
        graphics.fillCircle(mapX(enemy.x), mapY(enemy.y), enemy.isElite ? 2.2 : 1.4);
      }
    });

    const activeBosses = this.enemies.getChildren().filter((enemy) => enemy.active && enemy.isBoss && !enemy.isDying);
    activeBosses.forEach((boss) => {
      const bossX = mapX(boss.x);
      const bossY = mapY(boss.y);
      const pulse = (Math.sin(this.time.now / 210) + 1) * 0.5;
      const radius = 5.6 + pulse * 1.2;

      graphics.lineStyle(2, 0xffffff, 0.9);
      graphics.strokeCircle(bossX, bossY, radius + 2.2);
      graphics.fillStyle(0xff3fe6, 0.95);
      graphics.fillTriangle(bossX, bossY - radius, bossX - radius, bossY, bossX, bossY + radius);
      graphics.fillTriangle(bossX, bossY - radius, bossX + radius, bossY, bossX, bossY + radius);
      graphics.fillStyle(0xffffff, 0.95);
      graphics.fillCircle(bossX, bossY, 1.8);
      graphics.lineStyle(1, 0xff3fe6, 0.9);
      graphics.lineBetween(bossX - radius - 3, bossY, bossX - radius - 1, bossY);
      graphics.lineBetween(bossX + radius + 1, bossY, bossX + radius + 3, bossY);
      graphics.lineBetween(bossX, bossY - radius - 3, bossX, bossY - radius - 1);
      graphics.lineBetween(bossX, bossY + radius + 1, bossX, bossY + radius + 3);
    });

    graphics.fillStyle(0xeef8ff, 1);
    graphics.fillTriangle(
      mapX(this.playerHitbox.x),
      mapY(this.playerHitbox.y) - 4,
      mapX(this.playerHitbox.x) - 4,
      mapY(this.playerHitbox.y) + 4,
      mapX(this.playerHitbox.x) + 4,
      mapY(this.playerHitbox.y) + 4
    );
  }

  createOverlay() {
    this.overlayBackdrop = this.registerUiObject(
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02060b, 0.76)
        .setScrollFactor(0)
        .setDepth(900)
        .setVisible(false)
    );

    this.overlayPanel = this.add
      .rectangle(0, 0, 560, 440, 0x081320, 0.96)
      .setStrokeStyle(2, 0x6fcfff, 0.35);

    this.overlayTitle = this.add.text(0, -156, "", {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "34px",
      color: "#ecf7ff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.overlayBody = this.add.text(0, -110, "", {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "18px",
      color: "#9ab7cc",
      align: "center"
    }).setOrigin(0.5);

    this.overlayContainer = this.registerUiObject(
      this.add
        .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
          this.overlayPanel,
          this.overlayTitle,
          this.overlayBody
        ])
        .setScrollFactor(0)
        .setDepth(901)
        .setVisible(false)
    );

    this.overlayButtons = [];
    this.overlayActions = [];
    this.input.off("pointerup", this.handleOverlayPointerUp, this);
    this.input.on("pointerup", this.handleOverlayPointerUp, this);
  }

  configureOverlayPanel(width, height) {
    this.overlayPanel.setDisplaySize(width, height);
    this.overlayPanel.setSize(width, height);
  }

  addOverlayChild(object) {
    this.overlayContainer.add(object);
    this.overlayButtons.push(object);
    return object;
  }

  addOverlayAction(panel, onSelect, handlesOwnFlow = true) {
    this.overlayActions.push({ panel, onSelect, handlesOwnFlow });
  }

  createOverlayText(x, y, text, options = {}) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: options.fontSize ?? "16px",
      color: options.color ?? HUD_STYLE.text,
      fontStyle: options.fontStyle ?? "",
      align: options.align ?? "left",
      lineSpacing: options.lineSpacing ?? 0,
      wordWrap: options.wordWrap
    });

    if (options.origin) {
      label.setOrigin(options.origin.x, options.origin.y);
    }

    return this.addOverlayChild(label);
  }

  showPreGameShop(message = "") {
    this.shopActive = true;
    this.shopStatusMessage = message || "";
    this.levelUpActive = false;
    this.physics.world.pause();

    this.clearOverlayButtons();
    this.configureOverlayPanel(1160, 650);
    this.overlayPanel
      .setFillStyle(0x081320, 0.97)
      .setStrokeStyle(2, 0x6fcfff, 0.35);
    this.overlayTitle
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "32px",
        color: "#ecf7ff",
        fontStyle: "bold",
        align: "left"
      })
      .setOrigin(0, 0.5)
      .setPosition(-530, -286)
      .setText("Opening Shop");
    this.overlayBody
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "16px",
        color: this.shopStatusMessage ? "#f3c06b" : "#9ab7cc",
        align: "left"
      })
      .setOrigin(0, 0.5)
      .setPosition(-530, -248)
      .setText(this.shopStatusMessage || "ショップ準備完了");

    const coinIconKey = this.textures.exists(ITEM_IMAGE_ASSETS.coin.textureKey)
      ? ITEM_IMAGE_ASSETS.coin.textureKey
      : "rare-token";
    this.addOverlayChild(
      this.add
        .rectangle(430, -284, 250, 44, 0x0c1724, 0.92)
        .setStrokeStyle(1, 0xf0c463, 0.45)
    );
    this.addOverlayChild(
      this.add
        .image(328, -284, coinIconKey)
        .setDisplaySize(28, 28)
    );
    this.createOverlayText(350, -297, this.normalizeCoinAmount(this.coins).toLocaleString(), {
      fontSize: "26px",
      color: "#ecf7ff",
      fontStyle: "bold"
    });

    this.createOverlayText(-530, -210, "CD SHOP", {
      fontSize: "15px",
      color: "#f0c463",
      fontStyle: "bold"
    });
    this.createOverlayText(210, -210, "UPGRADES", {
      fontSize: "15px",
      color: "#f0c463",
      fontStyle: "bold"
    });

    this.renderCdShopGrid(-530, -182);
    this.renderPermanentUpgradeCards(210, -182);

    const selectedCd = this.getSelectedCdDefinition();
    this.createOverlayText(-530, 258, `BGM  ${selectedCd?.title || "NONE"}`, {
      fontSize: "18px",
      color: "#ecf7ff",
      fontStyle: "bold"
    });

    this.createShopButton(392, 280, 318, 62, "GAME START", "開始前強化へ", () => {
      this.startGameFromShop();
    }, 0x174766, 0x236b92);

    this.overlayBackdrop.setVisible(true);
    this.overlayContainer.setVisible(true);
  }

  renderCdShopGrid(originX, originY) {
    const cardWidth = 124;
    const cardHeight = 166;
    const gap = 12;
    const slots = Array.from({ length: CD_SHOP_SLOT_COUNT }, (_, index) => CD_CATALOG[index] || null);

    slots.forEach((cd, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = originX + column * (cardWidth + gap);
      const y = originY + row * (cardHeight + gap);
      this.createCdShopCard(cd, index, x, y, cardWidth, cardHeight);
    });
  }

  createCdShopCard(cd, index, x, y, width, height) {
    const owned = Boolean(cd && this.isCdOwned(cd.id));
    const selected = Boolean(cd && this.shopState.selectedCdId === cd.id);
    const enabled = Boolean(cd);
    const fill = selected ? 0x1c3147 : (enabled ? 0x101b2a : 0x070c12);
    const stroke = selected ? 0xf0c463 : 0x6fcfff;
    const panel = this.addOverlayChild(
      this.add
        .rectangle(x, y, width, height, fill, enabled ? 0.94 : 0.72)
        .setOrigin(0, 0)
        .setStrokeStyle(selected ? 2 : 1, stroke, selected ? 0.72 : 0.24)
    );

    if (enabled) {
      panel.setInteractive({ useHandCursor: true });
      panel.on("pointerover", () => {
        panel.setFillStyle(selected ? 0x263e59 : 0x182940, 0.98);
      });
      panel.on("pointerout", () => {
        panel.setFillStyle(fill, enabled ? 0.94 : 0.72);
      });
      this.addOverlayAction(panel, () => {
        if (owned) {
          this.selectCd(cd.id);
        } else {
          this.purchaseCd(cd.id);
        }
      });
    }

    const fallbackLockedKey = CD_CATALOG[0]?.lockedJacketTextureKey;
    const imageKey = cd
      ? (owned ? cd.jacketTextureKey : (cd.lockedJacketTextureKey || cd.jacketTextureKey))
      : (this.textures.exists(fallbackLockedKey) ? fallbackLockedKey : "cd-placeholder-slot");
    const image = this.addOverlayChild(
      this.add
        .image(x + width / 2, y + 55, imageKey)
        .setDisplaySize(96, 96)
        .setAlpha(enabled ? 1 : 0.42)
    );

    if (!owned) {
      this.addOverlayChild(
        this.add
          .rectangle(x + width / 2, y + 55, 96, 96, 0x02060b, enabled ? 0.22 : 0.52)
      );
      image.setTint(0x9f92d8);
    }

    const title = cd?.title || `CD ${String(index + 1).padStart(2, "0")}`;
    const subtitle = cd
      ? (owned ? cd.subtitle : "LOCKED")
      : "COMING SOON";
    const actionLabel = !cd
      ? "SOON"
      : (selected ? "SELECTED" : (owned ? "SELECT" : `BUY ${this.normalizeCoinAmount(cd.price).toLocaleString()} C`));

    this.createOverlayText(x + 10, y + 110, title, {
      fontSize: "14px",
      color: enabled ? "#ecf7ff" : "#617484",
      fontStyle: "bold",
      wordWrap: { width: width - 20 }
    });
    this.createOverlayText(x + 10, y + 130, subtitle, {
      fontSize: "10px",
      color: enabled ? "#9ab7cc" : "#566875",
      wordWrap: { width: width - 20 }
    });
    this.createOverlayText(x + width / 2, y + height - 20, actionLabel, {
      fontSize: "12px",
      color: selected ? "#f0c463" : (enabled ? "#ecf7ff" : "#566875"),
      fontStyle: "bold",
      align: "center",
      origin: { x: 0.5, y: 0.5 }
    });
  }

  renderPermanentUpgradeCards(originX, originY) {
    Object.values(SHOP_UPGRADE_DEFINITIONS).forEach((definition, index) => {
      this.createPermanentUpgradeCard(definition, originX, originY + index * 128, 360, 110);
    });
  }

  createPermanentUpgradeCard(definition, x, y, width, height) {
    const level = this.getPermanentUpgradeLevel(definition.id);
    const cost = this.getPermanentUpgradeCost(definition.id);
    const isMaxed = cost === null;
    const panel = this.addOverlayChild(
      this.add
        .rectangle(x, y, width, height, 0x101b2a, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(1, definition.accent, isMaxed ? 0.64 : 0.34)
    );

    panel.setInteractive({ useHandCursor: !isMaxed });
    panel.on("pointerover", () => {
      panel.setFillStyle(isMaxed ? 0x101b2a : 0x182940, 0.98);
    });
    panel.on("pointerout", () => {
      panel.setFillStyle(0x101b2a, 0.94);
    });
    this.addOverlayAction(panel, () => {
      this.purchasePermanentUpgrade(definition.id);
    });

    this.createOverlayText(x + 18, y + 14, definition.title, {
      fontSize: "20px",
      color: "#ecf7ff",
      fontStyle: "bold"
    });
    this.createOverlayText(x + width - 18, y + 16, `Lv.${level}/${definition.maxLevel}`, {
      fontSize: "16px",
      color: "#f0c463",
      fontStyle: "bold",
      align: "right",
      origin: { x: 1, y: 0 }
    });
    this.createOverlayText(x + 18, y + 43, definition.description, {
      fontSize: "14px",
      color: "#9ab7cc"
    });
    this.createOverlayText(x + 18, y + 70, this.getPermanentUpgradeEffectText(definition.id), {
      fontSize: "16px",
      color: "#ecf7ff",
      fontStyle: "bold"
    });
    this.createOverlayText(x + width - 18, y + 70, isMaxed ? "MAX" : `${cost.toLocaleString()} C`, {
      fontSize: "18px",
      color: isMaxed ? "#66d25f" : "#ecf7ff",
      fontStyle: "bold",
      align: "right",
      origin: { x: 1, y: 0 }
    });
  }

  createShopButton(centerX, centerY, width, height, title, description, onSelect, fill, hoverFill) {
    const panel = this.addOverlayChild(
      this.add
        .rectangle(centerX, centerY, width, height, fill, 0.96)
        .setStrokeStyle(2, 0x6fcfff, 0.48)
        .setInteractive({ useHandCursor: true })
    );

    panel.on("pointerover", () => {
      panel.setFillStyle(hoverFill, 0.98);
    });
    panel.on("pointerout", () => {
      panel.setFillStyle(fill, 0.96);
    });
    this.addOverlayAction(panel, onSelect);

    this.createOverlayText(centerX, centerY - 14, title, {
      fontSize: "24px",
      color: "#ecf7ff",
      fontStyle: "bold",
      align: "center",
      origin: { x: 0.5, y: 0.5 }
    });
    this.createOverlayText(centerX, centerY + 16, description, {
      fontSize: "13px",
      color: "#b8d4e8",
      align: "center",
      origin: { x: 0.5, y: 0.5 }
    });

    return panel;
  }

  startGameFromShop() {
    this.shopActive = false;
    this.shopStatusMessage = "";
    this.hideOverlay();
    this.playSelectedBgm();
    this.beginStartingUpgradeDraft();
    if (!this.levelUpActive) {
      this.physics.world.resume();
    }
  }

  configureCameras() {
    this.worldCamera = this.cameras.main;
    this.worldCamera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.worldCamera.setZoom(WORLD_CAMERA_ZOOM);

    if (this.uiContainer) {
      this.uiContainer.destroy();
    }

    const uiOffsetX = GAME_WIDTH * 0.5 * (1 - 1 / WORLD_CAMERA_ZOOM);
    const uiOffsetY = GAME_HEIGHT * 0.5 * (1 - 1 / WORLD_CAMERA_ZOOM);

    this.uiContainer = this.add
      .container(uiOffsetX, uiOffsetY)
      .setScrollFactor(0)
      .setDepth(10000)
      .setScale(1 / WORLD_CAMERA_ZOOM);
    this.uiContainer.add(this.uiObjects || []);
  }

  createColliders() {
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHit, null, this);
    this.physics.add.overlap(this.robotMissiles, this.enemies, this.handleRobotMissileHit, null, this);
    this.physics.add.overlap(this.playerHitbox, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.playerHitbox, this.enemyProjectiles, this.handleEnemyProjectileHit, null, this);
    this.physics.add.overlap(this.playerHitbox, this.xpOrbs, this.handleXpPickup, null, this);
    this.physics.add.overlap(this.playerHitbox, this.rareItems, this.handleRareItemPickup, null, this);
    this.physics.add.overlap(this.playerHitbox, this.specialItems, this.handleSpecialItemPickup, null, this);
    this.physics.add.overlap(this.playerHitbox, this.robotItems, this.handleRobotItemPickup, null, this);

    if (this.stageObstacleBodies) {
      this.physics.add.collider(this.playerHitbox, this.stageObstacleBodies);
      this.physics.add.collider(this.enemies, this.stageObstacleBodies);
    }
  }

  update(time, delta) {
    this.syncPlayerVisuals();
    this.updateSkills(delta);
    this.updateRobotCompanion(delta);
    this.updateHud();

    if (this.gameOver) {
      if (!this.rankingNameEntryActive && (
        Phaser.Input.Keyboard.JustDown(this.keys.restart) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter)
      )) {
        this.scene.restart();
      }
      return;
    }

    if (this.shopActive) {
      return;
    }

    if (this.levelUpActive) {
      return;
    }

    this.survivalTime += delta;
    this.enemySpawnTimer += delta;
    this.shootTimer += delta;
    this.updateBossSpawns();

    this.updatePlayerMovement(delta);
    this.updateEnemies();
    this.updateSupportAttacks(delta);
    this.updateGensoKnightsEvent(delta);
    this.applySkillEnemyForces();
    this.updateEnemyStatusVisuals();
    this.updateXpOrbs(delta);
    this.updateRareItems(delta);
    this.updateSpecialItems(delta);
    this.updateRobotItems(delta);
    this.updateRobotCombat(time, delta);
    this.updateRobotHealing(delta);
    this.updateBullets(time);
    this.updateRobotMissiles(time, delta);
    this.updateEnemyProjectiles(time);

    while (this.enemySpawnTimer >= this.getEnemySpawnInterval()) {
      this.enemySpawnTimer -= this.getEnemySpawnInterval();
      this.spawnEnemyWave();
    }

    if (this.shootTimer >= this.stats.fireInterval) {
      this.shootTimer = 0;
      this.fireAtClosestEnemy(time);
    }
  }

  isDashKeyDown() {
    return Boolean(this.keys?.dash?.isDown || this.keys?.dashAlt?.isDown);
  }

  updatePlayerDashState(delta, isMoving) {
    if (!this.stats) {
      this.isDashing = false;
      return false;
    }

    const dashKeyDown = this.isDashKeyDown();
    if (!dashKeyDown) {
      this.dashLockedUntilRelease = false;
    }

    const stamina = this.stats.stamina ?? this.stats.maxStamina ?? 0;
    const canStartDash = stamina >= DASH_MIN_START_STAMINA || this.isDashing;
    const shouldDash = dashKeyDown && isMoving && !this.dashLockedUntilRelease && canStartDash && stamina > 0;

    if (shouldDash) {
      const nextStamina = Math.max(0, stamina - DASH_STAMINA_DRAIN_PER_SECOND * (delta / 1000));
      this.stats.stamina = nextStamina;
      this.isDashing = nextStamina > 0;
      this.dashRegenBlockedUntil = this.time.now + DASH_STAMINA_REGEN_DELAY_MS;

      if (nextStamina <= 0) {
        this.dashLockedUntilRelease = true;
        this.isDashing = false;
      }
    } else {
      this.isDashing = false;
      if (this.time.now >= this.dashRegenBlockedUntil) {
        this.stats.stamina = Math.min(
          this.stats.maxStamina,
          stamina + DASH_STAMINA_REGEN_PER_SECOND * (delta / 1000)
        );
      }
    }

    this.updateDashStaminaGauge();
    return this.isDashing;
  }

  updatePlayerMovement(delta) {
    const moveX = (this.keys.left.isDown || this.keys.a.isDown ? -1 : 0) +
      (this.keys.right.isDown || this.keys.d.isDown ? 1 : 0);
    const moveY = (this.keys.up.isDown || this.keys.w.isDown ? -1 : 0) +
      (this.keys.down.isDown || this.keys.s.isDown ? 1 : 0);

    const direction = new Phaser.Math.Vector2(moveX, moveY);
    const isMoving = direction.lengthSq() > 0;
    const isDashing = this.updatePlayerDashState(delta, isMoving);
    if (isMoving) {
      const moveSpeed = this.stats.moveSpeed * (isDashing ? DASH_SPEED_MULTIPLIER : 1);
      direction.normalize().scale(moveSpeed);
      this.playerAimAngle = Math.atan2(direction.y, direction.x);
    }

    this.playerHitbox.body.setVelocity(direction.x, direction.y);

    if (direction.x < 0) {
      this.playerSprite.setFlipX(true);
    } else if (direction.x > 0) {
      this.playerSprite.setFlipX(false);
    }

    if (isMoving) {
      this.walkFrameTimer += delta;
      const frameIndex = Math.floor(this.walkFrameTimer / (isDashing ? 82 : 120)) % 2;
      this.playerSprite.setTexture(frameIndex === 0 ? "player-walk-a" : "player-walk-b");
    } else {
      this.walkFrameTimer = 0;
      this.playerSprite.setTexture("player-idle");
    }

    if (this.time.now < this.invincibleUntil) {
      this.playerSprite.alpha = Math.floor(this.time.now / 70) % 2 === 0 ? 0.42 : 1;
    } else {
      this.playerSprite.alpha = 1;
    }
  }

  syncPlayerVisuals() {
    this.playerSprite.setPosition(this.playerHitbox.x, this.playerHitbox.y + PLAYER_SPRITE_OFFSET_Y);
    this.playerShadow.setPosition(this.playerHitbox.x, this.playerHitbox.y + PLAYER_SHADOW_OFFSET_Y);
  }

  updateRobotCompanion(delta) {
    if (!this.robotState || !this.robotSprite) {
      return;
    }

    this.robotState.bobTimer += delta / 360;
    const aimAngle = this.playerAimAngle || 0;
    const backAngle = aimAngle + Math.PI;
    const sideAngle = aimAngle - Math.PI * 0.5;
    const desiredX = this.playerHitbox.x + Math.cos(backAngle) * 78 + Math.cos(sideAngle) * 26;
    const desiredY = this.playerHitbox.y - 54 + Math.sin(backAngle) * 42 + Math.sin(sideAngle) * 14;
    const deltaX = desiredX - this.robotState.x;
    const deltaY = desiredY - this.robotState.y;
    const distance = Math.hypot(deltaX, deltaY);
    const maxStep = 460 * (delta / 1000);
    const moveRatio = distance > 0 ? Math.min(1, maxStep / distance) : 1;
    const bob = Math.sin(this.robotState.bobTimer) * 5;

    this.robotState.x += deltaX * moveRatio;
    this.robotState.y += deltaY * moveRatio;
    this.robotSprite
      .setPosition(this.robotState.x, this.robotState.y + bob)
      .setFlipX(this.robotState.x < this.playerHitbox.x)
      .setAngle(Math.sin(this.robotState.bobTimer * 0.7) * 2.2);

    this.robotShadow?.setPosition(this.robotState.x, this.robotState.y + 44);
    this.robotMuzzleGlow?.setPosition(this.robotState.x, this.robotState.y + bob + 4);
    this.updateRobotRecoveryFieldVisual(delta);
  }

  updateRobotRecoveryFieldVisual(delta) {
    if (!this.robotRecoveryField || !this.robotState) {
      return;
    }

    const pulse = (Math.sin(this.robotState.bobTimer * 1.3) + 1) * 0.5;
    const radius = this.getRobotRecoveryRadius();
    this.robotRecoveryField
      .setPosition(this.playerHitbox.x, this.playerHitbox.y + 8)
      .setAlpha(0.17 + pulse * 0.08)
      .setAngle(this.robotRecoveryField.angle + 0.18 * (delta / 16.6667));
    this.scaleWorldImageToFit(this.robotRecoveryField, radius * 2);
  }

  getRobotRecoveryRadius() {
    return 116 + (this.robotState?.healLevel || 1) * 8;
  }

  updateSkills(delta) {
    Object.values(this.playerSkills).forEach((skillState) => {
      const stageData = skillState.currentStage;
      skillState.orbitAngle = Phaser.Math.Angle.Wrap(
        skillState.orbitAngle + (stageData.rotationSpeed || Math.max(0.8, stageData.spinSpeed * 0.32)) * (delta / 1000)
      );
      skillState.pulseTimer += (stageData.pulseSpeed || 0) * (delta / 1000);

      if (skillState.definition.behavior === "screenHoming") {
        this.updateScreenHomingSkill(skillState, stageData, delta);
      } else if (skillState.definition.behavior === "directionalDash") {
        this.updateDirectionalDashSkill(skillState, stageData, delta);
      } else {
        this.updateOrbitSkill(skillState, stageData, delta);
      }
    });
  }

  updateOrbitSkill(skillState, stageData, delta) {
    skillState.orbitals.forEach((orbital) => {
      const angle = skillState.orbitAngle + orbital.angleOffset;
      const orbitRadius = this.getSkillOrbitRadius(skillState, stageData, orbital);
      const x = this.playerHitbox.x + Math.cos(angle) * orbitRadius;
      const y = this.playerHitbox.y - 6 + Math.sin(angle) * orbitRadius * 0.74;
      const pulseProgress = this.getOrbitalPulseProgress(skillState, stageData, orbital);

      this.syncSkillOrbitalVisuals(skillState, stageData, orbital, x, y, delta, pulseProgress);
    });
  }

  getSkillOrbitRadius(skillState, stageData, orbital) {
    const baseRadius = stageData.orbitRadius || 112;
    const pulseAmount = stageData.orbitRadiusPulseAmount || 0;
    if (pulseAmount <= 0) {
      return baseRadius;
    }

    return baseRadius + Math.sin(skillState.pulseTimer + orbital.pulseOffset) * pulseAmount;
  }

  updateScreenHomingSkill(skillState, stageData, delta) {
    const bounds = this.getSkillViewportBounds(stageData.screenPadding || 84);
    const targets = this.findClosestEnemies(Math.max(skillState.orbitals.length, 1));

    skillState.orbitals.forEach((orbital, index) => {
      const target = targets[index % Math.max(targets.length, 1)] || null;
      let desiredX = this.playerHitbox.x;
      let desiredY = this.playerHitbox.y - 28;

      if (target) {
        desiredX = target.x;
        desiredY = target.y;
      } else {
        const idleAngle = skillState.orbitAngle + orbital.angleOffset;
        desiredX = this.playerHitbox.x + Math.cos(idleAngle) * (stageData.idleRadius || 140);
        desiredY = this.playerHitbox.y - 22 + Math.sin(idleAngle) * (stageData.idleRadius || 140) * 0.62;
      }

      const clampedPoint = this.clampPointToBounds(desiredX, desiredY, bounds);
      const deltaX = clampedPoint.x - orbital.hitbox.x;
      const deltaY = clampedPoint.y - orbital.hitbox.y;
      const distance = Math.hypot(deltaX, deltaY);
      const maxStep = stageData.moveSpeed * (delta / 1000);
      const moveRatio = distance > 0 ? Math.min(1, maxStep / distance) : 1;
      const x = orbital.hitbox.x + deltaX * moveRatio;
      const y = orbital.hitbox.y + deltaY * moveRatio;
      const pulseProgress = this.getOrbitalPulseProgress(skillState, stageData, orbital);
      const travelDistance = Math.hypot(x - orbital.hitbox.x, y - orbital.hitbox.y);
      const movementAngle = travelDistance > 0 ? Math.atan2(y - orbital.hitbox.y, x - orbital.hitbox.x) : 0;
      const speedRatio = stageData.moveSpeed > 0 ? Phaser.Math.Clamp((travelDistance / Math.max(delta / 1000, 0.001)) / stageData.moveSpeed, 0, 1) : 0;

      orbital.trailTimer += delta;
      if (stageData.trailIntervalMs && orbital.trailTimer >= stageData.trailIntervalMs) {
        orbital.trailTimer = 0;
        this.spawnTornadoTrailEffect(x, y, stageData, pulseProgress, movementAngle, speedRatio);
      }

      this.syncSkillOrbitalVisuals(skillState, stageData, orbital, x, y, delta, pulseProgress);
    });
  }

  updateDirectionalDashSkill(skillState, stageData, delta) {
    skillState.orbitals.forEach((orbital) => {
      if (!orbital.dashActive) {
        orbital.dashCooldownTimer = (orbital.dashCooldownTimer || 0) + delta;
        orbital.hitbox.body.enable = false;
        orbital.sprite.setVisible(false);
        orbital.aura.setVisible(false);

        if (orbital.dashCooldownTimer >= (stageData.cooldownMs || 1000)) {
          this.startDirectionalDash(orbital, stageData);
        }
        return;
      }

      const dashDuration = Math.max(1, stageData.dashDurationMs || 520);
      orbital.dashElapsed += delta;
      orbital.frameTimer += delta;

      const progress = Phaser.Math.Clamp(orbital.dashElapsed / dashDuration, 0, 1);
      const easedProgress = Phaser.Math.Easing.Sine.InOut(progress);
      const distance = stageData.dashDistance || 360;
      const jumpOffset = -Math.sin(progress * Math.PI) * (stageData.jumpHeight || 64);
      const x = orbital.dashStartX + Math.cos(orbital.dashAngle) * distance * easedProgress;
      const y = orbital.dashStartY + Math.sin(orbital.dashAngle) * distance * easedProgress + jumpOffset;
      const pulseProgress = this.getOrbitalPulseProgress(skillState, stageData, orbital);

      orbital.trailTimer += delta;
      if (stageData.trailIntervalMs && orbital.trailTimer >= stageData.trailIntervalMs) {
        orbital.trailTimer = 0;
        this.spawnTornadoTrailEffect(x, y, stageData, pulseProgress, orbital.dashAngle, 0.95);
      }

      orbital.hitbox.body.enable = true;
      orbital.sprite.setVisible(true);
      this.syncSkillOrbitalVisuals(skillState, stageData, orbital, x, y, delta, pulseProgress);

      if (progress >= 1) {
        this.finishDirectionalDash(orbital, stageData, x, y);
      }
    });
  }

  startDirectionalDash(orbital, stageData) {
    const target = this.findClosestEnemy();
    const startX = this.playerHitbox.x;
    const startY = this.playerHitbox.y - 18;
    const angle = target
      ? Phaser.Math.Angle.Between(startX, startY, target.x, target.y)
      : (this.playerAimAngle || 0);

    orbital.dashActive = true;
    orbital.dashElapsed = 0;
    orbital.dashCooldownTimer = 0;
    orbital.dashStartX = startX;
    orbital.dashStartY = startY;
    orbital.dashAngle = angle;
    orbital.frameTimer = 0;
    orbital.trailTimer = 0;
    orbital.hitbox.damageCooldowns = new WeakMap();
    orbital.hitbox.body.enable = true;
    orbital.sprite.setTexture(this.getSkillStageTextureKey(stageData));
    orbital.sprite.setVisible(true);

    const launchGlow = this.add
      .image(startX, startY + 10, "skill-hit-ring")
      .setDepth(18)
      .setScale(stageData.displayScale * 1.05, stageData.displayScale * 0.36)
      .setTint(stageData.effectTint || 0x8ee9ff)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add(launchGlow);
    this.tweens.add({
      targets: launchGlow,
      scaleX: launchGlow.scaleX * 1.85,
      scaleY: launchGlow.scaleY * 1.55,
      alpha: 0,
      duration: 180,
      ease: "Quad.Out",
      onComplete: () => {
        launchGlow.destroy();
      }
    });
  }

  finishDirectionalDash(orbital, stageData, x, y) {
    orbital.dashActive = false;
    orbital.dashCooldownTimer = 0;
    orbital.hitbox.body.enable = false;
    orbital.sprite.setVisible(false);
    orbital.aura.setVisible(false);

    const impactGlow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(20)
      .setScale(stageData.displayScale * 1.42)
      .setTint(stageData.effectTint || 0x8ee9ff)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD);

    const impactSpark = this.add
      .image(x, y, "skill-hit-spark")
      .setDepth(21)
      .setRotation(orbital.dashAngle)
      .setScale(stageData.displayScale * 1.1, stageData.displayScale * 0.34)
      .setTint(0xffffff)
      .setAlpha(0.94)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.applyDirectionalDashImpact(x, y, stageData);
    const impactRepeatCount = Math.max(1, stageData.impactRepeatCount || 1);
    for (let repeatIndex = 1; repeatIndex < impactRepeatCount; repeatIndex += 1) {
      this.time.delayedCall((stageData.impactRepeatDelayMs || 120) * repeatIndex, () => {
        this.applyDirectionalDashImpact(x, y, stageData);
      });
    }
    this.skillEffectsLayer.add([impactGlow, impactSpark]);
    this.tweens.add({
      targets: [impactGlow, impactSpark],
      alpha: 0,
      duration: 180,
      ease: "Quad.Out",
      onComplete: () => {
        impactGlow.destroy();
        impactSpark.destroy();
      }
    });
  }

  applyDirectionalDashImpact(x, y, stageData) {
    const radius = stageData.impactRadius || 0;
    if (radius <= 0) {
      return;
    }

    const damage = stageData.impactDamage || Math.max(1, Math.ceil((stageData.damage || 1) * 0.5));
    let hitCount = 0;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        return;
      }

      hitCount += 1;
      this.applyDamageToEnemy(enemy, damage, stageData.damageTint || 0xffffff, {
        sourceX: x,
        sourceY: y,
        force: stageData.impactForce || 240,
        recoverMs: 135
      });
    });

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(20)
      .setScale(Math.max(0.7, radius / 58))
      .setTint(stageData.effectTint || 0x92eaff)
      .setAlpha(0.64)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add(ring);
    this.tweens.add({
      targets: ring,
      scaleX: ring.scaleX * 1.35,
      scaleY: ring.scaleY * 1.35,
      alpha: 0,
      duration: 220,
      ease: "Quad.Out",
      onComplete: () => {
        ring.destroy();
      }
    });

    if (hitCount > 0) {
      this.cameras.main.shake(90, 0.0014);
    }
  }

  syncSkillOrbitalVisuals(skillState, stageData, orbital, x, y, delta, pulseProgress) {
    const displayScale = this.getOrbitalDisplayScale(stageData, pulseProgress);
    const spinMultiplier = stageData.pulseSpeed ? 0.94 + pulseProgress * 0.28 : 1;
    const keepHorizontal = skillState.definition.behavior === "screenHoming";
    const alignToDash = skillState.definition.behavior === "directionalDash" && Number.isFinite(orbital.dashAngle);

    orbital.hitbox.setPosition(x, y);
    orbital.hitbox.body.updateFromGameObject();
    orbital.aura.setPosition(x, y);
    orbital.sprite.setPosition(x, y);
    orbital.spinAngle += stageData.spinSpeed * spinMultiplier * (delta / 1000);
    orbital.frameTimer = (orbital.frameTimer || 0) + (alignToDash ? 0 : delta);
    orbital.sprite.setTexture(this.getSkillOrbitalFrameTextureKey(stageData, orbital));
    if (alignToDash && stageData.keepUpright) {
      orbital.sprite.rotation = Math.sin(orbital.dashAngle) * (stageData.maxTilt ?? 0.16);
      orbital.sprite.setFlipX(Math.cos(orbital.dashAngle) < 0);
    } else {
      orbital.sprite.rotation = alignToDash ? orbital.dashAngle : (keepHorizontal ? 0 : orbital.spinAngle);
      orbital.sprite.setFlipX(false);
    }
    orbital.sprite.setScale(displayScale);
    orbital.sprite.setAlpha(stageData.pulseSpeed ? 0.76 + pulseProgress * 0.24 : 0.94);

    if (stageData.pulseSpeed || skillState.definition.behavior === "screenHoming") {
      orbital.aura.setVisible(true);
      orbital.aura.setScale(displayScale * (1.6 + pulseProgress * 0.38));
      orbital.aura.setAlpha((stageData.pulseSpeed ? 0.12 : 0.08) + pulseProgress * 0.24);
      orbital.aura.rotation = -orbital.spinAngle * 0.32;
    } else {
      orbital.aura.setVisible(false);
      orbital.aura.setAlpha(0);
    }
  }

  getOrbitalPulseProgress(skillState, stageData, orbital) {
    if (!stageData.pulseSpeed) {
      return 0;
    }

    return (Math.sin(skillState.pulseTimer + orbital.pulseOffset) + 1) * 0.5;
  }

  getOrbitalDisplayScale(stageData, pulseProgress = 0) {
    const pulseMin = stageData.pulseScaleMin ?? stageData.displayScale;
    const pulseMax = stageData.pulseScaleMax ?? stageData.displayScale;

    if (!stageData.pulseSpeed || Math.abs(pulseMax - pulseMin) < 0.001) {
      return stageData.displayScale;
    }

    return Phaser.Math.Linear(pulseMin, pulseMax, pulseProgress);
  }

  getSkillViewportBounds(padding) {
    const view = this.cameras.main.worldView;
    return {
      left: view.left + padding,
      right: view.right - padding,
      top: view.top + padding,
      bottom: view.bottom - padding
    };
  }

  clampPointToBounds(x, y, bounds) {
    return {
      x: Phaser.Math.Clamp(x, bounds.left, bounds.right),
      y: Phaser.Math.Clamp(y, bounds.top, bounds.bottom)
    };
  }

  constrainEnemyToMovementBounds(enemy) {
    if (!enemy?.body) {
      return;
    }

    const bodyPadding = Math.max(
      8,
      Math.ceil(Math.max(enemy.body.width || 0, enemy.body.height || 0) * 0.5)
    );
    const bounds = this.getStageMovementBounds(this.currentStage, bodyPadding);
    if (!bounds) {
      return;
    }

    const clampedPoint = this.clampPointToBounds(enemy.x, enemy.y, bounds);
    const movedX = Math.abs(clampedPoint.x - enemy.x) > 0.01;
    const movedY = Math.abs(clampedPoint.y - enemy.y) > 0.01;
    if (!movedX && !movedY) {
      return;
    }

    enemy.setPosition(clampedPoint.x, clampedPoint.y);
    enemy.body.updateFromGameObject();
    if (movedX) {
      enemy.body.velocity.x = 0;
    }
    if (movedY) {
      enemy.body.velocity.y = 0;
    }
  }

  spawnTornadoTrailEffect(x, y, stageData, pulseProgress = 0, movementAngle = 0, speedRatio = 0) {
    const trail = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(17)
      .setScale(stageData.displayScale * (1.08 + pulseProgress * 0.28))
      .setTint(stageData.effectTint || 0x9af6cf)
      .setAlpha(0.14 + pulseProgress * 0.12)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add(trail);
    this.tweens.add({
      targets: trail,
      scaleX: trail.scaleX * 1.28,
      scaleY: trail.scaleY * 1.28,
      alpha: 0,
      duration: 220,
      ease: "Quad.Out",
      onComplete: () => {
        trail.destroy();
      }
    });

    const streakCount = speedRatio > 0.55 ? 2 : 1;
    for (let index = 0; index < streakCount; index += 1) {
      const offset = index === 0 ? 0 : (index % 2 === 0 ? -1 : 1) * (8 + index * 4);
      const streak = this.add
        .image(
          x + Math.cos(movementAngle + Math.PI * 0.5) * offset,
          y + Math.sin(movementAngle + Math.PI * 0.5) * offset,
          "wind-streak"
        )
        .setDepth(18)
        .setRotation(movementAngle + Math.PI)
        .setScale(0.34 + stageData.displayScale * (1.18 + speedRatio * 0.55))
        .setTint(stageData.effectTint || 0x9af6cf)
        .setAlpha(0.24 + speedRatio * 0.18)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.skillEffectsLayer.add(streak);
      this.tweens.add({
        targets: streak,
        x: streak.x - Math.cos(movementAngle) * (18 + speedRatio * 12),
        y: streak.y - Math.sin(movementAngle) * (18 + speedRatio * 12),
        scaleX: streak.scaleX * 1.15,
        scaleY: streak.scaleY * 0.88,
        alpha: 0,
        duration: 150,
        ease: "Quad.Out",
        onComplete: () => {
          streak.destroy();
        }
      });
    }
  }

  updateEnemies() {
    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      if (this.updateEnemySupportStatusLock(enemy)) {
        this.constrainEnemyToMovementBounds(enemy);
        return;
      }

      if (this.time.now < (enemy.hitRecoverUntil || 0)) {
        this.constrainEnemyToMovementBounds(enemy);
        return;
      }

      const angleToPlayer = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.playerHitbox.x,
        this.playerHitbox.y
      );
      const distanceToPlayer = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.playerHitbox.x,
        this.playerHitbox.y
      );

      switch (enemy.aiBehavior) {
        case "dash":
          this.updateDashEnemy(enemy, angleToPlayer);
          break;
        case "ranged":
          this.updateRangedEnemy(enemy, angleToPlayer, distanceToPlayer);
          break;
        case "bossSpecial":
          this.updateBossSpecialEnemy(enemy, angleToPlayer, distanceToPlayer);
          break;
        default:
          this.physics.velocityFromRotation(angleToPlayer, enemy.moveSpeed, enemy.body.velocity);
          break;
      }

      this.constrainEnemyToMovementBounds(enemy);
    });
  }

  updateEnemySupportStatusLock(enemy) {
    const now = this.time.now;
    const isSleeping = now < (enemy.sleepUntil || 0);
    const isFrozen = now < (enemy.freezeUntil || 0);
    const isTimeStopped = now < (enemy.timeStopUntil || 0);
    const isStunned = now < (enemy.stunUntil || 0);

    if (!isSleeping && !isFrozen && !isTimeStopped && !isStunned) {
      return false;
    }

    enemy.body.setVelocity(0, 0);
    if (enemy.isChargingBeam) {
      this.destroyEnemyBeamTelegraph(enemy);
    }
    if (enemy.isChargingBossAttack || enemy.isBossDashing) {
      this.cancelBossAttack(enemy);
    }
    return true;
  }

  updateDashEnemy(enemy, angleToPlayer) {
    const now = this.time.now;

    if (now >= (enemy.nextDashAt || 0)) {
      enemy.burstUntil = now + (enemy.dashDurationMs || 320);
      enemy.nextDashAt = now + (enemy.dashCooldownMs || 1750);
      enemy.burstAngle = angleToPlayer + Phaser.Math.FloatBetween(-0.12, 0.12);
      enemy.setTintFill(0xffedcf);
      this.time.delayedCall(100, () => {
        if (enemy.active && !enemy.isDying) {
          enemy.clearTint();
          enemy.setTint(enemy.baseTint);
        }
      });
    }

    const isBursting = now < (enemy.burstUntil || 0);
    const speed = isBursting ? enemy.burstSpeed : enemy.moveSpeed;
    const angle = isBursting ? enemy.burstAngle : angleToPlayer;
    this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
  }

  updateRangedEnemy(enemy, angleToPlayer, distanceToPlayer) {
    const preferredRange = enemy.preferredRange || 280;
    const keepAwayRange = enemy.keepAwayRange || preferredRange * 0.72;
    const tolerance = enemy.rangeTolerance || 48;
    const now = this.time.now;

    enemy.setFlipX(this.playerHitbox.x > enemy.x);

    if (enemy.isChargingBeam) {
      enemy.body.setVelocity(0, 0);
      return;
    }

    let moveAngle = angleToPlayer + Math.PI * 0.5 * enemy.strafeDirection;
    let moveSpeed = enemy.strafeSpeed || enemy.moveSpeed * 0.72;

    if (distanceToPlayer < keepAwayRange) {
      moveAngle = angleToPlayer + Math.PI;
      moveSpeed = enemy.moveSpeed;
    } else if (distanceToPlayer > preferredRange + tolerance) {
      moveSpeed *= 0.45;
    } else {
      if (now >= (enemy.nextStrafeFlipAt || 0)) {
        enemy.strafeDirection *= -1;
        enemy.nextStrafeFlipAt = now + Phaser.Math.Between(900, 1600);
      }
    }

    this.physics.velocityFromRotation(moveAngle, moveSpeed, enemy.body.velocity);

    if (
      distanceToPlayer <= (enemy.beamRange || 820) &&
      now >= (enemy.nextAttackAt || 0)
    ) {
      enemy.nextAttackAt = now + Phaser.Math.Between(
        Math.round(enemy.attackIntervalMs * 0.92),
        Math.round(enemy.attackIntervalMs * 1.08)
      );
      this.beginEnemyBeamCharge(enemy, angleToPlayer);
    }
  }

  beginEnemyBeamCharge(enemy, angle) {
    if (!enemy.active || enemy.isDying || enemy.isChargingBeam) {
      return;
    }

    const range = enemy.beamRange || 820;
    const chargeMs = enemy.beamChargeMs || 520;
    const tint = enemy.projectileTint || enemy.beamTint || 0x7df7ff;
    const coreTint = enemy.beamCoreTint || 0xffffff;
    const centerX = enemy.x + Math.cos(angle) * range * 0.5;
    const centerY = enemy.y + Math.sin(angle) * range * 0.5;

    enemy.isChargingBeam = true;
    enemy.beamAimAngle = angle;
    enemy.body.setVelocity(0, 0);

    const warning = this.add
      .rectangle(centerX, centerY, range, 8, tint, 0.2)
      .setRotation(angle)
      .setDepth(17)
      .setBlendMode(Phaser.BlendModes.ADD);
    const sight = this.add
      .rectangle(centerX, centerY, range, 2, coreTint, 0.52)
      .setRotation(angle)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    const chargeGlow = this.add
      .image(enemy.x, enemy.y, "skill-hit-glow")
      .setDepth(18)
      .setScale((enemy.effectScale || 1) * 0.66)
      .setTint(tint)
      .setAlpha(0.46)
      .setBlendMode(Phaser.BlendModes.ADD);

    enemy.beamTelegraphObjects = [warning, sight, chargeGlow];
    enemy.beamChargeId = (enemy.beamChargeId || 0) + 1;
    const beamChargeId = enemy.beamChargeId;
    this.skillEffectsLayer.add(enemy.beamTelegraphObjects);
    this.tweens.add({
      targets: enemy.beamTelegraphObjects,
      alpha: { from: 0.18, to: 0.72 },
      duration: chargeMs,
      ease: "Sine.In"
    });

    enemy.beamChargeEvent = this.time.delayedCall(chargeMs, () => {
      if (!enemy.active || enemy.isDying || !enemy.isChargingBeam || enemy.beamChargeId !== beamChargeId) {
        this.destroyEnemyBeamTelegraph(enemy);
        return;
      }

      const fireAngle = enemy.beamAimAngle ?? Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.playerHitbox.x,
        this.playerHitbox.y
      );
      this.destroyEnemyBeamTelegraph(enemy);
      enemy.isChargingBeam = false;
      this.spawnEnemyBeam(enemy, fireAngle);
    });
  }

  destroyEnemyBeamTelegraph(enemy) {
    if (enemy.beamChargeEvent) {
      enemy.beamChargeEvent.remove(false);
      enemy.beamChargeEvent = null;
    }
    enemy.beamChargeId = (enemy.beamChargeId || 0) + 1;
    this.tweens.killTweensOf(enemy.beamTelegraphObjects || []);
    enemy.beamTelegraphObjects?.forEach((object) => {
      if (object?.active) {
        object.destroy();
      }
    });
    enemy.beamTelegraphObjects = null;
    enemy.isChargingBeam = false;
  }

  cancelActiveEnemyBeamCharges() {
    this.enemies?.children.each((enemy) => {
      if (enemy?.active && enemy.isChargingBeam) {
        this.destroyEnemyBeamTelegraph(enemy);
      }
      if (enemy?.active && (enemy.isChargingBossAttack || enemy.isBossDashing)) {
        this.cancelBossAttack(enemy);
      }
    });
  }

  spawnEnemyBeam(enemy, angle) {
    const range = enemy.beamRange || 820;
    const beamWidth = enemy.beamWidth || 30;
    const tint = enemy.projectileTint || enemy.beamTint || 0x7df7ff;
    const coreTint = enemy.beamCoreTint || 0xffffff;
    const muzzleOffset = (enemy.hitRadius || 22) * 0.88;
    const startX = enemy.x + Math.cos(angle) * muzzleOffset;
    const startY = enemy.y + Math.sin(angle) * muzzleOffset;
    const endX = enemy.x + Math.cos(angle) * range;
    const endY = enemy.y + Math.sin(angle) * range;
    const centerX = (startX + endX) * 0.5;
    const centerY = (startY + endY) * 0.5;
    const length = Phaser.Math.Distance.Between(startX, startY, endX, endY);

    const glow = this.add
      .rectangle(centerX, centerY, length, beamWidth, tint, 0.36)
      .setRotation(angle)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .rectangle(centerX, centerY, length, Math.max(5, beamWidth * 0.24), coreTint, 0.96)
      .setRotation(angle)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD);
    const muzzleFlash = this.add
      .image(startX, startY, "skill-hit-spark")
      .setDepth(20)
      .setScale((enemy.effectScale || 1) * 0.72, (enemy.effectScale || 1) * 0.28)
      .setRotation(angle)
      .setTint(coreTint)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add([glow, core, muzzleFlash]);

    if (this.isPlayerInEnemyBeam(startX, startY, endX, endY, beamWidth * 0.5 + PLAYER_HITBOX_RADIUS)) {
      this.applyDamageToPlayer(enemy.beamDamage || enemy.projectileDamage || 8);
    }

    this.tweens.add({
      targets: [glow, core, muzzleFlash],
      alpha: 0,
      duration: 170,
      ease: "Quad.Out",
      onComplete: () => {
        glow.destroy();
        core.destroy();
        muzzleFlash.destroy();
      }
    });
  }

  isPlayerInEnemyBeam(startX, startY, endX, endY, radius) {
    const px = this.playerHitbox.x;
    const py = this.playerHitbox.y;
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSq = segmentX * segmentX + segmentY * segmentY;

    if (lengthSq <= 0) {
      return false;
    }

    const t = Phaser.Math.Clamp(((px - startX) * segmentX + (py - startY) * segmentY) / lengthSq, 0, 1);
    const closestX = startX + segmentX * t;
    const closestY = startY + segmentY * t;
    return Phaser.Math.Distance.Between(px, py, closestX, closestY) <= radius;
  }

  updateBossSpecialEnemy(enemy, angleToPlayer, distanceToPlayer) {
    const now = this.time.now;

    enemy.setFlipX(this.playerHitbox.x > enemy.x);

    if (enemy.isBossDashing) {
      return;
    }

    if (enemy.isChargingBossAttack) {
      enemy.body.setVelocity(0, 0);
      return;
    }

    const preferredRange = enemy.bossPreferredRange || 320;
    const closeRange = preferredRange * 0.62;
    let moveAngle = angleToPlayer;
    let moveSpeed = enemy.moveSpeed * 0.62;

    if (distanceToPlayer < closeRange) {
      moveAngle = angleToPlayer + Math.PI;
      moveSpeed = enemy.moveSpeed * 0.44;
    } else if (distanceToPlayer < preferredRange) {
      if (now >= (enemy.nextBossStrafeFlipAt || 0)) {
        enemy.bossStrafeDirection *= -1;
        enemy.nextBossStrafeFlipAt = now + Phaser.Math.Between(900, 1600);
      }
      moveAngle = angleToPlayer + Math.PI * 0.5 * enemy.bossStrafeDirection;
      moveSpeed = enemy.moveSpeed * 0.36;
    } else if (distanceToPlayer > preferredRange * 1.45) {
      moveSpeed = enemy.moveSpeed * 0.82;
    }

    this.physics.velocityFromRotation(moveAngle, moveSpeed, enemy.body.velocity);

    if (now >= (enemy.nextBossAttackAt || 0)) {
      this.beginBossAttack(enemy, angleToPlayer);
    }
  }

  beginBossAttack(enemy, angle) {
    if (!enemy.active || enemy.isDying || enemy.isChargingBossAttack || enemy.isBossDashing) {
      return;
    }

    const interval = enemy.attackIntervalMs || 4000;
    enemy.nextBossAttackAt = this.time.now + Phaser.Math.Between(
      Math.round(interval * 0.88),
      Math.round(interval * 1.14)
    );
    enemy.isChargingBossAttack = true;
    enemy.bossAttackId = (enemy.bossAttackId || 0) + 1;
    enemy.body.setVelocity(0, 0);
    enemy.setTintFill(0xffded6);
    this.time.delayedCall(90, () => {
      if (enemy.active && !enemy.isDying && enemy.isChargingBossAttack) {
        enemy.clearTint();
        enemy.setTint(enemy.baseTint);
      }
    });

    const attackId = enemy.bossAttackId;
    switch (enemy.bossAttackPattern) {
      case "beam":
        this.beginBossBeamAttack(enemy, angle, attackId);
        break;
      case "fanBlast":
        this.beginBossFanBlastAttack(enemy, angle, attackId);
        break;
      case "tripleBlast":
        this.beginBossTripleBlastAttack(enemy, angle, attackId);
        break;
      case "randomBlast":
        this.beginBossRandomBlastAttack(enemy, angle, attackId);
        break;
      case "lightningDash":
        this.beginBossLightningDashAttack(enemy, angle, attackId);
        break;
      case "radialCrack":
      default:
        this.beginBossRadialCrackAttack(enemy, attackId);
        break;
    }
  }

  beginBossRadialCrackAttack(enemy, attackId) {
    const radius = enemy.attackRadius || 320;
    const chargeMs = enemy.attackChargeMs || 1000;
    const center = { x: enemy.x, y: enemy.y };

    this.createBossCircleTelegraph(enemy, center.x, center.y, radius, chargeMs);
    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }

      this.spawnBossAttackImage(
        BOSS_ATTACK_EFFECT_ASSETS.crackShockwave.textureKey,
        center.x,
        center.y,
        radius * 2.18,
        radius * 2.18,
        0,
        430
      );

      if (this.isPlayerInBossCircle(center.x, center.y, radius)) {
        this.applyDamageToPlayer(enemy.attackDamage || 16);
      }
    });
  }

  beginBossBeamAttack(enemy, angle, attackId) {
    const range = enemy.beamRange || 820;
    const width = enemy.beamWidth || 80;
    const chargeMs = enemy.attackChargeMs || 1000;
    const muzzleOffset = (enemy.hitRadius || 42) * 0.86;
    const startX = enemy.x + Math.cos(angle) * muzzleOffset;
    const startY = enemy.y + Math.sin(angle) * muzzleOffset;
    const endX = enemy.x + Math.cos(angle) * range;
    const endY = enemy.y + Math.sin(angle) * range;
    const length = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const centerX = (startX + endX) * 0.5;
    const centerY = (startY + endY) * 0.5;

    this.createBossRectTelegraph(enemy, centerX, centerY, length, width, angle, chargeMs);
    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }

      this.spawnBossAttackImage(
        BOSS_ATTACK_EFFECT_ASSETS.beamLance.textureKey,
        startX,
        startY,
        length,
        width * 2.6,
        angle,
        260,
        0,
        0.5
      );

      if (this.isPlayerInEnemyBeam(startX, startY, endX, endY, width * 0.5 + PLAYER_HITBOX_RADIUS)) {
        this.applyDamageToPlayer(enemy.attackDamage || 16);
      }
    });
  }

  beginBossFanBlastAttack(enemy, angle, attackId) {
    const range = enemy.fanRange || 500;
    const fanAngle = enemy.fanAngle || Math.PI * 0.58;
    const chargeMs = enemy.attackChargeMs || 1000;
    const origin = { x: enemy.x, y: enemy.y };

    this.createBossFanTelegraph(enemy, origin.x, origin.y, angle, range, fanAngle, chargeMs);
    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }

      this.spawnBossAttackImage(
        BOSS_ATTACK_EFFECT_ASSETS.fanBlast.textureKey,
        origin.x,
        origin.y,
        range,
        Math.max(220, range * Math.sin(fanAngle * 0.5) * 2.1),
        angle,
        340,
        0,
        0.5
      );

      if (this.isPlayerInBossFan(origin.x, origin.y, angle, range, fanAngle)) {
        this.applyDamageToPlayer(enemy.attackDamage || 16);
      }
    });
  }

  beginBossTripleBlastAttack(enemy, angle, attackId) {
    const radius = enemy.blastRadius || 82;
    const spacing = enemy.blastSpacing || 150;
    const startOffset = enemy.blastStartOffset || 80;
    const chargeMs = enemy.attackChargeMs || 850;
    const points = [1, 2, 3].map((step) => this.clampBossAttackPoint(
      enemy.x + Math.cos(angle) * (startOffset + spacing * step),
      enemy.y + Math.sin(angle) * (startOffset + spacing * step),
      radius
    ));

    points.forEach((point) => {
      this.createBossCircleTelegraph(enemy, point.x, point.y, radius, chargeMs);
    });

    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }

      points.forEach((point, index) => {
        this.queueBossAttackEvent(enemy, index * 150, () => {
          if (!enemy.active || enemy.isDying) {
            return;
          }
          this.detonateBossCircleAttack(
            enemy,
            point.x,
            point.y,
            radius,
            BOSS_ATTACK_EFFECT_ASSETS.tripleExplosion.textureKey,
            320
          );
        });
      });
    });
  }

  beginBossRandomBlastAttack(enemy, angle, attackId) {
    const radius = enemy.blastRadius || 120;
    const range = enemy.randomBlastRange || 400;
    const chargeMs = enemy.attackChargeMs || 900;
    const points = [0, 1].map((index) => {
      const randomAngle = angle + Phaser.Math.FloatBetween(-1.45, 1.45) + index * 0.52;
      const distance = Phaser.Math.Between(Math.round(range * 0.34), range);
      return this.clampBossAttackPoint(
        enemy.x + Math.cos(randomAngle) * distance,
        enemy.y + Math.sin(randomAngle) * distance,
        radius
      );
    });

    points.forEach((point) => {
      this.createBossCircleTelegraph(enemy, point.x, point.y, radius, chargeMs);
    });

    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }

      points.forEach((point, index) => {
        this.queueBossAttackEvent(enemy, index * 220, () => {
          if (!enemy.active || enemy.isDying) {
            return;
          }
          this.detonateBossCircleAttack(
            enemy,
            point.x,
            point.y,
            radius,
            BOSS_ATTACK_EFFECT_ASSETS.tripleExplosion.textureKey,
            360
          );
        });
      });
    });
  }

  beginBossLightningDashAttack(enemy, angle, attackId) {
    const chargeMs = enemy.attackChargeMs || 750;
    const dashRange = enemy.dashRange || 500;
    const lightningRadius = enemy.lightningRadius || 90;
    const start = { x: enemy.x, y: enemy.y };
    const unclampedEnd = {
      x: start.x + Math.cos(angle) * dashRange,
      y: start.y + Math.sin(angle) * dashRange
    };
    const end = this.clampBossAttackPoint(unclampedEnd.x, unclampedEnd.y, enemy.hitRadius || 44);
    const dashAngle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);
    const dashLength = Math.max(120, Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y));
    const dashWidth = Math.max(118, lightningRadius * 1.24);
    const centerX = (start.x + end.x) * 0.5;
    const centerY = (start.y + end.y) * 0.5;
    const strikePoints = [0.24, 0.55, 0.86].map((ratio, index) => {
      const offset = Phaser.Math.Between(-Math.round(lightningRadius * 0.72), Math.round(lightningRadius * 0.72));
      return this.clampBossAttackPoint(
        Phaser.Math.Linear(start.x, end.x, ratio) + Math.cos(dashAngle + Math.PI * 0.5) * offset,
        Phaser.Math.Linear(start.y, end.y, ratio) + Math.sin(dashAngle + Math.PI * 0.5) * offset,
        lightningRadius + index
      );
    });

    this.createBossRectTelegraph(enemy, centerX, centerY, dashLength, dashWidth, dashAngle, chargeMs);
    strikePoints.forEach((point) => {
      this.createBossCircleTelegraph(enemy, point.x, point.y, lightningRadius, chargeMs);
    });

    this.queueBossAttackEvent(enemy, chargeMs, () => {
      if (!this.completeBossAttackCharge(enemy, attackId)) {
        return;
      }
      this.fireBossLightningDash(enemy, start, end, dashAngle, dashLength, dashWidth, lightningRadius, strikePoints);
    });
  }

  fireBossLightningDash(enemy, start, end, angle, length, width, lightningRadius, strikePoints) {
    this.spawnBossAttackImage(
      BOSS_ATTACK_EFFECT_ASSETS.dashStreak.textureKey,
      start.x,
      start.y,
      length,
      width * 1.35,
      angle,
      310,
      0,
      0.5
    );

    if (this.isPlayerInEnemyBeam(start.x, start.y, end.x, end.y, width * 0.5 + PLAYER_HITBOX_RADIUS)) {
      this.applyDamageToPlayer(enemy.attackDamage || 15);
    }

    strikePoints.forEach((point, index) => {
      this.queueBossAttackEvent(enemy, index * 90, () => {
        if (!enemy.active || enemy.isDying) {
          return;
        }
        this.detonateBossCircleAttack(
          enemy,
          point.x,
          point.y,
          lightningRadius,
          BOSS_ATTACK_EFFECT_ASSETS.lightningStrike.textureKey,
          280
        );
      });
    });

    enemy.isBossDashing = true;
    enemy.bossDashEndsAt = this.time.now + (enemy.dashDurationMs || 520);
    this.physics.velocityFromRotation(angle, enemy.dashSpeed || 340, enemy.body.velocity);
    enemy.bossDashStopEvent = this.queueBossAttackEvent(enemy, enemy.dashDurationMs || 520, () => {
      if (enemy.active && !enemy.isDying) {
        enemy.isBossDashing = false;
        enemy.body.setVelocity(0, 0);
      }
      enemy.bossDashStopEvent = null;
    });
  }

  createBossCircleTelegraph(enemy, x, y, radius, chargeMs) {
    const fill = this.add
      .circle(x, y, radius, 0xff1717, 0.16)
      .setDepth(17)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .circle(x, y, radius, 0xff1717, 0)
      .setStrokeStyle(4, 0xff4242, 0.82)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);

    const objects = this.registerBossAttackObjects(enemy, [fill, ring]);
    this.tweens.add({
      targets: objects,
      alpha: { from: 0.24, to: 0.82 },
      duration: chargeMs,
      ease: "Sine.In"
    });
    return objects;
  }

  createBossRectTelegraph(enemy, centerX, centerY, length, width, angle, chargeMs) {
    const warning = this.add
      .rectangle(centerX, centerY, length, width, 0xff1717, 0.16)
      .setRotation(angle)
      .setStrokeStyle(3, 0xff4b4b, 0.8)
      .setDepth(17)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .rectangle(centerX, centerY, length, Math.max(5, width * 0.1), 0xfff1f1, 0.42)
      .setRotation(angle)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);

    const objects = this.registerBossAttackObjects(enemy, [warning, core]);
    this.tweens.add({
      targets: objects,
      alpha: { from: 0.22, to: 0.78 },
      duration: chargeMs,
      ease: "Sine.In"
    });
    return objects;
  }

  createBossFanTelegraph(enemy, originX, originY, angle, range, fanAngle, chargeMs) {
    const graphics = this.add
      .graphics()
      .setDepth(17)
      .setAlpha(0.54)
      .setBlendMode(Phaser.BlendModes.ADD);
    const points = [{ x: originX, y: originY }];
    const steps = 12;
    const halfAngle = fanAngle * 0.5;

    for (let index = 0; index <= steps; index += 1) {
      const stepAngle = angle - halfAngle + fanAngle * (index / steps);
      points.push({
        x: originX + Math.cos(stepAngle) * range,
        y: originY + Math.sin(stepAngle) * range
      });
    }

    graphics.fillStyle(0xff1717, 0.2);
    graphics.lineStyle(4, 0xff4747, 0.78);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    this.registerBossAttackObjects(enemy, graphics);
    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.38, to: 0.82 },
      duration: chargeMs,
      ease: "Sine.In"
    });
    return graphics;
  }

  registerBossAttackObjects(enemy, objects) {
    const list = Array.isArray(objects) ? objects : [objects];
    enemy.bossAttackObjects = enemy.bossAttackObjects || [];
    enemy.bossAttackObjects.push(...list);
    this.skillEffectsLayer.add(list);
    return list;
  }

  queueBossAttackEvent(enemy, delay, callback) {
    const event = this.time.delayedCall(delay, () => {
      enemy.bossAttackEvents = (enemy.bossAttackEvents || []).filter((entry) => entry !== event);
      callback();
    });
    enemy.bossAttackEvents = enemy.bossAttackEvents || [];
    enemy.bossAttackEvents.push(event);
    return event;
  }

  completeBossAttackCharge(enemy, attackId) {
    if (!enemy.active || enemy.isDying || !enemy.isChargingBossAttack || enemy.bossAttackId !== attackId) {
      this.clearBossAttackObjects(enemy);
      return false;
    }

    this.clearBossAttackObjects(enemy);
    enemy.isChargingBossAttack = false;
    return true;
  }

  clearBossAttackObjects(enemy) {
    const objects = enemy.bossAttackObjects || [];
    this.tweens.killTweensOf(objects);
    objects.forEach((object) => {
      if (object?.active) {
        object.destroy();
      }
    });
    enemy.bossAttackObjects = [];
  }

  cancelBossAttack(enemy) {
    if (!enemy) {
      return;
    }

    enemy.bossAttackId = (enemy.bossAttackId || 0) + 1;
    (enemy.bossAttackEvents || []).forEach((event) => event?.remove(false));
    enemy.bossAttackEvents = [];
    this.clearBossAttackObjects(enemy);
    enemy.isChargingBossAttack = false;

    if (enemy.isBossDashing && enemy.body) {
      enemy.body.setVelocity(0, 0);
    }
    enemy.isBossDashing = false;
    enemy.bossDashStopEvent = null;
  }

  detonateBossCircleAttack(enemy, x, y, radius, textureKey, duration) {
    this.spawnBossAttackImage(textureKey, x, y, radius * 2.35, radius * 2.35, 0, duration);
    if (this.isPlayerInBossCircle(x, y, radius)) {
      this.applyDamageToPlayer(enemy.attackDamage || 14);
    }
  }

  spawnBossAttackImage(textureKey, x, y, displayWidth, displayHeight, rotation = 0, duration = 320, originX = 0.5, originY = 0.5) {
    const safeTextureKey = this.textures.exists(textureKey) ? textureKey : "skill-hit-glow";
    const effect = this.add
      .image(x, y, safeTextureKey)
      .setOrigin(originX, originY)
      .setRotation(rotation)
      .setDepth(20)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);

    effect.setDisplaySize(displayWidth, displayHeight);
    this.skillEffectsLayer.add(effect);

    const startScaleX = effect.scaleX;
    const startScaleY = effect.scaleY;
    this.tweens.add({
      targets: effect,
      scaleX: startScaleX * 1.08,
      scaleY: startScaleY * 1.08,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
      onComplete: () => {
        effect.destroy();
      }
    });

    return effect;
  }

  isPlayerInBossCircle(x, y, radius) {
    return Phaser.Math.Distance.Between(this.playerHitbox.x, this.playerHitbox.y, x, y) <= radius + PLAYER_HITBOX_RADIUS;
  }

  isPlayerInBossFan(originX, originY, angle, range, fanAngle) {
    const dx = this.playerHitbox.x - originX;
    const dy = this.playerHitbox.y - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > range + PLAYER_HITBOX_RADIUS) {
      return false;
    }

    const playerAngle = Math.atan2(dy, dx);
    return Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle)) <= fanAngle * 0.5;
  }

  clampBossAttackPoint(x, y, padding = 0) {
    const bounds = this.getStageMovementBounds(this.currentStage, Math.max(0, padding));
    if (!bounds) {
      return { x, y };
    }

    return this.clampPointToBounds(x, y, bounds);
  }

  spawnEnemyProjectile(enemy, angle) {
    const projectile = this.physics.add.image(enemy.x, enemy.y, "enemy-shot-core").setDepth(18);
    projectile.body.setAllowGravity(false);
    projectile.body.setCircle(6, 4, 4);
    projectile.damage = enemy.projectileDamage || 8;
    projectile.expireAt = this.time.now + (enemy.projectileLifeMs || 3600);
    projectile.spinSpeed = Phaser.Math.FloatBetween(-0.08, 0.08);
    projectile.setScale(enemy.projectileScale || 0.82);
    projectile.setTint(enemy.projectileTint || 0xb9ecff);
    projectile.setBlendMode(Phaser.BlendModes.ADD);
    this.physics.velocityFromRotation(angle, enemy.projectileSpeed || 245, projectile.body.velocity);
    this.enemyProjectiles.add(projectile);

    const ring = this.add
      .image(enemy.x, enemy.y, "skill-hit-ring")
      .setDepth(17)
      .setScale(0.22)
      .setTint(enemy.projectileTint || 0xb9ecff)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add(ring);
    this.tweens.add({
      targets: ring,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      duration: 170,
      ease: "Quad.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  applySkillEnemyForces() {
    Object.values(this.playerSkills).forEach((skillState) => {
      const stageData = skillState.currentStage;
      if (
        skillState.definition.behavior !== "screenHoming" ||
        !stageData.suctionForce ||
        !stageData.suctionRadius
      ) {
        return;
      }

      skillState.orbitals.forEach((orbital) => {
        this.enemies.children.each((enemy) => {
          if (!enemy.active || enemy.isDying || this.time.now < (enemy.hitRecoverUntil || 0)) {
            return;
          }

          const distance = Phaser.Math.Distance.Between(
            enemy.x,
            enemy.y,
            orbital.hitbox.x,
            orbital.hitbox.y
          );

          if (distance <= 0 || distance > stageData.suctionRadius) {
            return;
          }

          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, orbital.hitbox.x, orbital.hitbox.y);
          const pullRatio = 1 - distance / stageData.suctionRadius;
          const pullStrength = stageData.suctionForce * pullRatio;
          const slowMultiplier = 1 - pullRatio * 0.24;
          enemy.body.velocity.x *= slowMultiplier;
          enemy.body.velocity.y *= slowMultiplier;
          enemy.body.velocity.x += Math.cos(angle) * pullStrength;
          enemy.body.velocity.y += Math.sin(angle) * pullStrength;
          enemy.suctionVisualUntil = Math.max(enemy.suctionVisualUntil || 0, this.time.now + 120);
          enemy.suctionVisualStrength = Math.max(enemy.suctionVisualStrength || 0, pullRatio);
          enemy.suctionTrailTimer = (enemy.suctionTrailTimer || 0) + 1;

          if (enemy.suctionTrailTimer >= 3) {
            enemy.suctionTrailTimer = 0;
            this.spawnEnemySuctionEffect(enemy, angle, pullRatio, stageData);
          }
        });
      });
    });
  }

  updateEnemyStatusVisuals() {
    const now = this.time.now;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      if (now < (enemy.suctionVisualUntil || 0)) {
        const strength = enemy.suctionVisualStrength || 0;
        enemy.alpha = 0.78 + strength * 0.18;
      } else {
        enemy.alpha = 1;
        enemy.suctionVisualStrength = 0;
      }

      const isFrozen = now < (enemy.freezeUntil || 0);
      const isSleeping = now < (enemy.sleepUntil || 0);
      const isTimeStopped = now < (enemy.timeStopUntil || 0);
      const isStunned = now < (enemy.stunUntil || 0);
      if (isFrozen || isSleeping || isTimeStopped || isStunned) {
        const pulse = (Math.sin(now / (isFrozen ? 95 : (isTimeStopped ? 70 : (isStunned ? 82 : 130))) + enemy.visualPulseOffset) + 1) * 0.5;
        enemy.supportStatusTintActive = true;
        enemy.setTint(isFrozen ? 0xa9efff : (isTimeStopped ? 0xffef8a : (isStunned ? 0xe9ffff : 0xc8ff82)));
        enemy.alpha = Math.min(
          enemy.alpha,
          isFrozen ? 0.76 + pulse * 0.14 : (isTimeStopped ? 0.72 + pulse * 0.16 : (isStunned ? 0.74 + pulse * 0.18 : 0.7 + pulse * 0.18))
        );
      } else if (enemy.supportStatusTintActive) {
        enemy.supportStatusTintActive = false;
        enemy.clearTint();
        enemy.setTint(enemy.baseTint);
      }

      if (enemy.eliteAura?.active) {
        const pulse = (Math.sin(now / 180 + enemy.visualPulseOffset) + 1) * 0.5;
        enemy.eliteAura.setPosition(enemy.x, enemy.y);
        enemy.eliteAura.setScale((enemy.effectScale || enemy.baseScale) * (1.24 + pulse * 0.18));
        enemy.eliteAura.setAlpha(0.16 + pulse * 0.14);
      }

      if (enemy.eliteRing?.active) {
        const pulse = (Math.sin(now / 220 + enemy.visualPulseOffset + 0.8) + 1) * 0.5;
        enemy.eliteRing.setPosition(enemy.x, enemy.y);
        enemy.eliteRing.rotation += 0.008;
        enemy.eliteRing.setScale((enemy.effectScale || enemy.baseScale) * (0.8 + pulse * 0.12));
        enemy.eliteRing.setAlpha(0.22 + pulse * 0.12);
      }
    });
  }

  spawnEnemySuctionEffect(enemy, angle, strength, stageData) {
    const streak = this.add
      .image(
        enemy.x - Math.cos(angle) * (14 + strength * 12),
        enemy.y - Math.sin(angle) * (14 + strength * 12),
        "wind-streak"
      )
      .setDepth(17)
      .setRotation(angle)
      .setScale(0.28 + strength * 0.26)
      .setTint(stageData.effectTint || 0x9af6cf)
      .setAlpha(0.18 + strength * 0.2)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(enemy.x, enemy.y, "skill-hit-ring")
      .setDepth(17)
      .setScale(0.24 + strength * 0.18)
      .setTint(stageData.effectTint || 0x9af6cf)
      .setAlpha(0.12 + strength * 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add([streak, ring]);

    this.tweens.add({
      targets: streak,
      x: streak.x + Math.cos(angle) * (18 + strength * 12),
      y: streak.y + Math.sin(angle) * (18 + strength * 12),
      alpha: 0,
      scaleX: streak.scaleX * 1.12,
      scaleY: streak.scaleY * 0.92,
      duration: 140,
      ease: "Quad.Out",
      onComplete: () => {
        streak.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: ring.scaleX * 1.5,
      scaleY: ring.scaleY * 1.5,
      alpha: 0,
      duration: 160,
      ease: "Quad.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  updateXpOrbs(delta) {
    this.xpOrbs.children.each((orb) => {
      if (!orb.active) {
        return;
      }

      orb.floatTimer += delta / 220;
      const pulse = (Math.sin(orb.floatTimer) + 1) * 0.5;
      const isForcedPull = this.time.now < (orb.forcePullUntil || 0);

      const distance = Phaser.Math.Distance.Between(
        orb.x,
        orb.y,
        this.playerHitbox.x,
        this.playerHitbox.y
      );

      if (isForcedPull || distance < 190) {
        const angle = Phaser.Math.Angle.Between(
          orb.x,
          orb.y,
          this.playerHitbox.x,
          this.playerHitbox.y
        );
        const speed = isForcedPull ? (orb.forcePullSpeed || 820) : (distance < 70 ? 420 : 250);
        this.physics.velocityFromRotation(angle, speed, orb.body.velocity);
        orb.trailTimer += delta;
        if (orb.trailTimer >= (isForcedPull ? 24 : 40)) {
          orb.trailTimer = 0;
          this.spawnXpTrailEffect(orb);
        }
        orb.setAlpha(0.84 + pulse * 0.16);
      } else {
        orb.body.setVelocity(0, 0);
        orb.trailTimer = 0;
        orb.setAlpha(0.92 + pulse * 0.08);
      }

      orb.setScale(0.94 + pulse * 0.14);
    });
  }

  updateRareItems(delta) {
    this.rareItems.children.each((item) => {
      if (!item.active) {
        return;
      }

      item.floatTimer += delta / 280;
      const pulse = (Math.sin(item.floatTimer * 1.4) + 1) * 0.5;
      const isForcedPull = this.time.now < (item.forcePullUntil || 0);

      if (isForcedPull) {
        const targetX = this.playerHitbox.x;
        const targetY = this.playerHitbox.y - 8;
        const deltaX = targetX - item.baseX;
        const deltaY = targetY - item.baseY;
        const distance = Math.hypot(deltaX, deltaY);
        const maxStep = (item.forcePullSpeed || 820) * (delta / 1000);
        const moveRatio = distance > 0 ? Math.min(1, maxStep / distance) : 1;
        item.baseX += deltaX * moveRatio;
        item.baseY += deltaY * moveRatio;
      }

      const bob = isForcedPull ? 0 : Math.sin(item.floatTimer) * 5;
      const effectScale = item.effectScale || 1;

      item.setPosition(item.baseX, item.baseY + bob);
      item.setScale(item.baseScale * (0.96 + pulse * 0.08));
      item.setAlpha(0.94 + pulse * 0.06);

      if (item.pillarEffect?.active) {
        item.pillarEffect.setPosition(item.x, item.y + 58);
        item.pillarEffect.setDisplaySize(
          (item.pillarEffectBaseWidth || 218 * effectScale) * (0.98 + pulse * 0.06),
          (item.pillarEffectBaseHeight || 436 * effectScale) * (0.98 + pulse * 0.05)
        );
        item.pillarEffect.setAlpha((isForcedPull ? 0.56 : 0.34) + pulse * 0.12);
      }

      if (item.outerBeam?.active) {
        item.outerBeam.setPosition(item.x, item.y - 132);
        item.outerBeam.setDisplaySize((86 + pulse * 28) * effectScale, (410 + pulse * 58) * effectScale);
        item.outerBeam.setAlpha(0.14 + pulse * 0.16);
      }

      if (item.innerBeam?.active) {
        item.innerBeam.setPosition(item.x, item.y - 132);
        item.innerBeam.setDisplaySize((38 + pulse * 18) * effectScale, (392 + pulse * 54) * effectScale);
        item.innerBeam.setAlpha(0.32 + pulse * 0.26);
      }

      if (item.beamCore?.active) {
        item.beamCore.setPosition(item.x, item.y - 132);
        item.beamCore.setDisplaySize((12 + pulse * 8) * effectScale, (410 + pulse * 62) * effectScale);
        item.beamCore.setAlpha(0.62 + pulse * 0.26);
      }

      item.beamLines?.forEach((line, index) => {
        if (!line.active) {
          return;
        }

        const side = line.offsetSide ?? (index % 2 === 0 ? -1 : 1);
        const sway = Math.sin(item.floatTimer * 1.8 + line.phase) * 5 * effectScale;
        const verticalSway = Math.cos(item.floatTimer * 1.15 + line.phase) * 7 * effectScale;
        line.setPosition(item.x + side * (32 + pulse * 8) * effectScale + sway, item.y - 132 + verticalSway);
        line.setDisplaySize(
          ((line.baseWidth || 3) + pulse * 1.8) * effectScale,
          ((line.baseHeight || 360) + pulse * 58) * effectScale
        );
        line.setAlpha((line.baseAlpha || 0.34) + pulse * 0.2);
      });

      if (item.baseGlow?.active) {
        item.baseGlow.setPosition(item.x, item.y + 25);
        item.baseGlow.setScale(effectScale * (1 + pulse * 0.2), effectScale * (0.88 + pulse * 0.18));
        item.baseGlow.setAlpha(0.18 + pulse * 0.12);
      }

      if (item.floorFlare?.active) {
        item.floorFlare.setPosition(item.x, item.y + 24);
        item.floorFlare.setScale(effectScale * (1.18 + pulse * 0.28), effectScale * (0.38 + pulse * 0.1));
        item.floorFlare.rotation -= 0.008 * (delta / 16.6667);
        item.floorFlare.setAlpha(0.14 + pulse * 0.12);
      }

      if (item.glow?.active) {
        item.glow.setPosition(item.x, item.y);
        item.glow.setScale(effectScale * (0.94 + pulse * 0.24));
        item.glow.setAlpha((isForcedPull ? 0.26 : 0.14) + pulse * 0.12);
      }

      if (item.ring?.active) {
        item.ring.setPosition(item.x, item.y);
        item.ring.rotation += 0.018 * (delta / 16.6667);
        item.ring.setScale(effectScale * (0.52 + pulse * 0.24));
        item.ring.setAlpha(0.08 + pulse * 0.1);
      }

      item.pillarSparkles?.forEach((sparkle, index) => {
        if (!sparkle.active) {
          return;
        }

        const progress = (item.floatTimer * sparkle.floatSpeed + sparkle.floatPhase) % 1;
        const columnHeight = 372 * effectScale;
        const sideDrift = Math.sin(item.floatTimer * sparkle.swaySpeed + sparkle.floatPhase * Math.PI * 2) * sparkle.swayAmount * effectScale;
        sparkle.setPosition(item.x + sparkle.offsetX * effectScale + sideDrift, item.y + 34 - progress * columnHeight);
        sparkle.setScale(sparkle.baseScale * (0.76 + pulse * 0.42));
        sparkle.setAlpha((0.36 + pulse * 0.32) * (1 - progress * 0.28));
      });
    });
  }

  updateSpecialItems(delta) {
    this.specialItems.children.each((item) => {
      if (!item.active) {
        return;
      }

      const definition = item.itemDefinition;
      const effectType = definition?.effectType || "heal";
      const pulseSpeed = effectType === "bomb" ? 2 : (effectType === "magnet" ? 1.7 : 1.25);
      const pulseAmount = effectType === "bomb" ? 0.18 : 0.12;
      item.floatTimer += delta / 260;
      const pulse = (Math.sin(item.floatTimer * pulseSpeed) + 1) * 0.5;
      const bob = Math.sin(item.floatTimer * 1.05) * 4;

      item.setPosition(item.baseX, item.baseY + bob);
      item.setScale(item.baseScale * (0.92 + pulse * pulseAmount));
      item.setAlpha(0.92 + pulse * 0.08);

      if (item.glow?.active) {
        item.glow.setPosition(item.x, item.y);
        item.glow.setScale(item.baseScale * (1.14 + pulse * 0.22));
        item.glow.setAlpha(0.18 + pulse * (effectType === "heal" ? 0.16 : 0.2));
      }

      if (item.ring?.active) {
        item.ring.setPosition(item.x, item.y);
        item.ring.rotation += (effectType === "magnet" ? 0.03 : 0.014) * (delta / 16.6667);
        item.ring.setScale(item.baseScale * (effectType === "bomb" ? 0.92 + pulse * 0.52 : 0.82 + pulse * 0.3));
        item.ring.setAlpha((effectType === "bomb" ? 0.18 : 0.12) + pulse * 0.12);
      }
    });
  }

  setPickupPullToPlayer(item, durationMs, speed) {
    if (!item?.active) {
      return;
    }

    item.forcePullUntil = Math.max(item.forcePullUntil || 0, this.time.now + durationMs);
    item.forcePullSpeed = Math.max(item.forcePullSpeed || 0, speed);
  }

  updateBullets(time) {
    this.bullets.children.each((bullet) => {
      if (bullet.active && bullet.expireAt <= time) {
        bullet.destroy();
      }
    });
  }

  updateEnemyProjectiles(time) {
    this.enemyProjectiles.children.each((projectile) => {
      if (!projectile.active) {
        return;
      }

      projectile.rotation += projectile.spinSpeed || 0;

      if (
        projectile.expireAt <= time ||
        projectile.x < -32 ||
        projectile.y < -32 ||
        projectile.x > WORLD_WIDTH + 32 ||
        projectile.y > WORLD_HEIGHT + 32
      ) {
        projectile.destroy();
      }
    });
  }

  updateBossSpawns() {
    if (this.waveBossSpawned || this.getActiveWaveBoss()) {
      return;
    }

    if (this.survivalTime >= this.nextBossSpawnAt) {
      this.spawnWaveBoss();
    }
  }

  getCurrentWaveDefinition() {
    return this.buildWaveDefinition(this.currentWaveId || 1);
  }

  buildWaveDefinition(waveId) {
    const base = WAVE_DEFINITIONS[0];
    const waveIndex = Math.max(0, waveId - 1);
    const dashWeight = base.enemyWeights.dash + Math.min(7, Math.floor(waveIndex * 0.65));
    const tankWeight = base.enemyWeights.tank + Math.min(6, Math.floor(waveIndex * 0.5));
    const rangedWeight = base.enemyWeights.ranged + Math.min(6, Math.floor(waveIndex * 0.55));
    const goldSlimeWeight = base.enemyWeights.gold_slime + Math.min(0.045, waveIndex * 0.002);
    const silverSlimeWeight = base.enemyWeights.silver_slime + Math.min(0.09, waveIndex * 0.004);
    const bossTypeId = BOSS_TYPE_SEQUENCE[waveIndex % BOSS_TYPE_SEQUENCE.length];

    return {
      ...base,
      id: waveId,
      label: `Wave ${String(waveId).padStart(2, "0")}`,
      spawnInterval: Math.max(360, base.spawnInterval - waveIndex * 24),
      spawnBatch: [
        base.spawnBatch[0] + Math.floor(waveIndex * 0.8),
        base.spawnBatch[1] + Math.floor(waveIndex * 1.15)
      ],
      maxEnemies: base.maxEnemies + waveIndex * 8,
      hpScale: base.hpScale + waveIndex * 0.18,
      speedScale: base.speedScale + Math.min(0.55, waveIndex * 0.035),
      damageScale: base.damageScale + waveIndex * 0.08,
      enemyWeights: {
        chaser: Math.max(4, base.enemyWeights.chaser - Math.floor(waveIndex * 0.2)),
        dash: dashWeight,
        tank: tankWeight,
        ranged: rangedWeight,
        gold_slime: goldSlimeWeight,
        silver_slime: silverSlimeWeight
      },
      bossTypeId,
      bossWeights: { [bossTypeId]: 1 }
    };
  }

  getEnemySpawnInterval() {
    return this.getCurrentWaveDefinition().spawnInterval;
  }

  getActiveEnemyCount() {
    let count = 0;
    this.enemies.children.each((enemy) => {
      if (enemy.active && !enemy.isDying) {
        count += 1;
      }
    });
    return count;
  }

  pickWeightedEnemyType(weightTable) {
    const entries = Object.entries(weightTable).filter(([, weight]) => weight > 0);
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (totalWeight <= 0) {
      return "chaser";
    }

    let roll = Phaser.Math.FloatBetween(0, totalWeight);
    for (const [typeId, weight] of entries) {
      roll -= weight;
      if (roll <= 0) {
        return typeId;
      }
    }

    return entries[0][0];
  }

  getEnemySpawnBounds(margin = 120) {
    const source = this.currentStage?.playBounds || this.currentStage?.layout?.playBounds;
    if (!source) {
      return null;
    }

    const padding = Math.max(source.enemySpawnPadding ?? ENEMY_SPAWN_EDGE_PADDING, margin);
    return this.getStageMovementBounds(this.currentStage, padding);
  }

  getEnemySpawnObstaclePadding() {
    const source = this.currentStage?.playBounds || this.currentStage?.layout?.playBounds;
    return source?.enemySpawnObstaclePadding ?? ENEMY_SPAWN_OBSTACLE_PADDING;
  }

  isEnemySpawnPointClear(point, bounds, obstaclePadding) {
    if (
      bounds &&
      (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom)
    ) {
      return false;
    }

    if (this.currentStage && this.isPointNearStageObstacle(this.currentStage, point.x, point.y, obstaclePadding)) {
      return false;
    }

    return true;
  }

  getEnemySpawnPoint(margin = 120) {
    const halfWidth = GAME_WIDTH * 0.5 / this.cameras.main.zoom;
    const halfHeight = GAME_HEIGHT * 0.5 / this.cameras.main.zoom;
    const centerX = this.playerHitbox.x;
    const centerY = this.playerHitbox.y;
    const spawnBounds = this.getEnemySpawnBounds(margin) || {
      left: 32,
      top: 32,
      right: WORLD_WIDTH - 32,
      bottom: WORLD_HEIGHT - 32
    };
    const obstaclePadding = this.getEnemySpawnObstaclePadding();

    const makeCandidate = () => {
      const edge = Phaser.Math.Between(0, 3);

      if (edge === 0) {
        return {
          x: Phaser.Math.Between(Math.round(centerX - halfWidth), Math.round(centerX + halfWidth)),
          y: centerY - halfHeight - margin
        };
      }

      if (edge === 1) {
        return {
          x: centerX + halfWidth + margin,
          y: Phaser.Math.Between(Math.round(centerY - halfHeight), Math.round(centerY + halfHeight))
        };
      }

      if (edge === 2) {
        return {
          x: Phaser.Math.Between(Math.round(centerX - halfWidth), Math.round(centerX + halfWidth)),
          y: centerY + halfHeight + margin
        };
      }

      return {
        x: centerX - halfWidth - margin,
        y: Phaser.Math.Between(Math.round(centerY - halfHeight), Math.round(centerY + halfHeight))
      };
    };

    const clampSpawnPoint = (point) => {
      const clampedPoint = this.clampPointToBounds(point.x, point.y, spawnBounds);
      return {
        x: Math.round(clampedPoint.x),
        y: Math.round(clampedPoint.y)
      };
    };

    let fallbackPoint = null;
    let fallbackDistance = -Infinity;

    for (let attempt = 0; attempt < ENEMY_SPAWN_POINT_ATTEMPTS; attempt += 1) {
      const point = clampSpawnPoint(makeCandidate());
      const distance = Phaser.Math.Distance.Between(point.x, point.y, centerX, centerY);

      if (distance > fallbackDistance) {
        fallbackPoint = point;
        fallbackDistance = distance;
      }

      if (this.isEnemySpawnPointClear(point, spawnBounds, obstaclePadding)) {
        return point;
      }
    }

    for (let attempt = 0; attempt < ENEMY_SPAWN_POINT_ATTEMPTS; attempt += 1) {
      const point = {
        x: Phaser.Math.Between(Math.round(spawnBounds.left), Math.round(spawnBounds.right)),
        y: Phaser.Math.Between(Math.round(spawnBounds.top), Math.round(spawnBounds.bottom))
      };

      if (this.isEnemySpawnPointClear(point, spawnBounds, obstaclePadding)) {
        return point;
      }
    }

    return fallbackPoint || clampSpawnPoint({ x: centerX, y: centerY });
  }

  spawnEnemyWave() {
    const wave = this.getCurrentWaveDefinition();
    const openSlots = Math.max(0, wave.maxEnemies - this.getActiveEnemyCount());
    if (openSlots <= 0) {
      return;
    }

    const requestedCount = Phaser.Math.Between(wave.spawnBatch[0], wave.spawnBatch[1]);
    const spawnCount = Math.min(openSlots, requestedCount);

    for (let index = 0; index < spawnCount; index += 1) {
      const typeId = this.pickWeightedEnemyType(wave.enemyWeights);
      this.spawnEnemy(typeId, { waveDefinition: wave });
    }
  }

  spawnEliteEnemy() {
    const wave = this.getCurrentWaveDefinition();
    const typeId = this.pickWeightedEnemyType(wave.enemyWeights);
    this.spawnEnemy(typeId, { waveDefinition: wave, isElite: true });
  }

  spawnWaveBoss() {
    const wave = this.getCurrentWaveDefinition();
    const typeId = wave.bossTypeId || this.pickWeightedEnemyType(wave.bossWeights || wave.enemyWeights);
    this.waveBossSpawned = true;
    this.activeWaveBoss = this.spawnEnemy(typeId, {
      waveDefinition: wave,
      isElite: true,
      isBoss: true
    });
    this.setLastPickupNotice(`BOSS WAVE ${wave.id}`);
  }

  getActiveWaveBoss() {
    if (this.activeWaveBoss?.active && !this.activeWaveBoss.isDying) {
      return this.activeWaveBoss;
    }

    this.activeWaveBoss = null;
    return null;
  }

  advanceWaveAfterBossKill(enemy) {
    if (this.activeWaveBoss === enemy) {
      this.activeWaveBoss = null;
    }

    this.currentWaveId += 1;
    this.waveStartedAt = this.survivalTime;
    this.nextBossSpawnAt = this.survivalTime + BOSS_SPAWN_DELAY_MS;
    this.waveBossSpawned = false;
    this.enemySpawnTimer = 0;
    this.setLastPickupNotice(`WAVE ${this.currentWaveId}`);
  }

  getEnemyTextureKey(definition) {
    if (this.textures.exists(definition.textureKey)) {
      return definition.textureKey;
    }

    return definition.fallbackTextureKey || "enemy-core";
  }

  getEnemyDisplayScale(definition, isElite, isUsingFallbackTexture) {
    const baseScale = isUsingFallbackTexture ? definition.scale : (definition.spriteScale || definition.scale);
    return baseScale * (isElite ? 1.34 : 1);
  }

  configureEnemyBody(enemy, definition, isElite) {
    const sourceImage = enemy.texture.getSourceImage();
    const sourceWidth = sourceImage?.width || 40;
    const sourceHeight = sourceImage?.height || 40;
    const desiredRadius = definition.hitRadius * (isElite ? 1.18 : 1);
    const sourceRadius = desiredRadius / Math.max(enemy.scaleX, 0.001);
    const centerX = sourceWidth * (definition.hitboxCenterX || 0.5);
    const centerY = sourceHeight * (definition.hitboxCenterY || 0.5);

    enemy.body.setCircle(sourceRadius, centerX - sourceRadius, centerY - sourceRadius);
    enemy.body.updateFromGameObject();
  }

  playEnemyIdleAnimation(enemy, definition, isUsingFallbackTexture) {
    if (isUsingFallbackTexture || !definition.animationKey || !this.anims.exists(definition.animationKey)) {
      return;
    }

    enemy.play({
      key: definition.animationKey,
      startFrame: Phaser.Math.Between(0, Math.max(0, (definition.animationFrameCount || 1) - 1))
    });
  }

  initializeBossSpecialEnemy(enemy, definition, wave, options) {
    enemy.bossAttackPattern = definition.bossAttackPattern || "radialCrack";
    enemy.bossPreferredRange = definition.bossPreferredRange || 320;
    enemy.attackIntervalMs = Math.round((definition.attackIntervalMs || 4000) * (options.isElite ? 0.96 : 1));
    enemy.attackChargeMs = definition.attackChargeMs || 1000;
    enemy.attackDamage = Math.round((definition.attackDamage || definition.contactDamage || 14) * (wave.damageScale || 1));
    enemy.attackRadius = definition.attackRadius;
    enemy.beamRange = definition.beamRange;
    enemy.beamWidth = definition.beamWidth;
    enemy.fanRange = definition.fanRange;
    enemy.fanAngle = definition.fanAngle;
    enemy.blastRadius = definition.blastRadius;
    enemy.blastSpacing = definition.blastSpacing;
    enemy.blastStartOffset = definition.blastStartOffset;
    enemy.randomBlastRange = definition.randomBlastRange;
    enemy.dashRange = definition.dashRange;
    enemy.dashSpeed = definition.dashSpeed ? definition.dashSpeed * (wave.speedScale || 1) : undefined;
    enemy.dashDurationMs = definition.dashDurationMs;
    enemy.lightningRadius = definition.lightningRadius;
    enemy.bossStrafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    enemy.nextBossStrafeFlipAt = this.time.now + Phaser.Math.Between(900, 1600);
    enemy.nextBossAttackAt = this.time.now + Phaser.Math.Between(950, 1550);
    enemy.bossAttackId = 0;
    enemy.bossAttackObjects = [];
    enemy.bossAttackEvents = [];
    enemy.isChargingBossAttack = false;
    enemy.isBossDashing = false;
    enemy.bossDashStopEvent = null;
  }

  spawnEnemy(typeId = "chaser", options = {}) {
    const definition = ENEMY_DEFINITIONS[typeId] || ENEMY_DEFINITIONS.chaser;
    const wave = options.waveDefinition || this.getCurrentWaveDefinition();
    const spawnPoint = this.getEnemySpawnPoint(options.isElite ? 150 : 120);
    const eliteHpMultiplier = options.isElite ? (options.isBoss ? 5 : 4) : 1;
    const eliteSpeedMultiplier = options.isElite ? 1.12 : 1;
    const textureKey = this.getEnemyTextureKey(definition);
    const isUsingFallbackTexture = textureKey !== definition.textureKey;
    const displayScale = this.getEnemyDisplayScale(definition, Boolean(options.isElite), isUsingFallbackTexture);
    const enemy = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, textureKey).setDepth(18);

    enemy.body.setAllowGravity(false);
    enemy.body.setCollideWorldBounds(true);
    enemy.setTint(definition.tint);
    enemy.setScale(displayScale);
    this.configureEnemyBody(enemy, definition, Boolean(options.isElite));
    this.playEnemyIdleAnimation(enemy, definition, isUsingFallbackTexture);

    enemy.enemyTypeId = definition.id;
    enemy.enemyDefinition = definition;
    enemy.aiBehavior = definition.aiBehavior || "chase";
    enemy.baseTint = definition.tint;
    enemy.baseScale = displayScale;
    enemy.effectScale = (definition.effectScale || (isUsingFallbackTexture ? definition.scale : 1)) * (options.isElite ? 1.18 : 1);
    enemy.hp = Math.round(definition.hp * wave.hpScale * eliteHpMultiplier);
    enemy.moveSpeed = definition.speed * wave.speedScale * eliteSpeedMultiplier;
    enemy.contactDamage = Math.round(definition.contactDamage * (wave.damageScale || 1) * (options.isElite ? 1.4 : 1));
    enemy.xpValue = Math.round(definition.xpValue * (options.isElite ? 6 : 1));
    enemy.knockbackResist = definition.knockbackResist || 0;
    enemy.hitRecoverUntil = 0;
    enemy.isDying = false;
    enemy.isElite = Boolean(options.isElite);
    enemy.isBoss = Boolean(options.isBoss);
    enemy.visualPulseOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
    enemy.suctionVisualUntil = 0;
    enemy.suctionVisualStrength = 0;
    enemy.suctionTrailTimer = 0;
    enemy.sleepUntil = 0;
    enemy.freezeUntil = 0;
    enemy.timeStopUntil = 0;
    enemy.stunUntil = 0;
    enemy.supportStatusTintActive = false;
    enemy.supportDamageHoldUntil = 0;

    if (definition.aiBehavior === "dash") {
      enemy.burstSpeed = definition.dashSpeed * wave.speedScale * eliteSpeedMultiplier;
      enemy.dashDurationMs = definition.dashDurationMs;
      enemy.dashCooldownMs = definition.dashCooldownMs;
      enemy.nextDashAt = this.time.now + Phaser.Math.Between(500, 1200);
      enemy.burstUntil = 0;
      enemy.burstAngle = 0;
    }

    if (definition.aiBehavior === "ranged") {
      enemy.preferredRange = definition.preferredRange;
      enemy.keepAwayRange = definition.keepAwayRange;
      enemy.rangeTolerance = definition.rangeTolerance;
      enemy.strafeSpeed = definition.strafeSpeed;
      enemy.attackIntervalMs = Math.round(definition.attackIntervalMs * (options.isElite ? 0.92 : 1));
      enemy.beamRange = definition.beamRange;
      enemy.beamChargeMs = definition.beamChargeMs;
      enemy.beamDamage = Math.round(definition.beamDamage * (wave.damageScale || 1) * (options.isElite ? 1.35 : 1));
      enemy.beamWidth = definition.beamWidth * (options.isElite ? 1.18 : 1);
      enemy.beamTint = definition.beamTint;
      enemy.beamCoreTint = definition.beamCoreTint;
      enemy.projectileTint = enemy.beamTint;
      enemy.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
      enemy.nextStrafeFlipAt = this.time.now + Phaser.Math.Between(900, 1600);
      enemy.nextAttackAt = this.time.now + Phaser.Math.Between(700, 1300);
      enemy.isChargingBeam = false;
      enemy.beamTelegraphObjects = null;
    }

    if (definition.aiBehavior === "bossSpecial") {
      this.initializeBossSpecialEnemy(enemy, definition, wave, options);
    }

    if (enemy.isElite && !enemy.isBoss) {
      const auraTint = 0xffd667;
      enemy.eliteAura = this.add
        .image(enemy.x, enemy.y, "skill-hit-glow")
        .setDepth(17)
        .setScale(enemy.effectScale * 1.3)
        .setTint(auraTint)
        .setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.ADD);
      enemy.eliteRing = this.add
        .image(enemy.x, enemy.y, "skill-hit-ring")
        .setDepth(17)
        .setScale(enemy.effectScale * 0.84)
        .setTint(0xfff1af)
        .setAlpha(0.24)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.skillEffectsLayer.add([enemy.eliteAura, enemy.eliteRing]);
      this.spawnEliteSpawnEffect(enemy.x, enemy.y);
    }

    this.enemies.add(enemy);
    return enemy;
  }
  fireAtClosestEnemy(time) {
    const shotCount = this.getBasicAttackShotCount();
    const targets = this.findClosestEnemies(shotCount);

    if (!targets.length) {
      return;
    }

    for (let shotIndex = 0; shotIndex < shotCount; shotIndex += 1) {
      const target = targets[shotIndex % targets.length];
      if (!target?.active || target.isDying) {
        continue;
      }

      this.spawnBasicLightningStrike(target, shotIndex, shotCount);
      this.applyDamageToEnemy(target, this.stats.bulletDamage, 0xe4f6ff, {
        sourceX: this.playerHitbox.x,
        sourceY: this.playerHitbox.y - 18,
        force: 150 + shotIndex * 12,
        recoverMs: 100
      });
    }
  }

  findClosestEnemy() {
    return this.findClosestEnemies(1)[0] || null;
  }

  findClosestEnemies(maxCount) {
    return this.findClosestEnemiesFrom(this.playerHitbox.x, this.playerHitbox.y, maxCount);
  }

  findClosestEnemiesFrom(originX, originY, maxCount, maxRange = Infinity) {
    const rankedEnemies = [];
    const maxDistanceSq = Number.isFinite(maxRange) ? maxRange * maxRange : Infinity;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distanceSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, originX, originY);
      if (distanceSq > maxDistanceSq) {
        return;
      }

      rankedEnemies.push({
        enemy,
        distanceSq
      });
    });

    rankedEnemies.sort((left, right) => left.distanceSq - right.distanceSq);
    return rankedEnemies.slice(0, maxCount).map((entry) => entry.enemy);
  }

  getBasicAttackShotCount() {
    const primarySkill = this.getPrimarySkillState();
    return primarySkill?.currentStage?.autoAttackShots || 1;
  }

  getRobotMissileFrameKey(frameIndex = 0) {
    const frames = ROBOT_IMAGE_ASSETS.missileFrames;
    const asset = frames[frameIndex % frames.length];
    return this.textures.exists(asset?.textureKey) ? asset.textureKey : "bullet-core";
  }

  getRobotMissileShotCount() {
    const level = this.robotState?.missileLevel || 1;
    return Math.min(6, 1 + Math.floor((level - 1) / 2) + (level >= ROBOT_MAX_LEVEL ? 1 : 0));
  }

  getRobotMissileFireIntervalForLevel(fireRateLevel = this.robotState?.fireRateLevel || 0) {
    const earlyLevels = Math.min(fireRateLevel, 10);
    const extendedLevels = Math.max(0, fireRateLevel - 10);
    return Math.max(360, 1500 - earlyLevels * 95 - extendedLevels * 19);
  }

  getRobotMissileFireInterval() {
    return this.getRobotMissileFireIntervalForLevel(this.robotState?.fireRateLevel || 0);
  }

  getRobotMissileDamageForLevel(damageLevel = this.robotState?.damageLevel || 0, missileLevel = this.robotState?.missileLevel || 1) {
    return Math.max(1, Math.round((1 + Math.floor((missileLevel - 1) / 2)) * (1 + damageLevel * 0.18)));
  }

  getRobotMissileDamage() {
    return this.getRobotMissileDamageForLevel(this.robotState?.damageLevel || 0, this.robotState?.missileLevel || 1);
  }

  updateRobotCombat(time, delta) {
    if (!this.robotState || !this.robotSprite) {
      return;
    }

    const interval = this.getRobotMissileFireInterval();
    this.robotState.missileTimer += delta;
    if (this.robotState.missileTimer < interval) {
      return;
    }

    const targets = this.findClosestEnemiesFrom(this.robotState.x, this.robotState.y, this.getRobotMissileShotCount(), 940);
    if (!targets.length) {
      this.robotState.missileTimer = interval;
      return;
    }

    this.robotState.missileTimer = Math.max(0, this.robotState.missileTimer - interval);
    this.fireRobotMissileVolley(targets);
  }

  fireRobotMissileVolley(targets) {
    const shotCount = this.getRobotMissileShotCount();
    for (let shotIndex = 0; shotIndex < shotCount; shotIndex += 1) {
      const target = targets[shotIndex % targets.length];
      if (!target?.active || target.isDying) {
        continue;
      }

      this.spawnRobotMissile(target, shotIndex, shotCount);
    }

    if ((this.robotState?.missileLevel || 1) >= ROBOT_MAX_LEVEL) {
      const bombardmentCount = Math.min(3, 1 + Math.floor((this.robotState.fireRateLevel + this.robotState.damageLevel) / 8));
      for (let index = 0; index < bombardmentCount; index += 1) {
        this.time.delayedCall(index * 120, () => {
          if (this.gameOver || this.shopActive || this.levelUpActive) {
            return;
          }
          this.spawnRobotBombardmentMissile();
        });
      }
    }

    if (this.robotMuzzleGlow) {
      this.tweens.killTweensOf(this.robotMuzzleGlow);
      this.robotMuzzleGlow.setScale(0.24).setAlpha(0.58);
      this.tweens.add({
        targets: this.robotMuzzleGlow,
        scaleX: 0.62,
        scaleY: 0.62,
        alpha: 0,
        duration: 150,
        ease: "Quad.Out"
      });
    }
  }

  spawnRobotMissile(target, shotIndex, shotCount) {
    const startX = this.robotState.x + Phaser.Math.Between(-8, 8);
    const startY = this.robotState.y + Phaser.Math.Between(-8, 8);
    const spread = shotCount > 1 ? shotIndex - (shotCount - 1) * 0.5 : 0;
    const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y) + spread * 0.035;
    const missile = this.physics.add
      .image(startX, startY, this.getRobotMissileFrameKey(0))
      .setDepth(22)
      .setScale(0.16)
      .setRotation(angle);

    missile.body.setAllowGravity(false);
    missile.target = target;
    missile.speed = 620 + Math.min(90, (this.robotState?.fireRateLevel || 0) * 7);
    missile.damage = this.getRobotMissileDamage();
    missile.splashRadius = 42 + (this.robotState?.missileLevel || 1) * 2;
    missile.expireAt = this.time.now + 2300;
    missile.frameTimer = shotIndex * 32;
    missile.bombardment = false;
    this.configureRobotMissileBody(missile, 12);
    this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);
    this.robotMissiles.add(missile);
  }

  spawnRobotBombardmentMissile() {
    const point = this.pickRobotBombardmentPoint();
    const startX = point.x + Phaser.Math.Between(-260, 260);
    const startY = point.y - Phaser.Math.Between(420, 560);
    const angle = Phaser.Math.Angle.Between(startX, startY, point.x, point.y);
    const missile = this.physics.add
      .image(startX, startY, this.getRobotMissileFrameKey(0))
      .setDepth(23)
      .setScale(0.19)
      .setRotation(angle);

    missile.body.setAllowGravity(false);
    missile.speed = 760 + Math.min(120, (this.robotState?.fireRateLevel || 0) * 8);
    missile.damage = Math.round(this.getRobotMissileDamage() * 2.3);
    missile.splashRadius = 158 + (this.robotState?.damageLevel || 0) * 5;
    missile.expireAt = this.time.now + 2600;
    missile.frameTimer = 0;
    missile.bombardment = true;
    missile.landingX = point.x;
    missile.landingY = point.y;
    this.configureRobotMissileBody(missile, 8);
    this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);
    this.robotMissiles.add(missile);

    const marker = this.add
      .image(point.x, point.y, "skill-hit-ring")
      .setDepth(18)
      .setScale(0.56)
      .setTint(0xff6ee8)
      .setAlpha(0.42)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.robotEffectsLayer.add(marker);
    this.tweens.add({
      targets: marker,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      duration: 380,
      ease: "Quad.Out",
      onComplete: () => {
        marker.destroy();
      }
    });
  }

  pickRobotBombardmentPoint() {
    const candidates = [];
    this.enemies.children.each((enemy) => {
      if (enemy.active && !enemy.isDying) {
        candidates.push(enemy);
      }
    });

    if (candidates.length > 0) {
      const enemy = Phaser.Utils.Array.GetRandom(candidates);
      return {
        x: Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-92, 92), 24, WORLD_WIDTH - 24),
        y: Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-92, 92), 24, WORLD_HEIGHT - 24)
      };
    }

    const view = this.cameras.main.worldView;
    return {
      x: Phaser.Math.Between(Math.round(view.x + 64), Math.round(view.right - 64)),
      y: Phaser.Math.Between(Math.round(view.y + 64), Math.round(view.bottom - 64))
    };
  }

  configureRobotMissileBody(missile, desiredRadius) {
    const frame = missile.frame;
    const sourceRadius = desiredRadius / Math.max(missile.scaleX, 0.001);
    const offsetX = Math.max(0, (frame?.width || 64) * 0.5 - sourceRadius);
    const offsetY = Math.max(0, (frame?.height || 64) * 0.5 - sourceRadius);
    missile.body.setCircle(sourceRadius, offsetX, offsetY);
    missile.body.updateFromGameObject();
  }

  updateRobotMissiles(time, delta) {
    this.robotMissiles.children.each((missile) => {
      if (!missile.active) {
        return;
      }

      if (missile.expireAt <= time) {
        if (missile.bombardment) {
          this.detonateRobotMissile(missile, missile.landingX || missile.x, missile.landingY || missile.y, true);
        } else {
          missile.destroy();
        }
        return;
      }

      missile.frameTimer += delta;
      const frameIndex = Math.floor(missile.frameTimer / 70) % ROBOT_IMAGE_ASSETS.missileFrames.length;
      missile.setTexture(this.getRobotMissileFrameKey(frameIndex));

      if (missile.bombardment) {
        const angle = Phaser.Math.Angle.Between(missile.x, missile.y, missile.landingX, missile.landingY);
        const distance = Phaser.Math.Distance.Between(missile.x, missile.y, missile.landingX, missile.landingY);
        missile.setRotation(angle);
        this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);
        if (distance <= Math.max(18, missile.speed * (delta / 1000))) {
          this.detonateRobotMissile(missile, missile.landingX, missile.landingY, true);
        }
        return;
      }

      if (missile.target?.active && !missile.target.isDying) {
        const angle = Phaser.Math.Angle.Between(missile.x, missile.y, missile.target.x, missile.target.y);
        missile.setRotation(angle);
        this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);
      }
    });
  }

  handleRobotMissileHit(missile, enemy) {
    if (!missile.active || missile.bombardment || !enemy.active || enemy.isDying) {
      return;
    }

    this.detonateRobotMissile(missile, enemy.x, enemy.y, false);
  }

  detonateRobotMissile(missile, x, y, isLargeExplosion) {
    if (!missile?.active) {
      return;
    }

    const radius = missile.splashRadius || (isLargeExplosion ? 160 : 46);
    const damage = missile.damage || this.getRobotMissileDamage();
    missile.body.enable = false;
    missile.destroy();
    this.applyRobotExplosionDamage(x, y, radius, damage, isLargeExplosion);
    this.spawnRobotExplosionEffect(x, y, radius, isLargeExplosion);
  }

  applyRobotExplosionDamage(x, y, radius, damage, isLargeExplosion) {
    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        return;
      }

      const falloff = Phaser.Math.Clamp(1 - distance / Math.max(radius, 1), 0, 1);
      const finalDamage = Math.max(1, Math.round(damage * (0.62 + falloff * 0.38)));
      const wasAlive = enemy.active && !enemy.isDying;
      const hpBefore = enemy.hp;
      this.applyDamageToEnemy(enemy, finalDamage, isLargeExplosion ? 0xff9df4 : 0xffd7f8, {
        sourceX: x,
        sourceY: y,
        force: isLargeExplosion ? 410 : 190,
        recoverMs: isLargeExplosion ? 170 : 105
      });
      if (wasAlive && hpBefore > enemy.hp) {
        const killBonus = enemy.isDying ? (enemy.isBoss ? 12 : (enemy.isElite ? 5 : 2)) : 0;
        this.addRobotSubsystemXp("missile", ROBOT_MISSILE_HIT_XP + killBonus + (isLargeExplosion ? 1 : 0), { silent: true });
      }
    });
  }

  spawnRobotExplosionEffect(x, y, radius, isLargeExplosion) {
    const frames = ROBOT_IMAGE_ASSETS.explosionFrames;
    const firstFrame = frames[0]?.textureKey || "skill-hit-glow";
    const effect = this.add
      .image(x, y, this.textures.exists(firstFrame) ? firstFrame : "skill-hit-glow")
      .setDepth(24)
      .setScale(Math.max(isLargeExplosion ? 0.62 : 0.28, radius / 260))
      .setAlpha(isLargeExplosion ? 0.92 : 0.82)
      .setBlendMode(Phaser.BlendModes.ADD);

    const shockRing = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(23)
      .setScale(Math.max(0.46, radius / 100))
      .setTint(isLargeExplosion ? 0xff72e5 : 0xffb2f1)
      .setAlpha(isLargeExplosion ? 0.62 : 0.38)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.robotEffectsLayer.add([effect, shockRing]);
    let frameIndex = 0;
    const frameDelay = isLargeExplosion ? 48 : 38;
    this.time.addEvent({
      delay: frameDelay,
      repeat: frames.length - 2,
      callback: () => {
        frameIndex += 1;
        const textureKey = frames[frameIndex]?.textureKey;
        if (effect.active && this.textures.exists(textureKey)) {
          effect.setTexture(textureKey);
        }
      }
    });

    this.tweens.add({
      targets: effect,
      scaleX: effect.scaleX * (isLargeExplosion ? 1.18 : 1.08),
      scaleY: effect.scaleY * (isLargeExplosion ? 1.18 : 1.08),
      alpha: 0,
      duration: frameDelay * frames.length + 80,
      ease: "Quad.Out",
      onComplete: () => {
        effect.destroy();
      }
    });
    this.tweens.add({
      targets: shockRing,
      scaleX: shockRing.scaleX * 1.42,
      scaleY: shockRing.scaleY * 1.42,
      alpha: 0,
      duration: isLargeExplosion ? 280 : 180,
      ease: "Cubic.Out",
      onComplete: () => {
        shockRing.destroy();
      }
    });
  }

  getRobotHealInterval() {
    return this.getRobotHealIntervalForLevel(this.robotState?.healIntervalLevel || 0, this.robotState?.healLevel || 1);
  }

  getRobotHealIntervalForLevel(intervalLevel = this.robotState?.healIntervalLevel || 0, healLevel = this.robotState?.healLevel || 1) {
    const earlyLevels = Math.min(intervalLevel, 10);
    const extendedLevels = Math.max(0, intervalLevel - 10);
    return Math.max(520, 3650 - healLevel * 120 - earlyLevels * 190 - extendedLevels * 38);
  }

  getRobotHealAmount() {
    return this.getRobotHealAmountForLevel(this.robotState?.healAmountLevel || 0, this.robotState?.healLevel || 1);
  }

  getRobotHealAmountForLevel(amountLevel = this.robotState?.healAmountLevel || 0, healLevel = this.robotState?.healLevel || 1) {
    return Math.max(1, 2 + healLevel * 2 + amountLevel * 3);
  }

  updateRobotHealing(delta) {
    if (!this.robotState || !this.robotRecoveryField) {
      return;
    }

    const interval = this.getRobotHealInterval();
    this.robotState.healTimer += delta;
    if (this.robotState.healTimer < interval) {
      return;
    }

    this.robotState.healTimer = Math.max(0, this.robotState.healTimer - interval);
    const previousHp = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.getRobotHealAmount());
    const healedAmount = this.stats.hp - previousHp;
    const fieldXp = ROBOT_FIELD_PULSE_XP + (healedAmount > 0 ? Math.ceil(healedAmount / 4) : 0);
    this.addRobotSubsystemXp("field", fieldXp, { silent: true });
    this.spawnRobotHealPulse(healedAmount);
  }

  spawnRobotHealPulse(healedAmount) {
    const radius = this.getRobotRecoveryRadius();
    const x = this.playerHitbox.x;
    const y = this.playerHitbox.y + 8;
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(22)
      .setScale(Math.max(0.8, radius / 110))
      .setTint(0xff92f2)
      .setAlpha(0.36)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(23)
      .setScale(Math.max(0.72, radius / 132))
      .setTint(0xffd6fb)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.robotEffectsLayer.add([glow, ring]);
    this.tweens.add({
      targets: [glow, ring],
      scaleX: `+=${healedAmount > 0 ? 0.42 : 0.22}`,
      scaleY: `+=${healedAmount > 0 ? 0.42 : 0.22}`,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
        ring.destroy();
      }
    });

    if (healedAmount > 0) {
      this.spawnPlayerHealNumber(healedAmount);
    }
  }

  spawnBasicLightningStrike(target, shotIndex, shotCount) {
    const startX = this.playerHitbox.x + Phaser.Math.Between(-5, 5);
    const startY = this.playerHitbox.y - 18 + Phaser.Math.Between(-6, 2);
    const endX = target.x + Phaser.Math.Between(-5, 5);
    const endY = target.y + Phaser.Math.Between(-5, 5);
    const mainAngle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
    const perpendicular = mainAngle + Math.PI * 0.5;
    const shotSpread = shotCount > 1 ? shotIndex - (shotCount - 1) * 0.5 : 0;
    const jitterStrength = 10 + Math.abs(shotSpread) * 4;
    const points = [{ x: startX, y: startY }];

    for (let step = 1; step <= 2; step += 1) {
      const progress = step / 3;
      const sideOffset = Phaser.Math.Between(-jitterStrength, jitterStrength) + shotSpread * 8;
      points.push({
        x: Phaser.Math.Linear(startX, endX, progress) + Math.cos(perpendicular) * sideOffset,
        y: Phaser.Math.Linear(startY, endY, progress) + Math.sin(perpendicular) * sideOffset
      });
    }

    points.push({ x: endX, y: endY });

    const lightningObjects = [];

    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index];
      const to = points[index + 1];
      const centerX = (from.x + to.x) * 0.5;
      const centerY = (from.y + to.y) * 0.5;
      const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);

      const glow = this.add
        .rectangle(centerX, centerY, length, 10, 0x73d7ff, 0.2)
        .setRotation(angle)
        .setDepth(18)
        .setBlendMode(Phaser.BlendModes.ADD);

      const core = this.add
        .rectangle(centerX, centerY, length, 3.2, 0xffffff, 0.94)
        .setRotation(angle)
        .setDepth(19)
        .setBlendMode(Phaser.BlendModes.ADD);

      lightningObjects.push(glow, core);
    }

    const originGlow = this.add
      .image(startX, startY, "skill-hit-glow")
      .setDepth(19)
      .setScale(0.34 + shotCount * 0.03)
      .setTint(0xbcefff)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    const targetGlow = this.add
      .image(endX, endY, "skill-hit-glow")
      .setDepth(20)
      .setScale(0.44 + shotCount * 0.05)
      .setTint(0xe8fcff)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD);

    const targetSpark = this.add
      .image(endX, endY, "skill-hit-spark")
      .setDepth(20)
      .setScale(0.52 + shotCount * 0.05, 0.18)
      .setTint(0xffffff)
      .setAlpha(0.94)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(Phaser.Math.RadToDeg(mainAngle) + Phaser.Math.Between(-28, 28));

    lightningObjects.push(originGlow, targetGlow, targetSpark);
    this.skillEffectsLayer.add(lightningObjects);

    this.tweens.add({
      targets: lightningObjects,
      alpha: 0,
      duration: 110,
      ease: "Quad.Out",
      onComplete: () => {
        lightningObjects.forEach((object) => object.destroy());
      }
    });
  }

  handleBulletHit(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.isDying) {
      return;
    }

    const impact = {
      sourceX: bullet.x,
      sourceY: bullet.y,
      force: 190,
      recoverMs: 95
    };
    bullet.destroy();
    this.applyDamageToEnemy(enemy, bullet.damage, 0xffe6dd, impact);
  }

  handleSkillHitboxOverlap(hitbox, enemy) {
    if (!enemy.active || enemy.isDying) {
      return;
    }

    const now = this.time.now;
    const lastHitAt = hitbox.damageCooldowns.get(enemy) || 0;
    if (now - lastHitAt < hitbox.contactTickMs) {
      return;
    }

    hitbox.damageCooldowns.set(enemy, now);
    this.spawnSkillHitEffect(hitbox, enemy);
    this.applyDamageToEnemy(enemy, hitbox.damage, hitbox.damageTint || 0xf4c8ff, {
      sourceX: hitbox.x,
      sourceY: hitbox.y,
      force: 120 + (hitbox.skillStage || 1) * 14,
      recoverMs: 80
    });
  }

  spawnSkillHitEffect(hitbox, enemy) {
    const skillStage = hitbox.skillStage || 1;
    const baseRadius = hitbox.skillHitRadius || 14;
    const baseScale = Phaser.Math.Clamp(baseRadius / 18, 0.8, 1.85);
    const pulseBoost = skillStage >= 6 ? 0.16 : 0;
    const effectTint = hitbox.effectTint || (skillStage >= 6 ? 0xf2fbff : 0xe0efff);
    const ringTint = skillStage >= 6 ? effectTint : Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(effectTint),
      Phaser.Display.Color.ValueToColor(0xffffff),
      100,
      28
    ).color;
    const x = enemy.x + Phaser.Math.Between(-3, 3);
    const y = enemy.y + Phaser.Math.Between(-3, 3);

    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(21)
      .setScale(baseScale * 0.78 + pulseBoost)
      .setAlpha(skillStage >= 6 ? 0.82 : 0.64)
      .setTint(effectTint)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(21)
      .setScale(baseScale * 0.56)
      .setAlpha(0.94)
      .setTint(ringTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(Phaser.Math.Between(-20, 20));

    const sparks = [];
    const sparkCount = skillStage >= 6 ? 2 : 1;
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = this.add
        .image(x, y, "skill-hit-spark")
        .setDepth(21)
        .setScale(baseScale * (0.44 + index * 0.12), Math.max(0.14, baseScale * 0.2))
        .setAlpha(0.92 - index * 0.16)
        .setTint(index === 0 ? 0xffffff : 0xa8ebff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(Phaser.Math.Between(0, 180));

      sparks.push(spark);
    }

    this.skillEffectsLayer.add([glow, ring, ...sparks]);

    this.tweens.add({
      targets: glow,
      scaleX: glow.scaleX + 0.52 + pulseBoost,
      scaleY: glow.scaleY + 0.52 + pulseBoost,
      alpha: 0,
      duration: 140,
      ease: "Quad.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: ring.scaleX + 0.92 + pulseBoost,
      scaleY: ring.scaleY + 0.92 + pulseBoost,
      alpha: 0,
      angle: ring.angle + Phaser.Math.Between(-36, 36),
      duration: 190,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });

    sparks.forEach((spark, index) => {
      this.tweens.add({
        targets: spark,
        scaleX: spark.scaleX + 0.68 + index * 0.08,
        scaleY: Math.max(0.08, spark.scaleY - 0.08),
        alpha: 0,
        angle: spark.angle + Phaser.Math.Between(42, 92),
        duration: 120 + index * 30,
        ease: "Quad.Out",
        onComplete: () => {
          spark.destroy();
        }
      });
    });
  }

  applyEnemyImpact(enemy, impact) {
    if (!enemy.body || !impact) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      impact.sourceX ?? this.playerHitbox.x,
      impact.sourceY ?? this.playerHitbox.y,
      enemy.x,
      enemy.y
    );

    const knockbackScale = Math.max(0.16, 1 - (enemy.knockbackResist || 0));
    enemy.hitRecoverUntil = this.time.now + (impact.recoverMs || 90) * Math.max(0.45, knockbackScale);
    this.physics.velocityFromRotation(angle, (impact.force || 140) * knockbackScale, enemy.body.velocity);
  }

  playEnemyHitReaction(enemy) {
    const baseScale = enemy.baseScale || 1;

    if (enemy.hitScaleTween) {
      enemy.hitScaleTween.stop();
    }

    enemy.setScale(baseScale * 1.18, baseScale * 0.84);
    enemy.hitScaleTween = this.tweens.add({
      targets: enemy,
      scaleX: baseScale,
      scaleY: baseScale,
      duration: 130,
      ease: "Back.Out"
    });
  }

  spawnEnemyDefeatEffect(x, y) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(19)
      .setScale(0.72)
      .setTint(0xffb0a8)
      .setAlpha(0.78)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(19)
      .setScale(0.46)
      .setTint(0xffd1aa)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(Phaser.Math.Between(-18, 18));

    const shards = [];
    for (let index = 0; index < 3; index += 1) {
      const shard = this.add
        .image(x, y, "skill-hit-spark")
        .setDepth(19)
        .setScale(0.4 + index * 0.08, 0.15)
        .setTint(index === 0 ? 0xffffff : 0xffc3a8)
        .setAlpha(0.88 - index * 0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(index * 56 + Phaser.Math.Between(-14, 14));

      shards.push(shard);
    }

    this.tweens.add({
      targets: glow,
      scaleX: 1.56,
      scaleY: 1.56,
      alpha: 0,
      duration: 170,
      ease: "Quad.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      angle: ring.angle + Phaser.Math.Between(-42, 42),
      duration: 210,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });

    shards.forEach((shard, index) => {
      this.tweens.add({
        targets: shard,
        scaleX: shard.scaleX + 0.56,
        scaleY: 0.08,
        alpha: 0,
        angle: shard.angle + Phaser.Math.Between(40, 88),
        duration: 140 + index * 25,
        ease: "Quad.Out",
        onComplete: () => {
          shard.destroy();
        }
      });
    });
  }

  spawnEliteSpawnEffect(x, y) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(20)
      .setScale(0.9)
      .setTint(0xffd96b)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(20)
      .setScale(0.56)
      .setTint(0xfff4b8)
      .setAlpha(0.88)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add([glow, ring]);

    this.tweens.add({
      targets: glow,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  formatFloatingCombatNumber(amount) {
    const roundedAmount = Math.max(1, Math.round(Math.abs(Number(amount) || 0)));
    if (roundedAmount >= 1000000) {
      return `${(roundedAmount / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (roundedAmount >= 10000) {
      return `${Math.round(roundedAmount / 1000)}K`;
    }
    return roundedAmount.toLocaleString("en-US");
  }

  scaleFloatingCombatFontSize(fontSize, multiplier) {
    const value = String(fontSize || "").trim();
    const match = value.match(/^(\d+(?:\.\d+)?)(px)$/i);
    if (!match) {
      return value || "15px";
    }

    return `${Math.round(Number(match[1]) * multiplier)}${match[2]}`;
  }

  spawnFloatingCombatText(x, y, amount, options = {}) {
    const numericAmount = Math.abs(Number(amount) || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }

    if ((this.floatingCombatTextCount || 0) >= 48) {
      return null;
    }

    const isHeal = options.type === "heal";
    const label = `${isHeal ? "+" : ""}${this.formatFloatingCombatNumber(numericAmount)}`;
    const jitterX = options.jitterX ?? Phaser.Math.Between(-10, 10);
    const jitterY = options.jitterY ?? Phaser.Math.Between(-5, 5);
    const baseFontSize = options.fontSize || (isHeal ? "16px" : "15px");
    const fontSize = isHeal
      ? baseFontSize
      : this.scaleFloatingCombatFontSize(baseFontSize, DAMAGE_TEXT_FONT_SIZE_MULTIPLIER);
    const text = this.add
      .text(x + jitterX, y + jitterY, label, {
        fontFamily: "Segoe UI, Yu Gothic UI, Arial, sans-serif",
        fontSize,
        color: options.color || (isHeal ? "#baff98" : "#fff0bb"),
        fontStyle: "bold",
        stroke: options.stroke || (isHeal ? "#1f5c25" : "#522710"),
        strokeThickness: options.strokeThickness ?? 3
      })
      .setOrigin(0.5)
      .setDepth(options.depth ?? 30)
      .setAlpha(options.alpha ?? 0.96);

    if (typeof text.setResolution === "function") {
      text.setResolution(2);
    }

    const layer = options.layer || this.combatTextLayer || this.supportEffectsLayer || this.skillEffectsLayer;
    layer?.add(text);
    this.floatingCombatTextCount = (this.floatingCombatTextCount || 0) + 1;

    this.tweens.add({
      targets: text,
      y: text.y - (options.rise ?? (isHeal ? 34 : 28)),
      scaleX: options.endScale ?? 0.94,
      scaleY: options.endScale ?? 0.94,
      alpha: 0,
      duration: options.duration ?? 640,
      ease: "Quad.Out",
      onComplete: () => {
        this.floatingCombatTextCount = Math.max(0, (this.floatingCombatTextCount || 0) - 1);
        text.destroy();
      }
    });

    return text;
  }

  spawnEnemyDamageNumber(enemy, damageAmount) {
    if (!enemy?.active) {
      return null;
    }

    const enemyHeight = Math.max(enemy.displayHeight || enemy.body?.height || 42, 24);
    return this.spawnFloatingCombatText(enemy.x, enemy.y - enemyHeight * 0.58 - 8, damageAmount, {
      type: "damage",
      fontSize: "15px",
      color: "#fff0bb",
      stroke: "#4c2110",
      rise: 30,
      duration: 620
    });
  }

  spawnPlayerHealNumber(healedAmount) {
    if (!this.playerHitbox) {
      return null;
    }

    const playerHeight = Math.max(this.playerSprite?.displayHeight || 72, 42);
    const x = this.playerHitbox.x;
    const y = (this.playerSprite?.y ?? this.playerHitbox.y) - playerHeight * 0.52;
    return this.spawnFloatingCombatText(x, y, healedAmount, {
      type: "heal",
      fontSize: "16px",
      color: "#baff98",
      stroke: "#1e5b27",
      rise: 34,
      duration: 680
    });
  }

  applyDamageToEnemy(enemy, damage, flashTint = 0xffdede, impact = null) {
    if (!enemy.active || enemy.isDying) {
      return;
    }

    if (this.time.now < (enemy.supportDamageHoldUntil || 0) && !impact?.supportFinisher) {
      return;
    }

    const finalDamage = this.scalePlayerDamage(damage);
    enemy.hp -= finalDamage;
    this.spawnEnemyDamageNumber(enemy, finalDamage);
    this.applyEnemyImpact(enemy, impact);
    this.playEnemyHitReaction(enemy);
    enemy.setTint(flashTint);
    this.time.delayedCall(60, () => {
      if (enemy.active && !enemy.isDying) {
        enemy.clearTint();
        enemy.setTint(enemy.baseTint);
      }
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  applyDamageToPlayer(amount) {
    if (this.levelUpActive || this.overlayContainer?.visible) {
      return false;
    }

    if (this.time.now < this.invincibleUntil) {
      return false;
    }

    this.invincibleUntil = this.time.now + 900;
    this.stats.hp = Math.max(0, this.stats.hp - amount);

    this.tweens.add({
      targets: this.damageFlash,
      alpha: { from: 0.28, to: 0 },
      duration: 220,
      ease: "Quad.Out"
    });

    if (this.stats.hp <= 0) {
      this.triggerGameOver();
    }

    return true;
  }

  handlePlayerHit(playerHitbox, enemy) {
    if (!enemy.active || enemy.isDying) {
      return;
    }

    const tookDamage = this.applyDamageToPlayer(enemy.contactDamage);
    if (!tookDamage) {
      return;
    }

    const pushAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerHitbox.x, playerHitbox.y);
    this.physics.velocityFromRotation(pushAngle, 260, enemy.body.velocity);
  }

  handleEnemyProjectileHit(playerHitbox, projectile) {
    if (!projectile.active) {
      return;
    }

    this.applyDamageToPlayer(projectile.damage || 8);
    projectile.destroy();
  }

  killEnemy(enemy) {
    if (!enemy.active || enemy.isDying) {
      return;
    }

    enemy.isDying = true;
    this.runStats.kills += 1;
    if (enemy.isElite) {
      this.runStats.eliteKills += 1;
    }
    if (enemy.isBoss) {
      this.advanceWaveAfterBossKill(enemy);
    }
    this.spawnXpOrb(enemy.x, enemy.y, enemy.xpValue);
    this.spawnEnemyDefeatEffect(enemy.x, enemy.y);
    const guaranteedDropsSpawned = this.spawnGuaranteedEnemyDrops(enemy);
    if (!guaranteedDropsSpawned) {
      this.trySpawnRareItem(enemy);
    }
    this.trySpawnSpecialItem(enemy);
    this.trySpawnRobotBossDrop(enemy);
    enemy.clearTint();
    this.tweens.killTweensOf(enemy);
    this.tweens.killTweensOf(enemy.eliteAura);
    this.tweens.killTweensOf(enemy.eliteRing);
    this.destroyEnemyBeamTelegraph(enemy);
    this.cancelBossAttack(enemy);

    if (enemy.body) {
      enemy.body.enable = false;
      enemy.body.setVelocity(0, 0);
    }

    if (enemy.eliteAura) {
      enemy.eliteAura.destroy();
    }
    if (enemy.eliteRing) {
      enemy.eliteRing.destroy();
    }

    this.tweens.add({
      targets: enemy,
      scaleX: 0.24,
      scaleY: 1.34,
      alpha: 0,
      angle: enemy.angle + Phaser.Math.Between(-20, 20),
      duration: 150,
      ease: "Cubic.In",
      onComplete: () => {
        enemy.destroy();
      }
    });
  }

  spawnXpOrb(x, y, value) {
    const orb = this.physics.add.image(x, y, "xp-orb").setDepth(12);
    orb.body.setAllowGravity(false);
    orb.setCircle(8);
    orb.value = value;
    orb.floatTimer = Phaser.Math.FloatBetween(0, Math.PI * 2);
    orb.trailTimer = 0;
    orb.forcePullUntil = 0;
    orb.forcePullSpeed = 0;
    this.xpOrbs.add(orb);
  }

  spawnXpTrailEffect(orb) {
    const angle = Phaser.Math.Angle.Between(orb.x, orb.y, this.playerHitbox.x, this.playerHitbox.y);
    const trail = this.add
      .image(orb.x, orb.y, "xp-orb")
      .setDepth(11)
      .setScale(Math.max(0.34, orb.scaleX * 0.68))
      .setTint(0xb9f5ff)
      .setAlpha(0.34)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: trail,
      x: trail.x - Math.cos(angle) * 16,
      y: trail.y - Math.sin(angle) * 16,
      scaleX: trail.scaleX * 0.46,
      scaleY: trail.scaleY * 0.46,
      alpha: 0,
      duration: 130,
      ease: "Quad.Out",
      onComplete: () => {
        trail.destroy();
      }
    });
  }

  spawnXpPickupEffect(x, y) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(19)
      .setScale(0.48)
      .setTint(0x8cecff)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(19)
      .setScale(0.34)
      .setTint(0xc9f8ff)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: glow,
      scaleX: 0.98,
      scaleY: 0.98,
      alpha: 0,
      duration: 150,
      ease: "Quad.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: 0.88,
      scaleY: 0.88,
      alpha: 0,
      duration: 170,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  pulseXpBar() {
    this.tweens.killTweensOf(this.xpBarFill);
    this.xpBarFill.setScale(1, 1.38);
    this.tweens.add({
      targets: this.xpBarFill,
      scaleY: 1,
      duration: 180,
      ease: "Back.Out"
    });
  }

  trySpawnRareItem(enemy) {
    const rareOrder = [RARE_ITEM_DEFINITIONS.gold, RARE_ITEM_DEFINITIONS.silver, RARE_ITEM_DEFINITIONS.bronze];

    for (const definition of rareOrder) {
      const dropChance = definition.dropChance + (enemy.isElite ? definition.eliteBonusChance : 0);
      if (Math.random() < dropChance) {
        this.spawnRareItem(enemy.x, enemy.y, definition);
        return;
      }
    }
  }

  spawnGuaranteedEnemyDrops(enemy) {
    const guaranteedDrops = enemy.guaranteedDrops || enemy.enemyDefinition?.guaranteedDrops;
    if (!guaranteedDrops) {
      return false;
    }

    let didSpawn = false;
    const rareDefinition = RARE_ITEM_DEFINITIONS[guaranteedDrops.rareItem];
    const robotDefinition = ROBOT_DROP_DEFINITIONS[guaranteedDrops.robotItem];
    const dropSpread = rareDefinition && robotDefinition
      ? Math.max(64, (rareDefinition.pickupRadius || 28) + (robotDefinition.pickupRadius || 28) * 0.35)
      : 0;

    if (rareDefinition) {
      this.spawnRareItem(enemy.x - dropSpread, enemy.y, rareDefinition);
      didSpawn = true;
    }

    if (robotDefinition) {
      this.spawnRobotItem(enemy.x + dropSpread, enemy.y, robotDefinition);
      didSpawn = true;
    }

    return didSpawn;
  }

  spawnRareItem(x, y, definition) {
    const textureKey = this.textures.exists(definition.textureKey) ? definition.textureKey : "rare-token";
    const item = this.physics.add.image(x, y, textureKey).setDepth(13);
    const sourceImage = item.texture.getSourceImage();
    const pickupRadius = definition.pickupRadius || 24;
    const sourceScale = Math.max(0.001, definition.scale || 1);
    const bodyRadius = Math.max(8, pickupRadius / sourceScale);
    const bodyOffsetX = Math.max(0, (sourceImage?.width || 32) * 0.5 - bodyRadius);
    const bodyOffsetY = Math.max(0, (sourceImage?.height || 32) * 0.5 - bodyRadius);
    item.body.setAllowGravity(false);
    item.body.setVelocity(0, 0);
    item.itemDefinition = definition;
    item.baseX = x;
    item.baseY = y;
    item.baseScale = definition.scale;
    item.effectScale = definition.effectScale || 1;
    item.floatTimer = Phaser.Math.FloatBetween(0, Math.PI * 2);
    item.forcePullUntil = 0;
    item.forcePullSpeed = 0;
    item.setScale(definition.scale);
    item.body.setCircle(bodyRadius, bodyOffsetX, bodyOffsetY);

    if (textureKey === "rare-token") {
      item.setTint(definition.tint);
      item.setBlendMode(Phaser.BlendModes.SCREEN);
    } else {
      item.clearTint();
      item.setBlendMode(Phaser.BlendModes.NORMAL);
    }

    const pillarAsset = RARE_ITEM_PILLAR_EFFECT_ASSETS[definition.id];
    const pillarTint = definition.id === "silver"
      ? 0x45bfff
      : (definition.id === "bronze" ? 0x55f36f : 0xc06bff);
    const pillarGlowTint = definition.id === "silver"
      ? 0x8feaff
      : (definition.id === "bronze" ? 0xb9ff8b : 0xff80f5);
    item.pillarTint = pillarTint;
    item.pillarGlowTint = pillarGlowTint;
    item.beamLines = [];
    item.pillarSparkles = [];

    if (pillarAsset?.animationFrames?.length && this.textures.exists(pillarAsset.animationFrames[0].textureKey)) {
      item.pillarEffect = this.add
        .sprite(x, y + 58, pillarAsset.animationFrames[0].textureKey)
        .setOrigin(0.5, 1)
        .setDepth(10)
        .setAlpha(0.44)
        .setBlendMode(Phaser.BlendModes.ADD);
      item.pillarEffectBaseWidth = 218 * item.effectScale;
      item.pillarEffectBaseHeight = 436 * item.effectScale;
      item.pillarEffect.setDisplaySize(item.pillarEffectBaseWidth, item.pillarEffectBaseHeight);

      if (this.anims.exists(pillarAsset.animationKey)) {
        item.pillarEffect.play(pillarAsset.animationKey);
      }
    }

    item.baseGlow = this.add
      .ellipse(x, y + 25, 138 * item.effectScale, 40 * item.effectScale, pillarGlowTint, 0.52)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.floorFlare = this.add
      .image(x, y + 24, "skill-hit-ring")
      .setDepth(12)
      .setScale(item.effectScale * 1.08, item.effectScale * 0.34)
      .setTint(pillarGlowTint)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(12)
      .setScale(item.effectScale * 0.98)
      .setTint(pillarTint)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(12)
      .setScale(item.effectScale * 0.58)
      .setTint(pillarGlowTint)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.pickupEffectsLayer.add([
      item.pillarEffect,
      item.baseGlow,
      item.floorFlare,
      item.glow,
      item.ring
    ].filter(Boolean));
    this.rareItems.add(item);
  }

  getActiveSpecialItemCount() {
    let count = 0;

    this.specialItems.children.each((item) => {
      if (item.active) {
        count += 1;
      }
    });

    return count;
  }

  trySpawnSpecialItem(enemy) {
    if (this.getActiveSpecialItemCount() >= MAX_ACTIVE_SPECIAL_ITEMS) {
      return;
    }

    const dropOrder = [
      SPECIAL_ITEM_DEFINITIONS.bomb,
      SPECIAL_ITEM_DEFINITIONS.magnet,
      SPECIAL_ITEM_DEFINITIONS.heal
    ];

    for (const definition of dropOrder) {
      const dropChance = definition.dropChance + (enemy.isElite ? definition.eliteBonusChance : 0);
      if (Math.random() < dropChance) {
        this.spawnSpecialItem(enemy.x, enemy.y, definition);
        return;
      }
    }
  }

  spawnSpecialItem(x, y, definition) {
    const item = this.physics.add.image(x, y, definition.textureKey).setDepth(13);
    item.body.setAllowGravity(false);
    item.body.setCircle(10, 8, 8);
    item.body.setVelocity(0, 0);
    item.itemDefinition = definition;
    item.baseX = x;
    item.baseY = y;
    item.baseScale = definition.scale;
    item.floatTimer = Phaser.Math.FloatBetween(0, Math.PI * 2);
    item.setTint(definition.tint);
    item.setScale(definition.scale);
    item.setBlendMode(Phaser.BlendModes.SCREEN);

    item.glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(12)
      .setScale(definition.scale * 1.08)
      .setTint(definition.glowTint)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(12)
      .setScale(definition.scale * 0.86)
      .setTint(definition.tint)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.pickupEffectsLayer.add([item.glow, item.ring]);
    this.specialItems.add(item);
  }

  getActiveRobotItemCount() {
    let count = 0;

    this.robotItems.children.each((item) => {
      if (item.active) {
        count += 1;
      }
    });

    return count;
  }

  trySpawnRobotBossDrop(enemy) {
    if (!enemy.isBoss || Math.random() > ROBOT_BOSS_DROP_CHANCE || this.getActiveRobotItemCount() >= 4) {
      return;
    }

    const candidates = [];
    if ((this.robotState?.missileLevel || 1) < ROBOT_MAX_LEVEL) {
      candidates.push(ROBOT_DROP_DEFINITIONS.missileChest);
    }
    if ((this.robotState?.healLevel || 1) < ROBOT_MAX_LEVEL) {
      candidates.push(ROBOT_DROP_DEFINITIONS.healChest);
    }
    if (this.getRobotAbilityChoices("missile").length > 0) {
      candidates.push(ROBOT_DROP_DEFINITIONS.tuningVaseGold);
    }
    if (this.getRobotAbilityChoices("field").length > 0) {
      candidates.push(ROBOT_DROP_DEFINITIONS.tuningVaseSilver);
    }

    if (!candidates.length) {
      return;
    }

    const definition = this.pickWeightedRobotDrop(candidates);
    this.spawnRobotItem(enemy.x, enemy.y, definition);
  }

  pickWeightedRobotDrop(definitions) {
    const totalWeight = definitions.reduce((sum, definition) => sum + (definition.weight || 1), 0);
    let roll = Phaser.Math.FloatBetween(0, totalWeight);

    for (const definition of definitions) {
      roll -= definition.weight || 1;
      if (roll <= 0) {
        return definition;
      }
    }

    return definitions[0];
  }

  spawnRobotItem(x, y, definition) {
    const textureKey = this.textures.exists(definition.textureKey) ? definition.textureKey : "rare-token";
    const item = this.physics.add.image(x, y, textureKey).setDepth(13);
    const frame = item.frame;
    const pickupRadius = definition.pickupRadius || 28;
    const sourceScale = Math.max(0.001, definition.scale || 1);
    const bodyRadius = Math.max(8, pickupRadius / sourceScale);
    const bodyOffsetX = Math.max(0, (frame?.width || 32) * 0.5 - bodyRadius);
    const bodyOffsetY = Math.max(0, (frame?.height || 32) * 0.5 - bodyRadius);

    item.body.setAllowGravity(false);
    item.body.setVelocity(0, 0);
    item.body.setCircle(bodyRadius, bodyOffsetX, bodyOffsetY);
    item.itemDefinition = definition;
    item.baseX = x;
    item.baseY = y;
    item.baseScale = definition.scale;
    item.floatTimer = Phaser.Math.FloatBetween(0, Math.PI * 2);
    item.forcePullUntil = 0;
    item.forcePullSpeed = 0;
    item.setScale(definition.scale);

    if (textureKey === "rare-token") {
      item.setTint(definition.tint);
      item.setBlendMode(Phaser.BlendModes.SCREEN);
    }

    item.beam = this.add
      .rectangle(x, y - 74, 44, 210, definition.tint, 0.22)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(12)
      .setScale(0.82)
      .setTint(definition.glowTint)
      .setAlpha(0.28)
      .setBlendMode(Phaser.BlendModes.ADD);
    item.ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(12)
      .setScale(0.58)
      .setTint(definition.tint)
      .setAlpha(0.24)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.pickupEffectsLayer.add([item.beam, item.glow, item.ring]);
    this.robotItems.add(item);
  }

  updateRobotItems(delta) {
    this.robotItems.children.each((item) => {
      if (!item.active) {
        return;
      }

      const definition = item.itemDefinition;
      const isForcedPull = this.time.now < (item.forcePullUntil || 0);
      item.floatTimer += delta / 260;

      if (isForcedPull) {
        const targetX = this.playerHitbox.x;
        const targetY = this.playerHitbox.y - 8;
        const deltaX = targetX - item.baseX;
        const deltaY = targetY - item.baseY;
        const distance = Math.hypot(deltaX, deltaY);
        const maxStep = (item.forcePullSpeed || 820) * (delta / 1000);
        const moveRatio = distance > 0 ? Math.min(1, maxStep / distance) : 1;
        item.baseX += deltaX * moveRatio;
        item.baseY += deltaY * moveRatio;
      }

      const pulse = (Math.sin(item.floatTimer * 1.35) + 1) * 0.5;
      const bob = isForcedPull ? 0 : Math.sin(item.floatTimer) * 5;
      item.setPosition(item.baseX, item.baseY + bob);
      item.setScale(item.baseScale * (0.94 + pulse * 0.1));
      item.setAlpha(0.92 + pulse * 0.08);

      if (item.beam?.active) {
        item.beam.setPosition(item.x, item.y - 74);
        item.beam.setDisplaySize(40 + pulse * 14, 196 + pulse * 44);
        item.beam.setAlpha(0.18 + pulse * 0.18);
      }
      if (item.glow?.active) {
        item.glow.setPosition(item.x, item.y);
        item.glow.setScale(0.76 + pulse * 0.22);
        item.glow.setAlpha(0.22 + pulse * 0.18);
      }
      if (item.ring?.active) {
        item.ring.setPosition(item.x, item.y);
        item.ring.rotation += 0.018 * (delta / 16.6667);
        item.ring.setScale(0.54 + pulse * 0.24);
        item.ring.setAlpha(0.14 + pulse * 0.2);
      }
    });
  }

  destroyRobotItem(item) {
    item.beam?.destroy();
    item.glow?.destroy();
    item.ring?.destroy();
    item.destroy();
  }

  destroySpecialItem(item) {
    if (item.glow) {
      item.glow.destroy();
    }
    if (item.ring) {
      item.ring.destroy();
    }
    item.destroy();
  }

  destroyRareItem(item) {
    if (item.pillarEffect) {
      item.pillarEffect.destroy();
    }
    if (item.outerBeam) {
      item.outerBeam.destroy();
    }
    if (item.innerBeam) {
      item.innerBeam.destroy();
    }
    if (item.beamCore) {
      item.beamCore.destroy();
    }
    item.beamLines?.forEach((line) => {
      line.destroy();
    });
    if (item.baseGlow) {
      item.baseGlow.destroy();
    }
    if (item.floorFlare) {
      item.floorFlare.destroy();
    }
    if (item.glow) {
      item.glow.destroy();
    }
    if (item.ring) {
      item.ring.destroy();
    }
    item.pillarSparkles?.forEach((sparkle) => {
      sparkle.destroy();
    });
    item.destroy();
  }

  spawnRareItemPickupEffect(x, y, definition) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(20)
      .setScale(0.7)
      .setTint(definition.glowTint)
      .setAlpha(0.84)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(20)
      .setScale(0.48)
      .setTint(definition.tint)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);

    const pillar = this.add
      .rectangle(x, y - 32, 22, 150, definition.glowTint, 0.18)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add([glow, ring, pillar]);

    this.tweens.add({
      targets: glow,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 230,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      duration: 250,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });

    this.tweens.add({
      targets: pillar,
      scaleY: 1.24,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => {
        pillar.destroy();
      }
    });
  }

  spawnSpecialItemPickupEffect(x, y, definition) {
    const effectType = definition.effectType;
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(20)
      .setScale(effectType === "bomb" ? 1.08 : 0.72)
      .setTint(definition.glowTint)
      .setAlpha(effectType === "heal" ? 0.76 : 0.84)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(20)
      .setScale(effectType === "bomb" ? 0.88 : 0.52)
      .setTint(definition.tint)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.skillEffectsLayer.add([glow, ring]);

    this.tweens.add({
      targets: glow,
      scaleX: glow.scaleX * (effectType === "bomb" ? 2.3 : 1.7),
      scaleY: glow.scaleY * (effectType === "bomb" ? 2.3 : 1.7),
      alpha: 0,
      duration: effectType === "bomb" ? 260 : 220,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    this.tweens.add({
      targets: ring,
      scaleX: ring.scaleX * (effectType === "magnet" ? 2.4 : 1.9),
      scaleY: ring.scaleY * (effectType === "magnet" ? 2.4 : 1.9),
      alpha: 0,
      duration: effectType === "magnet" ? 320 : 240,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });

    if (effectType === "magnet") {
      const outerRing = this.add
        .image(x, y, "skill-hit-ring")
        .setDepth(20)
        .setScale(0.94)
        .setTint(definition.glowTint)
        .setAlpha(0.34)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.skillEffectsLayer.add(outerRing);
      this.tweens.add({
        targets: outerRing,
        scaleX: 2.9,
        scaleY: 2.9,
        alpha: 0,
        duration: 360,
        ease: "Quad.Out",
        onComplete: () => {
          outerRing.destroy();
        }
      });
    }
  }

  handleXpPickup(playerHitbox, orb) {
    if (!orb.active) {
      return;
    }

    this.gainExperience(orb.value);
    this.spawnXpPickupEffect(playerHitbox.x, playerHitbox.y - 8);
    this.pulseXpBar();
    orb.destroy();
  }

  handleRareItemPickup(playerHitbox, item) {
    if (!item.active) {
      return;
    }

    const definition = item.itemDefinition;
    this.gainExperience(definition.xpValue);
    this.setLastPickupNotice(`${definition.label.toUpperCase()} +${definition.xpValue} XP / +${definition.coinValue.toLocaleString()} C`);
    this.addCoins(definition.coinValue);
    this.spawnRareItemPickupEffect(playerHitbox.x, playerHitbox.y - 10, definition);
    this.pulseXpBar();
    this.destroyRareItem(item);
  }

  handleSpecialItemPickup(playerHitbox, item) {
    if (!item.active || !item.itemDefinition) {
      return;
    }

    const definition = item.itemDefinition;

    if (definition.effectType === "heal") {
      this.applyHealItemEffect(definition);
    } else if (definition.effectType === "magnet") {
      this.applyMagnetItemEffect(definition);
    } else if (definition.effectType === "bomb") {
      this.applyBombItemEffect(definition);
    }

    this.destroySpecialItem(item);
  }

  handleRobotItemPickup(playerHitbox, item) {
    if (!item.active || !item.itemDefinition) {
      return;
    }

    const definition = item.itemDefinition;
    this.spawnRobotItemPickupEffect(playerHitbox.x, playerHitbox.y - 10, definition);
    this.destroyRobotItem(item);

    if (definition.effectType === "robotMissileLevel") {
      this.upgradeRobotMissileLevel();
    } else if (definition.effectType === "robotHealLevel") {
      this.upgradeRobotHealLevel();
    } else if (definition.effectType === "robotMissileAbilityChoice") {
      this.addRobotSubsystemXp("missile", ROBOT_VASE_XP_BONUS, { silent: false });
      this.showRobotAbilityChoices(definition, "missile");
    } else if (definition.effectType === "robotFieldAbilityChoice") {
      this.addRobotSubsystemXp("field", ROBOT_VASE_XP_BONUS, { silent: false });
      this.showRobotAbilityChoices(definition, "field");
    }
  }

  spawnRobotItemPickupEffect(x, y, definition) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(23)
      .setScale(0.88)
      .setTint(definition.glowTint)
      .setAlpha(0.86)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .image(x, y, "skill-hit-ring")
      .setDepth(23)
      .setScale(0.58)
      .setTint(definition.tint)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.robotEffectsLayer.add([glow, ring]);
    this.tweens.add({
      targets: glow,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 260,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });
    this.tweens.add({
      targets: ring,
      scaleX: 1.34,
      scaleY: 1.34,
      alpha: 0,
      duration: 270,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  upgradeRobotMissileLevel() {
    const currentLevel = this.robotState?.missileLevel || 1;
    if (currentLevel >= ROBOT_MAX_LEVEL) {
      this.setLastPickupNotice("ROBOT MISSILE MAX");
      return;
    }

    this.robotState.missileLevel = currentLevel + 1;
    if (this.robotState.missileLevel >= ROBOT_MAX_LEVEL) {
      this.robotState.missileXp = 0;
    }
    this.updateRobotVisualLevel();
    this.updateHudRobotPanel();
    this.setLastPickupNotice(`ROBOT MISSILE Lv.${this.robotState.missileLevel}`);
  }

  upgradeRobotHealLevel() {
    const currentLevel = this.robotState?.healLevel || 1;
    if (currentLevel >= ROBOT_MAX_LEVEL) {
      this.setLastPickupNotice("ROBOT FIELD MAX");
      return;
    }

    this.robotState.healLevel = currentLevel + 1;
    if (this.robotState.healLevel >= ROBOT_MAX_LEVEL) {
      this.robotState.healXp = 0;
    }
    this.robotState.healTimer = Math.min(this.robotState.healTimer, this.getRobotHealInterval() * 0.72);
    this.updateRobotVisualLevel();
    this.updateRobotRecoveryFieldVisual(0);
    this.updateHudRobotPanel();
    this.setLastPickupNotice(`ROBOT FIELD Lv.${this.robotState.healLevel}`);
  }

  showRobotAbilityChoices(definition, group = this.getRobotAbilityGroup(definition)) {
    const choices = this.getRobotAbilityChoices(group);
    if (!choices.length) {
      this.setLastPickupNotice(group === "field" ? "ROBOT FIELD TUNE MAX" : "ROBOT MISSILE TUNE MAX");
      return;
    }

    this.levelUpActive = true;
    this.cancelActiveEnemyBeamCharges();
    this.physics.world.pause();
    this.showOverlay(
      group === "field" ? "Field Tuning" : "Missile Tuning",
      `${definition.label}\nロボット能力を1つ選択`,
      Phaser.Utils.Array.Shuffle(choices).slice(0, 2)
    );
  }

  getRobotAbilityGroup(definition) {
    if (definition?.effectType === "robotFieldAbilityChoice" || definition?.id === "robotTuningVaseSilver") {
      return "field";
    }

    return "missile";
  }

  getRobotAbilityChoices(group = "all") {
    if (!this.robotState) {
      return [];
    }

    const missileChoices = [
      this.buildRobotAbilityChoice(
        "fireRateLevel",
        "Rapid Launcher",
        `発射間隔 ${this.getRobotMissileFireInterval()}ms -> ${this.getRobotMissileFireIntervalForLevel(this.robotState.fireRateLevel + 1)}ms`
      ),
      this.buildRobotAbilityChoice(
        "damageLevel",
        "Warhead Boost",
        `ミサイル威力 ${this.getRobotMissileDamage()} -> ${this.getRobotMissileDamageForLevel(this.robotState.damageLevel + 1, this.robotState.missileLevel)}`
      )
    ];
    const fieldChoices = [
      this.buildRobotAbilityChoice(
        "healIntervalLevel",
        "Field Cycle",
        `回復間隔 ${this.getRobotHealInterval()}ms -> ${this.getRobotHealIntervalForLevel(this.robotState.healIntervalLevel + 1, this.robotState.healLevel)}ms`
      ),
      this.buildRobotAbilityChoice(
        "healAmountLevel",
        "Care Output",
        `回復量 ${this.getRobotHealAmount()} -> ${this.getRobotHealAmountForLevel(this.robotState.healAmountLevel + 1, this.robotState.healLevel)}`
      )
    ];

    if (group === "missile") {
      return missileChoices.filter(Boolean);
    }
    if (group === "field") {
      return fieldChoices.filter(Boolean);
    }

    return [...missileChoices, ...fieldChoices].filter(Boolean);
  }

  buildRobotAbilityChoice(key, title, description) {
    const currentLevel = this.robotState?.[key] || 0;
    if (currentLevel >= ROBOT_ABILITY_MAX_LEVEL) {
      return null;
    }

    return {
      title: `${title} Lv.${currentLevel + 1}`,
      description,
      onSelect: () => {
        this.robotState[key] = currentLevel + 1;
        if (key === "healIntervalLevel") {
          this.robotState.healTimer = Math.min(this.robotState.healTimer, this.getRobotHealInterval() * 0.72);
        }
        this.updateHudRobotPanel();
        this.setLastPickupNotice(`${title.toUpperCase()} Lv.${currentLevel + 1}`);
      }
    };
  }

  applyHealItemEffect(definition) {
    const previousHp = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + definition.healAmount);
    const healedAmount = this.stats.hp - previousHp;
    this.spawnSpecialItemPickupEffect(this.playerHitbox.x, this.playerHitbox.y - 10, definition);
    this.spawnPlayerHealNumber(healedAmount);
    this.setLastPickupNotice(healedAmount > 0 ? `HEAL +${healedAmount} HP` : "HEAL FULL");
  }

  applyMagnetItemEffect(definition) {
    let orbCount = 0;
    let rareCount = 0;
    let robotCount = 0;

    this.xpOrbs.children.each((orb) => {
      if (!orb.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(orb.x, orb.y, this.playerHitbox.x, this.playerHitbox.y);
      if (distance <= definition.magnetRadius) {
        this.setPickupPullToPlayer(orb, definition.magnetDurationMs, definition.magnetPullSpeed);
        orbCount += 1;
      }
    });

    this.rareItems.children.each((item) => {
      if (!item.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(item.x, item.y, this.playerHitbox.x, this.playerHitbox.y);
      if (distance <= definition.magnetRadius) {
        this.setPickupPullToPlayer(item, definition.magnetDurationMs, definition.magnetPullSpeed);
        rareCount += 1;
      }
    });

    this.robotItems.children.each((item) => {
      if (!item.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(item.x, item.y, this.playerHitbox.x, this.playerHitbox.y);
      if (distance <= definition.magnetRadius) {
        this.setPickupPullToPlayer(item, definition.magnetDurationMs, definition.magnetPullSpeed);
        robotCount += 1;
      }
    });

    this.spawnSpecialItemPickupEffect(this.playerHitbox.x, this.playerHitbox.y - 10, definition);
    this.setLastPickupNotice(`MAGNET XP ${orbCount}${rareCount > 0 ? ` / RARE ${rareCount}` : ""}${robotCount > 0 ? ` / ROBOT ${robotCount}` : ""}`);
  }

  applyBombItemEffect(definition) {
    this.spawnSpecialItemPickupEffect(this.playerHitbox.x, this.playerHitbox.y - 10, definition);
    if (this.isGensoKnightsEventActive()) {
      this.setLastPickupNotice("GENSO KNIGHTS ACTIVE");
      return;
    }
    this.triggerSupportAttack(this.pickSupportAttackDefinition());
  }

  pickSupportAttackDefinition() {
    const canTriggerGensoKnights = !this.isGensoKnightsEventActive()
      && !(this.activeSupportAttacks?.length)
      && this.lastSupportAttackId !== GENSO_KNIGHTS_SUPPORT_DEFINITION.id;
    if (canTriggerGensoKnights && Math.random() < GENSO_KNIGHTS_SUPPORT_CHANCE) {
      return GENSO_KNIGHTS_SUPPORT_DEFINITION;
    }

    const candidates = SUPPORT_ATTACK_DEFINITIONS.filter((candidate) => {
      return candidate.id !== this.lastSupportAttackId;
    });
    const pool = candidates.length > 0 ? candidates : SUPPORT_ATTACK_DEFINITIONS;
    return Phaser.Utils.Array.GetRandom(pool) || SUPPORT_ATTACK_DEFINITIONS[0];
  }

  triggerSupportAttack(definition) {
    if (!definition) {
      return;
    }

    if (definition.type === "gensoKnights") {
      this.triggerGensoKnightsSupportAttack(definition);
      return;
    }

    if (definition.type === "timingCoin") {
      this.triggerTimingCoinSupportAttack(definition);
      return;
    }

    if (this.isGensoKnightsEventActive()) {
      return;
    }

    this.lastSupportAttackId = definition.id;
    this.startSupportAttackAudio(definition);
    this.showSupportAttackCutin(definition);
    const support = this.createSupportAttackInstance(definition);
    this.activeSupportAttacks.push(support);
    this.cameras.main.shake(120, 0.0018);
    this.setLastPickupNotice(`SUPPORT ${definition.label}`);
  }

  triggerTimingCoinSupportAttack(definition) {
    if (this.isGensoKnightsEventActive()) {
      return;
    }

    this.lastSupportAttackId = definition.id;
    this.startSupportAttackBgmDucking();
    const support = this.createSupportAttackInstance(definition);
    support.timingCoinState = {
      titleLetterIndex: 0,
      titleObjects: [],
      uiObjects: [],
      resolved: false,
      success: false
    };
    this.activeSupportAttacks.push(support);
    this.cameras.main.shake(160, 0.002);
    this.setLastPickupNotice(`SUPPORT ${definition.label}`);
  }

  playSupportAttackCutinVoice(definition) {
    if (!definition?.cutinVoiceKey || !this.cache.audio.exists(definition.cutinVoiceKey)) {
      return;
    }

    const volume = Phaser.Math.Clamp(definition.cutinVoiceVolume ?? 0.88, 0, 1);
    if (this.activeSupportCutinVoice) {
      this.activeSupportCutinVoice.stop();
      this.activeSupportCutinVoice.destroy();
      this.activeSupportCutinVoice = null;
    }

    const voice = this.sound.add(definition.cutinVoiceKey, { volume });
    this.activeSupportCutinVoice = voice;
    voice.once("complete", () => {
      if (this.activeSupportCutinVoice === voice) {
        this.activeSupportCutinVoice = null;
      }
      voice.destroy();
    });
    voice.play();
  }

  playSupportAttackSe(audioKey, volume = 0.8) {
    if (!audioKey || !this.cache.audio.exists(audioKey)) {
      return;
    }

    this.sound.play(audioKey, {
      volume: Phaser.Math.Clamp(volume, 0, 1)
    });
  }

  showSupportAttackCutin(definition) {
    if (!this.textures.exists(definition.cutinTextureKey)) {
      return;
    }

    this.playSupportAttackCutinVoice(definition);
    const cutinHoldMs = 1560;
    const enterMs = 340;
    const exitMs = 360;
    const shade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setDepth(640);
    const cutin = this.add
      .image(GAME_WIDTH + 680, GAME_HEIGHT * 0.48, definition.cutinTextureKey)
      .setDepth(641)
      .setAlpha(0.98);
    const streak = this.add
      .rectangle(GAME_WIDTH + 650, GAME_HEIGHT * 0.48 + 120, 1040, 10, definition.glowTint, 0.68)
      .setDepth(642)
      .setAngle(-7)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scaleImageToFitBox(cutin, 1180, 330);

    if (this.uiContainer) {
      this.uiContainer.add([shade, cutin, streak]);
    } else {
      [shade, cutin, streak].forEach((object) => object.setScrollFactor(0));
    }

    this.tweens.add({
      targets: shade,
      alpha: 0.44,
      duration: enterMs,
      yoyo: true,
      hold: cutinHoldMs,
      ease: "Sine.InOut",
      onComplete: () => {
        shade.destroy();
      }
    });
    this.tweens.add({
      targets: [cutin, streak],
      x: `-=${GAME_WIDTH + 140}`,
      duration: enterMs,
      ease: "Sine.Out"
    });
    this.tweens.add({
      targets: [cutin, streak],
      x: `-=${GAME_WIDTH + 520}`,
      alpha: 0,
      delay: enterMs + cutinHoldMs,
      duration: exitMs,
      ease: "Sine.In",
      onComplete: () => {
        cutin.destroy();
        streak.destroy();
      }
    });
  }

  isGensoKnightsEventActive() {
    return !!this.gensoKnightsEvent && !this.gensoKnightsEvent.ended;
  }

  triggerGensoKnightsSupportAttack(definition = GENSO_KNIGHTS_SUPPORT_DEFINITION) {
    if (this.isGensoKnightsEventActive()) {
      return;
    }

    if (this.activeSupportAttacks?.length) {
      this.activeSupportAttacks.forEach((support) => this.finishSupportAttack(support, false));
      this.activeSupportAttacks = [];
    }

    this.lastSupportAttackId = definition.id;
    this.supportAttackBgmDuckingCount = 0;
    this.fadeBgmToVolume(DEFAULT_BGM_VOLUME, 0);
    this.playGensoKnightsBgm(definition);

    const event = {
      definition,
      elapsedMs: 0,
      bosses: [],
      characters: [],
      effects: [],
      coinDropCount: 0,
      attackStarted: false,
      finishing: false,
      ended: false
    };
    this.gensoKnightsEvent = event;
    event.bosses = this.spawnGensoKnightsBosses(definition);

    this.cameras.main.shake(220, 0.0022);
    this.setLastPickupNotice("SPECIAL SUPPORT 元素騎士");
  }

  playGensoKnightsBgm(definition) {
    this.stopBgm();
    this.stopGensoKnightsBgm(false, false);

    if (!definition?.bgmKey || !this.cache.audio.exists(definition.bgmKey)) {
      return;
    }

    const targetVolume = Phaser.Math.Clamp(definition.bgmVolume ?? DEFAULT_BGM_VOLUME, 0, 1);
    const bgm = this.sound.add(definition.bgmKey, {
      loop: false,
      volume: 0
    });
    this.activeGensoKnightsBgm = bgm;
    bgm.play({ loop: false, volume: 0 });

    const volumeState = { volume: 0 };
    this.gensoKnightsBgmTween = this.tweens.add({
      targets: volumeState,
      volume: targetVolume,
      duration: 650,
      ease: "Sine.InOut",
      onUpdate: () => {
        if (this.activeGensoKnightsBgm === bgm) {
          bgm.setVolume(volumeState.volume);
        }
      },
      onComplete: () => {
        if (this.activeGensoKnightsBgm === bgm) {
          bgm.setVolume(targetVolume);
        }
        this.gensoKnightsBgmTween = null;
      }
    });
  }

  stopGensoKnightsBgm(restoreNormalBgm = true, fade = true) {
    if (this.gensoKnightsBgmTween) {
      this.gensoKnightsBgmTween.stop();
      this.gensoKnightsBgmTween = null;
    }

    const bgm = this.activeGensoKnightsBgm;
    this.activeGensoKnightsBgm = null;
    const restore = () => {
      if (restoreNormalBgm && !this.gameOver) {
        this.playSelectedBgm();
      }
    };

    if (!bgm) {
      restore();
      return;
    }

    if (!fade) {
      bgm.stop();
      bgm.destroy();
      restore();
      return;
    }

    const volumeState = {
      volume: Number.isFinite(bgm.volume) ? bgm.volume : DEFAULT_BGM_VOLUME
    };
    this.gensoKnightsBgmTween = this.tweens.add({
      targets: volumeState,
      volume: 0,
      duration: 650,
      ease: "Sine.InOut",
      onUpdate: () => {
        bgm.setVolume(volumeState.volume);
      },
      onComplete: () => {
        bgm.stop();
        bgm.destroy();
        this.gensoKnightsBgmTween = null;
        restore();
      }
    });
  }

  showGensoKnightsCutin(definition) {
    if (!this.textures.exists(definition.cutinTextureKey)) {
      return;
    }

    const shade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x00122b, 0)
      .setDepth(650);
    const cutin = this.add
      .image(GAME_WIDTH + 760, GAME_HEIGHT * 0.48, definition.cutinTextureKey)
      .setDepth(651)
      .setAlpha(0.99);
    const streak = this.add
      .rectangle(GAME_WIDTH + 720, GAME_HEIGHT * 0.48 + 142, 1220, 12, definition.glowTint, 0.72)
      .setDepth(652)
      .setAngle(-7)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scaleImageToFitBox(cutin, 1260, 540);

    if (this.uiContainer) {
      this.uiContainer.add([shade, cutin, streak]);
    } else {
      [shade, cutin, streak].forEach((object) => object.setScrollFactor(0));
    }

    const enterMs = 440;
    const holdMs = GENSO_KNIGHTS_CUTIN_HOLD_MS;
    const exitMs = 520;
    this.tweens.add({
      targets: shade,
      alpha: 0.52,
      duration: enterMs,
      yoyo: true,
      hold: holdMs,
      ease: "Sine.InOut",
      onComplete: () => shade.destroy()
    });
    this.tweens.add({
      targets: [cutin, streak],
      x: `-=${GAME_WIDTH + 160}`,
      duration: enterMs,
      ease: "Sine.Out"
    });
    this.tweens.add({
      targets: [cutin, streak],
      x: `-=${GAME_WIDTH + 620}`,
      alpha: 0,
      delay: enterMs + holdMs,
      duration: exitMs,
      ease: "Sine.In",
      onComplete: () => {
        cutin.destroy();
        streak.destroy();
      }
    });
  }

  spawnGensoKnightsBosses(definition) {
    const playerX = this.playerHitbox?.x || WORLD_WIDTH / 2;
    const playerY = this.playerHitbox?.y || WORLD_HEIGHT / 2;
    const bounds = this.getStagePlayBounds(this.currentStage, 320) || {
      left: 320,
      right: WORLD_WIDTH - 320,
      top: 320,
      bottom: WORLD_HEIGHT - 320
    };
    const offsets = [
      { x: -260, y: -130 },
      { x: 260, y: -130 },
      { x: -260, y: 165 },
      { x: 260, y: 165 }
    ];

    return definition.bossAssets.map((asset, index) => {
      const point = this.clampPointToBounds(playerX + offsets[index].x, playerY + offsets[index].y, bounds);
      const shadow = this.add
        .ellipse(point.x, point.y + 108, 210, 54, 0x000000, 0.3)
        .setDepth(15.6)
        .setAlpha(0);
      const sprite = this.add
        .image(point.x, point.y, this.textures.exists(asset.textureKey) ? asset.textureKey : "skill-hit-glow")
        .setDepth(18.6)
        .setAlpha(0);
      this.scaleWorldImageToFit(sprite, GENSO_KNIGHTS_BOSS_LONGEST_SIDE);
      sprite.baseScaleX = sprite.scaleX;
      sprite.baseScaleY = sprite.scaleY;

      this.tweens.add({
        targets: [sprite, shadow],
        alpha: { from: 0, to: 1 },
        duration: 450,
        ease: "Quad.Out"
      });

      return {
        index,
        sprite,
        shadow,
        x: point.x,
        y: point.y,
        shadowOffsetY: 108,
        attackTimerMs: Phaser.Math.Between(520, 1500) + index * 240,
        nextAttackMs: Phaser.Math.Between(2100, 3200),
        attacking: false,
        defeated: false,
        coinsDropped: false
      };
    });
  }

  spawnGensoKnightsCharacters(event) {
    const definition = event.definition;
    const playerX = this.playerHitbox?.x || WORLD_WIDTH / 2;
    const playerY = this.playerHitbox?.y || WORLD_HEIGHT / 2;
    const bounds = this.getStagePlayBounds(this.currentStage, 180) || {
      left: 180,
      right: WORLD_WIDTH - 180,
      top: 180,
      bottom: WORLD_HEIGHT - 180
    };
    const targetHeight = (this.playerSprite?.displayHeight || 104) * GENSO_KNIGHTS_CHARACTER_HEIGHT_MULTIPLIER;

    event.characters = definition.characters.map((characterDefinition) => {
      const firstFrame = characterDefinition.animationFrames[0];
      const point = this.clampPointToBounds(
        playerX + characterDefinition.offsetX,
        playerY + characterDefinition.offsetY,
        bounds
      );
      const shadow = this.add
        .ellipse(point.x, point.y + targetHeight * 0.44, 72, 18, 0x000000, 0.28)
        .setDepth(15.8)
        .setAlpha(0);
      const sprite = this.add
        .image(point.x, point.y, this.textures.exists(firstFrame.textureKey) ? firstFrame.textureKey : "skill-hit-glow")
        .setDepth(20.4)
        .setAlpha(0);
      const guardAura = characterDefinition.role === "bossTank"
        ? this.add
          .ellipse(point.x, point.y + targetHeight * 0.34, 132, 44, 0x73d7ff, 0.08)
          .setDepth(19.9)
          .setStrokeStyle(2, 0xb8f5ff, 0.58)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
        : null;
      const frameHeight = Math.max(sprite.frame?.height || targetHeight, 1);
      sprite.setScale(targetHeight / frameHeight);

      this.tweens.add({
        targets: [sprite, shadow, guardAura].filter(Boolean),
        alpha: { from: 0, to: 1 },
        duration: 280,
        ease: "Quad.Out"
      });

      return {
        definition: characterDefinition,
        sprite,
        shadow,
        guardAura,
        x: point.x,
        y: point.y,
        homeX: point.x,
        homeY: point.y,
        shadowOffsetY: targetHeight * 0.44,
        frameIndex: 0,
        frameTimerMs: 0,
        attackTimerMs: Phaser.Math.Between(80, 340),
        actionLocked: false,
        patrolTimerMs: Phaser.Math.Between(0, 900)
      };
    });
  }

  updateGensoKnightsEvent(delta) {
    const event = this.gensoKnightsEvent;
    if (!event || event.ended) {
      return;
    }

    event.elapsedMs += delta;
    this.updateGensoKnightsBossVisuals(event, delta);

    if (!event.attackStarted && event.elapsedMs >= GENSO_KNIGHTS_INTRO_MS) {
      event.attackStarted = true;
      this.showGensoKnightsCutin(event.definition);
      this.spawnGensoKnightsCharacters(event);
      this.cameras.main.flash(180, 170, 230, 255, false, null, null, this);
    }

    if (event.attackStarted && !event.finishing) {
      this.updateGensoKnightsCharacters(event, delta);
    }

    if (!event.finishing && event.elapsedMs >= GENSO_KNIGHTS_ATTACK_END_MS) {
      this.finishGensoKnightsEvent(event);
    }

    if (event.elapsedMs >= GENSO_KNIGHTS_EVENT_END_MS) {
      this.cleanupGensoKnightsEvent(event, true);
    }
  }

  updateGensoKnightsBossVisuals(event, delta) {
    event.bosses.forEach((boss) => {
      if (!boss.sprite?.active || boss.defeated) {
        return;
      }

      boss.pulseMs = (boss.pulseMs || 0) + delta;
      const pulse = Math.sin(boss.pulseMs * 0.004 + boss.index * 0.7);
      if (!event.finishing) {
        const bossTarget = this.getGensoKnightsBossTarget(event, boss);
        this.updateGensoKnightsBossMovement(boss, bossTarget, delta);
        this.updateGensoKnightsBossAttack(event, boss, bossTarget, delta);
      }

      boss.sprite.setPosition(boss.x, boss.y);
      boss.shadow?.setPosition(boss.x, boss.y + (boss.shadowOffsetY || 108));
      boss.sprite.setScale(
        (boss.sprite.baseScaleX || boss.sprite.scaleX) * (1 + pulse * 0.018),
        (boss.sprite.baseScaleY || boss.sprite.scaleY) * (1 + pulse * 0.018)
      );
      boss.shadow?.setScale(1 + pulse * 0.04, 1 + pulse * 0.02);
    });
  }

  getGensoKnightsBossTarget(event, boss) {
    if (event.attackStarted && event.characters?.length) {
      const tankCharacters = event.characters.filter((character) => {
        return character.definition.role === "bossTank" && character.sprite?.active;
      });
      if (tankCharacters.length > 0) {
        return tankCharacters[boss.index % tankCharacters.length];
      }

      return event.characters[boss.index % event.characters.length] || event.characters[0];
    }

    if (!this.playerHitbox) {
      return null;
    }

    return {
      x: this.playerHitbox.x,
      y: this.playerHitbox.y + 4,
      sprite: this.playerSprite,
      shadow: this.playerShadow,
      isPlayerTarget: true
    };
  }

  updateGensoKnightsBossMovement(boss, targetCharacter, delta) {
    if (!targetCharacter?.sprite?.active || boss.attacking) {
      return;
    }

    const targetX = targetCharacter.x;
    const targetY = targetCharacter.y + Math.max(targetCharacter.sprite.displayHeight || 120, 80) * 0.26;
    const distance = Phaser.Math.Distance.Between(boss.x, boss.y, targetX, targetY);
    if (distance <= GENSO_KNIGHTS_BOSS_STOP_DISTANCE) {
      return;
    }

    const moveDistance = Math.min(
      distance - GENSO_KNIGHTS_BOSS_STOP_DISTANCE,
      GENSO_KNIGHTS_BOSS_MOVE_SPEED * (delta / 1000)
    );
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, targetX, targetY);
    boss.x += Math.cos(angle) * moveDistance;
    boss.y += Math.sin(angle) * moveDistance;
  }

  updateGensoKnightsBossAttack(event, boss, targetCharacter, delta) {
    if (!targetCharacter?.sprite?.active || boss.attacking) {
      return;
    }

    boss.attackTimerMs = (boss.attackTimerMs || 0) + delta;
    if (boss.attackTimerMs < (boss.nextAttackMs || 2600)) {
      return;
    }

    boss.attackTimerMs = 0;
    boss.nextAttackMs = Phaser.Math.Between(2200, 3400);
    boss.attacking = true;
    this.spawnGensoKnightsBossTelegraph(event, boss, targetCharacter);
    this.time.delayedCall(GENSO_KNIGHTS_BOSS_WARN_MS, () => {
      if (!this.gensoKnightsEvent || this.gensoKnightsEvent !== event || event.ended || boss.defeated) {
        return;
      }

      const targetX = targetCharacter.x;
      const targetY = targetCharacter.y + Math.max(targetCharacter.sprite?.displayHeight || 120, 80) * 0.2;
      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, targetX, targetY);
      const lungeX = boss.x + Math.cos(angle) * GENSO_KNIGHTS_BOSS_LUNGE_DISTANCE;
      const lungeY = boss.y + Math.sin(angle) * GENSO_KNIGHTS_BOSS_LUNGE_DISTANCE;
      this.tweens.add({
        targets: boss,
        x: lungeX,
        y: lungeY,
        duration: 260,
        ease: "Cubic.Out",
        onComplete: () => {
          this.triggerGensoKnightsGuardBlock(event, boss, targetCharacter);
          boss.attacking = false;
        }
      });
    });
  }

  triggerGensoKnightsGuardBlock(event, boss, character) {
    if (event.ended || event.finishing || character.definition?.role !== "bossTank" || !character.sprite?.active) {
      return;
    }

    const angleFromBoss = Phaser.Math.Angle.Between(boss.x, boss.y, character.x, character.y);
    const bounds = this.getStagePlayBounds(this.currentStage, 160) || {
      left: 160,
      right: WORLD_WIDTH - 160,
      top: 160,
      bottom: WORLD_HEIGHT - 160
    };
    const knockbackPoint = this.clampPointToBounds(
      character.x + Math.cos(angleFromBoss) * GENSO_KNIGHTS_GUARD_KNOCKBACK_DISTANCE,
      character.y + Math.sin(angleFromBoss) * GENSO_KNIGHTS_GUARD_KNOCKBACK_DISTANCE * 0.72,
      bounds
    );

    this.tweens.killTweensOf(character);
    character.actionLocked = true;
    character.blocking = true;
    character.guardBlockSerial = (character.guardBlockSerial || 0) + 1;
    const guardBlockSerial = character.guardBlockSerial;
    character.sprite?.setFlipX(boss.x < character.x);
    this.playSupportAttackSe(character.definition.guardSeKey, character.definition.guardSeVolume ?? 0.82);
    this.spawnGensoKnightsGuardBlockEffect(event, boss, character);
    this.cameras.main.shake(140, 0.0028);

    this.tweens.add({
      targets: character,
      x: knockbackPoint.x,
      y: knockbackPoint.y,
      duration: GENSO_KNIGHTS_GUARD_KNOCKBACK_MS,
      ease: "Cubic.Out",
      onUpdate: () => this.syncGensoKnightsCharacterPosition(character),
      onComplete: () => {
        this.syncGensoKnightsCharacterPosition(character);
        this.time.delayedCall(GENSO_KNIGHTS_GUARD_RECOVER_MS, () => {
          if (guardBlockSerial !== character.guardBlockSerial) {
            return;
          }

          if (
            !this.gensoKnightsEvent ||
            this.gensoKnightsEvent !== event ||
            event.ended ||
            character.sprite?.active === false
          ) {
            character.actionLocked = false;
            character.blocking = false;
            return;
          }

          character.blocking = false;
          character.actionLocked = false;
          character.attackTimerMs = Math.min(character.attackTimerMs || 0, 120);
        });
      }
    });
  }

  spawnGensoKnightsGuardBlockEffect(event, boss, character) {
    const frames = character.definition.guardEffectFrames || [];
    const firstFrame = frames[0];
    const fallbackKey = this.textures.exists("skill-hit-spark") ? "skill-hit-spark" : "skill-hit-glow";
    const textureKey = firstFrame && this.textures.exists(firstFrame.textureKey) ? firstFrame.textureKey : fallbackKey;
    const angleToBoss = Phaser.Math.Angle.Between(character.x, character.y, boss.x, boss.y);
    const effectX = character.x + Math.cos(angleToBoss) * 72;
    const effectY = character.y + Math.sin(angleToBoss) * 48 - Math.max(character.sprite?.displayHeight || 120, 80) * 0.06;
    const effect = this.add
      .image(effectX, effectY, textureKey)
      .setDepth(26.4)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scaleWorldImageToFit(effect, GENSO_KNIGHTS_GUARD_EFFECT_SIZE);
    event.effects.push(effect);
    frames.slice(1).forEach((frame, index) => {
      this.time.delayedCall(GENSO_KNIGHTS_GUARD_EFFECT_FRAME_MS * (index + 1), () => {
        if (!effect.active || !this.textures.exists(frame.textureKey)) {
          return;
        }

        effect.setTexture(frame.textureKey);
        this.scaleWorldImageToFit(effect, GENSO_KNIGHTS_GUARD_EFFECT_SIZE + index * 10);
      });
    });

    this.tweens.add({
      targets: effect,
      alpha: 0,
      scaleX: effect.scaleX * 1.16,
      scaleY: effect.scaleY * 1.16,
      delay: GENSO_KNIGHTS_GUARD_EFFECT_FRAME_MS * Math.max(frames.length - 2, 1),
      duration: 220,
      ease: "Quad.Out",
      onComplete: () => effect.destroy()
    });
  }

  spawnGensoKnightsBossTelegraph(event, boss, targetCharacter) {
    const targetX = targetCharacter.x;
    const targetY = targetCharacter.y + Math.max(targetCharacter.sprite?.displayHeight || 120, 80) * 0.22;
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, targetX, targetY);
    const distance = Phaser.Math.Distance.Between(boss.x, boss.y, targetX, targetY);
    const warningObjects = this.createGensoKnightsBossTelegraphShape(boss, targetX, targetY, angle, distance);

    event.effects.push(...warningObjects);
    this.tweens.add({
      targets: warningObjects,
      alpha: 0.25,
      duration: 120,
      yoyo: true,
      repeat: 3,
      ease: "Sine.InOut",
      onComplete: () => {
        warningObjects.forEach((object) => object.destroy());
      }
    });
  }

  createGensoKnightsBossTelegraphShape(boss, targetX, targetY, angle, distance) {
    const shapeType = boss.index % 4;
    if (shapeType === 0) {
      const lane = this.add
        .rectangle((boss.x + targetX) / 2, (boss.y + targetY) / 2, Math.max(distance + 260, 760), 148, 0xff2635, 0.08)
        .setDepth(23.7)
        .setRotation(angle)
        .setStrokeStyle(4, 0xff2635, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add
        .rectangle((boss.x + targetX) / 2, (boss.y + targetY) / 2, Math.max(distance + 160, 620), 46, 0xff6070, 0.09)
        .setDepth(23.8)
        .setRotation(angle)
        .setStrokeStyle(2, 0xff8a92, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD);
      return [lane, core];
    }

    if (shapeType === 1) {
      const blast = this.add
        .ellipse(targetX, targetY, 520, 320, 0xff1e2f, 0.08)
        .setDepth(23.8)
        .setStrokeStyle(5, 0xff3040, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD);
      const inner = this.add
        .ellipse(targetX, targetY, 310, 184, 0xff6070, 0.06)
        .setDepth(23.9)
        .setStrokeStyle(3, 0xff8a92, 0.78)
        .setBlendMode(Phaser.BlendModes.ADD);
      return [blast, inner];
    }

    if (shapeType === 2) {
      const range = Math.max(560, Math.min(distance + 240, 920));
      const fan = this.add.graphics().setDepth(23.8).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
      const leftAngle = angle - 0.56;
      const rightAngle = angle + 0.56;
      fan.fillStyle(0xff2635, 0.08);
      fan.lineStyle(4, 0xff2635, 0.9);
      fan.beginPath();
      fan.moveTo(boss.x, boss.y);
      fan.lineTo(boss.x + Math.cos(leftAngle) * range, boss.y + Math.sin(leftAngle) * range);
      fan.lineTo(boss.x + Math.cos(angle) * (range + 120), boss.y + Math.sin(angle) * (range + 120));
      fan.lineTo(boss.x + Math.cos(rightAngle) * range, boss.y + Math.sin(rightAngle) * range);
      fan.closePath();
      fan.fillPath();
      fan.strokePath();
      const tip = this.add
        .ellipse(targetX, targetY, 240, 130, 0xff6070, 0.07)
        .setDepth(23.9)
        .setStrokeStyle(3, 0xff8a92, 0.78)
        .setBlendMode(Phaser.BlendModes.ADD);
      return [fan, tip];
    }

    const horizontal = this.add
      .rectangle(targetX, targetY, 690, 110, 0xff2635, 0.08)
      .setDepth(23.7)
      .setStrokeStyle(4, 0xff2635, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    const vertical = this.add
      .rectangle(targetX, targetY, 120, 460, 0xff2635, 0.07)
      .setDepth(23.8)
      .setStrokeStyle(4, 0xff6070, 0.86)
      .setBlendMode(Phaser.BlendModes.ADD);
    const center = this.add
      .ellipse(targetX, targetY, 210, 116, 0xff8a92, 0.07)
      .setDepth(23.9)
      .setStrokeStyle(3, 0xffa5aa, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD);
    return [horizontal, vertical, center];
  }

  updateGensoKnightsCharacters(event, delta) {
    event.characters.forEach((character) => {
      this.updateGensoKnightsCharacterAnimation(character, delta);
      if (character.actionLocked) {
        this.syncGensoKnightsCharacterPosition(character);
        return;
      }

      this.updateGensoKnightsSupportPatrol(character, delta);
      character.attackTimerMs += delta;
      const interval = character.definition.attackIntervalMs || 900;
      if (character.attackTimerMs >= interval) {
        character.attackTimerMs -= interval;
        const target = this.pickGensoKnightsTarget(event, character);
        if (target) {
          if (character.definition.usesArrowEffect) {
            this.startGensoKnightsRangedAttack(event, character, target);
          } else {
            this.startGensoKnightsDashAttack(event, character, target);
          }
        }
      }

      this.syncGensoKnightsCharacterPosition(character);
    });
  }

  updateGensoKnightsSupportPatrol(character, delta) {
    character.patrolTimerMs = (character.patrolTimerMs || 0) + delta;
    const pulseX = Math.sin(character.patrolTimerMs * 0.0017) * 22;
    const pulseY = Math.cos(character.patrolTimerMs * 0.0013) * 12;
    const desiredX = character.homeX + pulseX;
    const desiredY = character.homeY + pulseY;
    const distance = Phaser.Math.Distance.Between(character.x, character.y, desiredX, desiredY);
    if (distance <= 2) {
      return;
    }

    const moveDistance = Math.min(distance, GENSO_KNIGHTS_SUPPORT_HOME_RETURN_SPEED * (delta / 1000));
    const angle = Phaser.Math.Angle.Between(character.x, character.y, desiredX, desiredY);
    character.x += Math.cos(angle) * moveDistance;
    character.y += Math.sin(angle) * moveDistance;
  }

  syncGensoKnightsCharacterPosition(character) {
    character.sprite?.setPosition(character.x, character.y);
    character.shadow?.setPosition(character.x, character.y + (character.shadowOffsetY || 56));
    character.guardAura?.setPosition(character.x, character.y + (character.shadowOffsetY || 56) * 0.78);
  }

  startGensoKnightsDashAttack(event, character, target) {
    if (character.actionLocked || !character.sprite?.active) {
      return;
    }

    character.actionLocked = true;
    const bounds = this.getStagePlayBounds(this.currentStage, 160) || {
      left: 160,
      right: WORLD_WIDTH - 160,
      top: 160,
      bottom: WORLD_HEIGHT - 160
    };
    const angleToTarget = Phaser.Math.Angle.Between(character.x, character.y, target.x, target.y);
    const attackPoint = this.clampPointToBounds(
      target.x - Math.cos(angleToTarget) * GENSO_KNIGHTS_SUPPORT_MELEE_RANGE,
      target.y - Math.sin(angleToTarget) * GENSO_KNIGHTS_SUPPORT_MELEE_RANGE * 0.72,
      bounds
    );
    const dashDistance = Phaser.Math.Distance.Between(character.x, character.y, attackPoint.x, attackPoint.y);
    const dashMs = Phaser.Math.Clamp(
      (dashDistance / Math.max(GENSO_KNIGHTS_SUPPORT_DASH_SPEED, 1)) * 1000,
      110,
      460
    );
    character.sprite?.setFlipX(attackPoint.x < character.x);

    this.tweens.add({
      targets: character,
      x: attackPoint.x,
      y: attackPoint.y,
      duration: dashMs,
      ease: "Cubic.Out",
      onUpdate: () => this.syncGensoKnightsCharacterPosition(character),
      onComplete: () => {
        if (!this.gensoKnightsEvent || this.gensoKnightsEvent !== event || event.ended || character.sprite?.active === false) {
          character.actionLocked = false;
          return;
        }

        const liveTarget = this.resolveGensoKnightsTargetSnapshot(target) || target;
        this.spawnGensoKnightsAttack(event, character, liveTarget);
        this.time.delayedCall(120, () => {
          if (!this.gensoKnightsEvent || this.gensoKnightsEvent !== event || event.ended) {
            character.actionLocked = false;
            return;
          }

          if (character.blocking) {
            return;
          }

          if (character.definition.role === "normalSweeper") {
            character.actionLocked = false;
            character.attackTimerMs = character.definition.attackIntervalMs || 0;
            this.syncGensoKnightsCharacterPosition(character);
            return;
          }

          this.retreatGensoKnightsCharacter(event, character);
        });
      }
    });
  }

  startGensoKnightsRangedAttack(event, character, target) {
    if (character.actionLocked || !character.sprite?.active) {
      return;
    }

    character.actionLocked = true;
    const standPoint = this.getGensoKnightsRangedStandPoint(character, target);
    const distance = Phaser.Math.Distance.Between(character.x, character.y, standPoint.x, standPoint.y);
    const moveMs = Phaser.Math.Clamp(
      (distance / Math.max(GENSO_KNIGHTS_SUPPORT_RETREAT_SPEED, 1)) * 1000,
      80,
      360
    );
    character.sprite?.setFlipX(target.x < character.x);

    this.tweens.add({
      targets: character,
      x: standPoint.x,
      y: standPoint.y,
      duration: moveMs,
      ease: "Sine.Out",
      onUpdate: () => this.syncGensoKnightsCharacterPosition(character),
      onComplete: () => {
        this.time.delayedCall(140, () => {
          if (!this.gensoKnightsEvent || this.gensoKnightsEvent !== event || event.ended || character.sprite?.active === false) {
            character.actionLocked = false;
            return;
          }

          const liveTarget = this.resolveGensoKnightsTargetSnapshot(target) || target;
          this.spawnGensoKnightsAttack(event, character, liveTarget);
          this.time.delayedCall(260, () => {
            character.actionLocked = false;
          });
        });
      }
    });
  }

  getGensoKnightsRangedStandPoint(character, target) {
    const bounds = this.getStagePlayBounds(this.currentStage, 160) || {
      left: 160,
      right: WORLD_WIDTH - 160,
      top: 160,
      bottom: WORLD_HEIGHT - 160
    };
    const angleAway = Phaser.Math.Angle.Between(target.x, target.y, character.homeX, character.homeY);
    const desiredX = target.x + Math.cos(angleAway) * GENSO_KNIGHTS_SUPPORT_RANGED_KEEP_DISTANCE;
    const desiredY = target.y + Math.sin(angleAway) * GENSO_KNIGHTS_SUPPORT_RANGED_KEEP_DISTANCE * 0.66;
    const homeBiasX = (desiredX + character.homeX * 1.35) / 2.35;
    const homeBiasY = (desiredY + character.homeY * 1.35) / 2.35;
    return this.clampPointToBounds(homeBiasX, homeBiasY, bounds);
  }

  retreatGensoKnightsCharacter(event, character) {
    const bounds = this.getStagePlayBounds(this.currentStage, 160) || {
      left: 160,
      right: WORLD_WIDTH - 160,
      top: 160,
      bottom: WORLD_HEIGHT - 160
    };
    const retreatPoint = this.clampPointToBounds(
      character.homeX + Phaser.Math.Between(-36, 36),
      character.homeY + Phaser.Math.Between(-24, 24),
      bounds
    );
    const distance = Phaser.Math.Distance.Between(character.x, character.y, retreatPoint.x, retreatPoint.y);
    const retreatMs = Phaser.Math.Clamp(
      (distance / Math.max(GENSO_KNIGHTS_SUPPORT_RETREAT_SPEED, 1)) * 1000,
      120,
      460
    );

    this.tweens.add({
      targets: character,
      x: retreatPoint.x,
      y: retreatPoint.y,
      duration: retreatMs,
      ease: "Sine.Out",
      onUpdate: () => this.syncGensoKnightsCharacterPosition(character),
      onComplete: () => {
        character.actionLocked = false;
        this.syncGensoKnightsCharacterPosition(character);
      }
    });
  }

  resolveGensoKnightsTargetSnapshot(target) {
    if (target?.kind === "enemy") {
      const enemy = target.enemy;
      if (!enemy?.active || enemy.isDying) {
        return null;
      }

      return {
        ...target,
        x: enemy.x,
        y: enemy.y,
        displayHeight: Math.max(enemy.displayHeight || enemy.body?.height || target.displayHeight || 56, 36)
      };
    }

    if (target?.kind === "eventBoss") {
      const boss = target.boss;
      if (!boss?.sprite?.active || boss.defeated) {
        return null;
      }

      return {
        ...target,
        x: boss.sprite.x,
        y: boss.sprite.y,
        displayHeight: Math.max(boss.sprite.displayHeight || target.displayHeight || 280, 120)
      };
    }

    return target || null;
  }

  updateGensoKnightsCharacterAnimation(character, delta) {
    const frames = character.definition.animationFrames || [];
    if (!frames.length || !character.sprite?.active) {
      return;
    }

    character.frameTimerMs += delta;
    const frameMs = character.definition.frameMs || 120;
    while (character.frameTimerMs >= frameMs) {
      character.frameTimerMs -= frameMs;
      character.frameIndex = (character.frameIndex + 1) % frames.length;
      const frameKey = frames[character.frameIndex]?.textureKey;
      if (this.textures.exists(frameKey)) {
        const currentHeight = character.sprite.displayHeight;
        character.sprite.setTexture(frameKey);
        const frameHeight = Math.max(character.sprite.frame?.height || currentHeight, 1);
        character.sprite.setScale(currentHeight / frameHeight);
      }
    }
  }

  pickGensoKnightsTarget(event, character) {
    const toEnemyTarget = (enemy) => ({
      kind: "enemy",
      enemy,
      x: enemy.x,
      y: enemy.y,
      displayHeight: Math.max(enemy.displayHeight || enemy.body?.height || 56, 36)
    });
    const toEventBossTarget = (boss) => ({
      kind: "eventBoss",
      boss,
      sprite: boss.sprite,
      x: boss.sprite.x,
      y: boss.sprite.y,
      displayHeight: Math.max(boss.sprite.displayHeight || 280, 120)
    });
    const normalSearchPadding = character.definition.role === "normalSweeper"
      ? GENSO_KNIGHTS_NORMAL_SWEEPER_SEARCH_PADDING
      : GENSO_KNIGHTS_DEFAULT_TARGET_SEARCH_PADDING;
    const normalTarget = this.pickGensoKnightsVisibleEnemyTarget(character, false, normalSearchPadding);
    const eventBossTarget = this.pickGensoKnightsTargetBoss(event, character.definition.targetIndex || 0);
    const regularBossTarget = this.pickGensoKnightsVisibleEnemyTarget(character, true, GENSO_KNIGHTS_DEFAULT_TARGET_SEARCH_PADDING);

    if (character.definition.role === "normalSweeper") {
      return normalTarget ? toEnemyTarget(normalTarget) : null;
    }

    if (character.definition.role === "bossTank") {
      if (eventBossTarget) {
        return toEventBossTarget(eventBossTarget);
      }

      if (regularBossTarget) {
        return toEnemyTarget(regularBossTarget);
      }

      return normalTarget ? toEnemyTarget(normalTarget) : null;
    }

    if (normalTarget) {
      return toEnemyTarget(normalTarget);
    }

    if (eventBossTarget) {
      return toEventBossTarget(eventBossTarget);
    }

    return regularBossTarget ? toEnemyTarget(regularBossTarget) : null;
  }

  pickGensoKnightsVisibleEnemyTarget(character, bossOnly = false, searchPadding = GENSO_KNIGHTS_DEFAULT_TARGET_SEARCH_PADDING) {
    const view = this.cameras.main.worldView;
    const padding = searchPadding;
    const candidates = [];

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      if (bossOnly !== Boolean(enemy.isBoss)) {
        return;
      }

      if (
        enemy.x < view.left - padding ||
        enemy.x > view.right + padding ||
        enemy.y < view.top - padding ||
        enemy.y > view.bottom + padding
      ) {
        return;
      }

      const distanceSq = Phaser.Math.Distance.Squared(character.x, character.y, enemy.x, enemy.y);
      candidates.push({ enemy, distanceSq });
    });

    candidates.sort((left, right) => left.distanceSq - right.distanceSq);
    return candidates[0]?.enemy || null;
  }

  pickGensoKnightsTargetBoss(event, preferredIndex = 0) {
    const activeBosses = event.bosses.filter((boss) => boss.sprite?.active && !boss.defeated);
    if (!activeBosses.length) {
      return null;
    }

    const preferred = event.bosses[preferredIndex % event.bosses.length];
    if (preferred?.sprite?.active && !preferred.defeated) {
      return preferred;
    }

    return Phaser.Utils.Array.GetRandom(activeBosses);
  }

  spawnGensoKnightsAttack(event, character, target) {
    const startX = character.x;
    const startY = character.y - Math.max(character.sprite?.displayHeight || 110, 80) * 0.12;
    const endX = target.x;
    const endY = target.y - Math.max(target.displayHeight || 120, 80) * 0.18;
    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);

    if (character.definition.usesArrowEffect) {
      this.spawnGensoKnightsArrowBarrage(event, endX, endY, angle);
      this.applyGensoKnightsArrowBarrageDamage(event, endX, endY, target);
    } else {
      const slash = this.add
        .rectangle((startX + endX) / 2, (startY + endY) / 2, distance, 9, event.definition.glowTint, 0.74)
        .setDepth(24.6)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add
        .rectangle((startX + endX) / 2, (startY + endY) / 2, distance * 0.86, 3, 0xffffff, 0.86)
        .setDepth(24.7)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD);
      event.effects.push(slash, core);
      this.tweens.add({
        targets: [slash, core],
        alpha: 0,
        scaleX: 1.08,
        duration: 180,
        ease: "Quad.Out",
        onComplete: () => {
          slash.destroy();
          core.destroy();
        }
      });
    }

    if (target.kind === "enemy" && !character.definition.usesArrowEffect) {
      this.applyDamageToEnemy(target.enemy, GENSO_KNIGHTS_DAMAGE, event.definition.glowTint, {
        sourceX: startX,
        sourceY: startY,
        force: 360,
        recoverMs: 120,
        supportFinisher: true
      });
    }

    const sparkKey = this.textures.exists("skill-hit-spark") ? "skill-hit-spark" : "skill-hit-glow";
    const spark = this.add
      .image(endX, endY, sparkKey)
      .setDepth(25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.94)
      .setTint(event.definition.glowTint);
    this.scaleWorldImageToFit(spark, 170);
    event.effects.push(spark);
    this.tweens.add({
      targets: spark,
      scaleX: spark.scaleX * 1.35,
      scaleY: spark.scaleY * 1.35,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => spark.destroy()
    });

    if (target.kind !== "enemy" && !character.definition.usesArrowEffect) {
      this.spawnFloatingCombatText(endX, endY - Math.max(target.displayHeight || 280, 120) * 0.34, GENSO_KNIGHTS_DAMAGE, {
        type: "damage",
        fontSize: "18px",
        color: "#f7fbff",
        stroke: "#0f3e66",
        strokeThickness: 4,
        rise: 34,
        duration: 720,
        jitterX: Phaser.Math.Between(-14, 14),
        jitterY: Phaser.Math.Between(-6, 4)
      });
    }
  }

  spawnGensoKnightsArrowEffect(event, x, y, angle) {
    const frames = event.definition.arrowFrames || [];
    const firstFrame = frames[0];
    if (!firstFrame || !this.textures.exists(firstFrame.textureKey)) {
      return;
    }

    const effect = this.add
      .image(x, y + 14, firstFrame.textureKey)
      .setDepth(24.8)
      .setAlpha(0.94)
      .setRotation(angle + Math.PI / 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scaleWorldImageToFit(effect, 210);
    event.effects.push(effect);

    frames.slice(1).forEach((frame, index) => {
      this.time.delayedCall(45 * (index + 1), () => {
        if (effect.active && this.textures.exists(frame.textureKey)) {
          effect.setTexture(frame.textureKey);
          this.scaleWorldImageToFit(effect, 210 + index * 18);
        }
      });
    });

    this.tweens.add({
      targets: effect,
      alpha: 0,
      scaleX: effect.scaleX * 1.18,
      scaleY: effect.scaleY * 1.18,
      delay: 170,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => effect.destroy()
    });
  }

  spawnGensoKnightsArrowBarrage(event, x, y, angle) {
    for (let index = 0; index < GENSO_KNIGHTS_ARROW_BARRAGE_COUNT; index += 1) {
      const delay = index * 34;
      const spreadAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spreadRadius = Phaser.Math.Between(42, GENSO_KNIGHTS_ARROW_BARRAGE_RADIUS);
      const targetX = x + Math.cos(spreadAngle) * spreadRadius;
      const targetY = y + Math.sin(spreadAngle) * spreadRadius * 0.58;
      this.time.delayedCall(delay, () => {
        if (!this.gensoKnightsEvent || this.gensoKnightsEvent !== event || event.ended) {
          return;
        }
        this.spawnGensoKnightsArrowEffect(
          event,
          targetX,
          targetY,
          angle + Phaser.Math.FloatBetween(-0.7, 0.7)
        );
      });
    }
  }

  applyGensoKnightsArrowBarrageDamage(event, x, y, primaryTarget) {
    const hitEnemies = new Set();
    let hitCount = 0;
    const applyEnemyHit = (enemy) => {
      if (!enemy?.active || enemy.isDying || hitEnemies.has(enemy) || hitCount >= GENSO_KNIGHTS_ARROW_BARRAGE_HIT_CAP) {
        return;
      }

      hitEnemies.add(enemy);
      hitCount += 1;
      this.applyDamageToEnemy(enemy, GENSO_KNIGHTS_DAMAGE, event.definition.glowTint, {
        sourceX: x,
        sourceY: y,
        force: 320,
        recoverMs: 120,
        supportFinisher: true
      });
    };

    if (primaryTarget.kind === "enemy") {
      applyEnemyHit(primaryTarget.enemy);
    }

    const view = this.cameras.main.worldView;
    const padding = 90;
    const candidates = [];
    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying || enemy.isBoss) {
        return;
      }

      if (
        enemy.x < view.left - padding ||
        enemy.x > view.right + padding ||
        enemy.y < view.top - padding ||
        enemy.y > view.bottom + padding
      ) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= GENSO_KNIGHTS_ARROW_BARRAGE_RADIUS) {
        candidates.push({ enemy, distance });
      }
    });

    candidates.sort((left, right) => left.distance - right.distance);
    candidates.forEach(({ enemy }) => applyEnemyHit(enemy));

    if (primaryTarget.kind !== "enemy") {
      this.spawnFloatingCombatText(x, y - Math.max(primaryTarget.displayHeight || 280, 120) * 0.34, GENSO_KNIGHTS_DAMAGE, {
        type: "damage",
        fontSize: "18px",
        color: "#f7fbff",
        stroke: "#0f3e66",
        strokeThickness: 4,
        rise: 34,
        duration: 720,
        jitterX: Phaser.Math.Between(-14, 14),
        jitterY: Phaser.Math.Between(-6, 4)
      });
    }
  }

  finishGensoKnightsEvent(event) {
    event.finishing = true;
    this.cameras.main.shake(360, 0.004);
    this.cameras.main.flash(260, 210, 245, 255, false, null, null, this);
    event.bosses.forEach((boss) => {
      if (!boss.sprite?.active || boss.defeated) {
        return;
      }

      boss.defeated = true;
      this.spawnFloatingCombatText(boss.sprite.x, boss.sprite.y - Math.max(boss.sprite.displayHeight || 280, 120) * 0.4, GENSO_KNIGHTS_DAMAGE, {
        type: "damage",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#0a2d55",
        strokeThickness: 5,
        rise: 40,
        duration: 820,
        jitterX: 0,
        jitterY: 0
      });
      this.spawnGensoKnightsCoinDropsForBoss(boss);
      this.tweens.add({
        targets: [boss.sprite, boss.shadow].filter(Boolean),
        alpha: 0,
        y: "+=42",
        angle: boss.index % 2 === 0 ? -12 : 12,
        scaleX: "*=0.78",
        scaleY: "*=0.78",
        duration: 920,
        ease: "Cubic.In",
        onComplete: () => {
          boss.sprite?.destroy();
          boss.shadow?.destroy();
        }
      });
    });

    event.characters.forEach((character) => {
      this.tweens.add({
        targets: [character.sprite, character.shadow, character.guardAura].filter(Boolean),
        alpha: 0,
        duration: 640,
        ease: "Sine.In",
        onComplete: () => {
          character.sprite?.destroy();
          character.shadow?.destroy();
          character.guardAura?.destroy();
        }
      });
    });
  }

  spawnGensoKnightsCoinDropsForBoss(boss) {
    if (boss.coinsDropped) {
      return;
    }

    boss.coinsDropped = true;
    const currentDropCount = this.gensoKnightsEvent?.coinDropCount || 0;
    const remainingTotal = Math.max(0, GENSO_KNIGHTS_TOTAL_COIN_DROPS - currentDropCount);
    const dropCount = Math.min(GENSO_KNIGHTS_BOSS_COIN_DROPS, remainingTotal);
    const dropDefinitions = [
      RARE_ITEM_DEFINITIONS.gold,
      RARE_ITEM_DEFINITIONS.silver,
      RARE_ITEM_DEFINITIONS.silver,
      RARE_ITEM_DEFINITIONS.bronze,
      RARE_ITEM_DEFINITIONS.bronze
    ].filter(Boolean);
    const bounds = this.getStagePlayBounds(this.currentStage, 80) || {
      left: 80,
      right: WORLD_WIDTH - 80,
      top: 80,
      bottom: WORLD_HEIGHT - 80
    };

    for (let index = 0; index < dropCount; index += 1) {
      const angle = (Math.PI * 2 * index) / Math.max(dropCount, 1) + boss.index * 0.48;
      const radius = 72 + index * 18;
      const point = this.clampPointToBounds(
        boss.sprite.x + Math.cos(angle) * radius,
        boss.sprite.y + Math.sin(angle) * radius * 0.72,
        bounds
      );
      this.spawnRareItem(point.x, point.y, dropDefinitions[index % dropDefinitions.length]);
      this.gensoKnightsEvent.coinDropCount = (this.gensoKnightsEvent.coinDropCount || 0) + 1;
    }
  }

  cleanupGensoKnightsEvent(event = this.gensoKnightsEvent, restoreNormalBgm = true) {
    if (!event) {
      return;
    }

    event.ended = true;
    [...(event.bosses || []), ...(event.characters || [])].forEach((entry) => {
      entry.sprite?.destroy();
      entry.shadow?.destroy();
      entry.guardAura?.destroy();
    });
    (event.effects || []).forEach((effect) => {
      if (effect?.active) {
        effect.destroy();
      }
    });
    if (this.gensoKnightsEvent === event) {
      this.gensoKnightsEvent = null;
    }
    this.stopGensoKnightsBgm(restoreNormalBgm, true);
  }

  createSupportAttackInstance(definition) {
    const firstFrameKey = definition.animationFrames[0]?.textureKey || "skill-hit-glow";
    const side = this.playerSprite?.flipX ? 1 : -1;
    const supportX = this.playerHitbox.x + side * (definition.supportOffsetX || 86);
    const supportY = this.playerHitbox.y + (definition.supportOffsetY ?? -28);
    const centerX = supportX;
    const centerY = supportY + (definition.actionCenterOffsetY || 0);
    const shadow = this.add
      .ellipse(supportX, supportY + (definition.supportShadowOffsetY || 74), 82, 22, 0x000000, 0.28)
      .setDepth(15.9)
      .setAlpha(0);
    const sprite = this.add
      .image(supportX, supportY, this.textures.exists(firstFrameKey) ? firstFrameKey : "skill-hit-glow")
      .setDepth(20.2)
      .setAlpha(0)
      .setFlipX(side > 0);

    this.scaleSupportCharacterSprite(sprite, definition, 0);

    const support = {
      definition,
      sprite,
      shadow,
      x: supportX,
      y: supportY,
      centerX,
      centerY,
      elapsedMs: 0,
      startedAt: this.time.now,
      frameIndex: 0,
      currentTextureIndex: 0,
      frameTimerMs: 0,
      tickTimerMs: 0,
      attackTimerMs: 0,
      burstDone: false,
      fieldObjects: this.createSupportFieldVisuals(definition, centerX, centerY)
    };

    support.fieldObjects.forEach((object) => object.setDepth(Math.min(object.depth || 22, 19.8)));
    if (definition.startHidden !== true) {
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: 170,
        ease: "Quad.Out"
      });
      this.tweens.add({
        targets: shadow,
        alpha: 0.28,
        duration: 170,
        ease: "Quad.Out"
      });
      this.spawnSupportArrivalEffect(centerX, centerY, definition);
    }

    return support;
  }

  createSupportFieldVisuals(definition, x, y) {
    if (definition.showFieldVisual === false) {
      return [];
    }

    if (definition.type === "pullBurst") {
      const radius = definition.damageRadius || 420;
      const floor = this.add
        .ellipse(x, y + 18, radius * 1.6, radius * 0.56, definition.tint, 0.07)
        .setDepth(22)
        .setBlendMode(Phaser.BlendModes.ADD);
      const glow = this.add
        .image(x, y + 8, "skill-hit-glow")
        .setDepth(23)
        .setScale(radius / 34, radius / 44)
        .setTint(definition.glowTint)
        .setAlpha(0.16)
        .setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.add
        .image(x, y + 16, "skill-hit-ring")
        .setDepth(24)
        .setScale(radius / 42, radius / 62)
        .setTint(definition.tint)
        .setAlpha(0.3)
        .setBlendMode(Phaser.BlendModes.ADD);

      return [floor, glow, ring];
    }

    if (!["statusField", "healField", "timingCoin"].includes(definition.type)) {
      return [];
    }

    const radius = definition.radius || 300;
    if (definition.fieldEffectFrames?.length) {
      const firstFrameKey = definition.fieldEffectFrames[0]?.textureKey;
      if (this.textures.exists(firstFrameKey)) {
        const field = this.add
          .image(x, y + (definition.fieldVisualOffsetY ?? 18), firstFrameKey)
          .setDepth(19.7)
          .setAlpha(0)
          .setBlendMode(Phaser.BlendModes.ADD);
        field.setOrigin(0.5, definition.fieldVisualOriginY ?? 0.5);
        this.resizeSupportFieldEffect(field, definition, radius, 0);
        return [field];
      }
    }

    const floor = this.add
      .ellipse(x, y + 18, radius * 2, radius * 0.82, definition.tint, definition.type === "healField" ? 0.12 : 0.1)
      .setDepth(22)
      .setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.add
      .image(x, y + 10, "skill-hit-glow")
      .setDepth(23)
      .setScale(radius / 32, radius / 42)
      .setTint(definition.glowTint)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .image(x, y + 16, "skill-hit-ring")
      .setDepth(24)
      .setScale(radius / 34, radius / 52)
      .setTint(definition.tint)
      .setAlpha(0.38)
      .setBlendMode(Phaser.BlendModes.ADD);

    return [floor, glow, ring];
  }

  spawnSupportArrivalEffect(x, y, definition) {
    this.playSupportAttackSe(definition.arrivalSeKey, definition.arrivalSeVolume ?? 0.8);

    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(25)
      .setScale(1.1)
      .setTint(definition.glowTint)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = definition.showArrivalRing === false
      ? null
      : this.add
        .image(x, y + 18, "skill-hit-ring")
        .setDepth(25)
        .setScale(0.82)
        .setTint(definition.tint)
        .setAlpha(0.92)
        .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add([glow, ring].filter(Boolean));
    this.tweens.add({
      targets: glow,
      scaleX: 2.3,
      scaleY: 2.3,
      alpha: 0,
      duration: 300,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });
    if (ring) {
      this.tweens.add({
        targets: ring,
        scaleX: 2.6,
        scaleY: 1.28,
        alpha: 0,
        duration: 320,
        ease: "Cubic.Out",
        onComplete: () => {
          ring.destroy();
        }
      });
    }
  }

  updateSupportAttacks(delta) {
    if (!this.activeSupportAttacks?.length) {
      return;
    }

    for (let index = this.activeSupportAttacks.length - 1; index >= 0; index -= 1) {
      const support = this.activeSupportAttacks[index];
      const definition = support.definition;
      support.elapsedMs += delta;
      this.updateSupportAttackAnimation(support, delta);
      this.updateSupportFieldVisuals(support, delta);

      if (definition.type === "pullBurst") {
        this.updateSupportPullBurst(support, delta);
      } else if (definition.type === "statusField") {
        this.updateSupportStatusField(support, delta);
      } else if (definition.type === "healField") {
        this.updateSupportHealField(support, delta);
      } else if (definition.type === "randomAttack") {
        this.updateSupportRandomAttack(support, delta);
      } else if (definition.type === "followThunder") {
        this.updateSupportFollowThunder(support, delta);
      } else if (definition.type === "dashSlash") {
        this.updateSupportDashSlash(support, delta);
      } else if (definition.type === "timingCoin") {
        this.updateTimingCoinSupportAttack(support, delta);
      }

      if (support.elapsedMs >= definition.durationMs) {
        this.finishSupportAttack(support);
        this.activeSupportAttacks.splice(index, 1);
      }
    }
  }

  updateSupportAttackAnimation(support, delta) {
    const definition = support.definition;
    const frames = definition.animationFrames || [];
    if (!frames.length || !support.sprite?.active) {
      return;
    }

    const frameMs = definition.frameMs || 100;
    const holdUntilMs = definition.holdFirstFrameUntilMs || 0;
    const attackFrameStartIndex = definition.attackFrameStartIndex ?? 1;
    let nextFrameIndex = support.frameIndex;

    if (Number.isFinite(definition.holdFrameIndex) && Number.isFinite(definition.holdFrameDurationMs)) {
      const holdFrameIndex = Phaser.Math.Clamp(definition.holdFrameIndex, 0, frames.length - 1);
      const holdStartMs = holdFrameIndex * frameMs;
      if (support.elapsedMs < holdStartMs) {
        nextFrameIndex = Math.min(holdFrameIndex, Math.floor(support.elapsedMs / frameMs));
      } else if (support.elapsedMs < holdStartMs + definition.holdFrameDurationMs) {
        nextFrameIndex = holdFrameIndex;
      } else {
        const outroElapsedMs = support.elapsedMs - holdStartMs - definition.holdFrameDurationMs;
        nextFrameIndex = Math.min(
          frames.length - 1,
          holdFrameIndex + 1 + Math.floor(outroElapsedMs / frameMs)
        );
      }
      support.frameTimerMs = 0;
    } else if (definition.useSeparateAttackEffect) {
      nextFrameIndex = 0;
      support.frameTimerMs = 0;
    } else if (holdUntilMs > 0 && support.elapsedMs < holdUntilMs) {
      nextFrameIndex = 0;
      support.frameTimerMs = 0;
    } else if (definition.animationLoop === false) {
      const attackElapsed = Math.max(0, support.elapsedMs - holdUntilMs);
      const attackFrameCount = Math.max(1, frames.length - attackFrameStartIndex);
      nextFrameIndex = attackFrameStartIndex + Math.min(
        attackFrameCount - 1,
        Math.floor(attackElapsed / frameMs)
      );
    } else {
      support.frameTimerMs += delta;
      while (support.frameTimerMs >= frameMs) {
        support.frameTimerMs -= frameMs;
        nextFrameIndex = (nextFrameIndex + 1) % frames.length;
      }
    }

    if (nextFrameIndex !== support.currentTextureIndex) {
      support.frameIndex = nextFrameIndex;
      support.currentTextureIndex = nextFrameIndex;
      const frameKey = frames[nextFrameIndex]?.textureKey;
      if (this.textures.exists(frameKey)) {
        support.sprite.setTexture(frameKey);
        this.scaleSupportCharacterSprite(support.sprite, definition, nextFrameIndex);
      }
    }

    this.syncSupportAttackPosition(support);
  }

  syncSupportAttackPosition(support) {
    const definition = support.definition;
    support.centerX = support.x;
    support.centerY = support.y + (definition.actionCenterOffsetY || 0);
    support.sprite?.setPosition(support.x, support.y);
    support.shadow?.setPosition(support.x, support.y + (definition.supportShadowOffsetY || 74));
  }

  getSupportSpriteLongestSide(definition, frameIndex = 0) {
    if (frameIndex <= 0 && definition.idleSpriteLongestSide) {
      return definition.idleSpriteLongestSide;
    }

    if (frameIndex > 0 && definition.attackSpriteLongestSide) {
      return definition.attackSpriteLongestSide;
    }

    return definition.spriteLongestSide || 280;
  }

  scaleSupportCharacterSprite(sprite, definition, frameIndex = 0) {
    if (definition.matchPlayerDisplayHeight && (frameIndex <= 0 || definition.scaleAllFramesToPlayerHeight)) {
      const frameHeight = Math.max(definition.supportScaleReferenceHeight || sprite?.frame?.height || 1, 1);
      const playerHeight = this.playerSprite?.displayHeight || 104;
      sprite.setScale((playerHeight * (definition.supportDisplayHeightMultiplier || 1)) / frameHeight);
      return;
    }

    this.scaleWorldImageToFit(sprite, this.getSupportSpriteLongestSide(definition, frameIndex));
  }

  getSupportFieldActiveStartMs(definition) {
    if (Number.isFinite(definition.fieldActiveStartMs)) {
      return definition.fieldActiveStartMs;
    }

    if (Number.isFinite(definition.fieldActiveStartFrameIndex)) {
      return definition.fieldActiveStartFrameIndex * (definition.frameMs || 100);
    }

    return 0;
  }

  isSupportFieldWindowActive(support) {
    const definition = support.definition;
    if (!Number.isFinite(definition.fieldActiveDurationMs)) {
      return true;
    }

    const activeStartMs = this.getSupportFieldActiveStartMs(definition);
    return support.elapsedMs >= activeStartMs && support.elapsedMs < activeStartMs + definition.fieldActiveDurationMs;
  }

  getSupportFieldVisualCenter(support) {
    const definition = support.definition;
    const offsetX = definition.fieldVisualOffsetX || 0;
    if (definition.fieldVisualAnchor === "feet") {
      const spriteHeight = Math.max(support.sprite?.displayHeight || this.playerSprite?.displayHeight || 104, 1);
      return {
        x: support.centerX + offsetX,
        y: support.y + spriteHeight * (definition.fieldVisualFootRatio ?? 0.46) + (definition.fieldVisualOffsetY || 0)
      };
    }

    return {
      x: support.centerX + offsetX,
      y: support.centerY + (definition.fieldVisualOffsetY ?? 18)
    };
  }

  resizeSupportFieldEffect(field, definition, radius, pulse = 0) {
    const widthMultiplier = definition.fieldVisualWidthMultiplier ?? 2.1;
    const heightMultiplier = definition.fieldVisualHeightMultiplier ?? 0.76;
    field.setDisplaySize(
      radius * (widthMultiplier + pulse * 0.06),
      radius * (heightMultiplier + pulse * 0.03)
    );
  }

  updateSupportFieldVisuals(support, delta) {
    const [floor, glow, ring] = support.fieldObjects || [];
    if (!floor?.active) {
      return;
    }

    const definition = support.definition;
    if (definition.fieldEffectFrames?.length) {
      const active = this.isSupportFieldWindowActive(support);
      if (active && !support.fieldStartSePlayed) {
        support.fieldStartSePlayed = true;
        this.playSupportAttackSe(definition.fieldStartSeKey, definition.fieldStartSeVolume ?? 0.78);
      }

      support.fieldEffectFrameTimerMs = (support.fieldEffectFrameTimerMs || 0) + delta;
      if (active && support.fieldEffectFrameTimerMs >= (definition.fieldEffectFrameMs || 130)) {
        support.fieldEffectFrameTimerMs = 0;
        support.fieldEffectFrameIndex = ((support.fieldEffectFrameIndex || 0) + 1) % definition.fieldEffectFrames.length;
        const frameKey = definition.fieldEffectFrames[support.fieldEffectFrameIndex]?.textureKey;
        if (this.textures.exists(frameKey)) {
          floor.setTexture(frameKey);
        }
      }

      const radius = definition.fieldVisualRadius || definition.radius || 520;
      const pulse = (Math.sin(support.elapsedMs / 260) + 1) * 0.5;
      const fieldCenter = this.getSupportFieldVisualCenter(support);
      floor.setPosition(fieldCenter.x, fieldCenter.y);
      this.resizeSupportFieldEffect(floor, definition, radius, pulse);
      floor.setAlpha(active ? 0.74 + pulse * 0.12 : 0);
      return;
    }

    const radius = definition.fieldVisualRadius || definition.damageRadius || definition.radius || 300;
    const pulse = (Math.sin(support.elapsedMs / 210) + 1) * 0.5;
    floor.setPosition(support.centerX, support.centerY + 18);
    floor.setDisplaySize(radius * (1.86 + pulse * 0.2), radius * (0.72 + pulse * 0.1));
    floor.setAlpha((definition.type === "healField" ? 0.1 : 0.08) + pulse * 0.08);
    glow?.setPosition(support.centerX, support.centerY + 10);
    glow?.setScale((radius / 32) * (0.88 + pulse * 0.18), (radius / 42) * (0.78 + pulse * 0.14));
    glow?.setAlpha(0.12 + pulse * 0.16);
    if (ring?.active) {
      ring.setPosition(support.centerX, support.centerY + 16);
      ring.setScale((radius / 34) * (0.78 + pulse * 0.16), (radius / 52) * (0.62 + pulse * 0.14));
      ring.setAlpha(0.22 + pulse * 0.22);
      ring.rotation += 0.007 * (delta / 16.6667);
    }
  }

  updateSupportPullBurst(support, delta) {
    const definition = support.definition;

    if (support.elapsedMs < (definition.suctionDurationMs || 900)) {
      this.pullEnemiesTowardSupport(support, definition, delta);
    }

    if (!support.burstDone && support.elapsedMs >= (definition.burstAtMs || 900)) {
      support.burstDone = true;
      if (definition.useSeparateAttackEffect) {
        this.spawnSupportAttackAnimationEffect(support, definition);
      }
      this.applySupportAreaDamage(
        support.centerX,
        support.centerY,
        definition.damageRadius || 360,
        definition.damageAmount || 8,
        definition,
        definition.knockbackForce || 420
      );
      this.spawnSupportBurstEffect(support.centerX, support.centerY, definition);
      this.cameras.main.shake(180, 0.0032);
    }
  }

  spawnSupportAttackAnimationEffect(support, definition) {
    const frames = definition.animationFrames || [];
    const startIndex = definition.attackEffectFrameStartIndex ?? 1;
    const firstFrame = frames[startIndex]?.textureKey;
    if (!this.textures.exists(firstFrame)) {
      return;
    }

    this.tweens.add({
      targets: [support.sprite, support.shadow],
      alpha: 0,
      duration: 80,
      ease: "Quad.Out"
    });

    const effect = this.add
      .image(
        support.x + (definition.attackEffectOffsetX || 0),
        support.y + (definition.attackEffectOffsetY || 0),
        firstFrame
      )
      .setDepth(27)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.NORMAL);
    this.scaleSupportAttackEffect(effect, definition, startIndex);
    this.supportEffectsLayer.add(effect);

    let frameIndex = startIndex;
    const finalFrameIndex = Math.max(startIndex, frames.length - 1);
    this.time.addEvent({
      delay: definition.frameMs || 100,
      repeat: Math.max(0, finalFrameIndex - startIndex - 1),
      callback: () => {
        frameIndex += 1;
        const frameKey = frames[frameIndex]?.textureKey;
        if (effect.active && this.textures.exists(frameKey)) {
          effect.setTexture(frameKey);
          this.scaleSupportAttackEffect(effect, definition, frameIndex);
        }
      }
    });

    this.tweens.add({
      targets: effect,
      alpha: 0,
      delay: Math.max(360, (finalFrameIndex - startIndex + 1) * (definition.frameMs || 100)),
      duration: 260,
      ease: "Quad.In",
      onComplete: () => {
        effect.destroy();
      }
    });
  }

  scaleSupportAttackEffect(effect, definition, frameIndex) {
    if (
      definition.matchPlayerDisplayHeight &&
      frameIndex <= (definition.attackEffectMatchPlayerUntilFrameIndex ?? -1)
    ) {
      const frameHeight = Math.max(effect?.frame?.height || 1, 1);
      const playerHeight = this.playerSprite?.displayHeight || 104;
      effect.setScale(playerHeight / frameHeight);
      return;
    }

    this.scaleWorldImageToFit(effect, definition.attackEffectLongestSide || 360);
  }

  pullEnemiesTowardSupport(support, definition, delta) {
    const screenTargetMode = definition.suctionTargetMode === "screen";
    const view = this.cameras.main.worldView;
    const screenPadding = definition.suctionScreenPadding || 0;
    const radius = screenTargetMode
      ? Math.max(definition.suctionRadius || 0, Math.hypot(view.width, view.height) + screenPadding * 2)
      : (definition.suctionRadius || 900);
    const force = definition.suctionForce || 38;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying || !enemy.body) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, support.centerX, support.centerY);
      if (distance <= 0) {
        return;
      }

      if (screenTargetMode) {
        if (
          enemy.x < view.left - screenPadding ||
          enemy.x > view.right + screenPadding ||
          enemy.y < view.top - screenPadding ||
          enemy.y > view.bottom + screenPadding
        ) {
          return;
        }
      } else if (distance > radius) {
        return;
      }

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, support.centerX, support.centerY);
      const pullRatio = screenTargetMode
        ? Phaser.Math.Clamp(1 - distance / Math.max(radius, 1), 0.24, 1)
        : 1 - distance / radius;
      const pullStrength = force * pullRatio * Math.max(0.72, delta / 16.6667);
      const moveSpeed = definition.suctionMoveSpeed || (screenTargetMode ? 680 : 520);
      const moveStep = Math.min(
        Math.max(0, distance - 34),
        moveSpeed * (0.42 + pullRatio * 0.72) * (delta / 1000)
      );
      if (moveStep > 0) {
        enemy.setPosition(
          enemy.x + Math.cos(angle) * moveStep,
          enemy.y + Math.sin(angle) * moveStep
        );
        enemy.body.updateFromGameObject();
      }
      enemy.body.velocity.x *= 0.92 - pullRatio * 0.18;
      enemy.body.velocity.y *= 0.92 - pullRatio * 0.18;
      enemy.body.velocity.x += Math.cos(angle) * pullStrength;
      enemy.body.velocity.y += Math.sin(angle) * pullStrength;
      enemy.supportDamageHoldUntil = Math.max(enemy.supportDamageHoldUntil || 0, this.time.now + 160);
      enemy.suctionVisualUntil = Math.max(enemy.suctionVisualUntil || 0, this.time.now + 120);
      enemy.suctionVisualStrength = Math.max(enemy.suctionVisualStrength || 0, pullRatio);
      enemy.suctionTrailTimer = (enemy.suctionTrailTimer || 0) + 1;

      if (enemy.suctionTrailTimer >= 3) {
        enemy.suctionTrailTimer = 0;
        this.spawnEnemySuctionEffect(enemy, angle, pullRatio, {
          effectTint: definition.glowTint || definition.tint
        });
      }
    });
  }

  updateSupportStatusField(support, delta) {
    const definition = support.definition;
    if (!this.isSupportFieldWindowActive(support)) {
      return;
    }

    support.tickTimerMs += delta;
    if (support.tickTimerMs < (definition.tickMs || 120)) {
      return;
    }

    support.tickTimerMs = 0;
    const radius = definition.radius || 340;
    let affectedCount = 0;
    let newlyAffectedCount = 0;
    const now = this.time.now;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, support.centerX, support.centerY);
      if (distance > radius) {
        return;
      }

      if (definition.statusType === "freeze") {
        const wasFrozen = now < (enemy.freezeUntil || 0);
        enemy.freezeUntil = Math.max(enemy.freezeUntil || 0, now + (definition.statusHoldMs || 240));
        if (!wasFrozen) {
          newlyAffectedCount += 1;
        }
      } else {
        const wasSleeping = now < (enemy.sleepUntil || 0);
        enemy.sleepUntil = Math.max(enemy.sleepUntil || 0, now + (definition.statusHoldMs || 240));
        if (!wasSleeping) {
          newlyAffectedCount += 1;
        }
      }
      enemy.body?.setVelocity(0, 0);
      affectedCount += 1;
    });

    if (
      newlyAffectedCount > 0 &&
      now - (support.lastStatusApplySeAt || 0) >= (definition.statusApplySeCooldownMs || 160)
    ) {
      support.lastStatusApplySeAt = now;
      this.playSupportAttackSe(definition.statusApplySeKey, definition.statusApplySeVolume ?? 0.78);
    }

    if (affectedCount > 0 && definition.statusPulseVisual !== false && Phaser.Math.Between(0, 2) === 0) {
      this.spawnSupportStatusPulse(support.centerX, support.centerY, definition, radius);
    }
  }

  updateSupportHealField(support, delta) {
    const definition = support.definition;
    if (!this.isSupportFieldWindowActive(support)) {
      return;
    }

    support.tickTimerMs += delta;
    if (support.tickTimerMs < (definition.healTickMs || 800)) {
      return;
    }

    support.tickTimerMs = 0;
    const fieldCenter = this.getSupportFieldVisualCenter(support);
    const distance = Phaser.Math.Distance.Between(this.playerHitbox.x, this.playerHitbox.y, fieldCenter.x, fieldCenter.y);
    if (distance > (definition.radius || 280)) {
      return;
    }

    const previousHp = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + (definition.healAmount || 6));
    const healedAmount = this.stats.hp - previousHp;
    if (healedAmount > 0) {
      this.playSupportAttackSe(definition.healTickSeKey, definition.healTickSeVolume ?? 0.72);
    }
    this.spawnSupportHealPulse(this.playerHitbox.x, this.playerHitbox.y - 16, definition, healedAmount);
  }

  updateTimingCoinSupportAttack(support, delta) {
    const definition = support.definition;
    this.updateTimingCoinTitleSequence(support);

    if (!support.timingCoinCutinShown && support.elapsedMs >= (definition.cutinAtMs || 1600)) {
      support.timingCoinCutinShown = true;
      this.showSupportAttackCutin(definition);
    }

    if (!support.timingCoinRevealed && support.elapsedMs >= (definition.revealAtMs || 3800)) {
      this.revealTimingCoinSupport(support);
    }

    if (this.isSupportFieldWindowActive(support)) {
      this.updateTimingCoinTimeStopField(support, delta);
    }

    if (!support.timingCoinCountdownStarted && support.elapsedMs >= (definition.countdownStartMs || 4800)) {
      this.startTimingCoinCountdown(support);
    }

    if (support.timingCoinCountdownStarted) {
      this.updateTimingCoinCountdown(support);
    }
  }

  updateTimingCoinTitleSequence(support) {
    const definition = support.definition;
    const state = support.timingCoinState;
    const frames = definition.titleLetterFrames || [];
    const startMs = definition.titleStartMs || 0;
    const delayMs = definition.titleLetterDelayMs || 180;

    while (
      state.titleLetterIndex < frames.length
      && support.elapsedMs >= startMs + state.titleLetterIndex * delayMs
    ) {
      this.spawnTimingCoinTitleLetter(support, state.titleLetterIndex);
      state.titleLetterIndex += 1;
    }

    const fadeAtMs = startMs + frames.length * delayMs + (definition.titleHoldMs || 700);
    if (!state.titleFaded && support.elapsedMs >= fadeAtMs) {
      state.titleFaded = true;
      this.fadeTimingCoinObjects(state.titleObjects, 240);
    }
  }

  spawnTimingCoinTitleLetter(support, index) {
    const definition = support.definition;
    const frame = definition.titleLetterFrames?.[index];
    if (!frame || !this.textures.exists(frame.textureKey)) {
      return;
    }

    const total = definition.titleLetterFrames.length;
    const source = this.textures.getFrame(frame.textureKey);
    const height = definition.titleLetterDisplayHeight || 112;
    const width = height * ((source?.width || 1) / Math.max(source?.height || 1, 1));
    const maxTotalWidth = definition.titleLetterMaxWidth || GAME_WIDTH - 120;
    const preferredSpacing = definition.titleLetterSpacing || width * 1.08;
    const maxSpacing = total > 1 ? Math.max(width * 0.72, (maxTotalWidth - width) / (total - 1)) : 0;
    const spacing = total > 1 ? Math.min(preferredSpacing, maxSpacing) : 0;
    const x = GAME_WIDTH / 2 - ((total - 1) * spacing) / 2 + index * spacing;
    const y = definition.titleLetterY || GAME_HEIGHT / 2;
    const dropOffsetY = definition.titleLetterDropOffsetY || 72;
    const letter = this.add
      .image(x, y - dropOffsetY, frame.textureKey)
      .setScrollFactor(0)
      .setDepth(665)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.NORMAL);
    letter.setDisplaySize(width, height);
    const targetScaleX = letter.scaleX;
    const targetScaleY = letter.scaleY;
    letter.setScale(targetScaleX * 1.24, targetScaleY * 1.24);

    support.timingCoinState.titleObjects.push(letter);
    this.playSupportAttackSe(
      index >= total - 1 ? definition.titleFinalSeKey : definition.titleLetterSeKey,
      index >= total - 1 ? (definition.titleFinalSeVolume ?? 0.84) : (definition.titleLetterSeVolume ?? 0.78)
    );

    this.tweens.add({
      targets: letter,
      y,
      alpha: 1,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 180,
      ease: "Back.Out"
    });
  }

  revealTimingCoinSupport(support) {
    support.timingCoinRevealed = true;
    this.tweens.add({
      targets: support.sprite,
      alpha: 1,
      duration: 180,
      ease: "Quad.Out"
    });
    this.tweens.add({
      targets: support.shadow,
      alpha: 0.28,
      duration: 180,
      ease: "Quad.Out"
    });
    this.spawnSupportArrivalEffect(support.centerX, support.centerY, support.definition);
  }

  updateTimingCoinTimeStopField(support, delta) {
    const definition = support.definition;
    support.tickTimerMs += delta;
    if (support.tickTimerMs < (definition.tickMs || 80)) {
      return;
    }

    support.tickTimerMs = 0;
    const radius = definition.radius || 760;
    const fieldCenter = this.getSupportFieldVisualCenter(support);
    const now = this.time.now;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, fieldCenter.x, fieldCenter.y);
      if (distance > radius) {
        return;
      }

      enemy.timeStopUntil = Math.max(enemy.timeStopUntil || 0, now + (definition.statusHoldMs || 180));
      enemy.body?.setVelocity(0, 0);
    });
  }

  startTimingCoinCountdown(support) {
    const definition = support.definition;
    const state = support.timingCoinState;
    support.timingCoinCountdownStarted = true;
    this.playSupportAttackBgmOverride({
      ...definition,
      supportBgmKey: definition.countdownBgmKey,
      supportBgmVolume: definition.countdownBgmVolume,
      supportBgmLoop: definition.countdownBgmLoop ?? false,
      supportBgmFadeInMs: definition.countdownBgmFadeInMs,
      supportBgmFadeOutMs: definition.countdownBgmFadeOutMs
    });

    const shade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080500, 0.22)
      .setScrollFactor(0)
      .setDepth(656)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    const clockText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 106, this.formatTimingCoinClock(definition.countdownClockStartMs || 0), {
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        fontSize: "70px",
        color: "#fff5b8",
        stroke: "#5b1700",
        strokeThickness: 10,
        align: "center"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(668);
    const resultText = this.add
      .text(GAME_WIDTH / 2, definition.resultTextY ?? GAME_HEIGHT / 2 - 34, "", {
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        stroke: "#240a00",
        strokeThickness: 8,
        align: "center"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(definition.resultTextDepth ?? 672);
    const pushButton = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, definition.pushTextureKey)
      .setScrollFactor(0)
      .setDepth(669)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    const source = pushButton.texture.getSourceImage();
    const buttonWidth = definition.pushButtonDisplayWidth || 250;
    const buttonHeight = buttonWidth * ((source?.height || 1) / Math.max(source?.width || 1, 1));
    pushButton.setDisplaySize(buttonWidth, buttonHeight);
    pushButton.baseScaleX = pushButton.scaleX;
    pushButton.baseScaleY = pushButton.scaleY;
    pushButton.on("pointerdown", () => {
      this.handleTimingCoinPush(support);
    });

    state.uiObjects.push(shade, clockText, resultText, pushButton);
    support.timingCoinClockText = clockText;
    support.timingCoinResultText = resultText;
    support.timingCoinPushButton = pushButton;

    this.tweens.add({
      targets: [clockText, pushButton],
      alpha: 1,
      duration: 240,
      ease: "Quad.Out"
    });
  }

  updateTimingCoinCountdown(support) {
    const definition = support.definition;
    const elapsedSinceStart = Phaser.Math.Clamp(
      support.elapsedMs - (definition.countdownStartMs || 0),
      0,
      definition.countdownDurationMs || 15000
    );
    const clockMs = (definition.countdownClockStartMs || 0) + elapsedSinceStart;
    support.timingCoinClockText?.setText(this.formatTimingCoinClock(clockMs));

    const perfectOffset = definition.countdownPerfectOffsetMs || 10000;
    const distanceToPerfect = Math.abs(elapsedSinceStart - perfectOffset);
    if (support.timingCoinPushButton?.active && !support.timingCoinState.resolved) {
      const scalePulse = distanceToPerfect <= 360 ? 1.05 + (1 - distanceToPerfect / 360) * 0.12 : 1;
      support.timingCoinPushButton.setScale(
        (support.timingCoinPushButton.baseScaleX || support.timingCoinPushButton.scaleX) * scalePulse,
        (support.timingCoinPushButton.baseScaleY || support.timingCoinPushButton.scaleY) * scalePulse
      );
    }

    if (!support.timingCoinState.resolved && elapsedSinceStart >= (definition.countdownDurationMs || 15000)) {
      this.resolveTimingCoinPush(support, false, Infinity);
    }
  }

  formatTimingCoinClock(totalMs) {
    const normalizedMs = Math.max(0, Math.floor(totalMs));
    const hours = Math.floor(normalizedMs / 3600000);
    const minutes = Math.floor(normalizedMs / 60000) % 60;
    const seconds = Math.floor(normalizedMs / 1000) % 60;
    const centiseconds = Math.floor((normalizedMs % 1000) / 10);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }

  handleTimingCoinPush(support) {
    if (!support?.sprite?.active) {
      return;
    }

    const definition = support.definition;
    const state = support.timingCoinState;
    if (!support.timingCoinCountdownStarted || state.resolved) {
      return;
    }

    const preciseElapsedMs = Number.isFinite(support.startedAt)
      ? this.time.now - support.startedAt
      : support.elapsedMs;
    const elapsedSinceStart = preciseElapsedMs - (definition.countdownStartMs || 0);
    const distanceToPerfect = Math.abs(elapsedSinceStart - (definition.countdownPerfectOffsetMs || 10000));
    this.resolveTimingCoinPush(support, distanceToPerfect <= (definition.successWindowMs || 80), distanceToPerfect);
  }

  resolveTimingCoinPush(support, success, distanceToPerfect) {
    const definition = support.definition;
    const state = support.timingCoinState;
    if (state.resolved) {
      return;
    }

    state.resolved = true;
    state.success = success;
    support.timingCoinPushButton?.disableInteractive();
    if (success) {
      support.timingCoinResultText?.setText("JACKPOT  +20");
      support.timingCoinResultText?.setColor("#fff4a6");
      support.timingCoinPushButton?.setTint(0xfff0a2);
      this.spawnTimingCoinRewardDrops(support, definition);
      this.cameras.main.shake(360, 0.006);
      this.setLastPickupNotice("ISHIDEN JACKPOT +20");
    } else {
      support.timingCoinResultText?.setText(Number.isFinite(distanceToPerfect) ? "MISS" : "TIME OUT");
      support.timingCoinResultText?.setColor("#d5e3ff");
      support.timingCoinPushButton?.setTint(0x8090ff);
      this.setLastPickupNotice("ISHIDEN MISS");
    }

    if (support.timingCoinResultText?.active) {
      support.timingCoinResultText
        .setPosition(GAME_WIDTH / 2, definition.resultTextY ?? GAME_HEIGHT / 2 - 34)
        .setDepth(definition.resultTextDepth ?? 672)
        .setScale(1)
        .setAlpha(1);
      this.tweens.add({
        targets: support.timingCoinResultText,
        scaleX: 1.14,
        scaleY: 1.14,
        yoyo: true,
        duration: 140,
        ease: "Back.Out"
      });
    }

    this.tweens.add({
      targets: support.timingCoinPushButton,
      scaleX: (support.timingCoinPushButton?.scaleX || 1) * 1.16,
      scaleY: (support.timingCoinPushButton?.scaleY || 1) * 1.16,
      yoyo: true,
      duration: 120,
      ease: "Quad.Out"
    });
  }

  spawnTimingCoinRewardDrops(support, definition) {
    const dropCount = Math.min(20, definition.rewardCoinDropCount || 20);
    const dropDefinitions = [
      RARE_ITEM_DEFINITIONS.gold,
      RARE_ITEM_DEFINITIONS.silver,
      RARE_ITEM_DEFINITIONS.silver,
      RARE_ITEM_DEFINITIONS.bronze,
      RARE_ITEM_DEFINITIONS.bronze
    ].filter(Boolean);
    const bounds = this.getStagePlayBounds(this.currentStage, 80) || {
      left: 80,
      right: WORLD_WIDTH - 80,
      top: 80,
      bottom: WORLD_HEIGHT - 80
    };
    const centerX = support.centerX || this.playerHitbox.x;
    const centerY = support.centerY || this.playerHitbox.y;

    for (let index = 0; index < dropCount; index += 1) {
      const ring = Math.floor(index / 8);
      const angle = (Math.PI * 2 * index) / Math.min(dropCount, 8) + ring * 0.28;
      const radius = 74 + ring * 58 + (index % 4) * 8;
      const point = this.clampPointToBounds(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius * 0.72,
        bounds
      );
      this.spawnRareItem(point.x, point.y, dropDefinitions[index % dropDefinitions.length]);
    }
  }

  fadeTimingCoinObjects(objects, duration = 180) {
    const activeObjects = (objects || []).filter((object) => object?.active);
    if (!activeObjects.length) {
      return;
    }

    this.tweens.add({
      targets: activeObjects,
      alpha: 0,
      duration,
      ease: "Quad.In",
      onComplete: () => {
        activeObjects.forEach((object) => object.destroy());
      }
    });
  }

  cleanupTimingCoinSupportAttack(support) {
    const state = support.timingCoinState;
    if (!state) {
      return;
    }

    support.timingCoinPushButton?.removeAllListeners();
    this.fadeTimingCoinObjects(state.titleObjects, 120);
    this.fadeTimingCoinObjects(state.uiObjects, 180);
    state.titleObjects = [];
    state.uiObjects = [];
  }

  updateSupportRandomAttack(support, delta) {
    const definition = support.definition;
    support.attackTimerMs += delta;
    if (support.attackTimerMs < (definition.attackIntervalMs || 400)) {
      return;
    }

    support.attackTimerMs = 0;
    const target = this.pickSupportRandomTarget(definition);
    if (!target) {
      return;
    }

    this.spawnSupportRandomStrike(support.x, support.y + 4, target, definition);
    this.applyDamageToEnemy(target, definition.damageAmount || 4, definition.glowTint, {
      sourceX: support.x,
      sourceY: support.y,
      force: definition.knockbackForce || 220,
      recoverMs: 90
    });
  }

  updateSupportFollowThunder(support, delta) {
    const definition = support.definition;
    this.moveSupportFollowNpc(support, definition, delta);

    if (!Number.isFinite(support.nextThunderStrikeAtMs)) {
      support.nextThunderStrikeAtMs = definition.attackInitialDelayMs ?? 320;
    }

    while (support.elapsedMs >= support.nextThunderStrikeAtMs) {
      this.performSupportThunderStrike(support, definition);
      support.nextThunderStrikeAtMs += definition.attackIntervalMs || 980;
    }
  }

  moveSupportFollowNpc(support, definition, delta) {
    const target = this.pickSupportFollowThunderTarget(definition);
    let desiredX;
    let desiredY;

    if (target) {
      const angle = Phaser.Math.Angle.Between(this.playerHitbox.x, this.playerHitbox.y, target.x, target.y);
      const targetDistance = Phaser.Math.Distance.Between(this.playerHitbox.x, this.playerHitbox.y, target.x, target.y);
      const advanceDistance = Math.min(definition.followAdvanceDistance || 90, Math.max(48, targetDistance * 0.44));
      desiredX = this.playerHitbox.x + Math.cos(angle) * advanceDistance;
      desiredY = this.playerHitbox.y + Math.sin(angle) * advanceDistance - 12;
      support.sprite?.setFlipX(target.x < support.x);
    } else {
      const side = this.playerSprite?.flipX ? 1 : -1;
      desiredX = this.playerHitbox.x + side * (definition.supportOffsetX || 118);
      desiredY = this.playerHitbox.y + (definition.supportOffsetY ?? -24);
      support.sprite?.setFlipX(side > 0);
    }

    const deltaX = desiredX - support.x;
    const deltaY = desiredY - support.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 1) {
      const speedBoost = distance > 220 ? 1.35 : 1;
      const maxStep = (definition.followSpeed || 560) * speedBoost * (delta / 1000);
      const moveRatio = Math.min(1, maxStep / distance);
      support.x += deltaX * moveRatio;
      support.y += deltaY * moveRatio;
    }

    this.syncSupportAttackPosition(support);
  }

  pickSupportFollowThunderTarget(definition) {
    const originX = this.playerHitbox.x;
    const originY = this.playerHitbox.y;
    const radius = definition.targetRadius || 700;
    const radiusSq = radius * radius;
    const rankedEnemies = [];
    const view = this.cameras.main.worldView;
    const padding = 120;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const playerDistanceSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, originX, originY);
      if (playerDistanceSq > radiusSq) {
        return;
      }

      const inView = enemy.x >= view.left - padding
        && enemy.x <= view.right + padding
        && enemy.y >= view.top - padding
        && enemy.y <= view.bottom + padding;
      const screenWeight = inView ? 0 : radiusSq * 0.35;
      const supportDistanceSq = Phaser.Math.Distance.Squared(
        enemy.x,
        enemy.y,
        originX + (definition.supportOffsetX || 118),
        originY + (definition.supportOffsetY ?? -24)
      );
      rankedEnemies.push({
        enemy,
        score: playerDistanceSq * 0.68 + supportDistanceSq * 0.22 + screenWeight
      });
    });

    rankedEnemies.sort((left, right) => left.score - right.score);
    return rankedEnemies[0]?.enemy || null;
  }

  performSupportThunderStrike(support, definition) {
    const attackFrameIndex = Phaser.Math.Clamp(definition.attackFrameIndex ?? 2, 0, (definition.animationFrames?.length || 1) - 1);
    const frameKey = definition.animationFrames?.[attackFrameIndex]?.textureKey;
    if (this.textures.exists(frameKey)) {
      support.frameIndex = attackFrameIndex;
      support.currentTextureIndex = attackFrameIndex;
      support.sprite?.setTexture(frameKey);
      this.scaleSupportCharacterSprite(support.sprite, definition, attackFrameIndex);
    }

    if (
      !support.lastThunderSeAt
      || this.time.now - support.lastThunderSeAt >= (definition.thunderSeCooldownMs || 160)
    ) {
      support.lastThunderSeAt = this.time.now;
      this.playSupportAttackSe(definition.thunderSeKey, definition.thunderSeVolume ?? 0.78);
    }
    this.spawnSupportThunderExpansion(support, definition);
    this.cameras.main.shake(110, 0.0016);
  }

  spawnSupportThunderExpansion(support, definition) {
    const frames = definition.fieldEffectFrames || [];
    const firstFrameKey = frames[0]?.textureKey;
    const x = support.centerX;
    const y = support.centerY + (definition.thunderOffsetY || 0);
    const startRadius = definition.thunderRadiusStart || 96;
    const endRadius = definition.thunderRadius || 540;
    const expandMs = definition.thunderExpandMs || 520;
    const hitEnemies = new Set();

    if (this.textures.exists(firstFrameKey)) {
      const ring = this.add
        .image(x, y, firstFrameKey)
        .setDepth(27.2)
        .setAlpha(0.88)
        .setBlendMode(Phaser.BlendModes.ADD);
      const baseSize = Math.max(ring.frame?.width || 1, ring.frame?.height || 1, 1);
      ring.setScale((startRadius * 2) / baseSize);
      this.supportEffectsLayer.add(ring);

      let frameIndex = 0;
      this.time.addEvent({
        delay: definition.fieldEffectFrameMs || 70,
        repeat: Math.max(0, Math.ceil(expandMs / Math.max(definition.fieldEffectFrameMs || 70, 1)) - 1),
        callback: () => {
          frameIndex = (frameIndex + 1) % frames.length;
          const frameKey = frames[frameIndex]?.textureKey;
          if (ring.active && this.textures.exists(frameKey)) {
            ring.setTexture(frameKey);
          }
        }
      });

      this.tweens.add({
        targets: ring,
        scaleX: (endRadius * 2) / baseSize,
        scaleY: (endRadius * 2) / baseSize,
        alpha: 0,
        duration: expandMs,
        ease: "Cubic.Out",
        onComplete: () => {
          ring.destroy();
        }
      });
    } else {
      this.spawnSupportStatusPulse(x, y, definition, endRadius);
    }

    const tickMs = definition.thunderHitTickMs || 45;
    const startAt = this.time.now;
    this.damageSupportThunderRadius(support, x, y, startRadius, hitEnemies);
    this.time.addEvent({
      delay: tickMs,
      repeat: Math.max(0, Math.ceil(expandMs / tickMs) - 1),
      callback: () => {
        const progress = Phaser.Math.Clamp((this.time.now - startAt) / Math.max(expandMs, 1), 0, 1);
        const radius = Phaser.Math.Linear(startRadius, endRadius, Phaser.Math.Easing.Cubic.Out(progress));
        this.damageSupportThunderRadius(support, x, y, radius, hitEnemies);
      }
    });
  }

  damageSupportThunderRadius(support, x, y, radius, hitEnemies) {
    const definition = support.definition;
    let hitCount = 0;
    const now = this.time.now;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying || hitEnemies.has(enemy)) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        return;
      }

      hitEnemies.add(enemy);
      enemy.stunUntil = Math.max(enemy.stunUntil || 0, now + (definition.stunHoldMs || 600));
      enemy.body?.setVelocity(0, 0);
      this.applyDamageToEnemy(enemy, definition.damageAmount || 14, definition.glowTint, {
        sourceX: x,
        sourceY: y,
        force: definition.knockbackForce || 240,
        recoverMs: 120,
        supportFinisher: true
      });
      this.spawnSupportDashHitEffect(enemy.x, enemy.y, definition);
      hitCount += 1;
    });

    if (hitCount > 0) {
      support.thunderHitCount = (support.thunderHitCount || 0) + hitCount;
      this.setLastPickupNotice(`${definition.noticeLabel} ${support.thunderHitCount} HIT`);
    }
  }

  updateSupportDashSlash(support, delta) {
    const definition = support.definition;
    if (support.dashState) {
      this.advanceSupportDashSlash(support, delta);
      return;
    }

    support.dashCooldownMs = Math.max(0, (support.dashCooldownMs || 0) - delta);
    if (support.dashCooldownMs > 0) {
      this.moveSupportTowardDashIdle(support, definition, delta);
      return;
    }

    const target = this.pickSupportDashSlashTarget(definition);
    if (!target) {
      this.moveSupportTowardDashIdle(support, definition, delta);
      return;
    }

    this.startSupportDashSlash(support, target, definition);
    this.advanceSupportDashSlash(support, 0);
  }

  moveSupportTowardDashIdle(support, definition, delta) {
    const side = this.playerSprite?.flipX ? 1 : -1;
    const desiredX = this.playerHitbox.x + side * (definition.supportOffsetX || 120);
    const desiredY = this.playerHitbox.y + (definition.supportOffsetY ?? -24);
    const deltaX = desiredX - support.x;
    const deltaY = desiredY - support.y;
    const distance = Math.hypot(deltaX, deltaY);

    support.sprite?.setFlipX(side > 0);
    if (distance > 1) {
      const maxStep = (definition.returnSpeed || 560) * (delta / 1000);
      const moveRatio = Math.min(1, maxStep / distance);
      support.x += deltaX * moveRatio;
      support.y += deltaY * moveRatio;
    }

    this.syncSupportAttackPosition(support);
  }

  startSupportDashSlash(support, target, definition) {
    const startX = support.x;
    const startY = support.y;
    const targetX = target.x;
    const targetY = target.y - 6;
    let angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

    if (Phaser.Math.Distance.Between(startX, startY, targetX, targetY) < 12) {
      angle = Phaser.Math.Angle.Between(this.playerHitbox.x, this.playerHitbox.y, targetX, targetY);
    }

    const overshoot = definition.dashOvershoot || 140;
    const rawEndX = targetX + Math.cos(angle) * overshoot;
    const rawEndY = targetY + Math.sin(angle) * overshoot;
    const bounds = this.getStageMovementBounds(this.currentStage, 28) || {
      left: 28,
      top: 28,
      right: WORLD_WIDTH - 28,
      bottom: WORLD_HEIGHT - 28
    };
    const endPoint = this.clampPointToBounds(rawEndX, rawEndY, bounds);
    const travelDistance = Phaser.Math.Distance.Between(startX, startY, endPoint.x, endPoint.y);
    const travelMs = Math.max(80, (travelDistance / Math.max(definition.dashSpeed || 1200, 1)) * 1000);

    support.sprite?.setFlipX(endPoint.x < startX);
    support.frameTimerMs = 0;
    support.dashState = {
      startX,
      startY,
      endX: endPoint.x,
      endY: endPoint.y,
      angle,
      elapsedMs: -(definition.dashWindupMs || 0),
      travelMs,
      hitEnemies: new Set(),
      moveSePlayed: false,
      trailTimerMs: 999
    };
  }

  advanceSupportDashSlash(support, delta) {
    const definition = support.definition;
    const dash = support.dashState;
    if (!dash) {
      return;
    }

    const previousX = support.x;
    const previousY = support.y;
    dash.elapsedMs += delta;

    if (dash.elapsedMs < 0) {
      support.x = dash.startX;
      support.y = dash.startY;
      this.syncSupportAttackPosition(support);
      return;
    }

    if (!dash.moveSePlayed) {
      dash.moveSePlayed = true;
      this.playSupportAttackSe(definition.dashMoveSeKey, definition.dashMoveSeVolume ?? 0.74);
    }

    const progress = Phaser.Math.Clamp(dash.elapsedMs / Math.max(dash.travelMs, 1), 0, 1);
    support.x = Phaser.Math.Linear(dash.startX, dash.endX, progress);
    support.y = Phaser.Math.Linear(dash.startY, dash.endY, progress);
    this.syncSupportAttackPosition(support);

    if (progress > 0) {
      this.damageSupportDashSlashPath(support, previousX, previousY, support.x, support.y);
      dash.trailTimerMs += delta;
      if (dash.trailTimerMs >= 38) {
        dash.trailTimerMs = 0;
        this.spawnSupportDashSlashTrail(previousX, previousY, support.x, support.y, definition);
      }
    }

    if (progress >= 1) {
      support.dashState = null;
      support.dashCooldownMs = definition.dashRetargetDelayMs || 120;
    }
  }

  damageSupportDashSlashPath(support, fromX, fromY, toX, toY) {
    const definition = support.definition;
    const dash = support.dashState;
    const radius = definition.slashRadius || 120;
    const minX = Math.min(fromX, toX) - radius;
    const maxX = Math.max(fromX, toX) + radius;
    const minY = Math.min(fromY, toY) - radius;
    const maxY = Math.max(fromY, toY) + radius;
    let hitCount = 0;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying || dash.hitEnemies.has(enemy)) {
        return;
      }

      if (enemy.x < minX || enemy.x > maxX || enemy.y < minY || enemy.y > maxY) {
        return;
      }

      const distance = this.getPointToSegmentDistance(enemy.x, enemy.y, fromX, fromY, toX, toY);
      if (distance > radius) {
        return;
      }

      dash.hitEnemies.add(enemy);
      hitCount += 1;
      this.applyDamageToEnemy(enemy, definition.damageAmount || 8, definition.glowTint, {
        sourceX: support.x,
        sourceY: support.y,
        force: definition.knockbackForce || 260,
        recoverMs: 90
      });
      this.spawnSupportDashHitEffect(enemy.x, enemy.y, definition);
    });

    if (hitCount > 0) {
      const now = this.time.now;
      if (now - (support.lastDashHitSeAt || 0) >= (definition.dashHitSeCooldownMs || 70)) {
        support.lastDashHitSeAt = now;
        this.playSupportAttackSe(definition.dashHitSeKey, definition.dashHitSeVolume ?? 0.82);
      }
      support.dashHitCount = (support.dashHitCount || 0) + hitCount;
      this.setLastPickupNotice(`${definition.noticeLabel} ${support.dashHitCount} HIT`);
    }
  }

  getPointToSegmentDistance(pointX, pointY, startX, startY, endX, endY) {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSq = segmentX * segmentX + segmentY * segmentY;
    if (lengthSq <= 0.0001) {
      return Phaser.Math.Distance.Between(pointX, pointY, startX, startY);
    }

    const t = Phaser.Math.Clamp(
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / lengthSq,
      0,
      1
    );
    const closestX = startX + segmentX * t;
    const closestY = startY + segmentY * t;
    return Phaser.Math.Distance.Between(pointX, pointY, closestX, closestY);
  }

  pickSupportDashSlashTarget(definition) {
    const originX = this.playerHitbox.x;
    const originY = this.playerHitbox.y;
    const radius = definition.targetRadius || 720;
    const radiusSq = radius * radius;
    const rankedEnemies = [];

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distanceSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, originX, originY);
      if (distanceSq > radiusSq) {
        return;
      }

      rankedEnemies.push({ enemy, distanceSq });
    });

    rankedEnemies.sort((left, right) => left.distanceSq - right.distanceSq);
    return rankedEnemies[0]?.enemy || null;
  }

  pickSupportRandomTarget(definition) {
    const view = this.cameras.main.worldView;
    const padding = definition.targetPadding || 120;
    const candidates = [];
    const fallback = [];

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      fallback.push(enemy);
      if (
        enemy.x >= view.left - padding &&
        enemy.x <= view.right + padding &&
        enemy.y >= view.top - padding &&
        enemy.y <= view.bottom + padding
      ) {
        candidates.push(enemy);
      }
    });

    const pool = candidates.length > 0 ? candidates : fallback;
    return pool.length > 0 ? Phaser.Utils.Array.GetRandom(pool) : null;
  }

  applySupportAreaDamage(x, y, radius, damage, definition, knockbackForce) {
    let hitCount = 0;

    this.enemies.children.each((enemy) => {
      if (!enemy.active || enemy.isDying) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        return;
      }

      const falloff = Phaser.Math.Clamp(1 - distance / Math.max(radius, 1), 0, 1);
      this.applyDamageToEnemy(enemy, Math.max(1, Math.round(damage * (0.74 + falloff * 0.34))), definition.glowTint, {
        sourceX: x,
        sourceY: y,
        force: knockbackForce,
        recoverMs: 160,
        supportFinisher: true
      });
      hitCount += 1;
    });

    this.setLastPickupNotice(`${definition.noticeLabel} ${hitCount} HIT`);
  }

  spawnSupportBurstEffect(x, y, definition) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(27)
      .setScale(1.6)
      .setTint(definition.glowTint)
      .setAlpha(0.94)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .image(x, y + 18, "skill-hit-ring")
      .setDepth(27)
      .setScale(1.2, 0.72)
      .setTint(definition.tint)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    const pillar = this.add
      .rectangle(x, y - 145, 90, 310, definition.tint, 0.32)
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add([glow, ring, pillar]);
    this.tweens.add({
      targets: glow,
      scaleX: 6.2,
      scaleY: 6.2,
      alpha: 0,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => {
        glow.destroy();
      }
    });
    this.tweens.add({
      targets: ring,
      scaleX: 7.4,
      scaleY: 2.1,
      alpha: 0,
      duration: 460,
      ease: "Cubic.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
    this.tweens.add({
      targets: pillar,
      scaleY: 1.45,
      alpha: 0,
      duration: 360,
      ease: "Quad.Out",
      onComplete: () => {
        pillar.destroy();
      }
    });
  }

  spawnSupportStatusPulse(x, y, definition, radius) {
    const ring = this.add
      .image(x, y + 14, "skill-hit-ring")
      .setDepth(25)
      .setScale(radius / 42, radius / 64)
      .setTint(definition.glowTint)
      .setAlpha(0.44)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add(ring);
    this.tweens.add({
      targets: ring,
      scaleX: ring.scaleX * 1.18,
      scaleY: ring.scaleY * 1.18,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  spawnSupportHealPulse(x, y, definition, healedAmount) {
    const glow = this.add
      .image(x, y, "skill-hit-glow")
      .setDepth(27)
      .setScale(0.84)
      .setTint(definition.glowTint)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add(glow);
    this.tweens.add({
      targets: glow,
      scaleX: 1.92,
      scaleY: 1.92,
      alpha: 0,
      duration: 360,
      ease: "Quad.Out",
      onComplete: () => {
        glow.destroy();
      }
    });

    if (healedAmount > 0) {
      this.spawnPlayerHealNumber(healedAmount);
    }
  }

  spawnSupportDashSlashTrail(startX, startY, endX, endY, definition) {
    const length = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    if (length < 8) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
    const centerX = (startX + endX) * 0.5;
    const centerY = (startY + endY) * 0.5;
    const slash = this.add
      .rectangle(centerX, centerY, length + 46, 14, definition.tint, 0.32)
      .setDepth(24.8)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .rectangle(centerX, centerY, length + 34, 4, 0xffffff, 0.72)
      .setDepth(24.9)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add([slash, core]);
    this.tweens.add({
      targets: [slash, core],
      alpha: 0,
      duration: 150,
      ease: "Quad.Out",
      onComplete: () => {
        slash.destroy();
        core.destroy();
      }
    });
  }

  spawnSupportDashHitEffect(x, y, definition) {
    const spark = this.add
      .image(x, y - 4, "skill-hit-spark")
      .setDepth(28)
      .setScale(0.46)
      .setTint(definition.glowTint)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.supportEffectsLayer.add(spark);
    this.tweens.add({
      targets: spark,
      scaleX: 0.94,
      scaleY: 0.94,
      alpha: 0,
      duration: 180,
      ease: "Quad.Out",
      onComplete: () => {
        spark.destroy();
      }
    });
  }

  spawnSupportRandomStrike(startX, startY, target, definition) {
    const endX = target.x + Phaser.Math.Between(-8, 8);
    const endY = target.y + Phaser.Math.Between(-10, 6);
    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
    const length = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const centerX = (startX + endX) * 0.5;
    const centerY = (startY + endY) * 0.5;
    const slash = this.add
      .rectangle(centerX, centerY, length, 12, definition.tint, 0.34)
      .setDepth(26)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .rectangle(centerX, centerY, length, 4, 0xffffff, 0.88)
      .setDepth(27)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);
    const hit = this.add
      .image(endX, endY, "skill-hit-spark")
      .setDepth(28)
      .setScale(0.58)
      .setTint(definition.glowTint)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setRotation(angle);

    this.supportEffectsLayer.add([slash, core, hit]);
    this.tweens.add({
      targets: [slash, core, hit],
      alpha: 0,
      duration: 140,
      ease: "Quad.Out",
      onComplete: () => {
        slash.destroy();
        core.destroy();
        hit.destroy();
      }
    });
  }

  finishSupportAttack(support, restoreNormalBgm = true) {
    if (support.definition?.type === "timingCoin") {
      this.cleanupTimingCoinSupportAttack(support);
    }
    this.stopSupportAttackAudio(support.definition, restoreNormalBgm);
    const objects = [support.sprite, support.shadow, ...(support.fieldObjects || [])].filter(Boolean);
    this.tweens.add({
      targets: objects,
      alpha: 0,
      duration: 210,
      ease: "Quad.In",
      onComplete: () => {
        objects.forEach((object) => {
          if (object?.active) {
            object.destroy();
          }
        });
      }
    });
  }

  gainExperience(value) {
    this.stats.xp += value;

    while (this.stats.xp >= this.stats.nextLevelXp) {
      this.stats.xp -= this.stats.nextLevelXp;
      this.stats.level += 1;
      this.stats.nextLevelXp = Math.floor(this.stats.nextLevelXp * 1.45);
      this.pendingLevelUps += 1;
    }

    if (this.pendingLevelUps > 0 && !this.levelUpActive) {
      this.showLevelUpChoices();
    }
  }

  showLevelUpChoices() {
    const skillChoices = this.getAvailableSkillChoices();
    const passiveChoices = Phaser.Utils.Array.Shuffle(this.getPassiveUpgradeChoices());
    const skillChoiceLimit = Math.min(passiveChoices.length > 0 ? 2 : 3, skillChoices.length);
    const upgrades = [...skillChoices.slice(0, skillChoiceLimit), ...passiveChoices].slice(0, 3);
    const isStartingDraft = this.startingUpgradeSelectionsRemaining > 0 && this.survivalTime === 0;

    this.levelUpActive = true;
    this.cancelActiveEnemyBeamCharges();
    this.physics.world.pause();

    this.showOverlay(
      isStartingDraft ? "Opening Boost" : "Level Up",
      isStartingDraft
        ? `開始前に ${this.startingUpgradeSelectionsRemaining} 回ぶんの強化を選択`
        : "左クリックで1つ選んで強化を獲得",
      upgrades
    );
  }

  getPassiveUpgradeChoices() {
    return [
      {
        title: "Overcharge Bolt",
        description: "電撃ダメージ +1",
        onSelect: () => {
          this.stats.bulletDamage += 1;
        }
      },
      {
        title: "Rapid Sigil",
        description: "放電間隔 -70ms",
        onSelect: () => {
          this.stats.fireInterval = Math.max(160, this.stats.fireInterval - 70);
        }
      },
      {
        title: "Swift Step",
        description: "移動速度 +30",
        onSelect: () => {
          this.stats.moveSpeed += 30;
        }
      },
      {
        title: "Stamina Core",
        description: "最大スタミナ +25、スタミナも25回復",
        onSelect: () => {
          this.stats.maxStamina += 25;
          this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 25);
          this.updateDashStaminaGauge();
        }
      },
      {
        title: "Vital Bloom",
        description: "最大HP +20、HPも20回復",
        onSelect: () => {
          const previousHp = this.stats.hp;
          this.stats.maxHp += 20;
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 20);
          this.spawnPlayerHealNumber(this.stats.hp - previousHp);
        }
      }
    ];
  }

  getAvailableSkillChoices() {
    return Object.keys(SKILL_DEFINITIONS)
      .map((skillId) => this.buildSkillChoice(skillId))
      .filter(Boolean);
  }

  buildSkillChoice(skillId) {
    if (this.playerSkills[skillId]) {
      return this.buildSkillUpgradeChoice(skillId);
    }

    return this.buildSkillUnlockChoice(skillId);
  }

  buildSkillUnlockChoice(skillId) {
    const definition = SKILL_DEFINITIONS[skillId];
    if (!definition?.stages?.length) {
      return null;
    }

    const firstStage = definition.stages[0];
    return {
      title: `Unlock ${definition.name}`,
      description: this.buildSkillUnlockSummary(definition, firstStage),
      onSelect: () => {
        this.unlockSkill(skillId);
      }
    };
  }

  buildSkillUpgradeChoice(skillId) {
    const skillState = this.playerSkills[skillId];
    if (!skillState) {
      return null;
    }

    const currentStage = skillState.definition.stages[skillState.stageIndex];
    const nextStage = skillState.definition.stages[skillState.stageIndex + 1];

    if (!nextStage) {
      return null;
    }

    return {
      title: `${skillState.definition.name} Stage ${nextStage.stage}`,
      description: this.buildSkillGrowthSummary(skillState.definition, currentStage, nextStage),
      onSelect: () => {
        this.upgradeSkill(skillId);
      }
    };
  }

  buildSkillUnlockSummary(definition, stageData) {
    if (definition.behavior === "screenHoming") {
      return `追尾竜巻を解放 / DMG ${stageData.damage} / HIT ${stageData.contactTickMs}ms / TOR ${stageData.unitCount || 1}`;
    }
    if (definition.behavior === "directionalDash") {
      return `雷兎突進を解放 / DMG ${stageData.damage} / HIT ${stageData.contactTickMs}ms / DST ${stageData.dashDistance || 0}`;
    }

    return `周回球を強化 / ${this.buildSkillStatsSummary(stageData, definition)}`;
  }

  buildSkillGrowthSummary(definition, currentStage, nextStage) {
    const changes = [];

    if (currentStage.damage !== nextStage.damage) {
      changes.push(`DMG ${currentStage.damage}->${nextStage.damage}`);
    }
    if (currentStage.contactTickMs !== nextStage.contactTickMs) {
      changes.push(`HIT ${currentStage.contactTickMs}->${nextStage.contactTickMs}ms`);
    }

    if (definition.behavior === "screenHoming" || definition.behavior === "directionalDash") {
      if ((currentStage.unitCount || 1) !== (nextStage.unitCount || 1)) {
        changes.push(`${definition.behavior === "screenHoming" ? "TOR" : "RAB"} ${currentStage.unitCount || 1}->${nextStage.unitCount || 1}`);
      }
      if (currentStage.moveSpeed !== nextStage.moveSpeed) {
        changes.push(`SPD ${currentStage.moveSpeed}->${nextStage.moveSpeed}`);
      }
      if (currentStage.dashDistance !== nextStage.dashDistance) {
        changes.push(`DST ${currentStage.dashDistance || 0}->${nextStage.dashDistance || 0}`);
      }
      if ((currentStage.cooldownMs || 0) !== (nextStage.cooldownMs || 0)) {
        changes.push(`CD ${currentStage.cooldownMs || 0}->${nextStage.cooldownMs || 0}ms`);
      }
      if (currentStage.hitRadius !== nextStage.hitRadius) {
        changes.push(`SIZE ${currentStage.hitRadius}->${nextStage.hitRadius}`);
      }
      if ((currentStage.impactRadius || 0) !== (nextStage.impactRadius || 0)) {
        changes.push((currentStage.impactRadius || 0) === 0
          ? "IMPACT ON"
          : `IMPACT ${currentStage.impactRadius}->${nextStage.impactRadius}`);
      }
      if ((currentStage.suctionForce || 0) !== (nextStage.suctionForce || 0)) {
        changes.push((currentStage.suctionForce || 0) === 0
          ? "PULL ON"
          : `PULL ${currentStage.suctionForce}->${nextStage.suctionForce}`);
      }
    } else {
      if (currentStage.orbitCount !== nextStage.orbitCount) {
        changes.push(`ORB ${currentStage.orbitCount}->${nextStage.orbitCount}`);
      }
      if (currentStage.hitRadius !== nextStage.hitRadius) {
        changes.push(`SIZE ${currentStage.hitRadius}->${nextStage.hitRadius}`);
      }
      if ((currentStage.autoAttackShots || 1) !== (nextStage.autoAttackShots || 1)) {
        changes.push(`BOLT ${currentStage.autoAttackShots || 1}->${nextStage.autoAttackShots || 1}`);
      }
      if ((currentStage.pulseSpeed || 0) === 0 && (nextStage.pulseSpeed || 0) > 0) {
        changes.push("PULSE ON");
      }
      if ((currentStage.orbitRadiusPulseAmount || 0) === 0 && (nextStage.orbitRadiusPulseAmount || 0) > 0) {
        changes.push("RADIUS WAVE");
      }
    }

    return changes.join(" / ");
  }

  unlockSkill(skillId) {
    const definition = SKILL_DEFINITIONS[skillId];
    if (!definition?.stages?.length || this.playerSkills[skillId]) {
      return;
    }

    const skillState = this.createSkillState(definition);
    this.playerSkills[skillId] = skillState;
    this.applySkillStage(skillState, true);
    this.updateHud();
  }

  upgradeSkill(skillId) {
    const skillState = this.playerSkills[skillId];
    if (!skillState || skillState.stageIndex >= skillState.definition.stages.length - 1) {
      return;
    }

    skillState.stageIndex += 1;
    this.applySkillStage(skillState);
    this.updateHud();
  }

  triggerGameOver() {
    this.gameOver = true;
    this.levelUpActive = false;
    this.supportAttackBgmDuckingCount = 0;
    this.cleanupGensoKnightsEvent(this.gensoKnightsEvent, true);
    this.stopSupportAttackBgmOverride(null, false, true);
    this.fadeBgmToVolume(DEFAULT_BGM_VOLUME, SUPPORT_ATTACK_BGM_DUCK_OUT_MS);
    this.cancelActiveEnemyBeamCharges();
    this.physics.world.pause();
    this.gameOverRecordState = this.saveBestRecordIfNeeded();
    this.pendingRankingRecord = this.gameOverRecordState.currentRecord;
    this.pendingRankingSaved = false;
    this.rankingPlayerName = DEFAULT_PLAYER_NAME;
    this.rankingNameEntryActive = true;
    this.rankingNameSelectAll = true;
    this.highlightRankingEntryId = null;
    this.rankingSaveMessage = "名前を入力して Enter、または ENTRY を押す";
    this.showGameOverRankingOverlay();
    this.loadRemoteKillRanking();
  }

  submitPendingRankingEntry() {
    if (!this.pendingRankingRecord || this.pendingRankingSaved) {
      return;
    }

    this.rankingPlayerName = this.normalizePlayerName(this.rankingPlayerName);
    const result = this.addKillRankingEntry(this.rankingPlayerName, this.pendingRankingRecord);
    this.pendingRankingSaved = true;
    this.rankingNameEntryActive = false;
    this.rankingNameSelectAll = false;
    this.highlightRankingEntryId = result.entry.id;
    this.rankingSaveMessage = result.rank > 0
      ? `登録しました: #${result.rank}`
      : "登録しました";
    this.showGameOverRankingOverlay();
    this.submitRemoteKillRankingEntry(result.entry);
  }

  updateRankingNameInputText() {
    if (!this.rankingNameInputText) {
      return;
    }

    const baseName = this.rankingPlayerName || "";
    const cursor = this.rankingNameEntryActive && !this.pendingRankingSaved ? "_" : "";
    const displayName = this.rankingNameSelectAll && this.rankingNameEntryActive
      ? `[${baseName}]`
      : baseName;
    this.rankingNameInputText.setText(`${displayName}${cursor}`);
  }

  createGameOverRankingButton(centerX, centerY, width, height, title, description, onSelect) {
    const panel = this.add
      .rectangle(centerX, centerY, width, height, 0x142337, 1)
      .setStrokeStyle(2, 0x6fcfff, 0.28)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(centerX - width / 2 + 22, centerY - 18, title, {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "22px",
      color: "#ecf7ff",
      fontStyle: "bold"
    });

    const detail = this.add.text(centerX - width / 2 + 22, centerY + 8, description, {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "14px",
      color: "#9ab7cc"
    });

    panel.on("pointerover", () => {
      panel.setFillStyle(0x1b3049, 1);
    });

    panel.on("pointerout", () => {
      panel.setFillStyle(0x142337, 1);
    });

    this.overlayContainer.add([panel, label, detail]);
    this.overlayButtons.push(panel, label, detail);
    this.overlayActions.push({ panel, onSelect, handlesOwnFlow: true });
    panel.on("pointerup", (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.activateOverlayAction(panel);
    });
    return panel;
  }

  showGameOverRankingOverlay() {
    const { currentRecord, bestRecord, improved } = this.gameOverRecordState || {};
    if (!currentRecord || !bestRecord) {
      return;
    }

    this.clearOverlayButtons();
    this.configureOverlayPanel(760, 620);
    this.overlayPanel
      .setFillStyle(0x081320, 0.97)
      .setStrokeStyle(2, 0x6fcfff, 0.35);
    this.overlayTitle
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "34px",
        color: "#ecf7ff",
        fontStyle: "bold",
        align: "center"
      })
      .setOrigin(0.5)
      .setPosition(0, -266);
    this.overlayBody
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "17px",
        color: "#9ab7cc",
        align: "center"
      })
      .setOrigin(0.5)
      .setPosition(0, -220);

    const updateLine = improved ? "\nBEST UPDATE!" : "";
    this.overlayTitle.setText("Game Over");
    this.overlayBody.setText(
      `RUN  ${this.formatRecordSummary(currentRecord)}\nBEST ${this.formatRecordSummary(bestRecord)}${updateLine}`
    );

    const nameLabel = this.add.text(-264, -158, this.pendingRankingSaved ? "PLAYER" : "PLAYER NAME", {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "15px",
      color: "#6fcfff",
      fontStyle: "bold"
    });
    const inputPanel = this.add
      .rectangle(0, -122, 540, 48, this.pendingRankingSaved ? 0x102034 : 0x0d1b2c, 1)
      .setStrokeStyle(2, this.pendingRankingSaved ? 0x5aa7d8 : 0x6fcfff, this.pendingRankingSaved ? 0.26 : 0.56);
    this.rankingNameInputText = this.add.text(-248, -138, "", {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "27px",
      color: "#ecf7ff",
      fontStyle: "bold",
      fixedWidth: 496
    });
    const hint = this.add.text(0, -84, this.rankingSaveMessage, {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "15px",
      color: this.pendingRankingSaved ? "#77f0b4" : "#9ab7cc",
      align: "center"
    }).setOrigin(0.5);
    const rankingHeader = this.add.text(0, -44, "LOCAL KILL RANKING", {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "19px",
      color: "#ecf7ff",
      fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5);
    rankingHeader.setText(this.getDisplayedKillRankingTitle());
    const remoteStatus = this.add.text(0, -18, this.remoteRankingStatus, {
      fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
      fontSize: "13px",
      color: this.remoteRankingStatus.includes("失敗") ? "#ffb3a8" : "#9ab7cc",
      align: "center"
    }).setOrigin(0.5);
    const rankingText = this.add.text(-320, 10, this.formatKillRankingLines(
      this.highlightRankingEntryId,
      this.getDisplayedKillRankingEntries()
    ), {
      fontFamily: "Consolas, Yu Gothic UI, monospace",
      fontSize: "17px",
      color: "#b8d8ec",
      lineSpacing: 3,
      fixedWidth: 640
    });

    this.overlayContainer.add([
      nameLabel,
      inputPanel,
      this.rankingNameInputText,
      hint,
      rankingHeader,
      remoteStatus,
      rankingText
    ]);
    this.overlayButtons.push(
      nameLabel,
      inputPanel,
      this.rankingNameInputText,
      hint,
      rankingHeader,
      remoteStatus,
      rankingText
    );
    this.updateRankingNameInputText();

    if (!this.pendingRankingSaved) {
      this.createGameOverRankingButton(-156, 248, 280, 64, "ENTRY", "ランキングへ登録する", () => {
        this.submitPendingRankingEntry();
      });
      this.createGameOverRankingButton(156, 248, 280, 64, "Restart", "登録せず最初からプレイ", () => {
        this.scene.restart();
      });
    } else {
      this.createGameOverRankingButton(0, 248, 320, 64, "Restart", "最初からもう一度プレイする", () => {
        this.scene.restart();
      });
    }

    this.overlayBackdrop.setVisible(true);
    this.overlayContainer.setVisible(true);
  }

  showOverlay(title, body, buttons) {
    this.clearOverlayButtons();
    const compactButtons = buttons.length > 3;
    const panelHeight = compactButtons ? 532 : 440;
    const titleY = compactButtons ? -206 : -156;
    const bodyY = compactButtons ? -162 : -110;
    const firstButtonY = compactButtons ? -76 : -18;
    const buttonSpacing = compactButtons ? 84 : 96;
    const buttonHeight = compactButtons ? 66 : 74;
    this.configureOverlayPanel(560, panelHeight);
    this.overlayPanel
      .setFillStyle(0x081320, 0.96)
      .setStrokeStyle(2, 0x6fcfff, 0.35);
    this.overlayTitle
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "34px",
        color: "#ecf7ff",
        fontStyle: "bold",
        align: "center"
      })
      .setOrigin(0.5)
      .setPosition(0, titleY);
    this.overlayBody
      .setStyle({
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: "18px",
        color: "#9ab7cc",
        align: "center"
      })
      .setOrigin(0.5)
      .setPosition(0, bodyY);
    this.overlayTitle.setText(title);
    this.overlayBody.setText(body);

    buttons.forEach((button, index) => {
      const y = firstButtonY + index * buttonSpacing;
      const panel = this.add
        .rectangle(0, y, 430, buttonHeight, 0x142337, 1)
        .setStrokeStyle(2, 0x6fcfff, 0.28)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(-182, y - 16, button.title, {
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: compactButtons ? "21px" : "24px",
        color: "#ecf7ff",
        fontStyle: "bold"
      });

      const description = this.add.text(-182, y + (compactButtons ? 8 : 10), button.description, {
        fontFamily: "Segoe UI, Yu Gothic UI, sans-serif",
        fontSize: compactButtons ? "14px" : "16px",
        color: "#9ab7cc"
      });

      panel.on("pointerover", () => {
        panel.setFillStyle(0x1b3049, 1);
      });

      panel.on("pointerout", () => {
        panel.setFillStyle(0x142337, 1);
      });

      this.overlayContainer.add([panel, label, description]);
      this.overlayButtons.push(panel, label, description);
      this.overlayActions.push({ panel, onSelect: button.onSelect, handlesOwnFlow: false });
    });

    this.overlayBackdrop.setVisible(true);
    this.overlayContainer.setVisible(true);
  }

  hideOverlay() {
    this.clearOverlayButtons();
    this.overlayBackdrop.setVisible(false);
    this.overlayContainer.setVisible(false);
  }

  clearOverlayButtons() {
    this.overlayButtons.forEach((item) => item.destroy());
    this.overlayButtons = [];
    this.overlayActions = [];
  }

  handleOverlayPointerUp(pointer) {
    if (pointer.button !== 0 || !this.overlayContainer.visible) {
      return;
    }

    for (const action of this.overlayActions) {
      const bounds = action.panel.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
        this.activateOverlayAction(action.panel);
        break;
      }
    }
  }

  activateOverlayAction(targetPanel) {
    const action = this.overlayActions.find(({ panel }) => panel === targetPanel);
    if (!action) {
      return;
    }

    action.onSelect();
    if (action.handlesOwnFlow) {
      return;
    }

    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    if (this.startingUpgradeSelectionsRemaining > 0) {
      this.startingUpgradeSelectionsRemaining -= 1;
    }

    if (this.gameOver) {
      return;
    }

    if (this.pendingLevelUps > 0) {
      this.showLevelUpChoices();
      return;
    }

    this.levelUpActive = false;
    this.hideOverlay();
    this.physics.world.resume();
  }

  getPrimarySkillState() {
    return this.playerSkills[DEFAULT_SKILL_ID] || null;
  }

  getOrderedSkillStates() {
    return Object.values(this.playerSkills).sort((left, right) => {
      if (left.id === DEFAULT_SKILL_ID) {
        return -1;
      }
      if (right.id === DEFAULT_SKILL_ID) {
        return 1;
      }
      return left.definition.name.localeCompare(right.definition.name);
    });
  }

  buildSkillStatsSummary(stageData, definition = null) {
    const effects = [];
    if ((stageData.pulseSpeed || 0) > 0) {
      effects.push("PULSE");
    }
    if ((stageData.suctionForce || 0) > 0) {
      effects.push("PULL");
    }
    if ((stageData.impactRadius || 0) > 0) {
      effects.push("IMPACT");
    }
    if ((stageData.orbitRadiusPulseAmount || 0) > 0) {
      effects.push("WAVE");
    }

    const effectsLabel = effects.length > 0 ? ` / ${effects.join(" ")}` : "";

    if (definition?.behavior === "screenHoming") {
      return `DMG ${stageData.damage} / HIT ${stageData.contactTickMs}ms / TOR ${stageData.unitCount || 1}${effectsLabel}`;
    }
    if (definition?.behavior === "directionalDash") {
      return `DMG ${stageData.damage} / HIT ${stageData.contactTickMs}ms / DST ${stageData.dashDistance || 0}${effectsLabel}`;
    }

    return `DMG ${stageData.damage} / HIT ${stageData.contactTickMs}ms / ORB ${stageData.orbitCount} / BOLT ${stageData.autoAttackShots || 1}${effectsLabel}`;
  }

  formatTimeMs(timeMs) {
    const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  updateHud() {
    const timeLabel = this.formatTimeMs(this.survivalTime);
    const wave = this.getCurrentWaveDefinition();
    const activeEnemies = this.getActiveEnemyCount();
    const activeBoss = this.getActiveWaveBoss();
    const bossLabel = activeBoss
      ? "ACTIVE"
      : this.formatTimeMs(Math.max(0, this.nextBossSpawnAt - this.survivalTime));
    const hpRatio = Phaser.Math.Clamp(this.stats.hp / this.stats.maxHp, 0, 1);
    const xpRatio = Phaser.Math.Clamp(this.stats.xp / this.stats.nextLevelXp, 0, 1);
    const pickupText = this.time.now < this.lastPickupNoticeUntil ? `ITEM ${this.lastPickupNotice}` : "";

    this.hudLevelText.setText(`Lv. ${this.stats.level}`);
    this.hudHpText.setText(`${this.stats.hp} / ${this.stats.maxHp}`);
    this.hudXpText.setText(`${this.stats.xp} / ${this.stats.nextLevelXp}`);
    this.hudPickupText.setText(pickupText);
    this.hudTimerText.setText(timeLabel);
    this.hudWaveText.setText(String(wave.id).padStart(2, "0"));
    this.hudKillsText.setText(this.runStats.kills.toLocaleString());
    this.hudObjectiveText.setText(`${wave.label}\nBoss ${bossLabel}  Foes ${activeEnemies}/${wave.maxEnemies}`);
    this.hudResourceText.setText(this.formatHudBestSummary(this.bestRecord));
    this.hudCoinText?.setText(this.normalizeCoinAmount(this.coins).toLocaleString());

    const specialCounts = {
      heal: this.countActiveSpecialItems("heal"),
      magnet: this.countActiveSpecialItems("magnet"),
      bomb: this.countActiveSpecialItems("bomb")
    };
    this.hudConsumableSlots?.forEach((slot) => {
      const key = slot.effectType;
      slot.panel.setAlpha(specialCounts[key] > 0 ? 0.95 : 0.58);
      slot.icon.setAlpha(specialCounts[key] > 0 ? 0.95 : 0.38);
      slot.label.setText(`${slot.baseLabel} ${specialCounts[key]}`);
    });

    this.setHudBarFill(this.hpBarFill, hpRatio);
    this.setHudBarFill(this.xpBarFill, xpRatio);
    this.updateDashStaminaGauge();
    this.updateHudSkillSlots();
    this.updateHudRobotPanel();
    this.updateMinimap();

    if (this.debugHudText) {
      this.debugHudText.setText(
        `DBG DEC ${this.stageDecalInstances?.length || 0} / OBS ${this.stageObstacleInstances?.length || 0}\nLAY D:${this.stageDebugOptions.layerVisibility.decals ? "on" : "off"} O:${this.stageDebugOptions.layerVisibility.obstacles ? "on" : "off"}`
      );
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#040a11",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [SurvivalScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

window.addEventListener("load", () => {
  window.__SURVIVAL_GAME__ = new Phaser.Game(config);
});
