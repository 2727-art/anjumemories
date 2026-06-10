# ラスメモヴァンサバゲーム

Phaser 3 製のブラウザ向け 2D サバイバルゲームです。ビルド工程はなく、`index.html`、`vendor/phaser.min.js`、`skillDefinitions.js`、`stageDefinitions.js`、`game.js` をローカル HTTP サーバーで配信して動かします。

プレイヤーはスキル、パッシブ、サポート攻撃、随伴ロボット、LOST ARMS を強化しながら敵を倒し、XP と未確定 GEEK を集めます。2 分ごとに出現する Stage Gate では、Depth を上げて続行するか、未確定 GEEK を確定して帰還するかを選びます。

## 起動方法

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

起動後、ブラウザで以下を開きます。

```text
http://127.0.0.1:4173/
```

このリポジトリはビルドなしの静的構成です。`file://` 直開きは画像、音声、Phaser の読み込みで不安定になる可能性があるため、ローカル HTTP サーバー経由で確認してください。

LAN 上のスマートフォンで確認する場合は、PC とスマートフォンを同じネットワークに接続し、PC の LAN IP に対して HTTP サーバーへアクセスします。

## 操作方法

- 移動: `WASD` / 矢印キー / 左仮想スティック
- DASH: `Shift` / `Space` / 右 DASH ボタン
- レベルアップ選択: クリック / タップ / `1` `2` `3`、Opening Boost +1 使用時のみ `4`
- Gate 選択: クリック / タップ / `1` `2`
- ランキング入力: 名前入力後 `Enter`
- ゲームオーバー後: `R` または `Enter` でショップへ戻る

## スマートフォン対応

スマートフォンで接続すると、開始前に横向きフルスクリーン開始ゲートが表示されます。対応ブラウザではフルスクリーン化と画面向きロックをリクエストし、未対応環境では通常表示で開始できます。

スマートフォンのショップ帰還ではページリロードを避け、同じページ内で Opening Shop へ戻ることで横向きフルスクリーンを維持します。ブラウザ制限などで帰還処理中またはショップ上でフルスクリーンが解除された場合は、横向きフルスクリーン復帰ゲートを表示し、タップ操作で再度フルスクリーンと画面回転をリクエストします。端末側の制限でページ再読み込みへフォールバックした場合も、以前に横向きフルスクリーンを選んでいれば開始ゲートをスキップせず再表示します。

モバイル操作は左側の仮想スティックと右側の DASH ボタンです。ショップ、開始前強化、Gate 選択、ランキング入力もタップ操作に対応しています。

クエリパラメータ:

- `?mobileGate=1`: PC ブラウザでもスマートフォン開始ゲートを表示します。
- `?mobileGate=0`: スマートフォン開始ゲートを無効化します。
- `?mobileControls=1`: PC ブラウザでもモバイル操作 UI を表示します。
- `?mobileControls=0`: モバイル操作 UI を無効化します。

## ゲーム進行

1. Opening Shop の `CDSHOP`、`GEEKSHOP`、`ROBOT CUSTOM`、`ANJU MEMORY` で CD、BGM、永続強化、ロボット系解放を購入または選択します。
2. `GAME START` で出撃し、Opening Boost として開始前に 3 回ぶんの強化を選択します。ANJU MEMORY の +1 チケットを持っている場合、最初の Opening Boost だけ 4 択になります。
3. 敵を倒して XP、未確定 GEEK、Support、Robot、LOST ARMS アイテムを集めます。
4. レベルアップ時はスキル解放、スキル強化、パッシブ強化から 3 択で 1 つ選びます。
5. 各 Depth の開始から 120 秒で Stage Gate が開きます。
6. Stage Gate では次の Depth へ進むか、未確定 GEEK を確定してショップへ帰還します。
7. `NEXT STAGE` / `FORCE BREAKTHROUGH` で次 Depth へ進むと、地面に残った一部報酬が DATA CACHE に圧縮されます。
8. 帰還、ゲームオーバー、Gate 崩壊後はローディング表示を挟んで Opening Shop に戻ります。

## GEEK 仕様

`GEEK` はゲーム内通貨です。

- 確定 GEEK: ショップで使用できる所持通貨です。
- 未確定 GEEK: ラン中に獲得し、帰還するまで確定しない通貨です。
- HUD には未確定 GEEK、GEEK 係数、Depth、Gate 残り時間が表示されます。
- 通常 `EXTRACT` では未確定 GEEK の 100% が確定 GEEK になります。
- 通常ゲームオーバー、Depth 5 までの Gate 崩壊では未確定 GEEK を失います。
- Depth 6 以降の不安定 Gate では、緊急脱出時に未確定 GEEK の一部だけを確定できます。

Depth 6 以降では `GEEK MILESTONE BONUS` が解禁され、Depth / 不安定度 / ANOMALY CONTRACT の既存 GEEK 係数に加算されます。これはラン中に獲得する未確定 GEEK の補正であり、確定 GEEK、ショップ通貨、`lastmemoVansabaCoins` を直接増やすものではありません。

GEEK MILESTONE BONUS:

- Depth6 `DEEP SIGNAL`: GEEK 係数 +0.15
- Depth8 `VOID RESONANCE`: GEEK 係数 +0.30
- Depth10 `ANJU MEMORY FIELD`: GEEK 係数 +0.50
- Depth12 `SINGULARITY GATE`: GEEK 係数 +0.75
- Depth15 `LASTMEMO DEEP CORE`: GEEK 係数 +1.10

節目ボーナスは到達済み最大節目だけが有効です。Depth10 では +0.50 が適用され、Depth6 / Depth8 の値をさらに足しません。`ANJU MEMORY FIELD` は名称上の演出で、ANJU MEMORY 通貨を直接増やす効果ではありません。

適用対象は Bronze / Silver / Gold の未確定 GEEK 成分に加え、OVERDRIVE / STABILIZE overflow、DEPTH DIRECTIVE、NEMESIS BOSS、LOST ARMS RESONANCE overflow など `scaleRunCoinReward()` 経由で計算されるラン内未確定 GEEK 報酬です。DATA CACHE は生成時点で milestone 込みの絶対値 payload を持つ場合のみ反映され、回収時には再計算しません。

