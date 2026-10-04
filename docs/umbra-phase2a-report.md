# KGK-02 UMBRA SERAPH — Phase 2A 実装結果

作成日: 2026-09-06。性能値は比較用の仮値。人間による操作感確認前のため、機動性能の正式確定・Phase 2全体の完了とは扱わない。

## 開始状態と実装範囲

開始時HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。Phase 1の未コミット変更が既に存在した。`README.md`、`game.js`、`index.html`、`skillDefinitions.js`、`umbraPreview.js`、`umbraPreviewAssets.js`、`docs/`、`tests/`、`画像/player/KGK-02_UMBRA_SERAPH/` の既存変更を保持してPhase 2Aを重ねている。27 PNGの圧縮後素材、frame、pivot、scaleを維持し、旧素材再コピー・画像加工・Git commit/push・本番デプロイは行っていない。

Phase 2A実装前の検証は、Registry 8/8、Phase 1 Previewの全ケース、通常起動5ケースがPASSした。これは開始時のベースライン確認であり、後段のPhase 2A実装後の検証とは区別する。

今回の対象は、検証機体profile、開始APとAP Reinforce、移動・EN・回避の既存処理接続、Evasive候補優先、安全な試走画面である。専用3スキルは引き続き表示用であり、正式Stage、ダメージ、命中判定、Mutation、TRIAD、OVERLIMIT、攻撃用boostSequenceは追加しない。

販売条件は既に採用済みの仕様: **確定GEEK 10,000,000、Depth10 Final Raid討伐後に購入可能、永続所有、購入後の機体切替無料、死亡で所有を失わない**。Phase 2Aでは正式販売・購入・所有保存を実装していない。価格や解放条件が未決定という意味ではない。

今回の変更ファイルは以下。Phase 1との差分を区別するため、開始時の主要ファイルを `.tmp_umbra_phase2a/baseline/` に保管して比較した。

|ファイル|Phase 2Aでの変更|
|---|---|
|`game.js`|仮profile、専用runtime Context、AP共有合成と強化差分、候補保証、隔離module読込・狭い画面の既存CSS利用|
|`umbraDrive.js`|新規。物理フィールド、比較UI、計測、入力、候補表示、終了処理|
|`umbraDriveRuntime.js`|新規。実移動・EN・回避の関数参照と中断/再開adapter|
|`umbraDriveFixtures.js`|新規。3段階のRAM構成、実能力合成、Deep計測|
|`umbraPreview.js`|素材Previewからの性能試走入口と専用Scene登録。既存素材表示は維持|
|`index.html`|game.jsのURL版を更新。Phaser/CDN/vendor読み込み構成は維持|
|`README.md`|試走URL・操作と採用済販売仕様|
|`docs/umbra-phase1-assets.md`|現行27PNGの寸法/ハッシュを実ファイルから補完、旧表を履歴として区別|
|`docs/umbra-phase1-report.md`|採用済販売仕様と、現在の表示への人間確認を追記|
|`docs/umbra-phase2a-report.md`|本報告|
|`tests/umbra-registry.test.cjs` / `tests/umbra-normal-browser.cjs`|仮profile/Context境界、通常起動で新Drive moduleも要求しない回帰|
|`tests/umbra-phase2a-stats.test.cjs` / `tests/umbra-phase2a-candidates.test.cjs`|新規。数値/候補の単体回帰|
|`tests/umbra-drive-browser.cjs` / `tests/umbra-drive-lifecycle-browser.cjs` / `tests/umbra-drive-stepped-browser.cjs`|新規。実ブラウザ試走・中断/復帰・制御タイムライン|

`skillDefinitions.js`、`umbraPreviewAssets.js`、PNG27枚はPhase 2A開始時と同一。`AGENTS.md`、`stageDefinitions.js`、`equipmentDefinitions.js`、`style.css`、`firestore.rules`、vendorも変更していない。圧縮版の追記はローカルに実在していたため、現在の寸法列を追加した。BLOOD SPIKEの2048×682、8矩形・pivot・表示倍率、画像URL `umbra-assets-compressed-v3` は維持。Previewコードのみ `umbra-phase2a-v1` とし、全通常素材の版は変更していない。

