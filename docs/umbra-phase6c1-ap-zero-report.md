# Phase 6C1補足: RECT BODY / BOSS接触時の停止

2026-09-07。ユーザー画像ではAP 0/48、接触被弾ON、Trace RUN_EXIT、上部は試走中、全武装未取得と表示されていた。これは画像からの観察であり、errors0だけでは例外の有無を確定しない。

## 原因と修正

現行 `game.js` はPhase 6C1最終 `fda752679be2aeac231ce95edff75c0d28324983e61f56f976e75308c989717c` と一致。HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9` のまま。着手状態は `.tmp_umbra_phase6c1/ap-zero-20260907/start.json` と `baseline/` に新規保存した。

arenaの物理overlapから既存 `handlePlayerHit` → `applyDamageToPlayer` → AP0 → 隔離 `triggerGameOver` を通り、gameOver/drivePausedを立てて物理と攻撃を停止する。既存の被弾・Evasive・AP0終了仕様である。実行許可resolverは終了したrunを無効にするため、終了後HUDもそのresolverでStageを読むと、所持済み武装を未取得と誤表示していた。停止中のScene updateは通常HUD更新を行わず、上部の試走中表示も残っていた。

今回の修正は表示と終了後操作に限定した。

- 成長試走の中央に「試走終了（AP 0）」、被弾による停止、Rでの新規試験、接触OFF→リセットの手順を表示する。
- 上部HUDも終了直後に更新する。
- 終了時HUDは保持された取得記録を表示専用で読み、所持Stage/Coreを未取得と誤表示しない。戦闘の許可resolverを緩めず、ownerは従来どおり終了する。
- AP0後のPは再開扱いにしない。Rは既存の新規試験処理を使う。接触OFFだけでは死亡解除・AP回復をしない。
- 新規試験で終了表示を消し、Scene終了では既存arena UI所有配列で破棄する。新しいTimer/listenerは追加しない。

製品変更は `umbraMoonlightArena.js` と `umbraDrive.js`。`game.js` は変更した2moduleの配信版だけ、`index.html` はgame.jsの版だけを `umbra-phase6c1-ap-zero-v1` へ更新した。READMEと本報告、回帰テストを追加・更新した。AP/EN/無敵/移動/攻撃/敵の基礎性能/接触被弾の初期設定は変更しない。通常HANGER・保存・装備・Final等の許可拡張なし。

## 再現・確認

新規隔離ブラウザ、通常Boss/大矩形配置、Moon S1、baseline AP40、接触被弾ON。試験用開始点を1240,600へ揃え、ブースト前進・解除・逆方向入力を行った。元の敵HP・被弾量・900msの既存被弾後無敵を変更していない。これはユーザーの未知の入力列を完全再現した試験ではない。

修正前後とも、最初の被弾40→15では走行を継続し、次の被弾で15→0になった時点で終了した。矩形BossのHPは275、接触被弾は25。ブースト開始時のEvadeと、最初の受付時にEvadeが終了していたことも記録した。AP0後はSceneの移動更新・物理stepは止まる一方、Scene時計と別rAF callbackは進み、実Rキーで初期AP・Stageへ戻った。接触OFFの同じ前進ではAPを失わず通過した。

1280×800／740×420で同じ確認を行い、最終版は各11確認、計22確認PASS。新規の純HUD試験はS4 CONTROL／S8の取得記録が終了後も正しく表示され、実行許可getterを呼ばず、問い合わせで状態や表示オブジェクト数を増やさず、新規状態で表示が消えることを確認した。関連純試験は258/258 PASS。構文チェックとgit diff --checkも実施。狭い画面のスクリーンショットは目視確認した。実スマートフォンの可読性は未確認。

既存Core UI回帰35件もPASS。配信12ソース＋27PNGはHTTP39件のbytes/hash一致。修正前後の2画面条件で、絶対Scene起動時刻を除いた被弾行・実body座標・boost/Evade状態・Scene/物理step回数と、接触OFF通過結果が一致した。最終game.js SHA-256は `b04b8be5c048f991cb73ee748f01af385aff797d270ec86607685ab885485d3c` で、着手版からの変更はmodule配信版文字列だけである。

各隔離contextで外部要求・StorageデータAPI・通常Scene/認証/クラウド/ランキング等の入口・pageerrorは0。vendorのStorage存在probeは別記録。実セーブや本番アカウントを使用していない。以前の約66.7msのrAF開始間隔差や過去の描画外れ値とは別の現象で、今回の結果からその原因・解消を一般化しない。

## 証跡と再実行

全て `.tmp_umbra_phase6c1/ap-zero-20260907/` 配下。

- `repro-v3/ap-zero-1788785469139.json`: 修正前、実被弾終了とHUD誤表示。rAFとR操作は生きている。
- `final/ap-zero-1788785666309.json`: 修正後の22確認。前後のAP・実body座標・入力予定は同じ。
- `final/ap-zero-1280.png` / `final/ap-zero-740.png`: 終了表示。
- `pure-final-v2.txt`: 純258件。
- `core-ui/`: 既存Core選択UIの回帰結果。
- `final-audit.json`: 最終hash、配信bytes、開始時からの保護確認。

初回の再現ハーネスではresume後の入力解除がboost入力を消し、通常走行になったため修正した。次の試行は敵への既存押し出し後、次の被弾に届く前に入力を終えていたため、逆方向入力を継続する時間を延ばした。両試行はそのまま保存した。純試験の初回5失敗は表示スタブがPhaser Text.setAlignを未実装だったため、スタブへ実APIを追加して再実行した。製品の効果・被弾条件を変えて試験を通していない。

```powershell
# 新規出力先を毎回指定する。既存のNode/Playwright環境を使用する。
$env:NODE_PATH = 'C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:UMBRA_TEST_BROWSER = 'C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
$env:UMBRA_TEST_SOURCE_ROOT = 'H:/ラスメモヴァンサバゲーム'
$env:UMBRA_TEST_OUTPUT = "H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase6c1/ap-zero-rerun-$([guid]::NewGuid())"
node tests/umbra-arena-ap-zero-browser.cjs --expect-ui
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check equipmentDefinitions.js
node --check umbraDrive.js
node --check umbraMoonlightArena.js
$umbraPureTests = @(Get-ChildItem -LiteralPath tests -Filter '*.test.cjs' | ForEach-Object FullName)
node --test @umbraPureTests
git diff --check
```

ブラウザで現在のページを再読み込みすると新版が適用される。攻撃だけを観測する場合は接触被弾OFFにしてからR／上部リセットを使う。新規試験では選択・Stage・Coreも現在の比較設定に従って初期化する。commit/push/deploy、依存追加、vendor/AGENTS/画像変更は行っていない。Phase 6C2へ進んでいない。