互換性維持のため、確定 GEEK の localStorage キー名は `lastmemoVansabaCoins` のままです。

## アイテムと報酬

通常アイテム:

- XP オーブ: XP のみを獲得します。
- Bronze: 10 XP / 基礎 100 GEEK を獲得します。
- Silver: 20 XP / 基礎 1,000 GEEK を獲得します。
- Gold: 38 XP / 基礎 3,000 GEEK を獲得します。
- DATA CACHE: Depth 遷移時に残った XP / 未確定 GEEK 報酬を圧縮した箱です。
- Heal: HP を回復します。
- Magnet: XP オーブ、Bronze / Silver / Gold、DATA CACHE、Robot、LOST ARMS を引き寄せます。
- Support: サポート攻撃を発動します。
- Robot: 随伴ロボットの本体レベルやチューニングを強化します。
- LOST ARMS コア: レア武器のラン内仮強化です。

Bronze / Silver / Gold の獲得 GEEK 量は Depth、Gate 不安定度、GEEK MILESTONE BONUS、ANOMALY CONTRACT で増加します。XP 成分には GEEK MILESTONE BONUS は影響しません。旧仕様の単独 GEEK オーブや、GEEK だけを直接付与する通常ピックアップは使っていません。

Gold Slime は Gold と Golden Tune Vase、Silver Slime は Silver と Silver Tune Vase を確定ドロップします。

## DATA CACHE とドロップ整理

ラン中のドロップが増えすぎないように、ドロップ上限と報酬圧縮があります。

アクティブドロップ上限:

- 全体: 260（Depth 6 以降は実効上限 220、Depth 7 は 200、Depth 8 以降は 180）
- XP: 170
- Bronze / Silver / Gold: 90（Depth 6 以降は実効上限 56、Depth 7 は 42、Depth 8 以降は 34）
- Robot: 28
- Support: 16
- Heal: 4
- Magnet: 3
- DATA CACHE: 3

上限を超えた場合、同カテゴリの報酬は可能な範囲で近いドロップへ統合され、優先度と報酬価値が低いものから整理されます。整理チェックはドロップ生成時と 1 秒ごとの安全クリーンアップで走ります。

Depth 6 以降では、Bronze / Silver / Gold の表示数が実効上限に達している場合、新しい価値ドロップは新規オブジェクトを作らず、近い既存ドロップへ XP と未確定 GEEK を 100% 保持したまま統合されます。統合されたドロップは `x2` 以上のスタック表示を持ち、拾ったときは合算済みの XP / 未確定 GEEK として処理されます。この戦闘中のスタック統合は、Depth 遷移時に残ドロップを 25% で DATA CACHE 化する報酬圧縮とは別処理です。

Depth 遷移時には、地面に残っている XP / Bronze / Silver / Gold / DATA CACHE の報酬量を集計し、XP と未確定 GEEK の 25% を DATA CACHE として再配置します。報酬量や元ドロップ数に応じて 1 から 3 個に分割されます。DATA CACHE は生成時点の絶対値 payload を保持するため、回収時に GEEK MILESTONE BONUS を再適用しません。

## XP、レベルアップ、Overflow 報酬

XP を獲得してレベルアップすると、3 択カード UI が表示されます。

- スキル候補は最大 2 枠です。
- 残り枠はパッシブ候補です。
- 未所持スキルは `NEW SKILL`、所持済みスキルは `SKILL UPGRADE` として表示されます。
- 上限到達済み、または選んでも効果が出ない候補は表示されません。
- パッシブはラン内 Lv.10 が上限です。

通常のレベルアップ強化は Lv.25 までを基準にし、Depth 6 以降で Lv.25 に到達している場合は `DEEP LEVEL` 成長に切り替わります。`DEEP LEVEL` は Lv.99 まで上昇し、カード選択を出さずに 1 レベルごとに Lv.25 時点の最大 HP 基準で約 1% の最大 HP と同量の現在 HP を加算します。Depth 6 未満では `DEEP LEVEL` は解禁されません。

すべてのスキル候補とパッシブ候補が上限に達した後の XP は `OVERDRIVE` に変換されます。

Depth 6 以降の `DEEP LEVEL` 中は、獲得 XP が Lv.99 までの Deep Level 進行にも入りつつ、既存どおり `OVERDRIVE` ゲージにも変換されます。Lv.99 到達後の XP は `OVERDRIVE` へ流れます。

OVERDRIVE:

- 100% で発動します。
- 1 XP が 1% ゲージになります。
- Overflow XP の 12% 相当を基礎値として、Depth / 不安定度補正つきの未確定 GEEK も得ます。
- 発動時間は 30 秒、延長込み最大 60 秒です。
- 発動中はダメージ x1.15、移動速度 x1.12、攻撃間隔 x0.88 になります。
- HUD 中央に `OD` ゲージと残り秒数が表示されます。

Depth 6 以降で OVERDRIVE が新規発動する場合、即時発動ではなく `OVERDRIVE MOD SELECT` の 3 択カードが開き、その OVERDRIVE 中だけ有効な MOD を 1 つ選びます。Depth 1〜5 は従来どおり自動発動します。すでに OVERDRIVE 中にゲージが 100% へ到達した場合は選択 UI を出さず、現在の MOD を維持したまま発動時間だけ延長します。レベルアップ、Gate、STABILIZE PROTOCOL、LOST ARMS RESONANCE など別 overlay が開いている場合、MOD 選択はキューされ、overlay が閉じてから表示されます。抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄で MOD 状態と未表示キューは破棄され、保存データには残りません。

OVERDRIVE MOD:

