# KGK-02 UMBRA SERAPH Phase 2A補正：Air Brake

2026-09-06。比較案を実装し、隔離試走で検証した。正式性能は未確定、人間の再確認待ち。

## 人間確認と採用の追記（2026-09-06、Phase 2B着手時）

「Air Brake補正案（tuned）について、人間操作で操作感に問題がないことを確認。UMBRAの後続実装の基準として採用し、Phase 2Bへ進む。」

今回ユーザーから上記の確認があり、現在のtunedそのものを後続基準として採用した。端末・fixture・全入力環境は指定されておらず、全端末・全強化構成・実戦バランスの合格を示すものではない。本報告の旧比較結果・操作説明・未着手状態は当時の履歴として残す。初期確認→継続テストで制動不足→補正案の人間再確認という経緯と区別して、既定値変更・通知付き性能再試験は [Phase 2B報告](umbra-phase2b-report.md) に記録する。承認はPhase 2Bまでで、Phase 3実攻撃は未着手。

## 対象と履歴の保護

着手時HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。README/game/index/skillDefinitionsと、未追跡のdocs/tests/UMBRA各module/素材を含むPhase 1／2Aの作業ツリーを保持した。今回の比較基準はHEADへ戻したものではなく、着手時ファイルを `.tmp_umbra_airbrake/baseline/` にコピーしたもの。

AGENTS.md、README、Phase 2A報告と実装を確認した。Phase 2BのboostSequence／移動区間通知／専用実攻撃は未着手。今回は通知を追加せず、制動との変更混在もない。MOONLIGHTは引き続き表示用。過去の「切り返し・Air Brakeに問題なし」は初期確認として保持し、継続フィードバックを受けてAir Brakeだけを再調整対象へ更新した。旧報告の全入力解除750msは惰性滑走の測定で、本報告には流用していない。

commit、push、deploy、ライブラリ導入は行っていない。候補例外の復元など別件の変更、Phase 2B／後続Phase／実攻撃には進まない。

## 原因の切り分け

### 発動前

`getAcAirBrakeComponents` は現在の移動state速度と入力方向の内積を取る。`updateAcAirBrakeOpposingInput` と `getAcAirBrakeBlockReason` は、acV3有効・Final Raid外・FULL_OVERHEAT外・BOOST非発動・cooldown終了・入力あり・入力強度0.55以上・速度220以上・内積−0.65以下を確認する。その条件を70ms保持してREADYになり、`startAcAirBrake` が成功した時点を制動開始とする。

BOOST中は逆入力を認識しても `BOOST_ACTIVE` で保持時間を数えない。解除後は `HOLDING`、再使用待ち中は `COOLDOWN` となる。70msはScene更新境界で判定するため、逆入力からの実発動待ちは70msちょうどではない。保持中は従来の旋回が進み、発動時に完全な正反対でなくなってstrengthが約0.96となるケースがある。今回はこの遅延／操舵を変更していない。

### 発動中の旧式

共有された式と同じ構造だった。現行acV3の係数は、target ratio=0.52、counter thrust=480、damping=6.2。正確な流れは次のとおり。

```text
dt = min(delta / 1000, 0.05)
elapsed = clamp((now - startedAt) / duration, 0, 1)
eased = 1 - (1 - elapsed)^3
target = max(currentSpeed, startSpeed) * lerp(1, 0.52, eased)
damping = 1 - exp(-6.2 * dt * max(0.25, strength))
counterThrust = 480 * dt * lerp(0.42, 1, strength)
frameTarget = max(target, currentSpeed - counterThrust)
nextSpeed = lerp(currentSpeed, min(currentSpeed, frameTarget), damping)
```

counterThrustが支配する高速域では、1回の減速量は `counterThrust × damping`。小さいdtでは概ね `480 × 6.2 × strength補正 × dt²` となる。更新回数を増やすほど、同じ時間の減速が弱くなる。高速のUMBRA、とくに強化fixtureほど開始速度に対する減速割合も小さくなる。targetSpeed=52%という表示は、実速度が52%になる保証ではない。

`updateAcPlayerMovement` はAir Brake中に通常の操舵・加速をスキップする。速度上限はその時点の制動後速度以上に置くため、発動中の結果を通常上限へ押し戻す処理ではない。ただし旧式は終了フレームにfalseを返すため、制動後にそのフレーム全dtの通常／POST_BOOST操舵と速度上限処理が重なる。計算単体の終端速度と最終body速度が異なる原因になる。

