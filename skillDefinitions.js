(function () {
  const buildRabbitThunderFrames = (level) => {
    const levelLabel = String(level).padStart(2, "0");
    return [1, 2, 3, 4, 5].map((frame) => {
      const frameLabel = String(frame).padStart(2, "0");
      return {
        textureKey: `rabbit-thunder-lv${levelLabel}-frame-${frame}`,
        imagePath: `./画像/skill/スキル3/rabbit_thunder_lv${levelLabel}_frame_${frameLabel}.png`
      };
    });
  };

  const buildRabbitThunderStage = (level, options) => {
    const animationFrames = buildRabbitThunderFrames(level);
    return {
      stage: level,
      textureKey: animationFrames[0].textureKey,
      imagePath: animationFrames[0].imagePath,
      animationFrames,
      animationLoop: true,
      unitCount: 1,
      keepUpright: true,
      spinSpeed: 0,
      auraTint: 0xb5f6ff,
      effectTint: 0x92eaff,
      damageTint: 0xe9fbff,
      ...options
    };
  };

  const buildFiveFrameAnimation = (texturePrefix, imagePathPrefix) => {
    return [1, 2, 3, 4, 5].map((frame) => {
      const frameLabel = String(frame).padStart(2, "0");
      return {
        textureKey: `${texturePrefix}-frame-${frame}`,
        imagePath: `${imagePathPrefix}${frameLabel}.png`
      };
    });
  };

  const buildRegaliaBastionCannonFrames = () => {
    return Array.from({ length: 8 }, (_, index) => {
      const frameLabel = String(index + 1).padStart(2, "0");
      return {
        textureKey: `regalia-bastion-cannon-impact-${frameLabel}`,
        imagePath: `./画像/skills/regalia_bastion_cannon/impact_${frameLabel}.png`
      };
    });
  };

  const buildRegaliaBastionCannonStage = (stage, options) => {
    const animationFrames = buildRegaliaBastionCannonFrames();
    return {
      stage,
      textureKey: animationFrames[0].textureKey,
      imagePath: animationFrames[0].imagePath,
      animationFrames,
      frameDurationMs: 72,
      damageTint: 0xdff7ff,
      effectTint: 0x8ff4ff,
      auraTint: 0xffd76b,
      ...options
    };
  };

  window.skillDefinitions = {
    basicSkill: {
      id: "basicSkill",
      name: "Basic Skill",
      hudLabel: "Basic",
      hudIconTextureKey: "hud-icon-basic-skill",
      behavior: "orbit",
      startsUnlocked: true,
      stages: [
        {
          stage: 1,
          textureKey: "basic-skill-stage-1",
          imagePath: "./画像/skill/スキル1/skill_01.png",
          displayScale: 0.18,
          hitRadius: 14,
          orbitCount: 1,
          orbitRadius: 112,
          rotationSpeed: 1.8,
          spinSpeed: 2.2,
          autoAttackShots: 1,
          damage: 1,
          contactTickMs: 460
        },
        {
          stage: 2,
          textureKey: "basic-skill-stage-2",
          imagePath: "./画像/skill/スキル1/skill_02.png",
          displayScale: 0.19,
          hitRadius: 14,
          orbitCount: 1,
          orbitRadius: 112,
          rotationSpeed: 1.95,
          spinSpeed: 2.35,
          autoAttackShots: 1,
          damage: 1,
          contactTickMs: 380
        },
        {
          stage: 3,
          textureKey: "basic-skill-stage-3",
          imagePath: "./画像/skill/スキル1/skill_03.png",
          displayScale: 0.21,
          hitRadius: 15,
          orbitCount: 1,
          orbitRadius: 116,
          rotationSpeed: 2.05,
          spinSpeed: 2.5,
          autoAttackShots: 2,
          damage: 2,
          contactTickMs: 380
        },
        {
          stage: 4,
          textureKey: "basic-skill-stage-4",
          imagePath: "./画像/skill/スキル1/skill_04.png",
          displayScale: 0.23,
          hitRadius: 16,
          orbitCount: 2,
          orbitRadius: 118,
          rotationSpeed: 2.15,
          spinSpeed: 2.65,
          autoAttackShots: 2,
          damage: 2,
          contactTickMs: 340
        },
        {
          stage: 5,
          textureKey: "basic-skill-stage-5",
          imagePath: "./画像/skill/スキル1/skill_05.png",
          displayScale: 0.25,
          hitRadius: 18,
          orbitCount: 2,
          orbitRadius: 122,
          rotationSpeed: 2.25,
          spinSpeed: 2.8,
          autoAttackShots: 3,
          damage: 3,
          contactTickMs: 300
        },
        {
          stage: 6,
          textureKey: "basic-skill-stage-6",
          imagePath: "./画像/skill/スキル1/skill_06.png",
          displayScale: 0.28,
          hitRadius: 20,
          orbitCount: 2,
          orbitRadius: 126,
          rotationSpeed: 2.45,
          spinSpeed: 3,
          autoAttackShots: 3,
          damage: 4,
          contactTickMs: 240,
          pulseScaleMin: 0.24,
          pulseScaleMax: 0.34,
          pulseSpeed: 6.2
        },
        {
          stage: 7,
          textureKey: "basic-skill-stage-7",
          imagePath: "./画像/skill/スキル1/skill_07.png",
          displayScale: 0.33,
          hitRadius: 24,
          orbitCount: 3,
          orbitRadius: 132,
          rotationSpeed: 2.75,
          spinSpeed: 3.3,
          autoAttackShots: 4,
          damage: 5,
          contactTickMs: 190,
          pulseScaleMin: 0.28,
          pulseScaleMax: 0.43,
          pulseSpeed: 7
        },
        {
          stage: 8,
          textureKey: "basic-skill-stage-8-frame-1",
          imagePath: "./画像/skill/スキル1/skill_08_frame_01.png",
          animationFrames: buildFiveFrameAnimation("basic-skill-stage-8", "./画像/skill/スキル1/skill_08_frame_"),
          frameDurationMs: 86,
          displayScale: 0.2,
          hitRadius: 30,
          orbitCount: 4,
          orbitRadius: 142,
          orbitRadiusPulseAmount: 34,
          rotationSpeed: 3.05,
          spinSpeed: 3.7,
          autoAttackShots: 5,
          damage: 7,
          contactTickMs: 150,
          pulseScaleMin: 0.18,
          pulseScaleMax: 0.24,
          pulseSpeed: 5.4,
          auraTint: 0xf0c8ff,
          effectTint: 0xff9cff,
          damageTint: 0xffeaff
        }
      ]
    },
    tornadoSkill: {
      id: "tornadoSkill",
      name: "Tornado",
      hudLabel: "Tornado",
      hudIconTextureKey: "hud-icon-tornado-skill",
      behavior: "screenHoming",
      startsUnlocked: false,
      stages: [
        {
          stage: 1,
          textureKey: "tornado-skill-stage-1",
          imagePath: "./画像/skill/スキル2/skill_01.png",
          displayScale: 0.22,
          hitRadius: 18,
          unitCount: 1,
          moveSpeed: 220,
          idleRadius: 140,
          screenPadding: 92,
          spinSpeed: 2.2,
          trailIntervalMs: 110,
          damage: 1,
          contactTickMs: 320,
          auraTint: 0x8fffd2,
          effectTint: 0x9af6cf,
          damageTint: 0xc9ffdf
        },
        {
          stage: 2,
          textureKey: "tornado-skill-stage-2",
          imagePath: "./画像/skill/スキル2/skill_02.png",
          displayScale: 0.23,
          hitRadius: 19,
          unitCount: 1,
          moveSpeed: 245,
          idleRadius: 144,
          screenPadding: 92,
          spinSpeed: 2.35,
          trailIntervalMs: 100,
          damage: 2,
          contactTickMs: 295,
          auraTint: 0x8fffd2,
          effectTint: 0x9af6cf,
          damageTint: 0xc9ffdf
        },
        {
          stage: 3,
          textureKey: "tornado-skill-stage-3",
          imagePath: "./画像/skill/スキル2/skill_03.png",
          displayScale: 0.24,
          hitRadius: 20,
          unitCount: 1,
          moveSpeed: 260,
          idleRadius: 150,
          screenPadding: 88,
          spinSpeed: 2.55,
          trailIntervalMs: 92,
          damage: 2,
          contactTickMs: 270,
          auraTint: 0x84ffcb,
          effectTint: 0x8ff5c9,
          damageTint: 0xb8ffd3
        },
        {
          stage: 4,
          textureKey: "tornado-skill-stage-4",
          imagePath: "./画像/skill/スキル2/skill_04.png",
          displayScale: 0.26,
          hitRadius: 22,
          unitCount: 1,
          moveSpeed: 282,
          idleRadius: 154,
          screenPadding: 86,
          spinSpeed: 2.8,
          trailIntervalMs: 84,
          damage: 3,
          contactTickMs: 240,
          auraTint: 0x7dffc7,
          effectTint: 0x86f7c6,
          damageTint: 0xb0ffd0
        },
        {
          stage: 5,
          textureKey: "tornado-skill-stage-5",
          imagePath: "./画像/skill/スキル2/skill_05.png",
          displayScale: 0.29,
          hitRadius: 24,
          unitCount: 1,
          moveSpeed: 305,
          idleRadius: 160,
          screenPadding: 84,
          spinSpeed: 3.05,
          trailIntervalMs: 76,
          damage: 3,
          contactTickMs: 215,
          pulseScaleMin: 0.27,
          pulseScaleMax: 0.32,
          pulseSpeed: 4.8,
          auraTint: 0x72ffbe,
          effectTint: 0x79f2bf,
          damageTint: 0xa4ffcb
        },
        {
          stage: 6,
          textureKey: "tornado-skill-stage-6",
          imagePath: "./画像/skill/スキル2/skill_06.png",
          displayScale: 0.32,
          hitRadius: 26,
          unitCount: 1,
          moveSpeed: 332,
          idleRadius: 166,
          screenPadding: 82,
          spinSpeed: 3.3,
          trailIntervalMs: 66,
          damage: 4,
          contactTickMs: 190,
          pulseScaleMin: 0.28,
          pulseScaleMax: 0.36,
          pulseSpeed: 5.6,
          auraTint: 0x66ffb6,
          effectTint: 0x6feeb9,
          damageTint: 0x98ffc4
        },
        {
          stage: 7,
          textureKey: "tornado-skill-stage-7",
          imagePath: "./画像/skill/スキル2/skill_07.png",
          displayScale: 0.36,
          hitRadius: 30,
          unitCount: 1,
          moveSpeed: 350,
          idleRadius: 174,
          screenPadding: 78,
          spinSpeed: 3.55,
          trailIntervalMs: 58,
          damage: 5,
          contactTickMs: 165,
          pulseScaleMin: 0.31,
          pulseScaleMax: 0.41,
          pulseSpeed: 6.2,
          suctionRadius: 210,
          suctionForce: 220,
          auraTint: 0x5affac,
          effectTint: 0x62efb3,
          damageTint: 0x8affbc
        },
        {
          stage: 8,
          textureKey: "tornado-skill-stage-8-frame-1",
          imagePath: "./画像/skill/スキル2/skill_08_frame_01.png",
          animationFrames: buildFiveFrameAnimation("tornado-skill-stage-8", "./画像/skill/スキル2/skill_08_frame_"),
          frameDurationMs: 76,
          displayScale: 0.48,
          hitRadius: 42,
          unitCount: 1,
          moveSpeed: 362,
          idleRadius: 190,
          screenPadding: 68,
          spinSpeed: 3.95,
          trailIntervalMs: 46,
          damage: 7,
          contactTickMs: 130,
          pulseScaleMin: 0.43,
          pulseScaleMax: 0.54,
          pulseSpeed: 6.8,
          suctionRadius: 285,
          suctionForce: 360,
          auraTint: 0xc8ffe2,
          effectTint: 0x75ff9f,
          damageTint: 0xdcffe6
        }
      ]
    },
    rabbitThunderSkill: {
      id: "rabbitThunderSkill",
      name: "Rabbit Thunder",
      hudLabel: "Rabbit",
      hudIconTextureKey: "rabbit-thunder-lv01-frame-1",
      behavior: "directionalDash",
      startsUnlocked: false,
      stages: [
        buildRabbitThunderStage(1, {
          frameDurationMs: 150,
          displayScale: 0.38,
          hitRadius: 28,
          dashDistance: 300,
          dashDurationMs: 980,
          cooldownMs: 1320,
          jumpHeight: 54,
          maxTilt: 0.18,
          trailIntervalMs: 110,
          damage: 3,
          contactTickMs: 180,
          pulseScaleMin: 0.36,
          pulseScaleMax: 0.42,
          pulseSpeed: 4.4,
          auraTint: 0xb5f6ff,
          effectTint: 0x92eaff,
          damageTint: 0xe9fbff
        }),
        buildRabbitThunderStage(2, {
          frameDurationMs: 145,
          displayScale: 0.4,
          hitRadius: 30,
          dashDistance: 320,
          dashDurationMs: 960,
          cooldownMs: 1260,
          jumpHeight: 56,
          maxTilt: 0.18,
          trailIntervalMs: 106,
          damage: 4,
          contactTickMs: 172,
          pulseScaleMin: 0.38,
          pulseScaleMax: 0.44,
          pulseSpeed: 4.6,
          effectTint: 0x8eefff,
          damageTint: 0xecfdff
        }),
        buildRabbitThunderStage(3, {
          frameDurationMs: 140,
          displayScale: 0.42,
          hitRadius: 32,
          dashDistance: 340,
          dashDurationMs: 930,
          cooldownMs: 1200,
          jumpHeight: 58,
          maxTilt: 0.19,
          trailIntervalMs: 102,
          damage: 5,
          contactTickMs: 164,
          pulseScaleMin: 0.4,
          pulseScaleMax: 0.47,
          pulseSpeed: 4.8,
          effectTint: 0x88ecff,
          damageTint: 0xf0feff
        }),
        buildRabbitThunderStage(4, {
          frameDurationMs: 136,
          displayScale: 0.44,
          hitRadius: 34,
          dashDistance: 360,
          dashDurationMs: 900,
          cooldownMs: 1130,
          jumpHeight: 60,
          maxTilt: 0.2,
          trailIntervalMs: 98,
          damage: 6,
          contactTickMs: 156,
          pulseScaleMin: 0.42,
          pulseScaleMax: 0.5,
          pulseSpeed: 5,
          effectTint: 0x82e8ff,
          damageTint: 0xf4feff
        }),
        buildRabbitThunderStage(5, {
          frameDurationMs: 132,
          displayScale: 0.47,
          hitRadius: 36,
          dashDistance: 380,
          dashDurationMs: 860,
          cooldownMs: 1060,
          jumpHeight: 62,
          maxTilt: 0.21,
          trailIntervalMs: 95,
          damage: 7,
          contactTickMs: 148,
          pulseScaleMin: 0.45,
          pulseScaleMax: 0.54,
          pulseSpeed: 5.2,
          effectTint: 0x78e4ff,
          damageTint: 0xf8ffff
        }),
        buildRabbitThunderStage(6, {
          frameDurationMs: 128,
          displayScale: 0.5,
          hitRadius: 39,
          dashDistance: 410,
          dashDurationMs: 820,
          cooldownMs: 980,
          jumpHeight: 66,
          maxTilt: 0.22,
          trailIntervalMs: 88,
          damage: 8,
          contactTickMs: 140,
          pulseScaleMin: 0.48,
          pulseScaleMax: 0.58,
          pulseSpeed: 5.6,
          auraTint: 0xd4fbff,
          effectTint: 0x75ddff,
          damageTint: 0xffffff
        }),
        buildRabbitThunderStage(7, {
          frameDurationMs: 124,
          displayScale: 0.54,
          hitRadius: 43,
          dashDistance: 440,
          dashDurationMs: 780,
          cooldownMs: 880,
          jumpHeight: 72,
          maxTilt: 0.23,
          trailIntervalMs: 82,
          damage: 10,
          contactTickMs: 128,
          pulseScaleMin: 0.52,
          pulseScaleMax: 0.64,
          pulseSpeed: 6,
          impactRadius: 104,
          impactDamage: 5,
          impactForce: 290,
          auraTint: 0xe9fdff,
          effectTint: 0xb284ff,
          damageTint: 0xffffff
        }),
        buildRabbitThunderStage(7, {
          stage: 8,
          frameDurationMs: 118,
          displayScale: 0.64,
          hitRadius: 52,
          dashDistance: 500,
          dashDurationMs: 760,
          cooldownMs: 780,
          jumpHeight: 82,
          maxTilt: 0.24,
          trailIntervalMs: 68,
          damage: 13,
          contactTickMs: 112,
          pulseScaleMin: 0.6,
          pulseScaleMax: 0.74,
          pulseSpeed: 6.4,
          impactRadius: 140,
          impactDamage: 7,
          impactForce: 380,
          impactRepeatCount: 2,
          impactRepeatDelayMs: 135,
          auraTint: 0xf3feff,
          effectTint: 0xdcb7ff,
          damageTint: 0xffffff
        })
      ]
    },
    regaliaBastionCannon: {
      id: "regaliaBastionCannon",
      name: "Regalia Bastion Cannon",
      displayName: "Regalia Bastion Cannon",
      jpName: "王装閃砲",
      hudLabel: "Regalia",
      iconTextureKey: "hud-icon-basic-skill",
      hudIconTextureKey: "hud-icon-basic-skill",
      behavior: "regaliaBastionCannon",
      startsUnlocked: false,
      exclusiveToMechId: "regaliaBastion",
      description: "キャノン砲から閃光を放ち、着弾地点に大規模爆発を発生させる",
      stages: [
        buildRegaliaBastionCannonStage(1, {
          damage: 14,
          cooldownMs: 1900,
          targetCount: 1,
          impactRadius: 39
        }),
        buildRegaliaBastionCannonStage(2, {
          damage: 18,
          cooldownMs: 1900,
          targetCount: 1,
          impactRadius: 44
        }),
        buildRegaliaBastionCannonStage(3, {
          damage: 20,
          cooldownMs: 1900,
          targetCount: 2,
          impactRadius: 45
        }),
        buildRegaliaBastionCannonStage(4, {
          damage: 26,
          cooldownMs: 1900,
          targetCount: 2,
          impactRadius: 50
        }),
        buildRegaliaBastionCannonStage(5, {
          damage: 30,
          cooldownMs: 1900,
          targetCount: 3,
          impactRadius: 53
        }),
        buildRegaliaBastionCannonStage(6, {
          damage: 38,
          cooldownMs: 1900,
          targetCount: 3,
          impactRadius: 57
        }),
        buildRegaliaBastionCannonStage(7, {
          damage: 46,
          cooldownMs: 1900,
          targetCount: 4,
          impactRadius: 62
        }),
        buildRegaliaBastionCannonStage(8, {
          damage: 58,
          cooldownMs: 1900,
          targetCount: 5,
          impactRadius: 66
        })
      ]
    }
  };

  window.skillMutationDefinitions = {
    cores: {
      assault: {
        id: "assault",
        shortLabel: "ASLT",
        label: "ASSAULT CORE",
        summary: "火力特化",
        description: "DMG / Boss pressure / kill speed",
        colorRole: "assault",
        themeColor: 0xff4f45,
        glowColor: 0xffd76b,
        accentColor: "#ffd76b"
      },
      control: {
        id: "control",
        shortLabel: "CTRL",
        label: "CONTROL CORE",
        summary: "制圧特化",
        description: "Slow / Pull / Knockback / survival",
        colorRole: "control",
        themeColor: 0x63c9ff,
        glowColor: 0xb98cff,
        accentColor: "#9eefff"
      },
      reactor: {
        id: "reactor",
        shortLabel: "RCT",
        label: "REACTOR CORE",
        summary: "連動特化",
        description: "DASH / OD / cooldown / sync",
        colorRole: "reactor",
        themeColor: 0x91f6ff,
        glowColor: 0xffffff,
        accentColor: "#b8fbff"
      }
    },
    finals: {
      execution: {
        id: "execution",
        shortLabel: "EXEC",
        label: "EXECUTION FORM",
        summary: "高HP処理",
        description: "High HP / Elite / Boss finisher",
        shapeRole: "execution"
      },
      prism: {
        id: "prism",
        shortLabel: "PRSM",
        label: "PRISM FORM",
        summary: "分裂連鎖",
        description: "Split / Chain / Multi-hit",
        shapeRole: "prism"
      },
      singularity: {
        id: "singularity",
        shortLabel: "SING",
        label: "SINGULARITY FORM",
        summary: "広域制圧",
        description: "Large field / Pull / Persistent area",
        shapeRole: "singularity"
      }
    },
    skills: {
      basicSkill: {
        stage4Title: "BASIC MUTATION CORE",
        stage8Title: "BASIC FINAL MUTATION",
        coreLabels: {
          assault: "TESLA ASSAULT CORE",
          control: "ANCHOR ORBIT CORE",
          reactor: "BOOST REACTOR CORE"
        },
        finalForms: {
          assault_execution: "JUDGEMENT HALO",
          assault_prism: "PRISM HALO",
          assault_singularity: "NOVA HALO",
          control_execution: "ANCHOR JUDGEMENT",
          control_prism: "STATIC WEB",
          control_singularity: "GRAVITY HALO",
          reactor_execution: "OVERLOAD JUDGEMENT",
          reactor_prism: "SYNC SPARK HALO",
          reactor_singularity: "AEGIS REACTOR"
        }
      },
      tornadoSkill: {
        stage4Title: "TORNADO MUTATION CORE",
        stage8Title: "TORNADO FINAL MUTATION",
        coreLabels: {
          assault: "RAZOR CYCLONE CORE",
          control: "VACUUM CYCLONE CORE",
          reactor: "DRIFT CYCLONE CORE"
        },
        finalForms: {
          assault_execution: "RAZOR EYE",
          assault_prism: "BLADE SWARM",
          assault_singularity: "TEMPEST NOVA",
          control_execution: "LOCKDOWN EYE",
          control_prism: "TETHER STORM",
          control_singularity: "EVENT HORIZON",
          reactor_execution: "PRESSURE ENGINE",
          reactor_prism: "DATA SQUALL",
          reactor_singularity: "CYCLONE GARDEN"
        }
      },
      rabbitThunderSkill: {
        stage4Title: "RABBIT MUTATION CORE",
        stage8Title: "RABBIT FINAL MUTATION",
        coreLabels: {
          assault: "BREAK RABBIT CORE",
          control: "SNARE RABBIT CORE",
          reactor: "BOOST RABBIT CORE"
        },
        finalForms: {
          assault_execution: "MOON BREAKER",
          assault_prism: "TRIPLE HARE",
          assault_singularity: "THUNDER METEOR",
          control_execution: "PARALYSIS PIKE",
          control_prism: "CHAIN SNARE",
          control_singularity: "THUNDER ROAD",
          reactor_execution: "BOOST SPEAR",
          reactor_prism: "CAPACITOR HARE",
          reactor_singularity: "RABBIT GENERATOR"
        }
      },
      regaliaBastionCannon: {
        stage4Title: "REGALIA CANNON MUTATION CORE",
        stage8Title: "REGALIA CANNON FINAL MUTATION",
        coreLabels: {
          assault: "ROYAL BATTERY CORE",
          control: "ANCHOR BOMBARD CORE",
          reactor: "SIEGE REACTOR CORE"
        },
        finalForms: {
          assault_execution: "CROWN BREAKER",
          assault_prism: "PRISM SALVO",
          assault_singularity: "THRONE IMPACT",
          control_execution: "LOCKDOWN CANNON",
          control_prism: "TETHER BARRAGE",
          control_singularity: "BASTION GRAVITY",
          reactor_execution: "OVERDRIVE LANCE",
          reactor_prism: "SYNC BATTERY",
          reactor_singularity: "ROYAL FORTRESS"
        }
      }
    }
  };
}());