## 隔離用fixtureと再利用API

`window.createUmbraDriveFixtures(bridge)` は `install(scene)`、`resetFixture(scene, fixtureId, mechId)`、`measureDeepLevels(fixtureId, mechId)` を提供する。bridgeから既存 `SurvivalScene.prototype`、機体定義、CD定義、ACプリセットを受け取る。インストールは計算・候補関数の明示リストに限り、通常Sceneのcreate、保存、購入、認証、報酬処理を移植しない。

`resetFixture` は `UmbraPhase2ADrive` Sceneかつ専用フラグを検証し、`verificationContext={kind:"umbra-phase2a",mechId}` のもとでRAM上の入力状態を作る。ショップ保存正規化、実セーブ読込、実購入、討伐フラグ付与は使用しない。装備定義moduleの純粋なRAM正規化とボーナス算出は使用する。通常機体公開allowlistを広げず、UMBRAの `previewOnly` を維持する。

|fixture|BASE CALIBRATION: weapon / armor / shoes|Reactor Cooling|所持CD|5部位共通の装備|各部位精錬|ラン中パッシブ|
|---|---|---|---|---|---|---|
|baseline|0 / 0 / 0|0|anju|なし|0|すべて0|
|medium|10 / 10 / 10|10|anju、hanseikai、miraiwoikiteru|SR Rank 3|+5|AP Reinforce 3、Booster Tuning 2、Energy Capacitor 2、Evasive Firmware 1|
|deep|25 / 25 / 25|25|現行全7枚|LEGEND Rank 5|+20|AP Reinforce 10、Booster Tuning 5、Energy Capacitor 5、Evasive Firmware 3|

全7枚のCD IDは `anju`、`nandeyanen`、`hanseikai`、`miraiwoikiteru`、`kotokoto`、`ichaina`、`finalBossLiberator`。装備の5部位は head / clothes / shoes / weapon / accessory。装備品質点はmedium 13、deep 25で、装備FRAMEのAPはそれぞれ品質点×3と精錬Lv×8から79 / 235になる。

各値は既存のBASE CALIBRATION最大25、Cooling最大25、装備Rank最大5、精錬最大20、パッシブ最大10の範囲内である。mediumのパッシブは計8回、deepは計23回の選択に相当する。Reactor Overcharge / Fire Control Linkは0。Robot、Support、Deep CD、OVERDRIVE、TRIADの追加効果はない。D30に到達すれば必ずこの構成になるという進行モデルではない。

切替・リセットはstatsとfixture内パッシブを再構築し、候補提示状態を新しいrun内状態に置き換え、移動adapterのリセットへ進む。状態や設定はページ終了で破棄される。

## APの適用順と実効差分

実際の開始計算は既存の `rebuildStartingStats({applyPlayerMech:true})` を呼ぶ。順序は `createBasePlayerStats` → `applyPermanentUpgradesToStats`（BASE CALIBRATION・所持CD）→ `applyRunEquipmentStartingStatBonuses`（装備・精錬）→ `applySelectedPlayerMechStatProfile`。

`PLAYER_MECH_NEUTRAL_STAT_PROFILE.maxHpMultiplier` の中立値は1。未指定・無効値は正規化で1になり、従来の標準機とREGALIAのAP結果を保持する。UMBRAの比較値は0.40。共有 `getPlayerMechMaxHpForBase(base,profile)` は次を計算する。

```text
max(1, round((機体補正前最大AP + maxHpAdd) × maxHpMultiplier))
```

`getOpeningShopAggregateBonusSummary` も同じhelperを使用する。検証SceneのRAM入力を通してHUB計算結果と開始APを比較しており、UMBRAを通常HUBへ公開していない。

新しいstats objectを再構築するたびに適用済み参照と補正前AP基準をリセットする。同じstatsへの機体profile再適用は拒否する。各fixture・機体で3回ずつfixture全再構築と開始stats再構築を試し、結果一致を確認した。

