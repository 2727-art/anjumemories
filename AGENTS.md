# AGENTS.md

このリポジトリで Codex が作業するときの永続的な開発指示です。
作業開始時は、必ずこの `AGENTS.md` と `README.md` を読んでから実装してください。

このファイルは、通常開発ルールに加えて、Depth6 以降の深層モード、`ANOMALY CONTRACT`、`ANJU MEMORY`、`DATA CACHE`、`OVERDRIVE`、`STABILIZE`、`LOST ARMS`、ショップ、ランキング、保存データを安全に扱うための方針をまとめています。

---

## 0. 最重要原則

- このプロジェクトは Phaser 3 を CDN / vendored file で読み込む、ビルド不要の静的ブラウザゲームです。
- npm、bundler、TypeScript、外部ビルドツールは導入しないでください。
- 既存の CDN / `vendor/phaser.min.js` 読み込み構成を維持してください。
- 変更対象は原則 `game.js` を中心にしてください。
- 仕様説明の更新が必要な場合は `README.md` も最小限更新してください。
- `skillDefinitions.js`、`stageDefinitions.js`、`index.html`、`style.css`、`firestore.rules` を変更する場合は、理由と影響範囲を明確にしてください。
- 既存の localStorage キー、Firebase / Firestore、ランキング、ショップ、BGM、LOST ARMS、ロボット、サポート、Gate、リスタート処理を壊さないでください。
- 新規画像・音声アセットを必須にしないでください。画像や音声がない場合でも Phaser Graphics / Text / Container などでフォールバックしてください。
- 仕様に関係ない大規模リファクタリングは避けてください。
- 1つの依頼に関係ない機能を勝手に追加しないでください。

---

## 1. プロジェクト概要

主なファイル:

- `index.html`: DOM 構造、スマートフォン開始ゲート、ショップローディング画面、スクリプト読み込み。
- `style.css`: ページ枠、モバイル表示、スマートフォン開始ゲート、ショップローディング画面など HTML 側の見た目。
- `game.js`: ゲーム本体。Phaser Scene、戦闘、HUD、ショップ、Gate、ドロップ、ロボット、サポート、LOST ARMS、Firebase / localStorage 連携を含む中心ファイル。
- `skillDefinitions.js`: スキル画像パスと Stage ごとの性能定義。
- `stageDefinitions.js`: ステージ背景、障害物、playBounds、東京ランダムステージ定義。
- `vendor/phaser.min.js`: Phaser 3 本体。
- `firestore.rules`: Firestore セキュリティルール。
- `README.md`: 現在のゲーム仕様と検証方法。
- `画像/`: キャラクター、敵、スキル、ステージ、CD ジャケットなどの画像素材。
- `音声/`: BGM、サポート音声、SE などの音声素材。

`game.js` は大きいファイルなので、追加実装では以下を意識してください。

- 既存処理の入口と出口を先に確認する。
- 既存関数をできるだけ再利用する。
- 大きな関数に直書きしすぎず、小さな helper に分ける。
- マジックナンバーは設定オブジェクトまたは既存定数群へまとめる。
- 破棄済み GameObject、Tween、TimerEvent、Keyboard / Pointer listener を参照し続けない。

---

## 2. 実行・確認方法

ローカル確認は原則として以下を使ってください。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:4173/
```

`file://` 直開きは画像、音声、Phaser の読み込みで不安定になる可能性があるため、基本的にローカル HTTP サーバー経由で確認してください。

構文チェック:

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
```

`index.html` や `style.css` を変更した場合は、ブラウザコンソールでエラーが出ていないことも確認してください。

代表的な確認 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0
http://127.0.0.1:4173/?debugLostArms=1
http://127.0.0.1:4173/?debug=stage
```

Depth6 以降関連の確認では、必要に応じて query parameter 付きの debug 機能を追加して構いません。ただし通常プレイ時に debug UI や console spam を出さないでください。

推奨 debug parameter:

