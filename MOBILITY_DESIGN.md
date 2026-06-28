# 2D Booster Glide Movement Design

## 1. 概要

この設計書は、通常 Depth のプレイヤー移動を「歩行」ではなく、2D ロボットがブースターで滑走する感触へ近づけるための実装方針をまとめる。

目的は 3D アクションゲームの完全再現ではなく、現在の 2D ヴァンサバ構造を維持したまま、入力方向へ即座に速度を固定する移動を、加速、慣性、減速、短いクイックブーストを持つ移動へ差し替えること。敵密度、拾得、Gate、スキル自動攻撃の読みやすさを優先し、「AC 完全再現」ではなく「ブースター滑走感」を目標にする。

初回対象は通常 Depth のみ。Depth10 Final Raid 中は既存移動、既存 HUD、固定移動速度、救援、氷結スローなどを維持し、新移動を完全に無効化する。

## 2. 非目標

- 真の 3D 移動は実装しない。
- 高度、ジャンプ、空中判定は初回実装しない。
- 当たり判定サイズは変更しない。
- Final Raid 専用移動は変更しない。
- 手動エイム、ロックオン、武器反動は今回入れない。
- ショップ、ランキング、Firebase、localStorage 保存キーは変更しない。
- スキル ID、装備保存、ステージ定義は変更しない。
- 新規アセット必須にはしない。

## 3. 現行処理の整理

`updatePlayerMovement()`:
毎フレームの移動本体。キーボードと `mobileMoveVector` から入力ベクトルを作り、入力があれば正規化して `stats.moveSpeed` を掛け、DASH 中だけ `DASH_SPEED_MULTIPLIER` を掛けて `playerHitbox.body.setVelocity()` に渡している。現状は入力方向へ即時に速度が切り替わる。

`updatePlayerDashState()`:
`Shift`、`Space`、右 DASH ボタンの押下状態を `isDashKeyDown()` から読み、押下中かつ移動入力中なら `stats.stamina` を秒間消費する。EN が尽きると `dashLockedUntilRelease` でキーを離すまで再発動を防ぐ。回復は `DASH_STAMINA_REGEN_PER_SECOND` と装備の `getRunEquipmentStaminaRegenMultiplier()` を使う。

`DASH_SPEED_MULTIPLIER` / DASH 消費 / 回復 / 開始必要量:
`DASH_SPEED_MULTIPLIER`、`DASH_STAMINA_DRAIN_PER_SECOND`、`DASH_STAMINA_REGEN_PER_SECOND`、`DASH_STAMINA_REGEN_DELAY_MS`、`DASH_MIN_START_STAMINA` が既存 DASH の基礎定数。新移動では既存定数を破壊せず、クイックブースト用の設定は `AC_MOVEMENT_CONFIG` に分離する。

`stats.maxStamina` / `stats.stamina` / `stats.moveSpeed`:
`stats.maxStamina` は最大 BOOST EN、`stats.stamina` は現在 BOOST EN、`stats.moveSpeed` は移動能力の中心値。永続強化、CD、装備、パッシブがこの値に反映されるため、新移動でも別ステータスを増やさず再利用する。

`mobileMoveVector`:
左仮想スティックの倒し込み量を `x/y` の -1 から 1 程度のベクトルとして持つ。新移動では長さを推力入力の強さとして扱う。

`mobileDashHeld`:
右 DASH ボタンの押下状態。現状は押しっぱなし DASH と同等に扱われる。新移動では `lastDashDown` と比較して、押下エッジだけでクイックブーストを発動する。

`createPlayer()`:
`playerHitbox` を透明円の物理 body として作り、`playerSprite`、影、ブースター glow/streak を別 GameObject として作る。既存の分離構造を維持する。

`playerHitbox` と `playerSprite` の分離:
当たり判定は `playerHitbox`、見た目は `playerSprite`。新移動は `playerHitbox.body.setVelocity()` の更新に限定し、見た目は `syncPlayerVisuals()`、`updatePlayerRobotMotion()`、`updatePlayerRobotBoostVisuals()` に連携する。

`updatePlayerRobotMotion()`:
移動方向、移動中か、DASH 中かを受け取り、8 方向ロボット画像、傾き、浮遊量、影スケールを更新する。新移動では「入力中」ではなく「実速度が閾値以上」を moving 判定に使う。

`updatePlayerRobotBoostVisuals()`:
通常 Depth のブースター glow/streak を表示する。Human visual が有効な Depth10 表示では既存どおり非表示。新移動では速度比とクイックブースト状態を強度に反映する。

`createColliders()`:
`playerHitbox` と敵、弾、XP、Rare Item、Support、Robot、LOST ARMS、Equipment、Depth Directive、障害物を Arcade Physics の overlap/collider に登録する。新移動では触らない。

`buildStagePlayBoundsCollision()`:
playBounds の外側に static wall を作り、`stageObstacleBodies` に追加する。通常 Depth の移動範囲制限はこの collider と world bounds を使う。新移動では触らない。

`getStageMovementBounds()`:
通常 Depth では stage の playBounds と movementInset から移動範囲を返す。Final Raid 中だけ専用 bounds を返す。新移動では Final Raid 混入防止の条件確認にだけ使い、関数自体は触らない。

`checkStageGateEntry()` / `handleGateEnter()`:
Gate と `playerHitbox` の距離が `GATE_ENTER_RADIUS` 以下なら Gate 選択へ入る。移動方式には依存しないため触らない。

`getFinalBossRaidPlayerMoveSpeedOverride()`:
Final Raid 中の固定移動速度と氷結スローなどの専用倍率を返す。新移動では Final Raid 中にこの既存経路へ戻すため、関数は触らない。

## 4. 触ってよい範囲 / 触らない範囲

触ってよい候補:

- debug flag 追加。
- `AC_MOVEMENT_CONFIG` 追加。
- `isAcMovementDebugEnabled()`。
- `shouldUseAcMovement()`。
- `initializeAcMovementState()`。
- `resetAcMovementState()`。
- `getPlayerMoveInputVector()`。
- `updatePlayerMovement()` の分岐追加。
- `updateAcPlayerMovement()`。
- 必要最小限のロボット姿勢・ブースター演出連携。

触らない範囲:

- `createColliders()`。
- `buildStagePlayBoundsCollision()`。
- `getStageMovementBounds()`。
- `checkStageGateEntry()`。
- `handleGateEnter()`。
- ショップ。
- ランキング。
- Firebase。
- localStorage 保存処理。
- `skillDefinitions.js` の skillId。
- `stageDefinitions.js` の障害物定義。
- Final Raid 戦闘処理。
- `getFinalBossRaidPlayerMoveSpeedOverride()`。
- `isDepth10HumanPlayerVisualActive()`。

## 5. Debug フラグ設計

新移動は `?debugAcMovement=1` のときだけ有効化する。debug off では既存移動、既存 DASH、既存 BOOST EN の体感を完全維持する。

Final Raid 中は `debugAcMovement=1` が付いていても既存移動へ戻す。Final Raid の固定移動速度、氷結スロー、救援効果、専用 HUD は新移動から切り離す。

疑似コード:

```js
const AC_MOVEMENT_DEBUG_QUERY_PARAM = "debugAcMovement";

isAcMovementDebugEnabled() {
  const value = this.getUrlStageParam(AC_MOVEMENT_DEBUG_QUERY_PARAM);
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

shouldUseAcMovement() {
  return Boolean(
    this.isAcMovementDebugEnabled() &&
    !this.isFinalBossRaidActive?.()
  );
}
```

通常 Depth10 Relay は Final Raid ではなく通常 Depth として扱われるため、初回設計では新移動の対象に含める。ただし Depth10 は人間表示に切り替わる既存仕様があるので、Phase 4 の確認項目として通常 Depth10 Relay の見た目と操作感を別途確認する。

## 6. 移動モデル設計

### 状態

`acMovementState` はラン内一時状態として持ち、localStorage には保存しない。

```js
{
  velocity: { x: 0, y: 0 },
  lastDashDown: false,
  quickBoostUntil: 0,
  cooldownUntil: 0,
  lastMoveDirection: { x: 0, y: 1 },
  mode: "idle"
}
```

`velocity.x / y`:
現在の滑走速度。毎フレーム計算し、最終的に `playerHitbox.body.setVelocity()` へ渡す。

`lastDashDown`:
前フレームの DASH 押下状態。押下エッジ検出に使う。

`quickBoostUntil`:
クイックブースト持続終了時刻。現在時刻がこの値未満なら QB 中。

`cooldownUntil`:
次のクイックブーストが可能になる時刻。

`lastMoveDirection`:
最後に有効だった入力方向または速度方向。入力なしで DASH した時の発動方向にも使える。

`mode`:
`idle`、`glide`、`brake`、`quickBoost`、`exhausted` などの表示・debug 用状態。

### 処理方針

入力ベクトル:
キーボードと左スティックを合成する。長さは 0 から 1 に clamp する。左スティックは倒し込み量を推力倍率に使い、キーボードは基本 1 として扱う。

`targetVelocity`:
入力方向 x `stats.moveSpeed` x 入力強度。Overdrive や Final Raid 以外の既存移動倍率を使う場合は、既存の通常移動速度計算と同じ倍率を掛ける。

`acceleration`:
現在速度を `targetVelocity` に近づける最大加速度。急すぎると既存即時移動に近くなり、弱すぎると敵密度の中で操作不能に感じる。

`friction / deceleration`:
入力なしのとき、現在速度を 0 に近づける。完全停止までは短く滑らせるが、Gate やドロップ取得を邪魔しない距離に抑える。

`turn assist`:
現在速度と入力方向が大きく違う場合、減速だけだと重すぎるため、横滑りを少し抑えて入力方向へ曲がりやすくする。

`max cruise speed`:
通常滑走の速度上限。`stats.moveSpeed` を基準にする。

`max boost speed`:
QB 中の速度上限。`stats.moveSpeed * maxBoostSpeedMultiplier` を基準にする。

`quick boost impulse`:
DASH 押下エッジで速度へ瞬間加算する推力。方向は入力があれば入力方向、なければ `lastMoveDirection`。

`quick boost duration`:
短い噴射時間。この間は最大速度上限とブースター演出を強める。

`quick boost cooldown`:
連打抑制。EN があっても cooldown 中は再発動しない。

`quick boost EN cost`:
発動時に固定量を消費する。押しっぱなしで秒間消費しない。

`BOOST EN recovery`:
既存回復ロジックを維持し、QB 後の短い回復遅延を経て回復する。

### 疑似コード

```js
updatePlayerMovement(delta) {
  this.constrainPlayerToMovementBounds();

  if (this.shouldUseAcMovement()) {
    this.updateAcPlayerMovement(delta);
    return;
  }

  // existing movement path remains unchanged
}

updateAcPlayerMovement(delta) {
  const state = this.acMovementState || this.initializeAcMovementState();
  const now = this.time.now;
  const dt = Math.max(0, delta) / 1000;
  const input = this.getPlayerMoveInputVector();
  const inputLength = Phaser.Math.Clamp(input.length, 0, 1);
  const hasInput = inputLength > AC_MOVEMENT_CONFIG.inputDeadzone;
  const dashDown = this.isDashKeyDown();
  const dashPressed = dashDown && !state.lastDashDown;

  const baseSpeed = this.stats.moveSpeed
    * this.getOverdriveMoveSpeedMultiplier()
    * this.getFinalBossRaidPlayerMoveMultiplier();

  if (hasInput) {
    state.lastMoveDirection = input.normalized;
  } else if (getSpeed(state.velocity) > AC_MOVEMENT_CONFIG.motionDirectionSpeedThreshold) {
    state.lastMoveDirection = normalize(state.velocity);
  }

  if (dashPressed && canQuickBoost(state, now)) {
    const cost = AC_MOVEMENT_CONFIG.quickBoostCost
      * this.getTriadDashStaminaDrainMultiplier();
    if (this.stats.stamina >= Math.max(cost, AC_MOVEMENT_CONFIG.minimumStaminaToQuickBoost)) {
      this.stats.stamina = Math.max(0, this.stats.stamina - cost);
      applyQuickBoostImpulse(state, state.lastMoveDirection, baseSpeed);
      state.quickBoostUntil = now + AC_MOVEMENT_CONFIG.quickBoostDuration;
      state.cooldownUntil = now + AC_MOVEMENT_CONFIG.quickBoostCooldown;
      this.dashRegenBlockedUntil = now + DASH_STAMINA_REGEN_DELAY_MS;
    } else {
      state.mode = "exhausted";
    }
  }

  if (hasInput) {
    const targetVelocity = input.normalized
      .scale(baseSpeed * AC_MOVEMENT_CONFIG.cruiseSpeedMultiplier * inputLength);
    approachVelocity(state.velocity, targetVelocity, AC_MOVEMENT_CONFIG.acceleration, dt);
    applyTurnAssist(state.velocity, input.normalized, AC_MOVEMENT_CONFIG.turnAssist, dt);
  } else {
    approachVelocity(state.velocity, { x: 0, y: 0 }, AC_MOVEMENT_CONFIG.deceleration, dt);
    applyGlideFriction(state.velocity, AC_MOVEMENT_CONFIG.glideFriction, dt);
  }

  const boostActive = now < state.quickBoostUntil;
  const maxSpeed = baseSpeed * (boostActive
    ? AC_MOVEMENT_CONFIG.maxBoostSpeedMultiplier
    : AC_MOVEMENT_CONFIG.maxCruiseSpeedMultiplier);
  clampVelocityLength(state.velocity, maxSpeed);

  if (now >= this.dashRegenBlockedUntil) {
    this.stats.stamina = Math.min(
      this.stats.maxStamina,
      this.stats.stamina + DASH_STAMINA_REGEN_PER_SECOND
        * this.getRunEquipmentStaminaRegenMultiplier()
        * dt
    );
  }

  state.lastDashDown = dashDown;
  const moving = getSpeed(state.velocity) > AC_MOVEMENT_CONFIG.visualMovingSpeedThreshold;
  const direction = moving ? normalize(state.velocity) : state.lastMoveDirection;
  this.playerAimAngle = Math.atan2(direction.y, direction.x);
  this.playerHitbox.body.setVelocity(state.velocity.x, state.velocity.y);
  this.updatePlayerRobotMotion(delta, direction, moving, boostActive);
  this.syncPlayerVisuals();
  this.constrainPlayerToMovementBounds();
  this.updatePlayerRobotBoostVisuals(delta);
  this.updateDashStaminaGauge();
}
```

## 7. BOOST EN / 既存ステータスとの関係

- `stats.moveSpeed` は最大巡航速度の基準にする。パッシブ、CD、永続強化の推進出力が新移動にも自然に効く。
- `stats.maxStamina` は最大 BOOST EN として使う。新しい最大 EN 変数は作らない。
- `stats.stamina` は現在 BOOST EN として使う。QB 発動時に固定量を消費する。
- `DASH_STAMINA_REGEN_PER_SECOND` と `getRunEquipmentStaminaRegenMultiplier()` は回復に再利用する。
- Triad Matrix の DASH 消費軽減は、既存の `getTriadDashStaminaDrainMultiplier()` を QB 固定消費量へ掛ける。例: `effectiveCost = quickBoostCost * getTriadDashStaminaDrainMultiplier()`。
- 既存 DASH ゲージは `stats.stamina / stats.maxStamina` を描画しているため、新移動でも同じゲージを使える。
- debug off の既存 DASH では、現行の秒間消費と回復遅延を維持する。
- debug on の QB では、押しっぱなしによる秒間消費は行わず、発動時消費と回復だけを行う。

## 8. Phase 分割

### Phase 1: 入力と状態の足場

- debug flag を追加する。
- `AC_MOVEMENT_CONFIG` を追加する。
- `acMovementState` を追加する。
- 入力ベクトルを `getPlayerMoveInputVector()` に共通化する。
- `updatePlayerMovement()` に debug 分岐を追加する。
- debug off では既存処理を完全維持する。

### Phase 2: ブースター滑走の基本挙動

- 加速度で `velocity` を `targetVelocity` へ寄せる。
- 入力なしで摩擦減速する。
- 左スティック倒し込み量を推力に反映する。
- `stats.moveSpeed` を最大巡航速度の基準にする。
- `playerHitbox.body.setVelocity()` を維持する。

### Phase 3: クイックブーストと BOOST EN

- DASH 押下エッジで 1 回だけ QB を発動する。
- 押しっぱなしで連続発動しない。
- 固定量の BOOST EN を消費する。
- EN 不足時は不発にする。
- 短い cooldown を入れる。
- `Shift` / `Space` / 右 DASH ボタンに対応する。
- 既存 DASH ゲージと整合させる。

### Phase 4: 見た目と回帰確認

- 既存ロボット 8 方向 boost 画像を活かす。
- QB 時の短い残像を追加する。
- 速度に応じた噴射尾を追加する。
- Phaser Graphics / 既存 `skill-hit-glow` などでフォールバックする。
- Final Raid 中は既存移動・既存 HUD を維持する。
- モバイル横画面を確認する。

## 9. 各 Phase の受け入れ条件

### Phase 1

- `debugAcMovement` なしでは移動/DASH が変わらない。
- `debugAcMovement=1` で新分岐に入る。
- `debugAcMovement=1` でも Final Raid 中は既存分岐へ戻る。
- `acMovementState` はラン内一時状態で、保存キーを追加しない。
- `game.js` 以外の既存コードに触れない実装方針を維持できる。

### Phase 2

- 入力開始時に滑らかに加速する。
- 入力停止後に短く流れて止まる。
- 障害物、playBounds、Gate 接触、ドロップ拾得が壊れない。
- `playerAimAngle` とロボット姿勢が実移動方向に追従する。
- `playerHitbox.body.setVelocity()` 経由で移動し、位置の直書き移動をしない。
- 左スティックの浅い倒し込みでは低速、深い倒し込みでは高速になる。

### Phase 3

- `Shift` / `Space` / 右 DASH ボタンで 1 押下 1 QB になる。
- 押しっぱなしで BOOST EN が秒間消費されない。
- 連発すると EN が枯れる。
- EN 枯渇中は QB できない。
- cooldown 中は EN があっても QB が連続発動しない。
- DASH ゲージ表示が消費・回復・枯渇を反映する。
- Triad Matrix の DASH 消費軽減が QB 固定消費に反映される。