AP Reinforceは機体補正前のAP基準をラン内に保持し、`getApReinforceHpGain` が「基準+20を補正した値」と「元の基準を補正した値」の差を算出する。`applyApReinforceUpgrade` は実効差分のみを最大AP・現在APへ加える。候補説明、カード説明、差分チップも同じ実効値を使用する。標準機とREGALIAは+20、UMBRAは+8。部分被弾状態の不足APはそのまま残り、全回復に置き換わらない。0APからのAP Reinforceもそれぞれ20 / 8だけ回復する。

開始profile適用時に0APを渡した場合の既存 `hp || beforeMaxHp` フォールバックは保持している。通常の開始再構築は満APでこの経路へ入る。0APの開始profile処理と、部分被弾時に使うAP Reinforce処理は区別して回帰確認した。

|fixture|標準機: 開始AP|REGALIA: 開始AP|UMBRA: 開始AP|標準機: fixtureパッシブ後AP|REGALIA: 同左|UMBRA: 同左|
|---|---:|---:|---:|---:|---:|---:|
|baseline|100|200|40|100|200|40|
|medium|304|404|122|364|464|146|
|deep|710|810|284|910|1010|364|

「開始AP」はHUB集計に対応するパッシブ前の値。「fixtureパッシブ後」は試走画面へ渡す値。mediumでは304×0.4=121.6を122へ丸めるため、割合は厳密な40%から少しずれる。

同一パッシブ条件の通常移動比較も確認した。Booster Tuningは検証ContextのUMBRAだけ実効+39、標準機・REGALIAは従来の+30。パッシブ後の移動statはbaseline 標準310 / UMBRA403、medium 470 / 611、deep 692 / 900で、`round(標準×1.30)` と一致する。最大ENの機体固有増減はUMBRAにはない。パッシブ後最大ENはbaseline 標準100 / REGALIA75 / UMBRA100、medium 193 / 168 / 193、deep 375 / 350 / 375。

## DEEP LEVELの数値測定

既存式は変更していない。Depth6以降・Lv25以上で既存 `gainDeepLevelExperience` を1Lvぶんの必要XPごとに実行した。初回増加時に `deepLevelBaseMaxHp` を固定し、毎Lvの増加を `max(1, round(基準AP×0.01))` とする。AP補正済みの基準に0.40を再適用しない。AP Reinforceを後から適用しても、捕捉済みのDeep基準を更新しない。

以下はNodeの数値単体試験であり、描画・物理step・FPSの実測ではない。Lv25基準には上記fixtureパッシブを反映済み。各セルは「標準機AP / UMBRA AP（UMBRA÷標準）」を示す。

|fixture|Lv25|Lv26|Lv50|Lv99|毎Lv増加: 標準 / UMBRA|
|---|---|---|---|---|---|
|baseline|100 / 40（40.00%）|101 / 41（40.59%）|125 / 65（52.00%）|174 / 114（65.52%）|1 / 1|
|medium|364 / 146（40.11%）|368 / 147（39.95%）|464 / 171（36.85%）|660 / 220（33.33%）|4 / 1|
|deep|910 / 364（40.00%）|919 / 368（40.04%）|1135 / 464（40.88%）|1576 / 660（41.88%）|9 / 4|

baselineのUMBRAは最低+1により比率が上がる。mediumは標準の3.64→4、UMBRAの1.46→1という毎Lv丸めにより比率が下がる。deepは9.10→9と3.64→4の丸めにより少し上がる。したがって開始AP40%という比較設定だけでは、全Lv・全fixtureで常に40%を維持しない。小数累積や増加0Lvを設けるUMBRA専用Deep成長は未実装であり、採用には別の検討を要する。

## Recovery・Barrier

`getRobotBarrierMaxHp` は既存の `max(8, round(stats.maxHp × (0.05 + (Lv-1)×0.0085)))` を継続使用する。最大AP倍率を追加で掛けない。Barrier Lv20の数値テストでは、baseline標準AP100→Barrier21、UMBRA AP40→Barrier8となり、最低8を保持した。再充填も既存のBarrier最大値×0.34と回復量×0.22による式を維持する。

