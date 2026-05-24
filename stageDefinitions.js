const STAGE1_WORLD_CENTER = { x: 3000, y: 3000 };
const STAGE1_TILE_SIZE = 128;
const STAGE1_LAYOUT = {
  roadHalfWidth: 704,
  centerSafeRadius: 250,
  centerSparseRadius: 320,
  centerClearRadius: 330,
  roadEdgeBand: 180,
  decalScatterRadius: 2320,
  playBounds: {
    x: 1650,
    y: 1950,
    width: 2700,
    height: 2100,
    wallThickness: 96,
    movementInset: {
      left: 128,
      right: 128,
      top: 120,
      bottom: 128
    },
    enemySpawnPadding: 220,
    enemySpawnObstaclePadding: 46
  },
  crosswalks: [
    { x: 3000, y: 2232, tilesWide: 6, tilesHigh: 2, rotation: 0 },
    { x: 3000, y: 3768, tilesWide: 6, tilesHigh: 2, rotation: 0 },
    { x: 2232, y: 3000, tilesWide: 6, tilesHigh: 2, rotation: Math.PI * 0.5 },
    { x: 3768, y: 3000, tilesWide: 6, tilesHigh: 2, rotation: Math.PI * 0.5 },
    { x: 2456, y: 2456, tilesWide: 4, tilesHigh: 2, rotation: -Math.PI * 0.25 },
    { x: 3544, y: 2456, tilesWide: 4, tilesHigh: 2, rotation: Math.PI * 0.25 },
    { x: 2456, y: 3544, tilesWide: 4, tilesHigh: 2, rotation: Math.PI * 0.25 },
    { x: 3544, y: 3544, tilesWide: 4, tilesHigh: 2, rotation: -Math.PI * 0.25 },
    { x: 2588, y: 2964, tilesWide: 5, tilesHigh: 2, rotation: Math.PI * 0.5 },
    { x: 3412, y: 3036, tilesWide: 5, tilesHigh: 2, rotation: Math.PI * 0.5 },
    { x: 2820, y: 2736, tilesWide: 4, tilesHigh: 2, rotation: -Math.PI * 0.25 },
    { x: 3180, y: 3264, tilesWide: 4, tilesHigh: 2, rotation: -Math.PI * 0.25 }
  ]
};

const STAGE1_SINGLE_IMAGE_MAP_WIDTH = 4096;
const STAGE1_SINGLE_IMAGE_MAP_HEIGHT = 4096;
const STAGE1_SINGLE_IMAGE_PLAYER_START = { x: 2048, y: 2380 };
const STAGE1_SINGLE_IMAGE_WORLD_CENTER = { x: 2048, y: 2380 };
const STAGE1_SINGLE_IMAGE_PLAY_BOUNDS = {
  x: 420,
  y: 520,
  width: 3250,
  height: 3300,
  wallThickness: 96,
  movementInset: {
    left: 128,
    right: 128,
    top: 120,
    bottom: 128
  },
  enemySpawnPadding: 220,
  enemySpawnObstaclePadding: 46
};
const STAGE1_SINGLE_IMAGE_COLLISION_ZONES = [
  { id: "nw_buildings", x: 0, y: 0, width: 930, height: 1450 },
  { id: "north_center_buildings", x: 900, y: 0, width: 850, height: 1120 },
  { id: "ne_round_building", x: 2300, y: 0, width: 1000, height: 1450 },
  { id: "east_top_buildings", x: 3300, y: 0, width: 796, height: 1450 },
  { id: "east_side_block", x: 3450, y: 1420, width: 646, height: 1350 },
  { id: "se_planter_block", x: 3060, y: 2840, width: 1036, height: 1096 },
  { id: "south_center_block", x: 1380, y: 3580, width: 1320, height: 416 },
  { id: "sw_buildings", x: 0, y: 2700, width: 980, height: 1096 },
  { id: "west_side_block", x: 0, y: 1420, width: 640, height: 1300 },
  { id: "sw_abandoned_vehicle", x: 720, y: 3120, width: 360, height: 300 },
  { id: "east_bus_stop", x: 3550, y: 1260, width: 330, height: 430 },
  { id: "west_bus_stop", x: 350, y: 1260, width: 440, height: 380 },
  { id: "south_signal_pole", x: 1720, y: 2700, width: 180, height: 260 }
];
const STAGE1_SINGLE_IMAGE_SPAWN_AREAS = [
  { id: "north_road", x: 1300, y: 700, width: 900, height: 500 },
  { id: "west_road", x: 650, y: 1500, width: 550, height: 1000 },
  { id: "east_road", x: 2850, y: 1500, width: 550, height: 1100 },
  { id: "south_road", x: 1500, y: 2900, width: 1200, height: 700 }
];
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
    collisionZones: preset.collisionZones.map((zone) => ({ ...zone })),
    enemySpawnAreas: createTokyoRandomStageSpawnAreas(playBounds),
    debug: {
      enabled: false
    }
  };
}

const TOKYO_RANDOM_STAGE_DEFINITIONS = TOKYO_RANDOM_STAGE_SPECS.map(createTokyoRandomStageDefinition);

function createStage1SeededRandom(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  const rng = {
    next() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    float(min = 0, max = 1) {
      return min + rng.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(rng.float(min, max + 1));
    },
    pick(items) {
      return items[rng.int(0, items.length - 1)];
    },
    chance(probability) {
      return rng.next() < probability;
    }
  };

  return rng;
}

function rotateStage1Offset(offsetX, offsetY, rotation = 0) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: offsetX * cos - offsetY * sin,
    y: offsetX * sin + offsetY * cos
  };
}

function getStage1Distance(xA, yA, xB, yB) {
  return Math.hypot(xA - xB, yA - yB);
}

function isPointInStage1Road(x, y) {
  const dx = Math.abs(x - STAGE1_WORLD_CENTER.x);
  const dy = Math.abs(y - STAGE1_WORLD_CENTER.y);
  return dx <= STAGE1_LAYOUT.roadHalfWidth || dy <= STAGE1_LAYOUT.roadHalfWidth;
}