### Phase 4

- 通常 Depth で歩行ではなく滑走に見える。
- QB 時だけ噴射が強く見える。
- 既存ロボット 8 方向画像と boost 画像が破綻しない。
- 新規画像がなくても Phaser Graphics / 既存 glow で成立する。
- Depth10 Final Raid の固定移動速度、救援、氷結スロー、専用 HUD が変わらない。
- 通常 Depth10 Relay で新移動を含める場合、人間表示との組み合わせが破綻しない。

## 10. 初期チューニング案

数値は仮値。後で調整しやすいように `AC_MOVEMENT_CONFIG` にまとめる。

| 項目 | 仮値 | 意図 |
| --- | ---: | --- |
| `acceleration` | `1500` | 入力開始から約 0.2 秒で巡航へ近づく |
| `deceleration` | `1150` | 入力停止後に短く滑りつつ止まる |
| `turnAssist` | `0.18` | 方向転換時の重さを残しながら曲がれる |
| `glideFriction` | `0.86` | 入力なしの横滑りを毎秒減衰させる |
| `cruiseSpeedMultiplier` | `1.0` | `stats.moveSpeed` を巡航速度の基準にする |
| `maxCruiseSpeedMultiplier` | `1.08` | 加速計算の揺れを少し許容する |
| `quickBoostDuration` | `180ms` | 短い噴射感を出す |
| `quickBoostCooldown` | `420ms` | 連打は可能だが押しっぱなし化しない |
| `quickBoostCost` | `24` | 初期 EN 100 で 4 回前後使える |
| `quickBoostImpulseMultiplier` | `1.35` | `stats.moveSpeed` に対する瞬間加速 |
| `maxBoostSpeedMultiplier` | `1.95` | 既存 DASH 倍率 1.68 より少し強い瞬間速度 |
| `minimumStaminaToQuickBoost` | `18` | 低 EN での暴発を防ぐ |
| `inputDeadzone` | `0.08` | 左スティックの微小入力を無視する |
| `visualMovingSpeedThreshold` | `20` | 滑走表示へ切り替える速度閾値 |
| `motionDirectionSpeedThreshold` | `35` | 入力なし時に速度方向を向きとして採用する閾値 |

## 11. 検証手順

構文チェック:

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
```

ローカルサーバー:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

PC 通常確認 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugAcMovement=1
```

モバイル UI 確認 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=1&debugAcMovement=1
```

debug off 比較 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0
```

Final Raid 確認 URL:

```text
http://127.0.0.1:4173/?debugStartDepth=10&debugFinalRaid=1&debugFinalRaidScale=0.1&debugFinalRaidPhase=third&debugSkipOpeningBoost=1&debugAcMovement=1
```

確認観点:

- debug off で既存移動/DASHが変わらない。
- debug on で通常 Depth のみ新移動になる。
- Final Raid で新移動が混入しない。
- 障害物に押し付けたときに不自然なめり込みや振動がない。
- Gate へ滑り込んでも Gate 選択が正常に開く。
- XP / Rare / Support / Robot / LOST ARMS / Equipment の拾得が正常。
- モバイル左スティックと右 DASH ボタンが同時入力できる。

## 12. リスクとロールバック

移動感が重すぎる/滑りすぎるリスク:
`acceleration`、`deceleration`、`glideFriction` を `AC_MOVEMENT_CONFIG` に集約し、調整範囲を狭く保つ。

障害物接触時に引っかかるリスク:
Arcade Physics の collider 経路を維持し、`setPosition()` 直書きで障害物を貫通しない。接触時の速度が残りすぎる場合は、衝突軸の速度減衰を追加検討する。

Gate 進入やドロップ取得判定が変わるリスク:
`playerHitbox` と overlap/collider を維持する。速度だけ変えることで判定入口は変えない。

モバイル DASH 押しっぱなしの扱い:
`mobileDashHeld` は押下状態として維持し、`lastDashDown` と比較して押下エッジだけを QB 発動に使う。

Final Raid へ混入するリスク:
`shouldUseAcMovement()` で `isFinalBossRaidActive()` を必ず除外する。Final Raid 開始時には `resetAcMovementState()` で速度も消す。

ロールバック:
debug flag を外せば旧移動へ戻れる。Phase 1 では debug off の既存挙動完全維持を最重要条件にする。変更は Phase ごとに小さく分け、問題があれば該当 Phase だけ戻せる構造にする。

## 13. 次の実装指示案

次回 Codex へ渡す Phase 1 だけの指示文:

