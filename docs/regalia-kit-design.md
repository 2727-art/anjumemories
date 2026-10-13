# REGALIA BASTION 専用スキル再設計（Aegis Wall／Counter Pulse）設計案

2026-10-11 作成、2026-10-12 更新（テリトリー型の盾）。**製品コードは未変更です。** 14章の #1〜#11 はすべて推奨どおり承認済みです。数値はすべて仮値で、実装段階の試走で調整します。

## 0. 記録の区分

- 【ユーザー決定】ユーザーが会話で決めた事項。
- 【現行コードで確認】`game.js`／`skillDefinitions.js` などで実際に確認した事実。行番号は 2026-10-11 時点の目安です。
- 【提案・未承認】この文書での提案。承認されるまで実装しません。
- 【未確認】まだ確かめていない事項。

## 1. 目的と決定事項

【ユーザー決定】

- REGALIA BASTION（ALM-01）の `tornadoSkill`／`rabbitThunderSkill` は初期機体と共通なので、両方を REGALIA 専用スキルに置き換える。
- 1つ目は「機体の周辺に盾を召喚し、盾が地面に突き刺さって敵の進行を防ぐ」スキル。防御型の機体性格に合わせる。
- 2つ目（3枠目）は反撃パルス。
- パッシブ Reactor Overcharge／Fire Control Link を、REGALIA の新スキルに効かせる。
- Final Raid：REGALIA は Final Raid クリア後に購入可能なので、初回 Final Raid での扱いは考えなくてよい。
- 盾と地面のエフェクト、反撃パルス、スキルアイコンは、可能であれば Blender で作成する。
- パッシブの暫定絞り込み（REGALIA に雷撃系パッシブを出さない）は先行してコミットし、PR #23 とした。
- 2026-10-12：R1 の画風を承認。盾の設置範囲を広くし、盾の内側を REGALIA の「テリトリー」とする（4章）。14章の残り項目も推奨どおり承認。

## 2. 現行コードで確認した前提

【現行コードで確認】

**機体・スキル枠**

- REGALIA の枠は `PLAYER_MECH_SKILL_SLOT_IDS`（game.js:343）で `[regaliaBastionCannon, tornadoSkill, rabbitThunderSkill]`。Mutation 対象と RUN ARCHIVE の対象一覧は、この枠から自動で作られる（game.js:349-357）。
- 購入条件は `unlockRequirement: "finalBossRaidClear"`、確定 GEEK 10,000,000（game.js:268-312）。
- Final Raid に入るのは「未討伐、または debug 指定」の場合だけ（`shouldEnterFinalBossRaid`）。このため通常プレイの REGALIA は Final Raid に入らない。例外は debug 指定だけ（`?debugPlayerMech` と `?debugFinalRaid` の併用）。

**キャノンの作り（新スキルの見本）**

- キャノンは汎用の Mutation／TRIAD 補正（威力倍率・再発動倍率）だけに対応している。命中時の専用 Mutation 効果は持たない。
- 装備 SENSOR／ARMAMENT／OVERLIMIT の対象外（`EQUIPMENT_COMBAT_LINK_SKILL_IDS = [basicSkill, tornadoSkill, rabbitThunderSkill]`、game.js:2378）。
- 今の REGALIA で OVERLIMIT の対象になるのは Tornado／Rabbit だけ。この2つを外すと、何もしなければ対象が 0 になる。
- 新スキルを動かすには、少なくとも次の登録が必要。
  - 動作の許可リスト `isSkillRuntimeBehaviorImplemented`（game.js:48620）
  - スキル状態の初期値 `createSkillState`
  - 毎フレームの分岐 `updateSkills`
  - カード用メタ `LEVEL_UP_SKILL_UI_META`
  - 数値表示 `getSkillStatDisplaySpecs`
  - 簡易 HUD の名前表（game.js:55526、55723、55730）
  - RUN ARCHIVE のキー一覧 `getRunArchiveSkillLevels`

**敵と当たり判定**

- 敵は毎フレーム、プレイヤーへ向けて速度を上書きする（`updateEnemies`）。
  - 迂回するのはオープンワールドの建物だけで、建物の判定は物理ボディではなく区画データで行う。
  - 敵どうしの衝突判定はない。
