const TOKYO_RANDOM_STAGE_IMAGE_BASE_PATH = "./画像/backgrounds/tokyo_random_stages/";
const TOKYO_RANDOM_STAGE_MOVEMENT_INSET = {
  left: 96,
  right: 96,
  top: 96,
  bottom: 96
};
const TOKYO_RANDOM_STAGE_COLLISION_PRESETS = {
  scrambleCrossing: {
    stageId: "tokyo_stage_01_scramble_crossing",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2380 },
    playBounds: { x: 420, y: 520, width: 3250, height: 3300 },
    collisionZones: [
      { id: "nw_buildings", x: 0, y: 0, width: 910, height: 1320 },
      { id: "north_center_buildings", x: 900, y: 0, width: 870, height: 1040 },
      { id: "ne_round_landmark", x: 2290, y: 0, width: 960, height: 1320 },
      { id: "east_top_buildings", x: 3240, y: 0, width: 856, height: 1330 },
      { id: "east_side_block", x: 3500, y: 1370, width: 596, height: 1180 },
      { id: "se_planter_and_sidewalk", x: 3130, y: 2840, width: 966, height: 1050 },
      { id: "south_center_foreground_block", x: 1450, y: 3650, width: 1250, height: 360 },
      { id: "sw_buildings", x: 0, y: 2820, width: 960, height: 1050 },
      { id: "west_side_block", x: 0, y: 1370, width: 610, height: 1200 },
      { id: "sw_abandoned_vehicle", x: 780, y: 3120, width: 310, height: 260 },
      { id: "east_bus_stop", x: 3560, y: 1220, width: 300, height: 360 },
      { id: "west_bus_stop", x: 360, y: 1220, width: 420, height: 360 }
    ]
  },
  skyscraperPlaza: {
    stageId: "tokyo_stage_02_skyscraper_plaza",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2280 },
    playBounds: { x: 420, y: 560, width: 3230, height: 3220 },
    collisionZones: [
      { id: "nw_tower_base", x: 0, y: 0, width: 1020, height: 1300 },
      { id: "north_tower_row", x: 1040, y: 0, width: 1200, height: 840 },
      { id: "ne_tower_base", x: 2680, y: 0, width: 1050, height: 1320 },
      { id: "east_forecourt_wall", x: 3580, y: 900, width: 516, height: 1720 },
      { id: "east_bus_terminal", x: 3040, y: 1240, width: 420, height: 650 },
      { id: "se_service_block", x: 3050, y: 3000, width: 1046, height: 1000 },
      { id: "south_planter_wall", x: 1330, y: 3590, width: 1450, height: 280 },
      { id: "sw_tower_base", x: 0, y: 2900, width: 1050, height: 1050 },
      { id: "west_building_base", x: 0, y: 1120, width: 560, height: 1600 },
      { id: "left_plaza_planter", x: 930, y: 1480, width: 280, height: 540 },
      { id: "right_plaza_planter", x: 2860, y: 1480, width: 280, height: 540 },
      { id: "north_stair_block", x: 1540, y: 860, width: 760, height: 300 }
    ]
  },
  electricTown: {
    stageId: "tokyo_stage_03_electric_town",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2350 },
    playBounds: { x: 430, y: 500, width: 3240, height: 3330 },
    collisionZones: [
      { id: "nw_shop_block", x: 0, y: 0, width: 900, height: 1420 },
      { id: "north_signage_strip", x: 900, y: 0, width: 1380, height: 760 },
      { id: "ne_shop_block", x: 2800, y: 0, width: 1000, height: 1320 },
      { id: "east_storefronts", x: 3460, y: 1000, width: 636, height: 1550 },
      { id: "east_alley_clutter", x: 3070, y: 1570, width: 300, height: 440 },
      { id: "se_delivery_block", x: 3030, y: 3040, width: 1066, height: 1000 },
      { id: "south_arcade_row", x: 1320, y: 3640, width: 1400, height: 360 },
      { id: "sw_storefronts", x: 0, y: 2920, width: 900, height: 1050 },
      { id: "west_shop_wall", x: 0, y: 1280, width: 600, height: 1480 },
      { id: "west_vendor_cluster", x: 680, y: 2070, width: 280, height: 370 },
      { id: "north_alley_block", x: 1760, y: 800, width: 520, height: 320 },
      { id: "south_small_vehicle_cluster", x: 2530, y: 3260, width: 340, height: 240 }
    ]
  },
  luxuryAvenue: {
    stageId: "tokyo_stage_04_luxury_avenue",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2300 },
    playBounds: { x: 430, y: 520, width: 3240, height: 3270 },
    collisionZones: [
      { id: "nw_luxury_store_block", x: 0, y: 0, width: 1050, height: 1280 },
      { id: "north_glass_facade", x: 1030, y: 0, width: 1450, height: 760 },
      { id: "ne_luxury_store_block", x: 2820, y: 0, width: 1000, height: 1300 },
      { id: "east_boutique_front", x: 3540, y: 960, width: 556, height: 1690 },
      { id: "se_plaza_furniture_block", x: 3030, y: 3000, width: 1066, height: 1000 },
      { id: "south_showroom_row", x: 1280, y: 3630, width: 1520, height: 330 },
      { id: "sw_luxury_store", x: 0, y: 2920, width: 1000, height: 1050 },
      { id: "west_boutique_front", x: 0, y: 1080, width: 580, height: 1700 },
      { id: "left_planter_strip", x: 760, y: 1430, width: 240, height: 600 },
      { id: "right_planter_strip", x: 3120, y: 1430, width: 240, height: 600 },
      { id: "small_center_sculpture_base", x: 1900, y: 1900, width: 210, height: 160 }
    ]
  },
  waterfrontPlaza: {
    stageId: "tokyo_stage_05_waterfront_plaza",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2050, y: 2290 },
    playBounds: { x: 430, y: 560, width: 3220, height: 3220 },
    collisionZones: [
      { id: "nw_mall_block", x: 0, y: 0, width: 1080, height: 1180 },
      { id: "north_building_row", x: 1080, y: 0, width: 1380, height: 680 },
      { id: "ne_waterfront_facility", x: 2480, y: 0, width: 1100, height: 1040 },
      { id: "east_water_edge_railing", x: 3600, y: 650, width: 496, height: 2700 },
      { id: "se_waterfront_drop", x: 3020, y: 2870, width: 1076, height: 1100 },
      { id: "south_promenade_barrier", x: 960, y: 3700, width: 2200, height: 250 },
      { id: "sw_service_building", x: 0, y: 2880, width: 970, height: 1050 },
      { id: "west_service_edge", x: 0, y: 1160, width: 570, height: 1700 },
      { id: "central_north_planter", x: 1510, y: 1010, width: 700, height: 170 },
      { id: "right_dock_shed", x: 3160, y: 1740, width: 320, height: 560 },
      { id: "lower_service_vehicle", x: 2400, y: 3240, width: 440, height: 280 }
    ]
  },
  underpassInfrastructure: {
    stageId: "tokyo_stage_06_underpass_infrastructure",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2320 },
    playBounds: { x: 430, y: 580, width: 3240, height: 3060 },
    collisionZones: [
      { id: "north_retaining_wall", x: 0, y: 0, width: 4096, height: 610 },
      { id: "west_utility_fence", x: 0, y: 620, width: 520, height: 2450 },
      { id: "east_utility_fence", x: 3570, y: 620, width: 526, height: 2450 },
      { id: "south_retaining_wall", x: 0, y: 3480, width: 4096, height: 616 },
      { id: "nw_column_group", x: 620, y: 840, width: 340, height: 1300 },
      { id: "ne_column_group", x: 3130, y: 840, width: 340, height: 1300 },
      { id: "maintenance_bay_nw", x: 1040, y: 660, width: 500, height: 390 },
      { id: "maintenance_bay_ne", x: 2550, y: 660, width: 500, height: 390 },
      { id: "work_vehicle_sw", x: 880, y: 2830, width: 570, height: 360 },
      { id: "drainage_channel_se", x: 2630, y: 2860, width: 680, height: 250 },
      { id: "center_left_support_pillar", x: 1450, y: 1600, width: 180, height: 300 },
      { id: "center_right_support_pillar", x: 2465, y: 1600, width: 180, height: 300 }
    ]
  },
  stationRotary: {
    stageId: "tokyo_stage_07_station_rotary",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2780 },
    playBounds: { x: 430, y: 560, width: 3240, height: 3220 },
    collisionZones: [
      { id: "north_station_wall", x: 0, y: 0, width: 4096, height: 720 },
      { id: "nw_canopy_block", x: 0, y: 720, width: 900, height: 700 },
      { id: "ne_bus_terminal", x: 2920, y: 730, width: 1040, height: 860 },
      { id: "east_station_side", x: 3560, y: 1540, width: 536, height: 1150 },
      { id: "se_bus_bays", x: 2860, y: 2920, width: 1030, height: 1000 },
      { id: "south_station_facade", x: 1120, y: 3650, width: 1800, height: 360 },
      { id: "sw_taxi_block", x: 0, y: 2940, width: 1050, height: 1000 },
      { id: "west_canopy_strip", x: 0, y: 1470, width: 560, height: 1300 },
      { id: "central_rotary_planter", x: 1790, y: 1720, width: 560, height: 800 },
      { id: "east_bus_island", x: 2930, y: 1960, width: 360, height: 500 },
      { id: "north_center_stair_entry", x: 1580, y: 760, width: 860, height: 320 }
    ]
  },
  residentialArterial: {
    stageId: "tokyo_stage_08_residential_arterial",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2350 },
    playBounds: { x: 420, y: 540, width: 3250, height: 3240 },
    collisionZones: [
      { id: "nw_apartment_block", x: 0, y: 0, width: 1000, height: 1240 },
      { id: "north_row_houses", x: 1000, y: 0, width: 1300, height: 740 },
      { id: "ne_shop_block", x: 2760, y: 0, width: 1000, height: 1260 },
      { id: "east_residential_edge", x: 3540, y: 1040, width: 556, height: 1600 },
      { id: "se_parking_lot_edge", x: 2920, y: 2950, width: 1176, height: 1050 },
      { id: "south_low_wall_block", x: 1260, y: 3630, width: 1500, height: 350 },
      { id: "sw_house_block", x: 0, y: 2920, width: 1000, height: 1050 },
      { id: "west_apartment_edge", x: 0, y: 1120, width: 570, height: 1650 },
      { id: "sw_parked_car_cluster", x: 810, y: 3080, width: 500, height: 220 },
      { id: "east_convenience_store_front", x: 3010, y: 1460, width: 380, height: 420 },
      { id: "north_parking_edge", x: 1530, y: 820, width: 560, height: 200 }
    ]
  },
  civicPlaza: {
    stageId: "tokyo_stage_09_civic_plaza",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2280 },
    playBounds: { x: 430, y: 650, width: 3240, height: 3190 },
    collisionZones: [
      { id: "north_civic_building", x: 0, y: 0, width: 4096, height: 820 },
      { id: "nw_stair_block", x: 0, y: 820, width: 900, height: 560 },
      { id: "ne_stair_block", x: 3190, y: 820, width: 906, height: 560 },
      { id: "west_planter_wall", x: 0, y: 1380, width: 610, height: 1400 },
      { id: "east_planter_wall", x: 3486, y: 1380, width: 610, height: 1400 },
      { id: "se_service_area", x: 2960, y: 2920, width: 1136, height: 1050 },
      { id: "south_formal_wall", x: 1160, y: 3660, width: 1780, height: 330 },
      { id: "sw_guardhouse_block", x: 0, y: 2920, width: 980, height: 1050 },
      { id: "north_security_barrier", x: 1380, y: 1000, width: 1040, height: 180 },
      { id: "central_statue_plinth", x: 1920, y: 1530, width: 260, height: 220 },
      { id: "south_planter_island", x: 1620, y: 3100, width: 950, height: 180 }
    ]
  },
  urbanShrineApproach: {
    stageId: "tokyo_stage_10_urban_shrine_approach",
    mapWidth: 4096,
    mapHeight: 4096,
    playerStart: { x: 2048, y: 2380 },
    playBounds: { x: 420, y: 520, width: 3250, height: 3300 },
    collisionZones: [
      { id: "nw_urban_buildings", x: 0, y: 0, width: 1180, height: 1120 },
      { id: "north_temple_edge", x: 1190, y: 0, width: 1320, height: 760 },
      { id: "ne_trees_and_buildings", x: 2790, y: 0, width: 1050, height: 1260 },
      { id: "east_tree_belt", x: 3520, y: 1060, width: 576, height: 1540 },
      { id: "se_shrine_wall", x: 2950, y: 2940, width: 1080, height: 1050 },
      { id: "south_approach_foreground", x: 1350, y: 3650, width: 1400, height: 330 },
      { id: "sw_old_shops", x: 0, y: 2920, width: 1050, height: 1050 },
      { id: "west_wall_and_trees", x: 0, y: 1160, width: 600, height: 1650 },
      { id: "left_lantern_row", x: 1050, y: 1890, width: 100, height: 680 },
      { id: "right_lantern_row", x: 2940, y: 1890, width: 100, height: 680 },
      { id: "north_gate_block", x: 1600, y: 850, width: 900, height: 250 },
      { id: "small_tree_cluster_sw", x: 1020, y: 2910, width: 250, height: 310 }
    ]
  }
};
const TOKYO_RANDOM_STAGE_SPECS = [
  {
    presetKey: "scrambleCrossing",
    name: "Tokyo 01: Scramble Crossing",
    areaLabel: "TOKYO 01 SCRAMBLE",
    imageFile: "tokyo_stage_01_scramble_crossing.png"
  },
  {
    presetKey: "skyscraperPlaza",
    name: "Tokyo 02: Skyscraper Plaza",
    areaLabel: "TOKYO 02 SKYSCRAPER",
    imageFile: "tokyo_stage_02_skyscraper_plaza.png"
  },
  {
    presetKey: "electricTown",
    name: "Tokyo 03: Electric Town",
    areaLabel: "TOKYO 03 ELECTRIC",
    imageFile: "tokyo_stage_03_electric_town.png"
  },
  {
    presetKey: "luxuryAvenue",
    name: "Tokyo 04: Luxury Avenue",
    areaLabel: "TOKYO 04 LUXURY AVE",
    imageFile: "tokyo_stage_04_luxury_avenue.png"
  },
  {
    presetKey: "waterfrontPlaza",
    name: "Tokyo 05: Waterfront Plaza",
    areaLabel: "TOKYO 05 WATERFRONT",
    imageFile: "tokyo_stage_05_waterfront_plaza.png"
  },
  {
    presetKey: "underpassInfrastructure",
    name: "Tokyo 06: Underpass Infrastructure",
    areaLabel: "TOKYO 06 UNDERPASS",
    imageFile: "tokyo_stage_06_underpass_infrastructure.png"
  },
  {
    presetKey: "stationRotary",
    name: "Tokyo 07: Station Rotary",
    areaLabel: "TOKYO 07 STATION",
    imageFile: "tokyo_stage_07_station_rotary.png"
  },
  {
    presetKey: "residentialArterial",
    name: "Tokyo 08: Residential Arterial",
    areaLabel: "TOKYO 08 RESIDENTIAL",
    imageFile: "tokyo_stage_08_residential_arterial.png"
  },
  {
    presetKey: "civicPlaza",
    name: "Tokyo 09: Civic Plaza",
    areaLabel: "TOKYO 09 CIVIC",
    imageFile: "tokyo_stage_09_civic_plaza.png"
  },
  {
    presetKey: "urbanShrineApproach",
    name: "Tokyo 10: Urban Shrine Approach",
    areaLabel: "TOKYO 10 SHRINE ROAD",
    imageFile: "tokyo_stage_10_urban_shrine_approach.png"
  }
];