```text
?debugAnomalyContract=1
?debugAnjuMemory=1
?debugLostArms=1
```

---

## 3. 現在の主要仕様を壊さない

### 3.1 スキル

既存の攻撃スキル ID は変更しないでください。

- `basicSkill`: 初期解放。Stage 1〜8。
- `tornadoSkill`: 未所持から Unlock 可能。Stage 1〜8。
- `rabbitThunderSkill`: 未所持から Unlock 可能。Stage 1〜8。

表示名を変更する場合は、内部 ID ではなく UI 用メタデータで対応してください。

### 3.2 パッシブ

現在のパッシブ候補:

- Overcharge Bolt
- Rapid Sigil
- Swift Step
- Stamina Core
- Vital Bloom

パッシブ候補を変更する場合は、候補生成、実際の効果適用、UI 表示、上限や下限の扱いをセットで確認してください。

### 3.3 レベルアップ UI

レベルアップ画面は重要な報酬演出です。単なるテキストリストではなく、商業ゲーム寄りのカード UI として扱ってください。

候補表示の基本方針:

- 合計 3 択を維持する。
- スキル候補は最大 2 つまで。
- 残り枠をパッシブ候補で埋める。
- 所持済みスキルは次 Stage への強化として表示する。
- 未所持スキルは Unlock 候補として表示する。
- 上限到達済み、または選んでも効果が出ない候補は表示しない。
- スキル候補は定義順で固定的に選ばず、シャッフルまたは重み付き抽選で偏りを避ける。
- `rabbitThunderSkill` が序盤から候補に出る可能性を持たせる。

カード種別:

- `NEW SKILL`
- `SKILL UPGRADE`
- `RARE UPGRADE`
- `FINAL STAGE`
- `PASSIVE CHIP`

表示方針:

- `DMG 4->5` のようなデバッグ寄り表示ではなく、`DMG +1` のような差分チップにする。
- `HIT 460->380ms` は `HIT -80ms` または `攻撃間隔 -0.08s` のように見せる。
- 新効果は `NEW EFFECT: 吸引フィールド解放` のように強調する。
- Stage 進行は `●●●○○○○○` のように視覚化する。
- クリック、タップ、`1`、`2`、`3` キーで選択できるようにする。
- 選択中カードは発光・拡大などで反応を出す。
- 選択後は短い演出後に既存の強化適用処理へ進む。
- 二重選択を防止する。
- オーバーレイ破棄時にイベントリスナーや Phaser オブジェクトを確実にクリーンアップする。

---

## 4. 通貨・保存データの絶対ルール

### 4.1 GEEK

`GEEK` には2種類あります。

- 確定 GEEK: Opening Shop で使用できる所持通貨。
- 未確定 GEEK: ラン中に獲得し、帰還するまで確定しない通貨。

必ず守ること:

- ラン中の報酬は、原則として未確定 GEEK に加算する。
- 確定 GEEK を直接増やすのは、通常 `EXTRACT` または既存の緊急脱出確定処理だけにする。
- `lastmemoVansabaCoins` は確定 GEEK の互換性維持キーなので変更しない。
- Bronze / Silver / Gold は XP と未確定 GEEK を同時に付与する既存仕様を維持する。
- 旧仕様の単独 GEEK オーブや、敵から直接落ちる GEEK 専用通常ピックアップを復活させない。

### 4.2 既存 localStorage / sessionStorage キー

既存キーは変更しないでください。

localStorage:

- `lastmemoVansabaBestRecord`
- `lastmemoVansabaKillRanking`
- `lastmemoVansabaCoins`
- `lastmemoVansabaShopState`
- `lastmemoVansabaLostArmsState`
- `collisionEditor:<stageId>`

sessionStorage:

- `lastmemoVansabaExtractionMessage`

Depth6+ 追加機能で新しい保存データを足す場合は、既存キーに混ぜず、新規キーを使ってください。

推奨追加キー:

- `lastmemoVansabaAnjuMemoryState`: ANJU MEMORY 所持数、アンロック、選択中 cosmetic、チケットなど。