- 敵はステージ障害物（static group）とは衝突する（game.js:64216）。押し付けられて止まり、壁沿いに滑る。
- 遠距離敵とボスの攻撃は弾ではなく、ビーム（線分判定）や範囲判定で即時に当たる。障害物は考慮しない。弾グループ `enemyProjectiles` は現状どこからも生成されていない。
- ノックバックは `applyEnemyImpact`（game.js:80910）を使う。`hitRecoverUntil` を設定するので、AI が上書きせずに押し返しが効く。
- `triggerOverdriveModGuardPulse` の押し返しは翌フレームで上書きされ、実質効いていない。こちらは見本にしない。
- プレイヤーが受けるダメージはすべて `applyDamageToPlayer`（game.js:82177）を通る。被弾が成立すると 900ms の無敵が付く。
- 敵の基礎 HP（例：chaser 2.7、tank 7.1）は、Depth・wave・耐久補正で増える。与ダメージは `stats.damageMultiplier`（REGALIA は機体補正 1.2 倍）で拡大される。

**保存・素材**

- MUTATION ATLAS は Core／Final 分類の組み合わせ（buildId）だけで記録していて、スキル ID を持たない。ランキングと Firebase の送信値にもスキル ID はない。
- RUN ARCHIVE は、表示時に「今の」スキル枠を使う（`getRunArchiveSkillSlotIds`）。
- 戦闘用画像は、出撃時に全スキル分をまとめて読み込む（`preloadSkillAssets`）。HUD のスキルアイコンは Graphics で生成している。
- Blender 5.2.2 LTS が `C:\Program Files\Blender Foundation\Blender 5.2` にあり、ヘッドレス実行で EEVEE の描画と透過 PNG の書き出しができることを確認した（試験描画で約2秒）。

## 3. スキル構成

【提案・未承認】名前はすべて案です。

| 枠 | ID（案） | 表示名（案） | 和名（案） | 役割 |
|---|---|---|---|---|
| 1（初期） | `regaliaBastionCannon` | Regalia Bastion Cannon | 王装閃砲 | 既存。遠くの敵へ重い一撃（変更なし） |
| 2 | `regaliaAegisWall` | Aegis Wall | 王盾陣 | 盾を地面に突き立てて機体を広く囲み、内側を REGALIA のテリトリーにする |
| 3 | `regaliaCounterPulse` | Counter Pulse | 反撃衝波 | 一定間隔の衝撃波。攻撃を受けると即座に強い反撃波 |

- 噛み合わせの狙いは「盾で止める → 敵が固まる → キャノンの爆発と反撃波で一掃する」。
- どちらのスキルも単独で役に立ち、両方そろうと強くなる形にする。
- 簡易 HUD の名前は 7 文字以内にする（`AEGIS`／`PULSE`、短縮 `AGS`／`PLS`）。

## 4. Aegis Wall（盾）

### 4.1 基本動作 【提案・未承認】

- 他のスキルと同じく自動で発動する。再設置間隔ごとに、プレイヤーの周囲に盾を召喚する。
- 盾は上から落ちて地面に突き刺さる（設置衝撃）。
  - 刺さった瞬間に、盾の周囲の敵へダメージを与える。
  - 敵をプレイヤーから遠ざける方向へ押し返す（`applyEnemyImpact`）。
- 盾は設置した場所に残る（プレイヤーには付いてこない）。
- 新しく設置すると、前の組は沈んで消える。同時に存在するのは1組だけ。
- **テリトリー型の配置**【ユーザー決定（2026-10-12）＋数値は提案】：
  - 盾は全 Stage で、プレイヤーを中心とした半径 R の円周に等間隔で並べる。1枚目は照準方向（target-facing の向き。なければ最寄りの敵、移動方向、前回の向きの順）に置く。
  - 円の内側が REGALIA のテリトリー。盾は外からの侵入を止める。設置した時点で内側にいる敵はそのまま残るので、反撃波とキャノンで片付ける形になる。
  - 設置衝撃は、盾の近くの敵を円の外側へ押し出す。
  - Stage が上がるほど、テリトリーは広くなり（半径 200 → 300）、盾も増える（4 → 10 枚）。
  - 半径の上限：通常ステージのカメラ倍率（`WORLD_CAMERA_ZOOM`、約 0.83。全ステージ共通）では、半径 300 で縦画面のほぼ端になり、上側の盾が上部 HUD に少しかかる。これより広げると上下の盾が画面外に出るため、S8 の 300 を上限にする。
  - 境界を読み取りやすくするため、盾どうしを結ぶ薄い光の円を地面に描く案がある（Graphics で描く。当たり判定なし。14章 #11）。