```text
AGENTS.md と README.md を読んだ上で、Phase 1 だけ実装してください。

目的は 2Dアーマードコア風ブースター滑走移動の足場作りです。
まだ滑走挙動やクイックブーストの本実装は行わず、debug flag と状態・入力共通化・分岐だけを追加してください。

実装範囲:
- game.js に `debugAcMovement` 用の定数を追加
- `AC_MOVEMENT_CONFIG` を追加
- `isAcMovementDebugEnabled()` を追加
- `shouldUseAcMovement()` を追加し、`debugAcMovement=1` かつ Final Raid ではない時だけ true にする
- `initializeAcMovementState()` / `resetAcMovementState()` を追加
- `getPlayerMoveInputVector()` を追加し、既存のキーボード入力と `mobileMoveVector` を同じ戻り値で扱えるようにする
- `updatePlayerMovement()` に `shouldUseAcMovement()` 分岐だけ追加する
- Phase 1 では新分岐内も既存移動相当でよい。debug off の挙動を絶対に変えない

禁止:
- skillDefinitions.js / stageDefinitions.js / index.html / style.css は変更しない
- ショップ、ランキング、Firebase、localStorage 保存処理は変更しない
- createColliders()、buildStagePlayBoundsCollision()、getStageMovementBounds()、checkStageGateEntry()、handleGateEnter()、getFinalBossRaidPlayerMoveSpeedOverride()、isDepth10HumanPlayerVisualActive() は変更しない
- npm、bundler、TypeScript、新規アセット必須化は行わない

検証:
- node --check game.js
- node --check skillDefinitions.js
- node --check stageDefinitions.js
- 可能なら `http://127.0.0.1:4173/?mobileGate=0&mobileControls=0` と `?debugAcMovement=1` の起動確認
```

## 14. Phase 5 実装メモ: 総合QA・デバッグHUD・チューニング準備

Phase 1〜4 は `game.js` 側で実装済み。現時点でも AC 移動は `?debugAcMovement=1` のときだけ有効で、通常 URL では既存移動/DASH/BOOST EN を維持する。Depth10 Final Raid は `debugAcMovement=1` が付いていても AC 移動、AC HUD、AC 演出の対象外にする。

Phase 5 では、バランス値そのものは変更せず、QA と調整準備のための診断だけを追加する。

- `?debugAcMovement=1&debugAcMovementHud=1`: AC 移動用の軽量デバッグ HUD を表示する。
- `?debugAcMovementHud=1` 単体: AC 移動も HUD も有効化しない。
- `?debugAcMovement=1&debugAcMovementStartStamina=20`: 通常ラン開始時だけ BOOST EN を指定値にクランプする。低 EN / QB 不発確認用で、保存データには書かない。Final Raid 開始予定の debug URL では適用しない。
- HUD 表示内容: AC 分岐の有効状態、mode、速度、vx/vy、入力 x/y/mag、DASH down/just/release、BOOST EN、QB 残時間、cooldown、regen block、lastMoveDirection、QB 不発理由、残像数、噴射尾の有無。
- QB 不発理由はラン内状態にのみ保持する。主な値は `LOW_EN`、`COOLDOWN`、`NO_DIRECTION`、`DISABLED`。
- HUD は Phaser Container / Graphics / Text で生成し、毎フレーム GameObject を作らずテキストだけ更新する。
- HUD は shop / game over / level up / Gate / extraction / Final Raid / state reset / scene shutdown で破棄する。

### Phase 5 受け入れ条件

- 通常 URL で AC HUD が表示されず、既存移動と既存 DASH が維持される。
- `debugAcMovementHud=1` 単体では HUD が表示されない。
- `debugAcMovement=1&debugAcMovementHud=1` で通常 Depth の HUD が表示される。
- HUD の DASH down / justPressed / BOOST EN / cooldown / fail reason が QB 操作に追従する。
- `debugAcMovementStartStamina` で低 EN から開始し、EN 不足時に `LOW_EN` を確認できる。
- モバイル左スティックと右 DASH ボタンでも HUD の input / dash が更新される。
- Depth10 Final Raid では AC HUD と AC 演出が出ない。
- 新規保存キー、新規必須アセット、README 更新、ビルドツール追加がない。

### リリース前チェックリスト

- debug flag を外した通常 URL で 1〜2 分プレイし、歩行/DASH/BOOST EN/Gate/拾得/障害物接触を確認する。
- `debugAcMovement=1` で 1〜2 分プレイし、滑走、減速、壁接触、Gate 進入、ドロップ拾得を確認する。
- `debugAcMovement=1&debugAcMovementHud=1` で HUD 表示と cleanup を確認する。
- `debugAcMovement=1&debugAcMovementHud=1&debugAcMovementStartStamina=0` で QB 不発と回復後の QB 発動を確認する。
- `mobileControls=1&debugAcMovement=1&debugAcMovementHud=1` で左スティック入力と右 DASH を確認する。
- `debugStartDepth=10&debugFinalRaid=1&debugFinalRaidScale=0.1&debugFinalRaidPhase=third&debugSkipOpeningBoost=1&debugAcMovement=1&debugAcMovementHud=1` で Final Raid に AC HUD / AC 演出が混入しないことを確認する。

### 未確認・手動プレイ前提の項目

- 実機スマホ横画面での長押し、連打、同時入力の体感確認。
- 障害物密集地での QB 連打時の引っかかりや速度減衰の体感確認。
- 通常 Depth10 Relay の人間表示と AC 移動演出の見た目確認。
- チューニング対象候補: `accelerationPerSecond`、`decelerationPerSecond`、`turnAssistMultiplier`、`quickBoostImpulseMultiplier`、`quickBoostCooldownMs`、`quickBoostCost`、`quickBoostRegenDelayMs`。

## 15. Phase 6 実装メモ: AC感強化チューニング v2

Phase 6 は人間プレイフィードバックを受けて、Phase 5 の比較用挙動を残したまま、より「ブーストで距離を取り、慣性で流し、次のブーストへつなぐ」体感を検証するための v2 チューニングを追加する。

通常 URL と `?debugAcMovement=1` 単体は従来どおりの挙動を維持する。v2 は明示的に `?debugAcMovement=1&debugAcMovementPreset=acV2` を付けた場合だけ有効化する。比較用として Phase 5 までの値は `v1` プリセットに残す。

### 追加 debug parameter

```text
?debugAcMovement=1&debugAcMovementPreset=acV2
```

- AC 移動の v2 チューニングを有効化する。
- `debugAcMovement=1` がない場合は無効。
- 未指定、または未知の値では `v1` へフォールバックする。
- `acV2` / `acv2` / `ac-v2` は同じ v2 として扱う。

```text
?debugAcMovement=1&debugAcMovementPreset=acV2&debugAcTargetFacing=1
```

- ロボット表示だけを近い敵へ向ける target-facing debug を有効化する。
- 移動方向、QB 方向、噴射トレイル方向、攻撃ターゲット、スキル発射方向、敵 AI には使わない。
- 通常 Depth のロボット表示だけが対象。Depth10 human 表示と Final Raid は除外する。
- 敵候補は一定間隔で近傍検索し、毎フレーム重い全探索にならないようにする。

### acV2 初期チューニング

| 項目 | v1 | acV2 | 意図 |
| --- | ---: | ---: | --- |
| `maxCruiseSpeedMultiplier` | `1.0` | `0.96` | 通常滑走は少し抑え、QB の価値を上げる |
| `accelerationPerSecond` | `2100` | `1950` | 入力追従は維持しつつ重さを残す |
| `decelerationPerSecond` | `1650` | `820` | 入力を離しても滑る時間を伸ばす |
| `noInputFrictionPerSecond` | `1500` | `520` | 無入力時の慣性を強化する |
| `quickBoostDurationMs` | `150` | `220` | 噴射時間を少し長くし、距離感を出す |
| `quickBoostCooldownMs` | `280` | `300` | リズムを保ちつつ連発しすぎを抑える |
| `quickBoostCost` | `28` | `30` | BOOST EN 消費を少し重くする |
| `quickBoostImpulseMultiplier` | `1.85` | `2.85` | QB の瞬間移動距離を強める |
| `quickBoostMaxSpeedMultiplier` | `2.25` | `3.3` | QB 中の上限を引き上げる |
| `quickBoostExitSpeedMultiplier` | `1.35` | `2.05` | QB 後の残速を強く残す |
| `postBoostGlideDurationMs` | `0` | `360` | QB 後に慣性滑走する時間を追加する |
| `postBoostFrictionMultiplier` | `1.0` | `0.45` | postBoost 中の減速を弱める |
| `postBoostSpeedDampingPerSecond` | `100000` | `1250` | QB 後の速度上限を即時 clamp せず緩く戻す |
| `speedLimitDampingPerSecond` | `100000` | `1650` | 通常時も急な clamp を避ける |
| `afterimageCount` | `3` | `4` | v2 の QB を視覚的に強くする |
| `thrustTrailQuickBoostLength` | `64` | `108` | 噴射尾を長くする |
| `robotLeanMaxAngleDeg` | `6` | `9` | 機体の傾きでスピード感を出す |

### postBoostGlide

QB 成功時に `quickBoostUntil` とは別に `postBoostGlideUntil` を記録する。QB 終了後、`postBoostGlideUntil` までの間は `POST_BOOST_GLIDE` として扱い、以下を適用する。

- 通常減速を `postBoostFrictionMultiplier` で弱める。
- 速度上限は `quickBoostExitSpeedMultiplier` を基準にする。
- 上限超過時は即時 clamp ではなく `postBoostSpeedDampingPerSecond` で徐々に落とす。
- HUD に postBoost 残時間、速度上限、速度制限モードを表示する。

### HUD 追加表示

`?debugAcMovement=1&debugAcMovementHud=1` の HUD に以下を追加する。

- `preset`: `v1` / `acV2`
- `allow`: 現在の速度上限
- `speedLimitMode`: `AC_GLIDE` / `QUICK_BOOST` / `POST_BOOST_GLIDE`
- `glide`: postBoostGlide 残時間
- `chain`: QB 連続成功数
- `targetFacing`: target-facing debug の ON/OFF
- `src`: 表示向きの入力元。`INPUT` / `VELOCITY` / `LAST` / `TARGET`
- `target`: 表示向き対象の種別
- `dist`: 表示向き対象までの距離

### Phase 6 受け入れ条件

- 通常 URL では Phase 5 以前と同じ既存移動/DASH/BOOST EN が維持される。
- `?debugAcMovement=1` 単体では `v1` として動き、Phase 5 の比較対象になる。
- `?debugAcMovement=1&debugAcMovementPreset=acV2` で acV2 の QB 距離、postBoostGlide、緩い速度戻し、強めの演出が有効になる。
- `?debugAcMovementPreset=acV2` 単体では AC 移動が有効にならない。
- `debugAcTargetFacing=1` は `debugAcMovement=1` のときだけ有効になる。
- target-facing はロボット表示だけを変え、移動、QB、攻撃、スキル、敵 AI、ドロップ、Gate、ショップ、ランキング、Firebase/localStorage に影響しない。
- Depth10 Final Raid と Depth10 human 表示では AC target-facing と AC 演出が出ない。
- 新規保存キー、新規必須アセット、README 更新、ビルドツール追加がない。

### 今後の調整候補

- QB 距離: `quickBoostImpulseMultiplier`、`quickBoostMaxSpeedMultiplier`
- QB 後の流れ: `postBoostGlideDurationMs`、`postBoostFrictionMultiplier`、`postBoostSpeedDampingPerSecond`
- 旋回の重さ: `turnAssistMultiplier`、`postBoostTurnAssistMultiplier`
- EN 管理: `quickBoostCost`、`quickBoostCooldownMs`、`quickBoostRegenDelayMs`
- 視覚の強さ: `afterimageCount`、`afterimageLifetimeMs`、`thrustTrailQuickBoostLength`、`robotLeanMaxAngleDeg`
- target-facing の吸着感: `targetFacingRange`、`targetFacingSearchIntervalMs`、`targetFacingSmoothing`

## 16. Phase 7 実装メモ: 通常Depth10ロボット復帰 + AC Combat Loop v3

Phase 7 は人間プレイフィードバックを受けて、通常 Depth10 の表示仕様を本番修正しつつ、AC 移動の debug 専用プリセット `acV3` を追加する。

### 人間プレイフィードバック

- Final Raid 討伐後の通常 Depth10 が人間表示になっていたため、通常 Depth10 はロボット表示へ戻す。
- acV2 ではブースト中の残像と噴射エフェクトがまだ弱い。
- 理想の立ち回りは、敵を向いたまま横 QB / 後退 QB / 慣性旋回を行い、QB で接近と離脱を切り替える AC 風の戦闘ループ。
- 慣性が切れたらブースター噴射なし、または最弱表示へ戻す。
- BOOST EN 不足や QB 連打時に短いオーバーヒート演出を出す。
- 通常移動は遅くし、細かい位置調整用に寄せる。

### 通常Depth10表示

- Final Raid ではない通常 Depth10 は、Depth1〜9 と同じロボット表示にする。
- Final Raid 討伐後に通常進行で Depth10 へ到達した場合もロボット表示。
- Depth10 Relay / `debugRelayStartDepth=10` の通常 Depth10 開始もロボット表示。
- Depth10 Final Raid 中だけ、既存の専用表示、専用 HUD、専用移動、救援、氷結スロー、ボス演出を維持する。
- 当たり判定、`playerHitbox`、Stage Gate、Drop、保存処理は変更しない。

### 追加 debug parameter

```text
?debugAcMovement=1&debugAcMovementPreset=acV3
```

- acV3 の AC Combat Loop チューニングを有効化する。
- `debugAcMovement=1` がない場合は無効。
- `debugAcMovement=1` 単体は v1 のまま。
- `debugAcMovementPreset=acV2` は Phase 6 の v2 比較用として維持する。
- `debugAcTargetFacing=0` を明示した場合、acV3 の target-facing 自動 ON を無効化できる。

### v1 / acV2 / acV3 比較

| 項目 | v1 | acV2 | acV3 |
| --- | ---: | ---: | ---: |
| `maxCruiseSpeedMultiplier` | `1.0` | `0.96` | `0.68` |
| `accelerationPerSecond` | `2100` | `1950` | `1500` |
| `decelerationPerSecond` | `1650` | `820` | `480` |
| `noInputFrictionPerSecond` | `1500` | `520` | `260` |
| `quickBoostDurationMs` | `150` | `220` | `280` |
| `quickBoostCooldownMs` | `280` | `300` | `360` |
| `quickBoostCost` | `28` | `30` | `36` |
| `quickBoostImpulseMultiplier` | `1.85` | `2.85` | `3.75` |
| `quickBoostMaxSpeedMultiplier` | `2.25` | `3.3` | `4.5` |
| `quickBoostExitSpeedMultiplier` | `1.35` | `2.05` | `2.75` |
| `postBoostGlideDurationMs` | `0` | `360` | `880` |
| `postBoostFrictionMultiplier` | `1.0` | `0.45` | `0.16` |
| `afterimageCount` | `3` | `4` | `6` |
| `thrustTrailQuickBoostLength` | `64` | `108` | `176` |
| `robotLeanMaxAngleDeg` | `6` | `9` | `12` |
| target-facing | 手動 debug | 手動 debug | 自動 ON、明示 OFF 可 |

### acV3 の目的

- 通常移動を遅くし、微調整と慣性方向修正のための入力にする。
- QB 距離を伸ばし、接近、横移動、バック回避の主役にする。
- postBoostGlide を長くし、`QB -> 慣性滑走 -> QB` のループを作る。
- target-facing で敵を向いたまま、移動方向と機体の見た目方向を分離する。
- 噴射トレイルは実速度方向の逆へ出し、敵を向いたまま横 QB / 後退 QB に見えるようにする。
- 慣性が切れたら `thruster: OFF` として idle ロボット画像またはブースター非表示に戻す。
- BOOST EN 不足や QB 連打時は heat 状態を上げ、短いオーバーヒート演出と HUD 表示を出す。

### thruster state

acV3 では速度、mode、heat から表示用の `thrusterVisualState` を決める。

- `STRONG`: QB 中。強い噴射、長いトレイル、残像、バーストリング。
- `RESIDUAL`: postBoostGlide 中。残留噴射と中程度のトレイル。
- `WEAK`: 通常滑走中。弱いトレイル。
- `OFF`: 慣性が切れた状態。強い噴射を消し、ロボット idle 画像へ戻す。
- `OVERHEAT`: EN 不足や連打直後の熱演出。赤 / オレンジの熱粒子を表示する。

### オーバーヒート演出

- acV3 debug 専用の演出で、保存データや恒久ペナルティは追加しない。
- QB 成功時に heat を加算する。
- BOOST EN 不足による `LOW_EN` 不発時は heat を大きめに加算し、熱フラッシュを出す。
- 短時間の QB chain が一定以上になった場合も overheat 表示に入る。
- EN が回復し、heat が減衰すると自然に `NORMAL` へ戻る。
- QB 不発時に強ブースト残像や QB 本体は出さない。

### HUD 追加

`debugAcMovement=1&debugAcMovementHud=1` の HUD に以下を追加する。

- `preset: acV3`
- `targetFacing` と `auto`
- `src: TARGET / INPUT / VELOCITY / LAST`
- `target` と `dist`
- `thruster: OFF / WEAK / RESIDUAL / STRONG / OVERHEAT`
- `heat: 0〜100%` と `NORMAL / WARNING / OVERHEAT`
- `cruiseMul`
- `normalD10Robot`
- `raidHuman`

### ボス戦立ち回りテスト手順

1. `debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1` で通常 Depth を開始する。
2. Boss / Elite / NEMESIS など高 HP 敵の近くで `targetFacing: ON auto: ON src: TARGET` を確認する。
3. 敵を向いたまま左右入力 + DASH で横 QB する。
4. 敵から離れる入力 + DASH で疑似バック回避に見えることを確認する。
5. 入力を離して `POST_BOOST_GLIDE` が残り、慣性で流れることを確認する。
6. 低 EN で DASH を押し、`LOW_EN` と heat / overheat 演出を確認する。
7. `debugAcTargetFacing=0` で target-facing を明示 OFF にできることを確認する。
8. Final Raid debug URL で AC HUD、AC 演出、target-facing が出ないことを確認する。

### 本番化前に人間プレイで調整すべき数値

- 通常移動の遅さ: `maxCruiseSpeedMultiplier`、`accelerationPerSecond`
- 慣性の長さ: `postBoostGlideDurationMs`、`postBoostFrictionMultiplier`
- QB 距離: `quickBoostImpulseMultiplier`、`quickBoostMaxSpeedMultiplier`
- QB 後の残速: `quickBoostExitSpeedMultiplier`、`postBoostSpeedDampingPerSecond`
- EN 管理: `quickBoostCost`、`quickBoostCooldownMs`、`quickBoostRegenDelayMs`
- target-facing の吸着感: `targetFacingRange`、`targetFacingStickyMs`、`targetFacingSmoothing`
- 熱演出の頻度: `heatPerQuickBoost`、`heatWarningThreshold`、`heatOverheatThreshold`
- 視覚の強さ: `afterimageCount`、`thrustTrailQuickBoostLength`、`quickBoostBurstScale`

## 17. Phase 8 実装メモ: acV3滑空ステアリング修正 + QB距離リチューニング

Phase 8 は人間プレイフィードバックを受けて、`acV3` の方向性を維持したまま、POST_BOOST_GLIDE 中の入力無効感と QB 距離過多を修正する。

### 人間プレイフィードバック

- QB 発動後の滑空中に方向キー / 左スティックが効かない。
- QB 距離が長すぎ、ボス戦や回避で画面外へ飛びすぎる。

### 修正方針

- `acV3` だけを調整する。`debugAcMovement=1` 単体の v1 と `debugAcMovementPreset=acV2` は比較用に維持する。
- QUICK_BOOST の硬直は全 duration ではなく、発動直後の `quickBoostHardLockMs` だけに短縮する。
- POST_BOOST_GLIDE 中は通常巡航速度へ即座に寄せず、現在 velocity の角度を入力方向へ少しずつ回す。
- 逆方向入力では即反転せず、速度をわずかに落としながら旋回する。
- target-facing は見た目向きだけに使い、移動物理、QB 方向、噴射尾方向、攻撃ターゲットには使わない。
- QB 距離短縮のため、duration、impulse、max speed、exit speed を下げる。
- 距離短縮に合わせ、残像数、残像寿命、噴射尾長、バーストリングを少し抑える。

### 調整後の acV3 値

| 項目 | Phase 7 acV3 | Phase 8 acV3 |
| --- | ---: | ---: |
| `maxCruiseSpeedMultiplier` | `0.68` | `0.68` |
| `quickBoostDurationMs` | `280` | `210` |
| `quickBoostHardLockMs` | なし | `90` |
| `quickBoostImpulseMultiplier` | `3.75` | `3.05` |
| `quickBoostMaxSpeedMultiplier` | `4.5` | `3.65` |
| `quickBoostExitSpeedMultiplier` | `2.75` | `2.15` |
| `postBoostGlideDurationMs` | `880` | `640` |
| `postBoostFrictionMultiplier` | `0.16` | `0.25` |
| `postBoostTurnAssistMultiplier` | `0.62` | `0.84` |
| `postBoostSpeedDampingPerSecond` | `620` | `820` |
| `speedLimitDampingPerSecond` | `950` | `1050` |
| `afterimageCount` | `6` | `5` |
| `afterimageLifetimeMs` | `340` | `285` |
| `thrustTrailQuickBoostLength` | `176` | `136` |
| `thrustTrailPostBoostLength` | `92` | `78` |

### 追加ステアリング値

| 項目 | 値 | 意図 |
| --- | ---: | --- |
| `postBoostInputSteerEnabled` | `true` | POST_BOOST_GLIDE 中の入力補正を有効化 |
| `postBoostInputSteerAcceleration` | `920` | 入力方向へ寄せる弱い補助加速度 |
| `postBoostInputSteerMultiplier` | `0.62` | 通常移動より弱く曲げる |
| `postBoostInputTurnRateDegPerSecond` | `190` | 旋回角速度の上限 |
| `postBoostInputSpeedRetention` | `0.93` | 逆入力時も速度を急に殺さない |
| `postBoostInputMinSpeedRatio` | `0.52` | 滑空中に速度感を残す下限目安 |
| `quickBoostLateInputSteerMultiplier` | `0.18` | hard lock 後の QB 後半だけごく弱く補正 |
| `quickBoostLateTurnRateDegPerSecond` | `86` | QB 本体の方向ブレを抑える |

### HUD 追加

`debugAcMovement=1&debugAcMovementHud=1` の HUD に以下を追加する。

- `lock`: quickBoost hard lock 残り ms。
- `steering`: ON / OFF。
- `mode`: NONE / POST_BOOST / GLIDE / LOCKED。
- `inputAccepted`: 入力補正が velocity に反映されたか。
- `inf`: 入力影響度。
- `angle vel`: velocity angle。
- `input`: input angle。
- `delta`: velocity angle と input angle の差。
- `turn`: 旋回角速度上限。

### 次回人間プレイで確認する項目

1. QB 距離が Phase 7 より短く、短〜中距離の鋭い推進になっているか。
2. POST_BOOST_GLIDE 中に左右 / 上下入力で軌道が少し曲がるか。
3. 逆方向入力時に即反転せず、減速しながら弧を描くか。
4. target-facing ON のまま横 QB / 後退 QB ができるか。
5. `debugAcTargetFacing=0` で移動方向ベースの見た目に戻るか。
6. mobileControls の左スティックでも POST_BOOST_GLIDE 中の `inputAccepted` が true になるか。
7. Final Raid debug URL で AC 移動、AC HUD、AC 演出、target-facing が混入しないか。

### 次の調整候補

- QB 距離がまだ長い場合: `quickBoostImpulseMultiplier`、`quickBoostMaxSpeedMultiplier`、`quickBoostExitSpeedMultiplier`。
- 滑空中の曲がりが弱い場合: `postBoostInputTurnRateDegPerSecond`、`postBoostInputSteerMultiplier`。
- 滑空中の曲がりが強すぎる場合: `postBoostInputSteerAcceleration`、`postBoostInputSpeedRetention`。
- 短くした QB の迫力が足りない場合: `quickBoostBurstScale`、`thrustTrailQuickBoostLength`、`afterimageAlpha`。

## 18. Phase 9 実装メモ: acV3 可変クイックブースト + 滑空旋回強化

Phase 9 は人間プレイフィードバックを受けて、`acV3` の中身だけを調整する。新しい `acV4` は作らず、`debugAcMovement=1` 単体の v1、`debugAcMovementPreset=acV2`、debug off の既存移動は比較用に維持する。

### 人間プレイフィードバック

- DASH ボタンを押した時間で QB 距離を変えたい。
- Phase 8 時点の acV3 QB 距離を最大距離として扱うと丁度良さそう。
- POST_BOOST_GLIDE の滑空時間をもう少し長くしたい。
- POST_BOOST_GLIDE 中の曲がり自由度をさらに高くしたい。

### 新仕様

- DASH を押した瞬間に最小 QB を発動する。離してから発動するチャージ式にはしない。
- DASH を押し続けると、`holdRatio` に応じて powered phase の推力、速度上限、消費 EN、演出が最大値まで伸びる。
- DASH release、maxHold 到達、LOW_EN のいずれかで powered phase を終了し、POST_BOOST_GLIDE へ移行する。
- 最大ホールド時だけ Phase 8 acV3 と同じ `quickBoostImpulseMultiplier: 3.05`、`quickBoostMaxSpeedMultiplier: 3.65`、`quickBoostDurationMs: 210` に到達する。
- maxHold 以降は自動終了し、押しっぱなしで 2 回目の QB は出ない。再 QB には一度 DASH を離し、cooldown と EN 条件を満たす必要がある。
- `holdRatio = clamp((holdMs - quickBoostMinHoldMs) / (quickBoostMaxHoldMs - quickBoostMinHoldMs), 0, 1)`。
- `effectiveRatio = lerp(quickBoostMinPowerRatio, 1.0, holdRatio)`。
- target-facing はロボット見た目向きだけに使い、移動物理、QB 方向、噴射尾、攻撃ターゲットへは使わない。

### 調整後の acV3 値

| 項目 | Phase 8 acV3 | Phase 9 acV3 |
| --- | ---: | ---: |
| `quickBoostDurationMs` | `210` | `210` |
| `quickBoostHardLockMs` | `90` | `72` |
| `quickBoostImpulseMultiplier` | `3.05` | `3.05` |
| `quickBoostMaxSpeedMultiplier` | `3.65` | `3.65` |
| `quickBoostExitSpeedMultiplier` | `2.15` | `2.15` |
| `variableQuickBoostEnabled` | なし | `true` |
| `quickBoostMinHoldMs` | なし | `58` |
| `quickBoostMaxHoldMs` | なし | `210` |
| `quickBoostMinPowerRatio` | なし | `0.48` |
| `quickBoostMinDurationMs` | なし | `66` |
| `quickBoostMaxDurationMs` | なし | `210` |
| `quickBoostMinSpeedMultiplier` | なし | `0.52` |
| `quickBoostMinCostRatio` | なし | `0.52` |
| `quickBoostMaxCostRatio` | なし | `1.0` |
| `quickBoostSustainAccelerationPerSecond` | なし | `3450` |
| `postBoostGlideDurationMs` | `640` | `760` |
| `postBoostGlideMinDurationMs` | なし | `620` |
| `postBoostGlideMaxDurationMs` | なし | `880` |
| `postBoostGlideDurationByHoldRatio` | なし | `true` |
| `postBoostFrictionMultiplier` | `0.25` | `0.22` |
| `postBoostTurnAssistMultiplier` | `0.84` | `0.98` |
| `postBoostSpeedDampingPerSecond` | `820` | `780` |
| `postBoostInputSteerAcceleration` | `920` | `1160` |
| `postBoostInputSteerMultiplier` | `0.62` | `0.78` |
| `postBoostInputTurnRateDegPerSecond` | `190` | `255` |
| `postBoostInputSpeedRetention` | `0.93` | `0.94` |
| `postBoostInputMinSpeedRatio` | `0.52` | `0.60` |
| `quickBoostLateInputSteerMultiplier` | `0.18` | `0.22` |
| `quickBoostLateTurnRateDegPerSecond` | `86` | `96` |
| `thrustTrailPostBoostLength` | `78` | `88` |

### EN 消費

- `maxCost` は Phase 8 acV3 の `quickBoostCost` に Triad の DASH 消費補正を掛けた値。
- `minCost = maxCost * quickBoostMinCostRatio`。
- QB 開始時に `minCost` を即時消費する。
- ホールド中は `targetCost = lerp(minCost, maxCost, holdRatio)` の差分だけ追加消費する。
- 追加消費に EN が足りない場合は `LOW_EN` で powered phase を終了し、heat / overheat 演出へ流す。

### HUD 追加

`debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1` の HUD に以下を追加する。

- `variableQB`: 可変 QB が有効か。
- `powered`: powered phase 中か。
- `hold`: DASH ホールド時間。
- `ratio`: `holdRatio`。
- `eff`: `effectiveRatio`。
- `qbCost`: 消費済み EN / 最大 EN コスト。
- `end`: `RELEASE` / `MAX_HOLD` / `LOW_EN` / `COOLDOWN` / `DISABLED`。
- `maxHold`: maxHold までの残り時間。
- `glideDur`: 今回の POST_BOOST_GLIDE duration。
- `targetFacing eff`: target-facing が実際に有効か。

### 次回人間プレイで確認する項目

1. 短押し QB が明確に短距離になっているか。
2. 中押し QB が短押しと最大押しの中間距離になっているか。
3. 長押し QB が Phase 8 acV3 相当の最大距離に収まり、それ以上伸び続けないか。
4. 押した瞬間に最小 QB が出て、チャージ待ち感がないか。
5. `holdRatio`、`qbCost`、`end` が HUD で短押し / 中押し / 長押しに追従するか。
6. POST_BOOST_GLIDE が Phase 8 より少し長く、永久滑走にはならないか。
7. POST_BOOST_GLIDE 中の左右 / 上下入力で、即反転ではなく弧を描いて曲がれるか。
8. target-facing ON のまま短押し横 QB、長押し横 QB、後退 QB ができるか。
9. mobileControls の右 DASH ボタンでも押した長さで距離と `holdRatio` が変わるか。
10. 低 EN で powered phase が `LOW_EN` 終了し、stamina が 0 未満にならないか。
11. Final Raid debug URL で AC 移動、AC HUD、AC 演出、target-facing が混入しないか。

## 19. Phase 10 実装メモ: acV3 歩行モード分離 + QB演出復旧強化 + 可変QB完全連続化

Phase 10 は人間プレイフィードバックを受けて、`acV3` のみを追加調整する。`debugAcMovement=1` 単体の v1、`debugAcMovementPreset=acV2`、debug off の既存移動は比較用に維持する。新しい `acV4` は作らない。

### 人間プレイフィードバック

- 曲がりと滑空具合は良い。
- 通常移動は歩行モード想定なので、ブースター時画像を使わず、移動速度を少し落とす。
- DASH/QB 時だけブースター時画像を使用し、滑空中は歩行モード画像へ戻す。
- acV3 で弱く見えるようになった残像、青白い光、噴射尾を QB 中だけ強める。
- 可変 QB が 2 段階に感じるため、距離と EN 消費を連続的に変える。

### 表示モード

acV3 では物理 mode と別に、表示専用の `visualMode` / `spriteMode` を持つ。

| `visualMode` | 表示方針 |
| --- | --- |
| `WALK_IDLE` | 歩行/通常ロボット画像。強い噴射なし。 |
| `WALK_MOVE` | 歩行/通常ロボット画像。通常滑走中も強い噴射なし。 |
| `QUICK_BOOST` | ブースター画像。残像、青白いグロー、強い噴射尾を出す。 |
| `POST_BOOST_GLIDE` | 物理は滑空継続。表示は歩行/通常ロボット画像へ戻し、薄い残光だけ許可する。 |
| `OVERHEAT` | 歩行/通常ロボット画像。既存 heat / overheat 演出だけ表示する。 |

### 調整後の acV3 値

| 項目 | Phase 9 acV3 | Phase 10 acV3 |
| --- | ---: | ---: |
| `maxCruiseSpeedMultiplier` | `0.68` | `0.56` |
| `accelerationPerSecond` | `1500` | `1350` |
| `quickBoostMaxHoldMs` | `210` | `300` |
| `quickBoostMinPowerRatio` | `0.48` | `0.30` |
| `quickBoostMinDurationMs` | `66` | `52` |
| `quickBoostMaxDurationMs` | `210` | `300` |
| `quickBoostMinSpeedMultiplier` | `0.52` | `0.36` |
| `quickBoostMinCostRatio` | `0.52` | `0.34` |
| `quickBoostInitialImpulseRatio` | なし | `0.42` |
| `quickBoostSustainThrustRatio` | なし | `0.78` |
| `afterimageCount` | `5` | `7` |
| `afterimageMaxCount` | `6` | `8` |
| `afterimageAlpha` | `0.52` | `0.66` |
| `thrustTrailQuickBoostLength` | `136` | `168` |
| `thrustTrailQuickBoostWidth` | `40` | `48` |

### 可変 QB の連続化

- `rawHoldRatio = clamp(holdMs / quickBoostMaxHoldMs, 0, 1)` とし、最小ホールド境界による段差を使わない。
- `smoothedHoldRatio` は `smoothstep(rawHoldRatio)` とする。
- `powerRatio`、`speedRatio`、`visualRatio`、`glideRatio` は連続曲線から算出する。
- `costRatio` は `quickBoostMinCostRatio` から `quickBoostMaxCostRatio` まで線形に伸ばす。
- QB 開始時のインパルスは `quickBoostInitialImpulseRatio` で抑え、ホールド中の sustained thrust で距離を伸ばす。
- 最大ホールド時も Phase 9 の最大距離を大きく超えないよう、初速を抑えて推力の伸び方を平滑化する。

### HUD 追加

`debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1` の HUD に以下を追加する。

- `raw` / `smooth`
- `power` / `speed` / `cost` / `visual` / `glide`
- `qbCost: consumed / target / max`
- `visualMode`
- `sprite`
- `thrusterImg`
- `strongFx`
- `residual`
- `walkSpeed`
- `accel`
- `qbGlow`

### 次回人間プレイで確認する項目

1. 通常移動と POST_BOOST_GLIDE でブースター画像にならず、歩行/通常ロボット画像に戻るか。
2. QUICK_BOOST 中だけブースター画像、強い残像、青白い光、強い噴射尾が出るか。
3. POST_BOOST_GLIDE の曲がりや滑空感は Phase 9 の良さを維持しているか。
4. 短押し、中押し、長押しで QB 距離と EN 消費が連続的に変わり、2 段階に見えないか。
5. 最大長押し QB が Phase 9 の長押し距離を大きく超えないか。
6. mobileControls の右 DASH ボタンでも `raw` / `smooth` / `qbCost` が押下時間に追従するか。
7. Final Raid debug URL で AC 移動、AC HUD、AC 演出、target-facing が混入しないか。

## 20. Phase 11 実装メモ: acV3 継続ブースト化 + BOOST EN枯渇ロックアウト + 機体リーン

Phase 11 は人間プレイフィードバックを受けて、`debugAcMovement=1&debugAcMovementPreset=acV3` のみを追加調整する。`debugAcMovement=1` 単体の v1、`debugAcMovementPreset=acV2`、debug off、Final Raid の既存挙動は比較用に維持する。新しい `acV4` は作らない。

### 人間プレイフィードバック

- 無段階ブーストなので、長押しで到達する最大ホールド値を終了条件にしない。
- Phase 10 では最大値を超えると QB が止まっていたため、DASH 長押し中は BOOST EN が尽きるまで継続ブーストする。
- BOOST EN が 0 になったら一時ロックアウトし、押しっぱなしでは再始動しない。
- 機体表示は target-facing を維持したまま、移動方向に応じて前進、後退、横移動のリーンを出す。

### 継続ブースト

acV3 では Phase 10 の可変 QB を、DASH 長押し中の継続ブーストとして再解釈する。

- DASH justPressed で `boostStartCost` を消費し、即座に短い初動インパルスを出す。
- DASH held 中は `boostSustainDrainPerSecond` を毎秒消費し、`boostSustainAccelerationPerSecond` で継続推力をかける。
- `quickBoostMaxHoldMs` / `quickBoostMaxDurationMs` / `quickBoostAutoReleaseAtMaxHold` は acV3 継続ブーストの終了条件にしない。
- DASH release で `POST_BOOST_GLIDE` に入る。
- BOOST EN が `boostEmptyEpsilon` 以下になったら `EN_EMPTY` 終了し、BOOST EN を 0 に丸める。
- 安全のため `boostTerminalSpeedMultiplier` による速度上限は残し、無限加速は許可しない。
- ホールド中の入力ステアは target-facing ではなく、移動ベクトルだけを緩く曲げる。

### BOOST EN 枯渇ロックアウト

BOOST EN 枯渇後はラン内 state だけでロックアウトを管理し、保存データやショップ状態には触れない。

| 項目 | acV3 Phase 11 |
| --- | ---: |
| `boostStartCost` | `6` |
| `boostMinStaminaToStart` | `8` |
| `boostSustainDrainPerSecond` | `58/sec` |
| `boostSustainDrainRampMs` | `420ms` |
| `boostEmptyLockoutMs` | `1300ms` |
| `boostEmptyRegenDelayMs` | `560ms` |
| `boostRestartStaminaThreshold` | `24` |

- 消費量は `getTriadDashStaminaDrainMultiplier()` を通して Triad の DASH 消費補正を受ける。
- 回復は既存の `DASH_STAMINA_REGEN_PER_SECOND` と equipment の stamina regen 補正を使う。
- `boostEmptyLockoutMs` 中はブースト開始不可。
- ロックアウト終了後も DASH を押しっぱなしなら `mustReleaseDashBeforeBoost` が残り、離して再入力するまで再始動しない。
- 再始動には `boostRestartStaminaThreshold` 以上の BOOST EN を要求し、成功したら枯渇フラグをクリアする。

### 機体リーン

acV3 では target-facing の向きと移動方向を分けて、表示だけをリーンさせる。攻撃、スキル照準、当たり判定、移動物理には影響させない。

- `forwardDot = dot(facingDir, movementDir)`。
- `sideDot = cross(facingDir, movementDir)`。
- `FORWARD`、`BACK`、`STRAFE_L`、`STRAFE_R`、`DIAGONAL`、`IDLE` を HUD に出す。
- `leanAngle` と小さな `leanOffset` は既存の robot visual にだけ適用する。
- Final Raid では AC 移動、AC HUD、AC 演出、target-facing、リーンを引き続き無効にする。

### HUD 追加

`debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1` の HUD に以下を追加する。

- `boostMode`: `OFF` / `START_BURST` / `SUSTAIN` / `RELEASED` / `POST_GLIDE` / `EN_EMPTY` / `LOCKOUT` / `OVERHEAT`。
- `continuous`: acV3 継続ブーストの有効状態。
- `active` / `held` / `end`。
- `boostDrain` / `used` / `tEmpty`。
- `lockout` / `regen` / `boostReady` / `block` / `reqEN` / `mustRelease`。
- `maxHold` は acV3 継続ブースト中 `N/A` と表示する。
- `lean`: `mode`、`forwardDot`、`sideDot`、`leanAngle`、`leanOffset`、`movementAngle`、`facingAngle`。

### 次回人間プレイで確認する項目

1. acV3 で DASH を長押しすると、最大ホールド到達で止まらず BOOST EN が尽きるまで加速し続けるか。
2. BOOST EN が 0 になると赤橙の heat / overheat 演出になり、青い強ブースト演出が消えるか。
3. 枯渇ロックアウト中に DASH を押しっぱなしにしても自動再始動しないか。
4. DASH を離して、BOOST EN が `boostRestartStaminaThreshold` 以上まで戻った後だけ再始動できるか。
5. target-facing ON のまま、前進、後退、横移動、斜め移動で機体リーンが識別できるか。
6. mobileControls の右 DASH ボタン長押しでも継続ブースト、EN枯渇、ロックアウト、要リリースが同じように動くか。
7. v1、acV2、debug off、Final Raid debug URL で Phase 11 の移動、HUD、演出、リーンが混入しないか。

## 21. Phase 12 実装メモ: acV3 Full Overheat Recovery + AC感追加案整理

Phase 12 は人間プレイフィードバックを受けて、`debugAcMovement=1&debugAcMovementPreset=acV3` のみを追加調整する。`debugAcMovement=1` 単体の v1、`debugAcMovementPreset=acV2`、debug off、Final Raid の既存挙動は比較用に維持する。新しい `acV4` は作らない。

### 人間プレイフィードバック

- EN枯渇時の赤橙 overheat 表示は良い。
- ただし Phase 11 の短時間ロックアウトでは、すぐブースト可能になり軽すぎる。
- Overheat 後は BOOST EN が全回復するまでクイックブースト / 継続ブーストを使用不可にしたい。
- Overheat 中の BOOST EN 回復速度は通常より遅くしたい。
- Overheat 中は通常移動のみ可能にしたい。

### FULL_OVERHEAT

acV3 では BOOST EN が 0 になった時、短時間ロックアウトではなく `FULL_OVERHEAT` に入る。

- `FULL_OVERHEAT` 中は `stats.stamina >= stats.maxStamina - overheatFullRechargeEpsilon` までブースト不可。
- EN が 50%、80%、99% まで戻っても、全回復前は `NEED_FULL_RECHARGE` として不発にする。
- `FULL_OVERHEAT` 中も通常移動は可能だが、表示は歩行/通常ロボット画像に固定し、青白い強ブースト演出は出さない。
- EN 0 瞬間の赤橙 overheat フラッシュ、熱粒子、煙は維持する。
- 全回復すると `FULL_OVERHEAT` は解除する。
- 全回復後も DASH 押しっぱなしなら `READY_NEEDS_RELEASE` / `NEED_RELEASE` とし、DASH を完全に離してから再入力するまで再ブーストしない。

### acV3 調整値

| 項目 | Phase 12 acV3 |
| --- | ---: |
| `overheatRequiresFullRecharge` | `true` |
| `overheatRegenMultiplier` | `0.35` |
| `overheatRegenDelayMs` | `720ms` |
| `overheatFullRechargeEpsilon` | `0.5` |
| `overheatMinimumVisualMs` | `1250ms` |
| `fullOverheatVelocityDampingMultiplier` | `1.45` |
| `fullOverheatCruiseSpeedMultiplier` | `0.88` |
| `fullOverheatLeanMultiplier` | `0.32` |

`boostEmptyLockoutMs` と `boostRestartStaminaThreshold` は acV3 の再始動条件には使わず、`boostEmptyLockoutMs` は最低表示時間 / HUD 参考値として扱う。通常回復は既存の `DASH_STAMINA_REGEN_PER_SECOND` と装備の stamina regen 補正を使い、`FULL_OVERHEAT` 中だけ `overheatRegenMultiplier` を掛ける。

### HUD 追加

`debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1` の HUD に以下を追加する。

- `overheat`: `ON` / `OFF`。
- `overheatState`: `NONE` / `FULL_OVERHEAT` / `RECOVERING` / `READY_NEEDS_RELEASE` / `READY`。
- `overheatReason`: 主に `EN_EMPTY`。
- `overheatRequiresFullRecharge`。
- `overheatRegenMultiplier`。
- `overheatRecoveryProgress`: current / max / %。
- `overheatRegenDelayRemaining`。
- `fullRechargeReached`。
- `canBoostNow` / `boostBlockReason`。
- `mustReleaseDashBeforeBoost`。

### AC感追加アイデア

今回は以下を実装せず、設計候補として整理する。攻撃ロジック、スキルターゲット、敵AI、保存処理には触れない。

| 候補 | 効果 | 実装難易度 | 既存システムへのリスク | debugフラグ案 |
| --- | --- | --- | --- | --- |
| EN警告段階 | EN 30%以下で黄、10%以下で赤、0でOVERHEAT。EN管理を視覚化しやすい。 | 低 | 低。HUD/演出だけなら戦闘ロジックに触れない。 | `?debugAcEnergyWarning=1` |
| ロックオン風ターゲットリング | target-facing対象に薄いリングを出し、ACのロックオン感を強める。 | 中 | 低〜中。ターゲット選定を見た目参照だけに限定する必要がある。 | `?debugAcLockonRing=1` |
| ブースト方向インジケータ | DASH入力中に入力方向の短い矢印/予兆を出し、入力方向QBを直感化する。 | 低〜中 | 低。入力ベクトルの表示だけなら安全。 | `?debugAcBoostVector=1` |
| 地面接触スパーク / 重量感シャドウ | ブースト開始や横滑りで足元火花、影伸縮、粉塵を出す。 | 中 | 低。Graphics演出だけなら物理に影響しない。 | `?debugAcGroundSkid=1` |
| 急旋回 / クイックターン演出 | 逆方向入力時に火花や横滑り線を出し、重い機体の旋回感を出す。 | 中 | 中。入力タイミング判定が操作感へ見た目上の期待を作る。 | `?debugAcQuickTurnFx=1` |
| ブレーキブースト / エアブレーキ | DASH release後の逆入力で減速火花を出し、滑走/制動を分ける。 | 中〜高 | 中〜高。物理へ入れるとバランス影響が大きい。最初は演出のみが安全。 | `?debugAcAirBrake=1` |
| 着弾・被弾時の姿勢崩れ | 大ダメージやボス範囲攻撃で機体が一瞬よろける。 | 中 | 中。無敵/軽減なしの見た目限定にする必要がある。 | `?debugAcHitRecoil=1` |
| オービットスキル連携演出 | target-facing中、オービット命中時に照準安定感の小HUDを出す。 | 中〜高 | 中。スキル攻撃ロジックへ触れずイベント観測に限定する必要がある。 | `?debugAcOrbitLinkFx=1` |

優先順位は以下を提案する。

1. EN警告段階
2. ロックオン風ターゲットリング
3. ブースト方向インジケータ
4. 地面接触スパーク / 重量感シャドウ
5. 急旋回 / クイックターン演出
6. エアブレーキ
7. 被弾時姿勢崩れ
8. オービットスキル連携演出

理由は、まず EN 管理と target-facing の見た目を強める方が既存戦闘ロジックを壊しにくいため。エアブレーキや被弾反動は操作感・戦闘バランスに影響しやすいので後回しにする。

### 次回人間プレイで確認する項目

1. acV3 で DASH 長押しにより BOOST EN が 0 になり、`FULL_OVERHEAT` へ入るか。
2. `FULL_OVERHEAT` 中、EN が 50%、80%、99% でもブーストできないか。
3. `FULL_OVERHEAT` 中も通常移動だけは可能か。
4. `FULL_OVERHEAT` 中の EN 回復が通常より遅く感じられるか。
5. EN 全回復で `FULL_OVERHEAT` が解除されるか。
6. EN 全回復後、DASH 押しっぱなしでは再ブーストせず、離して再入力すると再ブーストできるか。
7. HUD の `overheatState`、`boostBlockReason`、`canBoostNow`、回復進捗が実挙動と一致するか。
8. 赤橙 overheat 表示は維持され、青白い強ブースト演出は `FULL_OVERHEAT` 中に出ないか。
9. target-facing と機体リーンは維持され、`FULL_OVERHEAT` 中は歩行相当の弱リーンになるか。
10. v1、acV2、debug off、Final Raid debug URL で Phase 12 の移動、HUD、演出、リーンが混入しないか。

## Phase 13: AC Tactical HUD / Lock-on FX Pack

Phase 13 は acV3 の操作感を変えず、戦術 HUD とロックオン風の視覚補助だけを追加する。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3` の通常 Depth のみで、Final Raid では AC 移動、target-facing、HUD、追加 FX を出さない。