Recoveryの回復量は既存 `getRobotHealAmount` / `getRobotHealAmountForLevel` を使用し、最大APに機体倍率を再度掛ける処理を加えていない。Recovery Lv1・回復量強化0・Sync倍率1の実関数テストでは両機とも1pulseで4回復し、残り2APの場合は2だけ回復して実効最大APで止まる。試走fixture本体はRobotを生成しない。Barrier/Recoveryの検証は独立したRAM単体試験で行った。被ダメージ軽減、致死回避、最低Barrier、各cooldownは変更していない。

## 数値・回帰検証

`node tests/umbra-phase2a-stats.test.cjs`: **10/10 PASS**。実Scene宣言と定数、装備module、fixture moduleをVMで評価し、通常/Previewのbootは実行しない。Storage getterとネットワークは呼ばれた時点で失敗するテスト環境を使用し、数値fixtureのStorage操作0・外部通信0を確認した。

確認内容: 無効/未指定倍率の中立化、開始AP一度適用、再構築冪等性、HUB開始AP一致、AP Reinforceの説明/チップ/最大/現在AP差分一致、部分被弾と0AP、補正前基準による繰返し丸め、標準機/REGALIAの開始AP・移動・ENの維持、同じBooster Tuningでの1.30比較、Deep固定基準・丸め・最低1、fixture上限、提示状態のリセット、既存Barrier/Recoveryへの二重補正なし、保存関数非インストール。

`node --check game.js`、`node --check umbraDriveFixtures.js`、`node --check tests/umbra-phase2a-stats.test.cjs` もPASS。環境の `node --test ...` は子プロセス生成が `spawn EPERM` で拒否されたため、同じ `node:test` suiteを直接 `node <testfile>` で実行した。

## 移動・EN・回避の再利用と補正箇所

独立Sceneは `UmbraPhase2ADrive`。実 `SurvivalScene.init/preload/create/createState` を呼ばず、`umbraDriveRuntime.js` の明示リストから関数参照を渡す。`updateGamepadState → updateAcPlayerMovement` を毎Scene updateで呼び、実Arcade円body半径22と静的な矩形壁に `physics.add.collider` を登録する。本番全体のScene・物理・敵接触の更新順は変更しない。停止中だけ検証Sceneのmovement updateを抑止する。

|用途|再利用する本番入口|
|---|---|
|キーボード/タッチ/コントローラー集約|`getPlayerMoveInputVector / getMobileMoveVector / updateGamepadState / isDashKeyDown / getAcQuickBoostInputState`|
|加速・旋回・壁・ブースト|`updateAcPlayerMovement / tryStartAcQuickBoost / startAcContinuousBoost / updateAcContinuousBoost / endAcContinuousBoost / applyAcMovementWallDamping / updateAcAirBrake`|
|ENと過熱|`getAcDashDrainMultiplier / recoverAcBoostEnergy / getTotalBoostEnergyRegenMultiplier / updateAcFullOverheatRecovery`|
|無敵|`triggerAcEvadeWindow / updateAcEvadeWindow / isAcEvadeWindowActive`|
|表示|`updatePlayerRobotMotion / syncPlayerVisuals`。UMBRAは既存metadataの `applyPose` をbody無しImageだけに適用|
|候補|`buildLevelUpUpgradeChoices / getPassiveUpgradeChoices / markLevelUpChoicesPresented`|

通常acV3の巡航は `stats.moveSpeed × 0.56`。UMBRAのmove profile×1.30を開始statへ一度適用し、同じBooster Tuning条件ではUMBRAだけ+39として比率を維持する。

持続Boostは初期インパルス・持続加速・終端目標・速度上限・解除後の上限を別に扱う。UMBRAの `quickBoostImpulseMultiplier` と `quickBoostSustainAccelerationMultiplier` は1で、初速はmove基準の1.30、持続加速度の係数は既存1850のまま。速度上限 `quickBoostMaxSpeedMultiplier`、終端目標 `boostTerminalSpeedMultiplier`、解除後上限 `quickBoostExitSpeedMultiplier` に各1.40/1.30を一度掛ける。滑走時間・摩擦・旋回・Air Brakeは中立値を維持。解除直後の速度は慣性と減衰を受けるため、終了速度を即1.40比へ固定する変更はない。

