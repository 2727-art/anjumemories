# KGK-02 UMBRA SERAPH — Phase 6B 基本Stage成長・取得／強化・HUD

作業日: 2026-09-07。今回承認された [Phase 6A設計書](umbra-phase6a-design.md) 第2・3・5・6・9.2節の基本Stage部分を隔離試走へ実装した。設計書自体は当時の未承認案として保持した。数値は検証実装の基準であり、人間確認前に体感・視認性・正式公開バランスを最終合格とはしない。

## 1. 着手時状態・変更範囲

開始HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始時からREADME・game.js・index.html・skillDefinitions.jsに未commit変更があり、docs・tests・UMBRAモジュール・素材が未追跡だった。これらをPhase 1～6Aの現在の成果として保護した。

開始game.js SHA-256はPhase 5報告と一致した。

```text
fd27f20c159682ae7363654b238e49f29b8327e2703900205ccbf129a9e0a451
```

開始状態・95ファイルのhashと実体を `.tmp_umbra_phase6b/2026-09-07T10-12-15-846Z/start-manifest.json` と `baseline/` に保存した。以下、本報告での証跡パスはこのディレクトリを基準とする。過去の報告・生データを上書きしていない。

|変更ファイル|目的・影響範囲|
|---|---|
|game.js|実行Contextに結び付くStage resolver、取得／差分適用、Moon再離脱gate、Nova不足枠追加、Stage実効getter、候補／カード文面、RAM deferred記録、隔離bootstrap|
|skillDefinitions.js|3武装×8Stageの不変配列。S1は既存objectを共有|
|umbraDriveRuntime.js|許可した本番関数だけを隔離Sceneへ接続。実カード選択・360ms確定・古いcallback遮断|
|umbraDriveFixtures.js|成長用の開始パッシブ0と旧fixture付与値を区別。旧fixture定義は維持|
|umbraDrive.js|連続成長、合成XP、Phaserカード、入力／停止／再表示、狭い画面の日本語折り返し|
|umbraMoonlightArena.js|同じ攻撃場の成長HUD、比較用新規reset、cast半径に対応するSPIKE地面表示|
|index.html|変更したgame.js・skillDefinitions.jsの `?v` のみ更新。動的に読む変更4モジュールも専用版番号を更新|
|README.md／本報告|限定入口、操作、実装済み範囲と未確認事項|
|tests/|新規成長・境界・UI・比較・rAF・保存監査。既存期待の限定更新は第10節|

AGENTS・vendor・画像27枚・metadata・stageDefinitions・equipmentDefinitions・rules・既存報告は変更していない。commit／push／deploy／reset／clean／依存導入／実セーブ／本番account／外部通信を行っていない。

## 2. 今回採用した基本Stage表

Core／Final・TRIAD・新装備対応を含まない基礎値。pxはワールド座標、時間はms。

|Stage|Moon raw／通過R／離脱外縁／基本再命中|SPIKE raw／攻撃R／基本周期|NOVA 周回raw／射程・残留raw／射程・総枠|
|---|---|---|---|
|S1|4 / 60 / 72 / 750|5 / 80 / 1800|2 / 220・3 / 300・1|
|S2|5 / 60 / 72 / 750|5 / 90 / 1800|2 / 230・3 / 300・1|
|S3|6 / 62 / 74 / 750|5 / 100 / 1800|2 / 230・3 / 310・1|
|S4|7 / 64 / 76 / 725|5 / 110 / 1800|2 / 230・3 / 310・2|
|S5|8 / 64 / 76 / 725|5 / 122 / 1800|3 / 230・3 / 310・2|
|S6|9 / 66 / 78 / 700|5 / 135 / 1800|3 / 230・3 / 320・2|
|S7|10 / 68 / 80 / 675|5 / 147 / 1800|3 / 240・3 / 320・2|
|S8|12 / 70 / 82 / 650|5 / 160 / 1800|3 / 240・3 / 320・3|

Moon離脱余白12・再命中下限200・8コマ10fps・FX上限12、SPIKE探索600・下限500・空探索150・突上200・8コマ10fps・寿命800・cast上限3、NOVA周回900/下限300・残留500/下限200・周回R80/周期4000・設置間隔800/距離120・残留3000未満・再生成1200・8コマ8fpsを維持する。SPIKEはS1から範囲内の複数敵へ命中し、Stage上昇だけで単体威力・周期は増えない。

