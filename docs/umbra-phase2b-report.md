# KGK-02 UMBRA SERAPH — Phase 2B 実装・検証報告

2026-09-06。対象は `H:\ラスメモヴァンサバゲーム`。今回の範囲は、採用済みAir Brakeの既定化、標準機／REGALIAの候補例外復元、正常ブーストの開始・固定開始位置・実移動区間・終了／無効化の通知。MOONLIGHT／BLOOD SPIKE／PHANTOM NOVAの実攻撃、NOVAの予約・slot・配置・周回・放電は未実装。

## 1. 着手時状態と変更範囲

HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9` のまま。着手時はREADME/game/index/skillDefinitionsが変更済み、docs/tests/UMBRA各module/画像が未追跡で、Phase 1／2A／Air Brake補正の成果を含む作業ツリーだった。これを保持し、commit/push/deploy/reset/依存追加を行っていない。

比較基準は `.tmp_umbra_phase2b/baseline/` に保存した着手時ファイルを**明示的にtunedで動かした状態**。game.js SHA-256は `9006202881bc7831bdcff86171e8c81a505dd7699c9698ea2141a94153402f2b`。HEADや補正前legacyは今回の性能比較基準に使用していない。着手時hashは `.tmp_umbra_phase2b/start-hashes.json`。最終通知実装game.jsは `15479571d8829ffe5aa9fb8254d946b05ac63b473418b9bb3b55cb65dfc2b968`。

AGENTS.md、README、Phase 1／2A／Air Brake報告を確認。Phase 0調査の独立mdは現在のdocsにはなく、タスク既報の段階計画とPhase 1の接続記録を引き継いだ。物理更新の接続位置は過去の概略に依存せず、現在のvendored Phaser 3.70.0と実装から再監査した。

| 今回変更したファイル | 内容と現在の主要入口 |
|---|---|
| `game.js` | 既定判定 `getUmbraAirBrakeCalibration`:64030、通知helper群:63709、開始／終了hooks:64310以降、移動指令提出 `updateAcPlayerMovement`:65939、候補例外 `buildLevelUpUpgradeChoices`:78997、隔離bridge:83073 |
| `umbraDrive.js` | `resetDrive`:181、実方式表示:209、診断購読:235、受信:254、診断snapshot:298。診断Graphics・固定マーカー・表示切替・破棄 |
| `umbraDriveFixtures.js` | `resetFixture`:99。context再構築前の通知無効化、方式／通知フラグ保持 |
| `umbraDriveRuntime.js` | 明示allowlist:6。本番と同じ通知helper全16個を関数参照で取り込む。既存中断／復帰の通知無効化 |
| `umbraPreview.js` | 入口表示:102を `移動通知 PHASE 2B [D]` に更新 |
| `index.html` | game.jsの配信版:106を `umbra-phase2b-v1` に更新。動的検証moduleも同じ版。画像版は更新しない |
| `README.md` | 現行入口、採用版、診断、限定候補例外の説明 |
| `docs/umbra-phase2a-report.md` / `docs/umbra-airbrake-report.md` | 人間確認を追記。以前の評価・比較・未着手状態は当時の履歴として保存 |
| `tests/umbra-phase2b-candidates.test.cjs` | 既存2機体だけの候補復元を独立検証 |
| `tests/umbra-phase2b-trace.test.cjs` | 配信・世代・停止・外部補正・既定値の単体試験 |
| `tests/umbra-phase2b-performance-browser.cjs` | 着手時tuned対最終tuned、通知／表示の4条件を全sample比較 |
| `tests/umbra-phase2b-trace-browser.cjs` | 実Phaser step、地形、停止、配信、通常rAFキー入力、再起動の記録 |
| 本報告 | 検証範囲・制約・証跡・次の判断 |

skillDefinitions.jsのGit差分は以前からのPhase 1成果で、今回は変更していない。AGENTS.md、vendor、stageDefinitions、equipmentDefinitions、style.css、Firestore rulesも変更していない。採用Air Brakeの8関数は着手時と本文一致。既存Scene関数の削除0、既存変更15関数（通知hook・既定判定・候補限定条件）、追加16helper。画像27枚の寸法／hashは圧縮版の記録と全一致、umbraPreviewAssets.jsも着手時と一致。

## 2. 人間確認と既定化

今回のユーザー確認を両報告へ追記した。

> Air Brake補正案（tuned）について、人間操作で操作感に問題がないことを確認。UMBRAの後続実装の基準として採用し、Phase 2Bへ進む。

端末・fixture・全入力環境の指定はない。全端末・全強化構成・実戦バランスの合格とは扱わない。初期「問題なし」→継続テストで制動不足→補正案の再確認という履歴は保持した。

採用した定数は `referenceMs:200 / retainedSpeedRatio:0.40`。未処理の制動経過時間だけを適用し、衝突で低下したbody速度を保持し、終了updateで通常操舵を二重適用しない既存tuned処理をそのまま使う。強度、70ms逆入力保持、制動時間、再使用待ち、EN抑制、終了後操舵は変更していない。

| 指定 | UMBRA | 標準機／REGALIA |
|---|---|---|
| 未指定 / `tuned` / 不正値 | 採用版tuned | 従来方式 |
| 明示的 `legacy` | 隔離試走の旧方式比較 | 従来方式 |

bridge→Drive初期context→fixture再構築→再リセット→core判定まで、明示legacyだけを例外にした。判定元は実行機体／検証context。HUB選択値や通常URLだけでUMBRAの公開制限を変えない。Scene key `UmbraPhase2ADrive` とcontext kind `umbra-phase2a` は互換のため維持。機体・fixture・方式を変える場合は既存の新規試走リセットを行い、移動中の性能交換はしない。

## 3. 候補例外の復元

Phase 2A前の `.tmp_umbra_phase2a/baseline/game.js:78505` で、`passiveChoices.length > 0 ? Math.min(2, choiceLimit - 1) : choiceLimit` を確認した。baseline hashは `a413f57f9ef7cf8038614d445f08d4d43664e2efca5fb7612287f856765ae7c6`。

正確な例外条件は数値Lvの一律上限判定ではなく、**有効性判定・抽選後の実効パッシブ候補が0件**。標準機／REGALIAの通常レベルアップだけ、3件の有効スキルがあれば最大3件へ戻した。候補が2／1／0件ならその件数のまま。数値Lvが未上限でも、攻撃間隔下限等ですべて効果0なら例外に該当する。

AGENTS/READMEの基本方針「スキル最大2枚」と旧実コードの上記例外は区別した。AGENTSは変更していない。旧式自体はOpeningにも使われていたが、今回はOpening／チケット／Reroll不変更の明示依頼を優先し、通常候補だけ復元。Evasiveの問い合わせ非消費・実提示時1回・上限再確認・二重取得防止、既存シャッフル、UMBRA空Stage除外は維持。新規10試験と既存候補11／Registry9試験で確認した。

## 4. 現物の更新順と通知取得

```text
Scene PRE_UPDATE              body identity / context / 停止を観測
  Scene UPDATEイベント
    Arcade World.update       body.preUpdate → body.update
      collider / overlap      衝突・被弾・分離・位置補正
      WORLD_STEP              stepのprev → 衝突解決後の位置を通知
      追加World.stepがあれば   body.update → collider → WORLD_STEPを各回処理
  Scene.update                入力集約 → 正常開始／終了 → 移動式 → body.setVelocity
                              → 次stepへ提出した指令の帰属タグを保存