- `CHAIN VOLTAGE`: 0.9 秒ごとに最大 3 体へ連鎖雷撃を行います。範囲 280、威力は通常弾基準 x0.65 で、再分岐はしません。
- `HUNTER MODE`: ボス/エリートへのプレイヤー側ダメージ x1.25、高 HP 通常敵へのダメージ x1.12。Support finisher 由来の広域ダメージは上限を抑えます。
- `MAGNET STORM`: 発動時に半径 900 内の XP、価値ドロップ、DATA CACHE、Robot、Support、LOST ARMS / RESONANCE ECHO を引き寄せ、通常 MAGNET の範囲 x1.60、引き寄せ速度 x1.35。
- `GOLD FEVER`: Bronze / Silver / Gold の未確定 GEEK x1.20、DATA CACHE の未確定 GEEK x1.15。確定 GEEK と保存済み通貨には影響しません。
- `GUARD PULSE`: 発動直後 2.5 秒だけ被ダメージ x0.78、半径 220 の敵を押し戻します。
- `COOLDOWN REACTOR`: OVERDRIVE 中の攻撃間隔をさらに x0.88、移動速度を x0.96 にします。

検証用に `?debugOverdriveMod=1` を付けると、Depth 1 から MOD 選択条件を確認でき、console に選択ログが出ます。

## STABILIZE

Robot 報酬や Support 報酬が上限または無効で通常効果を出せない場合、`STABILIZE` と未確定 GEEK に変換されます。

変換量:

- Robot Core 上限: STABILIZE +28%、基礎 120 GEEK
- Silver Tune Vase 上限: STABILIZE +18%、基礎 80 GEEK
- Golden Tune Vase 上限: STABILIZE +42%、基礎 220 GEEK
- Support 無効時: STABILIZE +22%、基礎 100 GEEK

STABILIZE は 100% で 1 チャージになり、最大 3 チャージまで保持します。チャージ上限を超える分は未確定 GEEK に変換されます。Depth 1〜5 では従来どおり、次に Stage Gate が出現したとき保持チャージをすべて自動消費し、1 チャージあたり Gate 安定時間を 5 秒延長します。

Depth 6 以降では Stage Gate 出現時に STABILIZE チャージを自動消費せず、Gate 上で `STABILIZE PROTOCOL` として使い道を選べます。Gate 選択中に `3`、または `STABILIZE PROTOCOL` パネルを押すと Protocol メニューを開きます。1 つの Gate で使える Protocol action は 1 回だけです。

STABILIZE PROTOCOL:

- `EXTEND GATE`: 全チャージ消費、1 チャージあたり Gate 安定時間 +5 秒、最大 +15 秒。
- `SEAL INSTABILITY`: 2 チャージ消費、不安定度 -1。現在の不安定度が 0 の場合は使えません。
- `SECURE CACHE`: 1 チャージ消費、次 Depth 開始時の DATA CACHE 報酬に 60 + Depth x10 XP と Depth / 不安定度補正つきの基礎 500 GEEK を追加または統合します。次 Depth へ進まない場合、この予約報酬は破棄されます。
- `ANCHOR EXTRACT`: 3 チャージ消費、次の `EMERGENCY EXTRACT` の未確定 GEEK 保護率 +25%。保護率は既存の不安定度・契約補正を下げない範囲で最大 85% 目安に制限され、ANJU MEMORY の保存率には影響しません。
- `HOLD CHARGES`: 消費せずに Protocol メニューを閉じ、チャージを温存します。

HUD 中央に `ST` ゲージとチャージ数が表示されます。抽出、ゲームオーバー、ショップ復帰時には OVERDRIVE / STABILIZE とラン内パッシブ Lv はリセットされます。

## Depth と Stage Gate

Depth は 1 から開始します。各 Depth の開始から 120 秒で Stage Gate が開き、出現 30 秒前から警告が始まります。Gate は通常 30 秒間安定し、STABILIZE チャージを持っている場合は出現時に安定時間が延長されます。

Gate 接近演出:

- 30 秒前からワールド中央に `GATE SIGNAL` とカウントダウンリングが表示されます。
- 残り 10 秒から `GATE IMMINENT` になり、HUD のエッジ警告とテンションバーが強まります。
- Gate 出現中は `GATE ONLINE` / `GATE COLLAPSING` / `UNSTABLE GATE` の表示、円形タイマー、粒子、パルスで残り時間と危険度を示します。
- 不安定化時は画面フラッシュ、ピンク系の Gate 色、`INSTABILITY STACK` 表示で状態変化を示します。

通常 Gate 選択:

- `NEXT STAGE`: 次の Depth に進み、敵強化と GEEK 係数上昇を受けます。
- `EXTRACT`: 未確定 GEEK を 100% 確定してランを終了します。

不安定 Gate 選択:

- `FORCE BREAKTHROUGH`: 不安定度を保持したまま次の Depth へ進みます。
- `EMERGENCY EXTRACT`: 不安定度に応じた割合だけ未確定 GEEK を確定し、残りを失います。

Depth 5 までに Gate を放置すると崩壊してゲームオーバーになります。Depth 6 以降では崩壊の代わりに不安定度が蓄積し、敵 HP、敵攻撃力、GEEK 係数、緊急脱出率に影響します。

Depth6、8、10、12、15 に入ると `GEEK MILESTONE` 通知が短く表示されます。HUD の GEEK 係数には現在の節目が `D8+0.30` のように併記され、Gate 表示では次の節目がある場合に `NEXT D10`、節目到達直前の NEXT / FORCE カードでは `NEXT DEPTH 10 BONUS` のように表示されます。Depth15 以降は `MAX` / `D15 CORE` 表示になります。

### DEEP EXTRACTION RESULT

Depth 6 以降に通常 `EXTRACT` または `EMERGENCY EXTRACT` が成功すると、ランキング入力やショップ復帰の前に `DEEP EXTRACTION RESULT` が表示されます。通常抽出では `DEEP EXTRACTION RESULT`、緊急抽出では `EMERGENCY DEEP EXTRACTION / Partial data secured` として、到達 Depth、確定 GEEK、生存時間、撃破数、Elite / Boss、Instability、GEEK 最大倍率、ANJU MEMORY、LOST ARMS、NEMESIS、DEPTH DIRECTIVE、ベスト更新、Grade を表示します。