未実装: Core／Final実効果・副攻撃・slow・field・Mutationカード・TRIAD・SENSOR/ARMAMENT/OVERLIMIT等の専用3武装対応・通常HANGER・購入・所有保存・販売。Phase 6A設計の8.4以降のMutation／装備値を今回の期待値へ混ぜていない。

## 3. 正規Stageと非公開制限

`stages[0] === verificationStage1` の同一参照を維持し、配列・各Stageをfreezeした。S1の二重定義を作らず、S2以降だけ差分を生成する。定義の `previewOnly:true`、`behavior:"displayOnly"`、通常 `startsUnlocked:false` は維持し、非空配列だけで公開可能にしない。

`getUmbraActiveSkillStage(skillId)` は実行中UMBRA・明示許可された隔離Scene・Context同一性・run/owner/body/world・生存中owner・取得stateのrun参照・正規定義・整数index・currentStage同一参照・専用behaviorを検査する。HUB選択値、URLだけ、複製Stage、behaviorだけでは攻撃しない。無効indexや古いContextをS1へ戻さず、成長由来のstateは許可flagを外しても旧S1経路へ抜けない。

問い合わせはruntime・slot・命中履歴・milestoneを生成／変更しない。カード比較用の明示Stage引数も、その武装の正規配列に含まれるobjectだけ許す。通常の購入／選択／所有／preload／Mutation archive／装備保存IDは拡張していない。

## 4. 取得・強化・新規試験の分離

`applySkillStage` は専用武装を既存orbital生成／破棄より前で分岐する。初回Unlockだけ当該runtimeを作り、既存敵のlifeをその武装へ登録する。通常強化は正規Stageと実効profileの更新・必要差分だけを反映する。`arena.connect`／`resetDrive`／fixture再構築へ流さない。

runtimeへ前回適用済みの**数値profile**を保存して比較する。同Stage・重複適用は冪等で、将来の同Stage数値差も検出できる。適用前のcurrentStageが前回の正規Stageと違う場合は黙って補正しない。Stage低下・枠減少は新規比較resetだけを入口とする。

通常Stage強化では位置・速度・AP・EN・敵body/life・攻撃時計・履歴・既存cast・既存slot・FXを保持する。NOVAを先に取得して後からSPIKEを取得しても、既存runtimeを置換せず、物理observerはTrace/Moon→SPIKE→NOVAの順を保つ。

## 5. 状態境界の検証

|対象|反映・保持の結果|
|---|---|
|Moon 威力だけのS1→S2／S4→S5|armed／離脱状態を触らない。life/pass/lastHit/cursor/履歴を保持|
|Moon 半径または外縁差|既存recordにradiusRebasePending、armed=false、初回近接特例を遮断。新外縁の外側を信頼できる実start/endで観測した後の有効進入だけ受付。除外された角や不明補正を離脱根拠にしない|
|Moon 再命中間隔|旧lastHitAt＋最新intervalを次の正当な進入で判定。強化時点で命中しない。敵cursorを消さずwarp検出を維持|
|SPIKE cast途中のS1→S8|cast+100msでも旧R80・位置・raw・attempted・impact200・寿命800を保持。次castだけR160。nextCastAtMsを0へ戻さない|
|NOVA ORBITING|ID/cycle/位相/現在の次pulse期限を保持。次の正規pulseで最新raw/射程、以後の待ち時間に最新interval|
|NOVA DEPLOYED|配置時の位置・raw・射程・interval・期限・regen snapshotを保持|
|NOVA REGENERATING|既存regen期限を保持。完了後の初回pulseは最新interval分待つ|
|NOVA S4／S8増枠|不足分だけ最大ID+1、新ORBITING・cycle0・予約なし・現在combat時刻＋最新orbit interval。0→π→π/2へ追加し、DEP/REGENを含む全slotの角を空き計算に使う|
|boost予約中の強化|pauseなし境界では同じ旧slotの予約を保持。新枠から予約／startを再送しない。失敗したstartも復活しない|
|overlay停止|現在予約を取り消して時計を凍結。再開後は新しい正常boostが必要。無料補充・即pulseなし|
|Depth|Stage／総枠を保持。既存DEPは残留の残時間＋regenへ変換。Moon／SPIKEの従来Depth処理を維持|

純粋な数値body試験と、固定60Hz物理を用いた実Phaser Scene制御30／60／120Hzの試験を区別して実施した。Sceneの同時刻に物理stepが複数回／0回ある条件も、実際のScene回数・物理回数・攻撃時計とともに記録する。これを実端末の30／60／120Hz確認とは呼ばない。

