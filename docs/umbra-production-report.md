# UMBRA SERAPH — 通常プレイ・購入・保存互換への接続

2026-10-04。ユーザーの「バランス調整は完成」「通常プレイ・購入・保存互換まで実装する。本番反映は別」を受けた実装記録。Phase 7A第10.2節で保留していた購入・保存・Google互換を今回の範囲とする。既存Phase報告は当時の記録として保持し、今回の結果で上書きしない。

## 範囲と開始状態

- HEAD: `28cfe5ab71048b0487254dceef6f66f3a25788f9`。既存の未commit実装を維持したまま作業。
- 着手時 `game.js`: `12c2f7521a2eba275535a6dbc7dce3a0e7ad0461fefe0979ca3b111fd483eca0`。
- `.tmp_umbra_production/2026-10-04-start/` に187ファイルの開始hash、baseline、HEAD、作業ツリー、開始diff、基準試験496/496 PASSを保存。
- commit／push／deploy／reset／clean、依存追加、vendor・AGENTS変更は行わない。通常の本番アカウント・実セーブは検証に使わない。
- ランキングのボタン削除など別件は今回へ混ぜない。攻撃・移動の再バランス調整も行わない。

## 通常プレイ

通常URL `http://127.0.0.1:4173/` → GEEKSHOP → HANGER。標準機、REGALIA、UMBRAの3枚を独立した領域へ配置する。UMBRAは既存の1姿勢をHANGERで遅延読込みし、素材欠損時はGraphicsへフォールバックする。新しい画像は必要としない。

購入条件はDepth10 Final Raidの永続討伐記録と**確定10,000,000 GEEK**。Depth30到達やdebug解除だけでは購入できない。所持GEEK、討伐記録、Shopを保存直前に再読込みする。購入は一度で、保存成功後にUMBRAを選択する。出撃は手動、機体切替は無料。死亡や帰還で所有は失われない。

通常出撃では正規所有、HUB、Scene、request、世代、body／worldを結び付けた `production-run` Contextを発行する。実際の通常保存・通信を維持するため `runEnvironmentIO` はnullのまま。隔離試走のRAM adapterを通常実行の代用にしない。

HUBの準備段階ではUMBRAに攻撃runtimeを作らず、出撃時にMOONLIGHT S1を初期化する。SPIKE／NOVAは通常の取得カードから開始する。Stage、Core／Final、TRIAD、SENSOR／ARMAMENT／COMBAT LINK／OVERLIMIT、通常HUD・カード・素材表示は既存の実装を共有する。

|通常UMBRAへ接続した採用値|挙動|
|---|---|
|Air Brake|既存tunedを維持。発動条件、制動式、200ms最大強度40%、EN抑制・再使用待ちも不変|
|MOONLIGHT|主通過半径倍率2.0。正常ブースト解除後、実滑走中に最大250msの斬撃|
|NOVA「辻斬り」|最大2秒。設置方向に前1800px／後120px／全幅240px。NOVA本体の放電寿命3秒は不変|
|SPIKE S8|主突き上げ半径240px。S1半径80を基準に見た目も3倍。威力、周期、200msの突き上げ、8コマは不変|

通常出撃の採用値はimmutableなrequestへ固定し、`moonReach`／`moonGlide`／`novaField`など比較用queryでは変更しない。標準機・REGALIAに専用Contextや上記補正は付与しない。

終了時は専用snapshotを取ってから攻撃・表示ownerを破棄する。ENDED後も結果用の機体identityを保持し、Archiveで標準機に化けない。次runはMoon S1へ戻る。Final Raid突入前の既存の専用表示・戦闘への切替を維持する。

## 保存形式と中断時の扱い

既存のlocalStorageキー名は変更しない。Shopはversion2、RUN ARCHIVEはversion2。Shopの機体認識と販売可否を分け、販売停止や未公開判定の変更によって正規所有を削らない。未知の機体IDは戦闘で使用せず、保存上は保持する。Shopの未知フィールドは保持し、未来version／壊れたJSONは上書きしない。