- プレイヤーは自分の盾を通り抜けられる。重い REGALIA が自分の盾に閉じ込められず、テリトリーの外にも出られるようにするため。

### 4.2 当たり判定 【提案・未承認】

- 盾専用の static group（仮称 `regaliaAegisBodies`）を作り、`physics.add.collider(this.enemies, group, …)` で敵とだけ衝突させる。
- 既存の `stageObstacleBodies` には入れない。入れるとプレイヤーまで止まり、UMBRA の視線判定やブースト判定にも影響するため。
- Arcade の静的ボディは回転できない。そのため盾1枚は、接線方向に並べた円形ボディ3個（半径 16、幅 約84px）で表す。S8（10枚）でも合計 30 個。
- static group は Arcade の木構造で探索されるので、敵 n 体に対して n・log(盾) 程度の負荷で済む。毎フレーム「盾 × 敵」の総当たりはしない。

### 4.3 耐久と破損 【提案・未承認】

- 盾1枚の耐久は「最大AP × 耐久率」。REGALIA の高い AP と AP Reinforce が、盾の強さにもつながる。
- 削れ方：押し付けている敵1体ごとに「その敵の接触ダメージ × 0.4」を毎秒削る（衝突コールバックで集計）。
- 持続時間が切れるか耐久が 0 になると、盾は砕けて消える。
- ボス（`isBoss`：wave ボス、NEMESIS、VOID HUNTER を含む）は盾を止めずに貫通し、触れた盾は即座に砕ける。ボスを盾で封じ込めて楽をする遊び方を防ぐため。
- 遠距離敵のビームやボスの範囲攻撃は、盾で防がない。射撃の脅威を残し、「囲めば無傷」になるのを防ぐため。
- 盾で射撃も防ぐ案は、ビームの線分判定に盾との交差判定を足せば可能。後の Mutation 候補として残す。
- GRAVITY SEED は敵の座標を直接動かすため、盾を越えて引き寄せることがある。これは許容する。

### 4.4 Stage 表（仮値）

盾は全 Stage で全周に等間隔に並べます。半径はテリトリーの半径（ワールド px）です。

| S | 盾の数 | テリトリー半径 | 設置衝撃 | 衝撃半径 | 耐久率 | 持続 | 再設置 | 新効果 |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 200 | 8 | 44 | 30% | 5.0秒 | 7.0秒 | |
| 2 | 4 | 210 | 10 | 46 | 35% | 5.2秒 | 6.8秒 | |
| 3 | 5 | 220 | 12 | 48 | 40% | 5.4秒 | 6.6秒 | |
| 4 | 5 | 235 | 15 | 50 | 45% | 5.6秒 | 6.4秒 | （Core 選択） |
| 5 | 6 | 250 | 18 | 52 | 50% | 5.8秒 | 6.2秒 | |
| 6 | 7 | 265 | 22 | 56 | 60% | 6.0秒 | 6.0秒 | 棘盾：押している敵に 0.5秒ごと 3 |
| 7 | 8 | 280 | 26 | 60 | 70% | 6.2秒 | 5.8秒 | 棘 4 |
| 8 | 10 | 300 | 32 | 66 | 80% | 6.5秒 | 5.5秒 | 棘 6（Final 選択） |

- 盾どうしの隙間は、S1 で約 230px、S8 で約 100px。盾が円周をふさぐ割合は 27% → 45% です。
- 小さい敵は隙間を抜けるので、完全な囲いにはならない。Stage が上がると、大きい敵（tank の直径 約 104px）は隙間をほぼ通れなくなる。
- 盾が増える分、設置衝撃で巻き込める敵も増える。総合的な強さは R2 の試走で調整する。

### 4.5 強すぎ・単調の防止（まとめ）

隙間、耐久、持続時間、ボスによる貫通、射撃は防がない、同時1組だけ。この6つで「盾の中で放置して無傷」を防ぎます。

## 5. Counter Pulse（反撃パルス）

