# KGK-02 UMBRA SERAPH — Phase 4 BLOOD SPIKE基本攻撃

2026-09-06。対象は `H:\ラスメモヴァンサバゲーム`。自動探索→地面位置固定→突き上げ→単発範囲ダメージ→表示終了と、MOONLIGHT基本共存までを実装した。性能は検証用の仮値で、BLOOD SPIKEの人間確認・正式性能確定は行っていない。

## 1. 着手時と保護した成果

HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9` のまま。着手時のgame.jsは依頼指定の `307ea67fe2bed619ba02f1739c956d44b2bca41df14b98a6774d3ce0b5b57de6` と一致した。README/game/index/skillDefinitionsの既存変更、未追跡のdocs/tests/UMBRA module/画像を保持した。比較基準はGit HEADではなく、このPhase 3完成状態＋採用済みAir Brake tunedである。

開始ファイルと過去報告のコピーは `.tmp_umbra_phase4/baseline/`、開始hash・HEAD・作業ツリーは同ディレクトリ親の `start-hashes.json` / `start-head.txt` / `start-status.txt`。過去Phaseのbaseline・JSONは上書きしていない。AGENTS、README、Phase 1素材記録、Phase 2A／Air Brake／Phase 2B／Phase 3報告を確認した。独立したPhase 0報告ファイルは現在のdocsに存在せず、読了とは扱っていない。

Phase 3報告には今回の人間確認だけを追記した。「ユーザーより、Phase 3Aとして共有されたMOONLIGHT基本攻撃について、人間操作では問題なしとの確認。今回確認された基本操作を維持してPhase 4へ進む。」当時の人間確認前という履歴、確認端末・fixture・接触ON/OFF未指定という限界、3件の既知課題を保持した。

commit、push、deploy、reset、clean、依存追加は実施していない。AGENTS、vendor、Firestore rules、機体24姿勢とスキル3 PNG、Previewの矩形・pivot・scaleは変更していない。通常販売・購入・保存・クラウド・Final Raid・後続Phaseへ進んでいない。

## 2. 最終ソースと変更ファイル

主要試験前の凍結時刻は `2026-09-06T07:28:03.423464+00:00`。11配信ファイルを `.tmp_umbra_phase4/final/` に保存し、全hashを `.tmp_umbra_phase4/final-sources.json` に記録した。最終game.js SHA-256：

`85093a6d5121846fc3988854ec5737f98808e3f4b1862efdb4edcb94194db96e`

| 変更ファイル | 変更内容 |
|---|---|
| game.js | 独立したSPIKE物理時計・生存個体・自動探索・固定cast・瞬間範囲・既存damage受付、spawn/kill登録hooks、専用性能getter、実効武装別パッシブ表示、隔離query bridge |
| skillDefinitions.js | 通常Stage配列と分けたverificationStage1の仮設定だけ |
| umbraDriveRuntime.js | 同じ本体helperを隔離Sceneへ接続する明示allowlist |
| umbraMoonlightArena.js | 既存場を拡張。4取得構成、4追加配置、SPIKE専用表示Map、HUD、既存被弾拡縮の補助試験入口 |
| umbraDrive.js | Phase 4場の接続・タイトル・武装カードの可読性。旧MOONLIGHT入口の表示分岐を維持 |
| index.html | 変更したgame/skillDefinitionsのコード版だけをumbra-phase4-v1へ更新 |
| README.md / docs/umbra-phase3-report.md / 本報告 | Phase 4操作、今回の人間確認追記、実装と検証記録 |
| tests/ | SPIKE stats/runtime/実Phaser/arena、Phase 4移動比較とMOONLIGHT比較・旧rAF追試用ハーネスを追加。旧Moon stats fixtureを明示取得状態へ補正 |

遅延ロード版を更新したmoduleはDrive/Runtime/Arenaだけ。画像版、変更していないPreview/Assets/Fixturesの版は保持した。450既存関数の本文、27 PNG、AGENTS/vendor/rules、stage/equipment/Preview/Assets/Fixtures、Phase 3以外の過去報告は開始時と一致。11配信ファイルのローカルbytesとlocalhost HTTP取得bytesも照合した。

## 3. 攻撃の接続と時計

```text
明示的な検証S1取得（初期化ではHP変更なし）
  → WORLD_STEP：衝突解決後、許可された物理deltaを独立時計へ1回加算
  → 準備完了なら600内の近い有効敵を1体選定
  → body中心を数値で固定、castIdと生成時パラメーターを保存
  → 生成200ms後の予定時刻へ達した最初の有効step：現在の全対象をsnapshot
  → 半径80と実円/矩形の最寄り点、実壁LOS、life/Depth/停止状態を確認
  → applyDamageToEnemy(enemy, raw, tint, null)をlifeごと最大1回
  → 同じ戦闘時計で8コマ表示 → 800msでcastと専用表示を破棄