## 6. カード・HUD・deferred milestone

初期Moon S1、SPIKE／NOVAは未取得からNEW SKILL、取得済みは次の1StageだけのSKILL UPGRADE。全24Stageの隣接差に実効果があり、範囲のみの成長も候補になる。S8・無効・実効変化なしを除外し、S8到達を攻撃停止理由にしない。

カードは既存候補生成と `selectLevelUpCard` の即時lock、`playLevelUpSelectAnimation` の360ms、`completeLevelUpCardSelection` のpending消費を利用する。描画だけPhaserの隔離adapterを提供する。pointer＋key、連打、破棄後の旧overlay callback、旧run callbackは1回を超えて適用しない。Evasiveは問い合わせで消費せず、現画面の実描画後だけ初回提示保証を消費する。Openingは保証対象外、通常重み3と3択／技能最大2を維持する。

表示は現在Stage・進行●・実効差分を用いる。Moonは離脱外縁も増えること、SPIKEは半径成長で威力・周期が固定であること、NOVA新枠の初回待ちと既設置の旧snapshotを説明する。Fire下限で実効差が0なら短縮チップを出さず、未実装Core/FinalをNEW EFFECTにしない。

S4／S8では `{skillId, phase:"core"|"final", order}` のRAM deferred記録だけを保持する。同じ武装・phaseは1件、最大6件。直接S8はCore→Final順。通常Mutationのqueue・selected・pending、TRIAD/Atlasへは入れない。将来6Cで通常pendingを先に消化し、Core→FinalのFIFOへ接続する方針は文書上だけで、今は動かさない。

## 7. 取得回数とDeep

|条件|実コードによる結果|
|---|---|
|Moon S1→S8|7選択|
|SPIKE 未取得→S8／NOVA 未取得→S8|それぞれ8選択|
|全3武装S8|23選択。通常Mutation未接続でも止まらない|
|Opening3＋Lv1→25|27選択。候補＋1はカード3→4枚だけで取得回数を増やさない|
|他のpassiveへ4選択|残23で全S8可能|
|Evasive3＋AP1＋EN1の5選択|残22で技能が1選択不足|
|Depth1～5、Lv25後|Lv25の一律打切りを追加しない。有効候補とXPがあれば通常Lvが進む|
|Depth6以上／Relay10・20・30相当|Lv25到達後はDeepが先。武装未完成でも通常選択を増やさない|
|Lv25最後の通常pending|Deep移行後も保持。最後の強化で作るdeferred記録も残る|
|Depth5→6|Deep有効化と既存pending保持を確認|

Lv1→25の合成XP総量72,996、最後の閾値22,651。浅層で次32,843XPを入れると通常選択が増える一方、Depth条件成立後の次420XPはDeepへ進む。Relay相当のRAM初期条件はLv1・Moon S1・passive0・Opening3で、飛ばしたDepthの無料強化を与えない。実本番Relayへの出撃や実アカウントは使用していない。

純回数試験は本番候補集合から選び、実選択lock／確認タイマー／確定処理を通すRAM試験である。ランダム3択の引き運や自然撃破での到達証明とは区別する。別に実ブラウザで提示された技能カードを23回選ぶ連続試験も完了し、全S8・deferred6件・通常Mutationなしを確認した。medium/deepの従来付与passive8／23を選択予算へ混ぜず、成長用fixtureでは0開始、永続/CD/gear入力を別表示する。

## 8. 実効値・S1回帰・保存隔離

rawは基礎値＋`max(0, bulletDamage−1)`。周期は既存Fire値540→160の比率を0～1へ制限し、各武装の下限～基本値へ丸めて補間する。既存のダメージ受付へrawを1回だけ渡す。汎用Mutation／basic fire／新装備補正を前掛けせず、受付側の既存倍率を二重適用しない。

|fixture|Fire入力|Moon S1／S4／S8実効再命中|
|---|---:|---|
|baseline|540|750／725／650|
|medium|513|711／688／618|
|deep|482|666／645／581|

R3/F2のbaselineではMoon S1/S4/S8 raw7/10/15、SPIKE raw8、NOVA周回raw5/5/6、残留raw6。

|R3/F2 fixture|Fire入力|Moon S1／S4／S8 ms|SPIKE ms|NOVA周回／残留 ms|
|---|---:|---|---:|---|
|baseline|400|547／532／484|1321|679／389|
|medium|373|508／494／452|1229|636／368|
|deep|342|463／451／416|1123|587／344|