この画面は演出と集計表示だけです。`secureRunCoins()` の確定額、緊急脱出の保護率、`lastmemoVansabaCoins`、`lastmemoVansabaExtractionMessage`、ランキング、Firebase 送信値は変更しません。Continue、Enter、Space、タップで既存のランキング入力または Opening Shop 復帰へ進みます。

検証用に `?debugDeepResult=1` を付けると、Opening Shop 起動直後に保存なしのプレビュー結果画面を表示し、Depth 6 未満の抽出でも結果画面の発生条件を確認できます。デバッグ指定は表示条件だけを緩和し、GEEK / ANJU MEMORY / ランキング保存値は増やしません。

## ANOMALY CONTRACT

Depth 6 以降へ `NEXT STAGE` または `FORCE BREAKTHROUGH` で進むと、次 Depth だけ有効な `ANOMALY CONTRACT` を 3 択から選びます。契約には `DANGER` と `REWARD` があり、契約状態はラン内だけの一時状態です。ショップ永続強化、確定 GEEK、localStorage には保存されません。

契約一覧:

- `GREED PROTOCOL`: 敵 HP +18%、敵攻撃力 +8% / GEEK 係数 +0.35
- `LOST SIGNAL`: 敵 HP +8%、ボス HP +30% / LOST ARMS 抽選率 +2.5%、pity 上昇量 +25%
- `STABILIZE ANCHOR`: 敵 HP +12% / STABILIZE 獲得量 +35%、Gate 安定時間 +5 秒、EMERGENCY EXTRACT 保護率 +10%
- `OVERDRIVE CIRCUIT`: 敵移動速度 +8%、敵攻撃力 +6% / OVERDRIVE 獲得量 +40%、発動時間 +5 秒
- `CACHE BLOOM`: 敵 HP +10%、敵攻撃力 +6% / DATA CACHE 圧縮率 +10%、DATA CACHE 内の未確定 GEEK +15%
- `GOLD STORM`: 敵 HP +15%、ボス攻撃力 +10% / Gold Slime・Silver Slime 抽選重み x1.25、Bronze / Silver / Gold の未確定 GEEK +20%

## DEPTH DIRECTIVE

Depth 6 以降の各 Depth 開始時に、短期ミッション `DEPTH DIRECTIVE` を 3 択カードから 1 つ選びます。Depth 遷移と ANOMALY CONTRACT の有効化が完了したあとにキューされ、レベルアップ、Gate、STABILIZE PROTOCOL、OVERDRIVE MOD、LOST ARMS RESONANCE など別 overlay が開いている場合は、その overlay が閉じてから表示されます。

DIRECTIVE はその Depth 中だけ有効なラン内一時状態です。localStorage / sessionStorage / Firebase には保存されず、抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄で未表示キュー、進捗、Beacon、Directive Slime、タイマーを破棄します。Gate 開放時点で未達成の DIRECTIVE は失敗します。

DIRECTIVE 一覧:

- `BOSS HUNTER`: Boss / Elite を撃破。Depth 6 は 1 体、Depth 7 以降は 2 体。報酬は LOST ARMS SIGNAL と未確定 GEEK。
- `DATA RECOVERY`: Directive Beacon を 3 個回収。報酬は DATA CACHE。DATA CACHE が上限 3 個に達している場合は既存 CACHE へ payload を統合します。
- `NO RETREAT`: Gate 開放時に HP 50% 以上を維持。報酬は STABILIZE +100% と未確定 GEEK。
- `SLIME SIGNAL`: Depth 中に出現する Directive Slime を撃破。報酬は Gold cache と未確定 GEEK。Directive Slime の通常 Gold Slime 確定報酬と LOST ARMS 抽選は抑制します。
- `CLEAN SWEEP`: 敵を `160 + (Depth - 6) x 12` 体撃破。報酬は OVERDRIVE +50% と未確定 GEEK。
- `GATE ANCHOR`: Elite 1 体撃破、かつ Bronze / Silver / Gold を 8 個回収。報酬は次に開く Gate の安定時間 +8 秒と未確定 GEEK。
- `RESONANCE HUNT`: LOST ARMS Core / RESONANCE ECHO を 1 個回収。報酬は対象 LOST ARMS の RESONANCE +1。候補がない場合は未確定 GEEK へ変換します。

HUD 中央には active DIRECTIVE の名称、進捗、報酬が小さく表示されます。`?debugDepthDirective=1` を付けると Depth 1 から選択条件を確認でき、console に選択・完了・失敗ログが出ます。

## NEMESIS BOSS

Depth 6 以降では、各 Depth に最大 1 体だけ高 Depth 専用ボス `NEMESIS BOSS` が出現する可能性があります。出現抽選率は D6=25%、D7=35%、D8=45%、D9=55%、D10+=65% です。抽選に通った場合、Depth 開始から 45〜90 秒後に出現を試みます。

NEMESIS は Gate が近すぎる場合、Gate が開いている場合、Gate 選択中、通常 wave boss が生存中、元素騎士イベント中、別 overlay 表示中には出現しません。overlay / 元素騎士 / 通常 boss で一時的に塞がれている場合は Gate まで余裕がある間だけ retry します。NEMESIS が warning / active の間は通常 wave boss の出現も遅延します。Gate が開いた時点で生存中の NEMESIS は cleanup され、Depth 遷移、抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄でも timers / tweens / marker / HP HUD を破棄します。

使用素材は元素騎士イベントのモンスター boss 素材 3 体です。サポートキャラクター素材は使いません。

- `NEMESIS BRUTE`: `画像/support/gensoKnights/boss_01.png`、既存 `boss_crack` の拡大型 shockwave。
- `NEMESIS CASTER`: `画像/support/gensoKnights/boss_02.png`、既存 `boss_random_blast` の広域 rune blast。
- `NEMESIS WRAITH`: `画像/support/gensoKnights/boss_03.png`、既存 `boss_lightning_dash` の広域 dash / lightning。

撃破報酬は未確定 GEEK、Gold / Silver、STABILIZE +50%、Robot 追加抽選、LOST ARMS 追加抽選です。通常 boss と同じ `isBoss` 扱いで LOST ARMS / Robot の既存抽選にも乗りますが、wave boss 進行は進めません。DEPTH DIRECTIVE では `BOSS HUNTER` にカウントし、`CLEAN SWEEP` の通常敵撃破数には入りません。NEMESIS 状態はラン内一時状態で、localStorage / sessionStorage / Firebase には保存されません。

