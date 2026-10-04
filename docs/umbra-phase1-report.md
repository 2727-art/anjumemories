# KGK-02 UMBRA SERAPH — Phase 1 実装・検証記録

対象: `H:\ラスメモヴァンサバゲーム`。作業開始時HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`、作業ツリーはcleanでした。AGENTS.md/README.mdを再確認して実装しました。commit/push/deployは行っていません。

2026-09-06追記: ユーザー提供の圧縮版27PNGへ差し替えました。BLOOD SPIKEのみ実寸が2048×682へ縮小されていたため、ユーザー確認後に矩形・基準点と縦横表示倍率を補正しました。下記はPhase 1初期実装の記録で、差し替え後の最新寸法・ハッシュ・軽量化結果は [素材記録の圧縮版追記](umbra-phase1-assets.md#圧縮版への差し替え2026-09-06) を参照してください。

## 1. 変更ファイル

| ファイル | 変更概要 |
|---|---|
| `game.js` | 検証機体登録、明示3スキル表、通常公開制限、Previewの早期起動分岐、既存の表示関数を検証Sceneへ接続 |
| `skillDefinitions.js` | 新3スキルの表示専用metadata。`previewOnly:true`、`behavior:"displayOnly"`、`stages:[]` |
| `umbraPreview.js` | 検証専用の素材ロードScene・表示Scene・終了Scene。通常保存/認証Sceneを作らない |
| `umbraPreviewAssets.js` | 24姿勢の表示補正、3シート×8矩形・基準点・順番、物理オブジェクトを変更しない表示helper |
| `index.html` | 変更したgame/skillDefinitionsのURL版だけ更新。旧キャッシュとの混在防止。Phaser読込構成は維持 |
| `README.md` | 検証専用であること、ローカルURLと操作、素材の限界を追記 |
| `tests/umbra-registry.test.cjs` | 3枠・候補・初期状態・通常公開制限・保存allowlist・通常preloadの8回帰テスト |
| `tests/umbra-preview-browser.cjs` | 隔離ChromiumでPreviewの保存/通信/姿勢/フレーム/欠損/再起動/遅延完了を確認 |
| `tests/umbra-normal-browser.cjs` | 隔離Chromiumで通常HUB/既存機体出撃/公開制限/Previewからの通常復帰を確認 |
| `docs/umbra-phase1-assets.md` / 本ファイル | 原本ハッシュ、24姿勢の補正、24矩形の記録と検証報告 |
| `画像/player/KGK-02_UMBRA_SERAPH/` | 提供PNG27枚を無加工でコピー |

AGENTS.md、stageDefinitions.js、equipmentDefinitions.js、style.css、firestore.rules、vendorは変更していません。npm/bundler/TypeScript/追加ライブラリは導入していません。

## 2. 実装範囲と除外範囲

実装したのは、通常保存を使わない検証入口、検証機体登録と3枠管理、24姿勢、3スキルの8フレーム表示です。初期取得表示はMOONLIGHTのみで、各スキルの取得/未取得表示は一時メモリ上で切り替えます。

新スキルは実戦のStageを持たず、通常の候補・初期スキル生成・攻撃実装判定を通りません。旧周回球/雷撃へのfallback、ダメージ、撃破、報酬は発生しません。

AP/速度/EN/無敵/パッシブ重み、正式Stage成長、Mutation、TRIAD、OVERLIMIT、攻撃用移動区間、実戦NOVA状態機械、正式販売、購入journal、クラウドschema/Rules、Final Raidは未変更です。UMBRAのprofileは中立値であり正式性能ではありません。販売仕様は採用済み、正式販売処理は未実装です。Depth10 Final Raid討伐後に確定GEEK 10,000,000で購入可能、一度購入すれば永続所持、切替無料、死亡で所有権を失いません。今回のPhase 2Aでも購入・所有保存・通常公開は実装しません。

## 3. 機体別3スキルの接続

| 機体 | 明示された3ID |
|---|---|
| defaultBear | basicSkill / tornadoSkill / rabbitThunderSkill |
| regaliaBastion | regaliaBastionCannon / tornadoSkill / rabbitThunderSkill |
| umbraSeraph | umbraMoonlight / umbraBloodSpike / umbraPhantomNova |

`PLAYER_MECH_SKILL_SLOT_IDS` → `getPlayerSkillSlotIds()` を、初期スキル解決、利用可否、候補列挙、HUD、初期化、成長余地判定が使う候補、debugMaxBuildへ接続しました。定義順や先頭3件では決めません。通常の抽選方法、最大2スキル＋パッシブ、既存攻撃ID、REGALIA砲の装備対象は維持しています。

Mutation/Archiveの許可表とAtlasの機体一覧は既存のまま別管理です。3機体の表示用ID表を永続保存の許可表へ流用していません。

## 4. 公開制限と保存・通信隔離

通常処理は `isPlayerMechReleased()` で `previewOnly` 機体を拒否します。HANGER列挙、Shop正規化、所有判定、解放判定、購入実行、選択実行、HANGER handler、debugPlayerMech、run snapshotとruntime機体取得に適用しています。

`?umbraPreview=1` の判定は通常モバイル開始ゲート/Scene作成より前です。トップレベルにあった会話debugの保存変更helperもPreview中は呼びません。他のdebug queryが同居しても同じ分岐です。Previewは `SurvivalScene.init/preload/create/createState` を呼ばず、localStorage/sessionStorage、Firebase、Google/匿名認証、クラウド、ランキングを初期化しません。

素材ロードは常駐の `UmbraPhase1Assets` だけが所有し、表示Sceneのrestart/終了でLoaderを使い回しません。表示Sceneは通知購読をshutdownで解除します。終了後の遅延完了はTextureとロード状態だけを更新し、破棄済み表示を参照しません。再表示は登録済みTextureと各シートの8frameを再利用します。

新規保存キーはありません。GEEK/ANJU MEMORY/LOST ARMS/DATA CACHE/OVERDRIVE/STABILIZE、Depth6+の発生・リセット条件、Shop通貨・装備・Support・Robot・Ranking処理の変更はありません。Previewの取得表示・再生・姿勢は再起動/終了で破棄します。

## 5. 配置素材

`character/` の24枚は角度 `000, 45, 90, 135, 180, 225, 270, 315` の各 `KGK_<角度>.png`、`KGK_<角度>_MOOVE.png`、`KGK_<角度>_BOOST.png` です。方向は下、左下、左、左上、上、右上、右、右下。

`skilleffect/` は `MOONLIGHT.png`、`bloodspike.png`、`nova.png` の3枚です。元ファイルを変更・削除・リネームせず、全27枚のSHA-256一致を確認しました。各実ファイル名とハッシュは [素材記録](umbra-phase1-assets.md) にあります。

## 6. 基準点・矩形・再生

24姿勢それぞれに胴体pivot、origin、表示scale、offsetを定数化しました。翼/噴射を含む画像全高では合わせず、胴体を目視較正しています。`applyPose()` はbody付きオブジェクトを拒否し、既存hitbox半径22は不変です。

Previewは既存の `setPlayerRobotPose` / `updatePlayerRobotMotion` / `createAcAfterimageObject` を限定的に呼び、通常機体へUMBRA補正を混ぜません。方向・停止/移動/ブースト切替、傾き・残像、基準点表示を確認しました。画像が説明や操作を覆う初版の配置を調整し、最終スクリーンショットで再確認しています。

| 素材 | 原寸 | 明示分割 | 確認用再生 |
|---|---:|---|---|
| MOONLIGHT | 1774×887 | x: 0/444/887/1330/1774、y: 0/444/887 | 10fps、1回 |
| BLOOD SPIKE | 2172×724 | x: 0/543/1086/1629/2172、y: 0/392/724 | 10fps、1回 |
| NOVA | 1774×887 | x: 0/444/887/1317/1774、y: 0/468/887 | 8fps、ループ |

全24コマで登録された矩形がmetadataと一致し、画像範囲内であることを確認しました。Moonlightは命中中心、Spikeは地面の接地点、Novaは球中心を使用し、コマごとの自然な膨張・収縮は共通scaleで残しています。確認用再生速度は攻撃周期ではありません。

限界: 元シート境界にはalpha1〜7/255の極薄粒子が残り、完全透明の分離線ではありません。重要な本体・角先端・明るい発光の切断や明瞭な隣コマ混入は目視/画素検査で認めませんでした。NOVAのframe8→frame1は球中心を揃えてループしますが、外炎の形・位相は一致せず、完全にシームレスとはしません。MOONLIGHT消散コマの基準点は核が弱まるため目視推定を含みます。画像の再描画・色/alpha変更は行っていません。

## 7. 検証結果

構文チェックと `git diff --check` は合格です。GitのLF→CRLF案内のみで、空白エラーはありません。

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check equipmentDefinitions.js
node --check umbraPreview.js
node --check umbraPreviewAssets.js
node tests/umbra-registry.test.cjs
git diff --check
```