### 5.1 基本動作 【提案・未承認】

- **自動の衝撃波**：自動間隔ごとに、プレイヤー中心の円内にいる全敵へダメージと押し返しを与える。被弾しなくても役に立つようにするため。
- **反撃**：`applyDamageToPlayer` で被弾が成立した瞬間（無敵付与の直後）に、反撃倍率付きの衝撃波を即座に出し、自動間隔のタイマーを最初からやり直す。
  - ロボットバリアで全部吸収された被弾も「攻撃を受けた」として数える。
  - 被弾後の無敵 900ms があるので、連続発動は自然に制限される。
- **回避**：AC 回避（瞬間回避）で無効化した攻撃を反撃の引き金にするかは、MVP では入れない（14章で決定）。
- **対象**：生存中で、`isFinalBossRaidEnemyTargetable` を満たす敵。衝撃波ごとに O(n) で、毎フレームの総当たりはしない。

### 5.2 Stage 表（仮値）

| S | 自動間隔 | 半径 | 威力 | 反撃倍率 | 押し返し | 新効果 |
|---|---|---|---|---|---|---|
| 1 | 3.2秒 | 120 | 4 | ×1.5 | 160 | |
| 2 | 3.0秒 | 128 | 5 | ×1.5 | 170 | |
| 3 | 2.8秒 | 136 | 7 | ×1.6 | 180 | |
| 4 | 2.6秒 | 146 | 9 | ×1.6 | 190 | （Core 選択） |
| 5 | 2.4秒 | 156 | 11 | ×1.7 | 200 | 盾連動：Aegis Wall の盾が砕けた場所からも反撃波（半径 ×0.7） |
| 6 | 2.2秒 | 168 | 14 | ×1.8 | 220 | |
| 7 | 2.0秒 | 182 | 17 | ×1.9 | 240 | |
| 8 | 1.8秒 | 200 | 22 | ×2.0 | 280 | 二重波：反撃波の 150ms 後に威力 50% でもう1回（Final 選択） |

参考【現行コードで確認】：

- キャノン S1 は 14 を 1.9 秒ごと（最大1体＋爆発範囲）。
- Tornado S1 は接触中の敵へ 1 を 0.32 秒ごと。

反撃波 S1 は 1 体あたりの毎秒威力こそ低いものの、範囲内の全敵に当たります。

## 6. パッシブ（Reactor Overcharge／Fire Control Link）

### 6.1 効き方 【ユーザー決定】＋【提案・未承認】

UMBRA の専用武器と同じ式を使います。

- **Reactor Overcharge**：Aegis Wall と Counter Pulse のすべてのダメージ（設置衝撃・棘・反撃波）の基礎値に `max(0, bulletDamage − 1)` を足す。
- **Fire Control Link**：`比率 = clamp((fireInterval − 160) ÷ (540 − 160), 0, 1)` を使い、次の2つを「下限 + (基本 − 下限) × 比率」に短縮する。
  - Aegis Wall の再設置間隔（下限＝基本の 60%）
  - Counter Pulse の自動間隔（下限＝基本の 55%）
  - 反撃（被弾時の即時発動）には影響しない。
- **キャノン**には今回も効かせない（ユーザー決定は「新スキル」）。キャノンにも効かせるかは 14章の確認事項にする。
- Fire Control Link の LOST ARMS 再発動短縮は、全機体で従来どおり残す。

### 6.2 候補に出す条件 【提案・未承認】

AGENTS.md の「選んでも効果が出ない候補は表示しない」を守り、PR #23 の暫定判定を次のように置き換えます。

- REGALIA は、Aegis Wall か Counter Pulse を所持していて、強化で数値が実際に変わるときに Reactor／Fire Control を出す。
  - 枠にあるかではなく、所持で判定する。初期スキルはキャノンなので、未取得のうちに選ぶと効果が出ないため。
- Fire Control は、これまでどおり LOST ARMS を持っているときにも出す。
- XP 上限の判定（`isXpProgressionCapped`）は、上の条件に自動で従う。

### 6.3 カード表示

PR #22 の「今 → 次」の形式に合わせ、効くスキルごとに1行ずつ出します。

```
Aegis Wall の設置衝撃 8 → 9
Counter Pulse の威力 4 → 5
```