Scene POST_UPDATE             body.postUpdate → GameObjectへフレーム変位反映
描画
```

同梱PhaserのBody.updateは毎step `prev.set(position)` を行う。`prevFrame` はフレーム単位であり、区間始点に使わない。WORLD_STEPの始点は `prev + halfWidth/halfHeight`、終点は衝突解決後の `position + halfWidth/halfHeight`。`newVelocity` は衝突前の予定変位で、外部速度混入の照合にのみ使う。deltaX()/deltaY()やSprite、pivot、カメラ位置、累積フレーム変位から区間を生成していない。

正常開始は継続／可変／固定Boostの成功末尾から `beginUmbraBoostTrace`:63849へ接続。失敗分岐では呼ばず、入れ子の外側で二重発行しない。終了は `endAcContinuousBoost`:64406／`endAcVariableQuickBoost`:64747、固定方式の期限終了は移動指令提出時から `endUmbraBoostTrace`:63858へ接続する。

`submitUmbraBoostTraceCommand`:63908は、本体移動がbodyへ提出した速度の数値、body identity、sequence、basis世代とBOOST／NORMAL／GLIDE／AIR_BRAKE分類を保存するだけ。次の `observeUmbraBoostTraceStep`:63964はこのタグに帰属させるため、物理完了後に同じフレームで解除しても最後のpowered区間を失わない。開始だけで物理stepがなければ区間を作らない。Air Brake終端のactive=falseでも、そのupdateの制動結果を示すローカル値からAIR_BRAKEとして除外する。Evade終了はBoost区間の終了条件にしない。

通常Scene更新順、fixedStep、物理step数、接触／被弾順、vendor、World.step／Body.updateは変更していない。通知helperはbody位置・速度・EN・入力・無敵・SEを変更しない。

## 5. 配信仕様・壁・寿命

通知typeは `start / step / end / invalidate`。全通知と座標をfreezeした数値snapshotとして、利用先IDごとのcallbackへ同期・同順で配送する。Aが配列をshiftしてBの情報を失わせる構造ではない。購読IDの重複は置換、unsubscribeは元のownerにだけ有効。consumerの例外は他consumerと移動処理へ伝播しない。

各通知はrun/depth/basis世代、boostSequence、物理step通番、Scene移動更新回数、order、Scene時刻`timeMs`、stepの`deltaMs`、固定開始位置、from/to、valid/reason/mode、初回物理評価／初回有効移動、取消・終了理由を持つ。物理イベントの引数は秒、通知ではmsへ変換。同じScene時刻の複数stepも通番で区別する。通知時刻は衝突のサブstep内発生時刻を推定したものではない。

固定開始位置は後のbody位置で上書きしない。開始成功・初回物理評価・初回有効移動を別に持つため、「開始したが未評価」「壁押しで評価済み・未移動」「実移動あり」を区別できる。初回有効移動はsequenceごとに最大1回。壁で最初は0移動でも、その後の同じBoostの接線移動は取得する。

本番の `stageObstacleBodies` と試走の `walls` にある実static bodyを参照する。減った変位が予定変位の同方向投影であり、実際の既知壁／world boundsの面に接触し、始点→終点が半径分拡張した壁AABBの内部を横切らないと確認できる区間を保持する。境界に沿う接線は許可する。接触フラグだけでsequenceを捨てず、未知のめり込み補正はそのstepを除外して次の基準点を取り直す。

**円body対矩形の角では拡張AABBが保守的に広い**ため、安全性を確認できない角の区間は `WALL_CHORD_UNVERIFIED` または `UNEXPLAINED_CORRECTION` として除外する。正確な曲線の壁滑りを復元できたとは主張しない。同じ線を細分化して通過扱いにしない。除外stepの前後を有効な長い線で結ばない。固定の距離上限で高速移動を捨てる方法も使用していない。

外部速度は予定変位と提出速度×物理deltaの不一致で除外する。その後の同じ指令タグのcatch-up stepも `EXTERNAL_MOTION` として除外し、次の本体移動提出まで有効化しない。合法な衝突後の複数stepは直前の衝突解決後速度を期待値にする。短いbody.resetも、保存した前回終点と次step始点の不一致から検出する。

独立レビューで、速度積分の後にcollider／overlapが速度を変える境界も確認した。元600px/sで10px進んだ後に1200px/sへ変更された場合、完了済み10pxは有効だが、次の20pxは外部速度によるものとなる。最終版は `newVelocity / delta` と衝突解決後速度を比較し、既知壁面での同方向減速投影だけを引き継ぐ。未知変化は現在区間に `nextCommandExcludedReason: EXTERNAL_POST_COLLIDER_VELOCITY` を記録し、次の追加stepを除外する。この修正後に性能・全通知試験を再実行した。

履歴は配信元256件、診断consumer各256件。再入配送にも上限があり、超過時は `DELIVERY_GAP` で基準・開始情報を無効化する。UIは120件・5秒、固定開始マーカーも5秒まで。表示OFFは描画だけを止め、通知と購読を維持する。

## 6. 停止・遷移・破棄

| 境界 | 接続・確認範囲 |
|---|---|
| 世界全体の停止／復帰 | 既存World PAUSE／RESUME。WORLD_STEP側も停止判定するため、collider中停止後の残stepを有効化しない |
| Scene pause/sleep/resume/wake、Game hidden/visible | UMBRA runtime所有listenerで無効化・基準取得。新規Boost成功を発行しない |
| Drive停止・候補・非表示 | 既存中断処理への通知無効化。consumer側でも停止中start/stepを拒否 |
| 新規試走・fixture・機体・方式切替 | 旧runtime破棄→context/body/EN等の既存リセット→最終リセット後の新規購読 |
| body交換／無効／破棄・座標不連続 | PRE_UPDATEとWORLD_STEPでidentity/形状/座標整合性を確認。古いBoostを取消 |
| 明示的な位置設定 | createPlayer:42568、Raid開始位置:20643、Raid座標制約:67468に無効化hook |
| Depth移行 | beginGateDepthTransition:61602とresetAcMovementState:45476、実Depth/context変更の観測 |
| 抽出／死亡／HUB | 既存World.pauseとgameOver/extractionComplete/restartInProgress/shopActive guard。非同期帰還待ちの前に無効化 |
| Final Raid開始待ち／本開始 | loadFinalBossRaidAssetsThenBegin:6787、beginFinalBossRaid:18745、実loading/active guard。単にDepth10では止めない |
| shutdown/destroy | listener解除、consumer／履歴／body/context参照と診断Objects参照の解放。world破棄後・重複呼出も安全 |

停止で古い通知を後から再配送しない。世代変更時に利用先も予約用の開始情報・表示区間を破棄する。通知初期化はEN回復やBoost発動を行わない。既存Supportの敵単位timeStop/freezeを全体停止に含めていない。

本番全遷移を実セーブで実走したわけではない。接続箇所は現ソース監査、停止／退出／Raid状態は単体およびブラウザ内疑似遷移、実際のDrive停止・候補・Preview往復・restartは隔離ブラウザで確認した。

## 7. 採用tunedの性能比較

着手時のtunedを30条件で保存し、最終版の「通知ON/OFF × 表示ON/OFF」4組×30条件で比較した。**120/120条件で全比較項目が完全一致**。30条件は3fixture×3Hz×短押し250ms／長押し1200ms／直接1540制動の27条件と、baselineのEN枯渇→全回復held→解除→再開始の3Hz。通知ONにおける表示ON/OFFの30組でも、source件数とA/B受信件数・hashが一致した。

比較は丸め・許容幅緩和をせず、初期／最終、全Scene sample、全WORLD_STEP位置・速度、入力時刻列、Scene/physics/render回数、EN・過熱・解除待ち、Air Brake開始／終了／理由、Evade有効・残時間、正常開始数・SE入口数を `assert.deepEqual` で照合する。音声は既存のpresentation adapter入口回数であり、可聴音の確認ではない。

直接制動の基準fixture・最大strength・障害物なし。起点は正常Air Brake開始。以下は60Hzで実際に対応するScene updateがあった測定値。

| 発動後実時刻 | 速度 px/s | 起点からの移動距離 px |
|---:|---:|---:|
| 0ms | 1540.000000 | 0 |
| 50ms | 1224.716922 | 71.478050 |
| 100ms | 973.981519 | 128.322451 |
| 150ms | 774.578993 | 173.529139 |
| 200ms | 616.000000 | 209.480695 |

30／60／120Hzの200ms速度は各616px/s。距離はそれぞれ217.474529／209.480695／201.633724px。同じHz内の着手時対通知追加後を比較し、異Hzの距離を一致させるための変更は行っていない。30Hzの50/150ms付近は実対応時刻を記録し、補間値を実測として記載しない。

短押し250ms要求は30Hzでは266.6667ms、60／120Hzでは250msの入力区間となる。baselineで解除直前速度は30／60／120Hz順に778.3586／765.3419／770.7195px/s、長押し1200msでは1539.5882／1540.1440／1540.4220px/s。Boost成功直後のstate初速はfixture baseline／medium／deepで417.911／633.607／933.300px/sだが、bodyにはまだ速度提出も物理移動もない。その時点のbody速度0と区別して記録した。

物理は既存の固定60Hz。制御30Hzでは1描画中に概ね2step、60Hzで1step、120Hzで0/1stepが交互に進む。Sceneの既存delta上限50msは変更せず、今回の制御deltaはすべて上限未満。疑似時刻のGame.step試験を、実30／120Hz表示端末の操作確認とは扱わない。

## 8. 試験の読み方と証跡

証跡の共通ディレクトリ:

`C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase2b\`

| 記録 | 内容 |
|---|---|
| `phase2b-performance-baseline.json` | 着手時tunedの30条件。source hash、全時系列 |
| `phase2b-performance-current.json` | 最終通知版の4組×30条件、既定値・機体・fixtureの検証、全比較 |
| `phase2b-performance-current-first-pass-8997bb8b.json` / `phase2b-performance-current-intermediate-debc5455.json` | 途中版の比較記録。最終評価と分離 |
| `trace-browser-report.json` | 制御タイムライン、各step座標・理由・初回状態・A/B全通知、実ブラウザキー、再起動 |
| `trace-browser-intermediate-debc5455-report.json` | 独立レビュー修正前の99ケース。最終102ケースと分離 |
| `phase2b-scope-audit.json` | 着手時／最終source hash、採用制動8関数の本文一致、変更／追加関数一覧、27画像hash |
| `trace-keyboard-hud.png` | 通常rAF・ブラウザキー入力時の診断画面 |
| `drive-phase2b-trace-visible.png` | 固定開始(350,500)と後のbody位置、通知線とA/B表示 |
| `drive-phase2b-consumer-boundaries.json` | 古い世代・旧owner callback・停止中eventの利用側拒否 |
| `drive-phase2b-ui-final-lifecycle.json` | 表示／通知OFF・明示legacy、Previewへの退出と再入場 |
| `regression/browser-report.json` | 24姿勢・3素材×8コマ、欠損・遅延完了・再起動・隔離 |
| `regression/normal-report.json` | 既存2機体のHANGER／出撃／HUD、通常公開制限、通常URLへ戻る経路 |
| `regression/drive-lifecycle-report.json` | 既存9ケースの停止・入力・過熱・候補・通常復帰 |
| `regression/umbra-airbrake-regression.json` | 既存Air Brakeの7比較群 |

新規単体は候補10・通知10、既存Registry9・stats10・候補11・Air Brake8で計58件PASS。構文11ファイルと `git diff --check` はPASS。既存Previewの24姿勢／24コマ・欠損・再起動・遅延完了、通常5ケース、既存Drive lifecycle9ケース、Air Brake regression7比較群もPASS。最終通知・性能ブラウザ結果の詳細は以下の追記表と各JSONに示す。

最終通知ブラウザは34ケース×30/60/120Hzの**102/102 PASS**。全有効stepのfrom/toが実際のbody.prev／衝突解決後位置と一致し、独立したPhaser LineToRectangleによる実壁矩形内部の横断は0件だった。開始失敗は開始0、初回物理・初回移動は各sequenceにつき最大1、A/B全payload・順序が一致し、重複0。

| 重要ケース・実結果 | 30Hz | 60Hz | 120Hz |
|---|---:|---:|---:|
| 開始→解除の間に物理stepなし | 開始1・終了1・step0・有効0 | 同左 | 同左 |
| 壁停止→同じBoostの壁沿い移動：有効区間 | 40 | 39 | 39 |
| 同ケース：初回物理／初回有効移動 | 1／1 | 1／1 | 1／1 |
| 内角のWALL_CHORD_UNVERIFIED | 2 | 2 | 2 |
| 外角：有効区間 | 36 | 35 | 32 |
| 外角のUNEXPLAINED_CORRECTION | 4 | 3 | 4 |
| 外角のWALL_CHORD_UNVERIFIED | 2 | 4 | 6 |
| 外部速度後の2連続step | EXTERNAL_VELOCITY→EXTERNAL_MOTION、両方除外 | 同左 | 同左 |

実際のphysics.add.overlap callbackで積分後の速度を2倍にする追加試験も全HzでPASS。30Hzでは速度683.248→1366.497px/s、現在の11.387474px区間は有効で `EXTERNAL_POST_COLLIDER_VELOCITY` を記録、次の22.774949px区間はEXTERNAL_MOTIONとして除外した。60Hzでは11.169926→22.339852px、120Hzでは11.259537→22.519073px。同じ区別が働き、本体から新commandが提出された後だけ有効区間へ戻った。通知を直接手作業で生成する試験ではない。

角の未取得は上表のように明示的に存在する。次の確定stepから別区間として再開し、穴を線で補完していない。今回の高速壁接触ケースでは壁colliderが働き、有効通知の壁横断は見つからなかった。すべての速度・地形で物理の壁抜けがないと保証するものではない。

1px／700pxの予告なしbody.reset、交換／無効化／破棄、停止／候補／非表示、退出・Raid状態は古いsequenceを無効化し、その後の移動を古いBoostへ継ぎ足さなかった。表示Spriteだけの移動・拡縮・傾きと、表示上向き固定の横移動はbody区間に影響しなかった。

180度の入力変更では、650ms以内の速度反転を試験条件にしていた初回harnessを修正した。既存のBoost操舵は緩く旋回する仕様であり、その時間内の反転は今回の要件でも採用性能でもない。最終試験は実際の左入力受理・旋回開始・body区間との一致を確認し、旋回性能を変更していない。

通常rAFのPlaywright keyboard eventは、制御Game.stepとは別の `keyboard` section に記録した。

| 通常ブラウザ入力 | 実測Shift保持 | Scene更新／物理step／render | 有効区間 | 開始／終了 |
|---|---:|---:|---:|---:|
| 短押し | 200.0ms | 38／38／38 | 12 | 1／1 |
| 長押し | 1212.1ms | 97／97／97 | 73 | 1／1 |

DOM入力時刻とScene時刻を残し、両方A/B一致。実物キーボードや実120Hz端末の確認ではない。再起動3回でlistener数は不増、旧Worldのworldstep listener0、終了画面でtrace=null。UI側の旧世代event・旧owner callback・停止中の現世代stepを直接渡す試験でも受信／表示を増やさず、Preview再入場は方式と表示／通知flagを保持した。

最終性能ブラウザ16contextと通知ブラウザ5contextで保存・通信隔離を確認。未指定/tuned/不正値/legacyの4起動URL、計36機体・fixtureリセット条件もPASS。各測定が固定した配信10ファイルのhashは最終workspaceと一致した。

## 9. 隔離・互換性

新規保存キー0。実セーブ・本番アカウント不使用。試走のStorageデータAPI操作0、認証／クラウド／ランキング／通常Scene入口0、外部要求0、page error0。厳格getter遮断でも起動・試走可能で、vendor起動時のStorage存在確認1回は保存データアクセスと分けて記録した。

通常回帰は新しい合成保存のコンテキストを使用し、本番接続を遮断した。通常起動自体の外部初期化試行はケース順に3／0／3／0／3件で遮断されている。これを「通常起動も外部試行0」とは報告しない。UMBRA検証module／画像の不要ロード、通常HANGER公開・購入・所有allowlist拡張はない。

既存2機体は専用runtimeなし、診断購読0、試走元のworldstepカウンタ1個だけ。UMBRAでは元カウンタ＋通知observerの2個。過熱・EN・入力解除待ち・Evasive抽選重み・無敵時間・AP丸めは維持。採用版Air Brake以外の性能変更もない。GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、Depth6+発生・保存・リセット、通常HUD／Shop／Ranking、Final Raid性能・HP・演出・報酬には変更を加えていない。

## 10. 人間用URLと操作

採用版・通知表示ON: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1

明示的な旧方式比較: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBrake=legacy

表示だけOFF: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraTrace=0

通知OFFの性能比較: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraTraceNotify=0

ページ全体を再読み込みし、`PHASE 2B TEST / 移動通知のみ / 攻撃未実装 / 進行保存なし` と `BRAKE: UMBRA採用版` を確認する。上部で同じ機体・fixtureを選びRで初期位置／ENへ戻す。WASD/矢印で移動、Shift/SpaceでDASH、解除後の正反対入力でAir Brake。停止P、候補L、カード1～3、閉じるEscape、hitbox Hは既存操作。T／TRACEボタンは表示のみ切替。

開始マーカーは固定位置。有効Boost線は緑、通常移動は灰、滑走は青、制動は黄、不明補正／不連続は赤い×。線は診断であり、NOVA設置やMOONLIGHT命中を示さない。開始・初回物理・初回有効移動・終了とA/B件数を見比べる。長押し途中に別の開始が増えないこと、壁押し後の接線移動で初回有効移動が1回だけ増えることを確認できる。

## 11. 再現コマンド

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node tests/umbra-registry.test.cjs
node tests/umbra-phase2a-stats.test.cjs
node tests/umbra-phase2a-candidates.test.cjs
node tests/umbra-airbrake.test.cjs
node tests/umbra-phase2b-candidates.test.cjs
node tests/umbra-phase2b-trace.test.cjs
$env:NODE_PATH='C:\Users\akina\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:UMBRA_TEST_BROWSER='C:\Users\akina\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe'
$env:UMBRA_TEST_OUTPUT='C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase2b'
node tests/umbra-phase2b-performance-browser.cjs --baseline-only
node tests/umbra-phase2b-performance-browser.cjs
node tests/umbra-phase2b-trace-browser.cjs
git diff --check
```