検証用に `?debugNemesis=1` を付けると Depth 1 から出現抽選を通し、約 10 秒後に低 HP の NEMESIS を出現させ、console に schedule / spawn / defeat ログを出します。

## ANJU MEMORY

`ANJU MEMORY` は Depth 6 以降の生還でだけ獲得できるメタ報酬通貨です。確定 GEEK、未確定 GEEK、CD/永続強化のショップ状態とは別に保存され、`lastmemoVansabaCoins` や `lastmemoVansabaShopState` には混ざりません。

獲得条件:

- ラン中に到達した最大 Depth が 6 以上のときだけ候補になります。
- 通常 `EXTRACT` または `EMERGENCY EXTRACT` が成功した瞬間に保存されます。
- ゲームオーバー、Depth 5 までの Gate 崩壊、リスタート、ショップ復帰、デバッグ終了では保存されません。
- Depth 6 に初到達したランでは `ANJU MEMORY UNLOCKED` が表示されますが、抽出するまで保存されません。

報酬計算:

- Depth 繰り返し報酬は `maxDepthReached - 5` の三角数です。例: D6=1、D7=3、D8=6、D9=10、D10=15、D12=28。
- 初到達マイルストーンは D6:+3、D8:+5、D10:+8、D12:+12、D15:+20 です。
- 不安定度 1 スタックごとに +8%、最大 +40% のボーナスが乗ります。
- 通常抽出は `floor(raw * 1.0)`、Depth 6 以上なら最低 1 AM です。
- 緊急抽出は `floor(raw * 0.35)` で、raw が 1 以上なら最低 1 AM です。
- マイルストーンは保存された報酬が 1 AM 以上のときだけ達成済みにします。緊急抽出でも 1 AM 以上を獲得した場合は、そのランで到達した未達マイルストーンを消費します。

Opening Shop の `ANJU MEMORY` タブでは、AM 残高、累計獲得、最高抽出 Depth、チケット所持数を確認できます。HUD では Depth 6 以降に `ANJU MEMORY +n? / Extract to preserve` として未確定の見込み値を表示します。

ANJU MEMORY ショップ報酬:

- Deep CD: `ANJU ECHO` は Depth6+ の STABILIZE 獲得量 +5%、`VOID SIGNAL` は Depth6+ の LOST ARMS 抽選率 +0.005、`GATE REFRAIN` は Depth6+ の Gate 安定時間 +2 秒です。購入後は選択不要で常時有効ですが、効果は Depth6+ のみです。
- HUD / Gate / LOST ARMS スキン: 購入して選択します。見た目だけを変え、性能には影響しません。
- Opening Boost +1 Ticket: 次ラン開始時、最初の Opening Boost だけ候補数を +1 し、表示直前に 1 枚消費します。
- Opening Boost Reroll Ticket: Opening Boost 画面に `REROLL` を表示し、1 ラン 1 回だけ候補を引き直します。押した時点で 1 枚消費します。
- Title / Badge: 購入して選択すると HUD やランキング表示に反映されます。
- Memory Log: 購入後、ANJU MEMORY ショップ内で本文を読めます。
- Result Frame: Depth6+抽出で AM を獲得した結果画面のフレームを変えます。
- Contract Card Back: ANOMALY CONTRACT のカード背面を変えます。

## 戦闘仕様

プレイヤー初期値:

- HP: 100
- 移動速度: 310
- スタミナ: 100
- DASH 速度倍率: 1.68
- DASH スタミナ消費: 38 / 秒
- スタミナ回復: 24 / 秒

敵タイプ:

- Chaser: 標準的な追跡型です。
- Dash: 突進で間合いを詰めます。
- Tank: 高耐久の近接型です。
- Ranged: 距離を取りながらビーム攻撃を行います。
- Gold Slime / Silver Slime: レア GEEK アイテムと Robot 花瓶を確定ドロップします。

ボスは各 Wave 開始から 15 秒後に出現します。撃破すると次の Wave へ進み、次のボスも 15 秒後に出現します。ボス攻撃は出現後すぐに予兆付きで始まり、亀裂、ビーム、扇状弾、三連弾、ランダム爆撃、雷ダッシュの 6 種類が Wave ごとにローテーションします。

## スキル

攻撃スキル:

- `basicSkill`: 初期解放の周回球と自動雷撃です。
- `tornadoSkill`: 画面内の敵を追尾する竜巻です。
- `rabbitThunderSkill`: 雷兎が突進し、成長すると着地雷衝撃などが追加されます。

各攻撃スキルは Stage 1 から Stage 8 まで強化できます。未解放スキルはレベルアップ選択で解放し、解放済みスキルは次 Stage へ強化します。

パッシブ:

- Overcharge Bolt: 電撃ダメージを増やします。
- Rapid Sigil: 攻撃間隔を短縮します。
- Swift Step: 移動速度を上げます。
- Stamina Core: 最大スタミナとスタミナ回復余地を増やします。
- Vital Bloom: 最大 HP と現在 HP を増やします。

## LOST ARMS / ロストアームズ

左上 HUD の既存スキル 3 枠の右側 2 枠は、レア武器 `LOST ARMS` 専用枠です。通常のレベルアップ 3 択には出ません。

- `ABYSS RAIL` / アビスレール: 高 HP 敵、ボス、エリートを狙う貫通レーザーです。
- `GRAVITY SEED` / グラビティシード: 敵密集地点に重力核を置き、鈍足、吸引、継続ダメージ、崩壊爆発で範囲制圧します。

共通仕様:

- 各武器の最大 Lv は 8、初期 Lv は 0 です。
- Lv.1 以上はラン開始時から自動発動します。
- 1 ランで拾える LOST ARMS 強化は最大 2 個までです。
- MVP では同じ武器の仮強化は 1 ラン中に最大 +1 までです。
- `NEXT STAGE` では仮強化を持ったまま次 Depth へ進みます。
- 通常 `EXTRACT` では仮強化を永続 Lv に保存します。
- ゲームオーバー、Gate 崩壊、`EMERGENCY EXTRACT` では、そのラン中の仮強化は失われます。
- Depth 5 までで両方 Lv.8、またはそのランで候補がない場合の抽選成功は Gold 相当の代替報酬に変換されます。
- Depth 6 以降で通常コア候補がなくても進化可能な武器がある場合は `RESONANCE ECHO` に変わり、進化可能な武器もない場合だけ Gold 相当の代替報酬になります。

LOST ARMS コアは通常敵からは出ず、ボス、エリート、Gold Slime、Silver Slime の追加抽選でのみ出現します。ドロップ率は Depth と対象種別で変わり、対象抽選に失敗するたびに pity が最大 0.10 まで増えます。成功時は pity が 0 に戻ります。

### LOST ARMS RESONANCE

Depth 6 以降では、通常の LOST ARMS コア取得が成功した武器に `RESONANCE` が +1 されます。通常コアを出せない抽選成功時に、そのランで進化可能な LOST ARMS がある場合は Gold 代替ではなく `RESONANCE ECHO` が出現し、拾うと対象武器の RESONANCE が +1 されます。Echo は LOST ARMS 強化取得数には数えません。

RESONANCE は各武器 3/3 で 2 択の進化カードを開きます。進化は各武器 1 ラン 1 回だけ、ラン内だけ有効で、`lastmemoVansabaLostArmsState` には保存されません。通常抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄でリセットされます。HUD の LOST ARMS 枠には `RES 1/3` または `EVO EXEC` のように進捗と進化名が表示されます。

ABYSS RAIL 進化:

- `EXECUTION RAIL`: ボス/エリートへの ABYSS RAIL ダメージ x1.35、高 HP 標的へのダメージ x1.20、命中前 HP が 18% 未満の標的へレールダメージの 30% の追加バーストを発生させます。
- `PRISM RAIL`: ABYSS RAIL 命中時、近くの敵へ最大 3 本の分岐レールを放ちます。範囲 260、分岐ダメージは元命中ダメージの 45%、分岐 cooldown は 700ms で、分岐から再分岐はしません。

GRAVITY SEED 進化:

- `EVENT HORIZON`: 崩壊範囲 x1.25、崩壊ダメージ x1.25。3 体以上巻き込むと、45% ダメージの二次崩壊を 1 回発生させます。
- `SINGULARITY GARDEN`: 持続時間 x1.30、吸引力 x1.30、鈍化 +0.10、同時展開数 +1。

RESONANCE がすでに進化済み、または進化候補がない状態でさらに RESONANCE 相当の報酬を得た場合は、RESONANCE overflow として未確定 GEEK、OVERDRIVE +20%、STABILIZE +15% に変換されます。

検証用に `?debugLostArms=1` を付けると、対象敵の LOST ARMS 抽選が成功扱いになり、console に抽選ログが出ます。`?debugLostArmsResonance=1` を併用すると、Depth 1 から RESONANCE 条件を確認できます。

## サポート

Support アイテムを拾うとサポート攻撃が発動します。Support アイテム自体は通常戦闘の撃破ペースでおおむね 30 秒に 1 個を目安に調整されています。直前と同じ通常サポートは避けて抽選され、通常サポートはノーマル、いしでんはレア、元素騎士は超レアの重みで発動します。

通常サポート:

- ぽぽちゃん
- えいとふぉー
- いもたろう
- かぴぴ
- えも子
- いしでん
- アシグラ

元素騎士:

- 専用カットイン、BGM、4 体の支援キャラクター、4 体のイベントボスが出現します。
- ひろまろ、アラモード、オマル、くろかげがそれぞれ攻撃、掃討、防御役として動きます。
- イベント中の報酬でも Bronze / Silver / Gold が出現し、Depth と不安定度の GEEK 補正を受けます。

いしでんのタイミング報酬でも Bronze / Silver / Gold が出現します。元素騎士イベント中、またはいしでんのサポート攻撃中など Support が通常発動できない状態で Support アイテムを拾った場合は、STABILIZE と未確定 GEEK に変換されます。

## ロボット

随伴ロボットはラン開始時からプレイヤーについてきます。初期状態は Missile Lv.1 / Field Lv.1 です。

- Missile Core: ミサイル本体レベルを上げます。
- Recovery Core: 回復フィールド本体レベルを上げます。
- Golden Tune Vase: ミサイル系チューニングを 2 択で選びます。
- Silver Tune Vase: フィールド系チューニングを 2 択で選びます。

GEEKSHOP の `回収ロボ` は、確定 GEEK で Lv.1-10 まで永続強化する別系統の非ダメージサポートです。出撃中はキャラクター周辺のドロップを探してロボット自身が拾いに行き、回収後はプレイヤー付近へ戻ります。Lv が上がるとサーチ範囲、移動速度、回収対象が広がり、Lv2 以降は周囲の敵を押し戻す掃除パルス、Lv4 以降は短い鈍足補助も発生します。対象は Lv1 で XP / Bronze / Silver / Gold、Lv2 で DATA CACHE、Lv3 で Heal / Magnet、Lv5 で Robot / Support / LOST ARMS まで広がります。画像は `./画像/robot/cleaning_robot_lv1.png` から `cleaning_robot_lv10.png` を使用し、未読み込み時は既存ロボット画像へフォールバックします。

ミサイルと回復フィールドの本体レベルは通常 Lv.10 が上限です。Opening Shop の `ROBOT CUSTOM` で確定 GEEK を使ってLv上限を段階解放すると、各系統ごとに Lv.12 / 14 / 16 / 18 / 20 まで伸ばせます。チューニングは Rapid Launcher、Warhead Boost、Field Cycle、Care Output があり、それぞれ最大 Lv.20 です。