全24Stage×3fixture×補正2条件は `numbers-v3.json` に48行・各3武装＝144レコードとして保存した。再現スクリプトは `generate-numbers-v3.cjs`。本番passive callbackと正規Stage getterによる純計算で、Scene/物理/受付は0回。数値用fixtureは武器永続LvとCD入力を対象にし、移動/AP/ENを含む完全な試走再現とは区別する。敵固有補正後のダメージや実測DPSではない。

保存監査では開始時3245メソッド中3219が改行正規化後の本文一致、変更26・追加10・削除0。移動/AirBrake/Evade211、EN20、Trace16、ダメージ受付4、XP/Deep/カード確定7の各保護集合はすべて本文一致（集合は重複あり）。48保護ファイルと27PNGも開始hashを維持した。

追加・変更保存キーなし。GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE／Shop／Ranking／Firebaseの製品処理を変更しない。隔離adapterでは既存の報酬遮断に加え、合成XPのOVERDRIVE流入を `umbraGrowthSuppressedOverflowXp` というRAM診断値へ記録し、実報酬を作らない。DeepのXP/HP計算は本番関数、チケット消費・post-overlay Mutation/Atlas/装備bonusは隔離したまま。実セーブからの構成読込・認証・外部requestをしない。

## 9. 人間用の入口と比較操作

成長入口:

<http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraGrowth=1>

1. 上部でUMBRA・fixtureを確認する。Opening3枚分をクリック／タップ／1～3で選択する。
2. WASD／矢印＋Shift／Spaceで移動・DASH。L／「取得／Stage＋1」で次Lv相当の合成XPを入れ、カードを選ぶ。既存敵・cast・球の途中状態での強化を確認する。
3. Escはpendingを消さず保留、Lで再表示。P停止、Rは新規試験。画像／簡易／FX OFF、H診断、T通知表示を比較する。
4. 「新規比較 S1／S4／S6／S8」は全3武装を直接指定し、同じ配置・開始位置・ENへresetする。SPIKE半径80／110／135／160、Moon S1／S4／S8を比較する。これを23回の連続取得証明にしない。
5. 初期の「16体集団」は範囲の巻込み、「静止単体」は周期、「周回放電」はNOVA取得後の初回待ち、「残留」配置は切離しと旧snapshot確認に使える。配置変更は新規試験になる。
6. 「連続成長へ新規リセット」でMoon S1＋Opening3へ戻る。`umbraNovaSlots=2/3` と旧武装queryを足しても成長モードではStageが優先され、無視した旨をHUDへ表示する。

成長URL内の標準機／REGALIAは移動比較用で、専用成長カードは無効。従来候補・旧S1の確認には以下の旧入口を使う。

- 移動・従来候補: <http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1>
- Moon S1: <http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1>
- SPIKE S1: <http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBloodSpike=1>
- NOVA S1: <http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraPhantomNova=1>
- 旧3武装S1: <http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1&umbraBloodSpike=1&umbraPhantomNova=1>

## 10. 凍結ソース・試験・証跡

最終製品ソースは `final-source-v3/`、12ファイルのhashは `final-sources-v3.json`。最終game.js:

```text
55f0be42ed38414d9c7bf974b7a92fa3e9c42839d601225accbffb7c54f60ef6
```

初回freeze後の独立レビューで、破棄済みownerのactive/enable確認と、前回適用Stage参照の整合確認を追加した。途中freeze・途中試験は残し、最終v3で影響する試験を再実行した。開始時はpure182、旧NOVA122、3機体×3fixtureの移動／候補ブラウザ試験がすべてPASS。開始時失敗はなかった。

最終v3の構文・pure221/221・HTTP39/39・保護監査はPASS。HTTP対象は製品12ソース＋27PNGで、期待hash・作業ツリー・実際の4173配信bytesが一致した。各ブラウザJSONへsourceとharness hashを対応付ける。