旧v1/acV2の固定Quick Boostも同じ専用倍率を上限に使うが、初期インパルスはmove由来の1.30。基礎fixtureの実キーボード約130ms地点で、v1は標準573.50 / UMBRA745.55 px/s（上限697.50 / 976.50）、acV2は883.50 / 1148.55（上限1023.00 / 1432.20）。上限比1.40と短押し時点の速度比1.30を区別する。

ENの開始消費、継続消費、最大出力消費は既存 `getAcDashDrainMultiplier` でTriad倍率×機体倍率0.75を一度合成。回復は装備BOOSTER×Reactor Cooling×機体1.25を一度合成し、FULL_OVERHEAT中だけ既存0.35を掛ける。基礎の継続消費は標準58→66.7、REGALIA84.1→96.715、UMBRA43.5→50.025 EN/s。以下はブラウザで実getterを呼んだ計算値で、速度の実測とは分ける。

|fixture|機体|開始消費|最低開始EN|最大消費/s|通常回復/s|FULL_OVERHEAT回復/s|持続終端目標 px/s|
|---|---|---:|---:|---:|---:|---:|---:|
|baseline|標準|6.00|8.00|66.70|24.00|8.40|1100.50|
|baseline|REGALIA|8.70|8.70|96.71|16.80|5.88|595.55|
|baseline|UMBRA|4.50|8.00|50.02|30.00|10.50|1540.70|
|medium|標準|6.00|8.00|66.70|32.52|11.38|1668.50|
|medium|REGALIA|8.70|8.70|96.71|22.76|7.97|940.61|
|medium|UMBRA|4.50|8.00|50.02|40.64|14.23|2335.90|
|deep|標準|6.00|8.00|66.70|46.80|16.38|2456.60|
|deep|REGALIA|8.70|8.70|96.71|32.76|11.47|1423.69|
|deep|UMBRA|4.50|8.00|50.02|58.50|20.47|3440.77|

最低開始EN、回復遅延、過熱解除、完全回復待ち、NEED_RELEASEは変更していない。基礎UMBRAの長押しは試走開始約1.950秒でEN0・FULL_OVERHEAT・無敵OFFを観測。保持したまま全回復するとREADY_NEEDS_RELEASEで、入力を離すまで再発動しないことを補足試験で確認した。

**既存設定の不一致:** `boostSustainDrainRampMs:420` に対し、実 `getAcContinuousBoostRampRatio` は `boostSustainRampMs` を参照し、未定義で1msになる。HEADの既存コードにも同じ状態がある。次のupdateでほぼ最大出力となり、420msで徐々に上がる挙動は確認できない。既存機体の調整を避けるため今回変更しない。正式な加速・消費評価前に、この設定名を統一するかを別途判断する必要がある。

## 実ブラウザの移動測定

次表は新規Chromium context、1280×800 viewport、通常rAF駆動、Arcade既定fixedStep 60Hz、敵/音声なし。各セルは同一fixtureをリセットして測定。通常は右方向1300ms、Boostは右+Shift600ms、解除は全入力を離して750ms後。入力配送・描画の境界による時間差があるためJSONの各 `at` と更新回数も残した。実移動のピクセル座標・速度は物理bodyから取得した。

|fixture|機体|通常速度|Boost600ms時点|その時点の上限|Boost時EN|解除750ms後速度|
|---|---|---:|---:|---:|---:|---:|
|baseline|標準|173.60|1100.10|1131.50|53.06|638.34|
|baseline|REGALIA|130.48|593.99|612.32|8.48|0.00|
|baseline|UMBRA|225.68|1262.57|1584.10|65.60|892.62|
|medium|標準|263.20|1354.90|1715.50|146.01|971.78|
|medium|REGALIA|206.08|856.03|967.10|99.87|102.09|
|medium|UMBRA|342.16|1499.38|2401.70|157.76|1344.30|
|deep|標準|387.52|1582.39|2525.80|328.02|1419.16|
|deep|REGALIA|311.92|985.83|1463.80|281.87|215.92|
|deep|UMBRA|504.00|1795.63|3537.69|339.76|1714.67|