## 7. Mutation／TRIAD

### 7.1 MVP の範囲 【提案・未承認】

キャノンと同じく、汎用補正だけに対応します。

- 威力倍率（`getMutatedSkillDamage`）を、設置衝撃・棘・反撃波に掛ける。
- 再発動倍率（`getSkillMutationCooldownMultiplier`、source は `skillCooldown`）を、再設置間隔と自動間隔に掛ける。
- TRIAD MATRIX の集計対象には、枠から自動で入る。MUTATION ATLAS の buildId はスキル ID を持たないので、16 セルの意味はそのまま。
- 盾の減速オーラや反撃波の吸引といった命中時の専用効果は、後続の候補にする。キャノンも現状は持っていない。

### 7.2 名前案 【提案・未承認】

| | Aegis Wall | Counter Pulse |
|---|---|---|
| Stage4 見出し | AEGIS MUTATION CORE | PULSE MUTATION CORE |
| Stage8 見出し | AEGIS FINAL MUTATION | PULSE FINAL MUTATION |
| assault Core | SPIKE WALL CORE | RETRIBUTION CORE |
| control Core | HOLD LINE CORE | REPULSE CORE |
| reactor Core | RAPID RAMPART CORE | CAPACITOR CORE |
| assault_execution | KINGSLAYER RAMPART | JUDGMENT WAVE |
| assault_prism | SHARD BULWARK | SPLINTER NOVA |
| assault_singularity | CITADEL QUAKE | WRATH EPICENTER |
| control_execution | IRON VERDICT | SENTENCE PULSE |
| control_prism | MIRROR PHALANX | ECHO REPULSE |
| control_singularity | GRAVITY BASTION | STILL DOMAIN |
| reactor_execution | LANCE WALL | OVERLOAD RETORT |
| reactor_prism | RELAY AEGIS | RELAY SURGE |
| reactor_singularity | ROYAL DOMINION | CROWN DYNAMO |

### 7.3 補正を掛ける順番 【提案・未承認】

キャノンと同じ順に揃えます。

- **威力**：Stage 値 + Reactor → Mutation／TRIAD → 装備（OVERLIMIT、ARMAMENT）→ `applyDamageToEnemy`（`scalePlayerDamage`、会心など）
- **間隔**：Stage 値 → Fire Control の比率 → Mutation の再発動倍率 → 装備 SENSOR → 下限で切る

## 8. 装備（SENSOR／ARMAMENT／OVERLIMIT）

【提案・未承認】

- Combat Link の対象を機体別にする。
  - 初期機体：従来どおり `[basicSkill, tornadoSkill, rabbitThunderSkill]`。
  - REGALIA：`[regaliaAegisWall, regaliaCounterPulse]`。
- `getEquipmentCombatLinkTargetSkillIds`（game.js:69188）には UMBRA 用の分岐がすでにあるので、同じ形で REGALIA を足す。
- キャノンは今と同じく対象外。REGALIA の OVERLIMIT 対象は、今と同じ2スキルのまま。
- SENSOR は再設置間隔と自動間隔に、ARMAMENT はダメージに掛ける。

## 9. 保存・互換

【現行コードで確認】＋【提案・未承認】

- **RUN ARCHIVE**：
  - `getRunArchiveSkillLevels` は明示的なキー一覧なので、新 ID を追加する。
  - 古い REGALIA の記録は、今の枠で表示すると Tornado／Rabbit の Lv が隠れる。今後の記録には `skillSlotIds` を保存し、それがない古い記録は旧枠（Cannon／Tornado／Rabbit）で表示する。
  - 旧版タブが記録を書き戻すと、新しいキーが削られる。これを防ぐため `RUN_ARCHIVE_VERSION` を 3 に上げることを推奨する。旧版は新形式を「未対応」として扱い、上書きしない。
  - Google 保存の指紋は、このとき一度だけ変わる。
- **MUTATION ATLAS**：変更不要。既存の REGALIA セルは旧スキル構成での記録として残る。
- **ランキング・Firebase・firestore.rules**：スキル ID を送っていないので変更不要。
- **新しい保存キー**：追加しない。

## 10. UI／HUD

【提案・未承認】