function createTokyoRandomStageSpawnAreas(playBounds) {
  const inset = 260;
  const band = 520;
  const left = playBounds.x + inset;
  const top = playBounds.y + inset;
  const width = Math.max(1, playBounds.width - inset * 2);
  const height = Math.max(1, playBounds.height - inset * 2);
  const right = left + width;
  const bottom = top + height;

  return [
    { id: "spawn_north", x: left, y: top, width, height: Math.min(band, height * 0.28) },
    { id: "spawn_south", x: left, y: bottom - Math.min(band, height * 0.28), width, height: Math.min(band, height * 0.28) },
    { id: "spawn_west", x: left, y: top, width: Math.min(band, width * 0.28), height },
    { id: "spawn_east", x: right - Math.min(band, width * 0.28), y: top, width: Math.min(band, width * 0.28), height }
  ];
}

function createTokyoRandomStageDefinition(spec) {
  const preset = TOKYO_RANDOM_STAGE_COLLISION_PRESETS[spec.presetKey];
  const baseImage = {
    key: `${preset.stageId}_base`,
    path: `${TOKYO_RANDOM_STAGE_IMAGE_BASE_PATH}${spec.imageFile}`
  };
  const playBounds = {
    ...preset.playBounds,
    wallThickness: 96,
    movementInset: { ...TOKYO_RANDOM_STAGE_MOVEMENT_INSET },
    enemySpawnPadding: 220,
    enemySpawnObstaclePadding: 52
  };

  return {
    id: preset.stageId,
    name: spec.name,
    areaLabel: spec.areaLabel,
    seed: preset.stageId,
    renderMode: "singleImage",
    mapWidth: preset.mapWidth,
    mapHeight: preset.mapHeight,
    backgroundColor: "#11161a",
    worldCenter: { x: preset.mapWidth * 0.5, y: preset.mapHeight * 0.5 },
    playerStart: { ...preset.playerStart },
    playBounds,
    baseImage,
    collisionZonesBlockMovement: false,
    collisionZones: preset.collisionZones.map((zone) => ({ ...zone })),
    enemySpawnAreas: createTokyoRandomStageSpawnAreas(playBounds),
    debug: {
      enabled: false
    }
  };
}