Arcadeの物理stepはSceneの移動updateより前。衝突でbodyが減速しても、キャッシュしたstate速度は自動では同期しない。旧式は壁減衰係数0.3を掛けたstateを再設定するため、衝突直後の法線速度が少し復活し得る。

### 終了後

`endAcAirBrake` 自体は速度を切らず、activeを解除する。POST_BOOST_GLIDE期限が残っていればその既存操舵へ戻る。逆方向の速度成分が負になるまでの時間、さらに逆方向へbodyが実際に移動する時点は、制動終了時点とは別に測る必要がある。ベクトルが回転しただけで完全停止とは扱わない。減速は改善したが、既存の発動待ちと終了後の旋回時間は残る。

## 比較案の変更

- `game.js`: `UMBRA_AIR_BRAKE_CALIBRATION`（200ms、残存率0.40）、runtime機体による選択、物理減速の採用、経過時間制動helperを追加。既存start/applyへ接続した。共有acV3設定オブジェクトは変更しない。
- `umbraDriveRuntime.js`: 上記の本体関数参照をallowlistへ追加。試走専用の別計算はない。
- `umbraDrive.js`: 新規試走時のRAM比較variant、凍結したverification context、右上のBRAKE表示、観測用snapshotを追加。切替はresetDriveを通り、入力・位置・EN・状態・計測を同じfixture初期値へ戻す。
- `index.html`: 更新したgame.jsのキャッシュ識別子だけを変更。game内のPreview module識別子も `umbra-airbrake-v1` に更新。素材の識別子・パスは維持。
- `README.md`、`docs/umbra-phase2a-report.md`: 比較入口と継続評価を追記。本報告と新規テスト4本を追加。

```text
processedThrough = min(now, brake.until)
elapsedMs = max(0, processedThrough - lastAppliedAt)
velocity *= 0.40 ^ (strength * elapsedMs / 200)
```

未処理の制動区間だけを積分する。開始速度は目標曲線の表示だけに使い、速度へ再代入しない。開始時と各制動時に、bodyの速度の大きさがstateより低ければ、実際の減速と接線方向を採用する。その後に正の減衰率を掛けるので制動自体の加速／瞬間反転はない。衝突以外で速度を瞬間0にしない。

終了判定は従来どおり。比較案だけは、終了フレームで「このupdateは制動を処理した」と返して通常操舵を二重適用しない。activeはfalseとなり、操舵は次updateから再開する。表示modeは終端updateだけAIR_BRAKEとなるが、activeの期限は延長しない。EN回復抑制・cooldownの期限はLOW_SPEED／停止等でも短縮しない。

通常の標準機／REGALIAは常に旧式。検証UMBRAはURL未指定・不正値なら旧式で、`tuned`だけ比較案。判定は実行中の機体contextから行い、HUB選択値を直接参照しない。現在は通常公開のUMBRAを引き続き拒否するので、通常プレイへ公開された性能変更はない。

## 測定条件と結果

### 制御タイムライン：実Game.step／Arcade body

旧／新それぞれ81条件（3機体×3fixture×短押し・長押し・同初速制動×30/60/120Hz）、計162条件。新規ブラウザContextで実Phaser Game.stepを実行し、通常のScene updateと固定60Hz Arcade step、実body.velocityとbody中心位置を観測した。合成キー状態と制御時刻による試験で、実ディスプレイの30/120Hz操作とは区別する。

毎条件、RAM fixture／初期位置(350,500)／満ENをリセット。計測器内だけClockの起点10000ms・物理余り時間0を揃え、壁colliderを無効にしworld boundsを広げた無障害レーンを使った。通常Sceneや試走実装のupdate順・physics設定・vendorは変更していない。壁・内角は別の実collider試験で検証した。

一連の操作は100msに右＋DASH開始、短押しは250ms（30Hzだけ266.67msへ量子化）、長押しは1200msでDASH解除と左最大入力を同時に送る。旧新で同じ時刻列を使った。同初速制動は100ms時点にbody/stateの初速1540px/s、左最大入力・最大strengthで共有start関数を成功させ、入力待ちや初速の差を切り離して比較した。

速度はbody.velocityの大きさ、元方向成分はブースト時の+X成分として別々に保存。逆移動はWORLD_STEPでbody中心が実際に−Xへ移動した時刻。完全停止の代用にvxの符号を使っていない。50/100/150/200ms点は該当時刻以降の最初のサンプルと実時刻を残した。30Hzの50/150ms欄は実際には66.67/166.67ms。

