# 辻斬り：2秒・細長い保護帯への調整（2026-09-12）

ユーザーの「辻斬り2秒、範囲を横幅を狭く縦幅を長く」という依頼に対応した。縦横は設置時の実ブースト方向を基準とし、その方向へ長く、左右へ細くした。画面の縦横への固定ではない。初案の報告・生データを保持し、今回の記録は別に保存した。人間の再確認前の比較設定であり、正式性能・全条件の最終合格とはしない。

## 変更値

| 項目 | 変更前 | 今回 |
|---|---:|---:|
| 辻斬りの保護時間 | 最大3秒 | **最大2秒** |
| 左右の全幅 | 360px | **240px** |
| 中心線から片側 | 180px | **120px** |
| 設置点から前方 | 1440px | **1800px** |
| 設置点から後方 | 120px | 120px |
| 前後の全長 | 1560px | **1920px** |

左右幅は約33%縮小、前方長は25%拡大。ブーストボタンを押した時点ではなく、従来と同じNOVA正常設置時点から通常進行中の2秒を数える。位置・向き・長さは設置時に固定され、旋回やカメラへ追従しない。期限・範囲外で保護が終了し、再進入による延長はない。

NOVA本体の設置寿命は3秒のままなので、**2秒で保護帯が消えてからも、残り1秒は従来の範囲で放電する**。円形比較 `novaField=1` の半径180px・最大3秒も維持した。

## 実装と保護した範囲

`game.js` は `UMBRA_TSUJIGIRI_TRIAL_SETTINGS` の1行だけを変更。lane専用に `novaFieldDurationMs: 2000` を追加し、前方長と半幅を変更した。実行中Contextが明示laneの場合だけ既存helperが適用する。判定、Graphics、残り時間表示、カード詳細は同じ設定値を参照するため、別の判定・描画処理は追加していない。

- `umbraIntegrationBootstrap.js`：laneの上部表示を2秒に変更。
- `umbra-integration.html`：laneの選択肢を2秒に変更し、変更したスクリプトのURL版番号を更新。
- `README.md`：現行比較値と本体寿命との違いを記載。
- `tests/umbra-tsujigiri-config.test.cjs`、`tests/umbra-tsujigiri-field.test.cjs`：既存の設定・カード・形状・期限・複数帯・攻撃維持テストを新値へ更新。
- `tests/umbra-tsujigiri-browser.cjs`、`tests/umbra-mobility-browser.cjs`：laneの期待時間・形状・表示のみ更新。円形の期待時間は維持。
- 本報告を新規追加。

移動、Air Brake tuned、EN、Evasive、AP、MOONLIGHTの攻撃／再命中履歴、NOVAの攻撃／再生成、SPIKE、Stage／Mutation、敵、物理stepは変更していない。保存キー追加なし。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth条件・リセット、Shop、Rankingにも変更なし。通常公開・購入・保存には接続していない。既存のrun／Depth／body／slot失効時の解除と清掃は維持。

## 検証

構文チェック：`node --check game.js`、`skillDefinitions.js`、`stageDefinitions.js`、`umbraIntegrationBootstrap.js`、変更した4つのテスト／ハーネス。`git diff --check` にエラーなし。既存CRLF方針の警告はある。

`node --test tests/*.test.cjs`：**493/493 PASS、失敗0、skip0**。このうち辻斬りの設定・境界17件を確認した。

- 軸方向・斜め方向・角を含めた前1800／後120／左右120の内外判定。
- 1999msで保護あり・残り1ms、2000msのpreupdateで保護終了し接触ダメージを受付可能。
- 2000msでもNOVA本体はDEP・放電を継続。2999msもDEP、3000msで従来の再生成へ移る。
- 最大3帯の期限は独立。重なりで時間・幅・枠数を加算しない。
- OFF／円形／laneを6秒・600ステップ比較し、実敵HP、放電受付、攻撃期限、DEP終了、再生成が一致。2秒時点では円形だけ保護が続く。
- lane以外、既存機体、保存・通信隔離の回帰を維持。円形カードは3秒、laneカードは2秒・幅240px。

### ブラウザ機能確認