|最終v3の検証|結果|生データ／画像（証跡基準ディレクトリから）|
|---|---|---|
|純単体試験|221/221 PASS（旧182＋成長stats/進行25＋runtime12＋表示追加2）。威力のみS1→S2／S4→S5も確認|`final-pure-v3b.txt`|
|実Phaser成長境界|Scene制御30/60/120Hz、計53ケース・299検査 PASS|`v3-growth/growth-browser-1788777417507.json`|
|連続実カード取得|23選択で全S8、二重入力でも1回、通常Mutationなし|同JSONのreal-cards。`v3-growth/growth-after-23-cards.png`|
|3/4カード・旧callback・Evasive提示|3ケースと8 lifecycle検査 PASS。1280×800／740×420|`v3-growth-ui/growth-ui-1788777420727.json`、同dirの`growth-desktop-three.png`／`growth-narrow-four.png`|
|旧NOVA|122/122 PASS|`v3-nova/nova-final-1788777444998.json`|
|旧SPIKE|261/261 PASS|`v3-spike/bloodspike-browser-final-report.json`|
|旧Moon|105/105 PASS|`v3-moon/moonlight-browser-report.json`|
|同条件回帰|12/12組 PASS。3機体×3fixtureの敵なし60Hz＋UMBRA旧3武装S1の30/60/120Hz|`v3-parity/growth-parity-1788777546643.json`と各pairのbaseline/current別JSON|
|既存drive・候補・HUD|3機体×3fixtureの9測定、UMBRA候補/Evasive/Opening、入力・EN・停止・cleanup PASS|`v3-drive/drive-report.json`。`source-before.json`／`source-after.json`で12ソースと未変更harnessを照合|
|旧2機体の実カード/HUD|2/2 PASS。標準Booster310→340/AP100、REGALIA AP200→220/HUD220。いずれも3枚有効別カード・pointer1回適用|`v3-oldmech-cards/oldmech-cards-1788778073372.json`と機体別カード・HUD画像|
|SPIKE同一配置R比較|S1/S4/S6/S8の4/4 PASS。近いbody境界距離0/95/120/150pxに対し受付1/2/3/4体。各敵−5、範囲外0、同cast1回、Moon/Nova0|`v3-radius/growth-radius-1788777583110.json`|
|限定通常rAF|12秒・721 Game.step、エラー0、全3武装作動|`v3-observation/growth-observation-1788777560979.json`|
|HTTP一致|12ソース＋27PNGの39/39|`http-1788777388373.json`|
|保護監査|保護ファイル48・保護メソッド各集合不変|`preservation-1788777388594.json`|

成長・UI・旧武装・比較・rAF・半径の各隔離ブラウザContextで、StorageデータAPI、通常Scene初期化、認証/ランキング/Atlas/TRIAD入口、外部requestの検査がPASS。ブラウザ起動前後のStorage属性probeは既存隔離の許容数から増えず、製品のデータ読書きは0。旧drive試験が準備時に新規隔離ブラウザへ置く合成sentinelは製品の保存処理とは分けている。最終集約 `browser-completion-v3.json` に最終12ソース、全生データとharnessのhashを記録し、旧集約2件も保持した。

旧2機体の実カード確認は隔離SceneのパッシブとHUD。旧adapterが通常スキル候補を空にしているため、通常公開機体のスキル候補は既存pure試験で確認し、通常HUBを実ブラウザ起動したとは扱わない。

**通常rAFの測定範囲:** 新規比較全S8、同一の既存Boss定義16体（HP改変なし）、画像FX、Hの当たり判定ガイドOFF、診断HUD表示ON、固定カメラ、時刻指定の合成方向/DASH入力、約12秒。初回ロード後の1回の限定観測である。Game.step CPU時間と、独立rAF callback間隔を別計測した。詳細snapshot・JSON保存・スクリーンショットは区間外、各フレームの小さい数値記録のコストはGame.step外のcaptureMsに残す。トレース録画なし。

|指標|サンプル|平均|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|CPU Game.step ms|721|2.113|2.0|3.0|3.9|8.0|0|
|rAF間隔 ms|720|16.667|16.7|16.8|16.8|16.9|0|

実時刻1288.7→13290.1ms、Scene更新0→721、物理step0→719。Moon20受付・HP減少240、SPIKE7cast/7impact/112受付・HP減少560、NOVA41pulse/38受付・HP減少114、3設置/2期限終了/2再生成、撃破0。GameObject148→155・最大177、Timer0→0・最大32、world/Scene/gameの各listener数は前後すべて一致。終端の差は存在中NOVA3基・残る放電等を含み、開始値への一致をリーク判定として要求していない。個別cleanupと連続resetは別機能試験で確認した。

描画環境は **ANGLE / NVIDIA GeForce RTX 5070 / Direct3D11**。Phase 5のSwiftShader結果と環境が違うため、過去800ms等の改善率を算出しない。このCPU時間からGPU待ち時間を推定しない。100ms以上は今回の短い区間では再現しなかっただけで、解消済みとはしない。