### ① 同初速1540・最大強度の制動

baselineの実body値。全3fixtureの比較案は同じ616.00px/s（40%）となった。旧式は終了フレームに後続操舵が重なるため、内部の制動直後速度と最終body速度を両方示す。

| Scene Hz | 旧：制動計算直後の終端速度 | 旧：200ms実body | 新：200ms実body | 旧→新の制動区間距離px | 制動中Scene更新 / 物理step |
| --- | --- | --- | --- | --- | --- |
| 30 | 1522.08 | 1459.68 | 616.00 (40.00%) | 306.51 → 217.47 | 6 / 12 |
| 60 | 1530.58 | 1499.35 | 616.00 (40.00%) | 307.14 → 209.48 | 12 / 12 |
| 120 | 1535.17 | 1519.54 | 616.00 (40.00%) | 307.52 → 201.63 | 24 / 12 |

| 60Hz実経過ms | 旧 実速度px/s | 新 実速度px/s | 新 残存率 |
| --- | --- | --- | --- |
| 50 | 1537.64 | 1224.72 | 79.53% |
| 100 | 1535.29 | 973.98 | 63.25% |
| 150 | 1532.93 | 774.58 | 50.30% |
| 200 | 1499.35 | 616.00 | 40.00% |

新式は終了時だけ切り落とす曲線ではなく、途中から単調に減速する。上表の616は残速度であって停止ではない。UMBRAの今回の無障害条件では速度20px/s以下への低下も観測していない。

### ② ブースト→解除・逆入力→再移動（60Hz）

速度単位px/s。初速はAir Brakeが成功する直前のbody速度。全点の実時刻はここでは50/100/150/200ms。

| fixture / 押し時間 | 旧新共通初速 | 方式 | 50ms | 100ms | 150ms | 200ms（終了後残速） |
| --- | --- | --- | --- | --- | --- | --- |
| baseline / 250ms | 682.83 | 現状 | 680.62 | 678.40 | 676.19 | 657.81 |
| baseline / 250ms | 682.83 | 比較案 | 548.09 | 439.94 | 353.13 | 283.45 |
| baseline / 1200ms | 1384.86 | 現状 | 1382.64 | 1380.43 | 1378.21 | 1345.33 |
| baseline / 1200ms | 1384.86 | 比較案 | 1111.21 | 891.62 | 715.43 | 574.06 |
| medium / 250ms | 895.56 | 現状 | 893.34 | 891.13 | 888.91 | 870.10 |
| medium / 250ms | 895.56 | 比較案 | 718.75 | 576.85 | 462.96 | 371.56 |
| medium / 1200ms | 2153.71 | 現状 | 2151.49 | 2149.27 | 2147.05 | 2112.63 |
| medium / 1200ms | 2153.71 | 比較案 | 1727.99 | 1386.42 | 1112.37 | 892.49 |
| deep / 250ms | 1191.13 | 現状 | 1188.91 | 1186.69 | 1184.48 | 1165.07 |
| deep / 250ms | 1191.13 | 比較案 | 955.86 | 767.06 | 615.56 | 493.97 |
| deep / 1200ms | 2443.34 | 現状 | 2441.12 | 2438.90 | 2436.69 | 2401.74 |
| deep / 1200ms | 2443.34 | 比較案 | 1960.38 | 1572.89 | 1261.98 | 1012.53 |

| fixture / 押し時間 | 制動区間の道のりpx 旧→新 | 元方向最大流れpx 旧→新 | 逆方向の実移動開始ms 旧→新 | 開始〜終了EN（旧新同値） |
| --- | --- | --- | --- | --- |
| baseline / 250ms | 135.75 → 94.22 | 223.84 → 120.59 | 500.00 → 433.33 | 83.10 / 100 |
| baseline / 1200ms | 276.16 → 190.98 | 474.90 → 268.48 | 533.33 → 516.67 | 35.58 / 100 |
| medium / 250ms | 178.30 → 123.55 | 304.54 → 164.03 | 516.67 → 466.67 | 176.10 / 193 |
| medium / 1200ms | 429.93 → 296.98 | 770.93 → 434.64 | 550.00 → 550.00 | 128.58 / 193 |
| deep / 250ms | 237.41 → 164.29 | 417.67 → 225.92 | 533.33 → 483.33 | 358.10 / 375 |
| deep / 1200ms | 487.85 → 336.92 | 883.08 → 497.70 | 550.00 → 550.00 | 310.58 / 375 |