- **カード用メタ**：`LEVEL_UP_SKILL_UI_META` に2件追加する（iconTone `SHIELD`／`PULSE`、色はキャノンと同系の金・シアン）。
- **数値表示**：`getSkillStatDisplaySpecs` に新しい数値の表示名を足す。
  - 盾の数、盾の耐久（「最大APの30%」）、持続、再設置、設置衝撃
  - 自動間隔、反撃倍率、反撃範囲
- **新効果の表示**：`detectNewEffects` に新効果の名前を足す（「棘盾」「盾破損時に反撃波」「二重波」）。既存の自動ラベル（例「着地雷衝撃」）が誤って出ないようにする。
- **短縮名**：簡易 HUD・詳細診断・RUN ARCHIVE の短縮名に `AGS`／`PLS` を追加する。
- **HUD アイコン**：Blender 製のアイコンを `hudIconTextureKey` に使う。画像がない場合のために、Graphics で生成するアイコンも用意する。

## 11. グラフィック（Blender）

### 11.1 画風の注意 【R1 で画風を承認（2026-10-12）】

- 既存の REGALIA 本体とキャノンの爆発は、手描き風の厚塗りで、細部が非常に細かい絵です。
  - 白い装甲、金の縁取り、紺のパネル、十字の紋章。
  - エネルギーは青紫〜シアンで、金の破片が飛ぶ。
- Blender の描画は、そのままでは「3D CG らしい」見た目になり、並べると浮く恐れがあります。
- そのため最初に、次の4点だけを作って画風を確認します（R1）。全部を作るのはその承認後です。
  - 盾1枚
  - 地面のひび1枚
  - 反撃波1コマ
  - アイコン2つ
- 画風を寄せる方法の候補：
  - 面取りした装甲の硬い面
  - 金属の金と白の陶器調の質感
  - 紺の発光パネル
  - Glare（にじみ）合成
  - 必要なら輪郭線（Freestyle）
- 視点は本体の画像に合わせて、正面やや上からの正投影にします。

### 11.2 素材一覧（案）

| 用途 | 内容 | コマ数 | 書き出しサイズ |
|---|---|---|---|
| 盾 | 落下 → 刺さる → 静止 | 4＋1 | 256×320 |
| 盾の破損 | 砕けて飛び散る | 5 | 320×320 |
| 地面の効果 | ひび＋土煙の輪が広がる（真上から） | 6 | 256×256 |
| 反撃波 | 地面に沿って広がる衝撃の輪（真上から、加算で重ねる） | 8 | 512×512 |
| アイコン | Aegis Wall／Counter Pulse | 各1 | 256×256 |

- 書き出しサイズはすべて 2 倍の解像度（1 m = 80 px）。ゲームでは 0.5 倍で表示する（ゲームは 1 m = 40 px）。
- R1 で決めたこと：
  - 地面のひびと反撃波は、当たり判定の円と形を合わせるため真上から描く（地面の小物と同じ）。当初案の斜め（512×256）はやめた。
  - 反撃波は黒地に発光だけで描き、明るさからアルファを作る。
  - 盾は機体の画像と同じく、20° 見下ろしの正面から描く。

- **置き場所**：`画像/skills/regalia_aegis_wall/` と `画像/skills/regalia_counter_pulse/`
- **再現性**：Blender の生成スクリプトを `tools/blender/regalia_kit/` に置き、`blender -b -P …` で誰でも同じ画像を作れるようにする。
- **記録**：サイズ、基準点、SHA-256 を `docs/regalia-assets.md` に残す（`docs/umbra-phase1-assets.md` と同じ形式）。
- **容量**：書き出し後に減色・圧縮して小さくする。

### 11.3 読み込みと代替表示

- AGENTS.md に従い、画像は必須にしない。
  - 画像がなくても、盾（Graphics の多角形）、ひび（線）、反撃波（輪）で動く。
  - キャノンの `spawnRegaliaBastionCannonFallbackImpact` と同じ作り。
- 今は出撃時に全スキルの画像を読み込むので、REGALIA 以外のプレイヤーも新しい画像を読み込んでしまう。新素材は REGALIA で出撃したときだけ読み込むように分けることを推奨する。
- 既存の画像パスは変えないので、`STATIC_ASSET_VERSION` の更新は不要。`index.html` のスクリプト版番号は、コード変更のたびに上げる。
- 効果音は新規に作らない。設置音・反撃音は既存の REGALIA の効果音（停止時の重い音、キャノン）を流用するか、無音にする。

