# ラスメモヴァンサバゲーム

Phaser 3 製のブラウザ向けサバイバルゲームです。ビルド工程はなく、静的ファイルをローカル HTTP サーバーで配信して遊べます。

プレイヤーはスキル、サポート、ロボットを強化しながら敵を倒し、XP と未確定 GEEK を集めます。一定時間ごとに出現するゲートでは、Depth を上げて続行するか、未確定 GEEK を確定して帰還するかを選びます。

## 起動方法

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

起動後、ブラウザで `http://127.0.0.1:4173/` を開きます。

スマートフォンから LAN 経由で確認する場合は、PC とスマートフォンを同じネットワークに接続し、PC の LAN IP に対して HTTP サーバーを公開してください。

## スマートフォン対応

スマートフォンで接続すると、開始前に「横向きフルスクリーンで開始しますか？」の選択画面が表示されます。フルスクリーン化と画面向きロックはブラウザ対応範囲で実行され、iOS など一部環境では手動で横向きにする必要があります。

モバイル操作は左側に仮想スティック、右側に DASH ボタンを配置しています。ショップ、アップグレード選択、ゲート選択、ゲームオーバー画面もタップで操作できます。

クエリパラメータ:

- `?mobileGate=1`: PC ブラウザでもスマートフォン開始ゲートを表示します。
- `?mobileGate=0`: スマートフォン開始ゲートを無効化します。
- `?mobileControls=1`: PC ブラウザでもモバイル操作UIを表示します。
- `?mobileControls=0`: モバイル操作UIを無効化します。

## 操作方法

- 移動: `WASD` / 矢印キー / 左仮想スティック
- DASH: `Shift` / `Space` / 右 DASH ボタン
- 選択: クリック / タップ / 数字キー
- ゲート選択: `1` で次の Depth、`2` で帰還
- ゲームオーバー画面: 名前入力後 `Enter`、`R` でリスタート

## ゲーム進行

1. ショップ画面で CD と永続強化を購入します。
2. `GAME START` で出撃します。
3. 開始時に 3 つのアップグレードから 1 つ選択します。
4. 敵を倒して XP、未確定 GEEK、サポート、ロボット強化アイテムを集めます。
5. 3 分ごとに Stage Gate が開きます。
6. ゲートでは Depth を上げて続行するか、未確定 GEEK を確定 GEEK にして帰還します。

## GEEK 仕様

`GEEK` はゲーム内通貨の名称です。

- 確定 GEEK: ショップで使用する所持通貨です。
- 未確定 GEEK: ラン中に獲得し、帰還するまで確定しない通貨です。
- 画面右側の GEEK 数値は、現在ラン中の未確定 GEEK を表示します。
- Depth 表示パネルには、Depth、未確定 GEEK、GEEK 係数、ゲート残り時間が表示されます。
- 帰還に成功すると未確定 GEEK が確定 GEEK に加算されます。
- 通常ゲームオーバーや崩壊では未確定 GEEK を失います。
- 緊急脱出では未確定 GEEK の一部だけを確定できます。

互換性維持のため、確定 GEEK の localStorage キー名は `lastmemoVansabaCoins` のままです。

## GEEK 獲得アイテム

Bronze / Silver / Gold が、未確定 GEEK を獲得できる唯一の専用アイテムです。旧仕様の単独通貨アイテム、単独 GEEK オーブ、敵から直接落ちる GEEK 専用ピックアップは廃止されています。

Bronze / Silver / Gold は XP と未確定 GEEK を同時に付与します。獲得できる未確定 GEEK 量は Depth と不安定度によって増加します。

通常アイテム:

- XP オーブ: XP のみを獲得します。
- Bronze: 小量の XP と未確定 GEEK を獲得します。
- Silver: 中量の XP と未確定 GEEK を獲得します。
- Gold: 大量の XP と未確定 GEEK を獲得します。
- Heal: HP を回復します。
- Magnet: XP オーブ、Bronze / Silver / Gold、ロボット強化アイテムを引き寄せます。
- Support: サポートキャラクターを獲得または強化します。
- Robot: ロボットスキルやチューニングを強化します。

## Depth と Stage Gate

Depth は 1 から開始します。ラン開始から 180 秒ごとに Stage Gate が開き、30 秒前から警告が表示されます。ゲートは一定時間だけ安定しており、時間切れになると崩壊します。

Depth を上げると敵の HP、攻撃力、移動速度、獲得 GEEK 量が上昇します。高 Depth では不安定度が蓄積し、緊急脱出や強制選択が発生します。