保存データの実装ルール:

- JSON parse に失敗してもゲームが落ちないよう fallback する。
- version を持たせ、将来の migration に備える。
- 古い保存データに新フィールドがなくても自動補完する。
- ラン中の一時状態を localStorage に即保存しない。

---

## 5. Depth と Stage Gate のルール

Depth は 1 から開始します。各 Depth の開始から 180 秒で Stage Gate が開きます。

通常 Gate:

- `NEXT STAGE`: 次の Depth へ進む。
- `EXTRACT`: 未確定 GEEK を 100% 確定してラン終了。

不安定 Gate:

- `FORCE BREAKTHROUGH`: 不安定度を保持したまま次 Depth へ進む。
- `EMERGENCY EXTRACT`: 不安定度に応じた割合だけ未確定 GEEK を確定し、残りを失う。

Depth5 までに Gate を放置すると崩壊してゲームオーバーです。Depth6 以降では崩壊の代わりに不安定度が蓄積し、敵 HP、敵攻撃力、GEEK 係数、緊急脱出率に影響します。

Depth6+ 機能の判定は以下を使い分けてください。

- 次の Depth に入る前の選択・報酬予約: `targetDepth >= 6`
- すでに深層内で効果を適用する処理: `currentDepth >= 6`
- 契約など「次Depthだけ有効」な効果: `activeDepth === currentDepth`

`NEXT STAGE` / `FORCE BREAKTHROUGH` / `EXTRACT` / `EMERGENCY EXTRACT` の既存分岐を変更する場合は、Depth 遷移、ドロップ圧縮、LOST ARMS 保存、未確定 GEEK 確定、ショップ復帰、リスタートの順序を必ず確認してください。

---

## 6. DATA CACHE とドロップ整理

ラン中のドロップ増えすぎを防ぐため、既存のドロップ上限と Depth 遷移時の報酬圧縮を維持してください。

現在の上限目安:

- 全体: 260
- XP: 170
- Bronze / Silver / Gold: 90
- Robot: 28
- Support: 16
- Heal: 4
- Magnet: 3
- DATA CACHE: 3

Depth 遷移時:

- 前 Depth に残った XP / Bronze / Silver / Gold / DATA CACHE の報酬量を集計する。
- XP と未確定 GEEK の一部を DATA CACHE へ圧縮する。
- 初期圧縮率は 25% を基準にする。
- DATA CACHE は 1〜3 個に分割する。
- 前 Depth の通常ドロップは残さない。
- 敵、ボス、弾、プレイヤー、サポート本体、ロボット本体、HUD、Gate UI、背景、障害物は削除対象にしない。

実装注意:

- `destroy()` だけでなく、group / 配列 / 参照からも安全に除去する。
- 列挙中に削除する場合は `getChildren().slice()` などでコピーしてから処理する。
- Magnet、collision、minimap、HUD が破棄済み pickup を参照しないよう guard する。
- 毎フレームの重い全探索や O(n^2) 処理を追加しない。
- 生成時 enforce + 1秒程度の安全 cleanup を優先する。

Depth6+ modifier との関係:

- DATA CACHE 圧縮に契約や Deep CD の補正を入れる場合、どの Depth の報酬に対する補正かを明確にする。
- Depth5→6 で選んだ契約を Depth5 の残ドロップ圧縮に混ぜない。
- Depth6 用契約なら、Depth6 の戦闘・報酬・Depth6→7 圧縮に効く設計を基本にする。

---

## 7. Overflow 報酬: OVERDRIVE / STABILIZE

### 7.1 XP overflow → OVERDRIVE

すべての有効なスキル候補とパッシブ候補が上限に達した後、XP は `OVERDRIVE` に変換されます。

守ること:

- まだ有効なレベルアップ候補がある間は、XP を通常 XP として扱う。
- XP 上限後に空のレベルアップ UI を出さない。
- XP 上限後の XP、Bronze / Silver / Gold の XP 成分、DATA CACHE の XP 成分は OVERDRIVE に流す。
- 未確定 GEEK 成分は既存の未確定 GEEK 付与処理へ流す。
- OVERDRIVE はラン内一時状態で、ショップ・リスタート・ゲームオーバー・帰還でリセットする。
- OVERDRIVE の倍率は既存の永続強化や CD 効果と分離し、一時倍率として扱う。

### 7.2 Robot / Support overflow → STABILIZE

Robot 報酬や Support 報酬が上限または無効で通常効果を出せない場合、`STABILIZE` と未確定 GEEK に変換されます。

守ること:

- その報酬が本当に無効になる場合だけ変換する。
- まだ Robot / Support が強化可能なら既存処理を優先する。
- STABILIZE は 100% で 1 charge、最大 3 charge。
- Gate 出現時、保持 charge を消費して安定時間を延長する既存仕様を壊さない。
- charge 上限を超える分は未確定 GEEK に変換する。
- 確定 GEEK / localStorage を直接増やさない。
- STABILIZE はラン内一時状態で、ショップ・リスタート・ゲームオーバー・帰還でリセットする。

---

## 8. ANOMALY CONTRACT 実装ルール

`ANOMALY CONTRACT` は、Depth6 以降へ進むときに表示する、次 Depth だけ有効なリスク / 報酬カードです。

発生条件:

- `targetDepth >= 6`
- Gate の `NEXT STAGE` または `FORCE BREAKTHROUGH` で次 Depth へ進む場合。
- `EXTRACT`、`EMERGENCY EXTRACT`、ゲームオーバー、リスタートでは表示しない。
- Depth5→6 でも表示する。

基本フロー:

1. Gate で継続が選ばれる。
2. `targetDepth = currentDepth + 1` を計算する。
3. 旧 Depth の必要な終了処理と DATA CACHE 圧縮の順序を確認する。
4. `targetDepth >= 6` なら契約 3択 UI を表示する。
5. プレイヤーが契約を選ぶ。
6. 選択結果を pending 状態で保持する。
7. targetDepth 開始後に active 契約として有効化する。
8. 契約効果はその Depth の間だけ適用する。
9. 次の契約選択、EXTRACT、EMERGENCY EXTRACT、ゲームオーバー、リスタートで解除する。

状態管理方針:

- 契約状態はラン内一時状態にする。
- localStorage / sessionStorage に保存しない。
- pending と active を明確に分ける。
- active 契約の有効条件は `activeDepth === currentDepth` を基本にする。

推奨 helper:

- `initializeAnomalyContractState()`
- `resetAnomalyContractState()`
- `shouldOfferAnomalyContract(targetDepth, gateMode)`
- `openAnomalyContractSelection(targetDepth, onSelected)`
- `buildAnomalyContractChoices(targetDepth)`
- `selectAnomalyContract(contractId, targetDepth)`
- `activatePendingAnomalyContract(targetDepth)`
- `clearActiveAnomalyContract(reason)`
- `getActiveAnomalyContract()`
- `getAnomalyContractModifier(key, fallbackValue)`
- `updateAnomalyContractHud()`

UI 方針:

- 3枚の契約カードを表示する。
- 同一画面で重複契約を出さない。
- 直前に選んだ契約は、可能なら次回候補から除外または低確率にする。
- クリック / タップ / `1` `2` `3` で選択可能にする。
- 契約選択中はゲーム進行を止めるか、安全にブロックしてプレイヤーが死なないようにする。
- overlay 破棄時に listener、Tween、TimerEvent を確実に解除する。

効果適用方針:

- 各所に直接 `if (activeContract...)` を散らさない。
- `getAnomalyContractModifier()` または用途別 helper を通す。
- enemy HP / damage / speed、GEEK 係数、Bronze / Silver / Gold、LOST ARMS、OVERDRIVE、STABILIZE、Gate 安定時間、DATA CACHE、Rare Slime など、実装した対象だけ README と報告に明記する。
- 未実装 modifier を定義だけ残さない。未実装なら契約説明からも外す。
- GEEK への効果は未確定 GEEK にのみ反映し、確定 GEEK / `lastmemoVansabaCoins` を直接変更しない。