## 12. 段階的な進め方

【提案・未承認】UMBRA と同じく、段階ごとに確認・承認しながら進めます。

| 段階 | 内容 | 通常プレイへの影響 |
|---|---|---|
| R1 | Blender で画風試作（盾・ひび・反撃波1コマ・アイコン2つ）→ 画風の承認。2026-10-11 に試作を作成し、2026-10-12 に承認（`tools/blender/regalia_kit/`） | なし |
| R2 | Aegis Wall の実装（S1〜S8、Graphics 代替、テスト）。`?debugRegaliaKit=1` のときだけ REGALIA の枠を新構成にする。2026-10-12 に実装（下記） | なし |
| R3 | Counter Pulse の実装（S1〜S8、盾連動、テスト）。2026-10-13 に実装（下記） | なし |
| R4 | 統合：パッシブ、Mutation／TRIAD、装備、RUN ARCHIVE 互換、HUD、README／AGENTS.md の更新 → 通常プレイの REGALIA を新構成に切り替え | あり |
| R5 | 素材の本番一式、実機での人間確認、数値調整 | あり |

AGENTS.md §3.1 は既存スキル ID の維持を求めています。今回は ID を変えず、REGALIA の枠だけを変えます。R4 では AGENTS.md の該当説明（REGALIA の枠）も更新します。

### 12.1 R2 の実装内容（2026-10-12）

- **debug 指定**：`?debugRegaliaKit=1` のときだけ、REGALIA の枠を `[regaliaBastionCannon, regaliaAegisWall, rabbitThunderSkill]` にする（`getPlayerSkillSlotIds`）。`PLAYER_MECH_SKILL_SLOT_IDS` の定数、Mutation 対象、RUN ARCHIVE、装備の一覧は変えていない。
- **Aegis Wall**：4章のとおり実装した。
  - 盾 1 枚は円形の静的ボディ 3 個（専用の static group）。
  - 敵とだけ衝突させ、押している敵の接触ダメージ × 0.4／秒で耐久が減る。
  - ボスは貫通して盾を割る。S6 からは棘。
  - 設置衝撃は着地時（0.17 秒後）に、テリトリーの外向きに押し返す。
  - 持続が切れると沈んで消え、新しい設置で前の組を置き換える。
  - レベルアップ、Gate 選択、帰還、Final Raid の間は止まる。
- **後片付け**：Depth 移行、ゲームオーバー、通常／緊急の帰還、ショップ復帰、Final Raid 開始、スキルの作り直し、Scene の終了で、盾・当たり判定・演出をすべて消す。
- **見た目**：
  - R1 の盾とひびの画像（`画像/skills/regalia_aegis_wall/shield_r1.png`・`crack_r1.png`）を使う。
  - 読み込むのは、Aegis Wall を使える出撃のときだけ（#8）。
  - 画像がないときは Graphics で描く。
  - テリトリーの境界に薄い光の円（#11）。
  - HUD アイコンは Graphics で生成した盾（Blender 製のアイコンは R4 で読み込みと一緒に入れる）。
- **カード**：
  - 取得時のチップは「威力・盾の数・テリトリー・盾の耐久（最大AP比）」。
  - 強化時の本文は、変わる数値の上位 2 つ。
  - S6 の新効果は「棘盾」。
- **テスト**：
  - `tests/regalia-aegis-wall.test.cjs`（10 件）
  - `tests/regalia-aegis-browser.cjs`（実ブラウザ。通常の REGALIA で枠と読み込みが変わらないことも確認する）

### 12.2 R3 の実装内容（2026-10-13）

- **debug 指定**：`?debugRegaliaKit=1` のときの REGALIA の枠を `[regaliaBastionCannon, regaliaAegisWall, regaliaCounterPulse]` にした。debug 指定なしでは何も変わらない。
- **Counter Pulse**：5章のとおり実装した。
  - 自動の衝撃波は、自動間隔ごとに機体を中心に出す。
  - 反撃は `applyDamageToPlayer` で被弾が成立した直後（無敵 900ms を付けた直後。ロボットバリアで全部吸収された被弾も含む）に出し、自動のタイマーを最初からやり直す。反撃どうしの間は最短 0.3 秒。
  - 押し返しは機体（または盾）から外向き。
  - S5 からは、Aegis Wall の盾が砕けたとき（削れ切ったとき、ボスに割られたとき）に、その場所から半径 0.7 倍の衝撃波を出す。持続切れで沈むときは出さない。
  - S8 の二重波は、機体を中心にした衝撃波（自動・反撃）だけに付き、0.15 秒後にその波の威力 50%・押し返し 60% で出る。盾が砕けたときの波と二重波自身には付かない。
  - レベルアップ、Gate 選択、帰還、Final Raid の間は出さない。