### 実装範囲

- EN 警告リング: 既存 DASH ゲージ周辺に `NORMAL` / `CAUTION` / `WARNING` / `CRITICAL` / `FULL_OVERHEAT` を表示する。
- Lock-on リング: 既存の `state.acFacingTarget` を読むだけで、target-facing 対象の周囲へ薄い照準リングを描く。
- Boost Vector: `getAcQuickBoostDirection()` と同じ優先順位で、入力 / 速度 / lastMoveDirection から予測ブースト方向を描く。
- Ground Skid: `?debugAcGroundSkid=1` のときだけ、ブースト開始と高速 POST_BOOST_GLIDE に軽い足元線を描く。
- Debug HUD: `energyState`、`energyRatio`、`overheatRecoveryProgress`、`lockonRing`、`lockonTargetType`、`lockonDistance`、`boostVector`、`predictedBoostAngle`、`boostAvailable`、`boostBlockReason`、`groundSkidFx`、tactical visual count を表示する。

### Debug フラグ

| フラグ | 既定 | 効果 |
| --- | --- | --- |
| `debugAcEnergyWarning=0` | ON | acV3 の EN 警告リングを無効化する。 |
| `debugAcEnergyWarning=1` | ON | 明示的に EN 警告リングを有効化する。 |
| `debugAcLockonRing=0` | ON | acV3 target-facing のロックオンリングを無効化する。 |
| `debugAcBoostVector=0` | ON | acV3 のブースト方向インジケータを無効化する。 |
| `debugAcGroundSkid=1` | OFF | 軽量 Ground Skid FX を有効化する。 |

### 受け入れ条件