この6条件の制動中EvadeはOFF、追加EN消費／回復は0、終了理由はDURATION。制動は200ms、cooldownは開始+800ms、EN抑制は開始+500msのまま。元方向最大流れは発動後の+X最大変位で、制動区間の道のりとは別の指標。各sampleにはvx/vyと元方向成分を記録しており、たとえばbaseline長押し新式200msでは速度574.06に対し元方向成分549.62px/s。

**逆方向への移動開始は全条件で早くなったわけではない。** 60Hzのmedium/deep長押しは550msで同じ。30Hzのmedium/deep長押しは旧533.33ms→新566.67msと1更新遅い。制動距離短縮と方向反転の速さは別で、終了フレームの二重処理防止と、変更していない既存の操舵／速度保持が影響する。追加の旋回調整には進んでいない。

### 同じ押し時間でも機体別の初速は異なる

60Hz・Air Brake直前の実速度。旧新同値。REGALIA baseline長押しはENが尽きFULL_OVERHEATとなり発動しない（測定欠落ではない）。

| fixture / 押し時間 | 標準機 | REGALIA | UMBRA |
| --- | --- | --- | --- |
| baseline / 250ms | 587.72 | 251.08 | 682.83 |
| baseline / 1200ms | 949.31 | 不発 FULL_OVERHEAT | 1384.86 |
| medium / 250ms | 751.35 | 359.38 | 895.56 |
| medium / 1200ms | 1511.31 | 735.06 | 2153.71 |
| deep / 250ms | 978.40 | 508.46 | 1191.13 |
| deep / 1200ms | 2234.87 | 1182.52 | 2443.34 |

### 更新頻度と発動待ち

| Scene Hz | 短押し逆入力時刻ms | 短押し発動時刻ms | 長押し逆入力→発動ms | 逆入力後の待ちms | 短/長strength | 新式 短/長200ms残存率 |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | 366.67 | 500.00 | 1300.00 → 1433.33 | 133.33 | 0.9407 / 0.9436 | 42.23% / 42.12% |
| 60 | 350.00 | 450.00 | 1300.00 → 1400.00 | 100.00 | 0.9595 / 0.9611 | 41.51% / 41.45% |
| 120 | 350.00 | 433.33 | 1300.00 → 1383.33 | 83.33 | 0.9675 / 0.9686 | 41.21% / 41.17% |

解除・逆入力を送ったupdateにはBOOST_ACTIVEが残り、次updateからHOLDINGを数える。70msを満たす更新時刻まで待つため、この時刻列では133.33 / 100 / 83.33msの待ちになる。係数変更ではこの待ちを短縮できない。

同初速・同strengthの200ms速度は更新頻度によらず一致したが、距離は完全一致ではない。物理stepが移動updateより先で、30Hzは同じ速度指令で2回進むため、新式の制動距離は30Hz 217.47px／60Hz 209.48px／120Hz 201.63px。通常の物理順を変更してこの差を隠していない。一連の操作では元からの加速・旋回・入力時刻量子化で初速とstrengthも異なる。

既存delta上限は0.05秒。30/60/120Hzの各deltaは上限未満なので、この比較の差は上限カットによるものではない。新式の制動だけはScene時刻の未処理区間をuntilまで使う。50ms超の描画停止でも式は期限内の時間を積分するが、途中表示が欠ける体感は本検証で合格としていない。

### 実ブラウザのキー操作

通常のChromiumループを止めず、Playwrightのブラウザキーイベントで両方式×3fixture×短/長の12条件を観測。250/1200ms押下要求→DASHと右を解除→約50ms待って左を押す時刻列で、制御タイムラインとは別試験。全ての生のキー時刻・Scene時刻・performance.now・body値を保存した。