ミサイル命中、撃破、回復パルスでもロボット経験値が入り、Lv1-10までは既存テンポで本体レベルが上がります。Lv10以降は自動経験値では上がらず、Missile / Recovery Core を複数取得して `CORE x/y` を満たすと1レベル上がります。必要Core数は Lv10->11:2、Lv11->12:2、Lv12->13:3、Lv13->14:3、Lv14->15:4、Lv15->16:5、Lv16->17:6、Lv17->18:7、Lv18->19:8、Lv19->20:10 です。すでに現在の上限に達した Robot 報酬を拾った場合は、STABILIZE と未確定 GEEK に変換されます。

Lv11+ ROBOT EX:

- `Napalm Missile`: `ROBOT CUSTOM` で 180,000 GEEK、Missile Cap Tier 1 以上が必要です。購入後、Missile Lv11+でミサイル爆発時に燃焼を付与します。Lv15+では短時間の燃焼床を生成し、最大8個まで残ります。燃焼ダメージは既存の敵ダメージ処理を通るため、撃破・ドロップ・ランキング加算は通常処理に乗ります。
- `Barrier Field`: `ROBOT CUSTOM` で 180,000 GEEK、Recovery Cap Tier 1 以上が必要です。購入後、Recovery Lv11+でHPとは別のシールドを生成します。Barrierは被弾時にHPより先に削られ、破壊後はクールダウンを経て回復フィールドのパルスで再構築されます。Recovery Lv20では90秒クールダウンのLast Standがあり、致死ダメージ時に一度だけHP1で踏みとどまります。
- ロボット本体は Lv11-15 で `robot_lv11.png`、Lv16-19 で `robot_lv16.png`、Lv20 で `robot_lv20.png` を使います。ナパーム弾は Lv11-15 / 16-19 / 20 で `robot_bombslv11.png` / `robot_bombslv16.png` / `robot_bombslv20.png` を使います。燃焼は `missile_explosion_frame_01.png` から `missile_explosion_frame_08.png` のフレームアニメーションです。
- Recovery Field の Lv11-20 専用画像は未使用です。Barrier Field 展開中はキャラクター本体に白い半透明シールドを重ねて表示し、Recovery Field画像は既存Lv10までの素材へフォールバックします。

ROBOT SYNC DRIVE:

- ミサイル命中・撃破、回復フィールドのパルス、Missile / Recovery Core 取得、Golden / Silver Tune Vase のチューニング選択で `SYNC` ゲージが蓄積します。
- `SYNC` 100% で 18 秒間の `ROBOT SYNC DRIVE` が自動発動します。発動中に再度 100% へ到達した場合は最大 30 秒まで延長されます。
- 発動中はミサイル発射間隔 x0.86、ミサイル威力 x1.16、回復フィールド範囲 x1.12、回復量 x1.18 になります。
- 発動中の回復パルスは `SYNC PULSE` になり、周囲の敵へ小ダメージと押し戻しを与えます。
- `SYNC` はラン内一時状態です。ショップ復帰、抽出、ゲームオーバー、リスタートでリセットされ、localStorage / sessionStorage には保存されません。
- 検証用に `?debugRobotSync=1` を付けると、初期 `SYNC` ゲージが高い状態になり、ゲージ獲得量が増えて発動確認しやすくなります。

## ショップ

Opening Shop では `CDSHOP`、`GEEKSHOP`、`ROBOT CUSTOM`、`ANJU MEMORY` をタブで切り替えます。CDSHOP は CD 購入と BGM 選択専用です。GEEKSHOP と ROBOT CUSTOM では確定 GEEK を使用します。GEEKSHOP は Weapon / Armor / Shoes と回収ロボの永続強化、ROBOT CUSTOM はラン中Lvを直接購入する画面ではなく、Missile / Recovery のLv上限と Lv11+ EX 機能を解放する画面です。CD は BGM 選択と永続ボーナスを兼ねており、購入済み CD の永続効果は選択中 BGM に関係なく常時発動します。

GEEKSHOP:

- Weapon: 最大 Lv.10、攻撃力 +6% / Lv
- Armor: 最大 Lv.10、最大 HP +10 / Lv
- Shoes: 最大 Lv.10、移動速度 +8 / Lv
- 回収ロボ: 最大 Lv.10。必要 GEEK は 100,000 / 150,000 / 230,000 / 350,000 / 520,000 / 780,000 / 1,150,000 / 1,700,000 / 2,500,000 / 3,600,000。

ROBOT CUSTOM:

- Missile / Recovery Cap Tier 1-5: 30,000 / 60,000 / 100,000 / 160,000 / 240,000 GEEK。各Tierで該当系統の上限が+2され、最大Lv20です。
- Napalm Missile: 180,000 GEEK。Missile Cap Tier 1 以上が必要です。
- Barrier Field: 180,000 GEEK。Recovery Cap Tier 1 以上が必要です。

CD:

- Anju: 初期所持
- なんでやねんねん: 100,000 GEEK / 攻撃力 +10%、弾速 +6%
- 反省会: 100,000 GEEK / 最大 HP +25、最大スタミナ +20 / `./音声/bgm/hanseikai_ver2.wav`
- 未来を生きてる: 100,000 GEEK / 移動速度 +20、連射 +5%
- コトコト: 100,000 GEEK / 攻撃力 +6%、最大スタミナ +15
- いっちゃいな: 100,000 GEEK / 弾速 +8%、移動速度 +12

永続強化の価格は基礎 1,000 GEEK からレベルに応じて増加し、100 GEEK 単位に丸められます。ショップ表示前、帰還後、ゲーム再生成時には `shop-loading-screen` が表示されます。

## ステージ

通常プレイでは `stageDefinitions.js` の `tokyoRandomStages` から 10 種類の東京ステージがランダム選択されます。指定ステージが見つからない場合はランダム東京ステージへフォールバックし、ランダム定義がない場合は `shibuyaStage1` を使用します。

東京ランダムステージ:

- Tokyo 01: Scramble Crossing
- Tokyo 02: Skyscraper Plaza
- Tokyo 03: Electric Town
- Tokyo 04: Luxury Avenue
- Tokyo 05: Waterfront Plaza
- Tokyo 06: Underpass Infrastructure
- Tokyo 07: Station Rotary
- Tokyo 08: Residential Arterial
- Tokyo 09: Civic Plaza
- Tokyo 10: Urban Shrine Approach