通常速度は全fixtureで約1.30、上限は約1.40を確認。深層fixtureの通常statは692×1.3の丸めにより900なので比率1.30058、上限比も僅かにずれる。600msの実速度は1.40固定ではない。解除750ms後にも大きな速度が残り、特に深層fixtureは滑走の見極めが必要。180度の入力は即座に速度方向を反転しない。継続Boost中は既存仕様でAir Brakeがブロックされ、Shift解除後の逆入力でAir Brakeへ移る。ここで旋回・滑走・ブレーキを追加調整していない。

壁押し、内角への斜め進入、角からの退出で実colliderの衝突を確認。停止・再開、候補開閉、EN不足、全過熱、全回復後の入力解除、8回の短押しも確認した。短押しはUMBRA基礎/Evasive Lv0、約80ms押し＋120ms離しを8回、記録約1.917秒でEN100→26.52。定義は1回70ms、ON/OFFのSceneフレーム境界の観測区間を合計すると約667msだった（厳密なダメージ保護時間の計測ではない）。実接敵・被弾判定を入れた連打バランス確認は未実施で、全機体への新cooldownは加えていない。

## Evasive候補と無敵

UMBRAの通常重みは3。最初の通常レベルアップの既存パッシブ枠へ一度だけEvasiveを提示し、取得は任意。Opening Boost・上限Lv・時間の実効増加0では除外する。問い合わせ、成長余地/overflow、旧overlay/旧runの遅延コールバックでは提示済みを消費しない。本番カード登場Tween完了、試走ではカードを描画したpostrender後にrun state tokenを照合して記録する。選ばず閉じても提示済みなら通常抽選に戻り、Depth遷移では維持、新規試走/ランでリセットする。

新スキルのStageは空のままなので、試走候補は既存パッシブだけで構成する。固定seed再現試験と、現在の6パッシブ重み合計8に対する8等区間検査でEvasiveが3区間を占めることを確認。完成後の専用攻撃候補を含む全候補の出現確率には一般化しない。

合計3択・スキル最大2を共有helperで守る。従来コードの「全パッシブ上限時だけスキル3枚」という例外はなくなり、有効パッシブがない場合は無効カードを作らず最大2枚になる。通常の有効パッシブが残る条件は3枚。候補表示中の右側AP/Evasive操作は無効にし、古い候補を選ぶ際にも現在の上限を確認する。AP Lv9→別取得でLv10→古いカード選択でも追加APが増えない実ブラウザ試験が通過した。

Evade倍率は1.00、既存の未取得70ms・Lv別時間・最大Lv10を維持する。Lv10は1700ms。Boost開始でON、解除/EN切れ/Air Brake/POST_BOOST_GLIDEでOFFを実関数・実ブラウザで確認した。解除後の延長や150〜200msへの基礎拡大はない。

## FPS条件の区別

`?umbraPreview=1&umbraDrive=1&driveFps=30|60|120` はPhaserのsetTimeout clock目標を変える検証URL。Arcade物理は既定60Hz。右+Shift1700msの実時間試験で以下を計測した。

|目標|実Scene更新/秒|実描画/秒|実物理step/秒|観測時間ms|終端時速度|EN|
|---:|---:|---:|---:|---:|---:|---:|
|30|22.88|22.88|59.85|1704.30|1539.58|10.46|
|60|59.17|59.17|59.75|1723.90|1540.13|10.19|
|120|62.41|62.41|60.08|1714.40|1540.11|10.67|

目標120に対して実描画は約62であり、物理スマートフォンや120Hzモニターの120FPS動作が通ったとは扱わない。

別の新規contextで自動ループを停止し、実 `Phaser.Game.step(timestamp,delta)` に合成時刻を渡す制御タイムライン試験も実施した。各rateで2秒の直進、短押し解除/方向転換、壁押しの全9ケースがPASS。入力は疑似キーボード状態であり、実時間FPSとは区別する。

|合成rate|Game.step / Scene update / renderer postrender|Arcade物理step|直進終点x（開始350）|直進終速|壁押し終点x|壁押しEN|
|---:|---:|---:|---:|---:|---:|---:|
|30Hz|60 / 60 / 60|120|778.724|225.680|1643.000|0.670|
|60Hz|120 / 120 / 120|120|780.610|225.680|1643.000|0.561|
|120Hz|240 / 240 / 240|120|780.610|225.680|1643.000|0.507|