Registry回帰は8件合格。ブラウザではPreview正常/部分欠損/全欠損/遅延完了の4contextと、通常側5ケースが合格しました。インストール済みのPlaywrightとChromiumを使用し、毎回新規contextを作成して、ローカルorigin以外の要求はrouteで遮断し記録しています。実ユーザーのプロファイルや保存を使っていません。

- Preview正常、既存保存変更debugとの同時指定、取得表示切替、24姿勢、24frame、2種類の1回再生とNOVAの8→1ループを確認。
- 再起動後のGameObject数・keydown listener数・素材通知listener数が安定。27画像の要求は初回27件だけ。
- 一部3画像404、全27画像404でもfallbackとキー操作が機能し、例外なし。
- 1画像の応答を保留したまま表示Sceneを再起動・終了し、終了後に応答を開放。旧表示への参照エラーなし。再表示時の画像再要求なし。
- 各Previewケースの保存領域全体を前後比較して一致。Storage get/set/remove/clear/key呼び出し0、通常Scene/Cloud/Firebase/Ranking入口呼び出し0、外部要求0、pageerror0。
- 通常HANGERは標準/REGALIAの2機体。UMBRAの購入/選択handlerはfalseで、Shop状態・通貨・保存領域に変更なし。
- 通常標準/REGALIA出撃で、初期スキル・3枠HUD・Opening Boost開始と物理pauseを確認。旧debugでUMBRA指定しても標準機へ戻り、通常のUmbra素材/module要求は0。
- REGALIAは通常HANGERからの選択→通常出撃も別途確認しました。新規contextの合成所有データだけを使い、実画像 `player-mech-regalia-bastion-down-idle` と `REG S1 / TND -- / RBT --` のHUDが表示されました。
- 同じ新規contextでPreviewの3スキルを取得表示にして終了し、通常ゲームボタンで通常起動。fixture再投入なしで標準機・basicSkillのみになり、検証状態の持越しなし。