const TOKYO_RANDOM_STAGE_DEFINITIONS = TOKYO_RANDOM_STAGE_SPECS.map(createTokyoRandomStageDefinition);
const LEGACY_SHIBUYA_STAGE_ID = "shibuyaStage1";
const LEGACY_SHIBUYA_STAGE_SOURCE_ID = "tokyo_stage_01_scramble_crossing";

function cloneTokyoStageDefinitionForLegacyId(stage, legacyId) {
  if (!stage || !legacyId) {
    return null;
  }

  const playBounds = stage.playBounds ? { ...stage.playBounds } : undefined;
  if (playBounds?.movementInset) {
    playBounds.movementInset = { ...playBounds.movementInset };
  }

  return {
    ...stage,
    id: legacyId,
    seed: `${legacyId}-compat`,
    baseImage: stage.baseImage ? { ...stage.baseImage, key: `${legacyId}_base` } : undefined,
    worldCenter: stage.worldCenter ? { ...stage.worldCenter } : undefined,
    playerStart: stage.playerStart ? { ...stage.playerStart } : undefined,
    playBounds,
    collisionZones: Array.isArray(stage.collisionZones) ? stage.collisionZones.map((zone) => ({ ...zone })) : [],
    enemySpawnAreas: Array.isArray(stage.enemySpawnAreas) ? stage.enemySpawnAreas.map((area) => ({ ...area })) : [],
    debug: {
      ...(stage.debug || {}),
      enabled: false
    }
  };
}

const SHIBUYA_STAGE1_COMPAT_DEFINITION = cloneTokyoStageDefinitionForLegacyId(
  TOKYO_RANDOM_STAGE_DEFINITIONS.find((stage) => stage.id === LEGACY_SHIBUYA_STAGE_SOURCE_ID) ||
    TOKYO_RANDOM_STAGE_DEFINITIONS[0],
  LEGACY_SHIBUYA_STAGE_ID
);

window.stageDefinitions = {
  tokyoRandomStages: TOKYO_RANDOM_STAGE_DEFINITIONS,
  shibuyaStage1: SHIBUYA_STAGE1_COMPAT_DEFINITION
};