```

時計所有者は `umbraBloodSpikeRuntime`。登録済みWORLD_STEP listenerだけが `deltaSeconds * 1000` を加算し、Scene.updateやアニメーションイベントは加算・攻撃しない。Scene preupdateは停止・世代確認と更新番号を担う。MOONLIGHTの時計・trace consumerは変更していない。登録順は既存trace/MOONLIGHT→SPIKEで固定し、Tなど診断表示の切替でlistener順を変えない。

静止・通常移動・滑走・Air Brake・EN0・過熱・MOONLIGHT未取得/OFF・通知OFFでもSPIKEは独立して更新する。通知OFFでMOONLIGHTが止まる従来仕様は維持する。敵だけの停止は戦闘全体停止とは扱わない。

P、候補、非表示、Raidなどの停止時は時計と生成済みcastの残り時間を保持する。死亡・帰還・機体Context無効化・プレイヤー置換・Scene終了ではruntimeと参照を解放。Depth変更では旧cast・旧対象・予約・表示を消し、新しい明示spawn/reuseだけを登録する。普通のブースト終了やtrace基準取り直しでSPIKEを削除しない。片方の技能破棄は他方の時計・履歴・FXを掃除しない。

長いScene差のcatch-upでも物理時計は通常どおり進むが、新規castは同一Scene更新に最大1件。各既存castのimpactは最大1回で、表示終了時刻も越えた場合はimpact後に破棄する。空探索・上限待ちを予約キューにしない。

## 4. 仮値と補正

| 項目 | 仮値 |
|---|---:|
| raw威力 | `5 + max(0, stats.bulletDamage - 1)` |
| 探索 | プレイヤーbody中心→候補地面点600px |
| AoE | 固定地面点→敵の実shapeまで80px。プレイヤー半径22を加算しない |
| 生成開始→次の生成開始 | 1800ms、Fire Control下限500ms |
| 準備済みで有効敵なし／上限待ちの再探索 | 150ms |
| 同時cast数 | 表示終了まで含め最大3 |
| impact | 3コマ目、frame index 2、生成200ms後 |
| 表示 | 8コマ、10fps、800ms、1回 |

実PNGを目視し、3枚目で刃が大きく立ち上がるためindex 2を選んだ。数学上の予定時刻と実物理適用時刻は別項目で保存し、`quantizationMs=max(0, appliedAtMs-impactDueAtMs)` を記録する。小数誤差の許容は1e-7msだけで、表示のコマ落ちを命中の複数回化や予定時刻ちょうどという偽記録にしない。

Fire Controlの式は `round(500 + 1300 * clamp((fireInterval - 160) / (540 - 160), 0, 1))`、下限500。Moonの既存正規化と同じ入力範囲を専用getterへ置き、Moonの式は変更していない。

| fireInterval | 540 | 470 | 400 | 330 | 260 | 190 | 160 |
|---|---:|---:|---:|---:|---:|---:|---:|
| SPIKE予定間隔ms | 1800 | 1561 | 1321 | 1082 | 842 | 603 | 500 |
| 直前からの短縮ms | — | 239 | 240 | 239 | 240 | 239 | 103 |

CD込みfixtureのfireIntervalはbaseline540／medium513／deep482、SPIKE予定間隔は1800／1708／1602ms。これは予定間隔で、次の有効物理stepへの量子化は別。Reactor/FCS候補は実際に取得しONの武装への実効差分を表示し、両方有効なら両方を記載する。Phase 4の攻撃なし構成では両武装に効果がない候補を除外。標準機／REGALIAと旧通知のみ入口は従来の候補と説明を維持する。

生成時にraw・半径・表示時間・impact予定・次cast予定を固定する。待機中のReactor/FCS取得では現在の角や予定を変更せず、新しい値を次のcastから採用する。OVERDRIVE等の既存共通倍率は既存受付が命中時に適用する。SPIKE側で再乗算しない。

## 5. 対象・ダメージ・共存

接地点は選定時の敵物理body中心。円はPhaserのhalfWidth/halfHeight中心、矩形は実width/2・height/2を使い、Sprite透過余白や描画offsetを加えない。画像の各pivotをその数値world座標に合わせる。探索は線形で最短距離を選び、同距離は明示spawn順で安定化。場外・壁内・機体からの実壁LOS遮断候補は見送り、座標補正しない。

impactはそのstepの現在位置と実shapeだけを読む。MOONLIGHTのcursor、prev/newVelocity、過去経路の可否を消費・変更せず、body.updateFromGameObjectを割り込ませない。対象一覧を先にsnapshotし、既存damage呼出し直前にも生存・同Depth・同life・停止を確認する。拒否でもcastId+lifeIdの試行は消費し、残り表示コマで再試行しない。

HP前後差`hpDelta`は過剰ダメージを含む。`effectiveHealthLoss=max(0,max(0,hpBefore)-max(0,hpAfter))`は有効HP減少量として別記録する。戻り値undefinedで成功を決めず、実HP差で受付を記録。元標的が死亡・脱出しても角は固定地点で完走し、成功数字は既存受付成功時だけ表示する。

本番のapplyDamageToEnemy/killEnemy/通常XP・drop経路を再利用し、二重加算しない。isolated arenaは実敵定義とHP、実Arcade body/colliderを使い、特殊討伐・装備報酬・LOST ARMS・Robot/Support追加等は既存の限定adapterで遮断・件数記録する。通常SurvivalScene.createや実セーブは呼ばない。

arenaの標準被弾演出は従来どおり別Graphics。補助mode `arena.setHitReactionMode("productionBody")` は本番playEnemyHitReactionをそのまま使い、拡縮に伴う次stepのbody変化後もMoon lifeと再命中制限を検証する。この補助試験を全敵の演出再実装とは扱わない。

## 6. 素材と表示所有

`bloodspike.png` は2048×682、382346 bytes、SHA-256 `752018d5cbbf98bcb381f6c1ff9540b82bed5c95f29f5b0ad7662e63e45bc64e`。最新metadataの上段369px・下段313pxの8矩形を使い、等分4×2で切り直していない。pivot/originと縦横の原寸補正を維持し、scaleX=0.4030078125、scaleY=0.4034017595307918。追加回転0、角depth19.5／接地ガイド17.5／機体20／MOON hit FX24。UIは独立cameraで遮らない。

SPIKE表示はcastIdごとの専用Map、MOONLIGHTは従来のeffects配列。角3件とMOON FX12件は別上限。画像／簡易／OFF／実404を通して制御castとdamageは同一。単技能cleanupは所有Map/objects/listenerのみを消す。全Timer/Tween掃除は既存の全試験リセット／Scene終了に限る。

## 7. 最終検証

同一凍結版で採取した結果を記録する。途中版の測定は最終合格の根拠にしない。証跡rootは `C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase4\`。

| 試験 | 結果 |
|---|---|
| 純粋helper/Registry/能力/候補/制動/通知/Moon/SPIKE | 11ファイル、124/124。新SPIKE runtime15、stats12を含む |
| 実Phaser：SPIKE単体／併用30・60・120Hz、通知OFF60Hz | 261条件、1,868 assertions PASS。source/Moon/SPIKE errors0、A/B件数・順序一致 |
| MOONLIGHT単独：開始時版→最終版 | 両方105条件PASS。全frame/body数値、全通知、combat counts/skips/hitHistory/生存履歴/時計を厳密比較し105/105一致 |
| 移動・EN・Air Brake・Evade・通知順序 | 開始時120条件、最終の通知/表示120＋武装なし/両武装敵なし120条件を比較。240/240一致、最大数値差0。表示parity30・既定値/明示値36 resetもPASS |
| 既存Phase 1/2A/2B/3ブラウザ回帰 | Preview、通常起動、drive lifecycle/stepped、Air Brake regression/realtime、Phase 2B trace、旧Moon arenaの8ハーネスPASS |
| Air Brake legacy/tuned | 各81条件採取PASS、81対比較PASS。既存2機体54条件の最大数値差0、全機体EN最大差0 |
| 画像／簡易／OFF・集団16体 | 各cast1、impact1、受付16、hpDelta80、有効HP減少48、撃破16。FX設定で攻撃結果に差なし |
| 8コマ、実PNG404、停止、技能別破棄、機体/fixture/Scene切替 | PASS。frame0～7、実404時fallback damage5。pause等は残時間維持、Spike破棄でMoon履歴/FX不変、逆方向も確認 |
| 保存／通信隔離 | 主matrix7 Contextとarena各ContextでStorageデータAPI0、本番起動/認証/cloud/ranking入口0、外部要求0、pageerror0。vendorのStorage存在getter拒否1を別記録 |
| 変更保護・HTTP整合 | 450関数本文一致、27 PNG一致、11配信ファイルのHTTP200/bytes/hash一致、最終manifest一致 |
| 通常URL＋新query | SPIKEのみ/両方queryの2条件PASS。HANGERは既存2機体、購入/選択guard拒否、専用module/画像0要求・runtimeなし。通常起動の外部試行各3件は遮断して別記録 |
| 旧rAF角脱出 | 開始時版は初回・1回限定再試行とも失敗。最終版は初回失敗・1回限定再試行成功。未解決の断続失敗として保持 |

物理は全条件で既存固定60Hzを維持した。Scene制御30／60／120Hzを実端末のrefresh-rate確認とは扱わない。静止周期fixtureは初期の敵なし更新を含むため、最初のcastは戦闘時計166.6666667ms、次は1966.6666667ms。impact予定366.6666667／2166.6666667msに対し実適用も同時刻（浮動小数差約1e-13ms）。単体・併用・通知OFFで周期と同じHzの時計が一致した。30Hzの最終観測時計2233.333ms、60/120Hzの2200msという差は、ハーネスがScene境界まで進める回数の違いで、2武装による倍速ではない。各生の時刻と物理回数は `final/combat/bloodspike-browser-final-report.json` とsummaryにある。

純時間試験はPhaserではないEventEmitter/numeric bodyのhelper試験と明記し、30/60/120の数学的時計・矩形境界・拒否・固定パラメーター・同期死亡/Depth・1Scene内catch-upを別に確認した。実Phaser主matrixは衝突後bodyを使い、壁、円/矩形、敵の進入/脱出、元標的死亡、同一敵重複列挙、再利用/Depth、post-colliderの不明経路、Air Brake/EN0/過熱、Support保護拒否、被弾拡縮後のMoon世代/間隔を確認した。

通常rAFのPlaywrightキー操作は `final/arena/bloodspike-arena-report.json` のraw時刻へ記録した。reset4208.3ms、keydown完了4287.9ms、releaseと撮影完了4941.7ms、物理38step。MOON1受付/raw4/1撃破が先行し、固定450,560のSPIKEは1cast/1impact・受付0で完走した。撮影込みの差を厳密なキー保持時間とは記載しない。

本番被弾拡縮補助は各制御30/60/120HzでMOON1受付＋SPIKE1受付、HP275→266。被弾後のMoon lifeId/pass/lastHitAtを保持し、再命中制限消失・不正世代更新・例外はなかった。現受付が別の後続敵bodyを同期交換する経路は確認していないため、そのような将来の再入処理まで一般化して保証しない。

移動比較は `performance/phase4-performance-{baseline,current}.json`、要約と全11source照合は同ディレクトリのsummary/source-verificationに記録した。敵・接触なしの同fixtureで位置・body速度・状態速度・EN・Air Brake・Evade・全通知順を比較し、敵撃破で接触回数が変わる比較と分けた。開始時12＋最終28の40 fresh Contextで隔離を確認した。制御タイムラインの測定は他ブラウザ試験と並行したものがあり、処理時間の負荷評価には流用しない。

旧rAF角の失敗と成功は `final/old-drive/{baseline,current}-attempt-{1,2}/drive-report.json` に全件保存した。成功まで無制限に繰り返していない。最終版2回目では角以降のEN/過熱・連続tap・入力模擬・終了cleanup・30/60/120設定時計も通過したが、開始時版の角以降は2回とも未到達なのでrAF全条件の開始時同等性を主張しない。

Air Brake採取のtunedコマンドは81件の採取・個別assertを完了後、比較元JSONを別出力dirへ保存したため集計時にENOENTとなった。そのログと2組の生測定は保持し、両JSONを新しい `final/regression/airbrake-comparison/` に集めて `--compare-only` を実行し81対PASSを確認した。測定し直した・製品不具合を修正したという扱いにはしていない。

実行コマンドは `node tests/umbra-*.test.cjs`（該当11本を個別実行）、新 `umbra-bloodspike-browser.cjs --matrix-only --final`、`umbra-bloodspike-arena-browser.cjs`、`umbra-phase4-public-gate-browser.cjs`、`umbra-phase4-moonlight-browser.cjs` の開始時/最終版、`umbra-phase4-performance-browser.cjs` の開始時/最終版、`umbra-phase4-drive-browser.cjs` の開始時/最終版。旧ブラウザ8本と `umbra-airbrake-browser.cjs` のlegacy/tunedおよび`--compare-only`も実行した。既存Playwright/Chromiumを使用し、ライブラリは追加していない。構文はgame.js/skillDefinitions.js/stageDefinitions.js/equipmentDefinitions.jsと変更moduleを `node --check`、空白は `git diff --check` で確認した。

最終版スクリーンショットは `final/arena/` の `bloodspike-frame-1.png`～`bloodspike-frame-8.png`、`bloodspike-arena-both-candidates.png`、`bloodspike-arena-raf-both.png`、`bloodspike-arena-missingImage.png`。実倍率の全幅約206worldpxと半径80の判定円を目視した。画像の透過部分や刃の高さは判定範囲ではなく、接地ガイドと敵shapeまでの距離を基準にする。人間による視覚と体感範囲の最終判断は残る。

MOON比較の初回seed版では、旧「crossing-paths-different-times」の0命中期待が120Hzの**開始時版でも**1命中になった。`moonlight-baseline/moonlight-browser-report.json` に失敗を保持した。Scene時計10000ms／Arcade accumulator0に揃えると境界内へ入る配置だったため、新しいPhase 4比較ハーネスでは同じ配置を保持して独立した同時相対位置の距離oracleへ照合し、明確に時刻が離れる追加配置でも0命中を確認した。製品ソースや旧Phase 3テスト・過去JSONを変えて失敗を隠していない。比較元105条件は `moonlight-baseline-comparison/`、最終105条件と厳密差分は `final/moonlight/`。

### 初回・反復負荷（機能結果と滑らかさを分離）

他の自動ブラウザ試験を終了してから、6 fresh Context（単体/併用×16/128/512体）で初回1回＋同Context反復2回を採取した。初回生成前のcast0・impact0・戦闘時計0を確認。18条件の機能assert108項目はPASS、主matrixと合計279条件/1,976 assertions。全回SPIKEは1cast/1impact、16受付、HP差80、撃破0。併用MOONは16受付、HP差64、撃破0だった。表示の省略で受付数を減らしていない。

以下は平均／最大ms。初回57step、反復2回計114stepを集計し、外れ値を含める。

| 構成 | 敵数 | 初回 Game.step全体 | 反復 Game.step全体 | SPIKE handler最大（初回/反復） |
|---|---:|---:|---:|---:|
| 単体 | 16 | 2.249 / 5.900 | 6.870 / 548.200 | 2.200 / 1.300 |
| 単体 | 128 | 5.796 / 13.900 | 12.354 / 800.300 | 2.500 / 1.100 |
| 単体 | 512 | 24.021 / 350.300 | 36.713 / 501.600 | 2.800 / 4.400 |
| 併用 | 16 | 2.335 / 7.700 | 6.256 / 504.600 | 0.500 / 0.200 |
| 併用 | 128 | 5.740 / 15.600 | 11.130 / 674.200 | 0.700 / 0.300 |
| 併用 | 512 | 24.865 / 329.700 | 36.364 / 562.100 | 1.100 / 0.900 |

**Game.step全体の大きな遅延は残り、性能合格とはしない。** 全1,026 sampleのうち100ms以上18点を保存した。最大800.300msは単体128体warm-2、戦闘時計466.667ms＝impact後100msのフレーム。そのframeのSPIKE handlerは計測分解能上0ms。全測定のSPIKE handler最大4.4ms、Moon consumer最大2.4msだった。これだけでは全体停止の原因を特定できず、GPU upload等とも断定しない。

全体stepは通常Scene、物理、FX、描画、検証snapshot採取を含み、SPIKE handler値には後続UIのFX描画を含まない。初回は画像ロード完了後の最初の攻撃であり、通信や全shader初回費用の保証ではない。単体は静止・併用はブースト通過のシナリオなので、両者の差を武装追加分だけの純粋なコストとも扱わない。旧565.3msは画像FXを含むMoon consumer測定、新800.3msはGame.step全体と測定範囲が異なるため、直接の悪化率は計算しない。

全生データ・初回/反復別平均最大・18外れ値のframe内訳は `final/load/bloodspike-browser-final-load-{report,summary}.json`。最終11sourceとharnessは主matrix／負荷／現ファイルで一致。追加実行コマンドは `node tests/umbra-bloodspike-browser.cjs --load-only --final`。開発版の447.4ms全体stepや、並行試験中の起動715ms longtask等も中間JSONに保持し、最終の測定と分けている。

主要6系統の測定hashと現在の11sourceを一括照合した台帳は `final/phase4-final-evidence.json`。`functionalEvidenceConsistent:true` は機能試験とソース版の整合を表すもので、滑らかさ・既知の角脱出・人間確認までの合格を表さない。

## 8. 人間用URLと操作

- SPIKE単体：`http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBloodSpike=1`
- 併用：`http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1&umbraBloodSpike=1`
- 旧MOON単体：`http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1`
- 旧移動のみ：`http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1`
- 通知OFF補助比較：上記SPIKE/併用URLへ `&umbraTraceNotify=0`。SPIKEは作動、MOONは従来どおり停止。

WASD／矢印で移動、Shift／SpaceでDASH。SPIKE/併用のPhase 4入口では、初期配置はSPIKE静止単体で、操作せずに自動設置と3枚目の突き上げを観察できる。「配置切替」で旧7配置に加え、静止単体・脱出・別敵進入・MOON先行撃破を選べる。円/矩形Boss、壁前後、角、敵なしは旧配置を共用する。

Phase 4の武装ボタンはSPIKE→MOON→両方→なし。武装・機体・fixture・配置切替、Rは初期位置・同じEN・敵・時計・履歴から新規試験。旧MOON入口は側面配置を初期値とし、従来7配置・MOON ON/OFFボタンを維持する。接触OFFは観測、ONは既存被弾受付。P停止、L候補、T通知表示、H範囲ガイド。停止と表示切替では攻撃を再生成しない。Reactor/FCSボタンまたは実候補で補正を確認できる。画像／簡易／FX OFFを切り替え、空振りの角は表示だけ完走することも観察する。素材Preview／検証終了で旧場を破棄する。

## 9. 未確認事項・後続判断

既知課題A：Phase 3の初回画像FXを含むconsumer計測565.3msは未解決。B：旧drive-browser角脱出の断続失敗は未解決。C：Phase 2B由来の角の保守的経路除外は維持。今回の人間確認で解決済みにしていない。新しい測定の外れ値・失敗・再試行結果も別記録し、原因をGPU upload等と断定しない。

実30／120Hz端末、物理コントローラー／タッチ、全Depth・全敵・全Support・実戦Gate/帰還、実セーブ／本番アカウントは未確認。安全な隔離Sceneの実Phaser制御30/60/120Hzと通常rAFを区別する。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE/STABILIZEの保存、ランキング、ショップ、HANGER公開制限に変更を加えていない。新規保存キーなし。

次の人間確認では、設置600・半径80・200ms突き上げ・1800ms周期の成立感、敵脱出時の空振り、機体と重なった際の見やすさ、MOONとの共存を確認したい。数値や自動試験の通過だけでは正式性能を確定しない。PHANTOM NOVAの実攻撃、正式Stage2～8、Mutation/TRIAD、装備の新3武装対応、OVERDRIVE速射の新接続、通常販売は未着手。

Phase 4：BLOOD SPIKE基本攻撃の実装結果。PHANTOM NOVAの実攻撃、正式Stage成長、通常販売は未着手