localhost:4173の既存サーバーを使用。未起動なら `python -m http.server 4173 --bind 127.0.0.1`。追加ライブラリなしで既存Playwright／Chromiumを使った。node --testの子プロセス制限は各node:testファイルの直接実行で回避し、Chromium起動は明示されたPhase 2B検証範囲の承認審査を通して実行した。

## 12. 未確認事項・次の判断

円と矩形の角の正確な曲線経路は復元していない。保守除外の理由と頻度は地形試験JSONで確認する必要があり、将来の攻撃側は除外区間を補完線で埋めない。正常な壁沿い接線区間は取得できるが、すべてのマップ・速度・角で完全な経路取得を保証するものではない。

実タッチ／コントローラー、Safari／Firefox、実30／120Hz表示端末、実音声、長時間・低メモリ負荷、通常戦闘での全遷移を実セーブで検証していない。表示上向きを固定した横移動試験は、既存の敵探索が動く実戦でのtarget-facing全経路を確認したものではない。

`boostSustainDrainRampMs / boostSustainRampMs` の不一致は既知課題として据え置き。今回の通知はその推定rampではなく実物理移動から取得する。数値・通知試験の通過は、未指定端末や実戦バランスの包括承認を意味しない。

Phase 3へ進む前には、本報告の通知仕様・角での保守除外・開始成功と初回実移動の違いを確認し、別途実攻撃の仕様と実装を承認する必要がある。今回の作業は結果報告で停止する。

Phase 2B実装結果。Phase 3のMOONLIGHT実攻撃は未着手