function getStage1RoadEdgeDistance(x, y) {
  const dx = Math.abs(x - STAGE1_WORLD_CENTER.x);
  const dy = Math.abs(y - STAGE1_WORLD_CENTER.y);
  const half = STAGE1_LAYOUT.roadHalfWidth;
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

function isPointNearStage1RoadEdge(x, y, band = STAGE1_LAYOUT.roadEdgeBand) {
  const distance = getStage1RoadEdgeDistance(x, y);
  return distance >= 0 && distance <= band;
}

function isPointNearStage1Roadside(x, y, band = 210) {
  const dx = Math.abs(x - STAGE1_WORLD_CENTER.x);
  const dy = Math.abs(y - STAGE1_WORLD_CENTER.y);
  const edgeX = Math.abs(dx - STAGE1_LAYOUT.roadHalfWidth);
  const edgeY = Math.abs(dy - STAGE1_LAYOUT.roadHalfWidth);
  return edgeX <= band || edgeY <= band;
}

function isPointInStage1Crosswalk(x, y, padding = 0) {
  return STAGE1_LAYOUT.crosswalks.some((band) => {
    const dx = x - band.x;
    const dy = y - band.y;
    const cos = Math.cos(-(band.rotation || 0));
    const sin = Math.sin(-(band.rotation || 0));
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const halfWidth = band.tilesWide * STAGE1_TILE_SIZE * 0.5 + padding;
    const halfHeight = band.tilesHigh * STAGE1_TILE_SIZE * 0.5 + padding;

    return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
  });
}

function collisionToBox(collision) {
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

function isPointNearStage1Obstacle(x, y, obstacles, padding = 0) {
  return obstacles.some((placement) => {
    const box = placement.collisionBox || collisionToBox(placement.collision);
    const left = placement.x + (box.offsetX || 0) - box.width * 0.5 - padding;
    const right = placement.x + (box.offsetX || 0) + box.width * 0.5 + padding;
    const top = placement.y + (box.offsetY || 0) - box.height * 0.5 - padding;
    const bottom = placement.y + (box.offsetY || 0) + box.height * 0.5 + padding;

    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function isPointNearStage1Decal(x, y, placements, minSpacing) {
  const minimumDistance = minSpacing || 0;
  return placements.some((placement) => getStage1Distance(x, y, placement.x, placement.y) < minimumDistance);
}

const STAGE1_DECAL_ASSETS = {
  grassPatch01: {
    textureKey: "stage1-decal-grass-patch-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_grass_patch_01.png"
  },
  grassPatch02: {
    textureKey: "stage1-decal-grass-patch-02",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_grass_patch_02.png"
  },
  crack01: {
    textureKey: "stage1-decal-crack-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_crack_01.png"
  },
  crackGrass01: {
    textureKey: "stage1-decal-crack-grass-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_crack_grass_01.png"
  },
  leafScatter01: {
    textureKey: "stage1-decal-leaf-scatter-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_leaf_scatter_01.png"
  },
  trashPaper01: {
    textureKey: "stage1-decal-trash-paper-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_trash_paper_01.png"
  },
  glass01: {
    textureKey: "stage1-decal-glass-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_glass_01.png"
  },
  vine01: {
    textureKey: "stage1-decal-vine-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_vine_01.png"
  },
  vegetationClusterLarge01: {
    textureKey: "stage1-decal-vegetation-cluster-large-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_vegetation_cluster_large_01.png"
  },
  rubbleMedianBand01: {
    textureKey: "stage1-decal-rubble-median-band-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/decals/decal_rubble_median_band_01.png"
  }
};

const STAGE1_BOUNDARY_ASSETS = {
  buildingStrip01: {
    textureKey: "stage1-boundary-building-strip-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_building_strip_01.png"
  },
  buildingBlockNorth01: {
    textureKey: "stage1-boundary-building-block-north-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_building_block_north_01.png"
  },
  buildingSide01: {
    textureKey: "stage1-boundary-building-side-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_building_side_01.png"
  },
  buildingCorner01: {
    textureKey: "stage1-boundary-building-corner-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_building_corner_01.png"
  },
  tallFacadeWall01: {
    textureKey: "stage1-boundary-tall-facade-wall-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_tall_facade_wall_01.png"
  },
  tallFacadeSide01: {
    textureKey: "stage1-boundary-tall-facade-side-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/boundaries/boundary_tall_facade_side_01.png"
  }
};

const STAGE1_OBSTACLE_COLLISION_PRESETS = {
  carAbandoned: { shape: "rect", offsetX: 0, offsetY: -24, width: 128, height: 42 },
  vendingMachine: { shape: "rect", offsetX: 0, offsetY: -22, width: 36, height: 38 },
  guardrailBroken: { shape: "rect", offsetX: 0, offsetY: -12, width: 132, height: 18 },
  signalPole: { shape: "rect", offsetX: 0, offsetY: -12, width: 22, height: 24 },
  shrub: { shape: "rect", offsetX: 0, offsetY: -18, width: 72, height: 28 },
  signBroken: { shape: "rect", offsetX: 0, offsetY: -12, width: 22, height: 26 },
  barricade: { shape: "rect", offsetX: 0, offsetY: -15, width: 102, height: 22 },
  benchBroken: { shape: "rect", offsetX: 0, offsetY: -15, width: 84, height: 18 }
};

const STAGE1_CAR_OBSTACLE_SCALE = 3;
const STAGE1_CAR_COLLISION_WIDTH_RATIO = 0.82;
const STAGE1_CAR_COLLISION_HEIGHT_RATIO = 0.9;
const STAGE1_CAR_COLLISION_OFFSET_Y_RATIO = -0.52;

const STAGE1_OBSTACLE_TYPE_DEFINITIONS = {
  carAbandoned: {
    type: "car",
    textureKey: "stage1-obstacle-car-abandoned-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_car_abandoned_01.png",
    width: 172,
    height: 88,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 138,
    shadowHeight: 34,
    shadowOffsetY: -6
  },
  vendingMachine: {
    type: "vending",
    textureKey: "stage1-obstacle-vending-machine-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_vending_machine_01.png",
    width: 70,
    height: 90,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 52,
    shadowHeight: 16,
    shadowOffsetY: -6
  },
  guardrailBroken: {
    type: "guardrail",
    textureKey: "stage1-obstacle-guardrail-broken-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_guardrail_broken_01.png",
    width: 148,
    height: 36,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 128,
    shadowHeight: 18,
    shadowOffsetY: -4
  },
  signalPole: {
    type: "signalPole",
    textureKey: "stage1-obstacle-signal-pole-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_signal_pole_01.png",
    width: 68,
    height: 230,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 34,
    shadowHeight: 12,
    shadowOffsetY: -4
  },
  shrub: {
    type: "shrub",
    textureKey: "stage1-obstacle-shrub-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_shrub_01.png",
    width: 104,
    height: 78,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 82,
    shadowHeight: 24,
    shadowOffsetY: -4
  },
  signBroken: {
    type: "sign",
    textureKey: "stage1-obstacle-sign-broken-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_sign_broken_01.png",
    width: 58,
    height: 138,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 30,
    shadowHeight: 12,
    shadowOffsetY: -4
  },
  barricade: {
    type: "barricade",
    textureKey: "stage1-obstacle-barricade-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_barricade_01.png",
    width: 136,
    height: 50,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 116,
    shadowHeight: 18,
    shadowOffsetY: -4
  },
  benchBroken: {
    type: "bench",
    textureKey: "stage1-obstacle-bench-broken-01",
    imagePath: "./画像/backgrounds/shibuya_stage1/obstacles/obstacle_bench_broken_01.png",
    width: 108,
    height: 38,
    anchorX: 0.5,
    anchorY: 1,
    shadowWidth: 90,
    shadowHeight: 16,
    shadowOffsetY: -4
  }
};

function scaleStage1Number(value, scale) {
  return typeof value === "number" ? value * scale : value;
}

function scaleStage1Collision(collision, scale) {
  const scaled = { ...(collision || {}) };

  ["offsetX", "offsetY", "width", "height", "radius"].forEach((key) => {
    scaled[key] = scaleStage1Number(scaled[key], scale);
  });

  return scaled;
}

function createStage1CarCollision(width, height) {
  return {
    shape: "rect",
    offsetX: 0,
    offsetY: height * STAGE1_CAR_COLLISION_OFFSET_Y_RATIO,
    width: width * STAGE1_CAR_COLLISION_WIDTH_RATIO,
    height: height * STAGE1_CAR_COLLISION_HEIGHT_RATIO
  };
}

function createStage1ObstaclePlacement(id, sprite, x, y, options = {}) {
  const definition = STAGE1_OBSTACLE_TYPE_DEFINITIONS[sprite];
  const obstacleScale = definition.type === "car" ? STAGE1_CAR_OBSTACLE_SCALE : 1;
  const width = scaleStage1Number(options.width ?? definition.width, obstacleScale);
  const height = scaleStage1Number(options.height ?? definition.height, obstacleScale);
  const collision =
    definition.type === "car"
      ? createStage1CarCollision(width, height)
      : scaleStage1Collision(options.collision || STAGE1_OBSTACLE_COLLISION_PRESETS[sprite], obstacleScale);
  const shadowWidth = scaleStage1Number(options.shadowWidth ?? definition.shadowWidth, obstacleScale);
  const shadowHeight = scaleStage1Number(options.shadowHeight ?? definition.shadowHeight, obstacleScale);

  return {
    id,
    type: options.type || definition.type,
    sprite,
    x,
    y,
    width,
    height,
    anchorX: options.anchorX ?? definition.anchorX,
    anchorY: options.anchorY ?? definition.anchorY,
    rotation: options.rotation || 0,
    collision,
    collisionBox: collisionToBox(collision),
    blocksMovement: options.blocksMovement ?? true,
    sortY: options.sortY ?? y,
    layer: options.layer || "obstacles",
    zone: options.zone || "perimeter",
    shadowWidth,
    shadowHeight,
    shadowOffsetY: scaleStage1Number(options.shadowOffsetY ?? definition.shadowOffsetY, obstacleScale)
  };
}

const STAGE1_OBSTACLE_LAYOUT_GROUPS = {
  cornerNorthWest: [
    createStage1ObstaclePlacement("obstacle_signal_nw_01", "signalPole", 2264, 2256, { zone: "corner_nw" }),
    createStage1ObstaclePlacement("obstacle_sign_nw_01", "signBroken", 2138, 2148, { zone: "corner_nw", rotation: -0.18 }),
    createStage1ObstaclePlacement("obstacle_vending_nw_01", "vendingMachine", 1904, 2470, { zone: "corner_nw" }),
    createStage1ObstaclePlacement("obstacle_bench_nw_01", "benchBroken", 2042, 2742, { zone: "corner_nw", rotation: -0.04 }),
    createStage1ObstaclePlacement("obstacle_guardrail_nw_01", "guardrailBroken", 2298, 2196, { zone: "corner_nw", rotation: 0.04 }),
    createStage1ObstaclePlacement("obstacle_barricade_nw_01", "barricade", 1978, 2218, { zone: "corner_nw", rotation: -0.03 }),
    createStage1ObstaclePlacement("obstacle_shrub_nw_01", "shrub", 1788, 2318, { zone: "corner_nw_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_nw_02", "shrub", 1866, 2730, { zone: "corner_nw_vegetation" })
  ],
  cornerNorthEast: [
    createStage1ObstaclePlacement("obstacle_signal_ne_01", "signalPole", 3736, 2256, { zone: "corner_ne" }),
    createStage1ObstaclePlacement("obstacle_sign_ne_01", "signBroken", 3866, 2146, { zone: "corner_ne", rotation: 0.16 }),
    createStage1ObstaclePlacement("obstacle_vending_ne_01", "vendingMachine", 4094, 2472, { zone: "corner_ne" }),
    createStage1ObstaclePlacement("obstacle_bench_ne_01", "benchBroken", 3956, 2738, { zone: "corner_ne", rotation: 0.03 }),
    createStage1ObstaclePlacement("obstacle_guardrail_ne_01", "guardrailBroken", 3702, 2198, { zone: "corner_ne", rotation: -0.05 }),
    createStage1ObstaclePlacement("obstacle_barricade_ne_01", "barricade", 4018, 2222, { zone: "corner_ne", rotation: 0.05 }),
    createStage1ObstaclePlacement("obstacle_shrub_ne_01", "shrub", 4212, 2324, { zone: "corner_ne_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_ne_02", "shrub", 4138, 2732, { zone: "corner_ne_vegetation" })
  ],
  cornerSouthWest: [
    createStage1ObstaclePlacement("obstacle_signal_sw_01", "signalPole", 2260, 3746, { zone: "corner_sw" }),
    createStage1ObstaclePlacement("obstacle_sign_sw_01", "signBroken", 2140, 3860, { zone: "corner_sw", rotation: 0.22 }),
    createStage1ObstaclePlacement("obstacle_vending_sw_01", "vendingMachine", 1902, 3528, { zone: "corner_sw" }),
    createStage1ObstaclePlacement("obstacle_bench_sw_01", "benchBroken", 2050, 3268, { zone: "corner_sw", rotation: -0.02 }),
    createStage1ObstaclePlacement("obstacle_guardrail_sw_01", "guardrailBroken", 2300, 3814, { zone: "corner_sw", rotation: 0.05 }),
    createStage1ObstaclePlacement("obstacle_barricade_sw_01", "barricade", 1976, 3782, { zone: "corner_sw", rotation: -0.04 }),
    createStage1ObstaclePlacement("obstacle_shrub_sw_01", "shrub", 1786, 3890, { zone: "corner_sw_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_sw_02", "shrub", 1868, 3276, { zone: "corner_sw_vegetation" })
  ],
  cornerSouthEast: [
    createStage1ObstaclePlacement("obstacle_signal_se_01", "signalPole", 3742, 3748, { zone: "corner_se" }),
    createStage1ObstaclePlacement("obstacle_sign_se_01", "signBroken", 3860, 3858, { zone: "corner_se", rotation: -0.16 }),
    createStage1ObstaclePlacement("obstacle_vending_se_01", "vendingMachine", 4100, 3532, { zone: "corner_se" }),
    createStage1ObstaclePlacement("obstacle_bench_se_01", "benchBroken", 3950, 3270, { zone: "corner_se", rotation: 0.04 }),
    createStage1ObstaclePlacement("obstacle_guardrail_se_01", "guardrailBroken", 3698, 3816, { zone: "corner_se", rotation: -0.05 }),
    createStage1ObstaclePlacement("obstacle_barricade_se_01", "barricade", 4020, 3784, { zone: "corner_se", rotation: 0.06 }),
    createStage1ObstaclePlacement("obstacle_shrub_se_01", "shrub", 4210, 3892, { zone: "corner_se_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_se_02", "shrub", 4136, 3278, { zone: "corner_se_vegetation" })
  ],
  northRoadside: [
    createStage1ObstaclePlacement("obstacle_signal_north_01", "signalPole", 2556, 2250, { zone: "north_crossing" }),
    createStage1ObstaclePlacement("obstacle_signal_north_02", "signalPole", 3444, 2252, { zone: "north_crossing" }),
    createStage1ObstaclePlacement("obstacle_car_north_01", "carAbandoned", 2478, 1918, { zone: "north_roadside", rotation: 0.08 }),
    createStage1ObstaclePlacement("obstacle_car_north_02", "carAbandoned", 3014, 1844, { zone: "north_roadside", rotation: -0.02 }),
    createStage1ObstaclePlacement("obstacle_car_north_03", "carAbandoned", 3566, 1922, { zone: "north_roadside", rotation: -0.09 }),
    createStage1ObstaclePlacement("obstacle_guardrail_north_01", "guardrailBroken", 2766, 2140, { zone: "north_roadside", rotation: 0.04 }),
    createStage1ObstaclePlacement("obstacle_guardrail_north_02", "guardrailBroken", 3238, 2142, { zone: "north_roadside", rotation: -0.03 }),
    createStage1ObstaclePlacement("obstacle_barricade_north_01", "barricade", 3008, 2058, { zone: "north_roadside", rotation: 0.02 }),
    createStage1ObstaclePlacement("obstacle_shrub_north_01", "shrub", 2586, 1762, { zone: "north_outer_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_north_02", "shrub", 3438, 1766, { zone: "north_outer_vegetation" })
  ],
  southRoadside: [
    createStage1ObstaclePlacement("obstacle_car_south_01", "carAbandoned", 2588, 4246, { zone: "south_roadside", rotation: -0.08 }),
    createStage1ObstaclePlacement("obstacle_car_south_02", "carAbandoned", 3142, 4324, { zone: "south_roadside", rotation: 0.03 }),
    createStage1ObstaclePlacement("obstacle_car_south_03", "carAbandoned", 3426, 4250, { zone: "south_roadside", rotation: 0.07 }),
    createStage1ObstaclePlacement("obstacle_guardrail_south_01", "guardrailBroken", 2768, 3868, { zone: "south_roadside", rotation: -0.03 }),
    createStage1ObstaclePlacement("obstacle_guardrail_south_02", "guardrailBroken", 3238, 3872, { zone: "south_roadside", rotation: 0.03 }),
    createStage1ObstaclePlacement("obstacle_barricade_south_01", "barricade", 3002, 3948, { zone: "south_roadside", rotation: -0.02 }),
    createStage1ObstaclePlacement("obstacle_vending_south_02", "vendingMachine", 3130, 4142, { zone: "south_roadside" }),
    createStage1ObstaclePlacement("obstacle_shrub_south_01", "shrub", 2560, 4258, { zone: "south_outer_vegetation" }),
    createStage1ObstaclePlacement("obstacle_shrub_south_02", "shrub", 3446, 4260, { zone: "south_outer_vegetation" })
  ],
  westRoadside: [
    createStage1ObstaclePlacement("obstacle_car_west_01", "carAbandoned", 1812, 2558, { zone: "west_roadside", rotation: -0.12 }),
    createStage1ObstaclePlacement("obstacle_car_west_02", "carAbandoned", 1816, 3468, { zone: "west_roadside", rotation: 0.11 }),
    createStage1ObstaclePlacement("obstacle_guardrail_west_01", "guardrailBroken", 2048, 3008, { zone: "west_roadside", rotation: 0.02 }),
    createStage1ObstaclePlacement("obstacle_barricade_west_01", "barricade", 1984, 3122, { zone: "west_roadside", rotation: 0.04 }),
    createStage1ObstaclePlacement("obstacle_sign_west_02", "signBroken", 2132, 3014, { zone: "west_roadside", rotation: -0.09 }),
    createStage1ObstaclePlacement("obstacle_shrub_west_01", "shrub", 1710, 3010, { zone: "west_outer_vegetation" })
  ],
  eastRoadside: [
    createStage1ObstaclePlacement("obstacle_car_east_01", "carAbandoned", 4186, 2554, { zone: "east_roadside", rotation: 0.1 }),
    createStage1ObstaclePlacement("obstacle_car_east_02", "carAbandoned", 4188, 3462, { zone: "east_roadside", rotation: -0.1 }),
    createStage1ObstaclePlacement("obstacle_guardrail_east_01", "guardrailBroken", 3952, 3010, { zone: "east_roadside", rotation: -0.03 }),
    createStage1ObstaclePlacement("obstacle_barricade_east_01", "barricade", 4018, 2898, { zone: "east_roadside", rotation: -0.04 }),
    createStage1ObstaclePlacement("obstacle_sign_east_02", "signBroken", 3868, 3010, { zone: "east_roadside", rotation: 0.08 }),
    createStage1ObstaclePlacement("obstacle_shrub_east_01", "shrub", 4290, 3012, { zone: "east_outer_vegetation" })
  ],
  innerCrossingAccents: [
    createStage1ObstaclePlacement("obstacle_car_inner_nw_01", "carAbandoned", 2390, 2628, {
      zone: "inner_nw_roadside",
      rotation: -0.18,
      width: 150,
      height: 76,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 108, height: 34 }
    }),
    createStage1ObstaclePlacement("obstacle_vending_inner_nw_01", "vendingMachine", 2518, 2448, {
      zone: "inner_nw_corner",
      rotation: -0.04,
      collision: { shape: "rect", offsetX: 0, offsetY: -20, width: 30, height: 34 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_inner_nw_01", "guardrailBroken", 2578, 2666, {
      zone: "inner_nw_roadside",
      rotation: 0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 104, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_inner_nw_01", "shrub", 2348, 2864, {
      zone: "inner_nw_vegetation",
      width: 92,
      height: 68,
      collision: { shape: "rect", offsetX: 0, offsetY: -16, width: 58, height: 22 }
    }),
    createStage1ObstaclePlacement("obstacle_car_inner_ne_01", "carAbandoned", 3618, 2596, {
      zone: "inner_ne_roadside",
      rotation: 0.16,
      width: 156,
      height: 78,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 112, height: 34 }
    }),
    createStage1ObstaclePlacement("obstacle_barricade_inner_ne_01", "barricade", 3458, 2660, {
      zone: "inner_ne_roadside",
      rotation: -0.1,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 82, height: 18 }
    }),
    createStage1ObstaclePlacement("obstacle_signal_inner_ne_01", "signalPole", 3710, 2854, {
      zone: "inner_ne_corner",
      width: 56,
      height: 188,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 18, height: 22 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_inner_ne_01", "shrub", 3608, 2798, {
      zone: "inner_ne_vegetation",
      width: 112,
      height: 82,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 68, height: 26 }
    }),
    createStage1ObstaclePlacement("obstacle_car_inner_sw_01", "carAbandoned", 2418, 3408, {
      zone: "inner_sw_roadside",
      rotation: 0.12,
      width: 158,
      height: 80,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 114, height: 36 }
    }),
    createStage1ObstaclePlacement("obstacle_bench_inner_sw_01", "benchBroken", 2668, 3422, {
      zone: "inner_sw_corner",
      rotation: -0.06,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 66, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_barricade_inner_sw_01", "barricade", 2552, 3548, {
      zone: "inner_sw_roadside",
      rotation: 0.05,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 82, height: 18 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_inner_sw_01", "shrub", 2778, 3572, {
      zone: "inner_sw_vegetation",
      width: 102,
      height: 76,
      collision: { shape: "rect", offsetX: 0, offsetY: -17, width: 62, height: 24 }
    }),
    createStage1ObstaclePlacement("obstacle_car_inner_se_01", "carAbandoned", 3668, 3428, {
      zone: "inner_se_roadside",
      rotation: -0.14,
      width: 158,
      height: 80,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 114, height: 36 }
    }),
    createStage1ObstaclePlacement("obstacle_bench_inner_se_01", "benchBroken", 3498, 3310, {
      zone: "inner_se_corner",
      rotation: 0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 66, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_inner_se_01", "guardrailBroken", 3412, 3490, {
      zone: "inner_se_roadside",
      rotation: -0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 104, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_inner_se_01", "shrub", 3568, 3548, {
      zone: "inner_se_vegetation",
      width: 112,
      height: 82,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 68, height: 26 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_inner_w_01", "guardrailBroken", 2292, 3048, {
      zone: "inner_w_roadside",
      rotation: 0.02,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 104, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_inner_e_01", "guardrailBroken", 3708, 3068, {
      zone: "inner_e_roadside",
      rotation: -0.03,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 104, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_car_view_nw_01", "carAbandoned", 2428, 2768, {
      zone: "viewport_nw_roadside",
      rotation: -0.2,
      width: 146,
      height: 74,
      collision: { shape: "rect", offsetX: 0, offsetY: -21, width: 104, height: 32 }
    }),
    createStage1ObstaclePlacement("obstacle_barricade_view_nw_01", "barricade", 2578, 2718, {
      zone: "viewport_nw_roadside",
      rotation: 0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -12, width: 76, height: 16 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_view_ne_01", "shrub", 3508, 2742, {
      zone: "viewport_ne_vegetation",
      width: 118,
      height: 86,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 70, height: 26 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_view_ne_01", "guardrailBroken", 3610, 2890, {
      zone: "viewport_ne_roadside",
      rotation: -0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 100, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_bench_view_sw_01", "benchBroken", 2488, 3268, {
      zone: "viewport_sw_roadside",
      rotation: -0.08,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 64, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_car_view_sw_01", "carAbandoned", 2618, 3340, {
      zone: "viewport_sw_roadside",
      rotation: 0.14,
      width: 150,
      height: 76,
      collision: { shape: "rect", offsetX: 0, offsetY: -21, width: 108, height: 34 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_view_se_01", "shrub", 3498, 3268, {
      zone: "viewport_se_vegetation",
      width: 118,
      height: 86,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 70, height: 26 }
    }),
    createStage1ObstaclePlacement("obstacle_barricade_view_se_01", "barricade", 3598, 3164, {
      zone: "viewport_se_roadside",
      rotation: -0.07,
      collision: { shape: "rect", offsetX: 0, offsetY: -12, width: 76, height: 16 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_view_w_01", "guardrailBroken", 2388, 3058, {
      zone: "viewport_w_roadside",
      rotation: 0.03,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 100, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_sign_view_e_01", "signBroken", 3608, 3068, {
      zone: "viewport_e_roadside",
      rotation: 0.1,
      collision: { shape: "rect", offsetX: 0, offsetY: -12, width: 18, height: 22 }
    }),
    createStage1ObstaclePlacement("obstacle_vending_view_n_01", "vendingMachine", 3038, 2684, {
      zone: "viewport_n_urban",
      width: 58,
      height: 76,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 24, height: 30 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_view_n_01", "guardrailBroken", 3164, 2706, {
      zone: "viewport_n_roadside",
      rotation: 0.04,
      width: 128,
      height: 32,
      collision: { shape: "rect", offsetX: 0, offsetY: -9, width: 86, height: 12 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_view_n_01", "shrub", 3276, 2738, {
      zone: "viewport_n_vegetation",
      width: 90,
      height: 66,
      collision: { shape: "rect", offsetX: 0, offsetY: -16, width: 54, height: 22 }
    }),
    createStage1ObstaclePlacement("obstacle_bench_view_s_01", "benchBroken", 3008, 3348, {
      zone: "viewport_s_roadside",
      rotation: 0.04,
      width: 96,
      height: 34,
      collision: { shape: "rect", offsetX: 0, offsetY: -12, width: 58, height: 12 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_view_s_01", "guardrailBroken", 3146, 3372, {
      zone: "viewport_s_roadside",
      rotation: -0.03,
      width: 128,
      height: 32,
      collision: { shape: "rect", offsetX: 0, offsetY: -9, width: 86, height: 12 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_view_s_01", "shrub", 3298, 3346, {
      zone: "viewport_s_vegetation",
      width: 96,
      height: 70,
      collision: { shape: "rect", offsetX: 0, offsetY: -16, width: 58, height: 22 }
    }),
    createStage1ObstaclePlacement("obstacle_car_view_w_01", "carAbandoned", 2390, 3172, {
      zone: "viewport_w_roadside",
      rotation: -0.18,
      width: 142,
      height: 72,
      collision: { shape: "rect", offsetX: 0, offsetY: -20, width: 98, height: 30 }
    }),
    createStage1ObstaclePlacement("obstacle_car_view_e_01", "carAbandoned", 3610, 2868, {
      zone: "viewport_e_roadside",
      rotation: 0.18,
      width: 142,
      height: 72,
      collision: { shape: "rect", offsetX: 0, offsetY: -20, width: 98, height: 30 }
    })
  ],
  targetVisualAnchors: [
    createStage1ObstaclePlacement("obstacle_car_target_sw_01", "carAbandoned", 2198, 3528, {
      zone: "target_sw_overgrown_vehicle",
      rotation: -0.22,
      width: 170,
      height: 86,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 118, height: 36 }
    }),
    createStage1ObstaclePlacement("obstacle_barricade_target_s_01", "barricade", 2868, 3568, {
      zone: "target_s_roadblock",
      rotation: 0.04,
      width: 184,
      height: 58,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 122, height: 18 }
    }),
    createStage1ObstaclePlacement("obstacle_bench_target_se_01", "benchBroken", 3838, 3348, {
      zone: "target_se_vegetation_edge",
      rotation: -0.06,
      width: 132,
      height: 42,
      collision: { shape: "rect", offsetX: 0, offsetY: -13, width: 82, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_target_se_01", "shrub", 3748, 3238, {
      zone: "target_se_dense_vegetation",
      width: 154,
      height: 112,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 86, height: 28 }
    }),
    createStage1ObstaclePlacement("obstacle_shrub_target_sw_01", "shrub", 2352, 3286, {
      zone: "target_sw_dense_vegetation",
      width: 150,
      height: 110,
      collision: { shape: "rect", offsetX: 0, offsetY: -18, width: 84, height: 28 }
    }),
    createStage1ObstaclePlacement("obstacle_car_target_ne_01", "carAbandoned", 3938, 2426, {
      zone: "target_ne_overgrown_vehicle",
      rotation: 0.2,
      width: 172,
      height: 88,
      collision: { shape: "rect", offsetX: 0, offsetY: -22, width: 118, height: 36 }
    }),
    createStage1ObstaclePlacement("obstacle_guardrail_target_ne_01", "guardrailBroken", 3608, 2548, {
      zone: "target_ne_roadside",
      rotation: -0.08,
      width: 140,
      height: 34,
      collision: { shape: "rect", offsetX: 0, offsetY: -10, width: 96, height: 14 }
    }),
    createStage1ObstaclePlacement("obstacle_sign_target_e_01", "signBroken", 4048, 2878, {
      zone: "target_e_signal_edge",
      rotation: 0.12,
      collision: { shape: "rect", offsetX: 0, offsetY: -12, width: 18, height: 22 }
    })
  ]
};

const STAGE1_DISABLED_OBSTACLE_IDS = new Set([
  "obstacle_car_north_02",
  "obstacle_car_south_02",
  "obstacle_car_view_nw_01",
  "obstacle_car_view_sw_01",
  "obstacle_car_view_w_01",
  "obstacle_car_view_e_01",
  "obstacle_car_target_sw_01",
  "obstacle_car_target_ne_01"
]);

const STAGE1_OBSTACLE_PLACEMENTS = Object.values(STAGE1_OBSTACLE_LAYOUT_GROUPS)
  .flat()
  .filter((placement) => !STAGE1_DISABLED_OBSTACLE_IDS.has(placement.id));

function createStage1BoundaryPlacement(id, sprite, x, y, options = {}) {
  return {
    id,
    type: options.type || "buildingBoundary",
    sprite,
    x,
    y,
    width: options.width || 768,
    height: options.height || 192,
    rotation: options.rotation || 0,
    flipX: Boolean(options.flipX),
    flipY: Boolean(options.flipY),
    alpha: options.alpha ?? 1,
    depth: options.depth ?? 8.7,
    layer: "boundaries",
    zone: options.zone || "playfield_edge"
  };
}

const STAGE1_BOUNDARY_PLACEMENTS = [
  createStage1BoundaryPlacement("boundary_north_west_facade_01", "tallFacadeWall01", 2325, 1856, {
    width: 1530,
    height: 360,
    zone: "north_tall_facade"
  }),
  createStage1BoundaryPlacement("boundary_north_east_facade_01", "tallFacadeWall01", 3675, 1856, {
    width: 1530,
    height: 360,
    flipX: true,
    zone: "north_tall_facade"
  }),
  createStage1BoundaryPlacement("boundary_south_west_facade_01", "tallFacadeWall01", 2325, 4144, {
    width: 1530,
    height: 360,
    rotation: Math.PI,
    zone: "south_tall_facade"
  }),
  createStage1BoundaryPlacement("boundary_south_east_facade_01", "tallFacadeWall01", 3675, 4144, {
    width: 1530,
    height: 360,
    rotation: Math.PI,
    flipX: true,
    zone: "south_tall_facade"
  }),
  createStage1BoundaryPlacement("boundary_west_facade_01", "tallFacadeSide01", 1568, 3000, {
    width: 360,
    height: 2230,
    zone: "west_tall_facade"
  }),
  createStage1BoundaryPlacement("boundary_east_facade_01", "tallFacadeSide01", 4432, 3000, {
    width: 360,
    height: 2230,
    flipX: true,
    zone: "east_tall_facade"
  })
];

function createStage1DecalPlacement(id, type, sprite, x, y, options = {}) {
  return {
    id,
    type,
    sprite,
    x,
    y,
    scale: options.scale ?? 1,
    rotation: options.rotation ?? 0,
    alpha: options.alpha ?? 1,
    layer: options.layer || "decals",
    zone: options.zone || "scatter"
  };
}

const STAGE1_DECAL_SCATTER = [
  {
    idPrefix: "outer_grass_a",
    type: "grass",
    sprites: ["grassPatch01"],
    zone: "outer_vegetation",
    count: 32,
    minScale: 0.66,
    maxScale: 0.9,
    minAlpha: 0.54,
    maxAlpha: 0.76,
    rotate: true,
    minSpacing: 82,
    obstaclePadding: 22
  },
  {
    idPrefix: "outer_grass_b",
    type: "grass",
    sprites: ["grassPatch02"],
    zone: "outer_vegetation",
    count: 28,
    minScale: 0.72,
    maxScale: 0.96,
    minAlpha: 0.54,
    maxAlpha: 0.8,
    rotate: true,
    minSpacing: 86,
    obstaclePadding: 22
  },
  {
    idPrefix: "road_crack_inner",
    type: "crack",
    sprites: ["crack01"],
    zone: "road_surface",
    count: 40,
    minScale: 0.68,
    maxScale: 1.04,
    minAlpha: 0.24,
    maxAlpha: 0.42,
    rotate: true,
    minSpacing: 58,
    obstaclePadding: 26
  },
  {
    idPrefix: "inner_road_crack",
    type: "crack",
    sprites: ["crack01"],
    zone: "inner_road_surface",
    count: 62,
    minScale: 0.56,
    maxScale: 0.9,
    minAlpha: 0.18,
    maxAlpha: 0.34,
    rotate: true,
    minSpacing: 46,
    obstaclePadding: 18
  },
  {
    idPrefix: "inner_road_grass_crack",
    type: "crackGrass",
    sprites: ["crackGrass01"],
    zone: "inner_roadside",
    count: 48,
    minScale: 0.54,
    maxScale: 0.82,
    minAlpha: 0.28,
    maxAlpha: 0.48,
    rotate: true,
    minSpacing: 56,
    obstaclePadding: 16
  },
  {
    idPrefix: "inner_road_litter",
    type: "trash",
    sprites: ["trashPaper01", "leafScatter01"],
    zone: "inner_road_surface",
    count: 48,
    minScale: 0.44,
    maxScale: 0.66,
    minAlpha: 0.18,
    maxAlpha: 0.34,
    rotate: true,
    minSpacing: 42,
    obstaclePadding: 10
  },
  {
    idPrefix: "inner_crossing_glass",
    type: "glass",
    sprites: ["glass01"],
    zone: "inner_road_surface",
    count: 22,
    minScale: 0.42,
    maxScale: 0.62,
    minAlpha: 0.14,
    maxAlpha: 0.26,
    rotate: true,
    minSpacing: 48,
    obstaclePadding: 10
  },
  {
    idPrefix: "inner_edge_grass",
    type: "grass",
    sprites: ["grassPatch01", "grassPatch02"],
    zone: "inner_roadside",
    count: 66,
    minScale: 0.5,
    maxScale: 0.76,
    minAlpha: 0.34,
    maxAlpha: 0.58,
    rotate: true,
    minSpacing: 62,
    obstaclePadding: 18
  },
  {
    idPrefix: "inner_edge_vine",
    type: "vine",
    sprites: ["vine01"],
    zone: "inner_roadside",
    count: 28,
    minScale: 0.52,
    maxScale: 0.72,
    minAlpha: 0.28,
    maxAlpha: 0.44,
    rotate: true,
    minSpacing: 78,
    obstaclePadding: 14
  },
  {
    idPrefix: "road_crack_edge",
    type: "crack",
    sprites: ["crack01"],
    zone: "road_edge",
    count: 24,
    minScale: 0.82,
    maxScale: 1.08,
    minAlpha: 0.32,
    maxAlpha: 0.5,
    rotate: true,
    minSpacing: 70,
    obstaclePadding: 20
  },
  {
    idPrefix: "road_crack_grass",
    type: "crackGrass",
    sprites: ["crackGrass01"],
    zone: "roadside",
    count: 26,
    minScale: 0.74,
    maxScale: 1,
    minAlpha: 0.42,
    maxAlpha: 0.62,
    rotate: true,
    minSpacing: 82,
    obstaclePadding: 18
  },
  {
    idPrefix: "sidewalk_leaves",
    type: "leaf",
    sprites: ["leafScatter01"],
    zone: "sidewalk",
    count: 30,
    minScale: 0.62,
    maxScale: 0.92,
    minAlpha: 0.34,
    maxAlpha: 0.58,
    rotate: true,
    minSpacing: 62,
    obstaclePadding: 14
  },
  {
    idPrefix: "perimeter_paper",
    type: "trash",
    sprites: ["trashPaper01"],
    zone: "perimeter",
    count: 20,
    minScale: 0.58,
    maxScale: 0.82,
    minAlpha: 0.28,
    maxAlpha: 0.44,
    rotate: true,
    minSpacing: 58,
    obstaclePadding: 10
  },
  {
    idPrefix: "crosswalk_glass",
    type: "glass",
    sprites: ["glass01"],
    zone: "crosswalk_edge",
    count: 14,
    minScale: 0.54,
    maxScale: 0.74,
    minAlpha: 0.2,
    maxAlpha: 0.34,
    rotate: true,
    minSpacing: 54,
    obstaclePadding: 10
  },
  {
    idPrefix: "outer_vine",
    type: "vine",
    sprites: ["vine01"],
    zone: "outer_vegetation",
    count: 16,
    minScale: 0.68,
    maxScale: 0.92,
    minAlpha: 0.38,
    maxAlpha: 0.56,
    rotate: true,
    minSpacing: 108,
    obstaclePadding: 12
  },
  {
    idPrefix: "roadside_leaves",
    type: "leaf",
    sprites: ["leafScatter01"],
    zone: "roadside",
    count: 18,
    minScale: 0.58,
    maxScale: 0.82,
    minAlpha: 0.3,
    maxAlpha: 0.48,
    rotate: true,
    minSpacing: 60,
    obstaclePadding: 14
  },
  {
    idPrefix: "sidewalk_grass",
    type: "grass",
    sprites: ["grassPatch01", "grassPatch02"],
    zone: "sidewalk",
    count: 24,
    minScale: 0.58,
    maxScale: 0.82,
    minAlpha: 0.44,
    maxAlpha: 0.66,
    rotate: true,
    minSpacing: 84,
    obstaclePadding: 18
  }
];

const STAGE1_OBSTACLE_DECAL_RECIPES = {
  car: [
    {
      type: "crack",
      sprites: ["crack01"],
      chance: 1,
      offsetX: 0,
      offsetY: -6,
      jitterX: 24,
      jitterY: 8,
      minScale: 0.78,
      maxScale: 1.02,
      minAlpha: 0.28,
      maxAlpha: 0.44
    },
    {
      type: "glass",
      sprites: ["glass01"],
      chance: 0.72,
      offsetX: -48,
      offsetY: -2,
      jitterX: 18,
      jitterY: 8,
      minScale: 0.58,
      maxScale: 0.8,
      minAlpha: 0.24,
      maxAlpha: 0.38
    },
    {
      type: "grass",
      sprites: ["grassPatch01", "grassPatch02"],
      chance: 0.72,
      offsetX: 54,
      offsetY: 2,
      jitterX: 18,
      jitterY: 8,
      minScale: 0.58,
      maxScale: 0.82,
      minAlpha: 0.48,
      maxAlpha: 0.72
    },
    {
      type: "trash",
      sprites: ["trashPaper01"],
      chance: 0.4,
      offsetX: -18,
      offsetY: 6,
      jitterX: 18,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.76,
      minAlpha: 0.28,
      maxAlpha: 0.42
    }
  ],
  vending: [
    {
      type: "trash",
      sprites: ["trashPaper01"],
      chance: 0.8,
      offsetX: -14,
      offsetY: 6,
      jitterX: 14,
      jitterY: 8,
      minScale: 0.56,
      maxScale: 0.78,
      minAlpha: 0.26,
      maxAlpha: 0.42
    },
    {
      type: "grass",
      sprites: ["grassPatch02"],
      chance: 0.74,
      offsetX: 12,
      offsetY: 6,
      jitterX: 12,
      jitterY: 8,
      minScale: 0.52,
      maxScale: 0.72,
      minAlpha: 0.46,
      maxAlpha: 0.68
    },
    {
      type: "leaf",
      sprites: ["leafScatter01"],
      chance: 0.46,
      offsetX: 0,
      offsetY: 10,
      jitterX: 14,
      jitterY: 10,
      minScale: 0.52,
      maxScale: 0.76,
      minAlpha: 0.26,
      maxAlpha: 0.42
    }
  ],
  guardrail: [
    {
      type: "vine",
      sprites: ["vine01"],
      chance: 0.76,
      offsetX: -30,
      offsetY: -4,
      jitterX: 20,
      jitterY: 6,
      minScale: 0.62,
      maxScale: 0.86,
      minAlpha: 0.38,
      maxAlpha: 0.56
    },
    {
      type: "grass",
      sprites: ["grassPatch01"],
      chance: 0.68,
      offsetX: 36,
      offsetY: 4,
      jitterX: 18,
      jitterY: 6,
      minScale: 0.52,
      maxScale: 0.78,
      minAlpha: 0.44,
      maxAlpha: 0.66
    },
    {
      type: "crackGrass",
      sprites: ["crackGrass01"],
      chance: 0.64,
      offsetX: 0,
      offsetY: 4,
      jitterX: 22,
      jitterY: 6,
      minScale: 0.66,
      maxScale: 0.88,
      minAlpha: 0.36,
      maxAlpha: 0.54
    }
  ],
  signalPole: [
    {
      type: "grass",
      sprites: ["grassPatch01"],
      chance: 0.72,
      offsetX: -8,
      offsetY: 4,
      jitterX: 10,
      jitterY: 6,
      minScale: 0.48,
      maxScale: 0.7,
      minAlpha: 0.42,
      maxAlpha: 0.64
    },
    {
      type: "vine",
      sprites: ["vine01"],
      chance: 0.5,
      offsetX: 10,
      offsetY: -6,
      jitterX: 10,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.72,
      minAlpha: 0.34,
      maxAlpha: 0.5
    },
    {
      type: "leaf",
      sprites: ["leafScatter01"],
      chance: 0.34,
      offsetX: 0,
      offsetY: 8,
      jitterX: 12,
      jitterY: 6,
      minScale: 0.48,
      maxScale: 0.68,
      minAlpha: 0.24,
      maxAlpha: 0.38
    }
  ],
  sign: [
    {
      type: "grass",
      sprites: ["grassPatch01"],
      chance: 0.64,
      offsetX: -8,
      offsetY: 4,
      jitterX: 10,
      jitterY: 6,
      minScale: 0.46,
      maxScale: 0.68,
      minAlpha: 0.42,
      maxAlpha: 0.62
    },
    {
      type: "vine",
      sprites: ["vine01"],
      chance: 0.42,
      offsetX: 8,
      offsetY: -2,
      jitterX: 8,
      jitterY: 6,
      minScale: 0.5,
      maxScale: 0.7,
      minAlpha: 0.3,
      maxAlpha: 0.46
    },
    {
      type: "leaf",
      sprites: ["leafScatter01"],
      chance: 0.28,
      offsetX: 0,
      offsetY: 8,
      jitterX: 10,
      jitterY: 6,
      minScale: 0.46,
      maxScale: 0.66,
      minAlpha: 0.22,
      maxAlpha: 0.36
    }
  ],
  shrub: [
    {
      type: "grass",
      sprites: ["grassPatch02"],
      chance: 0.76,
      offsetX: 0,
      offsetY: 2,
      jitterX: 18,
      jitterY: 8,
      minScale: 0.62,
      maxScale: 0.84,
      minAlpha: 0.46,
      maxAlpha: 0.7
    },
    {
      type: "crackGrass",
      sprites: ["crackGrass01"],
      chance: 0.48,
      offsetX: -16,
      offsetY: 4,
      jitterX: 16,
      jitterY: 8,
      minScale: 0.6,
      maxScale: 0.82,
      minAlpha: 0.34,
      maxAlpha: 0.52
    },
    {
      type: "leaf",
      sprites: ["leafScatter01"],
      chance: 0.66,
      offsetX: 16,
      offsetY: 6,
      jitterX: 18,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.78,
      minAlpha: 0.26,
      maxAlpha: 0.42
    }
  ],
  barricade: [
    {
      type: "trash",
      sprites: ["trashPaper01"],
      chance: 0.72,
      offsetX: -18,
      offsetY: 4,
      jitterX: 16,
      jitterY: 8,
      minScale: 0.56,
      maxScale: 0.78,
      minAlpha: 0.26,
      maxAlpha: 0.42
    },
    {
      type: "glass",
      sprites: ["glass01"],
      chance: 0.46,
      offsetX: 20,
      offsetY: 4,
      jitterX: 16,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.76,
      minAlpha: 0.2,
      maxAlpha: 0.34
    },
    {
      type: "crack",
      sprites: ["crack01"],
      chance: 0.68,
      offsetX: 0,
      offsetY: 8,
      jitterX: 20,
      jitterY: 8,
      minScale: 0.68,
      maxScale: 0.9,
      minAlpha: 0.26,
      maxAlpha: 0.42
    }
  ],
  bench: [
    {
      type: "leaf",
      sprites: ["leafScatter01"],
      chance: 0.74,
      offsetX: -12,
      offsetY: 6,
      jitterX: 14,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.76,
      minAlpha: 0.26,
      maxAlpha: 0.42
    },
    {
      type: "trash",
      sprites: ["trashPaper01"],
      chance: 0.54,
      offsetX: 18,
      offsetY: 6,
      jitterX: 14,
      jitterY: 8,
      minScale: 0.54,
      maxScale: 0.74,
      minAlpha: 0.24,
      maxAlpha: 0.38
    },
    {
      type: "grass",
      sprites: ["grassPatch01"],
      chance: 0.48,
      offsetX: 0,
      offsetY: 6,
      jitterX: 14,
      jitterY: 8,
      minScale: 0.5,
      maxScale: 0.72,
      minAlpha: 0.42,
      maxAlpha: 0.62
    }
  ]
};

function sampleStage1DecalPoint(rule, rng, obstacles) {
  const scatterRadius = STAGE1_LAYOUT.decalScatterRadius;

  for (let attempt = 0; attempt < 72; attempt += 1) {
    let x = 0;
    let y = 0;

    if (rule.zone === "outer_vegetation") {
      const angle = rng.float(-Math.PI, Math.PI);
      const radius = rng.float(STAGE1_LAYOUT.roadHalfWidth + 760, scatterRadius);
      x = STAGE1_WORLD_CENTER.x + Math.cos(angle) * radius + rng.float(-110, 110);
      y = STAGE1_WORLD_CENTER.y + Math.sin(angle) * radius + rng.float(-110, 110);
    } else if (rule.zone === "perimeter") {
      const angle = rng.float(-Math.PI, Math.PI);
      const radius = rng.float(STAGE1_LAYOUT.roadHalfWidth + 900, scatterRadius);
      x = STAGE1_WORLD_CENTER.x + Math.cos(angle) * radius;
      y = STAGE1_WORLD_CENTER.y + Math.sin(angle) * radius;
    } else if (rule.zone === "crosswalk_edge") {
      const band = STAGE1_LAYOUT.crosswalks[rng.int(0, STAGE1_LAYOUT.crosswalks.length - 1)];
      const halfWidth = band.tilesWide * STAGE1_TILE_SIZE * 0.5;
      const halfHeight = band.tilesHigh * STAGE1_TILE_SIZE * 0.5;
      const edgeSign = rng.chance(0.5) ? -1 : 1;
      const localX = rng.float(-halfWidth, halfWidth);
      const localY = edgeSign * rng.float(halfHeight + 26, halfHeight + 78);
      const rotated = rotateStage1Offset(localX, localY, band.rotation || 0);
      x = band.x + rotated.x;
      y = band.y + rotated.y;
    } else if (rule.zone === "inner_road_surface") {
      const angle = rng.float(-Math.PI, Math.PI);
      const radius = rng.float(STAGE1_LAYOUT.centerSafeRadius + 90, STAGE1_LAYOUT.roadHalfWidth + 260);
      x = STAGE1_WORLD_CENTER.x + Math.cos(angle) * radius + rng.float(-64, 64);
      y = STAGE1_WORLD_CENTER.y + Math.sin(angle) * radius + rng.float(-64, 64);
    } else if (rule.zone === "inner_roadside") {
      const side = rng.int(0, 3);
      const edgeOffset = rng.float(STAGE1_LAYOUT.roadHalfWidth - 150, STAGE1_LAYOUT.roadHalfWidth + 150);
      const travel = rng.float(-660, 660);

      if (side === 0) {
        x = STAGE1_WORLD_CENTER.x - edgeOffset;
        y = STAGE1_WORLD_CENTER.y + travel;
      } else if (side === 1) {
        x = STAGE1_WORLD_CENTER.x + edgeOffset;
        y = STAGE1_WORLD_CENTER.y + travel;
      } else if (side === 2) {
        x = STAGE1_WORLD_CENTER.x + travel;
        y = STAGE1_WORLD_CENTER.y - edgeOffset;
      } else {
        x = STAGE1_WORLD_CENTER.x + travel;
        y = STAGE1_WORLD_CENTER.y + edgeOffset;
      }

      x += rng.float(-52, 52);
      y += rng.float(-52, 52);
    } else {
      x = rng.float(STAGE1_WORLD_CENTER.x - scatterRadius, STAGE1_WORLD_CENTER.x + scatterRadius);
      y = rng.float(STAGE1_WORLD_CENTER.y - scatterRadius, STAGE1_WORLD_CENTER.y + scatterRadius);
    }

    const centerDistance = getStage1Distance(x, y, STAGE1_WORLD_CENTER.x, STAGE1_WORLD_CENTER.y);
    const inRoad = isPointInStage1Road(x, y);
    const nearRoadEdge = isPointNearStage1RoadEdge(x, y);
    const inCrosswalk = isPointInStage1Crosswalk(x, y, 20);

    if (centerDistance < STAGE1_LAYOUT.centerSparseRadius) {
      continue;
    }

    if (rule.zone === "outer_vegetation" && (inRoad || inCrosswalk)) {
      continue;
    }

    if (rule.zone === "sidewalk" && (inRoad || inCrosswalk)) {
      continue;
    }

    if (rule.zone === "road_edge" && (!inRoad || !nearRoadEdge || inCrosswalk)) {
      continue;
    }

    if (rule.zone === "road_surface" && (!inRoad || nearRoadEdge || inCrosswalk)) {
      continue;
    }

    if (rule.zone === "roadside" && (inCrosswalk || !isPointNearStage1Roadside(x, y))) {
      continue;
    }

    if (rule.zone === "inner_road_surface" && (!inRoad || nearRoadEdge || inCrosswalk || centerDistance < STAGE1_LAYOUT.centerSafeRadius + 70)) {
      continue;
    }

    if (rule.zone === "inner_roadside" && (inCrosswalk || centerDistance < STAGE1_LAYOUT.centerSparseRadius || !isPointNearStage1Roadside(x, y, 260))) {
      continue;
    }

    if (rule.zone === "perimeter" && (inRoad || inCrosswalk || centerDistance < STAGE1_LAYOUT.roadHalfWidth + 860)) {
      continue;
    }

    if (rule.zone === "crosswalk_edge" && (inCrosswalk || centerDistance < STAGE1_LAYOUT.centerSparseRadius + 40)) {
      continue;
    }

    if (isPointNearStage1Obstacle(x, y, obstacles, rule.obstaclePadding || 0)) {
      continue;
    }

    return { x, y };
  }

  return null;
}

function buildStage1ScatterDecals(rules, obstacles) {
  const rng = createStage1SeededRandom("shibuya-stage1-scatter");
  const placements = [];

  rules.forEach((rule) => {
    let created = 0;
    let failedAttempts = 0;

    while (created < rule.count && failedAttempts < rule.count * 24) {
      const point = sampleStage1DecalPoint(rule, rng, obstacles);
      if (!point) {
        failedAttempts += 1;
        continue;
      }

      if (isPointNearStage1Decal(point.x, point.y, placements, rule.minSpacing || 0)) {
        failedAttempts += 1;
        continue;
      }

      const placement = createStage1DecalPlacement(
        `${rule.idPrefix}_${String(created + 1).padStart(3, "0")}`,
        rule.type,
        rng.pick(rule.sprites),
        point.x,
        point.y,
        {
          scale: rng.float(rule.minScale, rule.maxScale),
          rotation: rule.rotate ? rng.float(-Math.PI, Math.PI) : 0,
          alpha: rng.float(rule.minAlpha, rule.maxAlpha),
          zone: rule.zone
        }
      );

      placements.push(placement);
      created += 1;
    }
  });

  return placements;
}

function buildStage1ObstacleBlendDecals(obstacles) {
  const placements = [];

  obstacles.forEach((obstacle) => {
    const recipes = STAGE1_OBSTACLE_DECAL_RECIPES[obstacle.type];
    if (!recipes || recipes.length === 0) {
      return;
    }

    const rng = createStage1SeededRandom(`shibuya-stage1-${obstacle.id}`);
    let localIndex = 1;

    recipes.forEach((recipe) => {
      if (!rng.chance(recipe.chance)) {
        return;
      }

      const offsetX = recipe.offsetX + rng.float(-recipe.jitterX, recipe.jitterX);
      const offsetY = recipe.offsetY + rng.float(-recipe.jitterY, recipe.jitterY);
      const rotated = rotateStage1Offset(offsetX, offsetY, obstacle.rotation || 0);
      const x = obstacle.x + rotated.x;
      const y = obstacle.y + rotated.y;

      if (getStage1Distance(x, y, STAGE1_WORLD_CENTER.x, STAGE1_WORLD_CENTER.y) < STAGE1_LAYOUT.centerSafeRadius) {
        return;
      }

      if (isPointInStage1Crosswalk(x, y, 10)) {
        return;
      }

      placements.push(
        createStage1DecalPlacement(
          `decal_${obstacle.id}_${String(localIndex).padStart(2, "0")}`,
          recipe.type,
          rng.pick(recipe.sprites),
          x,
          y,
          {
            scale: rng.float(recipe.minScale, recipe.maxScale),
            rotation: rng.float(-Math.PI, Math.PI),
            alpha: rng.float(recipe.minAlpha, recipe.maxAlpha),
            zone: `${obstacle.zone}_blend`
          }
        )
      );
      localIndex += 1;
    });
  });

  return placements;
}

function buildStage1ViewportDetailDecals() {
  const rng = createStage1SeededRandom("shibuya-stage1-viewport-details");
  const placements = [];
  const recipes = [
    { type: "crack", sprites: ["crack01"], count: 54, minScale: 0.48, maxScale: 0.84, minAlpha: 0.2, maxAlpha: 0.4 },
    { type: "crackGrass", sprites: ["crackGrass01"], count: 36, minScale: 0.46, maxScale: 0.78, minAlpha: 0.3, maxAlpha: 0.54 },
    { type: "grass", sprites: ["grassPatch01", "grassPatch02"], count: 42, minScale: 0.42, maxScale: 0.72, minAlpha: 0.34, maxAlpha: 0.6 },
    { type: "trash", sprites: ["trashPaper01", "leafScatter01"], count: 52, minScale: 0.36, maxScale: 0.6, minAlpha: 0.22, maxAlpha: 0.42 },
    { type: "glass", sprites: ["glass01"], count: 22, minScale: 0.34, maxScale: 0.54, minAlpha: 0.14, maxAlpha: 0.3 },
    { type: "vine", sprites: ["vine01"], count: 24, minScale: 0.44, maxScale: 0.7, minAlpha: 0.28, maxAlpha: 0.46 }
  ];

  recipes.forEach((recipe) => {
    let created = 0;
    let attempts = 0;

    while (created < recipe.count && attempts < recipe.count * 30) {
      attempts += 1;
      const x = rng.float(2320, 3680);
      const y = rng.float(2620, 3400);
      const centerDistance = getStage1Distance(x, y, STAGE1_WORLD_CENTER.x, STAGE1_WORLD_CENTER.y);

      if (centerDistance < STAGE1_LAYOUT.centerSafeRadius + 34) {
        continue;
      }

      if (!isPointInStage1Road(x, y)) {
        continue;
      }

      if (isPointInStage1Crosswalk(x, y, recipe.type === "crack" ? -18 : 10)) {
        continue;
      }

      if (isPointNearStage1Obstacle(x, y, STAGE1_OBSTACLE_PLACEMENTS, 10)) {
        continue;
      }

      if (isPointNearStage1Decal(x, y, placements, recipe.type === "trash" ? 34 : 44)) {
        continue;
      }

      placements.push(
        createStage1DecalPlacement(
          `viewport_${recipe.type}_${String(created + 1).padStart(3, "0")}`,
          recipe.type,
          rng.pick(recipe.sprites),
          x,
          y,
          {
            scale: rng.float(recipe.minScale, recipe.maxScale),
            rotation: rng.float(-Math.PI, Math.PI),
            alpha: rng.float(recipe.minAlpha, recipe.maxAlpha),
            zone: "initial_camera_detail"
          }
        )
      );
      created += 1;
    }
  });

  return placements;
}

const STAGE1_TARGET_ANCHOR_DECALS = [
  createStage1DecalPlacement("target_cluster_sw_01", "vegetationCluster", "vegetationClusterLarge01", 2480, 3272, {
    scale: 0.76,
    rotation: -0.28,
    alpha: 0.88,
    zone: "target_large_vegetation"
  }),
  createStage1DecalPlacement("target_cluster_se_01", "vegetationCluster", "vegetationClusterLarge01", 3520, 3150, {
    scale: 0.72,
    rotation: 0.22,
    alpha: 0.9,
    zone: "target_large_vegetation"
  }),
  createStage1DecalPlacement("target_cluster_ne_01", "vegetationCluster", "vegetationClusterLarge01", 3606, 2670, {
    scale: 0.58,
    rotation: 0.08,
    alpha: 0.78,
    zone: "target_large_vegetation"
  }),
  createStage1DecalPlacement("target_cluster_w_01", "vegetationCluster", "vegetationClusterLarge01", 2515, 2905, {
    scale: 0.45,
    rotation: 0.2,
    alpha: 0.72,
    zone: "target_large_vegetation"
  }),
  createStage1DecalPlacement("target_rubble_s_01", "rubbleMedianBand", "rubbleMedianBand01", 3028, 3342, {
    scale: 0.62,
    rotation: 0.02,
    alpha: 0.86,
    zone: "target_rubble_band"
  }),
  createStage1DecalPlacement("target_rubble_e_01", "rubbleMedianBand", "rubbleMedianBand01", 3570, 2868, {
    scale: 0.46,
    rotation: Math.PI * 0.5 - 0.08,
    alpha: 0.8,
    zone: "target_rubble_band"
  }),
  createStage1DecalPlacement("target_rubble_n_01", "rubbleMedianBand", "rubbleMedianBand01", 3008, 2678, {
    scale: 0.5,
    rotation: -0.04,
    alpha: 0.74,
    zone: "target_rubble_band"
  }),
  createStage1DecalPlacement("target_grass_sw_mass_01", "grass", "grassPatch02", 2268, 3358, {
    scale: 1.28,
    rotation: -0.45,
    alpha: 0.68,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_grass_sw_mass_02", "grass", "grassPatch01", 2398, 3268, {
    scale: 1.08,
    rotation: 0.35,
    alpha: 0.62,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_grass_se_mass_01", "grass", "grassPatch02", 3708, 3228, {
    scale: 1.34,
    rotation: 0.22,
    alpha: 0.7,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_grass_se_mass_02", "grass", "grassPatch01", 3902, 3158, {
    scale: 1.14,
    rotation: -0.28,
    alpha: 0.64,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_grass_ne_mass_01", "grass", "grassPatch02", 3918, 2516, {
    scale: 1.08,
    rotation: 0.18,
    alpha: 0.62,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_crack_center_01", "crack", "crack01", 2864, 2838, {
    scale: 0.96,
    rotation: -0.18,
    alpha: 0.34,
    zone: "target_road_wear"
  }),
  createStage1DecalPlacement("target_crack_center_02", "crackGrass", "crackGrass01", 3232, 2868, {
    scale: 0.88,
    rotation: 0.44,
    alpha: 0.42,
    zone: "target_road_wear"
  }),
  createStage1DecalPlacement("target_vine_s_01", "vine", "vine01", 3044, 3542, {
    scale: 0.82,
    rotation: 0.04,
    alpha: 0.42,
    zone: "target_edge_vegetation"
  }),
  createStage1DecalPlacement("target_leaves_w_01", "leaf", "leafScatter01", 2310, 3026, {
    scale: 0.72,
    rotation: 0.68,
    alpha: 0.4,
    zone: "target_litter"
  }),
  createStage1DecalPlacement("target_paper_e_01", "trash", "trashPaper01", 3654, 2976, {
    scale: 0.58,
    rotation: -0.36,
    alpha: 0.36,
    zone: "target_litter"
  })
];

const STAGE1_DECAL_PLACEMENTS = [
  ...STAGE1_TARGET_ANCHOR_DECALS,
  ...buildStage1ScatterDecals(STAGE1_DECAL_SCATTER, STAGE1_OBSTACLE_PLACEMENTS),
  ...buildStage1ViewportDetailDecals(),
  ...buildStage1ObstacleBlendDecals(STAGE1_OBSTACLE_PLACEMENTS)
];

window.stageDefinitions = {
  tokyoRandomStages: TOKYO_RANDOM_STAGE_DEFINITIONS,
  shibuyaStage1: {
    id: "shibuyaStage1",
    name: "Stage 1: Overgrown Crossing",
    areaLabel: "SHIBUYA SCRAMBLE",
    seed: "shibuya-stage1",
    renderMode: "singleImage",
    mapWidth: STAGE1_SINGLE_IMAGE_MAP_WIDTH,
    mapHeight: STAGE1_SINGLE_IMAGE_MAP_HEIGHT,
    backgroundColor: "#5c6761",
    tileSize: STAGE1_TILE_SIZE,
    worldCenter: { ...STAGE1_SINGLE_IMAGE_WORLD_CENTER },
    playerStart: { ...STAGE1_SINGLE_IMAGE_PLAYER_START },
    assetBasePath: "./画像/backgrounds/shibuya_stage1/",
    debug: {
      enabled: false
    },
    assets: {
      baseImage: {
        key: "stage1BaseMap",
        path: "./画像/backgrounds/shibuya_stage1/base/shibuya_crossing_base_4096.png"
      },
      ground: {
        asphalt: {
          textureKey: "stage1-ground-asphalt",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/ground_asphalt_01.png"
        },
        crackedAsphalt: {
          textureKey: "stage1-ground-cracked",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/ground_asphalt_cracked_01.png"
        },
        crosswalk: {
          textureKey: "stage1-ground-crosswalk",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/ground_crosswalk_01.png"
        },
        sidewalk: {
          textureKey: "stage1-ground-sidewalk",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/ground_sidewalk_tile_01.png"
        },
        overgrownAsphalt: {
          textureKey: "stage1-ground-overgrown",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/ground_asphalt_grass_01.png"
        },
        bakedPattern05: {
          textureKey: "stage1-ground-baked-pattern-05",
          imagePath: "./画像/backgrounds/shibuya_stage1/ground/stage1_ground_baked_pattern_05.png"
        }
      },
      decals: STAGE1_DECAL_ASSETS,
      boundaries: STAGE1_BOUNDARY_ASSETS,
      obstacleTypes: STAGE1_OBSTACLE_TYPE_DEFINITIONS
    },
    layout: {
      ...STAGE1_LAYOUT,
      playBounds: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS
    },
    playBounds: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS,
    bakedGround: {
      textureKey: "stage1-ground-baked-pattern-05",
      x: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS.x,
      y: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS.y,
      width: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS.width,
      height: STAGE1_SINGLE_IMAGE_PLAY_BOUNDS.height,
      includesCrosswalks: true
    },
    decalScatter: STAGE1_DECAL_SCATTER,
    decalPlacements: STAGE1_DECAL_PLACEMENTS,
    boundaryPlacements: STAGE1_BOUNDARY_PLACEMENTS,
    obstacleCollisionPresets: STAGE1_OBSTACLE_COLLISION_PRESETS,
    obstacleLayoutGroups: STAGE1_OBSTACLE_LAYOUT_GROUPS,
    obstaclePlacements: STAGE1_OBSTACLE_PLACEMENTS,
    collisionZones: STAGE1_SINGLE_IMAGE_COLLISION_ZONES,
    enemySpawnAreas: STAGE1_SINGLE_IMAGE_SPAWN_AREAS
  }
};