1. debug off、v1、acV2、Final Raid では Phase 13 の HUD / ring / vector / skid が表示されない。
2. acV3 で EN が 30% 未満、15% 未満、7% 未満、FULL_OVERHEAT の順に警告段階が変わる。
3. Lock-on リングは `state.acFacingTarget` が有効な時だけ出て、破棄済み、非 active、Final Raid 対象、画面外の対象では消える。
4. Boost Vector は target-facing ではなくブースト物理と同じ方向優先順位を使い、ブースト不可時は赤橙系になる。
5. Ground Skid は `debugAcGroundSkid=1` の時だけ出て、物理速度、EN 消費、当たり判定、playBounds に影響しない。
6. `cleanupAcMovementVisuals()` で追加 visual がすべて破棄され、GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、AC 無効化、Final Raid で残留しない。
7. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

## Phase 14: Quick Turn / Ground Skid / Attitude Control FX

Phase 14 は acV3 の移動物理・BOOST EN・target-facing・攻撃ロジックを変えず、機体の重量感を補強する視覚演出だけを追加する。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3` の通常 Depth のみで、debug off、v1、acV2、Final Raid には混入させない。

Phase 13 後の人間プレイ確認では、EN 警告リングは DASH ゲージではなくプレイヤー周辺へ重ねる配置が採用済み。Phase 14 ではこの配置を維持し、EN リングや Lock-on リングの対象判定は変更しない。

### 実装範囲

- Quick Turn FX: 入力方向と現在速度方向の角度差、または target-facing 中の横滑りが大きい時だけ、足元へ短い急旋回スパークを出す。
- Ground Skid FX: Phase 13 の `debugAcGroundSkid=1` 限定演出を acV3 既定 ON に昇格し、ブースト中 / POST_BOOST_GLIDE 中の横滑り量で線と火花の強度を変える。
- Attitude Control Jets: target-facing 中に前後左右へ滑っている時、機体横または前方へ小さな姿勢制御スラスターを描く。
- Weight Shadow: 既存 `playerShadow` を速度に応じてわずかに伸縮・回転させ、クイックブースト / 滑走中の接地感を出す。
- Debug HUD: `quickTurnFx`、cooldown、turnAngleDelta、sideSlip、`groundSkidIntensity`、`attitudeJetIntensity`、`weightShadowIntensity`、`localMove`、`kineticFxCount`、`visualDepthMode` を追加する。

### Debug フラグ

| フラグ | 既定 | 効果 |
| --- | --- | --- |
| `debugAcQuickTurnFx=0` | ON | acV3 の Quick Turn スパークを無効化する。 |
| `debugAcQuickTurnFx=1` | ON | acV3 の Quick Turn スパークを明示的に有効化する。 |
| `debugAcGroundSkid=0` | ON | acV3 の Ground Skid FX を無効化する。 |
| `debugAcGroundSkid=1` | ON | acV3 の Ground Skid FX を明示的に有効化する。 |
| `debugAcAttitudeJets=0` | ON | acV3 の姿勢制御ジェットを無効化する。 |
| `debugAcAttitudeJets=1` | ON | acV3 の姿勢制御ジェットを明示的に有効化する。 |
| `debugAcWeightShadow=0` | ON | acV3 の重量感シャドウを無効化する。 |
| `debugAcWeightShadow=1` | ON | acV3 の重量感シャドウを明示的に有効化する。 |

### 受け入れ条件

1. acV3 でブースト中または POST_BOOST_GLIDE 中、逆方向入力や大きな横滑り時だけ Quick Turn スパークが出る。
2. acV3 では `debugAcGroundSkid=1` なしでも Ground Skid が出て、`debugAcGroundSkid=0` で消える。
3. target-facing 中に横移動 / 後退滑走すると Attitude Control Jet が出るが、攻撃対象選択やスキル挙動は変わらない。
4. Weight Shadow は既存 shadow の scale / alpha / rotation / depth だけを調整し、playerHitbox、playBounds、障害物 collider には影響しない。
5. FULL_OVERHEAT 中は青白い強ブースト系 FX を出さず、Phase 12 の overheat 表示を維持する。
6. debug off、v1、acV2、Final Raid では Quick Turn / Ground Skid / Attitude Jet / Weight Shadow が有効にならない。
7. GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、AC 無効化、Final Raid で追加 Graphics と state が残留しない。
8. BOOST EN 消費、回復、FULL_OVERHEAT、速度、加速、減速、target-facing、ロボット表示切替、EN 警告リング、Lock-on リング、Boost Vector の既存挙動を変えない。
9. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回人間プレイで確認する項目

1. acV3 で素早く逆方向入力した時、Quick Turn スパークが過剰に常時点灯せず、旋回感だけを補強しているか。
2. ブースト滑走中の横滑りで Ground Skid が見え、停止・歩行では目立ちすぎないか。
3. target-facing 中の横移動 / 後退時、Attitude Jet が機体周辺の補助噴射として読めるか。
4. Weight Shadow の伸縮が HUD や EN リング、Lock-on リングを邪魔していないか。
5. `debugAcQuickTurnFx=0`、`debugAcGroundSkid=0`、`debugAcAttitudeJets=0`、`debugAcWeightShadow=0` で個別に消えるか。
6. `debugAcMovementHud=1` の `localMove`、`kineticFxCount`、各 intensity が見た目の発火と一致するか。
7. Final Raid URL、debug off、v1、acV2 で Phase 14 FX が混入していないか。

## Phase 15: Air Brake Prototype

Phase 15 は acV3 の継続ブースト後の滑走にだけ、短いブレーキブーストを試験導入する。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcAirBrake=1` の通常 Depth のみで、既定では OFF。`debugAcAirBrake=1` だけでは有効にならず、debug off、v1、acV2、Final Raid では既存挙動を維持する。

### 実装範囲

- Air Brake 判定: 高速滑走中に速度方向と入力方向の dot が `-0.65` 以下、速度 `220` 以上、入力強度 `0.55` 以上の状態を `70ms` 維持した時だけ発動する。
- Air Brake 物理: `state.velocity` を短時間だけ減衰させ、`playerHitbox.body.setVelocity()` の既存経路へ流す。`setPosition` は使わない。
- BOOST EN: Air Brake 自体は EN を消費しない。発動中と終了後 `300ms` は EN 回復をブロックする。FULL_OVERHEAT 中は発動不可。
- Cooldown: 発動後は `600ms` の Air Brake 専用 cooldown を持つ。通常の継続ブースト cooldown / lockout は変更しない。
- FX: Phaser Graphics だけで白橙の逆噴射とスパークを描く。新規画像や音声は必須にしない。
- Debug HUD: `airBrake` の ON/OFF、active、available、block reason、cooldown、opposing hold、dot、duration、strength、speed before/current、target speed、regen block、FX 状態を表示する。

### Debug フラグ

| フラグ | 既定 | 効果 |
| --- | --- | --- |
| `debugAcAirBrake=0` | OFF | acV3 Air Brake を無効化する。 |
| `debugAcAirBrake=1` | OFF | `debugAcMovement=1&debugAcMovementPreset=acV3` の時だけ Air Brake prototype を有効化する。 |

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcAirBrake=1` の通常 Depth でのみ Air Brake が発動する。
2. `debugAcAirBrake=1` だけ、debug off、v1、acV2、Final Raid では Air Brake の物理、FX、HUD 状態が混入しない。
3. 継続ブースト中、クイックブースト powered phase 中、FULL_OVERHEAT 中は Air Brake が発動しない。
4. 高速滑走中に逆入力を 70ms 以上入れた時だけ発動し、横入力や低速歩行では発動しない。
5. 発動中は速度方向を即座に逆転させず、慣性方向を残したまま短く減速する。
6. Air Brake は EN を消費せず、発動中と終了後 300ms だけ EN 回復を止める。
7. 当たり判定、playBounds、障害物 collider、Gate、Shop、Ranking、Firebase、localStorage、sessionStorage、攻撃ターゲット選定、敵 AI は変更しない。
8. GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、AC 無効化、Final Raid で追加 Graphics と state が残留しない。
9. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回人間プレイで確認する項目

1. 継続ブーストを離した後、進行方向の逆へ入力した時だけ Air Brake が出るか。
2. Air Brake の減速量が強すぎず、完全停止や即反転になっていないか。
3. Air Brake の白橙 FX が EN 警告リング、Lock-on リング、Ground Skid、Attitude Jet、Weight Shadow を邪魔していないか。
4. Air Brake 中に DASH を押しても挙動が破綻せず、EN 消費や FULL_OVERHEAT ルールが既存通りか。
5. `debugAcMovementHud=1` の `airBrake`、`block`、`dot`、`oppose`、`regen` が実際の発動条件と一致するか。
6. Final Raid URL、debug off、v1、acV2 で Phase 15 の物理と FX が混入していないか。

## Phase 16: Air Brake acV3標準化 + AC Movement Release Candidate QA

Phase 16 は Phase 15 の人間プレイ確認を受け、Air Brake を acV3 の標準機能へ昇格する。まだ通常プレイ全体へ本番採用する段階ではないため、対象は引き続き `?debugAcMovement=1&debugAcMovementPreset=acV3` の通常 Depth のみとし、README 更新は本番採用時にまとめて行う。

### 人間プレイフィードバック

- Air Brake の操作感は良好。
- 微調整は不要。
- 次は完成した Air Brake を acV3 の標準挙動へ統合する。

### 仕様

- acV3 では Air Brake を標準 ON にする。
- `?debugAcMovement=1&debugAcMovementPreset=acV3` だけで Air Brake が有効になる。
- `debugAcAirBrake=0` は acV3 内の明示 OFF 上書きとして扱う。
- `debugAcAirBrake=1` は後方互換の明示 ON として扱う。
- v1、acV2、debug off、Final Raid では Air Brake を無効にする。
- Air Brake の発動条件、減速量、cooldown、EN 回復ブロック、FX 強度は Phase 15 の値を維持する。

### 操作

- 高速滑走中に進行方向と逆方向へ入力を入れると Air Brake が発動する。
- 即停止や即反転ではなく、慣性方向を残した短時間の強制動として扱う。
- Air Brake 自体は BOOST EN を消費しない。
- 発動中と終了直後だけ BOOST EN 回復を短時間停止する。
- FULL_OVERHEAT 中、継続ブースト中、QB powered phase 中は発動不可。

### Debug フラグ

| フラグ | 効果 |
| --- | --- |
| 指定なし | acV3 では Air Brake 標準 ON。 |
| `debugAcAirBrake=1` | 後方互換の明示 ON。acV3 では指定なしと同じ。 |
| `debugAcAirBrake=0` | acV3 の Air Brake を明示 OFF。 |

### HUD 表示

`debugAcMovementHud=1` の AC Movement HUD では、Air Brake の標準化状態を確認できるようにする。

- `airBrakeEffective`: 実効 ON / OFF。
- `airBrakeDefault`: acV3 標準 ON か。
- `airBrakeOverride`: `NONE` / `FORCE_ON` / `FORCE_OFF`。
- `airBrakeActive`
- `airBrakeAvailable`
- `airBrakeBlockReason`
- `airBrakeCooldownRemaining`
- `airBrakeDot`
- `airBrakeOpposeMs`
- `airBrakeRegenBlockRemaining`

### AC Movement Release Candidate Checklist

1. 継続ブースト: DASH 長押しで加速し、BOOST EN を消費し続ける。
2. FULL_OVERHEAT: EN 枯渇後は全回復まで再ブースト不可で、押しっぱなし再始動もしない。
3. target-facing: 攻撃対象選定を変えず、見た目の向き制御だけを行う。
4. EN警告リング: EN段階と FULL_OVERHEAT をプレイヤー周辺で読める。
5. Lock-onリング: target-facing 対象を見た目だけで示す。
6. Boost Vector: ブースト方向と可否を見た目だけで示す。
7. Quick Turn: 高速滑走中の大きな方向転換にスパークを出す。
8. Ground Skid: 横滑りや滑走で足元の接地感を出す。
9. Attitude Jet: target-facing 中の横移動 / 後退滑走に姿勢制御ジェットを出す。
10. Weight Shadow: 速度に応じて既存 shadow を伸縮・回転する。
11. Air Brake: 高速滑走中の逆入力で短時間の制動、白橙スパーク、EN回復ブロックを行う。

### 本番化前の残作業

1. acV3 を `debugAcMovement` なしで通常 Depth のデフォルト移動にするか判断する。
2. README の通常移動説明と debug URL 一覧を本番仕様に合わせて更新するか判断する。
3. スマホ実機で長時間プレイし、左仮想スティックの逆入力 Air Brake を確認する。
4. Final Raid 除外を再確認し、Final Raid 専用移動、HUD、救援、氷結スローへ混入しないことを確認する。
5. 通常 Depth10 / Depth10 Relay のロボット表示と acV3 移動の共存を確認する。

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3` だけで Air Brake が有効になる。
2. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcAirBrake=1` でも Air Brake が有効のまま。
3. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcAirBrake=0` では Air Brake が無効になる。
4. `?debugAcMovement=1` の v1、`debugAcMovementPreset=acV2`、debug off、Final Raid では Air Brake が発動しない。
5. Phase 15 の Air Brake 数値、操作感、FX 強度を維持する。
6. acV3 の継続ブースト、EN消費、FULL_OVERHEAT復帰条件、postBoost steering、target-facing を変更しない。
7. Phase 14 の Quick Turn / Ground Skid / Attitude Jet / Weight Shadow の基本挙動を変更しない。
8. 攻撃ロジック、スキルターゲット、敵AI、当たり判定、保存処理、ショップ、ランキング、Firebase、localStorage、sessionStorage には触れない。
9. GameOver、Shop、LevelUp、Gate、Extraction、Depth遷移、AC無効化、Final Raid で Air Brake FX と一時 state が残留しない。
10. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

## Phase 17: Targeted Burst Fire FX Prototype

Phase 17 は人間プレイフィードバックを受け、acV3 の AC 感をさらに強めるための見た目専用射撃 FX を試験導入する。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth のみで、debug off、v1、acV2、Final Raid には混入させない。README は正式採用前のため更新しない。

### 人間プレイフィードバック

- 通常 Depth10、Final Raid 除外、Shop 復帰、Gate 遷移に不具合なし。
- ブラウザのモバイル解像度でも表示崩れなし。
- 次の AC 感として、現在ターゲットへ射撃連射する行動を検討する。
- 実ダメージを伴う射撃はゲームバランスに影響するため、まず見た目だけのターゲット射撃演出として試す。

### 仕様

- acV3 + `debugAcTargetFire=1` 限定で Targeted Burst Fire FX を有効化する。
- `debugAcTargetFire=1` 単体では何も変えない。
- target-facing / Lock-on リングが参照している `acFacingTarget` を読むだけで、攻撃ターゲット選定は変更しない。
- 物理弾、projectile body、collider、overlap は作らない。
- 敵 HP、damage、撃破、ドロップ、ランキング、スキル発射方向、攻撃ターゲット選定には影響しない。
- Phaser Graphics + Tween の短命 muzzle flash、tracer line、impact spark で表現する。
- 左右銃口を交互に使い、短い burst を shot interval ごとに表示する。
- continuous boost / POST_BOOST_GLIDE 中も射撃 FX は出せるが、tracer spread を少し増やして高速機動中のブレとして読む。
- FULL_OVERHEAT 中は射撃 FX を停止し、`suppressedReason = FULL_OVERHEAT` とする。
- Air Brake active 中は射撃 FX を停止し、`suppressedReason = AIR_BRAKE` とする。
- Final Raid 中は AC 移動、AC HUD、target-facing、Targeted Burst Fire FX を無効にする。

### Debug Query

| フラグ | 効果 |
| --- | --- |
| `debugAcTargetFire=1` | `debugAcMovement=1&debugAcMovementPreset=acV3` の通常 Depth で Targeted Burst Fire FX を有効化する。 |

### HUD 表示

`debugAcMovementHud=1&debugAcTargetFire=1` の AC Movement HUD では以下を表示する。

- `targetFire`: 実効 ON / OFF。
- `targetFireActive`: burst 中か。
- `targetFireSuppressedReason`: 射撃が出ない理由。
- `targetFireTargetType`
- `targetFireTargetDistance`
- `targetFireBurstShotIndex`
- `targetFireBurstSize`
- `targetFireNextShotMs`
- `targetFireCooldownMs`
- `targetFireActiveTracers`
- `targetFireMuzzleSide`
- `targetFireMode`: `WALK` / `BOOST` / `POST_GLIDE` / `AIR_BRAKE_SUPPRESSED` / `OVERHEAT_SUPPRESSED`。

### Cleanup

- Targeted Burst Fire FX はラン内一時 state のみで保持する。
- muzzle flash、tracer line、impact spark、Tween、target 参照は `cleanupAcMovementVisuals()` 経由で破棄する。
- GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、restart、scene shutdown、AC movement 無効化、Final Raid 開始で残留しない。
- destroyed enemy、scene なし enemy、body 無効 enemy、画面外 target は安全に停止する。

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth でのみ Targeted Burst Fire FX が出る。
2. debug off、`debugAcTargetFire=1` 単体、v1、acV2、Final Raid では Targeted Burst Fire FX が出ない。
3. target-facing / Lock-on リング対象へ向けて、左右銃口から交互に muzzle flash と tracer line が出る。
4. target がない、消滅、死亡、非 active、画面外、body 無効の時は射撃しない。
5. FULL_OVERHEAT 中は射撃しない。
6. Air Brake active 中は射撃しない。
7. tracer、muzzle、impact は短命で、activeTracers や Tween が溜まり続けない。
8. 敵 HP、damage、撃破、ドロップ、ランキング、攻撃スキル、Robot Missile、Support、LOST ARMS、敵 AI、Gate、Shop、Firebase、localStorage、sessionStorage を変更しない。
9. acV3 のブースト物理、EN消費、FULL_OVERHEAT復帰条件、通常移動速度、postBoost steering、Air Brake 数値を変更しない。
10. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回検討

ダメージあり版を検討する場合は、acV3 正式採用後に別システムとして扱う。候補は `ARMAMENT FIRE` skill、Robot Gun Pod、Equipment weapon effect、OVERDRIVE MOD など。実装時は今回の見た目 FX とは分離し、damage、target selection、drop、ranking への影響を明示した別フェーズにする。

## Phase 18: Targeted Burst Fire FX v2 / Segmented Red Tracer

