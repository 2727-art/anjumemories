# ラスメモヴァンサバゲーム

Phaser 3 製のブラウザ向けサバイバルゲームです。ビルド工程はなく、静的ファイルをローカル HTTP サーバーで配信して遊びます。

プレイヤーはスキル、サポート攻撃、随伴ロボットを強化しながら敵を倒し、XP と未確定 GEEK を集めます。3 分ごとに出現する Stage Gate では、Depth を上げて続行するか、未確定 GEEK を確定して帰還するかを選びます。

## 起動方法

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

起動後、ブラウザで `http://127.0.0.1:4173/` を開きます。LAN 上のスマートフォンで確認する場合は、PC とスマートフォンを同じネットワークに接続し、PC の LAN IP で HTTP サーバーへアクセスします。

## スマートフォン対応

スマートフォンで接続すると、開始前に横向きフルスクリーン開始ゲートが表示されます。対応ブラウザではフルスクリーン化と画面向きロックをリクエストし、未対応環境では通常表示で開始できます。

モバイル操作は左側の仮想スティックと右側の DASH ボタンです。ショップ、開始前強化、ゲート選択、ランキング入力もタップ操作に対応しています。

クエリパラメータ:

- `?mobileGate=1`: PC ブラウザでもスマートフォン開始ゲートを表示します。
- `?mobileGate=0`: スマートフォン開始ゲートを無効化します。
- `?mobileControls=1`: PC ブラウザでもモバイル操作 UI を表示します。
- `?mobileControls=0`: モバイル操作 UI を無効化します。

## 操作方法

- 移動: `WASD` / 矢印キー / 左仮想スティック
- DASH: `Shift` / `Space` / 右 DASH ボタン
- 選択: クリック / タップ / 数字キー
- ゲート選択: `1` / `2`
- ランキング入力: 名前入力後 `Enter`
- ゲームオーバー後: `R` または `Enter` でショップへ戻る

## ゲーム進行

1. Opening Shop で CD、BGM、永続強化を購入または選択します。
2. `GAME START` で出撃し、Opening Boost として開始前に 3 回ぶんの強化を選択します。
3. 敵を倒して XP、未確定 GEEK、Support、Robot アイテムを集めます。
4. レベルアップ時はスキル解放、スキル強化、パッシブ強化から 3 択で 1 つ選びます。
5. 各 Depth の開始から 180 秒で Stage Gate が開きます。
6. Stage Gate では次の Depth へ進むか、未確定 GEEK を確定してショップへ帰還します。
7. 帰還、ゲームオーバー、ゲート崩壊後はローディング表示を挟んで Opening Shop に戻ります。

## GEEK 仕様

`GEEK` はゲーム内通貨です。

- 確定 GEEK: ショップで使用できる所持通貨です。
- 未確定 GEEK: ラン中に獲得し、帰還するまで確定しない通貨です。
- HUD には未確定 GEEK、GEEK 係数、Depth、ゲート残り時間が表示されます。
- 通常帰還では未確定 GEEK の 100% が確定 GEEK になります。
- 通常ゲームオーバー、Depth 5 までのゲート崩壊では未確定 GEEK を失います。
- Depth 6 以降の不安定ゲートでは、緊急脱出時に未確定 GEEK の一部だけを確定できます。

互換性維持のため、確定 GEEK の localStorage キー名は `lastmemoVansabaCoins` のままです。

## GEEK 獲得アイテム

Bronze / Silver / Gold が、未確定 GEEK を獲得できる専用アイテムです。旧仕様の単独通貨アイテム、単独 GEEK オーブ、GEEK だけを直接付与するピックアップは使っていません。

Bronze / Silver / Gold は XP と未確定 GEEK を同時に付与します。獲得 GEEK 量は Depth とゲート不安定度で増加します。

通常アイテム:

- XP オーブ: XP のみを獲得します。
- Bronze: 10 XP / 基礎 100 GEEK を獲得します。
- Silver: 20 XP / 基礎 1,000 GEEK を獲得します。
- Gold: 38 XP / 基礎 3,000 GEEK を獲得します。
- Heal: HP を回復します。
- Magnet: XP オーブ、Bronze / Silver / Gold、Robot アイテムを引き寄せます。
- Support: サポート攻撃を発動します。
- Robot: 随伴ロボットの本体レベルやチューニングを強化します。

Gold Slime は Gold と Golden Tune Vase、Silver Slime は Silver と Silver Tune Vase を確定ドロップします。

## Depth と Stage Gate

Depth は 1 から開始します。各 Depth の開始から 180 秒で Stage Gate が開き、出現 30 秒前から警告が始まります。ゲートは出現後 30 秒間安定し、時間切れになると崩壊または不安定化します。

ゲート接近演出:

- 30 秒前からワールド中央に `GATE SIGNAL` とカウントダウンリングが表示されます。
- 残り 10 秒から `GATE IMMINENT` になり、HUD のエッジ警告とテンションバーが強まります。
- ゲート出現中は `GATE ONLINE` / `GATE COLLAPSING` / `UNSTABLE GATE` の表示、円形タイマー、粒子、パルスで残り時間と危険度を示します。
- 不安定化時は画面フラッシュ、ピンク系のゲート色、`INSTABILITY STACK` 表示で状態変化を示します。

