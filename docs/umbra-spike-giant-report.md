# BLOOD SPIKE LV8：巨大な角と比例範囲の調整（2026-09-14）

ユーザーの「地中から突き上げる迫力のある巨大な角にし、LV8でボス級の大きさと比例した巻込範囲へ変更する」という依頼を実装した。LV8はBLOOD SPIKE自身のStage8を指す。プレイヤーLvやDepthで自動拡大する処理は追加していない。

## 現状の原因と変更

旧実装では主攻撃半径だけがStageに応じて80→160pxへ成長し、角画像・簡易角・地面の発光楕円は全Stageで固定寸法だった。今回、戦闘表示を生成済みcastの半径÷80に連動させた。Stage8の半径のみ160→240pxへ変更し、S1比3倍の角と巻込半径を揃えた。

| Stage | 主半径（変更後） | 角・発光のS1比 |
|---|---:|---:|
| 1 | 80px（維持） | 1.0 |
| 2 | 90px（維持） | 1.125 |
| 3 | 100px（維持） | 1.25 |
| 4 | 110px（維持） | 1.375 |
| 5 | 122px（維持） | 1.525 |
| 6 | 135px（維持） | 1.6875 |
| 7 | 147px（維持） | 1.8375 |
| 8 | **240px（旧160px）** | **3.0** |

S8の主攻撃直径は480px。旧S8比では半径1.5倍、円の面積2.25倍になる。画像は旧S8でもS1と同じ寸法だったため、見た目の旧S8比は3倍。比較の基準を混同しない。

実Phaserのframe2画像寸法はS1が約206.34×148.86px、S8が約619.02×446.57px。通常Crack Bossの640px画像×0.51×通常Elite倍率1.34は約437pxであり、角の高さがボス級となる。画像寸法には透明余白を含み、攻撃判定そのものではない。可視範囲と地面の主判定は同じ座標縮尺のスクリーンショットでも確認した。簡易角の最大高は115→345px、底辺幅76→228px。

角は従来の地面pivotから上へ伸びる。元PNG、8つのframe矩形、pivot、圧縮補正、200msの突き上げ、8コマ・800msの寿命は維持。新しい画像は生成・加工していない。主判定の地面円と、画像内の火花や角の輪郭は別であり、画像の透明余白を命中半径に加算しない。

## 変更ファイルと影響

- `skillDefinitions.js`：SPIKE S8の主半径160→240の1値。S1〜7、他スキル、変異定義は維持。
- `umbraPresentation.js`：cast半径から表示倍率を固定し、画像XY倍率、簡易三角形、発光楕円へ適用。診断なしでも出る地面円は従来どおりcast半径を使用。画像・簡易・FX OFFの戦闘結果は同一。
- `game.js`：成長カードに巨大な角・比例成長・次cast反映を記載。旧SINGULARITYカードにも実処理と同じ共通helperを使い、半径上限200の表示を修正。表示moduleのcache版番号を更新。攻撃受付・移動処理の変更なし。
- `index.html`、`umbra-integration.html`：変更したskillDefinitions/gameのcache版番号を更新。旧成長試走と未公開通常Sceneの双方へ確実に反映するため。公開フラグ、保存・購入経路は変更なし。
- `README.md`：現行寸法と当初の固定表示からの変更を記録。本報告を追加。
- 既存の成長・Core・Final・TRIAD・装備・カード・表示テスト11ファイルと、成長ブラウザハーネス2ファイルの期待値を更新。`tests/umbra-spike-giant-browser.cjs`を追加。

強化前に生成済みのcastは旧位置・半径・時刻・表示倍率を保持し、次castから新値になる。1castにつき各敵最大1回の受付、LOS、探索距離600、単体威力、周期、同時cast上限3は維持。SINGULARITYは既存のcast半径参照と最大200pxの規則を維持するため、S8では上限200に達する。TRIADなしの旧160からは領域が200へ広がるが、240にはならない。PRISMの分岐距離・回数やEXECUTIONの倍率は変更しない。

辻斬りの2秒／幅240／前1800／後120、MOONLIGHT、NOVA、Air Brake、移動・EN・Evasive・APに変更なし。保存キー追加なし。GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、Depth条件・リセット、Shop、Ranking、通常公開への影響なし。Final Raid・vendor・AGENTS.mdは変更していない。

## 検証結果

`node --check game.js`、`skillDefinitions.js`、`stageDefinitions.js`、`umbraPresentation.js` と新ハーネス：通過。`git diff --check`：エラーなし（既存のCRLF方針による警告あり）。

`node --test --test-reporter=tap tests/*.test.cjs`：**496/496 PASS、失敗0、skip0**。