---

## 9. ANJU MEMORY 実装ルール

`ANJU MEMORY` は Depth6 以降の到達・帰還で得られる深層専用メタ報酬です。確定 GEEK とは別素材です。

正式名称:

- 表示名: `ANJU MEMORY`
- 説明: `深層到達で得られるアンジュの記憶片`
- 推奨保存キー: `lastmemoVansabaAnjuMemoryState`

獲得条件:

- ラン中の最大到達 Depth が 6 以上。
- 通常 `EXTRACT` または `EMERGENCY EXTRACT` でランが終了した。
- そのランでまだ ANJU MEMORY を保存していない。

保存しない条件:

- 最大到達 Depth が 5 以下。
- 通常ゲームオーバー。
- Depth5 までの Gate 崩壊。
- リスタート。
- ショップに戻るだけ。
- debug による強制終了。
- すでに同ランで保存済み。

報酬設計:

- 通常 `EXTRACT`: 100%。
- `EMERGENCY EXTRACT`: 通常より少量。目安 35%。
- ゲームオーバー: 0%。
- 初回到達 milestone bonus は保存成功時だけ確定する。
- pending ANJU MEMORY はラン中一時状態にし、localStorage に即保存しない。
- 二重加算を防ぐ `awarded` guard を入れる。

ANJU MEMORY は以下の解放に使えます。

- 高 Depth 専用 CD。
- HUD スキン。
- Gate 演出スキン。
- LOST ARMS の見た目強化。
- Opening Boost 候補 +1 回抽選権。
- Opening Boost Reroll Ticket。
- Depth6 開始時の称号。
- ランキング表示用バッジ。
- MEMORY LOG。
- EXTRACTION RESULT FRAME。
- ANOMALY CONTRACT CARD BACK。

実装注意:

- ANJU MEMORY を GEEK に混ぜない。
- `lastmemoVansabaCoins` を直接増やさない。
- ANJU MEMORY Shop は Opening Shop 内のタブまたはセクションとして追加する。
- cosmetic は購入済み / 未購入 / 選択中を明確に表示する。
- 選択状態は `lastmemoVansabaAnjuMemoryState` に保存する。
- Deep CD 効果は Depth6+ 限定の小さな効果にする。
- Deep CD 効果で確定 GEEK を直接増やさない。
- Opening Boost チケットは消費タイミングを明確にし、消費後すぐ保存する。
- ランキング用 title / badge / maxDepthReached / anjuMemoryEarned は古いデータにフィールドがなくても落ちないよう fallback する。
- Firebase へ追加フィールドを送る場合、`firestore.rules` も必要最小限で確認・更新する。

推奨 helper:

- `loadAnjuMemoryState()`
- `saveAnjuMemoryState()`
- `normalizeAnjuMemoryState(raw)`
- `initializeRunAnjuMemoryState()`
- `updateRunMaxDepthReached(depth)`
- `calculateAnjuMemoryRewardForRun(extractMode)`
- `awardAnjuMemoryOnExtraction(extractMode)`
- `clearPendingAnjuMemory(reason)`
- `addAnjuMemory(amount, reason)`
- `spendAnjuMemory(amount, reason)`
- `hasAnjuMemoryUnlock(category, id)`
- `unlockAnjuMemoryReward(category, id)`
- `selectAnjuMemoryCosmetic(category, id)`
- `createAnjuMemoryShopPanel()`
- `refreshAnjuMemoryShopPanel()`

---

## 10. LOST ARMS ルール

LOST ARMS は通常レベルアップ 3択には出ないレア武器です。

既存仕様を維持してください。