| fixture / 押し時間 | 方式 | 開始速度px/s | 200ms付近の実時刻ms | 実速度px/s（残存率） | 逆移動開始ms | 観測Scene Hz |
| --- | --- | --- | --- | --- | --- | --- |
| baseline / 250ms | legacy | 698.93 | 200.10 | 673.92 (96.42%) | 516.80 | 59.95 |
| baseline / 1200ms | legacy | 1341.04 | 200.00 | 1301.59 (97.06%) | 533.30 | 60.00 |
| medium / 250ms | legacy | 913.75 | 200.00 | 888.25 (97.21%) | 533.40 | 60.03 |
| medium / 1200ms | legacy | 2113.24 | 200.00 | 2072.25 (98.06%) | 549.90 | 60.02 |
| deep / 250ms | legacy | 1209.21 | 200.00 | 1183.13 (97.84%) | 533.30 | 59.96 |
| deep / 1200ms | legacy | 2422.38 | 200.00 | 2380.84 (98.29%) | 550.00 | 60.00 |
| baseline / 250ms | tuned | 700.83 | 200.00 | 290.86 (41.50%) | 433.30 | 60.00 |
| baseline / 1200ms | tuned | 1326.46 | 200.00 | 549.88 (41.45%) | 516.60 | 60.03 |
| medium / 250ms | tuned | 912.05 | 200.00 | 378.39 (41.49%) | 466.60 | 59.99 |
| medium / 1200ms | tuned | 2113.20 | 200.10 | 875.74 (41.44%) | 533.40 | 60.00 |
| deep / 250ms | tuned | 1184.16 | 216.60 | 491.08 (41.47%) | 499.90 | 60.08 |
| deep / 1200ms | tuned | 2384.90 | 200.10 | 988.33 (41.44%) | 550.00 | 60.00 |

比較案のstrengthは約0.960〜0.961で、200ms付近の残存率は41.44〜41.50%。deep短押しの最初の200ms以降サンプルは216.60msであり、200msちょうどの実測とはしていない。全12条件で制動から250msまで衝突0。新式deep長押しだけ終了後の850.10ms時点でfield壁に接触したが、制動と初回逆移動（550ms）は接触前。実ブラウザの観測は約60Hzであり、実30/120Hz端末確認の代用にはしない。

### 回帰・隔離・検証コマンド