通常起動では既存Firebase SDK取得の開始要求が記録され、外部routeで遮断されています。この通常ゲームの挙動を、Previewの「通信入口0/外部要求0」の証拠と混同していません。

既存REGALIA debug overrideでは、HUBで選択中の標準機画像がOpening Boost開始直後まで表示される順序がありました。これは通常HANGER選択経路のREGALIA表示とは分けて記録しています。今回この既存debug表示順序は変更していません。

再現用ブラウザ試験（既存の実行環境を指定。ライブラリ/ブラウザの新規インストールは行わない）:

```powershell
$env:NODE_PATH='C:\Users\akina\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:UMBRA_TEST_BROWSER='C:\Users\akina\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe'
$env:UMBRA_TEST_OUTPUT='C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase1'
node tests/umbra-preview-browser.cjs
node tests/umbra-normal-browser.cjs
```

未確認: 実機スマートフォンのタッチ操作、Safari/Firefox、低メモリ端末、長時間の実戦やDepth6+/Final Raid/抽出全分岐、本番サービスの接続。今回変更していない機能の網羅的な実戦回帰は行っていません。

## 8. 人間用の起動・操作

```powershell
Set-Location -LiteralPath 'H:\ラスメモヴァンサバゲーム'
python -m http.server 4173 --bind 127.0.0.1
```

`http://127.0.0.1:4173/?umbraPreview=1` を開きます。同じ4173サーバーが動いている場合は新しく起動する必要はありません。

| 操作 | キー / 画面操作 |
|---|---|
| 方向 / 状態 | 方向ボタンまたは←→ / 1停止・2移動・3ブースト |
| 基準点と当たり判定 / 一覧 | H / Gで8方向、Vで8コマ |
| 傾き・浮き上がり / 残像 | M / T |
| スキル選択 | 右側の3スキルボタン |
| コマ送り / 再生・停止 | [ と ] / Space |
| 取得・未取得表示 / 欠損表示 | U / F |
| 再起動 / 検証終了 | R / Escape |

終了画面の「通常ゲームを開く」は通常URLへ遷移する明示操作で、そこから通常の保存・認証・通信初期化が始まります。

## 9. スクリーンショット・通信/保存記録

出力先: `C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase1\`

- `mech-idle.png` / `mech-move.png` / `mech-boost.png`: 各状態の表示画面。
- `mech-eight-idle.png` / `mech-eight-move.png` / `mech-eight-boost.png`: 8方向×3状態。
- `mech-motion-afterimages.png`: 既存の傾き・残像関数を通した表示。
- `effect-eight-umbraMoonlight.png` / `effect-eight-umbraBloodSpike.png` / `effect-eight-umbraPhantomNova.png`: 各8コマ。
- `missing-partial.png` / `missing-all.png`: 実際にローカル応答を404にした試験。
- `hud-default.png` / `hud-regalia.png`: 既存機体HUD。Opening Boostはpauseを保ち、撮影時だけ選択overlayの見た目を隠しています。
- `browser-report.json`: 各Previewの全request記録、合成保存fixtureの前後値、入口/Storage呼び出し、エラー記録。
- `normal-report.json`: 通常側の公開制限、初期スキル/HUD、要求記録、通常復帰の結果。

## 10. Phase 2前の残課題

Phase 2A依頼時点で、ユーザーは現在の24姿勢とスキル表示を目視確認し、問題なさそうとの判断を示しました。現在の表示を基準として維持します。これは実戦サイズ・攻撃判定・低AP・高機動・スマートフォン性能の承認とは区別します。

今回の実装は検証専用です。性能・攻撃・成長・保存/販売の後続実装は行わず、Phase 1の報告で停止します。