- `ABYSS RAIL`
- `GRAVITY SEED`
- 各武器最大 Lv.8。
- 1ランで拾える LOST ARMS 強化は最大2個。
- MVP では同じ武器の仮強化は1ラン中に最大 +1。
- `NEXT STAGE` では仮強化を持ったまま次 Depth へ進む。
- 通常 `EXTRACT` では仮強化を永続 Lv に保存する。
- ゲームオーバー、Gate 崩壊、`EMERGENCY EXTRACT` では仮強化は失われる。
- 両方 Lv.8、またはそのランで候補がない場合の抽選成功は Gold 相当の代替報酬に変換する。

ANOMALY CONTRACT や Deep CD で LOST ARMS 抽選率を補正する場合:

- 永続 Lv、pity、ラン内上限、EXTRACT 保存処理を壊さない。
- pity cap を恒久変更しない。
- 契約効果は一時補正として扱う。
- ANJU MEMORY の LOST ARMS スキンは見た目だけ変更し、性能を変えない。

---

## 11. Support / Robot ルール

### Support

Support アイテムはサポート攻撃を発動します。通常サポート、元素騎士、いしでんのタイミング報酬などが絡むため、既存分岐を慎重に扱ってください。

- Support が通常発動できるなら既存処理を優先する。
- 元素騎士イベント中などで Support が通常発動できない場合は、STABILIZE と未確定 GEEK に変換する既存仕様を維持する。
- Support overflow の GEEK は未確定 GEEK にする。

### Robot

随伴ロボットはラン開始時から存在します。

- Missile Core / Recovery Core の本体レベルは最大 Lv.10。
- チューニングは最大 Lv.20。
- 上限済み Robot 報酬は STABILIZE と未確定 GEEK に変換する既存仕様を維持する。
- 強化可能な Robot 報酬まで overflow 変換しない。

---

## 12. UI / HUD 方針

このゲームは暗い SF HUD、金属フレーム、黒いガラスパネル、青・シアン系ネオンと相性が良いです。

UI を追加・改修するときは以下を意識してください。

- 黒い半透明ガラスパネル。
- 金属フレーム。
- 青 / シアンのネオン枠。
- 控えめな発光。
- 斜めカットのメカ UI。
- 読みやすい文字サイズ。
- 情報量を詰め込みすぎない。
- スマホ横画面や狭い画面でも破綻しない。
- HUD、レベルアップ、Opening Boost、ANOMALY CONTRACT、ANJU MEMORY Shop、ランキングなどの UI は同じ世界観に寄せる。

Phaser 実装ルール:

- UI は Phaser の `Container`、`Graphics`、`Text`、`Image`、`Sprite`、`Tween` を中心に実装する。
- Phaser Canvas 内のゲーム UI は、原則として Phaser GameObjects で実装する。
- `style.css` はページ全体、canvas 配置、背景、外枠など HTML 側の調整に限定する。
- 画像が存在しない場合でも落ちないよう Graphics の簡易表現にフォールバックする。
- `setInteractive` を使う場合は、破棄時にイベントや参照が残らないようにする。
- Tween を追加する場合は、シーン遷移、ゲームオーバー、リスタート時に残留しないようにする。
- 表示オブジェクトの depth / z-index を確認し、HUD、オーバーレイ、ゲーム内オブジェクトの前後関係を崩さない。
- 選択オーバーレイ中に敵や弾でプレイヤーが死亡しないよう、一時停止または安全ブロックする。

---

## 13. Opening Shop / Opening Boost

Opening Shop はゲーム開始前の中心画面です。

守ること:

- 既存の CD 選択、BGM 再生、確定 GEEK 購入、永続強化を壊さない。
- ANJU MEMORY Shop を追加する場合は、既存ショップのセクションまたはタブとして追加する。
- 確定 GEEK 商品と ANJU MEMORY 商品を混同しない。
- 購入通貨と所持数を明示する。
- スマホ横画面でタップしやすい UI にする。

Opening Boost:

- ゲーム開始時に 3回ぶんの強化を選択する既存仕様を維持する。
- ANJU MEMORY の `Opening Boost +1 Ticket` は、候補数を1回だけ +1 する。
- `Opening Boost Reroll Ticket` は候補を1回だけ再抽選する。
- チケット消費は保存し、二重消費や連打を防ぐ。
- 上限到達済み・効果なし候補を出さない既存方針を維持する。

---

## 14. ランキング / Firebase

ランキングはローカル localStorage と Firebase Firestore の両方があり得ます。

守ること:

- 既存のローカルランキングを壊さない。
- Firebase Anonymous Auth / Firestore 読み書きを壊さない。
- オンライン取得に失敗した場合はローカルランキング表示へ戻る既存挙動を維持する。
- 既存データに新フィールドがなくても表示できるよう fallback する。

Depth6+ 追加フィールド例:

- `maxDepthReached`
- `bestDepth`
- `anjuMemoryEarned`
- `selectedTitle`
- `selectedBadge`
- `nemesisKills` など将来拡張用

追加する場合:

- ソート順変更は依頼がある場合だけ行う。
- 表示上は Depth、称号、バッジを小さく追加してよい。
- Firestore rules が追加フィールドを拒否する場合は `firestore.rules` を必要最小限で更新する。
- 古いオンラインランキングデータで UI が壊れないようにする。

---

## 15. アセットとパス

- 日本語ディレクトリ名 `画像/`、`音声/` を壊さないでください。
- 既存の画像・音声パスを変更する場合は、参照箇所をすべて確認してください。
- 新規アセットを必須にする変更は避けてください。
- 新しい UI や cosmetic に画像が必要な場合も、まず既存アセットまたは Phaser Graphics で成立するようにしてください。
- Deep CD は新規音声がない場合、既存 BGM または現在選択中 BGM にフォールバックしてください。

---

## 16. Debug 実装方針

検証しづらい高 Depth 機能には debug parameter を追加して構いません。

例:

- `?debugLostArms=1`
- `?debugAnomalyContract=1`
- `?debugAnjuMemory=1`
- `?debug=stage`

守ること:

- 通常プレイ時に debug ログやチート UI を出さない。
- debug parameter があるときだけ console ログやテスト補助を有効にする。
- 恒久的なチートボタンを通常表示に残さない。
- debug 用の処理でも保存データを壊さない。
- debug で ANJU MEMORY を増やす場合は、明示的な debug parameter があるときだけにする。

---

## 17. 実装時の進め方

大きな変更を行う場合は、以下の順で進めてください。

1. `AGENTS.md` と `README.md` を読む。
2. 関連する既存処理を読む。
3. 入口と出口を確認する。
4. 保存データ・ラン内状態・UI 破棄条件を確認する。
5. 既存処理を再利用できる箇所を特定する。
6. 設定値は定数化する。
7. 小さく変更する。
8. 構文チェックを行う。
9. 可能ならブラウザで動作確認する。
10. 変更内容、検証結果、未確認事項を日本語で報告する。

コード変更の方針:

- 既存コードの意図を推測で壊さない。
- 既存関数を可能な限り再利用する。
- 大きな関数に処理を追加しすぎる場合は、小さな helper に分ける。
- マジックナンバーを増やしすぎない。
- 既存の命名規則に寄せる。
- 仕様に関係ないリファクタリングを広範囲に行わない。
- 1つの依頼に関係ない機能を勝手に追加しない。

---

## 18. Depth6+ 変更時の重点チェックリスト

Depth6+、ANOMALY CONTRACT、ANJU MEMORY、DATA CACHE、OVERDRIVE、STABILIZE、LOST ARMS、ランキングを触った場合は、以下を確認してください。

### Depth / Gate

- Depth1〜5 の Gate では深層専用 UI が不要に出ない。
- Depth5→6 で必要な深層 UI や通知が出る。
- `NEXT STAGE` / `FORCE BREAKTHROUGH` / `EXTRACT` / `EMERGENCY EXTRACT` の分岐が壊れていない。
- Gate 選択中や契約選択中に敵や弾で死亡しない。
- Gate 安定時間、STABILIZE 延長、不安定度、緊急脱出率が壊れていない。