通常ゲート選択:

- `NEXT STAGE`: 次の Depth に進み、敵強化と GEEK 係数上昇を受けます。
- `EXTRACT`: 未確定 GEEK を 100% 確定してランを終了します。

不安定ゲート選択:

- `FORCE BREAKTHROUGH`: 不安定度を保持したまま次の Depth へ進みます。
- `EMERGENCY EXTRACT`: 不安定度に応じた割合だけ未確定 GEEK を確定し、残りを失います。

Depth 5 までにゲートを放置すると崩壊してゲームオーバーになります。Depth 6 以降では崩壊の代わりに不安定度が蓄積し、敵 HP、敵攻撃力、GEEK 係数、緊急脱出率に影響します。

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

## サポート

Support アイテムを拾うとサポート攻撃が発動します。直前と同じ通常サポートは避けて抽選され、元素騎士は専用イベントとして低確率で発動します。

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

いしでんのタイミング報酬でも Bronze / Silver / Gold が出現します。

## ロボット

随伴ロボットはラン開始時からプレイヤーについてきます。初期状態は Missile Lv.1 / Field Lv.1 です。

- Missile Core: ミサイル本体レベルを上げます。
- Recovery Core: 回復フィールド本体レベルを上げます。
- Golden Tune Vase: ミサイル系チューニングを 2 択で選びます。
- Silver Tune Vase: フィールド系チューニングを 2 択で選びます。

ミサイルと回復フィールドの本体レベルは最大 Lv.10 です。チューニングは Rapid Launcher、Warhead Boost、Field Cycle、Care Output があり、それぞれ最大 Lv.20 です。ミサイル命中、撃破、回復パルスでもロボット経験値が入り、ボス撃破時には Robot アイテムの追加ドロップ抽選があります。

## ショップ

Opening Shop では確定 GEEK を使用します。CD は BGM 選択と永続ボーナスを兼ねており、購入済み CD の永続効果は選択中 BGM に関係なく常時発動します。

CD:

- Anju: 初期所持
- なんでやねんねん: 100,000 GEEK / 攻撃力 +10%、弾速 +6%
- 反省会: 100,000 GEEK / 最大 HP +25、最大スタミナ +20
- 未来を生きてる: 100,000 GEEK / 移動速度 +20、連射 +5%
- コトコト: 100,000 GEEK / 攻撃力 +6%、最大スタミナ +15
- いっちゃいな: 100,000 GEEK / 弾速 +8%、移動速度 +12

永続強化:

- Weapon: 最大 Lv.10、攻撃力 +6% / Lv
- Armor: 最大 Lv.10、最大 HP +10 / Lv
- Shoes: 最大 Lv.10、移動速度 +8 / Lv

永続強化の価格は基礎 1,000 GEEK からレベルに応じて増加し、100 GEEK 単位に丸められます。ショップ表示前、帰還後、ゲーム再生成時には `shop-loading-screen` が表示されます。

## ステージ

通常プレイでは `stageDefinitions.js` の `tokyoRandomStages` から 10 種類の東京ステージがランダム選択されます。指定ステージが見つからない場合はランダム東京ステージへフォールバックし、ランダム定義がない場合は `shibuyaStage1` を使用します。

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

ゲームオーバー時に名前を入力すると、キル数ランキングへ登録します。ローカルランキングは localStorage に保存され、Firebase 接続に成功した場合はオンラインランキング `leaderboardKills` も読み書きします。

Firebase SDK は `12.13.0` を dynamic import し、匿名認証で Firestore を使用します。Firebase 設定は `game.js` 内の `FIREBASE_CONFIG` にあります。Firestore ルールは `firestore.rules` を参照してください。

ランキングはキル数、生存時間、レベル、エリート撃破数の順で並び、最大 10 件を表示します。オンライン取得に失敗した場合はローカルランキング表示に戻ります。

## 保存データ

localStorage キー:

- `lastmemoVansabaBestRecord`: ベスト記録
- `lastmemoVansabaKillRanking`: ローカルキルランキング
- `lastmemoVansabaCoins`: 確定 GEEK
- `lastmemoVansabaShopState`: CD 所持、選択 BGM、永続強化状態
- `collisionEditor:<stageId>`: 衝突判定編集モードの一時保存データ

sessionStorage キー:

- `lastmemoVansabaExtractionMessage`: 帰還後に Opening Shop へ表示する一時メッセージ

保存データを初期化したい場合は、ブラウザの DevTools から該当キーを削除してください。

## 主なファイル

- `index.html`: DOM 構造、スマートフォン開始ゲート、ショップローディング画面、スクリプト読み込み
- `style.css`: ページ枠、モバイル表示、スマートフォン開始ゲート、ショップローディング画面
- `game.js`: ゲーム本体、ショップ、ゲート、戦闘、ロボット、サポート、Firebase 連携
- `skillDefinitions.js`: スキル定義
- `stageDefinitions.js`: ステージ定義、東京ランダムステージ、衝突判定定義
- `vendor/phaser.min.js`: Phaser 3 本体
- `firestore.rules`: Firestore セキュリティルール
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

このリポジトリはビルドなしの静的構成です。ゲーム確認時は `file://` ではなくローカル HTTP サーバー経由で開いてください。