Phase 18 は Phase 17 の Targeted Burst Fire FX を、長い接続線ではなく短い赤い射撃トレーサーが連続してターゲットへ飛ぶ表現へ改善する。対象は引き続き `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth のみで、debug off、v1、acV2、Final Raid には混入させない。README は正式採用前のため更新しない。

### 人間プレイフィードバック

- Phase 17 の tracer は、連続射撃ではなくモンスターのヘイト線のような 1 本線に見える。
- 理想は、赤い短い射撃トレーサーが複数本、プレイヤー側からターゲットへ流れていく表現。
- クイックブースト / 継続ブースト / POST_BOOST_GLIDE 中に次弾の軌道が変わると、AC らしい機動射撃感が出る。

### 新仕様

- `debugAcTargetFire=1` の表示は segmented v2 を標準にする。
- 1 shot ごとに発射時点の muzzle origin と target point を snapshot する。
- 既に発射済みの tracer は player / target の現在位置へ追従せず、snapshot された軌道上を進む。
- tracer は full line ではなく、progress 付近の短い赤い segment だけを描く。
- segment は player -> target 方向へ progress `0 -> 1` で移動する。
- target 側の impact spark は tracer 到達時に小さく表示する。
- muzzle flash は発射時に player 側へ必ず出し、左右銃口を交互に使う。
- continuous boost / QUICK_BOOST / POST_BOOST_GLIDE 中は次弾ごとに現在の muzzle / target snapshot を取り直し、spread と muzzle motion offset を少し増やす。
- Air Brake active 中は Phase 17 同様に射撃を抑制する。
- FULL_OVERHEAT 中は射撃を抑制する。

### Visual Tuning

| 項目 | 値 | 意図 |
| --- | ---: | --- |
| `targetFireStyle` | `segmented` | v2 表現を標準にする |
| `targetFireBurstSize` | `10` | 連射感を出す |
| `targetFireShotIntervalMs` | `46` | 1 burst 内に複数 segment が並ぶ間隔 |
| `targetFireBurstCooldownMs` | `280` | burst と cooldown のリズムを残す |
| `targetFireTracerTravelMs` | `150` | player -> target への飛翔が読める短時間 |
| `targetFireTracerSegmentLengthRatio` | `0.12` | full line 化を避ける短い線分 |
| `targetFireTracerMinLengthPx` | `44` | 近距離でも弾道として読める最小長 |
| `targetFireTracerMaxLengthPx` | `118` | 遠距離で長すぎる線にならない上限 |
| `targetFireMaxActiveTracers` | `40` | 同時表示上限 |
| `targetFireWalkSpreadDeg` | `1.5` | 歩行中は低 spread |
| `targetFirePostGlideSpreadDeg` | `3` | 滑走中の軽いブレ |
| `targetFireBoostSpreadDeg` | `7` | ブースト中の機動射撃感 |

### HUD 表示

`debugAcMovementHud=1&debugAcTargetFire=1` の AC Movement HUD では、Phase 17 の項目に加えて以下を確認する。

- `targetFireStyle`: `segmented`
- `targetFireTracerTravelMs`
- `targetFireSegmentRatio`
- `targetFireSpreadDeg`

### Cleanup

- active tracer は短命な Phaser Graphics と tween で管理する。
- active tracer 上限を超えた場合は古い tracer から tween を停止して destroy する。
- target が死んだ後も既に発射済みの tracer は snapshot 軌道で自然に消え、新 shot は発生しない。
- muzzle flash、tracer segment、impact spark、Tween、target reference は `cleanupAcMovementVisuals()` 経由で破棄する。
- GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、restart、scene shutdown、AC movement 無効化、Final Raid 開始で残留しない。

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth でのみ Targeted Burst Fire FX v2 が出る。
2. debug off、`debugAcTargetFire=1` 単体、v1、acV2、Final Raid では Targeted Burst Fire FX v2 が出ない。
3. tracer は player と target を結ぶ full line ではなく、短い赤い segment として表示される。
4. segment は player 側から target 側へ進んで見える。
5. muzzle flash が player 側に出て、impact spark が target 側に遅れて出る。
6. continuous boost / QUICK_BOOST / POST_BOOST_GLIDE 中に、次弾の発射位置と軌道がプレイヤー移動に合わせて変化する。
7. Air Brake active 中は射撃しない。
8. FULL_OVERHEAT 中は射撃しない。
9. 敵 HP、damage、撃破、ドロップ、ランキング、攻撃スキル、Robot Missile、Support、LOST ARMS、敵 AI、Gate、Shop、Firebase、localStorage、sessionStorage を変更しない。
10. projectile body、collider、overlap、hit event、damage 処理を追加しない。
11. acV3 のブースト物理、EN 消費、FULL_OVERHEAT 復帰条件、Air Brake 数値、Phase 14-16 の既存 FX 挙動を変更しない。
12. activeTracers や Tween が溜まり続けない。
13. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回人間プレイ確認

1. tracer がヘイト線や敵攻撃予兆ではなく、赤い短い連射弾に見えるか。
2. player -> target 方向へ撃っていると読めるか。
3. burst 中に複数 segment が時間差で並ぶか。
4. ブースト中に次弾の軌道が変わり、機動射撃に見えるか。
5. 敵 HP、撃破数、ドロップ、ランキングに影響していないか。
6. EN 警告リング、Lock-on リング、Boost Vector、Quick Turn、Ground Skid、Attitude Jet、Weight Shadow を邪魔していないか。
7. mobileControls=1 でも表示が破綻しないか。
8. Gate、Level Up、Shop 復帰、Depth 遷移、Final Raid URL で残留や混入がないか。

## Phase 19: Target Fire Amber Burst / Twin Muzzle Visibility Tuning

Phase 19 は Phase 18 の segmented tracer 方式を維持したまま、Target Fire FX の視認性を上げるチューニングを行う。対象は引き続き `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth のみで、debug off、v1、acV2、Final Raid には混入させない。正式採用前の debug チューニングのため README は更新しない。

### 人間プレイフィードバック

- 左右交互の muzzle flash が弱く、どちらの銃口から撃っているか分かりにくい。
- 射撃線が細く、発光が薄く見える。
- 赤中心より橙〜黄色の方が背景や赤い敵予兆と分離して見やすい可能性が高い。
- 添付理想例のように、短い連続射撃としての存在感を上げたい。

### 新仕様

- Target Fire の標準 palette を amber / yellow 系にする。
- `debugAcTargetFirePalette=red` で旧赤系比較を可能にする。未対応 palette は amber にフォールバックする。
- tracer は Phase 18 の短い segmented tracer を維持し、full line / hate line には戻さない。
- tracer を outer glow、glow、core の順で重ね、白〜黄色の芯線と橙の外側グローで描く。
- burst cadence を少し強め、複数の短い tracer が並びやすくする。
- 左右 muzzle origin の side offset を広げ、shot ごとに L/R/L/R の strict alternate を維持する。
- muzzle flash は白芯、黄橙リング、小さな火花で、プレイヤー側から撃っていることを読みやすくする。
- target snapshot 側の impact spark を少し強くするが、ダメージ演出に見えすぎない小型 FX に留める。
- continuous boost / POST_BOOST_GLIDE 中は shot ごとの muzzle / target snapshot で軌道が変わる既存挙動を維持する。
- Air Brake 中と FULL_OVERHEAT 中は Target Fire を既存通り抑制する。
- damage、enemy HP、kill、drop、ranking、skill target selection、Robot Missile、Support、LOST ARMS、enemy AI、collider、overlap、projectile body、保存処理は変更しない。

### Debug Query

| フラグ | 効果 |
| --- | --- |
| `debugAcTargetFire=1` | acV3 の通常 Depth で Target Fire FX を有効化する。単体では何も変えない。 |
| `debugAcTargetFirePalette=amber` | 標準の橙〜黄色 palette。未指定時も amber。 |
| `debugAcTargetFirePalette=red` | Phase 18 旧赤系に近い比較用 palette。 |

### Visual Tuning

| 項目 | 値 | 意図 |
| --- | ---: | --- |
| `targetFirePalette` | `amber` | 赤い敵予兆と分離しやすい標準色 |
| `targetFireBurstSize` | `12` | 連射感を少し強める |
| `targetFireShotIntervalMs` | `40` | 同時に複数 segment が見える cadence |
| `targetFireBurstCooldownMs` | `240` | burst 間の休止を短くする |
| `targetFireTracerTravelMs` | `145` | 短い弾道の飛翔を読める速度 |
| `targetFireTracerSegmentLengthRatio` | `0.14` | full line 化せず、弾道として読める長さ |
| `targetFireTracerCoreWidth` | `2.4` | 白〜黄色の芯線 |
| `targetFireTracerGlowWidth` | `6.2` | 橙の主グロー |
| `targetFireTracerOuterGlowWidth` | `11.5` | 薄い外側残光 |
| `targetFireMuzzleSideOffset` | `18` | 左右銃口の分離 |
| `targetFireMuzzleSideKickPx` | `3` | 発射側をさらに読みやすくする |
| `targetFireMuzzleFlashLifetimeMs` | `88` | 発射側の視認性を上げる |
| `targetFireImpactLifetimeMs` | `125` | target 側の小さな着弾感 |
| `targetFireMaxActiveTracers` | `48` | 連射中の同時表示を許容 |

### HUD 表示

`debugAcMovementHud=1&debugAcTargetFire=1` では Phase 18 の項目に加え、以下を確認できる。

- `targetFirePalette`
- `targetFireTracerCoreWidth`
- `targetFireTracerGlowWidth`
- `targetFireTracerOuterGlowWidth`
- `targetFireTracerCoreAlpha`
- `targetFireTracerGlowAlpha`
- `targetFireTracerOuterGlowAlpha`
- `targetFireMuzzleSide`: `L` / `R`
- `targetFireMuzzleOffsetSide`
- `targetFireActiveMuzzleFlashes`
- `targetFireActiveTracers`
- `targetFireActiveImpacts`
- `targetFireShotIntervalMs`
- `targetFireStyle`
- `targetFireSuppressedReason`

### Cleanup

- muzzle flash、tracer、impact spark、Tween は既存の `activeMuzzles`、`activeTracers`、`activeImpacts`、`activeTweens` で管理する。
- `cleanupAcTargetFireFx()` と `cleanupAcMovementVisuals()` 経由で GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、restart、AC movement 無効化、Final Raid 開始時に破棄する。
- active FX 上限超過時は古いものから Tween を止めて破棄する。
- target が消えた後、新規 shot は止める。発射済み tracer は snapshot 軌道で自然に消え、target 参照を追い続けない。

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcTargetFire=1` の通常 Depth でのみ amber Target Fire FX が出る。
2. debug off、`debugAcTargetFire=1` 単体、v1、acV2、Final Raid では Target Fire FX が出ない。
3. tracer は橙〜黄色の短い segment として player 側から target 側へ進む。
4. tracer は outer glow、glow、core の3層で、Phase 18 より太く発光して見える。
5. long full line / hate line / enemy warning band には見えない。
6. muzzle flash が player 側で L/R/L/R と交互に出る。
7. target 側に小さな amber impact spark が出る。
8. continuous boost / QUICK_BOOST / POST_BOOST_GLIDE 中に、次弾の発射位置と軌道がプレイヤー移動に合わせて変化する。
9. Air Brake active 中は射撃しない。
10. FULL_OVERHEAT 中は射撃しない。
11. 敵 HP、damage、撃破、ドロップ、ランキング、攻撃スキル、Robot Missile、Support、LOST ARMS、敵 AI、Gate、Shop、Firebase、localStorage、sessionStorage を変更しない。
12. projectile body、collider、overlap、hit event、damage 処理を追加しない。
13. acV3 のブースト物理、EN 消費、FULL_OVERHEAT 復帰条件、Air Brake 数値、Phase 14-16 の既存 FX 挙動を変更しない。
14. activeTracers、activeMuzzles、activeImpacts、Tween が溜まり続けない。
15. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回人間プレイ確認

1. 左右交互に撃っているように見えるか。
2. 線が細すぎず、橙〜黄色の芯線とグローが読みやすいか。
3. Boss 予兆や敵攻撃の赤帯と誤認しないか。
4. 1本線ではなく、短い連射 tracer が並んで見えるか。
5. muzzle flash、tracer、impact spark の順序が自然か。
6. continuous boost / POST_BOOST_GLIDE 中の機動射撃感が出ているか。
7. FPS 低下や active FX 蓄積がないか。
8. 敵 HP、撃破数、ドロップ、ランキングに影響していないか。
9. mobileControls=1 でも既存 HUD / FX と重なりすぎないか。
10. Gate、Level Up、Shop 復帰、Depth 遷移、Final Raid URL で残留や混入がないか。

## Phase 20: Quick Boost Evade Window Prototype

Phase 20 は acV3 の Quick Boost / continuous boost 開始直後だけに、ごく短い回避猶予を付ける debug prototype とする。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcEvadeWindow=1` の通常 Depth のみで、`debugAcEvadeWindow=1` 単体、debug off、v1、acV2、Depth10 Final Raid には混入させない。正式採用前の prototype のため README は更新しない。

### 人間プレイフィードバック

- AC 風移動では、Quick Boost の入力直後に敵弾や接触をすり抜けたように感じる短い猶予があると回避行動として成立しやすい。
- 長い無敵や押しっぱなし無敵にするとサバイバルゲームの被弾管理が壊れるため、成功ブースト開始直後だけの極短時間に限定する。
- Robot Barrier や Final Raid 救援シールドを消費して防いだのではなく、機体が避けたと読める小さな HUD / FX が必要。

### Debug Query

| フラグ | 効果 |
| --- | --- |
| `debugAcEvadeWindow=1` | `debugAcMovement=1&debugAcMovementPreset=acV3` と併用した通常 Depth でのみ Quick Boost Evade Window を有効化する。単体では何も変えない。 |

### 新仕様

- Quick Boost / continuous boost の開始成功時だけ `evadeWindow` を開く。
- 失敗した DASH、EN 不足、lockout、FULL_OVERHEAT recovery、Air Brake、POST_BOOST_GLIDE では window を開かない。
- v1 初期値は `70ms`、上限は `90ms` とする。
- window はブースト開始直後のみ有効で、押しっぱなしの継続ブースト全体、POST_BOOST_GLIDE、Air Brake、FULL_OVERHEAT には無敵を付けない。
- 通常の `applyDamageToPlayer()` に入る AP ダメージだけを、Robot Barrier / Final Raid shield / Legend Guard より前で無効化する。
- 無効化時は `invincibleUntil` を進めず、Robot Barrier や shield も消費しない。
- Gate collapse、extraction failure、Final Raid story / process、debug instant death 系の処理は対象外とする。
- Target Fire は引き続き visual-only のままで、projectile body、collider、overlap、hit event、damage は追加しない。

### Visual / HUD

- window active 中はプレイヤー中心に薄い cyan / white の楕円 shield を出す。
- window 開始時は短い ring pulse を出す。
- ダメージを無効化したときだけ `EVADE` text を短く表示する。
- 新規画像・音声アセットは使わず Phaser Graphics / Text / Tween のみで成立させる。
- `debugAcMovementHud=1` では以下を確認できる。