`Game PRE_STEP → STEP → Scene PRE_UPDATE → Arcade WORLD_STEP → Scene UPDATE/POST_UPDATE → Game POST_STEP → PRE_RENDER/POST_RENDER` の実順序を記録。移動関数にdeltaだけを渡す単体試験ではない。250msの入力解除要求は30Hzでは266.667ms、60/120Hzでは250msに配送されるため、その量子化差もJSONに残した。

厳格なgetter監査ではvendor初期能力検出の `window.localStorage` プロパティ参照を1回検出して遮断した。実Storage objectは渡さず、その状態でも全試験PASS。StorageデータAPI操作0、通常Scene/認証入口0、外部要求0、pageerror0、試走タイムライン中の追加getter参照0だった。

## 保存・通信、終了と表示の確認

隔離Preview/DriveはStorageのデータAPI操作0、通常Scene/認証/クラウド/ランキング入口0、外部要求0。合成sentinelを置いた新規contextの保存領域全体は試験前後で一致。vendor Phaserには起動時のStorage機能存在確認があるため、Storageオブジェクトのプロパティ参照と、保存データの読書きは区別する。後段の厳格試験ではこのgetter参照を遮断しても動作することを記録する。

通常URLへ戻った後は標準機に戻り、verificationContext・候補保証状態・UMBRA画像/Drive moduleが持ち越されない。通常起動後の既存Firebase SDK要求3件は外部遮断して別に記録し、隔離試走の0件と混同しない。

終了時にPhaserの物理worldが既に破棄されているケースを修正し、Driveが所有する素材通知listener0、キーlistener0、Timer0、Tween0、verificationContext=nullを確認。素材ロードSceneと画面全体のviewport resize listenerはPreview Gameが所有し、再表示に利用する。Game破棄時はviewport listenerも解除する。停止やタブ非表示は既存Boost終了を呼び、速度・無敵を解除し、EN・過熱・完全回復待ちを保持する。再開時は未完了の期限を停止時間分延ばす。新規試走/fixture切替のみ初期状態へ戻す。

タッチはマウスによるスティック操作と、844×390のtouch contextで表示内座標へのタップを確認。コントローラーは合成Gamepadデータを既存集約へ渡す疑似確認。タブ切替はheadless環境でdocument.hiddenが変化せず、visibility属性/イベントによる疑似確認とした。SFX OFF/ONはnoAudio・音声除外adapterでSE入口各1回、実速度1540.145/1540.144、EN消費一致。実音声再生、実コントローラー、OSのタブ休止までは未確認。

844×390では当初canvas下部が画面外だったため、検証起動だけ既存mobile-sessionのCSSクラスを使用し、通常のmobile/save bootは呼ばず高さへFITした。修正後はcanvas全域、DASH、Evasive、候補を閉じる操作がviewport内。style.cssは変更していない。デスクトップ中程度/深層fixtureに文字切れ・重なりなし。小画面では詳細ラベルが小さくなるため、実スマートフォンでの可読性と操作感は人間確認が必要。

## 検証記録・再現手順

開始時の記録: `C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\phase2a-baseline\`。

完成後の主試験: 同親ディレクトリの `umbra-phase2a\` に `browser-report.json`（素材）、`normal-report.json`（通常5ケース）、`drive-report.json`（9構成比較・壁/角・EN・入力・終了・実clock条件）、各PNGを保存。

補足試験: `phase2a-output\` に `drive-lifecycle-report.json` と `drive-lifecycle-supplement-report.json`（合計9種類）、`drive-stepped-browser-report.json`（合成30/60/120Hz全9ケース）、`drive-effective-values.json`（9構成getterとmobile/desktop QA）、`drive-hud-medium.png / drive-hud-deep.png / drive-mobile-844x390.png / drive-mobile-candidates-844x390.png`、滑走/解除待ち/候補上限のPNGを保存。最終HUDの起動確認画面は `umbra-phase2a/drive-overview-final.png`。

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check umbraPreview.js
node --check umbraPreviewAssets.js
node --check umbraDrive.js
node --check umbraDriveRuntime.js
node --check umbraDriveFixtures.js
node tests/umbra-registry.test.cjs
node tests/umbra-phase2a-stats.test.cjs
node tests/umbra-phase2a-candidates.test.cjs
git diff --check
```