旧Shopのversion無し、既存Atlas、旧Archiveの配列形式／v1を読取り可能。未知Archive entry versionも保存を保留する。読み取れないデータがある場合はHUBで案内し、保存と出撃を停止する。自動的な初期化・全進行巻戻しはしない。

新しい端末専用キーは以下の5つ。

|キー|用途|
|---|---|
|`lastmemoVansabaProfileCompatibility`|local profile ID、epoch、owner情報|
|`lastmemoVansabaProgressionTransaction`|PREPARED／COMMITTEDの未完了操作記録|
|`lastmemoVansabaProgressionBackups`|直近最大2操作の前後データ|
|`lastmemoVansabaProgressionCompatibilityGuard`|Shop／Atlas／Archiveの最低versionとUMBRA所有・scope保持条件|
|`lastmemoVansabaCloudMigrationBackup`|schema1の未正規化cloud payload、同UID・revisionの移行前backup|

`umbraPersistence.js` は外部依存を持たず、importだけではStorageや通信に触れない。profile初回作成はbootstrap Web Lock内、購入・Atlas報酬・restoreはprofile別Web Lock内で準備・保存する。Web Locksを利用できなければ対象transactionを開始しない。

保存順はbackupの読戻し確認 → journalの読戻し確認 → 各キーを順に書込み／読戻し → COMMITTED確認 → journal削除。購入では財布が先、次に所有・選択・receiptを保存する。Shop receiptにはtransaction ID・価格・購入時刻を残す。

中断復旧は、保存済みキーが記載順の正確な前方部分と一致し、残りも保存前の値に一致する場合だけ続行する。全て未書込みなら操作を取消し、再購入可能にする。既にCOMMITTEDならjournalの後始末だけを行い、後から変化した財布・選択を古い値へ戻さない。値が矛盾する、ownerが違う、JSONが壊れている場合は保全・保留する。

通常の単独保存も、書込み前の現在値照合と互換条件確認、保存後の互換marker読戻しを通す。別タブの更新はstorage eventと保存前比較で検出する。旧版が新タブを閉じた後に保存してUMBRA所有やAtlas scopeを消した場合も、次回起動でmarkerと矛盾すれば保留する。

これは**旧タブのlocalStorage書込み自体の完全な禁止ではない**。旧コードは新しいlockを無視できる。Storage全体の消去やmarker自体を同時に変えるコードまでは防げない。元データとbackupを保全し、不一致を自動的に正常化したりcloudへ送信したりしない方式である。

backup／journalは容量を制限する。端末の容量不足は成功扱いにせず保留する。未完了時は購入、出撃、装備解析、SUPPLY、Google upload／restore／link／signoutなどの進行書込みを止める。

## Atlasと戦歴

AtlasはUMBRA用の空16組合せを追加し、既存2機体の記録を保持する。出撃時のResearch Targetを固定し、専用TRIAD完成の発見記録と正常帰還の達成記録へ接続する。機体・buildごとの一度限りのAM／Reroll Ticketは、Atlas claimとAM状態を同じtransactionで保存する。

Relay開始Depthだけで研究達成にしない。`rewardDepthReached`を使う既存条件と、緊急帰還では新しい正常帰還報酬を出さない規則を維持する。AMを確定GEEKへ混ぜない。

Archiveは明示mechId、専用3スキルのStage／Core／Final、TRIAD、COMBAT LINK、武装別OVL、Evasiveを記録する。最大20件を維持し、履歴を次runの成長データとして復元しない。保存失敗時は保存済みflagを立てず、同session内で同じentry ID・同じ初回結果を保持し、次の出撃前に再試行する。

Archiveの未保存結果はsession内で保持する。保存成功前にページを閉じた場合まで保証する永続queueは追加していない。購入・Atlas報酬・cloud restoreの中断は永続journalが対象であり、この違いを混同しない。

## Google保存とRules

