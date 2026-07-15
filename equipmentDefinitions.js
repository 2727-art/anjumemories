(function () {
  const VERSION = 1;
  const SLOTS = ["head", "clothes", "shoes", "weapon", "accessory"];
  const RARITIES = ["N", "R", "SR", "SSR", "LEGEND"];
  const RARITY_INDEX = {
    N: 0,
    R: 1,
    SR: 2,
    SSR: 3,
    LEGEND: 4
  };
  const ANALYSIS_COSTS = {
    N: 500,
    R: 2000,
    SR: 8000,
    SSR: 30000,
    LEGEND: 100000
  };
  const RANK_MIN = 1;
  const RANK_MAX = 5;
  const SOURCE_TYPES = [
    "waveBoss",
    "elite",
    "nemesis",
    "goldSlime",
    "silverSlime",
    "deepExtraction",
    "finalRaid",
    "debug",
    "unknown"
  ];
  const DROP_SOURCE_TYPES = ["waveBoss", "elite", "nemesis", "goldSlime", "silverSlime"];
  const RANK_KEYS = ["1", "2", "3", "4", "5"];
  const EQUIPMENT_DROP_SOURCE_CHANCES = Object.freeze({
    waveBoss: 0.45,
    elite: 0.15,
    nemesis: 1,
    goldSlime: 0.35,
    silverSlime: 0.25
  });
  const FINAL_RAID_LEGEND_REWARD_ID = "final-raid-equipment-reward-v1";
  const FINAL_RAID_LEGEND_RANK_WEIGHTS = Object.freeze({ 2: 75, 3: 25 });
  const EQUIPMENT_BONUS_CONFIG = Object.freeze({
    head: Object.freeze({ attackIntervalReductionRatePerScore: 0.0025 }),
    clothes: Object.freeze({ maxHpFlatPerScore: 3 }),
    shoes: Object.freeze({ staminaRegenIncreaseRatePerScore: 0.008 }),
    weapon: Object.freeze({ playerSkillDamageIncreaseRatePerScore: 0.012 }),
    accessory: Object.freeze({ maxStaminaFlatPerScore: 1 })
  });
  const EQUIPMENT_REFINEMENT_MAX_LEVEL = 20;
  const EQUIPMENT_REFINEMENT_DEEP_START_LEVEL = 16;
  const EQUIPMENT_REFINEMENT_CONFIG = Object.freeze({
    head: Object.freeze({ attackIntervalReductionRatePerLevel: 0.0015 }),
    clothes: Object.freeze({ maxHpFlatPerLevel: 8 }),
    shoes: Object.freeze({ staminaRegenIncreaseRatePerLevel: 0.005 }),
    weapon: Object.freeze({ playerSkillDamageIncreaseRatePerLevel: 0.006 }),
    accessory: Object.freeze({ maxStaminaFlatPerLevel: 2 })
  });
  const EQUIPMENT_FRAME_REFINEMENT_DAMAGE_REDUCTION_TIERS = Object.freeze([
    Object.freeze({ minLevel: 20, reductionRate: 0.10 }),
    Object.freeze({ minLevel: 15, reductionRate: 0.07 }),
    Object.freeze({ minLevel: 10, reductionRate: 0.04 }),
    Object.freeze({ minLevel: 5, reductionRate: 0.02 })
  ]);
  const EQUIPMENT_REFINEMENT_COST_TIERS = Object.freeze([
    Object.freeze({ minLevel: 16, maxLevel: 20, cost: 200 }),
    Object.freeze({ minLevel: 11, maxLevel: 15, cost: 100 }),
    Object.freeze({ minLevel: 6, maxLevel: 10, cost: 50 }),
    Object.freeze({ minLevel: 1, maxLevel: 5, cost: 20 })
  ]);
  const EQUIPMENT_SALVAGE_BASE_VALUES = Object.freeze({
    N: 2,
    R: 5,
    SR: 15,
    SSR: 50,
    LEGEND: 200
  });
  const EQUIPMENT_SALVAGE_SEALED_RATE = 0.5;
  const EQUIPMENT_SALVAGE_RANK_MULTIPLIERS = Object.freeze({
    1: 1,
    2: 1.25,
    3: 1.5,
    4: 1.75,
    5: 2
  });
  const EQUIPMENT_SET_DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "ssrPlusFive",
      minimumRarity: "SSR",
      requiredSlotCount: SLOTS.length,
      label: "SSR+ ARRAY"
    }),
    Object.freeze({
      id: "legendFive",
      minimumRarity: "LEGEND",
      requiredSlotCount: SLOTS.length,
      label: "LEGEND ARRAY"
    })
  ]);
  const LEGEND_LABELS_VISIBLE_FROM_START = true;
  const freezeWeights = (weights) => Object.freeze({ ...weights });
  const EQUIPMENT_RARITY_DROP_TABLES = Object.freeze([
    Object.freeze({ minDepth: 1, maxDepth: 3, weights: freezeWeights({ N: 70, R: 25, SR: 5, SSR: 0, LEGEND: 0 }) }),
    Object.freeze({ minDepth: 4, maxDepth: 5, weights: freezeWeights({ N: 52, R: 34, SR: 12, SSR: 2, LEGEND: 0 }) }),
    Object.freeze({ minDepth: 6, maxDepth: 8, weights: freezeWeights({ N: 35, R: 40, SR: 20, SSR: 5, LEGEND: 0 }) }),
    Object.freeze({ minDepth: 9, maxDepth: 10, weights: freezeWeights({ N: 22, R: 38, SR: 30, SSR: 10, LEGEND: 0 }) }),
    Object.freeze({ minDepth: 11, maxDepth: 12, weights: freezeWeights({ N: 5, R: 15, SR: 72.5, SSR: 5, LEGEND: 2.5 }) }),
    Object.freeze({ minDepth: 13, maxDepth: 14, weights: freezeWeights({ N: 2, R: 8, SR: 67.5, SSR: 15, LEGEND: 7.5 }) }),
    Object.freeze({ minDepth: 15, maxDepth: Infinity, weights: freezeWeights({ N: 0, R: 3, SR: 59.5, SSR: 25, LEGEND: 12.5 }) })
  ]);
  const EQUIPMENT_RANK_DROP_TABLES = Object.freeze([
    Object.freeze({ minDepth: 1, maxDepth: 3, weights: freezeWeights({ 1: 55, 2: 30, 3: 12, 4: 3, 5: 0 }) }),
    Object.freeze({ minDepth: 4, maxDepth: 5, weights: freezeWeights({ 1: 40, 2: 34, 3: 18, 4: 7, 5: 1 }) }),
    Object.freeze({ minDepth: 6, maxDepth: 8, weights: freezeWeights({ 1: 28, 2: 33, 3: 25, 4: 11, 5: 3 }) }),
    Object.freeze({ minDepth: 9, maxDepth: 10, weights: freezeWeights({ 1: 20, 2: 28, 3: 30, 4: 16, 5: 6 }) }),
    Object.freeze({ minDepth: 11, maxDepth: Infinity, weights: freezeWeights({ 1: 12, 2: 24, 3: 34, 4: 21, 5: 9 }) })
  ]);
  const EQUIPMENT_DEEP_CACHE_SOURCE_TYPE = "deepExtraction";
  const EQUIPMENT_DEEP_CACHE_DEPTH_TIERS = Object.freeze([
    Object.freeze({ id: "d10", minDepth: 10, maxDepth: 19 }),
    Object.freeze({ id: "d20", minDepth: 20, maxDepth: 29 }),
    Object.freeze({ id: "d30", minDepth: 30, maxDepth: Infinity })
  ]);
  const EQUIPMENT_DEEP_CACHE_RARITY_TABLES = Object.freeze({
    d10: freezeWeights({ N: 0, R: 5000, SR: 3500, SSR: 1490, LEGEND: 10 }),
    d20: freezeWeights({ N: 0, R: 0, SR: 5950, SSR: 4000, LEGEND: 50 }),
    d30: freezeWeights({ N: 0, R: 0, SR: 0, SSR: 9800, LEGEND: 200 })
  });
  const EQUIPMENT_DEEP_CACHE_RANK_TABLES = Object.freeze({
    d10: freezeWeights({ 1: 30, 2: 30, 3: 25, 4: 12, 5: 3 }),
    d20: freezeWeights({ 1: 0, 2: 25, 3: 35, 4: 30, 5: 10 }),
    d30: freezeWeights({ 1: 0, 2: 0, 3: 30, 4: 45, 5: 25 })
  });

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const cloneItem = (item) => item ? { ...item } : null;
  const toNonEmptyString = (value) => {
    if (typeof value !== "string") {
      return null;
    }
    const text = value.trim();
    return text.length > 0 ? text : null;
  };
  const normalizeInteger = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.floor(number);
  };
  const normalizeNonNegativeInteger = (value, fallback = 0) => Math.max(0, normalizeInteger(value, fallback));
  const normalizeRarity = (value) => {
    const rarity = typeof value === "string" ? value.trim().toUpperCase() : "";
    return hasOwn(RARITY_INDEX, rarity) ? rarity : null;
  };
  const normalizeSlot = (value) => {
    const slot = typeof value === "string" ? value.trim().toLowerCase() : "";
    return SLOTS.includes(slot) ? slot : null;
  };
  const normalizeSourceType = (value) => {
    const sourceType = typeof value === "string" ? value.trim() : "";
    return SOURCE_TYPES.includes(sourceType) ? sourceType : "unknown";
  };
  const normalizeDropDepth = (value) => Math.max(1, normalizeInteger(value, 1));
  const normalizeWeight = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };
  const getRandomValue = (rng) => {
    const randomValue = typeof rng === "function" ? rng() : Math.random();
    const number = Number(randomValue);
    return Number.isFinite(number) ? number : 0;
  };
  const normalizeAnalysisCostOverride = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      return null;
    }
    return Math.floor(number);
  };

  function createDefaultBestBySlot() {
    return SLOTS.reduce((bestBySlot, slot) => {
      bestBySlot[slot] = null;
      return bestBySlot;
    }, {});
  }

  function createDefaultLegendResonanceBySlot() {
    return SLOTS.reduce((resonanceBySlot, slot) => {
      resonanceBySlot[slot] = 0;
      return resonanceBySlot;
    }, {});
  }

  function createDefaultStats() {
    return {
      opened: 0,
      upgrades: 0,
      duplicates: 0,
      salvagedBoxes: 0,
      salvagePointsEarned: 0,
      refinements: 0
    };
  }

  function createDefaultRefinementBySlot() {
    return SLOTS.reduce((levels, slot) => {
      levels[slot] = 0;
      return levels;
    }, {});
  }

  function createDefaultRefinementLimitUnlockedBySlot() {
    return SLOTS.reduce((unlocks, slot) => {
      unlocks[slot] = false;
      return unlocks;
    }, {});
  }

  function normalizeRefinementBySlot(record) {
    const source = isObject(record) ? record : {};
    return SLOTS.reduce((levels, slot) => {
      levels[slot] = Math.min(
        EQUIPMENT_REFINEMENT_MAX_LEVEL,
        normalizeNonNegativeInteger(source[slot], 0)
      );
      return levels;
    }, {});
  }

  function normalizeRefinementLimitUnlockedBySlot(record) {
    const source = isObject(record) ? record : {};
    return SLOTS.reduce((unlocks, slot) => {
      unlocks[slot] = source[slot] === true;
      return unlocks;
    }, {});
  }

  function createDefaultEquipmentState() {
    return {
      version: VERSION,
      legendDiscovered: false,
      finalRaidLegendRewardClaimed: false,
      freeAnalysisCredits: 1,
      salvagePoints: 0,
      bestBySlot: createDefaultBestBySlot(),
      securedBoxes: [],
      legendResonanceBySlot: createDefaultLegendResonanceBySlot(),
      refinementBySlot: createDefaultRefinementBySlot(),
      refinementLimitUnlockedBySlot: createDefaultRefinementLimitUnlockedBySlot(),
      stats: createDefaultStats()
    };
  }

  function normalizeLegendResonanceValue(value) {
    return Number.isInteger(value) && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  function normalizeLegendResonanceBySlot(record) {
    const source = isObject(record) ? record : {};
    return SLOTS.reduce((resonanceBySlot, slot) => {
      resonanceBySlot[slot] = normalizeLegendResonanceValue(source[slot]);
      return resonanceBySlot;
    }, {});
  }

  function incrementLegendResonanceForSlot(resonanceBySlot, slot) {
    const normalizedSlot = normalizeSlot(slot);
    const normalizedResonance = normalizeLegendResonanceBySlot(resonanceBySlot);
    if (!normalizedSlot) {
      return normalizedResonance;
    }
    const currentValue = normalizedResonance[normalizedSlot];
    normalizedResonance[normalizedSlot] = currentValue >= Number.MAX_SAFE_INTEGER
      ? currentValue
      : currentValue + 1;
    return normalizedResonance;
  }

  function getLegendResonanceForSlot(resonanceBySlot, slot) {
    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) {
      return 0;
    }
    return normalizeLegendResonanceBySlot(resonanceBySlot)[normalizedSlot] || 0;
  }

  function getLegendResonanceTotal(resonanceBySlot) {
    const normalizedResonance = normalizeLegendResonanceBySlot(resonanceBySlot);
    return SLOTS.reduce((total, slot) => {
      const slotResonance = normalizedResonance[slot];
      if (total >= Number.MAX_SAFE_INTEGER - slotResonance) {
        return Number.MAX_SAFE_INTEGER;
      }
      return total + slotResonance;
    }, 0);
  }

  function normalizeEquipmentItem(rawItem) {
    if (!isObject(rawItem)) {
      return null;
    }

    const id = toNonEmptyString(rawItem.id);
    const rarity = normalizeRarity(rawItem.rarity);
    const rank = normalizeInteger(rawItem.rank, NaN);
    const slot = normalizeSlot(rawItem.slot);
    if (!id || !rarity || !Number.isInteger(rank) || rank < RANK_MIN || rank > RANK_MAX || !slot) {
      return null;
    }

    return {
      id,
      rarity,
      rank,
      slot,
      sourceDepth: Math.max(1, normalizeInteger(rawItem.sourceDepth, 1)),
      sourceType: normalizeSourceType(rawItem.sourceType),
      analysisCostOverride: normalizeAnalysisCostOverride(rawItem.analysisCostOverride)
    };
  }

  function normalizeEquipmentItemList(rawItems) {
    if (!Array.isArray(rawItems)) {
      return [];
    }
    const items = [];
    const seenIds = new Set();
    rawItems.forEach((rawItem) => {
      const item = normalizeEquipmentItem(rawItem);
      if (!item || seenIds.has(item.id)) {
        return;
      }
      seenIds.add(item.id);
      items.push(item);
    });
    return items;
  }

  function normalizeEquipmentState(rawState) {
    const defaults = createDefaultEquipmentState();
    const source = isObject(rawState) ? rawState : {};
    const bestBySlot = createDefaultBestBySlot();
    const sourceBestBySlot = isObject(source.bestBySlot) ? source.bestBySlot : {};

    SLOTS.forEach((slot) => {
      const item = normalizeEquipmentItem(sourceBestBySlot[slot]);
      bestBySlot[slot] = item && item.slot === slot ? item : null;
    });

    const securedBoxes = normalizeEquipmentItemList(source.securedBoxes);

    return {
      version: VERSION,
      legendDiscovered: source.legendDiscovered === true,
      finalRaidLegendRewardClaimed: source.finalRaidLegendRewardClaimed === true,
      freeAnalysisCredits: normalizeNonNegativeInteger(
        hasOwn(source, "freeAnalysisCredits") ? source.freeAnalysisCredits : defaults.freeAnalysisCredits,
        defaults.freeAnalysisCredits
      ),
      salvagePoints: normalizeNonNegativeInteger(source.salvagePoints, defaults.salvagePoints),
      bestBySlot,
      securedBoxes,
      legendResonanceBySlot: normalizeLegendResonanceBySlot(source.legendResonanceBySlot),
      refinementBySlot: normalizeRefinementBySlot(source.refinementBySlot),
      refinementLimitUnlockedBySlot: normalizeRefinementLimitUnlockedBySlot(source.refinementLimitUnlockedBySlot),
      stats: {
        opened: normalizeNonNegativeInteger(source.stats?.opened, defaults.stats.opened),
        upgrades: normalizeNonNegativeInteger(source.stats?.upgrades, defaults.stats.upgrades),
        duplicates: normalizeNonNegativeInteger(source.stats?.duplicates, defaults.stats.duplicates),
        salvagedBoxes: normalizeNonNegativeInteger(source.stats?.salvagedBoxes, defaults.stats.salvagedBoxes),
        salvagePointsEarned: normalizeNonNegativeInteger(source.stats?.salvagePointsEarned, defaults.stats.salvagePointsEarned),
        refinements: normalizeNonNegativeInteger(source.stats?.refinements, defaults.stats.refinements)
      }
    };
  }

  function isEquipmentRarityAtLeast(rarity, minimumRarity) {
    const normalizedRarity = normalizeRarity(rarity);
    const normalizedMinimumRarity = normalizeRarity(minimumRarity);
    if (!normalizedRarity || !normalizedMinimumRarity) {
      return false;
    }
    return RARITY_INDEX[normalizedRarity] >= RARITY_INDEX[normalizedMinimumRarity];
  }

  function createEquipmentSetSlotSummaries(state) {
    const normalizedState = normalizeEquipmentState(state);
    return SLOTS.map((slot) => {
      const item = normalizedState.bestBySlot?.[slot] || null;
      const equipped = item?.slot === slot;
      return {
        slot,
        equipped,
        rarity: equipped ? item.rarity : null,
        ssrPlusQualified: equipped ? isEquipmentRarityAtLeast(item.rarity, "SSR") : false,
        legendQualified: equipped ? isEquipmentRarityAtLeast(item.rarity, "LEGEND") : false
      };
    });
  }

  function countEquipmentSlotsAtOrAboveRarity(state, minimumRarity) {
    return createEquipmentSetSlotSummaries(state).filter(
      (summary) => summary.equipped && isEquipmentRarityAtLeast(summary.rarity, minimumRarity)
    ).length;
  }

  function countBestSlotsAtRarity(state, rarity) {
    const normalizedRarity = normalizeRarity(rarity);
    if (!normalizedRarity) {
      return 0;
    }
    const normalizedState = normalizeEquipmentState(state);
    return SLOTS.filter((slot) => {
      const item = normalizedState.bestBySlot?.[slot] || null;
      return item?.slot === slot && item.rarity === normalizedRarity;
    }).length;
  }

  function countBestSlotsAtOrAboveRarity(state, rarity) {
    return countEquipmentSlotsAtOrAboveRarity(state, rarity);
  }

  function getEquipmentCollectionSlotStatus(state) {
    const normalizedState = normalizeEquipmentState(state);
    return SLOTS.reduce((result, slot) => {
      const item = normalizedState.bestBySlot?.[slot] || null;
      const occupied = item?.slot === slot;
      result[slot] = {
        occupied,
        rarity: occupied ? item.rarity : null,
        rank: occupied ? item.rank : null,
        ssrPlus: occupied ? isEquipmentRarityAtLeast(item.rarity, "SSR") : false,
        legend: occupied ? item.rarity === "LEGEND" : false,
        legendResonance: occupied && item.rarity === "LEGEND"
          ? getLegendResonanceForSlot(normalizedState.legendResonanceBySlot, slot)
          : 0
      };
      return result;
    }, {});
  }

  function evaluateEquipmentCollectionProgress(state) {
    const normalizedState = normalizeEquipmentState(state);
    const slots = getEquipmentCollectionSlotStatus(normalizedState);
    const slotValues = SLOTS.map((slot) => slots[slot]);
    const equippedSlotCount = slotValues.filter((slot) => slot.occupied).length;
    const ssrPlusCount = slotValues.filter((slot) => slot.ssrPlus).length;
    const legendCount = slotValues.filter((slot) => slot.legend).length;
    const legendVisible = LEGEND_LABELS_VISIBLE_FROM_START || normalizedState.legendDiscovered === true;
    return {
      totalSlotCount: SLOTS.length,
      equippedSlotCount,
      ssrPlusCount,
      legendCount,
      ssrPlusComplete: ssrPlusCount >= SLOTS.length,
      legendComplete: legendVisible && legendCount >= SLOTS.length,
      legendVisible,
      legendResonanceTotal: legendVisible ? getLegendResonanceTotal(normalizedState.legendResonanceBySlot) : 0,
      slots
    };
  }

  function getHighestCompletedEquipmentSetTier(tiers) {
    if (!Array.isArray(tiers)) {
      return null;
    }
    const highest = tiers.reduce((currentHighest, tier) => {
      if (!tier?.complete || tier.visible === false) {
        return currentHighest;
      }
      const rarity = normalizeRarity(tier.minimumRarity);
      if (!rarity) {
        return currentHighest;
      }
      if (!currentHighest) {
        return tier;
      }
      const currentRarity = normalizeRarity(currentHighest.minimumRarity);
      return !currentRarity || RARITY_INDEX[rarity] > RARITY_INDEX[currentRarity]
        ? tier
        : currentHighest;
    }, null);
    return highest ? { ...highest } : null;
  }

  function evaluateEquipmentSetStatus(state) {
    const normalizedState = normalizeEquipmentState(state);
    const slotSummaries = createEquipmentSetSlotSummaries(normalizedState);
    const equippedSlotCount = slotSummaries.filter((summary) => summary.equipped).length;
    const equippedRarities = slotSummaries
      .filter((summary) => summary.equipped && normalizeRarity(summary.rarity))
      .map((summary) => summary.rarity);
    const minimumEquippedRarity = equippedRarities.length > 0
      ? equippedRarities.reduce((minimum, rarity) => (
        RARITY_INDEX[rarity] < RARITY_INDEX[minimum] ? rarity : minimum
      ), equippedRarities[0])
      : null;
    const tiers = EQUIPMENT_SET_DEFINITIONS.map((definition) => {
      const matchedSlotCount = slotSummaries.filter(
        (summary) => summary.equipped && isEquipmentRarityAtLeast(summary.rarity, definition.minimumRarity)
      ).length;
      return {
        id: definition.id,
        label: definition.label,
        minimumRarity: definition.minimumRarity,
        matchedSlotCount,
        requiredSlotCount: definition.requiredSlotCount,
        complete: matchedSlotCount >= definition.requiredSlotCount,
        visible: definition.minimumRarity !== "LEGEND" || LEGEND_LABELS_VISIBLE_FROM_START || normalizedState.legendDiscovered === true
      };
    });
    const highestCompletedTier = getHighestCompletedEquipmentSetTier(tiers);

    return {
      totalSlotCount: SLOTS.length,
      equippedSlotCount,
      minimumEquippedRarity,
      ssrPlusSlotCount: countEquipmentSlotsAtOrAboveRarity(normalizedState, "SSR"),
      legendSlotCount: countEquipmentSlotsAtOrAboveRarity(normalizedState, "LEGEND"),
      highestCompletedTierId: highestCompletedTier?.id || null,
      tiers,
      slotSummaries
    };
  }

  function getEquipmentDropChanceForSource(sourceType) {
    const normalizedSourceType = typeof sourceType === "string" ? sourceType.trim() : "";
    return hasOwn(EQUIPMENT_DROP_SOURCE_CHANCES, normalizedSourceType)
      ? EQUIPMENT_DROP_SOURCE_CHANCES[normalizedSourceType]
      : 0;
  }

  function findEquipmentDropTable(tables, depth) {
    const normalizedDepth = normalizeDropDepth(depth);
    return tables.find((table) => normalizedDepth >= table.minDepth && normalizedDepth <= table.maxDepth) || tables[0];
  }

  function cloneWeightsWithKeys(weights, keys) {
    return keys.reduce((result, key) => {
      result[key] = normalizeWeight(weights?.[key]);
      return result;
    }, {});
  }

  function getEquipmentRarityWeightsForDepth(depth, legendUnlocked = false) {
    const normalizedDepth = normalizeDropDepth(depth);
    const table = findEquipmentDropTable(EQUIPMENT_RARITY_DROP_TABLES, normalizedDepth);
    const weights = cloneWeightsWithKeys(table?.weights, RARITIES);
    const legendWeight = normalizeWeight(weights.LEGEND);
    if (normalizedDepth < 11) {
      weights.LEGEND = 0;
    } else if (legendUnlocked !== true && legendWeight > 0) {
      weights.LEGEND = 0;
      weights.SSR += legendWeight;
    }
    return weights;
  }

  function getEquipmentRankWeightsForDepth(depth) {
    const table = findEquipmentDropTable(EQUIPMENT_RANK_DROP_TABLES, depth);
    return cloneWeightsWithKeys(table?.weights, RANK_KEYS);
  }

  function normalizeEquipmentDeepCacheSourceDepth(sourceDepth) {
    return Number.isInteger(sourceDepth) && Number.isSafeInteger(sourceDepth) && sourceDepth >= 1
      ? sourceDepth
      : 0;
  }

  function getEquipmentDeepCacheTierForDepth(sourceDepth) {
    const normalizedDepth = normalizeEquipmentDeepCacheSourceDepth(sourceDepth);
    if (normalizedDepth <= 0) {
      return null;
    }
    const tier = EQUIPMENT_DEEP_CACHE_DEPTH_TIERS.find(
      (entry) => normalizedDepth >= entry.minDepth && normalizedDepth <= entry.maxDepth
    );
    return tier?.id || null;
  }

  function getEquipmentDeepCacheRarityWeights(sourceDepth) {
    const tierId = getEquipmentDeepCacheTierForDepth(sourceDepth);
    if (!tierId) {
      return null;
    }
    return cloneWeightsWithKeys(EQUIPMENT_DEEP_CACHE_RARITY_TABLES[tierId], RARITIES);
  }

  function getEquipmentDeepCacheRankWeights(sourceDepth) {
    const tierId = getEquipmentDeepCacheTierForDepth(sourceDepth);
    if (!tierId) {
      return null;
    }
    return cloneWeightsWithKeys(EQUIPMENT_DEEP_CACHE_RANK_TABLES[tierId], RANK_KEYS);
  }

  function getWeightedEquipmentKeyOrder(weights) {
    if (!isObject(weights)) {
      return [];
    }
    if (RARITIES.some((rarity) => hasOwn(weights, rarity))) {
      return RARITIES.filter((rarity) => hasOwn(weights, rarity));
    }
    if (RANK_KEYS.some((rankKey) => hasOwn(weights, rankKey))) {
      return RANK_KEYS.filter((rankKey) => hasOwn(weights, rankKey));
    }
    if (SLOTS.some((slot) => hasOwn(weights, slot))) {
      return SLOTS.filter((slot) => hasOwn(weights, slot));
    }
    return Object.keys(weights);
  }

  function rollWeightedEquipmentValue(weights, randomValue) {
    if (!isObject(weights)) {
      return null;
    }

    const keys = getWeightedEquipmentKeyOrder(weights);
    const entries = keys
      .map((key) => ({ key, weight: normalizeWeight(weights[key]) }))
      .filter((entry) => entry.weight > 0);
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) {
      return null;
    }

    const number = Number(randomValue);
    const clampedRandom = Number.isFinite(number)
      ? Math.max(0, Math.min(1 - Number.EPSILON, number))
      : 0;
    const target = clampedRandom * totalWeight;
    let cursor = 0;
    for (const entry of entries) {
      cursor += entry.weight;
      if (target < cursor) {
        return entry.key;
      }
    }
    return entries[entries.length - 1].key;
  }

  function rollEquipmentRarityForDepth(depth, legendUnlocked = false, rng = Math.random) {
    return rollWeightedEquipmentValue(
      getEquipmentRarityWeightsForDepth(depth, legendUnlocked),
      getRandomValue(rng)
    );
  }

  function rollEquipmentRankForDepth(depth, rng = Math.random) {
    const rankKey = rollWeightedEquipmentValue(getEquipmentRankWeightsForDepth(depth), getRandomValue(rng));
    const rank = normalizeInteger(rankKey, NaN);
    return Number.isInteger(rank) && rank >= RANK_MIN && rank <= RANK_MAX ? rank : null;
  }

  function rollEquipmentSlot(rng = Math.random) {
    const slotWeights = SLOTS.reduce((weights, slot) => {
      weights[slot] = 1;
      return weights;
    }, {});
    return rollWeightedEquipmentValue(slotWeights, getRandomValue(rng));
  }

  function rollEquipmentDeepCacheRarity(sourceDepth, rng = Math.random) {
    return rollWeightedEquipmentValue(
      getEquipmentDeepCacheRarityWeights(sourceDepth),
      getRandomValue(rng)
    );
  }

  function rollEquipmentDeepCacheRank(sourceDepth, rng = Math.random) {
    const rankKey = rollWeightedEquipmentValue(getEquipmentDeepCacheRankWeights(sourceDepth), getRandomValue(rng));
    const rank = normalizeInteger(rankKey, NaN);
    return Number.isInteger(rank) && rank >= RANK_MIN && rank <= RANK_MAX ? rank : null;
  }

  function rollEquipmentDeepCacheSlot(rng = Math.random) {
    return rollEquipmentSlot(rng);
  }

  function createFallbackEquipmentDeepCacheBoxId(sourceDepth, index) {
    const normalizedIndex = Number.isInteger(index) && Number.isSafeInteger(index) && index >= 0 ? index : 0;
    return `deep-extraction-d${sourceDepth}-${normalizedIndex}`;
  }

  function rollFinalRaidLegendRewardRank(rng = Math.random) {
    const rankKey = rollWeightedEquipmentValue(FINAL_RAID_LEGEND_RANK_WEIGHTS, getRandomValue(rng));
    const rank = normalizeInteger(rankKey, NaN);
    return rank === 2 || rank === 3 ? rank : 2;
  }

  function createRandomEquipmentDropRecord(options = {}) {
    if (!isObject(options)) {
      return null;
    }

    const sourceType = typeof options.sourceType === "string" ? options.sourceType.trim() : "";
    if (!DROP_SOURCE_TYPES.includes(sourceType)) {
      return null;
    }

    const id = toNonEmptyString(options.id);
    if (!id) {
      return null;
    }

    const sourceDepth = normalizeDropDepth(options.sourceDepth);
    const rarity = rollEquipmentRarityForDepth(sourceDepth, options.legendUnlocked === true, options.rng);
    const rank = rollEquipmentRankForDepth(sourceDepth, options.rng);
    const slot = rollEquipmentSlot(options.rng);
    if (!rarity || !rank || !slot) {
      return null;
    }

    return normalizeEquipmentItem({
      id,
      rarity,
      rank,
      slot,
      sourceDepth,
      sourceType,
      analysisCostOverride: null
    });
  }

  function createEquipmentDeepCacheBox(options = {}) {
    if (!isObject(options)) {
      return null;
    }

    const sourceDepth = normalizeEquipmentDeepCacheSourceDepth(options.sourceDepth);
    const sourceType = options.sourceType === undefined
      ? EQUIPMENT_DEEP_CACHE_SOURCE_TYPE
      : (typeof options.sourceType === "string" ? options.sourceType.trim() : "");
    if (sourceType !== EQUIPMENT_DEEP_CACHE_SOURCE_TYPE || !getEquipmentDeepCacheTierForDepth(sourceDepth)) {
      return null;
    }

    const id = toNonEmptyString(options.id) || createFallbackEquipmentDeepCacheBoxId(sourceDepth, options.index);
    const rarity = rollEquipmentDeepCacheRarity(sourceDepth, options.rng);
    const rank = rollEquipmentDeepCacheRank(sourceDepth, options.rng);
    const slot = rollEquipmentDeepCacheSlot(options.rng);
    if (!rarity || !rank || !slot) {
      return null;
    }

    return normalizeEquipmentItem({
      id,
      rarity,
      rank,
      slot,
      sourceDepth,
      sourceType: EQUIPMENT_DEEP_CACHE_SOURCE_TYPE,
      analysisCostOverride: null
    });
  }

  function createFinalRaidLegendRewardRecord(options = {}) {
    if (!isObject(options)) {
      return null;
    }

    const id = toNonEmptyString(options.id);
    if (!id) {
      return null;
    }

    const rank = rollFinalRaidLegendRewardRank(options.rng);
    const slot = rollEquipmentSlot(options.rng);
    if (!rank || !slot) {
      return null;
    }

    return normalizeEquipmentItem({
      id,
      rarity: "LEGEND",
      rank,
      slot,
      sourceDepth: 10,
      sourceType: "finalRaid",
      analysisCostOverride: 0
    });
  }

  function getEquipmentQualityScore(item) {
    const normalizedItem = normalizeEquipmentItem(item);
    if (!normalizedItem) {
      return 0;
    }
    return RARITY_INDEX[normalizedItem.rarity] * RANK_MAX + normalizedItem.rank;
  }

  function getEquipmentRefinementLevel(state, slot) {
    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) {
      return 0;
    }
    return normalizeEquipmentState(state).refinementBySlot[normalizedSlot] || 0;
  }

  function getEquipmentTotalRefinementLevel(state) {
    const levels = normalizeEquipmentState(state).refinementBySlot;
    return SLOTS.reduce((total, slot) => total + (levels[slot] || 0), 0);
  }

  function getEquipmentRefinementCostForLevel(level) {
    const normalizedLevel = normalizeInteger(level, 0);
    const tier = EQUIPMENT_REFINEMENT_COST_TIERS.find((entry) => (
      normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel
    ));
    return tier ? tier.cost : null;
  }

  function getEquipmentRefinementCostForNextLevel(state, slot) {
    const currentLevel = getEquipmentRefinementLevel(state, slot);
    if (currentLevel >= EQUIPMENT_REFINEMENT_MAX_LEVEL) {
      return null;
    }
    return getEquipmentRefinementCostForLevel(currentLevel + 1);
  }

  function getEquipmentFrameRefinementDamageReductionRate(level) {
    const normalizedLevel = Math.max(0, normalizeInteger(level, 0));
    const tier = EQUIPMENT_FRAME_REFINEMENT_DAMAGE_REDUCTION_TIERS.find((entry) => normalizedLevel >= entry.minLevel);
    return tier ? tier.reductionRate : 0;
  }

  function roundBonusRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.round(number * 1000000) / 1000000;
  }

  function createEmptyEquipmentBonuses() {
    return {
      slotScores: SLOTS.reduce((scores, slot) => {
        scores[slot] = 0;
        return scores;
      }, {}),
      totalQualityScore: 0,
      attackIntervalReductionRate: 0,
      attackIntervalMultiplier: 1,
      maxHpFlat: 0,
      staminaRegenIncreaseRate: 0,
      staminaRegenMultiplier: 1,
      playerSkillDamageIncreaseRate: 0,
      playerSkillDamageMultiplier: 1,
      maxStaminaFlat: 0,
      slotRefinementLevels: createDefaultRefinementBySlot(),
      totalRefinementLevel: 0,
      damageTakenReductionRate: 0,
      damageTakenMultiplier: 1
    };
  }

  function cloneEquipmentBonuses(bonuses) {
    const source = isObject(bonuses) ? bonuses : {};
    const cloned = createEmptyEquipmentBonuses();
    const sourceSlotScores = isObject(source.slotScores) ? source.slotScores : {};
    SLOTS.forEach((slot) => {
      const score = Math.max(0, normalizeInteger(sourceSlotScores[slot], cloned.slotScores[slot]));
      cloned.slotScores[slot] = score;
    });
    cloned.totalQualityScore = Math.max(0, normalizeInteger(source.totalQualityScore, cloned.totalQualityScore));
    cloned.attackIntervalReductionRate = roundBonusRate(source.attackIntervalReductionRate ?? cloned.attackIntervalReductionRate);
    cloned.attackIntervalMultiplier = roundBonusRate(source.attackIntervalMultiplier ?? cloned.attackIntervalMultiplier);
    cloned.maxHpFlat = Math.max(0, normalizeInteger(source.maxHpFlat, cloned.maxHpFlat));
    cloned.staminaRegenIncreaseRate = roundBonusRate(source.staminaRegenIncreaseRate ?? cloned.staminaRegenIncreaseRate);
    cloned.staminaRegenMultiplier = roundBonusRate(source.staminaRegenMultiplier ?? cloned.staminaRegenMultiplier);
    cloned.playerSkillDamageIncreaseRate = roundBonusRate(source.playerSkillDamageIncreaseRate ?? cloned.playerSkillDamageIncreaseRate);
    cloned.playerSkillDamageMultiplier = roundBonusRate(source.playerSkillDamageMultiplier ?? cloned.playerSkillDamageMultiplier);
    cloned.maxStaminaFlat = Math.max(0, normalizeInteger(source.maxStaminaFlat, cloned.maxStaminaFlat));
    cloned.slotRefinementLevels = normalizeRefinementBySlot(source.slotRefinementLevels);
    cloned.totalRefinementLevel = Math.max(0, normalizeInteger(source.totalRefinementLevel, cloned.totalRefinementLevel));
    cloned.damageTakenReductionRate = roundBonusRate(source.damageTakenReductionRate ?? cloned.damageTakenReductionRate);
    cloned.damageTakenMultiplier = roundBonusRate(source.damageTakenMultiplier ?? cloned.damageTakenMultiplier);
    return cloned;
  }

  function applyEquipmentBonusItemToTotals(totals, item) {
    const normalizedItem = normalizeEquipmentItem(item);
    if (!normalizedItem) {
      return totals;
    }

    const score = getEquipmentQualityScore(normalizedItem);
    if (score <= 0) {
      return totals;
    }

    totals.slotScores[normalizedItem.slot] = score;
    totals.totalQualityScore += score;

    if (normalizedItem.slot === "head") {
      totals.attackIntervalReductionRate = roundBonusRate(
        score * EQUIPMENT_BONUS_CONFIG.head.attackIntervalReductionRatePerScore
      );
      totals.attackIntervalMultiplier = roundBonusRate(1 - totals.attackIntervalReductionRate);
    } else if (normalizedItem.slot === "clothes") {
      totals.maxHpFlat = score * EQUIPMENT_BONUS_CONFIG.clothes.maxHpFlatPerScore;
    } else if (normalizedItem.slot === "shoes") {
      totals.staminaRegenIncreaseRate = roundBonusRate(
        score * EQUIPMENT_BONUS_CONFIG.shoes.staminaRegenIncreaseRatePerScore
      );
      totals.staminaRegenMultiplier = roundBonusRate(1 + totals.staminaRegenIncreaseRate);
    } else if (normalizedItem.slot === "weapon") {
      totals.playerSkillDamageIncreaseRate = roundBonusRate(
        score * EQUIPMENT_BONUS_CONFIG.weapon.playerSkillDamageIncreaseRatePerScore
      );
      totals.playerSkillDamageMultiplier = roundBonusRate(1 + totals.playerSkillDamageIncreaseRate);
    } else if (normalizedItem.slot === "accessory") {
      totals.maxStaminaFlat = score * EQUIPMENT_BONUS_CONFIG.accessory.maxStaminaFlatPerScore;
    }
    return totals;
  }

  function getEquipmentBonusForItem(item) {
    return cloneEquipmentBonuses(applyEquipmentBonusItemToTotals(createEmptyEquipmentBonuses(), item));
  }

  function applyEquipmentRefinementToTotals(totals, state) {
    const normalizedState = normalizeEquipmentState(state);
    SLOTS.forEach((slot) => {
      const item = normalizedState.bestBySlot?.[slot] || null;
      const level = item?.slot === slot ? normalizedState.refinementBySlot[slot] || 0 : 0;
      totals.slotRefinementLevels[slot] = level;
      totals.totalRefinementLevel += level;
      if (level <= 0) {
        return;
      }
      if (slot === "head") {
        totals.attackIntervalReductionRate = roundBonusRate(
          totals.attackIntervalReductionRate + level * EQUIPMENT_REFINEMENT_CONFIG.head.attackIntervalReductionRatePerLevel
        );
        totals.attackIntervalMultiplier = roundBonusRate(Math.max(0.1, 1 - totals.attackIntervalReductionRate));
      } else if (slot === "clothes") {
        totals.maxHpFlat += level * EQUIPMENT_REFINEMENT_CONFIG.clothes.maxHpFlatPerLevel;
        totals.damageTakenReductionRate = getEquipmentFrameRefinementDamageReductionRate(level);
        totals.damageTakenMultiplier = roundBonusRate(1 - totals.damageTakenReductionRate);
      } else if (slot === "shoes") {
        totals.staminaRegenIncreaseRate = roundBonusRate(
          totals.staminaRegenIncreaseRate + level * EQUIPMENT_REFINEMENT_CONFIG.shoes.staminaRegenIncreaseRatePerLevel
        );
        totals.staminaRegenMultiplier = roundBonusRate(1 + totals.staminaRegenIncreaseRate);
      } else if (slot === "weapon") {
        totals.playerSkillDamageIncreaseRate = roundBonusRate(
          totals.playerSkillDamageIncreaseRate + level * EQUIPMENT_REFINEMENT_CONFIG.weapon.playerSkillDamageIncreaseRatePerLevel
        );
        totals.playerSkillDamageMultiplier = roundBonusRate(1 + totals.playerSkillDamageIncreaseRate);
      } else if (slot === "accessory") {
        totals.maxStaminaFlat += level * EQUIPMENT_REFINEMENT_CONFIG.accessory.maxStaminaFlatPerLevel;
      }
    });
    return totals;
  }

  function getEquipmentBonusesFromState(state) {
    const normalizedState = normalizeEquipmentState(state);
    const totals = createEmptyEquipmentBonuses();
    SLOTS.forEach((slot) => {
      const item = normalizedState.bestBySlot?.[slot] || null;
      if (item?.slot === slot) {
        applyEquipmentBonusItemToTotals(totals, item);
      }
    });
    applyEquipmentRefinementToTotals(totals, normalizedState);
    return cloneEquipmentBonuses(totals);
  }

  function compareEquipmentQuality(candidate, current) {
    const candidateScore = getEquipmentQualityScore(candidate);
    const currentScore = getEquipmentQualityScore(current);
    if (candidateScore > currentScore) {
      return 1;
    }
    if (candidateScore < currentScore) {
      return -1;
    }
    return 0;
  }

  function isEquipmentUpgrade(candidate, current) {
    return compareEquipmentQuality(candidate, current) > 0;
  }

  function updateBestEquipmentForSlot(state, candidate) {
    const normalizedState = normalizeEquipmentState(state);
    const normalizedCandidate = normalizeEquipmentItem(candidate);
    if (!normalizedCandidate) {
      return {
        state: normalizedState,
        upgraded: false,
        previous: null,
        current: null
      };
    }

    const slot = normalizedCandidate.slot;
    const previous = cloneItem(normalizedState.bestBySlot[slot]);
    if (!isEquipmentUpgrade(normalizedCandidate, previous)) {
      return {
        state: normalizedState,
        upgraded: false,
        previous,
        current: previous
      };
    }

    const nextState = {
      ...normalizedState,
      bestBySlot: {
        ...normalizedState.bestBySlot,
        [slot]: normalizedCandidate
      },
      securedBoxes: normalizedState.securedBoxes.map(cloneItem),
      stats: { ...normalizedState.stats }
    };
    return {
      state: nextState,
      upgraded: true,
      previous,
      current: cloneItem(normalizedCandidate)
    };
  }

  function addSecuredEquipmentBox(state, box) {
    const normalizedState = normalizeEquipmentState(state);
    const normalizedBox = normalizeEquipmentItem(box);
    if (!normalizedBox || normalizedState.securedBoxes.some((entry) => entry.id === normalizedBox.id)) {
      return normalizedState;
    }
    return {
      ...normalizedState,
      bestBySlot: { ...normalizedState.bestBySlot },
      securedBoxes: [...normalizedState.securedBoxes.map(cloneItem), normalizedBox],
      stats: { ...normalizedState.stats }
    };
  }

  function removeSecuredEquipmentBoxById(state, id) {
    const normalizedState = normalizeEquipmentState(state);
    const targetId = toNonEmptyString(id);
    if (!targetId) {
      return normalizedState;
    }
    const index = normalizedState.securedBoxes.findIndex((box) => box.id === targetId);
    if (index < 0) {
      return normalizedState;
    }
    return {
      ...normalizedState,
      bestBySlot: { ...normalizedState.bestBySlot },
      securedBoxes: normalizedState.securedBoxes.filter((box, boxIndex) => boxIndex !== index).map(cloneItem),
      stats: { ...normalizedState.stats }
    };
  }

  function countEquipmentBoxesByRarity(items) {
    const counts = RARITIES.reduce((result, rarity) => {
      result[rarity] = 0;
      return result;
    }, {});
    normalizeEquipmentItemList(items).forEach((box) => {
      counts[box.rarity] += 1;
    });
    return counts;
  }

  function countSecuredEquipmentBoxesByRarity(state) {
    return countEquipmentBoxesByRarity(normalizeEquipmentState(state).securedBoxes);
  }

  function selectHighestQualityEquipmentBox(items) {
    let selected = null;
    normalizeEquipmentItemList(items).forEach((box, index) => {
      const qualityScore = getEquipmentQualityScore(box);
      if (!selected || qualityScore > selected.qualityScore) {
        selected = {
          box: cloneItem(box),
          index,
          qualityScore
        };
      }
    });
    return selected;
  }

  function appendSecuredEquipmentBoxes(state, boxes) {
    const normalizedState = normalizeEquipmentState(state);
    const incomingBoxes = normalizeEquipmentItemList(boxes);
    const seenIds = new Set(normalizedState.securedBoxes.map((box) => box.id));
    const addedBoxes = [];
    const skippedBoxes = [];

    incomingBoxes.forEach((box) => {
      if (seenIds.has(box.id)) {
        skippedBoxes.push(cloneItem(box));
        return;
      }
      seenIds.add(box.id);
      addedBoxes.push(cloneItem(box));
    });

    return {
      state: {
        ...normalizedState,
        bestBySlot: { ...normalizedState.bestBySlot },
        securedBoxes: [
          ...normalizedState.securedBoxes.map(cloneItem),
          ...addedBoxes.map(cloneItem)
        ],
        stats: { ...normalizedState.stats }
      },
      addedBoxes: addedBoxes.map(cloneItem),
      skippedBoxes: skippedBoxes.map(cloneItem)
    };
  }

  function grantFinalRaidLegendReward(state, rewardRecord) {
    const normalizedState = normalizeEquipmentState(state);
    const reward = normalizeEquipmentItem(rewardRecord);
    if (
      !reward ||
      reward.id !== FINAL_RAID_LEGEND_REWARD_ID ||
      reward.rarity !== "LEGEND" ||
      reward.sourceDepth !== 10 ||
      reward.sourceType !== "finalRaid" ||
      reward.analysisCostOverride !== 0 ||
      ![2, 3].includes(reward.rank)
    ) {
      return {
        ok: false,
        state: normalizedState,
        granted: false,
        recoveredExisting: false,
        reason: "invalid_reward",
        reward: null
      };
    }

    if (normalizedState.finalRaidLegendRewardClaimed === true) {
      return {
        ok: true,
        state: normalizedState,
        granted: false,
        recoveredExisting: false,
        reason: "already_claimed",
        reward: cloneItem(reward)
      };
    }

    const existing = normalizedState.securedBoxes.find((box) => box.id === reward.id);
    const nextState = normalizeEquipmentState({
      ...normalizedState,
      finalRaidLegendRewardClaimed: true,
      bestBySlot: { ...normalizedState.bestBySlot },
      securedBoxes: existing
        ? normalizedState.securedBoxes.map(cloneItem)
        : [cloneItem(reward), ...normalizedState.securedBoxes.map(cloneItem)],
      stats: { ...normalizedState.stats }
    });

    return {
      ok: true,
      state: nextState,
      granted: !existing,
      recoveredExisting: Boolean(existing),
      reason: existing ? "recovered_existing" : "granted",
      reward: cloneItem(existing || reward)
    };
  }

  function findFirstSecuredEquipmentBoxByRarity(state, rarity) {
    const normalizedRarity = normalizeRarity(rarity);
    if (!normalizedRarity) {
      return null;
    }
    const normalizedState = normalizeEquipmentState(state);
    return cloneItem(normalizedState.securedBoxes.find((box) => box.rarity === normalizedRarity));
  }

  function findSecuredEquipmentBoxById(state, boxId) {
    const targetId = toNonEmptyString(boxId);
    if (!targetId) {
      return null;
    }
    const normalizedState = normalizeEquipmentState(state);
    return cloneItem(normalizedState.securedBoxes.find((box) => box.id === targetId));
  }

  function getEquipmentAnalysisBaseCost(rarity) {
    const normalizedRarity = normalizeRarity(rarity);
    if (!normalizedRarity || !hasOwn(ANALYSIS_COSTS, normalizedRarity)) {
      return null;
    }
    return ANALYSIS_COSTS[normalizedRarity];
  }

  function getEquipmentAnalysisQuote(state, boxId) {
    const normalizedState = normalizeEquipmentState(state);
    const box = findSecuredEquipmentBoxById(normalizedState, boxId);
    if (!box) {
      return {
        ok: false,
        reason: "box_not_found"
      };
    }

    const baseCost = getEquipmentAnalysisBaseCost(box.rarity);
    if (baseCost === null) {
      return {
        ok: false,
        reason: "invalid_rarity"
      };
    }

    const usesCostOverride = box.analysisCostOverride !== null;
    const usesFreeCredit = !usesCostOverride && normalizedState.freeAnalysisCredits > 0;
    const actualCost = usesCostOverride
      ? box.analysisCostOverride
      : (usesFreeCredit ? 0 : baseCost);

    return {
      ok: true,
      box: cloneItem(box),
      baseCost,
      actualCost,
      usesFreeCredit,
      usesCostOverride
    };
  }

  function getEquipmentSealedSalvageValue(itemOrRarity) {
    const rarity = typeof itemOrRarity === "string"
      ? normalizeRarity(itemOrRarity)
      : normalizeRarity(itemOrRarity?.rarity);
    if (!rarity) {
      return 0;
    }
    return Math.max(1, Math.ceil(EQUIPMENT_SALVAGE_BASE_VALUES[rarity] * EQUIPMENT_SALVAGE_SEALED_RATE));
  }

  function getEquipmentDuplicateSalvageValue(item) {
    const normalizedItem = normalizeEquipmentItem(item);
    if (!normalizedItem) {
      return 0;
    }
    const baseValue = EQUIPMENT_SALVAGE_BASE_VALUES[normalizedItem.rarity] || 0;
    const rankMultiplier = EQUIPMENT_SALVAGE_RANK_MULTIPLIERS[normalizedItem.rank] || 1;
    return Math.max(1, Math.round(baseValue * rankMultiplier));
  }

  function addEquipmentSalvagePoints(current, amount) {
    const normalizedCurrent = normalizeNonNegativeInteger(current, 0);
    const normalizedAmount = normalizeNonNegativeInteger(amount, 0);
    return Math.min(Number.MAX_SAFE_INTEGER, normalizedCurrent + normalizedAmount);
  }

  function resolveEquipmentSalvage(state, boxIds) {
    const normalizedState = normalizeEquipmentState(state);
    const requestedIds = Array.isArray(boxIds) ? boxIds : [boxIds];
    const idSet = new Set(requestedIds.map((id) => toNonEmptyString(id)).filter(Boolean));
    if (idSet.size <= 0) {
      return { ok: false, reason: "invalid_box_ids" };
    }
    const salvagedBoxes = normalizedState.securedBoxes.filter((box) => idSet.has(box.id));
    if (salvagedBoxes.length <= 0) {
      return { ok: false, reason: "box_not_found" };
    }
    const pointsEarned = salvagedBoxes.reduce((total, box) => total + getEquipmentSealedSalvageValue(box), 0);
    const nextState = normalizeEquipmentState({
      ...normalizedState,
      securedBoxes: normalizedState.securedBoxes.filter((box) => !idSet.has(box.id)),
      salvagePoints: addEquipmentSalvagePoints(normalizedState.salvagePoints, pointsEarned),
      stats: {
        ...normalizedState.stats,
        salvagedBoxes: addEquipmentSalvagePoints(normalizedState.stats.salvagedBoxes, salvagedBoxes.length),
        salvagePointsEarned: addEquipmentSalvagePoints(normalizedState.stats.salvagePointsEarned, pointsEarned)
      }
    });
    return {
      ok: true,
      state: nextState,
      boxes: salvagedBoxes.map(cloneItem),
      count: salvagedBoxes.length,
      pointsEarned
    };
  }

  function resolveEquipmentSalvageByRarity(state, rarity, mode = "one") {
    const normalizedState = normalizeEquipmentState(state);
    const normalizedRarity = normalizeRarity(rarity);
    if (!normalizedRarity) {
      return { ok: false, reason: "invalid_rarity" };
    }
    const matches = normalizedState.securedBoxes.filter((box) => box.rarity === normalizedRarity);
    if (matches.length <= 0) {
      return { ok: false, reason: "box_not_found" };
    }
    const selected = mode === "all" ? matches : matches.slice(0, 1);
    return resolveEquipmentSalvage(normalizedState, selected.map((box) => box.id));
  }

  function getEquipmentRefinementQuote(state, slot) {
    const normalizedState = normalizeEquipmentState(state);
    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) {
      return { ok: false, reason: "invalid_slot" };
    }
    const item = cloneItem(normalizedState.bestBySlot[normalizedSlot]);
    if (!item) {
      return { ok: false, reason: "no_equipment", slot: normalizedSlot };
    }
    const currentLevel = normalizedState.refinementBySlot[normalizedSlot] || 0;
    if (currentLevel >= EQUIPMENT_REFINEMENT_MAX_LEVEL) {
      return { ok: false, reason: "max_level", slot: normalizedSlot, item, currentLevel };
    }
    const nextLevel = currentLevel + 1;
    const cost = getEquipmentRefinementCostForLevel(nextLevel);
    const resonance = getLegendResonanceForSlot(normalizedState.legendResonanceBySlot, normalizedSlot);
    const deepUnlocked = normalizedState.refinementLimitUnlockedBySlot[normalizedSlot] === true;
    const canUnlockDeep = item.rarity === "LEGEND" && resonance > 0;
    if (nextLevel >= EQUIPMENT_REFINEMENT_DEEP_START_LEVEL && !deepUnlocked && !canUnlockDeep) {
      return {
        ok: false,
        reason: item.rarity === "LEGEND" ? "legend_resonance_required" : "legend_equipment_required",
        slot: normalizedSlot,
        item,
        currentLevel,
        nextLevel,
        cost,
        resonance,
        deepUnlocked
      };
    }
    if (normalizedState.salvagePoints < cost) {
      return {
        ok: false,
        reason: "insufficient_salvage_points",
        slot: normalizedSlot,
        item,
        currentLevel,
        nextLevel,
        cost,
        resonance,
        deepUnlocked,
        shortage: cost - normalizedState.salvagePoints
      };
    }
    return {
      ok: true,
      slot: normalizedSlot,
      item,
      currentLevel,
      nextLevel,
      cost,
      resonance,
      deepUnlocked,
      unlocksDeepRefinement: nextLevel >= EQUIPMENT_REFINEMENT_DEEP_START_LEVEL && !deepUnlocked && canUnlockDeep
    };
  }

  function resolveEquipmentRefinement(state, slot) {
    const normalizedState = normalizeEquipmentState(state);
    const quote = getEquipmentRefinementQuote(normalizedState, slot);
    if (!quote.ok) {
      return quote;
    }
    const refinementBySlot = normalizeRefinementBySlot(normalizedState.refinementBySlot);
    refinementBySlot[quote.slot] = quote.nextLevel;
    const refinementLimitUnlockedBySlot = normalizeRefinementLimitUnlockedBySlot(normalizedState.refinementLimitUnlockedBySlot);
    if (quote.unlocksDeepRefinement) {
      refinementLimitUnlockedBySlot[quote.slot] = true;
    }
    const nextState = normalizeEquipmentState({
      ...normalizedState,
      salvagePoints: normalizedState.salvagePoints - quote.cost,
      refinementBySlot,
      refinementLimitUnlockedBySlot,
      stats: {
        ...normalizedState.stats,
        refinements: addEquipmentSalvagePoints(normalizedState.stats.refinements, 1)
      }
    });
    return {
      ok: true,
      state: nextState,
      slot: quote.slot,
      item: quote.item,
      previousLevel: quote.currentLevel,
      currentLevel: quote.nextLevel,
      cost: quote.cost,
      deepRefinementUnlockedNow: quote.unlocksDeepRefinement === true
    };
  }

  function resolveEquipmentAnalysis(state, boxId) {
    const normalizedState = normalizeEquipmentState(state);
    const quote = getEquipmentAnalysisQuote(normalizedState, boxId);
    if (!quote.ok) {
      return quote;
    }

    const box = cloneItem(quote.box);
    const previous = cloneItem(normalizedState.bestBySlot[box.slot]);
    const upgraded = compareEquipmentQuality(box, previous) > 0;
    const duplicate = !upgraded;
    const removedState = removeSecuredEquipmentBoxById(normalizedState, box.id);
    const bestUpdate = upgraded
      ? updateBestEquipmentForSlot(removedState, box)
      : {
          state: removedState,
          upgraded: false,
          previous,
          current: previous
        };
    const refund = duplicate ? Math.floor(quote.actualCost * 0.5) : 0;
    const legendDiscoveredNow = box.rarity === "LEGEND" && normalizedState.legendDiscovered !== true;
    const duplicateLegend = box.rarity === "LEGEND" &&
      duplicate &&
      previous?.slot === box.slot &&
      previous?.rarity === "LEGEND";
    const legendResonanceBySlot = duplicateLegend
      ? incrementLegendResonanceForSlot(normalizedState.legendResonanceBySlot, box.slot)
      : normalizeLegendResonanceBySlot(normalizedState.legendResonanceBySlot);
    const salvagePointsEarned = duplicate ? getEquipmentDuplicateSalvageValue(box) : 0;
    const nextState = normalizeEquipmentState({
      ...bestUpdate.state,
      legendDiscovered: normalizedState.legendDiscovered === true || box.rarity === "LEGEND",
      finalRaidLegendRewardClaimed: normalizedState.finalRaidLegendRewardClaimed,
      legendResonanceBySlot,
      freeAnalysisCredits: quote.usesFreeCredit
        ? Math.max(0, normalizedState.freeAnalysisCredits - 1)
        : normalizedState.freeAnalysisCredits,
      salvagePoints: addEquipmentSalvagePoints(normalizedState.salvagePoints, salvagePointsEarned),
      stats: {
        opened: normalizedState.stats.opened + 1,
        upgrades: normalizedState.stats.upgrades + (upgraded ? 1 : 0),
        duplicates: normalizedState.stats.duplicates + (duplicate ? 1 : 0),
        salvagedBoxes: normalizedState.stats.salvagedBoxes,
        salvagePointsEarned: addEquipmentSalvagePoints(normalizedState.stats.salvagePointsEarned, salvagePointsEarned),
        refinements: normalizedState.stats.refinements
      }
    });

    return {
      ok: true,
      state: nextState,
      box,
      quote: {
        ...quote,
        box: cloneItem(quote.box)
      },
      upgraded,
      duplicate,
      previous,
      current: upgraded ? cloneItem(box) : previous,
      refund,
      netCost: Math.max(0, quote.actualCost - refund),
      salvagePointsEarned,
      legendDiscoveredNow,
      duplicateLegend
    };
  }

  window.EquipmentSystem = Object.freeze({
    VERSION,
    SLOTS: Object.freeze([...SLOTS]),
    RARITIES: Object.freeze([...RARITIES]),
    RARITY_INDEX: Object.freeze({ ...RARITY_INDEX }),
    ANALYSIS_COSTS: Object.freeze({ ...ANALYSIS_COSTS }),
    EQUIPMENT_BONUS_CONFIG,
    EQUIPMENT_REFINEMENT_CONFIG,
    EQUIPMENT_REFINEMENT_MAX_LEVEL,
    EQUIPMENT_REFINEMENT_DEEP_START_LEVEL,
    EQUIPMENT_REFINEMENT_COST_TIERS,
    EQUIPMENT_FRAME_REFINEMENT_DAMAGE_REDUCTION_TIERS,
    EQUIPMENT_SALVAGE_BASE_VALUES,
    EQUIPMENT_SALVAGE_SEALED_RATE,
    EQUIPMENT_SALVAGE_RANK_MULTIPLIERS,
    EQUIPMENT_SET_DEFINITIONS,
    LEGEND_LABELS_VISIBLE_FROM_START,
    setDefinitions: EQUIPMENT_SET_DEFINITIONS,
    RANK_MIN,
    RANK_MAX,
    SOURCE_TYPES: Object.freeze([...SOURCE_TYPES]),
    EQUIPMENT_DROP_SOURCE_CHANCES: Object.freeze({ ...EQUIPMENT_DROP_SOURCE_CHANCES }),
    FINAL_RAID_LEGEND_REWARD_ID,
    FINAL_RAID_LEGEND_RANK_WEIGHTS: Object.freeze({ ...FINAL_RAID_LEGEND_RANK_WEIGHTS }),
    EQUIPMENT_RARITY_DROP_TABLES,
    EQUIPMENT_RANK_DROP_TABLES,
    EQUIPMENT_DEEP_CACHE_SOURCE_TYPE,
    EQUIPMENT_DEEP_CACHE_DEPTH_TIERS,
    EQUIPMENT_DEEP_CACHE_RARITY_TABLES,
    EQUIPMENT_DEEP_CACHE_RANK_TABLES,
    createDefaultLegendResonanceBySlot,
    createDefaultRefinementBySlot,
    createDefaultRefinementLimitUnlockedBySlot,
    normalizeRefinementBySlot,
    normalizeRefinementLimitUnlockedBySlot,
    normalizeLegendResonanceBySlot,
    incrementLegendResonanceForSlot,
    getLegendResonanceTotal,
    getLegendResonanceForSlot,
    createDefaultEquipmentState,
    normalizeEquipmentItem,
    normalizeEquipmentItemList,
    normalizeEquipmentState,
    isEquipmentRarityAtLeast,
    isRarityAtLeast: isEquipmentRarityAtLeast,
    countEquipmentSlotsAtOrAboveRarity,
    countBestSlotsAtRarity,
    countBestSlotsAtOrAboveRarity,
    getEquipmentCollectionSlotStatus,
    evaluateEquipmentCollectionProgress,
    evaluateCollectionProgress: evaluateEquipmentCollectionProgress,
    getHighestCompletedEquipmentSetTier,
    evaluateEquipmentSetStatus,
    evaluateSetStatus: evaluateEquipmentSetStatus,
    getEquipmentDropChanceForSource,
    getEquipmentRarityWeightsForDepth,
    getEquipmentRankWeightsForDepth,
    getEquipmentDeepCacheTierForDepth,
    getEquipmentDeepCacheRarityWeights,
    getEquipmentDeepCacheRankWeights,
    rollWeightedEquipmentValue,
    rollEquipmentRarityForDepth,
    rollEquipmentRankForDepth,
    rollEquipmentSlot,
    rollEquipmentDeepCacheRarity,
    rollEquipmentDeepCacheRank,
    rollEquipmentDeepCacheSlot,
    rollFinalRaidLegendRewardRank,
    createRandomEquipmentDropRecord,
    createEquipmentDeepCacheBox,
    createFinalRaidLegendRewardRecord,
    getEquipmentQualityScore,
    getEquipmentRefinementLevel,
    getEquipmentTotalRefinementLevel,
    getEquipmentRefinementCostForLevel,
    getEquipmentRefinementCostForNextLevel,
    getEquipmentFrameRefinementDamageReductionRate,
    createEmptyEquipmentBonuses,
    getEquipmentBonusForItem,
    getEquipmentBonusesFromState,
    cloneEquipmentBonuses,
    compareEquipmentQuality,
    isEquipmentUpgrade,
    updateBestEquipmentForSlot,
    addSecuredEquipmentBox,
    removeSecuredEquipmentBoxById,
    countEquipmentBoxesByRarity,
    countSecuredEquipmentBoxesByRarity,
    selectHighestQualityEquipmentBox,
    appendSecuredEquipmentBoxes,
    grantFinalRaidLegendReward,
    findFirstSecuredEquipmentBoxByRarity,
    getEquipmentAnalysisBaseCost,
    getEquipmentAnalysisQuote,
    getEquipmentSealedSalvageValue,
    getEquipmentDuplicateSalvageValue,
    resolveEquipmentSalvage,
    resolveEquipmentSalvageByRarity,
    getEquipmentRefinementQuote,
    resolveEquipmentRefinement,
    resolveEquipmentAnalysis
  });
}());