ゲート選択:

- `NEXT STAGE`: 次の Depth に進みます。
- `EXTRACT`: 未確定 GEEK を確定し、ランを終了します。

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
- Dash: 間合いを詰める突進型です。
- Tank: 高耐久型です。
- Ranged: 遠距離攻撃型です。
- Gold Slime / Silver Slime: レアアイテムとロボット花瓶を確定ドロップします。

ボスは出現後、15 秒の猶予を経て攻撃を開始します。攻撃パターンには亀裂、ビーム、扇状弾、三連弾、ランダム爆撃、雷ダッシュがあります。

## スキル

攻撃スキル:

- `basicSkill`: 通常攻撃です。
- `tornadoSkill`: 竜巻を発生させます。
- `rabbitThunderSkill`: 雷撃で範囲攻撃します。

各攻撃スキルは Stage 1 から Stage 8 まで強化できます。

パッシブ:

- Overcharge Bolt: 攻撃性能を強化します。
- Rapid Sigil: 攻撃間隔を短縮します。
- Swift Step: 移動性能を強化します。
- Stamina Core: DASH とスタミナ性能を強化します。
- Vital Bloom: 最大 HP を強化します。

## サポート

サポートはラン中に獲得、強化される補助キャラクターです。

- ぽぽちゃん
- えいとふぉー
- いもたろう
- かぴぴ
- えも子
- いしでん
- アシグラ
- 元素騎士

いしでんのタイミング報酬と元素騎士の報酬では Bronze / Silver / Gold が出現します。これらの報酬も未確定 GEEK の獲得源として Depth と不安定度の補正を受けます。

## ロボット

ロボットはラン中に獲得する補助ユニットです。

- Missile Core: ミサイルロボットを獲得または強化します。
- Recovery Core: フィールドロボットを獲得または強化します。
- Golden Tune Vase: ロボットチューニング経験値を大きく獲得します。
- Silver Tune Vase: ロボットチューニング経験値を獲得します。

ミサイルロボットとフィールドロボットは最大 Lv.10 です。チューニングは最大 Lv.20 です。ボス撃破時にはロボットアイテムの追加ドロップ抽選があります。

## ショップ

ショップでは確定 GEEK を使用します。

CD:

- Anju: 初期所持
- なんでやねんねん: 5000 GEEK
- 反省会: 8000 GEEK
- 未来を生きてる: 12000 GEEK

永続強化:

- Weapon: 攻撃性能を強化します。
- Armor: 防御性能を強化します。
- Shoes: 移動性能を強化します。

ショップ状態と所持 GEEK は localStorage に保存されます。

## ステージ

通常プレイでは `tokyoRandomStages` からステージが選ばれます。ステージ定義が利用できない場合は `shibuyaStage1` をフォールバックとして使用します。

ステージ関連のクエリパラメータ:

- `?stage=<stageId>`: 指定ステージを開始します。
- `?debug=stage`: ステージデバッグ表示を有効化します。
- `?stageDebug=1`: ステージデバッグ表示を有効化します。
- `?debug=stage&start=x,y`: 開始位置を指定します。

## ランキング

Firebase 連携が有効な場合、キル数ランキングを `leaderboardKills` コレクションに保存します。Firebase SDK は `12.13.0` を使用しています。

認証は匿名認証を使用します。ルールは `firestore.rules` を参照してください。

## 保存データ

localStorage キー:

- `lastmemoVansabaBestRecord`: ベスト記録
- `lastmemoVansabaKillRanking`: ローカルキルランキング
- `lastmemoVansabaCoins`: 確定 GEEK
- `lastmemoVansabaShopState`: ショップ購入状態
- `lastmemoVansabaExtractionMessage`: 直近の帰還メッセージ

保存データを初期化したい場合は、ブラウザの DevTools から該当 localStorage キーを削除してください。

## 主なファイル

- `index.html`: 画面構造、スクリプト読み込み、スマートフォン開始ゲート
- `style.css`: HUD、ショップ、スマートフォンUI、レスポンシブ表示
- `game.js`: ゲーム本体
- `skillDefinitions.js`: スキル定義
- `stageDefinitions.js`: ステージ定義
- `firebaseConfig.js`: Firebase 設定
- `firestore.rules`: Firestore セキュリティルール

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

衝突判定編集モードではステージデバッグ表示を有効化し、ステージ上の座標と障害物を確認します。