同じ `playerCloudSaves` collectionで、schema1とschema2を読取り、schema2を書込む。schema1は未正規化のpayloadを同UIDのbackupへ保存・確認してから正規化する。backupが確認できない場合の移行は拒否する。

rootとcore／equipment／archiveの3segmentを1transaction、同revisionで更新する。schema2にはminWriterVersion2と4つの必要capabilityを指定し、Rulesで2→1降格を拒否する。未知schema、未知必須capability、未知top-level payloadは削って保存せず拒否する。

復元は15進行キー＋同期metadata＋互換markerの17entryをjournalで扱い、部分失敗時に古い全進行へ乱暴に巻き戻さない。ユーザーが選んだ全進行のrestoreでは、その進行に合わせて互換条件も更新する。local profile情報、journal、backupをcloudの通常進行payloadへ混ぜない。

`firestore.rules` の変更はcloud部分だけ。ランキング以降のRulesは着手時と一致する。**Rules／clientは未deploy**であり、現在の本番Rulesにschema2保存が通るという結果ではない。本番反映時は対応Rulesを先に用意し、対応clientを配信してから販売を開く順序を維持する。

## 検証と証跡

構文確認：

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check umbraPersistence.js
node --test tests/*.test.cjs
```

最新の純試験は**562/562 PASS、skip0**。既存496件を基準とし、公開前提だけが変わった旧assertは、公開後の所有・Context境界へ更新した。保存失敗を成功扱いしていたShopの旧試験は、v2の読戻し成功／失敗を区別する試験へ変更した。

保存・Cloudの専用39件には各保存前後／読戻し失敗、購入二重実行、exact-prefix復旧、COMMITTED後の財布保持、別owner、壊れたデータ、旧版による所有・scope消失、cloudのrevision競合、17entry restore、Atlas claim後・AM前の中断を含む。

既存Java／jarのFirestore emulatorを `127.0.0.1:8189`、`demo-umbra-save-test`で実行し、**Rules実試験10/10 PASS**。schema1作成、1→2移行、schema2継続は200。2→1降格、cap不足、segment混在、一部だけのwrite、stale revision、別UID、匿名は403。emulatorは終了済み。追加導入や本番接続はしていない。

ブラウザは既存Chromium headless 148／Playwright、新しい合成Storageだけのcontext、全外部要求遮断で直列実行する。通常indexからの購入・選択・再読込は実localStorage APIを使うが、実ユーザーの保存には触れない。合成開始データは20,000,000 GEEK・Final Raid討伐済み・REGALIA所有。標準機とUMBRAの通常開始、844×390のタッチ対応viewportを分ける。

Stage／Mutation境界は明示的な合成XP24回から実カードを選ぶ試験であり、自然プレイでS8へ到達した試験ではない。攻撃は通常rAFと実入力で3武装を確認する。EXTRACT handlerの実行は120秒のGate待機を省略している。スクリーンショットやJSONは攻撃観測の外で取得し、今回を性能測定とは扱わない。

最終ブラウザ結果は下記。初回失敗の証跡も別フォルダに保持する。

ブラウザ検証中に発見して修正した製品不具合は、UMBRA購入後の再読込でHUB初期スキル構築が空のstarterを拒否して停止した点。HUBを戦闘未発行の静止modelとし、正規出撃ContextでMoon S1を生成する境界へ修正、純試験を追加した。別途、旧Archive配列の誤拒否も修正した。

`browser-second`の失敗は、ハーネスが初回profile準備完了前に操作したことと、存在しないContextをundefined／nullで異なる扱いにしたことによる。ハーネスをHUB・保存・cloud判定完了待ちへ変更した。製品の初期保留を消して通したものではない。`browser-third`は4ケース全通過。

## 変更ファイルと影響

- `game.js`：通常機体登録・HANGER・購入、進行保存guard、production Context、終了処理、Atlas／Archive、Google reader/writer／restore。
- `umbraPersistence.js`：新規の保存・復旧coordinator。
- `index.html`／`umbra-integration.html`：gameより前にcoordinatorを読込み、gameのcache versionを更新。隔離ページのmodule import自体はIOを行わない。
- `firestore.rules`：Google schema2の互換条件。ランキングRulesには変更なし。
- `README.md`／本書：現在の接続方法と履歴の区別。
- 新規試験：production combat／purchase／records、persistence、cloud compatibility、Rules emulator、production browser。
- 既存試験の変更：registry、Core、TRIAD、normal Context、integration IOの公開・保存形式に関する期待値のみ。

着手時と比較して `skillDefinitions.js`、`umbraPresentation.js`、24姿勢、スキル素材、stageDefinitions、equipmentDefinitions、vendor、AGENTSを変更していない。Air Brake・通常移動・3武装のEffectiveStats／受付・NOVA矩形判定など17関連関数は開始版と一致を確認した。

GEEKはUMBRA購入時に確定分を10,000,000消費する。通常の未確定GEEKと抽出確定規則は変更しない。AMは追加したUMBRA Atlas scopeの既存条件による一度限り報酬を接続する。LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth6+契約・Gate・報酬・リセット規則を再設計しない。ランキング集計・送信形式・ブロックUIは今回変更しない。

## 未確認と次の判断

実Googleアカウントでのログイン／実クラウド往復、本番Rules／本番URL、実スマートフォン、長時間負荷・全Depth自然進行は今回の検証外。ブラウザの短い機能試験を過去の処理遅延解消や全端末性能合格へ一般化しない。ユーザーが完了としたバランス値は保持し、再調整は追加しない。

今回の成果はローカルの通常接続と保存互換の実装。本番反映は別作業として停止する。

## 最終確認

`.tmp_umbra_production/2026-10-04-start/browser-final/production-browser.json`：通常ブラウザ4ケース、**59確認項目すべてPASS／未捕捉例外0**。

|ケース|確認項目数|結果|
|---|---:|---|
|購入→reload→S1出撃→成長→3武装→EXTRACT→保存reload→次run|31|PASS|
|標準機のHANGER・正規初期武装・Opening|9|PASS|
|REGALIAの選択・正規初期武装・Opening|9|PASS|
|UMBRAの844×390横画面・HANGER・購入・出撃HUD|10|PASS|

3枚のHANGER矩形に重なりがなく、デスクトップと横画面のスクリーンショットも目視確認した。実端末でのタッチ操作や読みやすさの最終評価は別である。通常indexのSDK要求はテスト側で遮断しているため、意図したnetwork blockedメッセージは存在するが、アプリの未捕捉例外は0。

`.tmp_umbra_production/2026-10-04-start/isolation-final/integration-safety.json`：既存RAM入口の**8/8ケースPASS**。有効入口、不明・重複fixture、不許可query、bootstrap欠落、game欠落、constructor失敗、明示的な通常URL移動を検証。検証対象processの実StorageデータAPI0、非vendor Storage probe0、外部要求／通信API0。通常保存テストの成功とRAM隔離テストの成功を区別する。

最終構文確認と`git diff --check`はPASS（既存CRLF警告あり）。純試験は`final-verified-tests.txt`、Rulesは`rules-emulator.json`、保護ファイルと実際にブラウザへ配信したコードの照合は`final-integrity.json`、最終hash一覧は`final-manifest.json`へ保存。

|主要ソース|最終SHA-256|
|---|---|
|game.js|`d6367bb75dac9b698b37a76854c9ea8923e52a05bb3a2d0b1902e3f3d47ed99e`|
|umbraPersistence.js|`8aeadc20111f1406a91a73c62e4e542b637b09663e9a9165a3ed96ab790ec88e`|
|firestore.rules|`f8b844706cdb351532168ec425ed669117d9f56a6f280ee204f470fab49421b1`|
|index.html|`0ee8bcf3e29c9b9a492cbfe03a9d57d58617267cebacfed216ae3c62ed51d59d`|

開始時の過去報告・生データ、既存素材、AGENTS、vendorを保持した。HEADは開始時のまま。新しい検証記録は今回のフォルダへ追加し、本番反映へ進めず終了する。