| 項目 | 内容 |
| --- | --- |
| `evadeWindow` | Evade Window の有効状態 |
| `active` | 現在 window 中か |
| `remain` / `dur` | 残り時間と初期 duration |
| `can` | 次の boost start で起動可能か |
| `src` / `reason` | 起動元と最後の状態理由 |
| `neg` | 無効化したダメージ回数 |
| `lastAt` / `age` | 最後に無効化した時刻と経過時間 |
| `dmg` | 最後に無効化した source / amount |
| `fx` | Evade Window の active visual 数 |

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcEvadeWindow=1` の通常 Depth でのみ Evade Window が有効になる。
2. `debugAcEvadeWindow=1` 単体、debug off、v1、acV2、Depth10 Final Raid では Evade Window が無効になる。
3. Quick Boost / continuous boost の開始成功時だけ window が開く。
4. EN 不足、boost lockout、FULL_OVERHEAT recovery、Air Brake、POST_BOOST_GLIDE では window が開かない。
5. 初期 window は約 `70ms` で、最大でも `90ms` を超えない。
6. window 中に通常 AP ダメージが `applyDamageToPlayer()` へ入った場合、Robot Barrier / shield 消費前に無効化される。
7. window 外のダメージ、Gate、Shop、Ranking、Firebase、localStorage、sessionStorage、Final Raid 専用処理は従来通り。
8. acV3 の movement physics、QB distance / speed、EN cost、FULL_OVERHEAT recovery、Air Brake values は変更しない。
9. Target Fire は visual-only のまま、damage / projectile / collider / overlap を追加しない。
10. Evade ring、shield、text、Tween は `cleanupAcMovementVisuals()` 経由で GameOver、Shop、LevelUp、Gate、Extraction、Depth 遷移、restart、scene shutdown、AC movement 無効化、Final Raid 開始時に残留しない。
11. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 将来設計 A: Evasive Firmware passive

正式採用後に passive として伸ばす場合の候補。Phase 20 では未実装。

| Lv | 追加 window |
| ---: | ---: |
| 1 | `+10ms` |
| 2 | `+20ms` |
| 3 | `+30ms` |
| 4 | `+40ms` |
| 5 | `+55ms` |

- base `70ms` から最大 `125ms` 前後を想定する。
- どれだけ強化しても `150ms` 以下に cap する。
- debug prototype は `debugAcEvasionPassive=1` を候補にする。
- レベルアップ候補へ追加する場合は candidate generation、上限到達、表示テキスト、保存不要のラン内 passive として扱う。

### 将来設計 B: Reactor Cooling GEEKSHOP

BOOST EN regen を伸ばす GEEKSHOP 拡張案。Phase 20 では未実装。

- `BOOST EN regen +2% / Lv` を想定する。
- base regen `24/sec` は変更しない。
- 通常上限は Lv10。
- 深層到達 cap として D10 / D20 / D30 で Lv15 / Lv20 / Lv25 を候補にする。
- 永続保存を伴うため、実装時は shop state schema、古い保存データ補完、価格、UI 表示、README 更新を必須にする。
- debug prototype は `debugAcReactorCoolingShop=1` を候補にする。

### 今後の順序

1. Phase 20 debug prototype で `70ms` の体感を確認する。
2. 必要なら Phase 21 で `Evasive Firmware` を debug passive として検証する。
3. Phase 22 で `Reactor Cooling` を GEEKSHOP 拡張として検討する。
4. acV3 正式採用時に README を更新し、debug query 依存のまま残す項目と通常化する項目を分ける。

## Phase 21: Evasive Firmware Passive Prototype

Phase 21 は Phase 20 の Quick Boost Evade Window を、acV3 専用のラン内パッシブ `Evasive Firmware` で伸ばす debug prototype とする。対象は `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcEvadeWindow=1&debugAcEvasionPassive=1` の通常 Depth のみで、debug off、`debugAcEvasionPassive=1` 単体、v1、acV2、Depth10 Final Raid には混入させない。正式採用前の prototype のため README は更新しない。

### 人間プレイフィードバック

- Phase 20 の base `70ms` は強すぎない一方、体感しにくい。
- Evade Window を基礎値ではなくレベルアップ強化で伸ばすと、回避寄りビルドとして成立しやすい。
- 将来的に AP Reinforce 寄りビルドと、回避寄りビルドを選べる構造にしたい。
- BOOST EN の基礎回復量 `24/sec` は良いため、GEEKSHOP 側の強化は基礎値変更ではなく成長要素として扱う。

### Debug Query

| フラグ | 効果 |
| --- | --- |
| `debugAcEvasionPassive=1` | acV3 + `debugAcEvadeWindow=1` の通常 Depth でのみ `Evasive Firmware` 候補と効果を有効化する。単体では何も変えない。 |
| `debugAcEvasionPassiveStartLevel=0..5` | `Evasive Firmware` のラン内開始 Lv を 0〜5 に clamp して注入する。保存しない。 |
| `debugForceEvasiveFirmware=1` | `Evasive Firmware` が候補に出せる状態なら、QA 用に次の通常レベルアップ候補内で優先表示する。 |

### 新仕様

- 内部 ID は `evasiveFirmware`、表示名は `EVASIVE FIRMWARE`、短縮表示は `EVADE FW` とする。
- `PASSIVE CHIP` として既存の通常レベルアップ候補システムに乗せる。
- Opening Boost 候補には出さない。
- Final Raid 中の候補には出さない。
- 最大 Lv は `5`。
- ラン内 Lv のみで、localStorage / sessionStorage / Firebase には保存しない。
- Lv5 到達後は候補から除外する。
- `debugAcEvadeWindow=1` がない場合、または acV3 ではない場合は候補にも効果にも出さない。

### Evade Window Duration

| Lv | 追加 window | 合計 duration |
| ---: | ---: | ---: |
| 0 | `+0ms` | `70ms` |
| 1 | `+20ms` | `90ms` |
| 2 | `+35ms` | `105ms` |
| 3 | `+50ms` | `120ms` |
| 4 | `+65ms` | `135ms` |
| 5 | `+80ms` | `150ms` |

- base `70ms` は Phase 20 の値を維持する。
- `getAcEvadeWindowBaseDurationMs()`、`getAcEvasiveFirmwareBonusMs()`、`getAcEvadeWindowDurationBreakdown()`、`getAcEvadeWindowDurationMs()` で duration を計算する。
- 最大は `150ms` に clamp する。
- Evade Window の発動タイミングは `BOOST_START_ONLY` のまま変更しない。
- DASH 長押し中に duration を延長しない。
- POST_BOOST_GLIDE、Air Brake、FULL_OVERHEAT 中に新規発動しない。
- EN 不足や lockout でブースト不発の場合は Evade Window も発動しない。
- Target Fire は引き続き visual-only で、damage / projectile body / collider / overlap / hit event を追加しない。

### HUD / Visual

`debugAcMovementHud=1` では Phase 20 の Evade Window 項目に加え、以下を表示する。

- `evasiveFirmware`: ON / OFF
- `evasiveFirmwareLv`: 0〜5
- `evadeBaseMs`
- `evadeBonusMs`
- `evadeDurationMs`
- `evadeRemainingMs`
- `evadeNegatedCount`
- `lastEvadeReason`

Visual は既存の Evade ring / shield / `EVADE` text を再利用する。shield は actual duration に一致し、ring は duration が伸びた場合も短い pulse の範囲で追従する。新規画像・音声は使わない。

### Cleanup

- Evade Window ring、shield、text、Tween は既存の `cleanupAcEvadeWindowFx()` / `cleanupAcMovementVisuals()` 経由で破棄する。
- debug start level はラン状態初期化時に一度だけ注入し、保存しない。
- Gate、Level Up、Shop 復帰、Depth 遷移、gameOver、extraction、restart、scene shutdown、AC movement 無効化、Final Raid 開始時に FX を残さない。

### 受け入れ条件

1. `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcEvadeWindow=1&debugAcEvasionPassive=1` の通常 Depth だけで `Evasive Firmware` が通常レベルアップ候補に出る。
2. `debugAcEvasionPassive=1` 単体、debug off、v1、acV2、Final Raid では候補も効果も出ない。
3. Opening Boost には出ない。
4. Lv0 は `70ms`、Lv1 は `90ms`、Lv5 は `150ms` になる。
5. Lv5 到達後は候補から除外される。
6. Evade Window は成功したブースト開始直後だけ開く。
7. DASH 長押し、POST_BOOST_GLIDE、Air Brake、FULL_OVERHEAT では無敵を延長しない。
8. Evade Window 中に通常 AP ダメージが入った場合だけ、Robot Barrier / shield 消費前に無効化する。
9. Target Fire は visual-only のままで、敵 HP、撃破、ドロップ、ランキングに影響しない。
10. acV3 の boost physics、EN 消費、FULL_OVERHEAT 条件、Air Brake 数値、Phase 14-19 の既存 FX を変更しない。
11. GEEKSHOP、ショップ保存、localStorage、sessionStorage、Firebase、ランキングを変更しない。
12. `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check` が通る。

### 次回人間プレイ確認

1. Lv1〜2 の `90ms` / `105ms` で体感が出るか。
2. Lv5 の `150ms` が強すぎないか。
3. 高 Depth で回避ビルドとして成立するか。
4. AP Reinforce と選択になるか。
5. FULL_OVERHEAT リスクと EN 管理が維持されているか。
6. mobileControls=1 の右 DASH でも Evade Window が自然に見えるか。
7. Final Raid URL で候補・HUD・FX が混入しないか。

### 将来設計: Reactor Cooling GEEKSHOP

Phase 21 では実装しない。BOOST EN 回復力を GEEKSHOP の `BASE CALIBRATION` で伸ばす Phase 22 以降の候補とする。

- 名称候補は `Reactor Cooling`。
- 効果は BOOST EN 回復倍率 `+2% / Lv`。
- 現在の基礎回復量 `24/sec` は変更しない。
- 基本上限は Lv10。
- Depth10 Anchor で Lv15、Depth20 Anchor で Lv20、Depth30 Anchor で Lv25 まで cap 解放する。
- Lv10 で `+20%`、Lv25 で `+50%`。
- 既存装備 BOOSTER 回復倍率と同じ最終回復倍率計算へ合流させる。
- FULL_OVERHEAT 中の低速回復は、Reactor Cooling 適用後の通常回復量に `overheatRegenMultiplier` を掛ける案を第一候補にする。
- 実装時は保存 schema 追加、古い保存データ補完、価格式、ショップ UI、GEEKSHOP 表示、README 更新をまとめて行う。
- debug prototype は `debugAcReactorCoolingShop=1` を候補にする。

## Phase 22: Evasive Firmware Lv10 Rebalance Prototype

Phase 22 は、Phase 21 の `Evasive Firmware` を Lv5 / `150ms` 上限から Lv10 / `1700ms` 上限へ再設計する debug prototype とする。対象は引き続き `?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcEvadeWindow=1&debugAcEvasionPassive=1` の通常 Depth のみで、正式採用前の debug チューニングのため README は更新しない。

### 人間プレイフィードバック

- `500ms` は回避できているか体感しづらい。
- `1000ms` は緊急回避として有効かもしれない。
- `1500ms` は回避特化ビルドであれば納得できる。
- `2000ms` は余裕が大きく、Depth20 程度では不要だが超深層では必要になる可能性がある。
- 今回は Lv5 を `1500ms`、Lv10 を `1700ms` にする。
- AP 系も Lv10 まで伸ばし、攻撃 / 体力 / 回避の選択を作る。
- 体力と回避を両方 Lv10 にすると攻撃スキルを取りづらくなり、ミサイル型ビルドへ寄せる選択も成立する。

### 新仕様

| Lv | Evade Window duration |
| ---: | ---: |
| 0 | `70ms` |
| 1 | `500ms` |
| 2 | `750ms` |
| 3 | `1000ms` |
| 4 | `1250ms` |
| 5 | `1500ms` |
| 6 | `1540ms` |
| 7 | `1580ms` |
| 8 | `1620ms` |
| 9 | `1660ms` |
| 10 | `1700ms` |

- `EVASIVE_FIRMWARE_CONFIG` は合計 duration テーブルを持つ。
- `getAcEvasiveFirmwareDurationMsForLevel(level)` は Lv 別の合計 duration を返す。
- 既存互換の `bonusMs` 表示は `duration - base` として導出する。
- 最大 Lv は `10`、duration clamp は `1700ms`。
- `debugAcEvasionPassiveStartLevel` は `0..10` に clamp し、`10` 指定で Lv10 から確認できる。
- `Evasive Firmware` は Lv10 到達後は候補に出ない。
- カードは `PASSIVE CHIP` のまま、本文で `70ms -> 500ms` のように現在値から次値への変化を出す。
- Evade Window の発動タイミングは `BOOST_START_ONLY` のまま維持する。
- DASH 長押し、POST_BOOST_GLIDE、Air Brake、FULL_OVERHEAT、Final Raid では新規発動しない。
- EN 不足や lockout でブースト不発の場合は Evade Window も発動しない。
- Target Fire は visual-only を維持し、damage / projectile body / collider / overlap / hit event を追加しない。

### Visual / HUD

- 開始 ring は `180ms` 前後で短く消す。
- Evade Window 中は薄い cyan 輪郭を sustain 表示し、window 終了時に自然に消す。
- 長時間 window でも画面を覆いすぎないよう、開始時だけ強く、その後は `evadeWindowSustainAlpha` と pulse で控えめに維持する。
- `debugAcMovementHud=1` では `evasiveFirmwareLv`、`evadeDurationMs`、`evadeNextDurationMs`、`evadeStepMs` を確認する。

### AP 系パッシブ確認

- 共通ラン内パッシブ上限 `LEVEL_UP_PASSIVE_MAX_LEVEL` はすでに `10`。
- `AP Reinforce` / `vitalBloom` は共通上限を使うため、Lv10 まで候補に出る。
- AP 系の内部 ID、効果量、候補生成、保存処理は変更しない。

### Phase 23 候補: Reactor Cooling GEEKSHOP Prototype

Phase 22 では実装しない。GEEKSHOP の `BASE CALIBRATION` に BOOST EN 回復倍率を伸ばす永続強化を追加する案として Phase 23 に送る。

- 名称: `Reactor Cooling`
- 場所: GEEKSHOP / BASE CALIBRATION
- 効果: BOOST EN 回復倍率 `+2% / Lv`
- 基本上限: Lv10
- Depth10 Anchor で Lv15
- Depth20 Anchor で Lv20
- Depth30 Anchor で Lv25
- Lv10 で `+20%`
- Lv25 で `+50%`
- 現在の基礎回復量 `24/sec` は変更しない。
- 既存装備 BOOSTER 回復倍率と同じ最終回復倍率計算に合流させる。
- FULL_OVERHEAT 中の低速回復は、Reactor Cooling 適用後の通常回復量に `overheatRegenMultiplier` を掛ける案を第一候補にする。
- 保存 schema 追加、古い保存データ補完、ショップ UI、価格式、既存 GEEKSHOP 表示更新が必要になるため、Phase 23 で慎重に実装する。
- debug 案: `?debugAcReactorCoolingShop=1`

### 次回人間プレイ確認

1. Lv1 `500ms` がまだ弱すぎないか。
2. Lv3 `1000ms` が緊急回避として有効か。
3. Lv5 `1500ms` が回避特化として納得できるか。
4. Lv10 `1700ms` が強すぎないか。
5. AP Lv10 と選択になっているか。
6. 攻撃スキルを捨てる価値があるか。
7. FULL_OVERHEAT リスクと EN 管理が維持されているか。

## Phase 23: Reactor Cooling GEEKSHOP Prototype

Phase 23 は、BOOST EN 回復力を GEEKSHOP / BASE CALIBRATION の永続強化として伸ばす debug prototype とする。正式採用前のため README は更新せず、`?debugAcReactorCoolingShop=1` がある時だけショップ表示・購入・acV3 回復効果確認を有効化する。

### 人間プレイフィードバック

- `Evasive Firmware` Lv10 / `1700ms` は回避特化ビルドとして良いバランス。
- 次は BOOST EN 回復力を GEEKSHOP 強化で伸ばしたい。
- 現在の基礎 EN 回復量は良いので、`DASH_STAMINA_REGEN_PER_SECOND` / base `24/sec` は変更しない。
- 初期はクイックブーストを慎重に使い、強化が進むほど連続運用しやすくなる導線にする。

### Debug Gate

| Query | 役割 |
| --- | --- |
| `debugAcReactorCoolingShop=1` | Reactor Cooling の GEEKSHOP 表示・購入・acV3 回復効果を有効化する。単体では AC 移動を有効化しない。 |
| `debugAcReactorCoolingLevel=0..25` | `debugAcReactorCoolingShop=1` 時だけ、回復効果と AC debug HUD の Lv を一時上書きする。保存しない。 |

### GEEKSHOP / 保存

- 追加強化は `Reactor Cooling`、内部 ID は `reactorCooling`。
- 表示場所は GEEKSHOP / BASE CALIBRATION。
- 効果は BOOST EN 回復倍率 `+2% / Lv`。
- 価格式は Booster と同じ `baseCost 1000` / `costGrowth 1.48`。
- 基本上限は Lv10、Depth10 Anchor で Lv15、Depth20 Anchor で Lv20、Depth30 Anchor で Lv25。
- 上限解放は既存 BASE CALIBRATION cap helper を再利用し、無料 Lv は付与しない。
- 新規 localStorage key は作らない。
- 既存 `lastmemoVansabaShopState` の中に `reactorCoolingLevel` を追加する。
- 古い保存データや壊れた値は `0..25` に sanitize し、欠損時は Lv0 として扱う。
- Prototype の保存 Lv が残っていても、`debugAcReactorCoolingShop=1` が無い通常プレイではカードも効果も出さない。

### 回復式

基礎 EN 回復値は変更しない。acV3 の通常回復は次の最終倍率へ合流させる。

```text
normalRegenPerSecond =
  DASH_STAMINA_REGEN_PER_SECOND
  * equipmentBoostRegenMultiplier
  * reactorCoolingRegenMultiplier