- **後片付け**：Aegis Wall と同じ場面（Depth 移行、ゲームオーバー、帰還、ショップ復帰、Final Raid 開始、スキルの作り直し）で、予約中の二重波と演出を消す（`clearRegaliaKitEffects`）。
- **見た目**：
  - R1 の反撃波の画像（`画像/skills/regalia_counter_pulse/pulse_r1.png`）を加算で重ね、0.35 倍から広げて消す。
  - 読み込むのは Counter Pulse を使える出撃のときだけ。画像がないときは Graphics の輪。
  - HUD アイコンは Graphics で生成した紋章と輪。
- **カード**：
  - 取得時のチップは「威力・範囲・自動間隔・反撃倍率」。
  - S5 の新効果は「盾連動」、S8 は「二重波」。
- **テスト**：
  - `tests/regalia-counter-pulse.test.cjs`（8 件）。Aegis Wall のテストと共通の土台は `tests/regalia-kit-fixture.cjs`。
  - 実ブラウザの `tests/regalia-aegis-browser.cjs` に、被弾から反撃が出るまでの確認を加えた。

## 13. テストと検証

【提案・未承認】

- **単体テスト**（`node --test`、既存の vm 方式）：
  - Stage 表
  - パッシブの式とカード文言
  - 候補条件と XP 上限
  - 装備の対象一覧
  - RUN ARCHIVE の旧枠表示
  - 盾の耐久計算
  - ボスの貫通
- **影響を受ける既存テスト**（意図して更新する）：
  - `umbra-registry`（枠・Mutation 対象数 7 → 9・装備一覧）
  - `umbra-phase2b-candidates`（枠）
  - `umbra-core-stats`（REGALIA の Mutation 対象）
  - `umbra-equipment-legacy`（REGALIA の OVERLIMIT 対象）
  - `umbra-normal-browser`（簡易 HUD の `TND --`／`RBT --`）
  - `umbra-final-preservation`（定数の比較）
- **ブラウザ確認**（ローカル HTTP）：
  - 盾で敵が止まること、自機は通り抜けること、ボスが割ること
  - 反撃の発動
  - 敵が最大数のときのフレームレート
  - 盾の消し忘れがないこと（ゲームオーバー、帰還、リスタート、Depth 移行、ショップ復帰）

## 14. 承認が必要な項目と推奨

#1〜#11 はすべて推奨どおり承認済みです（#1・#2・#3・#5・#10 は 2026-10-11、#4・#6・#7・#8・#9・#11 は 2026-10-12）。テリトリーの広さ（S1 半径 200 → S8 半径 300）も 2026-10-12 に承認。

| # | 項目 | 推奨 |
|---|---|---|
| 1 | スキル名・ID・和名（3章、7.2章） | 案のとおり。変更があれば R2 前に |
| 2 | 盾は射撃（ビーム）を防がない | 防がない。後の Mutation 候補 |
| 3 | ボスは盾を貫通して割る | 割る |
| 4 | 瞬間回避の成功を反撃の引き金にするか | MVP では入れない |
| 5 | キャノンにも Reactor／Fire Control を効かせるか | 今回は効かせない |
| 6 | REGALIA の装備 Combat Link 対象を新2スキルにする | する |
| 7 | `RUN_ARCHIVE_VERSION` を 3 に上げ、旧記録は旧枠で表示する | する |
| 8 | 新素材を REGALIA 出撃時だけ読み込む | する |
| 9 | 新しい効果音は作らない | 作らない（流用か無音） |
| 10 | R1（Blender 画風試作）から着手する | する |
| 11 | テリトリーの境界に薄い光の円を描く（Graphics、当たり判定なし。4.1章） | 描く |