数値/Registry/候補は9+10+11=30件PASS。素材Previewの24姿勢/24frame/欠損/遅延完了/再起動と通常5ケースは実装後もPASS。

```powershell
$env:NODE_PATH='C:\Users\akina\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:UMBRA_TEST_BROWSER='C:\Users\akina\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe'
$env:UMBRA_TEST_OUTPUT='C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase2a'
node tests/umbra-preview-browser.cjs
node tests/umbra-normal-browser.cjs
node tests/umbra-drive-browser.cjs
node tests/umbra-drive-lifecycle-browser.cjs
node tests/umbra-drive-stepped-browser.cjs
```

既存インストール済みPlaywright/Chromiumを使用し、新規ライブラリやビルドツールは追加していない。

## 起動・人間が確認する項目

既に4173サーバーが動いている場合は再起動不要。未起動なら以下を実行する。

```powershell
Set-Location -LiteralPath 'H:\ラスメモヴァンサバゲーム'
python -m http.server 4173 --bind 127.0.0.1
```

素材Preview: http://127.0.0.1:4173/?umbraPreview=1 。
性能試走: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1 。Preview内のD/性能試走ボタンからも入れる。

移動WASD/矢印、DASH Shift/Space、候補L、カード1〜3、閉じるEscape、停止P、当たり判定H、新規試走R。上部で機体/fixture切替、右側でEvasive Lv/AP強化/Opening候補を操作する。画面の素材Preview/検証終了も利用可能。

人間確認は、通常→Boostの繋がり、短押し位置修正、90/180度切り返し、解除後の停止距離、Air Brakeを使うタイミング、壁/角の抜けやすさ、回復待ちの操作感、小画面の読字/タップが中心。加速不足や滑走過多を感じる場合は、上限・加速・旋回・減衰のどれが原因かを分けて次回個別に調整する。今回の画像の目視承認を性能承認とは扱わない。

未確認: 人間の実操作感、実スマートフォン/Safari/Firefox、長時間/低メモリ性能、実コントローラー/音声出力、敵との実接触/連打の戦闘バランス、本番接続。Phase 2B前に持続ramp設定名の不一致と、Deepの丸め差・大きな解除後慣性を評価する。NOVA再制作や画像再圧縮は行わない。

新規・変更した保存キーはない。確定/未確定GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth6+の発生/リセット条件、Final RaidのHP/演出/ランキング/報酬、購入journal、クラウドschema、Firestore rulesは変更していない。通常HUD/Shop/Rankingの公開範囲も維持する。

Phase 2A実装結果。Phase 2B・Phase 3は未着手

## 継続テストによるAir Brake評価の更新（2026-09-06）

初期確認の「切り返し・Air Brakeに問題なし」は履歴として残す。その後の継続テストで「回避特化機体にしてはエアーブレーキの効きが弱い」というフィードバックを受け、Air Brakeを再調整対象へ更新した。切り返し全体・通常移動・ブースト・素材表示の再制作は行わない。

本報告の「全入力解除750ms後速度」は惰性滑走の測定であり、Air Brake性能の測定値として流用しない。正常発動時点を起点にした別測定と、UMBRA限定の旧／新RAM比較を [Air Brake補正報告](umbra-airbrake-report.md) に記録する。数値目標の達成だけで正式性能や最終合格とはしない。後続Phaseと実攻撃へは進まない。

## 人間確認と後続基準の採用（2026-09-06、Phase 2B着手時追記）

「Air Brake補正案（tuned）について、人間操作で操作感に問題がないことを確認。UMBRAの後続実装の基準として採用し、Phase 2Bへ進む。」

これは今回ユーザーから示された確認であり、端末・fixture・入力環境の指定はない。全端末・全強化構成・実戦バランスの合格を意味しない。上記の初期確認→継続テストの制動不足→補正案の再確認を履歴として保持する。採用した減衰式・強度・発動条件は変更せず、今回の承認範囲は移動通知まで。現行のURL既定値と検証結果は [Phase 2B報告](umbra-phase2b-report.md) を参照する。