ステージ関連のクエリパラメータ:

- `?stage=<stageId>`: 指定ステージを開始します。
- `?debugStage=<stageId>`: デバッグ用途で指定ステージを開始します。
- `?stageDebug=1`: ステージデバッグ表示を有効化します。
- `?debugStageOverlay=1`: ステージデバッグ表示を有効化します。
- `?debug=stage`: ステージデバッグ表示と衝突判定編集モードを有効化します。
- `?debug=stage&start=x,y`: 開始位置を指定します。
- `?debug=stage&startX=x&startY=y`: 開始位置を指定します。

衝突判定編集モード:

- クリック: Collision Zone を選択します。
- 矢印キー: 選択中 Zone を移動します。
- `Shift` + 矢印キー: 1 px 単位で移動します。
- `Ctrl` / `Alt` / `Meta` + 矢印キー: 選択中 Zone のサイズを変更します。
- `N`: マウス位置に一時 Zone を追加します。
- `Delete` / `Backspace`: 選択中 Zone を削除します。
- `C`: `stageDefinitions.js` 用の `collisionZones` をクリップボードと console に出力します。
- `S`: 編集中 Zone を localStorage に保存します。
- `L`: localStorage から編集中 Zone を読み込みます。
- `R`: 定義値に戻します。
- `Escape`: 選択を解除します。

## ランキング

ゲームオーバーまたは抽出完了時に名前を入力すると、ラン記録をランキングへ登録します。ローカルランキングは localStorage に保存され、Firebase 接続に成功した場合はオンラインランキング `leaderboardKills` も読み書きします。

Firebase SDK は `12.13.0` を dynamic import し、匿名認証で Firestore を使用します。Firebase 設定は `game.js` 内の `FIREBASE_CONFIG` にあります。Firestore ルールは `firestore.rules` を参照してください。

ランキング画面では `KILLS`、`DEPTH`、`GEEK` の 3 モードを切り替えられ、最大 10 件を表示します。`KILLS` はキル数、生存時間、レベル、エリート撃破数、Best Depth、Extracted GEEK の順で並びます。`DEPTH` は Best Depth、Extracted GEEK、キル数、生存時間、レベルの順、`GEEK` は Extracted GEEK、Best Depth、キル数、生存時間、レベルの順で並びます。表示上は選択中バッジと抽出で得た ANJU MEMORY も併記します。オンライン取得に失敗した場合はローカルランキング表示に戻ります。

Best Depth はそのランで実際に到達した最大 Depth です。Extracted GEEK はそのランの抽出で実際に確定できた未確定 GEEK 量で、通常抽出では 100%、緊急抽出では最終保護率ぶん、ゲームオーバーや Gate 崩壊では 0 になります。これは確定 GEEK ウォレット `lastmemoVansabaCoins` の総額ではありません。

## 保存データ

localStorage キー:

- `lastmemoVansabaBestRecord`: ベスト記録。`bestDepth` と `bestExtractedGeek` も保存します。
- `lastmemoVansabaKillRanking`: ローカルランキング。各 entry は `bestDepth`、`extractedGeek`、`extractMode`、`extractionSucceeded`、`submittedAt`、`version` を持ち、古い entry にフィールドがない場合は `bestDepth = 1`、`extractedGeek = 0`、`extractMode = none` に補完します。
- `lastmemoVansabaCoins`: 確定 GEEK
- `lastmemoVansabaShopState`: CD 所持、選択 BGM、永続強化状態、回収ロボ `cleaningRobotLevel`、`robotCustom`。`cleaningRobotLevel` は古い保存データに無い場合 Lv0 へ補完します。`robotCustom` は `missileCapTier`、`recoveryCapTier`、`napalmUnlocked`、`barrierUnlocked` を持ち、古い保存データに無い場合は初期値へ補完します。
- `lastmemoVansabaLostArmsState`: LOST ARMS 永続 Lv と pity
- `lastmemoVansabaAnjuMemoryState`: ANJU MEMORY 残高、購入済み報酬、選択中スキン/称号/バッジ、チケット、到達済みマイルストーン
- `collisionEditor:<stageId>`: 衝突判定編集モードの一時保存データ

sessionStorage キー:

- `lastmemoVansabaExtractionMessage`: 帰還後に Opening Shop へ表示する一時メッセージ

保存データを初期化したい場合は、ブラウザの DevTools から該当キーを削除してください。

## 主なファイル

- `index.html`: DOM 構造、スマートフォン開始ゲート、ショップローディング画面、スクリプト読み込み
- `style.css`: ページ枠、モバイル表示、スマートフォン開始ゲート、ショップローディング画面
- `game.js`: ゲーム本体、ショップ、Gate、戦闘、ロボット、サポート、LOST ARMS、Firebase 連携
- `skillDefinitions.js`: スキル定義
- `stageDefinitions.js`: ステージ定義、東京ランダムステージ、衝突判定定義
- `vendor/phaser.min.js`: Phaser 3 本体
- `firestore.rules`: Firestore セキュリティルール
- `AGENTS.md`: Codex 作業時のリポジトリ内開発指示
- `画像/`: キャラクター、敵、スキル、ステージ、CD ジャケットなどの画像素材
- `音声/`: BGM、サポート音声、SE などの音声素材

## 開発メモ

構文チェック:

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
```

ローカル配信:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

代表的な確認 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0
http://127.0.0.1:4173/?debugLostArms=1
http://127.0.0.1:4173/?debugAnjuMemory=1
http://127.0.0.1:4173/?debugDepthDirective=1
http://127.0.0.1:4173/?debugDeepResult=1
http://127.0.0.1:4173/?debugGeekMilestone=1
http://127.0.0.1:4173/?debugRankingDepth=1
http://127.0.0.1:4173/?debugRobotSync=1
http://127.0.0.1:4173/?debug=stage
```

このプロジェクトには npm、bundler、TypeScript はありません。新規アセットを必須にする変更は避け、画像がない場合でも Phaser Graphics などでフォールバックできる実装を優先します。