```

- Lv0 は `x1.00`。
- Lv10 は `x1.20`。
- Lv25 は `x1.50`。
- 装備 BOOSTER の `staminaRegenMultiplier` と乗算で共存する。
- FULL_OVERHEAT 中は `normalRegenPerSecond * overheatRegenMultiplier` を使う。
- FULL_OVERHEAT の「全回復までブースト不可」は変更しない。
- Air Brake 中 / Air Brake 後の回復停止は変更しない。
- v1、acV2、debug off の通常 DASH 回復には Reactor Cooling を適用しない。

### AC Debug HUD

`?debugAcMovement=1&debugAcMovementPreset=acV3&debugAcMovementHud=1&debugAcReactorCoolingShop=1` では以下を表示する。

- `reactorCooling`: ON / OFF
- `reactorCoolingLv`
- `reactorCoolingMaxLv`
- `reactorCoolingMultiplier`
- `baseRegenPerSec`
- `equipmentRegenMultiplier`
- `reactorCoolingRegenMultiplier`
- `totalRegenPerSec`
- `overheatRegenPerSec`
- `regenBlockedReason`
- `BOOST EN current/max`

### 維持する仕様

- `Evasive Firmware` Lv10 / `1700ms` テーブルは変更しない。
- Target Fire は visual-only のまま、damage / projectile body / collider / overlap を追加しない。
- acV3 のブースト距離、速度、EN消費、FULL_OVERHEAT条件、Air Brake 数値は変更しない。
- v1 / acV2 / debug off の移動体感は変更しない。
- Final Raid では AC movement と Reactor Cooling の acV3 効果を除外する。

### 次回人間プレイ確認

1. Lv0 は現在と同じ回復感か。
2. Lv10 `x1.20` で少し連続運用しやすくなるか。
3. Lv25 `x1.50` で爽快感が出るが FULL_OVERHEAT リスクが残るか。
4. 装備 BOOSTER 回復倍率との組み合わせが強すぎないか。
5. Evasive Firmware 回避ビルドとの組み合わせが強すぎないか。
6. AP 特化 / 回避特化 / EN 回復特化 / 攻撃スキル取得の選択が成立するか。
7. mobileControls=1 の右 DASH でも回復テンポが自然か。

## Phase 24: AC Movement Release Candidate Bundle

Phase 24 は、Phase 1-23 の acV3 関連機能を通常 Depth 向けの Release Candidate として束ねる。通常 URL では既存移動を維持し、`?acMovementRc=1` の時だけ acV3 一式を有効化する。README はまだ更新しない。

### Activation

| Query | 役割 |
| --- | --- |
| `acMovementRc=1` | 通常 Depth で acV3 RC bundle を有効化する。 |
| `acMovementRc=0` | RC bundle を明示的に無効化する。 |
| `legacyMovement=1` | 緊急フォールバックとして RC bundle を無効化する。 |
| `debugAcMovement=1&debugAcMovementPreset=acV3` | 既存 debug 経路。Phase 23 までの検証 URL 互換を維持する。 |
| `debugAcMovementHud=1` | AC debug HUD を表示する。RC だけでは HUD を出さない。 |

`acMovementRc=1` は `debugAcMovementPreset=acV3` 相当のチューニングを使うが、acV3 の速度、ブースト距離、EN 消費、FULL_OVERHEAT 条件、Air Brake 数値、Evasive Firmware テーブル、Reactor Cooling 倍率、Target Fire visual-only 方針は変更しない。

### RC Bundle

RC で標準 ON にするもの:

- acV3 movement preset
- target-facing
- EN warning ring
- Lock-on ring
- Boost Vector
- Quick Turn FX
- Ground Skid FX
- Attitude Jet
- Weight Shadow
- Air Brake
- Target Fire visual-only
- Evade Window
- Evasive Firmware passive candidate
- Reactor Cooling GEEKSHOP card and BOOST EN regen effect

### Individual OFF

RC URL 上でも、以下は `=0` で個別に無効化できる。

- `debugAcTargetFire=0`
- `debugAcAirBrake=0`
- `debugAcReactorCoolingShop=0`
- `debugAcEvadeWindow=0`
- `debugAcEnergyWarning=0`
- `debugAcLockonRing=0`
- `debugAcBoostVector=0`
- `debugAcQuickTurnFx=0`
- `debugAcGroundSkid=0`
- `debugAcAttitudeJets=0`
- `debugAcWeightShadow=0`

### Final Raid Exclusion

Depth10 Final Raid では RC を有効化していても、AC movement、AC HUD、target-facing、Air Brake、Target Fire、Evade Window、Reactor Cooling の acV3 効果、各種 AC tactical FX は無効化する。既存 Final Raid の人間プレイヤー演出と専用移動を維持する。

### AC Debug HUD

`?acMovementRc=1&debugAcMovementHud=1` では、従来項目に加えて以下を確認できるようにする。

- `acRc`
- `activationSource`
- bundle states: targetFacing / targetFire / evasion / evasiveFirmware / reactor / airBrake / tacticalFx
- individual override states: targetFire / airBrake / reactorCooling / evadeWindow
- Reactor Cooling Lv / multiplier
- Evasive Firmware Lv / evade duration
- Target Fire active state
- FULL_OVERHEAT state
- total BOOST EN regen per second

### QA Checklist

1. 通常 URL `http://127.0.0.1:4173/?mobileGate=0&mobileControls=0` では既存移動のまま。
2. `?acMovementRc=1` で通常 Depth のプレイヤー移動が acV3 になる。
3. `?acMovementRc=1&debugAcMovementHud=1` で `acRc:ON` と `source:AC_RC` が表示される。
4. `?acMovementRc=1&legacyMovement=1` では AC 移動が有効化されない。
5. `?acMovementRc=1&debugAcTargetFire=0` で Target Fire visual-only が止まる。
6. `?acMovementRc=1&debugAcAirBrake=0` で Air Brake が止まる。
7. `?acMovementRc=1&debugAcReactorCoolingShop=0` で Reactor Cooling card / regen effect が止まる。
8. `?acMovementRc=1&debugAcEvadeWindow=0` で Evade Window と Evasive Firmware 候補が止まる。
9. `?acMovementRc=1&mobileControls=1` で左スティックと右 DASH が RC 移動に対応する。
10. Depth10 通常プレイではロボット表示と RC 移動が併存する。
11. Depth10 Final Raid では既存挙動が維持され、AC RC bundle が出ない。
12. GEEK / ANJU MEMORY / LOST ARMS / DATA CACHE / OVERDRIVE / STABILIZE / Ranking / Firebase の保存キーや確定処理に変更がない。

## Phase 24A: Quick Boost Spatial SE Prototype

Phase 24A は、acV3 RC のクイックブースト成功時だけ `boostse.wav` を鳴らす debug prototype とする。通常URLでは無効で、`?acMovementRc=1&debugAcBoostSe=1` または既存 debug acV3 経路に `debugAcBoostSe=1` を付けた場合だけ有効化する。README はまだ更新しない。

### Debug Gate

| Query | 役割 |
| --- | --- |
| `debugAcBoostSe=1` | acV3 / RC のクイックブースト成功時だけ Boost SE を鳴らす。単体では AC 移動を有効化しない。 |
| `debugAcMovementHud=1` | `boostSeMode`、`boostSePan`、last pan、再生理由を AC debug HUD に表示する。 |

### Pan 仕様

Boost SE の pan は、ターゲット方向やブースト方向ではなく、画面内の player X 位置だけで決める。通常の画面位置連動 pan とし、inverse pan は使わない。

```js
const camera = this.cameras?.main;
const screenX = this.playerHitbox.x - camera.scrollX;
const ratio = Phaser.Math.Clamp(screenX / camera.width, 0, 1);
let pan = ratio * 2 - 1; // -1 left, 0 center, +1 right
pan *= panStrength;
pan = Phaser.Math.Clamp(pan, -panClamp, panClamp);
if (Math.abs(pan) < centerDeadzone) pan = 0;
```

- プレイヤー左側: pan は負、左寄りに鳴る。
- プレイヤー右側: pan は正、右寄りに鳴る。
- プレイヤー中央付近: center deadzone で pan は 0。
- `quickBoostSeInversePan` の初期値は `false`。
- `boostSeMode` は `NORMAL_SCREEN_X` を基本表示にする。
- pan API 非対応環境では `CENTER_FALLBACK` として中央再生する。

### 発火条件

- クイックブースト / continuous boost の開始成功時だけ 1 回鳴らす。
- EN不足、FULL_OVERHEAT、Air Brake、POST_BOOST_GLIDE、Final Raid では鳴らさない。
- DASH 長押し中に毎フレーム鳴らさない。
- cooldown と overlap limit で連続再生を抑制する。
- acV3 の移動、EN消費、FULL_OVERHEAT、Air Brake、Evasive Firmware、Reactor Cooling、Target Fire visual-only の数値は変更しない。

### QA Checklist

1. `?acMovementRc=1&debugAcBoostSe=1&debugAcMovementHud=1` で Boost SE がクイックブースト成功時だけ鳴る。
2. プレイヤーが画面左側で鳴らすと `boostSePan` が負になり、左寄りに聞こえる。
3. プレイヤーが画面右側で鳴らすと `boostSePan` が正になり、右寄りに聞こえる。
4. プレイヤーが中央付近で鳴らすと `boostSePan` が 0 付近になる。
5. `boostSeMode` が `NORMAL_SCREEN_X` になる。pan API 非対応時だけ `CENTER_FALLBACK` になる。
6. EN不足、FULL_OVERHEAT、Air Brake、POST_BOOST_GLIDE、Final Raid では鳴らない。
7. `mobileControls=1` の右 DASH でも成功時だけ鳴る。
8. 保存キー、ショップ、ランキング、Target Fire visual-only に影響しない。

## Phase 25: acV3 Formal Adoption / Default ON

Phase 25 は、Phase 24 の acV3 RC bundle を通常 Depth の正式移動として採用する。通常 URL `http://127.0.0.1:4173/` で `acV3` preset を使い、`?acMovementRc=1` は後方互換 alias として同じ挙動にする。`?legacyMovement=1` と `?acMovementRc=0` は緊急 fallback として旧移動へ戻す。

### Human QA Feedback

- acV3 RC bundle の通常 Depth10、Final Raid 除外、Shop 復帰、Gate 遷移に大きな不具合なし。
- ブラウザのモバイル解像度でも表示崩れなし。
- Air Brake の操作感は良好。
- Target Fire は visual-only として理想形で、ダメージ追加は不要。
- Evasive Firmware Lv10 / `1700ms` は回避特化ビルドとして適正。
- Reactor Cooling は Lv1 / Lv10 / Lv25 の導線が良好。
- Quick Boost SE は通常 pan 仕様まで修正済みだが、音量と左右定位の人間聴感確認が残るため正式ONは見送る。

### Activation Priority

1. Depth10 Final Raid 中: `FINAL_RAID_DISABLED`。AC movement、AC HUD、target-facing、Target Fire、Evade Window、Air Brake、Reactor Cooling の acV3 効果、AC tactical FX を無効化する。
2. `legacyMovement=1` または `acMovementRc=0`: `LEGACY`。旧移動 fallback。
3. `debugAcMovement=1&debugAcMovementPreset=acV2`: `DEBUG_ACV2`。
4. `debugAcMovement=1&debugAcMovementPreset=acV3`: `DEBUG_ACV3`。
5. `debugAcMovement=1` preset 未指定: `DEBUG_V1`。
6. 通常 URL: `DEFAULT_ACV3`。
7. `acMovementRc=1`: `AC_RC_ALIAS`。通常 URL と同じ acV3 正式挙動。

### Default ON Scope

- acV3 movement preset
- target-facing
- EN warning ring
- Lock-on ring
- Boost Vector
- Quick Turn FX
- Ground Skid FX
- Attitude Jet
- Weight Shadow
- Air Brake
- Target Fire visual-only
- Evade Window
- Evasive Firmware passive candidate
- Reactor Cooling GEEKSHOP card and BOOST EN regen effect

### Default ON から外すもの

- Quick Boost SE / `boostse.wav`
- 理由: 音量、左右定位、連続ブースト時の聴感は人間最終確認待ち。
- `debugAcBoostSe=1` の任意確認機能として維持し、`debugAcBoostSe=0` も明示OFFとして維持する。

### Fallback / Individual OFF

- `legacyMovement=1`: 旧移動 fallback。AC movement、Target Fire、Air Brake、Evade Window、Evasive Firmware、Reactor Cooling効果、AC tactical FX、Quick Boost SE をまとめて無効化する。
- `acMovementRc=0`: `legacyMovement=1` と同じ fallback。
- `debugAcTargetFire=0`
- `debugAcAirBrake=0`
- `debugAcReactorCoolingShop=0`
- `debugAcEvadeWindow=0`
- `debugAcEvasionPassive=0`
- `debugAcEnergyWarning=0`
- `debugAcLockonRing=0`
- `debugAcBoostVector=0`
- `debugAcQuickTurnFx=0`
- `debugAcGroundSkid=0`
- `debugAcAttitudeJets=0`
- `debugAcWeightShadow=0`
- `debugAcBoostSe=0`

### README Update

- 通常 Depth の正式移動を `acV3 AC Movement` として記載する。
- DASH は AC Quick Boost / 継続ブースト、BOOST EN 0 で FULL_OVERHEAT、全回復までブースト不可と明記する。
- Air Brake は高速滑走中の逆入力で発動する。
- Target Fire は visual-only で敵HP、damage、projectile、collider、overlap に影響しない。
- Evasive Firmware は通常レベルアップ候補で、Lv10 は `1700ms`。
- Reactor Cooling は GEEKSHOP / BASE CALIBRATION の正式項目で、BOOST EN 回復倍率 `+2% / Lv`、Lv10 `x1.20`、Lv25 `x1.50`。
- Final Raid は AC movement 対象外で、通常 Depth10 / Depth10 Relay はロボット表示を維持する。
- `legacyMovement=1`、`acMovementRc=1`、`acMovementRc=0`、`debugAcMovementHud=1`、`debugAcBoostSe=1`、個別OFF query を記載する。

### Phase 26 Candidates

- Quick Boost SE の正式ON判断。
- Release後QA修正。
- debug query の整理と旧RC表記の縮小。
- 長時間スマホ実機確認。
- Depth20以降の深層バランス確認。
- Reactor Cooling高Lvと装備BOOSTER回復倍率の組み合わせ確認。
- Evasive Firmware Lv10、Air Brake、FULL_OVERHEATの長時間プレイ再確認。

## Phase 25A: Quick Boost SE Three-Zone Stereo Routing

Phase 25A は、Quick Boost SE の定位確認を `debugAcBoostSe=1` の任意確認機能のまま、単一 `boostse.wav` + runtime pan 方式から 3 種類の pre-panned stereo SE 切替方式へ変更する。通常 URL では Quick Boost SE を鳴らさず、Default ON にはしない。

### Audio Files

- `音声/se/boostse_L.wav`: プレイヤーが画面左側で Quick Boost 成功時に再生する。
- `音声/se/boostse_M.wav`: プレイヤーが画面中央付近で Quick Boost 成功時に再生する。
- `音声/se/boostse_R.wav`: プレイヤーが画面右側で Quick Boost 成功時に再生する。
- `音声/se/boostse.wav`: L/M/R のいずれかが未読込の場合の legacy fallback として残す。

### Zone Selection

画面内 X 座標だけを使い、target-facing 方向やブースト方向では判定しない。

```js
const camera = this.cameras?.main;
const screenX = this.playerHitbox.x - camera.scrollX;
const ratio = Phaser.Math.Clamp(screenX / camera.width, 0, 1);
```

- `ratio < 0.38`: `LEFT` / `boostse_L.wav`
- `0.38 <= ratio <= 0.62`: `CENTER` / `boostse_M.wav`
- `ratio > 0.62`: `RIGHT` / `boostse_R.wav`
- L/M/R のいずれかが未読込の場合: `FALLBACK` / `boostse.wav`

### Runtime Pan

- `quickBoostSeMode` は `THREE_ZONE`。
- `quickBoostSeUseRuntimePan` は `false`。
- 再生時の pan は原則 `0` にする。
- pre-panned stereo file にさらに pan を掛けない。
- 既存の `boostSePan` 計算は debug HUD の比較表示用として残す。
- runtime pan 比較は `debugAcBoostSeRuntimePan=1` の明示 debug 時だけに限定する。
- pan API 非対応環境でも、L/M/R ファイル自体のステレオ定位で左右差を出す。

### HUD

`debugAcMovementHud=1` では以下を確認できる。

- `boostSe`: ON / OFF
- `boostSeMode`: `THREE_ZONE` / `LEGACY_FALLBACK`
- `boostSeZone`: `LEFT` / `CENTER` / `RIGHT` / `FALLBACK`
- `boostSeKey`
- `boostSeScreenRatio`
- `boostSeRuntimePan`: 通常 `OFF`
- `boostSeVolume`
- `boostSeLastPlayedMs`
- `boostSeSuppressedReason`
- `loadedL / loadedM / loadedR / legacy`

### 維持する発火条件

- Quick Boost / continuous boost の開始成功時だけ鳴らす。
- `debugAcBoostSe=1` の時だけ鳴らす。
- EN不足、不発、FULL_OVERHEAT、NEED_RELEASE、cooldown中は鳴らさない。
- Air Brake、POST_BOOST_GLIDE、Final Raid では鳴らさない。
- DASH 長押し中に毎フレーム鳴らさない。
- debug SE は `cooldown 80ms` / `overlap limit 3` とし、FULL_OVERHEAT / RECOVERING でない連続 boost 成功時は最大 3 音まで重ねて鳴らせる。
- acV3 のブースト物理、EN消費、FULL_OVERHEAT条件、Air Brake数値、Evasive Firmware、Reactor Cooling、Target Fire visual-only は変更しない。

### 次回人間プレイ確認

1. 左右定位が自然か。
2. 中央ゾーン `0.38`〜`0.62` が狭すぎないか。
3. L/R 切替境界で違和感がないか。
4. 音量 `0.72` が大きすぎないか。
5. 連続ブースト時にうるさすぎないか。
6. スマホ実機で L/M/R の差が出るか。
7. `overlap limit 3` で連続 boost 成功時の重なりが自然か。

## Phase 26: Quick Boost SE Formal Adoption / Default ON

Phase 26 は、Phase 25A の 3-zone stereo Quick Boost SE を通常 Depth の正式仕様として採用する。人間プレイ確認でブースト時SE、音量、左右定位、連続ブースト時の重なりに問題がなかったため、Phase 25 の acV3 正式採用と合わせて Default ON にする。

### Human QA Feedback

- Quick Boost SE の音声は人間テスト合格。
- `boostse_L.wav` / `boostse_M.wav` / `boostse_R.wav` の左右定位を正式仕様にする。
- 連続ブースト時のSE挙動、音量、左右定位に問題なし。

### Formal Spec

- 通常 Depth の acV3 では `debugAcBoostSe=1` がなくても Quick Boost SE を鳴らす。
- `debugAcBoostSe=0` が明示された場合だけ Quick Boost SE をOFFにする。
- `debugAcBoostSe=1` は後方互換の明示ONとして残す。
- `legacyMovement=1` / `acMovementRc=0` / v1 / acV2 / Final Raid では鳴らさない。
- Quick Boost / continuous boost の開始成功時だけ鳴らす。
- EN不足、不発、FULL_OVERHEAT、RECOVERING、NEED_RELEASE、Air Brake、POST_BOOST_GLIDE では鳴らさない。
- cooldown は `80ms`、overlap limit は `3`。
- Scene shutdown / restart / gameOver / extraction / shop復帰 / levelUp / Gate / Depth遷移では active SE を cleanup する。

### Three-Zone Stereo Routing

- `ratio < 0.38`: `LEFT` / `音声/se/boostse_L.wav`
- `0.38 <= ratio <= 0.62`: `CENTER` / `音声/se/boostse_M.wav`
- `ratio > 0.62`: `RIGHT` / `音声/se/boostse_R.wav`
- L/M/R のいずれかが未読込の場合のみ `音声/se/boostse.wav` へ fallback する。
- runtime pan は原則OFF。pre-panned stereo file に追加 pan を掛けない。
- 判定は player の画面内 X 座標だけを使い、target-facing方向やブースト方向では決めない。

### AC Debug HUD

`debugAcMovementHud=1` では以下を確認できる。

- `boostSe`: ON / OFF
- `boostSeDefault`: ON / OFF
- `boostSeOverride`: NONE / FORCE_ON / FORCE_OFF
- `boostSeActivationSource`
- `boostSeZone`: LEFT / CENTER / RIGHT / FALLBACK
- `boostSeKey`
- `boostSeScreenRatio`
- `boostSeRuntimePan`: 通常 OFF
- `boostSeCooldownMs`
- `boostSeOverlapLimit`
- `boostSeActiveVoices`
- `boostSeSuppressedReason`
- `boostSeLastPlayedMs`

### Phase 27 Candidates

- Release後QA。
- 音量微調整が必要なら `quickBoostSeVolume`。
- 連続ブースト時の重なりが気になる場合は `quickBoostSeOverlapLimit` / `quickBoostSeCooldownMs` を再調整。
- 長時間スマホ実機確認。
- Final Raid、legacy fallback、acV2/v1比較URLの回帰確認。