- S7→8の途中で既存cast半径147・地面位置・200ms突き上げ・800ms寿命・次回生成期限が変わらない。
- 次castの半径240で、敵bodyが境界に接する場合は命中し、0.01px外は命中しない。敵の配列重複があっても1lifeにつき1回。
- S1／S7／S8、8コマ全ての画像・簡易・画像欠損fallbackの寸法、地面pivot、発光、FX OFFと破棄を確認。物理body追加なし、snapshotへの表示側変更なし。
- 新旧カードで主半径240と副領域200を区別。S7→S8の主半径差分+93pxを表示。
- 過去Phaseとのソース同一検証は、承認されたS8半径1値だけ変換し、残る全文の一致を維持。
- PRISM検証の敵配置は、拡大した主範囲へ従来の副対象が入ってしまうため、主・副の役割を維持する位置へ変更。製品の敵数・HP・命中対象は削減していない。

### 実ブラウザ

新規ハーネスをChromium Headless Shellで直列実行。S1／S8 × 画像／簡易／FX OFFの**6/6ケース、78/78項目 PASS**。各StageのFX3モードの攻撃・HP損失・Scene更新数・物理step数一致も2/2比較で通過。全Contextで外部要求0・ページエラー0・保存隔離確認PASS。

同じ7体の実敵を、cast中心からbody最近距離0／79／81／159／161／239／241pxへ配置した合成機能試験。既存の標準HPとダメージ受付を使用し、敵bodyだけ10×10の矩形にした明示的な境界fixture。無入力、同一カメラ、既存固定60Hz・Game.stepを使用。検証開始時に対象Stageを直接初期化したもので、自然成長の証拠ではない。

| 観測 | S1 | S8 |
|---|---:|---:|
| 主半径 | 80px | 240px |
| 命中数 | 2体 | 6体 |
| 各対象の基礎HP減少 | 5 | 5 |
| 半径外241pxの敵 | 無傷 | 無傷 |
| cast／impact／期限終了 | 各1回 | 各1回 |
| 他武装による受付 | 0 | 0 |
| 全体のScene更新／物理step | 58／58 | 58／58 |

発生後200msの実impact、8コマ、800ms後の期限終了と表示破棄を確認。端数を含む時計は生データを保持。画像比較は制御Game.stepを停止したframe2で取得した機能確認であり、スクリーンショット取得を挟むため通常rAFの性能測定ではない。ボスは既存画像を通常表示倍率で置いた非物理の比較展示であり、ボスとの実戦ではない。

初回ブラウザは6ケースとも時刻比較の1項目で失敗した。実値が `199.99999999999997ms` のため、ハーネスの厳密な `=== 200` が失敗していた。他の寸法・受付は通過。製品時計を変えず、比較許容差を1e-7msとし実値も記録した2回目で通過した。初回原本を残している。

初回の純粋テストではSINGULARITYの旧カード表示240と実領域200の不一致を検出し、共通helperへの表示接続後に通過。過去半径の期待値と副対象fixtureの更新も別に記録し、初回ログを削除していない。

## 証拠と操作

開始HEAD：`28cfe5ab71048b0487254dceef6f66f3a25788f9`。作業開始時のdirty treeと184ファイルのhash・コピーは `.tmp_umbra_spike_giant/2026-09-14-start/` に保存した。過去の報告や生データは上書きしていない。

- 変更後game SHA-256：`12c2f7521a2eba275535a6dbc7dce3a0e7ad0461fefe0979ca3b111fd483eca0`
- skillDefinitions：`0ee3dd7e029b74d56cf5e51e2e374ae1bc51aa6b33e848d54986728aa1edd6d0`
- umbraPresentation：`2b099fcbb71230f8d6a184b6a4684b6a4dbafba2efa5a66cbc742f2d7ddaf409`
- `targeted-tests-first.txt`／`targeted-tests-second.txt`、`pure-all-first.txt`／`pure-all-second.txt`、`pure-source-hashes.json`。
- `browser-first/`／`browser-second/`：ケース別生データ、report.json、ハーネス、比較スクリーンショット。
- `delivery.json`：最終変更一覧・hash・凍結した検証ソースとローカル配信の一致確認。

通常試走は同じURLをページ全体から再読み込みして新規開始する。

`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=lane`

すぐに寸法を確認する場合は `http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraGrowth=1` の「新規比較 S8／リセット」を使用できる。こちらは旧成長試走の合成S8であり、通常プレイの成長とは区別する。

通常SceneとDriveは同じ描画・攻撃helperを使用する。今回のブラウザ6ケースはDriveの合成境界であり、Relay20通常Sceneの長時間実戦、S8＋全変異・装備での巻込頻度、GPU負荷、スマートフォンの操作感・遮蔽感は未確認。範囲面積が旧S8の2.25倍になるため、正式なバランス合格は人間の再確認後とする。

commit、push、deploy、依存追加、実セーブ・本番アカウント利用は行っていない。今回の巨大化調整と報告で停止する。