表示画像は `v3-observation/growth-s8-three-weapons.png` と `growth-spike-s8-ground-diagnostics-off.png`。H OFFでもR160の薄い地面外縁が残ること、元画像の高さ・倍率が変わらないことを実際に開いて確認した。重なった既存円形検証敵のラベルは密集し、人間の実画面での視認性判断は残す。

既存試験の変更は限定した。4つのregistry/数値試験とAirBrake regressionの旧 `stages.length===0` 期待を8とS1同一参照へ更新し、previewOnly・非公開の検査は維持した。Stage対応getterの旧byte一致期待は、保存済み旧getterを40組のReactor/Fire条件で実行するS1出力一致へ置き換えた。S1設定getter本体はbyte一致を残す。既存描画試験へ地面円の2件を追加。旧NOVA/SPIKE/Moonの3ブラウザハーネスは凍結ソース用 `UMBRA_TEST_SOURCE_ROOT` の1行対応を追加し、既定パス・試験条件・期待結果を変えていない。

開発途中での不足allowlist、VM間例外prototype／Unlock候補のテスト期待、日本語折り返しの失敗は修正・再試験し、途中出力を残した。失敗した値や外れ値を除去して性能合格にしていない。

実行環境は既存Node・既存Playwright・Chromium、ローカルPython HTTP。依存導入なし。

```powershell
python -m http.server 4173 --bind 127.0.0.1
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check equipmentDefinitions.js
# umbraDrive/Fixtures/Runtime/MoonlightArena と新規cjsも node --check
node --test (Get-ChildItem tests -Filter 'umbra-*.test.cjs').FullName
node tests/umbra-growth-browser.cjs
node tests/umbra-growth-ui-browser.cjs
node tests/umbra-nova-browser.cjs --final
node tests/umbra-bloodspike-browser.cjs --matrix-only --final
node tests/umbra-phase4-moonlight-browser.cjs
node --expose-gc --max-old-space-size=512 tests/umbra-growth-baseline-parity.cjs
node tests/umbra-growth-observation.cjs
node tests/umbra-growth-radius-browser.cjs
node tests/umbra-drive-browser.cjs
node tests/umbra-oldmech-cards-browser.cjs
node tests/umbra-growth-preservation.cjs
node tests/umbra-growth-http.cjs
git diff --check
```

ブラウザ試験は各回新しい `UMBRA_TEST_OUTPUT`、最終 `UMBRA_TEST_SOURCE_ROOT` に上記v3ディレクトリを指定する。`NODE_PATH=C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`、`UMBRA_TEST_BROWSER=C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe` を使用した。同時ブラウザ負荷試験を行わず、比較は1ペアずつ保存・読取した。死亡Tweenは試験内だけcombat-alignedとし、製品のScene・物理・Tween時計を変更していない。

## 11. 未確認事項とPhase 6C1前の判断

自動検証は隔離された基本成長と指定条件の回帰を対象とする。人間には、Moonの拡大後の再離脱距離、SPIKEの巻込みの成長感、Novaの新枠待ち／設置／再生成の分かりやすさ、3武装併用の見やすさ、4回の自由枠と耐久・回避選択の兼ね合いを確認してほしい。

740×420ではFITによりカード文字も小さくなる。矩形・日本語折り返しは画面内で確認するが、実スマートフォンの読みやすさ・指操作は未確認。通常の自然XP取得・生存時間・実本番Gate/Relay/Final Raid・購入・保存・クラウド・全端末GPUは試験していない。

角脱出の断続失敗／保守除外、過去の描画遅延、boostSustainDrainRampMs／boostSustainRampMsの不一致は据え置いた。限定rAF観測や短いp99で過去の全外れ値の原因・長時間滑らかさ・実GPU待ち時間を判断しない。Phase 6C1前には基本成長の体感を確認し、Core実効果と既存snapshotへの反映方針を別途判断する必要がある。6C1、27形態／729併用、Mutation実装や販売へ自動では進まない。

**Phase 6B：基本Stage成長・取得／強化・HUDの実装結果。Core／Final実効果、TRIAD、装備対応、通常販売は未着手**

## 12. Phase 6C1着手時の人間確認追記（2026-09-07）

ユーザーより、Phase 6Bについて人間確認では問題なしとの報告。
確認された基本Stage成長・表示・操作を維持してPhase 6C1へ進む。

確認端末、fixture、選択経路は未指定。全端末、自然なXP進行、深層生存性、4回のパッシブ選択枠の最終バランスまで承認済みとは扱わない。上記の当時の未確認記録を保持し、今回の依頼でStage4 Coreのみを検証用仕様として進める。