Chromium Headless Shell 148.0.7778.96、合成Relay20、MOON S1／NOVA S1／Evasive0。元の辻斬りハーネスを用い、円形／laneの各通過攻撃と制動中接触を、4つの新規Contextで順番に測定。**4/4ケース、93/93項目 PASS**。ページエラー、コンソールエラー、実StorageデータAPI利用、外向きAPI要求は0、全ケース隔離確認PASS。

同じ初期fixture・敵配置・入力列を各比較で確認した。右＋Shift30step→右1→左7→接触窓として左1→左12→入力なし6、60Hzの既存Game.step計57回・約950ms。設置後の観測終点は約916.667ms。スクリーンショットとJSON生成は走行測定後。性能測定や通常rAFでの長時間試験ではない。

| 観測 | 円形3秒 | 細長い辻斬り2秒 |
|---|---:|---:|
| 通過時のMOONLIGHT受付 | 3体 | 3体 |
| 設置点から終点の前方成分 | 944.401px | 944.401px |
| 終点の横成分 | 99.235px | 99.235px |
| 終点での保護 | なし | あり |
| 保護された制動サンプル | 0/14 | 14/14 |
| 通過試験AP | 284→284 | 284→284 |
| 通過試験EN | 235→205.59625 | 235→205.59625 |
| 別試験：制動中の接触callback | 4回 | 4回 |
| 別試験：接触被ダメージ受付 | 1回、AP284→175 | 0回、AP284→284 |

通過攻撃と、到達位置にnative敵を生成した接触受付の試験は別Context。実敵のHP、攻撃回数、接触ダメージ、移動・物理設定は変更していない。終点でも速度は残っており、完全停止・反転の成功とは扱わない。

描画を画像で確認し、幅の狭い保護帯、方向矢印、上部の2秒表示を確認。FX OFFでも帯の描画と保護が残る。ブラウザ試験は約917msの設置後区間であり、2秒境界と最遠端の検証は上記の関数テストによる。

## 保存した証拠

開始HEAD：`28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始時はPhase 1以降の作業を含むdirty treeであり、既存変更を保持した。

- 開始 `game.js` SHA-256：`6eea84d8eafdbaa1a1be0b44b12af7fe233f0c9c90d27aa11974ae00861e4408`
- 変更後 `game.js` SHA-256：`14137922f5964a86b1f120187e6bb005a4b008f10a00231d595daf6bcc494b12`
- 今回のbrowserハーネス SHA-256：`e1d347a5f2dcc7ebde4f4d6e8db65ce0f038126d7487c111adca2e837cdfef50`
- 証拠：`.tmp_umbra_tsujigiri_adjustment/2026-09-12-start/`。開始時183ファイルのコピーとhash、HEAD/status、凍結したブラウザ入力ソース、`pure-all.txt`、`browser-first/report.json`、ケース別生データ、スクリーンショット、`syntax.json`、`delivery.json`を保存。
- 開始時183ファイル中175ファイルはSHA一致。変更は上記既存8ファイルだけ。`game.js` は定数1行を置換した内容と全体が一致し、関数本文の変更はない。既存報告、vendor、素材は変更対象としていない。
- ローカル4173配信のgame／bootstrap／HTMLは、ブラウザが試験した凍結ソースとSHA一致。

commit、push、deploy、reset、clean、依存追加、AGENTS変更は行っていない。

## 人間の確認URLと残る確認

`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=lane`

ページ全体を再読み込みし、上部に「辻斬り・前方の保護帯・2秒」と表示される新規試験を開始する。MOONLIGHT＋NOVA取得後にブーストして、細い帯に沿った通過・離脱と、2秒後の保護終了を確認する。画面内の同runを継続したまま新性能へ差し替える変更は行っていない。

今回の代表試験では横成分99.235pxが半幅120pxに収まった。より大きな横ずれや旋回では帯外へ出るため、新しい幅と2秒が人間操作で適切かは再確認が必要。S8の連続設置による実戦保護率、長時間プレイ、全Boss、スマートフォン／ゲームパッドは今回追加確認していない。今回の調整と報告で停止する。