### DATA CACHE / Drop

- Depth 遷移直後、前 Depth の通常ドロップが残っていない。
- DATA CACHE は最大3個を超えない。
- DATA CACHE の XP 成分と未確定 GEEK 成分が正しく処理される。
- ドロップ上限で Gold / DATA CACHE が優先的に消えない。
- Magnet、collision、minimap が破棄済み drop を参照しない。

### OVERDRIVE / STABILIZE

- XP 成長が残っている間は XP が通常処理される。
- XP 成長が上限済みのときだけ OVERDRIVE に変換される。
- Robot / Support が強化可能な間は通常処理される。
- Robot / Support が無効なときだけ STABILIZE と未確定 GEEK に変換される。
- ラン終了、帰還、ショップ復帰、リスタートで状態が残らない。

### ANOMALY CONTRACT

- `targetDepth >= 6` の継続時だけ表示される。
- 3つの異なるカードが出る。
- 選択後、次 Depth だけ有効になる。
- 契約効果が旧 Depth の圧縮や確定 GEEK に混ざらない。
- 契約状態が localStorage に保存されない。
- overlay 破棄後にクリックやキー入力が二重発火しない。

### ANJU MEMORY

- Depth5以下で EXTRACT しても増えない。
- Depth6以上で通常 EXTRACT すると保存される。
- Depth6以上で EMERGENCY EXTRACT すると通常より少なく保存される。
- ゲームオーバーでは保存されない。
- pending がリスタートやショップ復帰で残らない。
- `lastmemoVansabaCoins` とは別管理される。
- ANJU MEMORY Shop の購入・選択・チケット消費が保存される。
- 古い保存データでも起動できる。

### LOST ARMS

- 通常レベルアップ 3択に出ない。
- 通常 EXTRACT で仮強化が永続保存される。
- EMERGENCY EXTRACT / ゲームオーバーでは仮強化が保存されない。
- 契約や Deep CD の補正が pity / Lv / ラン内上限を壊さない。
- 見た目スキンは性能を変えない。

### Shop / Ranking / Firebase

- Opening Shop が起動する。
- CD 購入、BGM 選択、永続強化が壊れていない。
- ANJU MEMORY Shop が既存ショップを崩していない。
- ローカルランキングが古いデータでも表示できる。
- Firebase 送信に失敗してもゲームが止まらない。
- 追加フィールドが Firestore rules と矛盾しない。

---

## 19. 検証レポート

作業完了時は、日本語で以下を報告してください。

- 変更したファイル。
- 実装した内容。
- 既存機能への影響。
- 追加・変更した保存キー。
- GEEK / ANJU MEMORY / LOST ARMS / DATA CACHE / OVERDRIVE / STABILIZE への影響。
- Depth6+ 機能の発生条件とリセット条件。
- UI / HUD / Shop / Ranking の変更点。
- 実行した検証コマンド。
- ブラウザ確認の有無。
- 確認できなかった項目。
- 次に確認すべきこと。

最低限の構文チェック:

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
```

可能ならローカルサーバーで起動確認してください。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

---

## 20. 迷ったときの判断基準

- README と実装が食い違う場合は、まず `game.js` の現状を確認し、変更内容と README 更新内容を報告してください。
- ラン中の報酬は未確定 GEEK、ショップで使う通貨は確定 GEEK、深層メタ報酬は ANJU MEMORY と分けてください。
- Depth6+ の機能は、Depth1〜5 のテンポや難易度を変えないようにしてください。
- 強い永続効果よりも、Depth6+ 限定の小さな補正、cosmetic、称号、ログ、ランキング表示を優先してください。
- 一時状態、pending 報酬、overlay、Tween、TimerEvent は、ラン終了・リスタート・ショップ復帰で必ず掃除してください。
- プレイヤーに不利な危険要素を追加する場合は、必ず分かりやすい報酬・UI 表示・選択肢をセットにしてください。