- 既存Registry 9、stats 10、候補11、追加制動unit 8、計38テストPASS。
- 制御測定162条件PASS。標準機／REGALIAの54条件の全sampleで位置・速度・ENの旧新差0。
- 全81ペアでENの時間変化の差0、Evadeの有効状態・残り時間が一致。減速の強化でEN抑制や無敵を変更していない。
- 回帰7ケースPASS。非制動UMBRA軌道の最大数値差4.55e-13、90度非発動・180度発動・弱stick0.4拒否、壁／内角非貫通、3回のboost、停止／復帰、fixture／機体／variant切替とリセットを確認。時刻同値比較だけは二進数で厳密な64Hzを使用し、物理60Hzは維持した。
- 実キー12条件と追加実キー1条件PASS。既存Preview 4context（欠損・遅延・終了を含む）、通常起動5ケースPASS。通常起動テストは合成セーブと外部遮断を使用。通常起動で試行される外部通信は遮断し、実アカウントへ接続していない。
- 隔離試走ではStorage実データ操作0、通常／Auth／ランキング入口0、外部通信試行0、未処理ブラウザ例外0。vendorの起動時storage可用性getter probeは既存の1回だけで遮断。通常起動時の公開制限も維持。
- 着手時比較で既存Sceneメソッド3151個、全機体profile、全AC preset、fixture/Preview/画像メタデータ、27 PNG hashが一致。既存Sceneメソッドの変更はstart/apply AirBrakeの2個とhelper3個追加だけ。

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check umbraDrive.js
node --check umbraDriveRuntime.js
node tests/umbra-registry.test.cjs
node tests/umbra-phase2a-stats.test.cjs
node tests/umbra-phase2a-candidates.test.cjs
node tests/umbra-airbrake.test.cjs
$env:NODE_PATH='C:\Users\akina\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:UMBRA_TEST_BROWSER='C:\Users\akina\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe'
$env:UMBRA_TEST_OUTPUT='C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-airbrake'
$env:UMBRA_BRAKE_VARIANT='legacy'
node tests/umbra-airbrake-browser.cjs
$env:UMBRA_BRAKE_VARIANT='tuned'
node tests/umbra-airbrake-browser.cjs
node tests/umbra-airbrake-regression-browser.cjs
node tests/umbra-airbrake-realtime-browser.cjs
node tests/umbra-preview-browser.cjs
node tests/umbra-normal-browser.cjs
```

初回旧式測定ではUMBRA_BRAKE_SOURCE_ROOTに着手時baselineディレクトリを指定し、そのJSをrouteで供給。新式は未指定の作業ツリーを使用。新規依存は追加せず、既存インストール済みPlaywright/Chromiumを用いた。

開始時targetSpeedの診断値を曲線のt=0へ一致させた最終版でも、tuned81条件と旧新81ペア比較を再実行してPASS。補正前のtuned測定と、速度・位置・距離・EN・Evade・時刻・回数は全て一致した。最終測定のgame.js SHA-256は `9006202881bc7831bdcff86171e8c81a505dd7699c9698ea2141a94153402f2b`。診断値だけの差分検証も同じ証跡フォルダーの `airbrake-final-tuned-verification.json` に記録した。

生データ: [旧方式81条件](C:/Users/akina/.codex/visualizations/2026/09/05/01a071c8-0738-7ea2-a8fc-0927c6aa0777/umbra-airbrake/airbrake-legacy.json)、[比較案81条件](C:/Users/akina/.codex/visualizations/2026/09/05/01a071c8-0738-7ea2-a8fc-0927c6aa0777/umbra-airbrake/airbrake-tuned.json)、[全条件CSV](C:/Users/akina/.codex/visualizations/2026/09/05/01a071c8-0738-7ea2-a8fc-0927c6aa0777/umbra-airbrake/airbrake-measurements.csv)、[実ブラウザ12条件](C:/Users/akina/.codex/visualizations/2026/09/05/01a071c8-0738-7ea2-a8fc-0927c6aa0777/umbra-airbrake/airbrake-realtime-report.json)。各条件に入力変更時刻、発動前後、待機理由、全速度/位置sample、50/100/150/200ms実時刻、距離、残速、逆移動、EN/Evade、終了理由、Scene/physics/render回数を保存している。


## 人間用の比較

現状: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBrake=legacy

比較案: http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBrake=tuned

1. 片方のURLを開き、右上の `BRAKE: 現状` または `BRAKE: 比較案（仮）` を確認する。性能の仮値表示と進行保存なし表示を維持している。
2. UMBRA、同じfixture（基礎のみ／中程度／深層向け上限）を選び、Rで開始位置・満ENへ戻す。APやEvasiveの手動追加は比較の前後で混ぜない。
3. 右方向＋Shift/Spaceでブースト。短押し約250msと長押し約1200msを分ける。DASHと右入力を解除し、左方向を保持する。Air Brakeの状態と減速、終了後の方向転換を確認する。逆入力中にDASHを押し続けるとBOOST_ACTIVEで待つ。
4. もう片方のURLへ切り替え、同じ機体・fixtureを選び直し、Rから同じ操作をする。移動中に性能を差し替えるUIはない。標準機／REGALIAは両URLとも右上が「現状」になる。
5. 横／斜め、弱いスティック、下側の壁／角も確認する。Pで停止／復帰、Rで新規試走、上部から素材Preview／検証終了へ戻れる。専用Brakeボタンや自動ブレーキは追加していない。

手動操作で250/1200msや200msの厳密一致は主張しない。精密な比較値は制御タイムラインのJSONを参照する。試走設定はRAMだけで、URLは起動時の選択。localStorage/sessionStorageへは保存しない。

## 影響・未確認・次の判断

通常移動速度、ブースト速度／初速／加速、Air Brake非発動時の旋回・滑走・摩擦、AP/AP Reinforce/Deep、EN消費・回復倍率／過熱、Evasive候補・時間・再発動規則、機体24姿勢/pivot/scale、3スキル画像、Final Raid、持続ramp設定名不一致は変更していない。新しい無敵・攻撃判定・操作ボタンはない。

保存キーの追加・変更は0。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth6+発生／リセット条件、通常HUD/Shop/Ranking、購入／クラウド／Firestore rulesは変更していない。通常HANGER公開制限と隔離試走の保存・通信分離を維持する。

未確認は人間による最終操作感、実コントローラー・実端末タッチ、Safari/Firefox、実30/120Hz表示端末、長時間の負荷／50msを超える描画停止時の体感、通常戦闘との総合バランス。実セーブ・本番アカウント・本番接続は使っていない。

次の判断は、比較案の減速が軽量機の回避操作として適切か、人間が同じfixtureで再確認すること。発動待ちや終了後の操舵がなお弱く感じられる場合は、その測定を基に別の調整対象として相談する。今回の数値達成だけで正式性能や最終合格にはしない。この補正報告で停止する。
