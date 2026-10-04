# KGK-02 UMBRA SERAPH — Phase 7A 通常プレイ接続・購入／保存・旧版互換の設計

作業日：2026-09-08。**設計のみ・未実装・未公開**。比較基準は現在のPhase 6D2完成状態。「現行」は着手時ソースの静的確認、「報告記録」は過去報告による結果、「限定RAM確認」は今回の合成入力による正規化確認、「提案」は後続承認後に実装する案を表す。提案の関数名・キー名・schema番号は、現在の実装・採用済み仕様ではない。

## 1. Phase 6D2から引き継ぐ確認済み範囲

### 1.1 比較基準と今回の変更境界

AGENTS.md、README.md、Phase 6A設計の補正・snapshot・保存分離・段階接続、Phase 6D1/6D2報告、Phase 1の登録・素材・隔離記録と現行コードを確認した。過去資料の行番号は流用せず、以下は現在の関数位置を使う。独立したPhase 0報告は現存docs一覧に無く、読了済みとはしない。

- 着手時刻：2026-09-08T13:12:57.8601984Z。
- HEAD：28cfe5ab71048b0487254dceef6f66f3a25788f9。比較対象はこの古いcommitの内容ではなく、未commit・未追跡を含む着手ファイル。
- game.js SHA-256：**efa311b4277fd8ce45fe9781e3a9f3bd58458f68f7ae338d99f45a859c444db0**。依頼指定の6D2最終値と一致。
- 着手時から変更済み：README.md、game.js、index.html、skillDefinitions.js。未追跡：docs/、tests/、umbraDrive.js、umbraDriveFixtures.js、umbraDriveRuntime.js、umbraMoonlightArena.js、umbraPreview.js、umbraPreviewAssets.js、画像/player/KGK-02_UMBRA_SERAPH/。
- 今回の変更許可は本書新規作成、6D2報告への末尾追記、READMEの案内のみ。製品、テスト、画像、vendor、rules、AGENTSは変更しない。hash記録と終了監査は第10節に収め、別の診断ファイルは作らない。

### 1.2 引継ぎ

**ユーザー確認：**

> ユーザーより、Phase 6D2について人間確認では問題なしとの報告。
> 確認された装備・COMBAT LINK・OVERLIMITの操作・表示を、
> 通常プレイ接続の比較基準として維持する。

端末、fixture、0差OVLの個別条件は未指定。過去の未確認記録は残す。通常Scene全体、全端末、自然進行、深層バランス、描画間隔差の解消へ拡張しない。

**報告記録：** 6D2純試験395/395、ブラウザ25実行PASS、最終ソース整合、隔離Storage/API・外部要求の遮断。今回これらを再実行した結果ではない。装備snapshotを初期武装runtimeより前に作ること、主／副ごとのCore/Final/TRIAD→round→OVL→round→ARMAMENT→round→既存受付、SENSOR4周期、通常／Final／DeepのOVL機会、0差OVLとFire Control無効果候補の区別を維持する。既存cast/DEP/REGENへ後から性能・期限を遡及しない。

**採用済み前提：** 内部ID umbraSeraph。Depth10 Final Raid討伐後、確定GEEK **10,000,000**で一度購入。Depth30条件は設けない。永続所有、機体切替無料、死亡・抽出で所有を失わない。初期は umbraMoonlight S1のみ、umbraBloodSpike／umbraPhantomNovaはUnlock。Phase 6のStage/Core/Final/TRIAD/装備/OVL、Air Brake tuned、移動、EN、無敵、AP、素材24姿勢・8フレームを維持する。「NFT」はゲーム内設定で、外部決済やウォレット接続は作らない。

通常公開の許可と討伐・所持条件は別。7B～7Dのコード認識、検証許可、保存対応、販売公開を一括で切り替えない。

## 2. 隔離実装と通常Sceneの差分マップ

差分マップは現行関数の再利用と、まだ接続されていない入口・副作用を分ける。通常Sceneへarenaの敵配置・報酬stub・診断HUD一式を入れない。

以下のgame.js行は上記hashに対応する。表中の「再利用／最小接続」は提案であり、通常Sceneでの実装済み宣言ではない。

|機能／現行ファイル・関数・行|隔離入口／代替・遮断|通常入口／再利用・最小接続|状態owner・破棄／後続テスト|
|---|---|---|---|
|起動・機体・装備：game.js createState 8568、captureRunPlayerMechSnapshot 13279、createRunEquipmentLoadoutSnapshot 15276、continueSortieFromHub 59050。umbraDrive.js create 45、umbraDriveRuntime.js installUmbraPhase2ADriveRuntime 79、umbraDriveFixtures.js install 82|明示fixtureとverificationContext。通常create/load/authは呼ばない。6D2は装備を初期攻撃より先にcapture|通常HUB→要求→遅延load→runtime→captureの順を第3節で整理。共有数値計算と固定snapshotを再利用|run要求→準備→body bind。初回装備反映、AP/EN一度、開始失敗、機体切替|
|初期技能・Opening・Relay：game.js buildInitialSkillStates 41251、beginStartingUpgradeDraft 41155、createGameplayRuntime 8084、createPlayerSkills 44368、requestSortieWithRunStart 58945|Moon S1／L合成XP／RAM Opening。Relayの自然出撃は代替fixture|通常初期技能と実3回Opening、正規Relay要求を使用。UMBRA技能をpreviewOnly除外に通して空にしない|prepared成長model／新runだけ初期化。出撃初期はB/N未取得、Opening中の正規Unlock・強化は可能、Opening完了前hit0、Relay資格|
|更新・時計：game.js update 62983、updateSkills 69194、ensureUmbraBoostTrace 66299、initializeUmbraBloodSpikeRuntime 65556、initializeUmbraPhantomNovaRuntime 65106|独自Scene update＋実worldstep。専用攻撃observer|通常updateSkillsは後段のgameOver/shop/levelUp returnより前に動く。observerを含むblocking契約を接続。更新順・物理stepは変更しない|run listener袋と戦闘時計。二重更新0、pause/hidden/Gate後の追いつき攻撃0|
|敵生成・life：game.js spawnEnemy 73178、spawnNemesisBoss 11106、spawnVoidHunterBoss 11942、registerUmbraMoonlightEnemyLife 66020、SPIKE 65621、NOVA 65371|umbraMoonlightArena.js spawnEnemy 232で検証配置・body。自然Waveは未実行|通常spawnEnemy 73292～73294とVOID HUNTER 11995～11997に3life登録が既存。NEMESISの生成後body拡大と実再使用だけ確認|enemy life＋run target map。body再設定を再出生にしない。残存敵のDepth adoptionは第3節|
|主／副受付・kill：game.js applyUmbraMoonlightHit 66219、applyUmbraBloodSpikeImpact 65718、applyUmbraPhantomNovaPulse 65410、dispatchUmbraFinalSecondary 64780、applyDamageToEnemy 75565、killEnemy 75714|実受付／killの一部を借用するが、装備箱・特殊報酬・Robot/LOST ARMS等は遮断|既存E→receiver→kill/dropをそのまま使う。通常用の攻撃式・kill処理を複製しない|cast/attack budget/life owner。主副1回受付、撃破1回、各dropと実XP|
|Core／Final／CONTROL：game.js applyUmbraControlMovementMultiplier 64933、getEnemySpeedMultiplier 64927、updateEnemies 70154|coreEnabled直接guardあり。core_ai fixtureは攻撃開始時刻を遠方へ置く部分AI|直接verification guardを正規Contextへ接続。既存slow合成と現在AI速度指令の順を維持|field生成owner、敵への寄与。保持dash、NEMESIS、VOID HUNTER、解除後速度|
|TRIAD・装備・OVL：game.js initializeUmbraEquipmentRun 63902、getUmbraEquipmentCombatProfile 63938、applyUmbraEquipmentOverlimitChoice 64021、queueUmbraFinalOverlimitBonus 64048、queueUmbraDeepOverlimitBonus 64058、tryOpenPendingPostOverlaySelections 37026|専用3ID、RAM資格/OVL、Atlas保存遮断|採用済み数値とFIFOを再利用。通常の候補／Final完了／Deep XPへ同じ3経路。保存用ID registryは7Cで別対応|固定装備、可変OVL map、提示ticket。倍率重複0、旧cast固定、0差I保持|
|自然XP／Deep／overflow：game.js handleXpPickup 76825、handleRareItemPickup 76837、handleDataCachePickup 76866、gainExperience 81490、gainDeepLevelExperience 37970|Lの合成XP。umbraDriveRuntime.js:156付近のOD overflowは診断代替|実pickup/collider→XP→カード→Deep／OVERDRIVE。未確定GEEKとその他overflowを既存処理へ|ランXPとpending。自然経路を合成XP／直接S8と別記録|
|通常カード：game.js buildLevelUpCardModel 82539、buildSkillMutationCardModel 82750、showLevelUpCardOverlay 83544、completeLevelUpCardSelection 84236|隔離専用renderer。通常modelにもGrowth/Finalの一部接続済み|Core専用chip、OVL専用差分は通常modelへ読取値を追加。汎用Core summary／OVL倍率説明のままにしない|overlay提示token。keyboard/touch/controller、360ms確定、stale/二重入力拒否|
|HUD：game.js getCompactHudSkillChipModels 51321、updateCompactHud 51463、updateHudSkillSlots 52408、getSkillMutationHudLine 35257、updateHud 84703|Arenaの詳細数値・比較操作・座標HUD|通常Stage/Core/Final/OVL骨格に短縮名、枠・待ち・資格等必要な要約を追加。診断はdebugのみ|HUD読取、run終了で解除。compact/detailと狭幅の可読性|
|24姿勢・FX：game.js preloadPlayerAssets 6622、preloadSkillAssets 6706、getPlayerMechDirectionAssets 42753、getPlayerRobotTextureVisualScaleMultiplier 42784、syncPlayerVisuals 68809。umbraPreviewAssets.js applyPose 163|umbraPreview.jsのAssetsが27枚を扱う。Arenaのhit/Spike/Nova/Final FX|通常loaderは技能previewOnlyを除外。必要assetsだけlazy化し、有限presentationを共有。通常callbackをbind|表示ownerをrunに付ける。傾き/残像/Target Fire、fallbackで判定不変|
|FX各入口：umbraMoonlightArena.js spawnHitFx 550、updateSpikeFx 583、updateNovaFx 642、spawnNovaPulseFx 731、spawnFinalMark 760、updateFinalFx 779、destroy 1214|通常Sceneには専用callbackのbindがない|生成/update/clearだけを共有helperへ分離。Arena install全体は使わない|ownerが作ったFX/timerだけ解除。通常Scene全Tween停止は禁止|
|Support／Robot／Barrier／Recovery／LOST ARMS／OD／STABILIZE・契約|隔離runtimeには本体攻撃・報酬のno-opや限定ゲージ観測がある|通常createGameplayRuntime 8084とupdate 62983の実システムを保持。専用handlerのみ正規受付へ繋ぎ、stubは移植しない|各既存run owner。実発動とゲージ倍率、回復、overflow、Depth契約の解除を分けて確認|
|被弾変形／敵停止：game.js playEnemyHitReaction 75311、applyEnemyImpact 75294、updateEnemySupportStatusLock 70230、updateTimingCoinTimeStopField 79713、receiverのdamage hold 75580|通常hit-scale tweenはproductionBody時だけ。Arena標準は簡易点滅|通常130ms変形・吸引・時間停止を維持。敵だけの時間停止と全体pauseとdamage拒否は別|body形状変化、受理0からFinal/CONTROL/成功FXを作らない。保守除外を消さない|
|Gate／抽出／終了：game.js beginGateDepthTransition 61726、completeGateDepthTransition 61750、completeExtraction 61856、triggerGameOver 83071、returnToOpeningShop 83261|Arena 167付近のRAM終了。実Gate/Archive/AM/Cloud終了経路は省略|実Gateと報酬計算を通す。終了用数値snapshotを専用owner破棄より先に取得|Depthは成長維持、終runは全破棄。通常／緊急抽出、死亡、崩壊、HUB再出撃|
|Final Raid：game.js shouldEnterFinalBossRaid 18737、beginFinalBossRaid 18809|明示block。通常Raid進行未試験|進入前に専用攻撃／FX／fieldを明示終了し、既存Raid演出・疑似damage・報酬を維持|Raid中の再有効化0。討伐後通常D10／RelayとRaid本体を混同しない|

game.js:44374のdestroyPlayerSkillObjectsは汎用orbital用、35134のresetSkillMutationState／35534のresetTriadMatrixRunStateも専用owner全体のcleanupではない。これらが存在することだけでUMBRA終了済みとはしない。

## 3. 通常実行Context・初期化・状態所有・終了の契約

### 3.1 六つの判定を分ける第一案

以下は**提案**。現行の isPlayerMechReleased（game.js:13203）はpreviewOnlyを参照し、normalizeShopState（13054）もreleased IDで所有を絞る。getRunPlayerMechId（13296）も通常ではreleased機体しか返さない。この結合を目的別にほどく。

|判定|提案する責任|認めないこと|
|---|---|---|
|定義認識|knownMechIds／knownSkillIdsとしてIDと対応機体、既知versionを認識。保存readerも認識を使用|認識しただけで所有を付与|
|開発公開|release policyでHANGER販売、通常sortie、開発表示を別に管理|討伐済みだから未公開中に販売|
|所有|正規化済みの当該profileの所有情報。購入復旧・互換状態が正常な場合のみ操作許可|URL、HUB表示、未知IDを所有の根拠にする|
|出撃選択|検証済みrunLaunchRequestから固定したmech/equipment/startDepth/CD等|戦闘中のShopやURLを再参照|
|戦闘能力|run世代・owner・body/world・状態と武装取得に応じたcapability|全guard=true、通常Sceneをarenaのキーに偽装|
|入出力許可|起動前に固定したenvironment adapter。arena／RAM integration／productを区別|攻撃許可から保存許可を推定|

提案名 **UmbraRunContext** はPREPARED／BOUND／ACTIVE／SUSPENDED／ENDEDを持つ小さなラン状態とし、新しい巨大Scene階層や武装の複製classは作らない。実行mode、runId、generation、scene owner、mech・装備snapshot、開始Depth、IO環境識別、能力許可を保持する。PREPAREDではbody無しを正常とし、攻撃可能判定はfalse。BOUND以後だけbody/worldの同一性を要求する。

現行 initializeUmbraGrowthRun（63870）は直ちにplayer/body/worldを捕捉し、isUmbraGrowthContextActive（63837）不成立ならrunを破棄する。初期準備とbody bindを分離する必要がある。isUmbraGrowthSkillDefinition（63853）、getUmbraActiveSkillStage（63860）、isUmbraEquipmentContextActive（63890）、Core/Final/TRIADのContext判定も同じowner契約へ接続する。既存arenaは既存の明示許可からこのContextを作るadapterとし、通常経路へ無条件verificationContextを生成しない。

BOUNDおよび選択中SUSPENDEDでは、正規に提示されたUnlock・強化・Core/Final/OVLを成長modelへ確定できる。止めるのは攻撃・戦闘時計・配置予約である。現行isUmbraGrowthContextActiveという名前を新しい「戦闘ACTIVE限定」と同一視しない。Opening3回でMoon S4になりCore選択が続く場合も、その後続選択が終わるまで戦闘を開始しない。

### 3.2 現行の順序と最小の修正対象

現行：create（game.js:7992）→createState（8568、保存・認証準備も含む）→HUB→continueSortieFromHub（59050）→loadGameplayAssetsThenContinueSortie（59146）→createGameplayRuntime（8084）→createPlayer（42689）／createPlayerSkills（44368）／初回updateSkills(0)→continueSortieFromHubへ戻って装備capture（15302、15276）・COMBAT LINK capture・機体capture（13279）→rebuildPlayerSkillsForRun（44381）→rebuildStartingStats（13039）→Opening（41155）。

この順序のままUMBRA guardを外すと、最初のruntimeが出撃装備より先に作られ得る。第一案は **UMBRAの出撃準備をruntime生成前へ置き、準備済み入力をbodyへbindする**。既存2機体の開始結果を維持し、AP/EN加算の所有者はrebuildStartingStatsの一度に集約する。装備capture側からFRAME/APやCORE/ENを加算し直さない。ロード失敗前にショップ状態や保存選択を変更しない。

|状態|入力確定／immutable作成|body/world必要・bind|listener・Opening停止・初回更新|開始失敗時|
|---|---|---|---|---|
|起動環境|通常起動関数より前にIO adapterとpermit確定|不要、boot owner|認証・ランキングの開始可否を先に決める|permit失効、テストから通常起動へ自動fallbackしない|
|出撃要求|HUBのSORTIEで所有・公開・復旧状態・Relayを再検証。runLaunchRequestを固定|不要、run世代発行|同要求の再入は同promise／結果。二重出撃禁止|要求世代無効化、HUBへ明示失敗|
|機体／装備／開始能力|ロード開始前に同一の選択・装備入力からdeep freeze。装備bonuses/資格も固定|PREPAREDはbody無し|rebuildStartingStatsで一度計算。HP/EN現在値の初期化は新runだけ|準備値を破棄、既存保存selectedは変更しない|
|初期技能／Mutation／TRIAD／OVL|Moon S1、他未所持、OVL0、pending空。Research Targetは当該runで固定|成長モデルはbody不要。攻撃ownerの作成はBOUND以後|初期技能を二度buildしない。開始profileより先に装備確定|pending、ticket、modelを破棄|
|表示・player/body/world|選択機体assets完了または承認fallback後に生成|生成したbody/worldをrunへ一度bind|物理pause中。攻撃はまだ停止|FXと表示、body、world参照を順に解放|
|3武装／Trace／Control|固定Contextから取得済み武装だけ作る|BOUND、同body/world検証|runIdで登録済みguard。worldstep/preupdate/Sceneとgameのlistenerをcleanup袋で一括所有|最初に攻撃gate閉鎖→listener解除→target/cast/field破棄|
|Opening Boost|既存3回とチケット規則。明示したIO環境へだけ消費記録|BOUNDを維持|入力カードのみ稼働。物理・戦闘時計・攻撃受付・配置予約停止。Openingと後続の優先blocking選択が解消してからACTIVE|overlay/キー/pointer/tweenを掃除。未開始攻撃は生成しない|
|初回戦闘|Openingや他blocking overlay無し、Scene/world有効|ACTIVEかつowner一致|正規の最初の物理・移動区間からTrace。初回装備なしのhitを許さない|安全停止、同じprepared要求を再利用せず新run|

run機体はcaptureRunPlayerMechSnapshot、装備はcaptureRunEquipmentBonuses／initializeUmbraEquipmentRun（63902）の共通入力から作る。同じ装備snapshotを数値profile、能力、HUDへ渡し、複数captureの暗黙呼出しを避ける。成長選択やpause/DepthごとにHUB値を取得しない。

### 3.3 保持・無効化・破棄の境界

|境界|機体・装備／成長・pending|Moon／SPIKE|NOVA slot・DEP・REGEN|CONTROL／field・時計・listener|
|---|---|---|---|---|
|Stage/Core/Final/OVL確定|snapshot固定、該当成長revisionだけ更新。既存FIFO／提示tokenを使う|Moon命中履歴・lifeを保持、新評価からprofile。既存SPIKE castの位置・半径・期限・受付集合固定|slotを一括再生成しない。既設DEP性能・配置時regen debt固定、新pulse/新配置から変更|既存field固定。選択中時計停止、無料再hitやICDリセットなし|
|通常pause／overlay／hidden／sleep|保持。再開時もcaptureしない|Traceの未完区間を無効化し、履歴・待ち保持。SPIKEは許可時計で停止|DEP残時間・regen待ち・pulse待ちを保存用データにせずRAM保持|戦闘時計停止。追いつき一括攻撃をしない。listenerを再登録せず稼働gateのみ切替|
|NEXT STAGE／FORCE BREAKTHROUGH|成長・OVL・TRIAD・run装備・未処理選択を保持|旧DepthのTrace経路/cursorと残留castを無効化。生存敵lifeの扱いは下記|旧位置のDEPは無効化し、残留残時間＋regen待ちを次の再生成債務として持越す。無料で周回へ戻さない|旧field/membership/対象位置を掃除。Deepや契約の既存Depth条件を再利用|
|Final Raid待機／開始|run情報・結果用成長snapshotを保持、専用戦闘capability停止|Trace終了、3武装の攻撃・副攻撃禁止|DEP/fieldをRaidへ持込まない。通常戦闘への復帰を仮定して無料補充しない|既存Raidの演出・疑似damage・報酬経路を維持。専用時計停止、不要listener解除|
|抽出／死亡／Gate崩壊|終了時閲覧snapshotを一度作ってからruntime破棄。所有を削除しない|全攻撃停止、既存history/targets/casts解放|slot、DEP、待ち、予約を解放。次runへ復元しない|field/control寄与を敵から解除、overlay/timer/listenerを全解除|
|HUB復帰／再出撃／Scene shutdown/destroy／起動失敗|旧generation失効。次runだけ新しい選択・装備をcapture|古いcallback拒否、破棄は冪等|旧参照なし|HUBの既存cleanup省略分岐に依存せずUMBRA ownerは確実に終了|

**現行確認から必要になったDepth設計：** beginGateDepthTransition（61726）／completeGateDepthTransition（61750）はdrop圧縮・既存Boss整理を行うが、一般敵をすべて消していない。専用側はDepth変更時targets.clear（Moon 66108、SPIKE 65609、NOVA 65219）を行い、Moon snapshot（66073）は未登録対象を拒否する。第一案は、実際に残存する生存敵を通常の敵一覧から明示的に新Depthへadoptし、**同じlifeを維持して旧経路・座標基準だけを更新**する。新しいlifeを付与して再命中待ちを免除しない。旧Depthで死んだ／再利用された個体は引き継がず、新spawnは通常登録する。一般敵全消去というゲーム仕様変更で解決しない。7Bの残存敵＋新spawn試験で各武装の受付を確認する。

終了は「攻撃gateを閉じる→結果snapshotを一度取得→listener解除→field寄与解除→FX/targets/slot等を破棄→owner世代失効」の順を第一案とする。旧callbackはgeneration不一致で即拒否し、先に保存処理が失敗しても戦闘を再開しない。

## 4. 通常Sceneを安全に試す環境と入出力分離

### 4.1 三経路

|環境|実行するもの|代替／未実行|権限の根拠|
|---|---|---|---|
|将来の製品|通常SurvivalScene、正規所有・装備・進行、実保存・任意Google連携|専用診断HUD無し|対応版、release policy、正規所有、互換・復旧正常|
|既存隔離arena|現在の専用body・fixture・共有戦闘、RAM成長|保存/認証/ランキング0、自然spawn/報酬は既存の限定代替|既存umbraPreview以下の明示入口と実行Context|
|提案：未公開通常Scene統合|実createGameplayRuntime、spawn/AI/kill/drop/pickup、XP、成長UI、Wave/Gate、抽出/死亡/HUB再出撃、共存機能|合成初期データ。保存はRAM adapter、認証/クラウド/ランキング送受信は実行しない。保存往復成功とは扱わない|開発側で有効化したテストbootstrap＋新規ランpermit＋明示合成fixture|

第一案はSurvivalScene本体を使い、保存・通信の入口だけを差し替える。提案名 **RunEnvironmentIO** にget/set/remove相当のRAM map、save requestの記録、認証・ランキング等のdisabled結果、合成clock外の診断を持たせる。戦闘・物理・報酬計算そのものをstub化しない。報酬が既存の条件でRAMへ集計・確定することまで通し、外部への確定と区別する。

### 4.2 実データへ触れる前の分岐

現行createState（8568）は装備解析復旧、Shop、Operator ID、OPTION、Gate guidance、Anju Memory、Atlas、Support、FinalBoss、Relay、装備、Best、ランキング、財布、支給復旧、通信履歴などを読む。create（7992）はbeginCloudSaveBootstrap（33949）も起動する。さらにScene以前にgame.js:4461のdebug保存helper分岐、setupMobileLaunchGate（86110）の帰還メッセージ読取りがある。

提案の分離位置は **game.jsのboot時、これらより前**。startSurvivalGame（85943）／loadイベント（86269付近）から渡す環境を固定し、トップレベルdebug helperも同じ判定に従わせる。createStateを実行してから保存を止める方法は採らない。新しい試験URL名は7Bで決める**提案**で、現時点で動くURLとして掲載しない。

|入出力|7Bの最小接続範囲|実行しない副作用／監査|
|---|---|---|
|起動時load／復旧|上記createStateから到達する既存保存の葉とboot帰還messageを環境adapterへ通す。合成データの欠損fallbackも同じ正規化|実localStorage/sessionStorageデータAPIはthrow＋件数監査。Operator IDの実生成・実debug resetも禁止|
|戦闘中Atlas/進行／各save|通常計算を通しRAMへ書く。通知OFFだけで保存を止めた扱いにしない|実キー0。debug旗だけでsave安全と判断しない|
|購入/解析/装備箱/チケット|7Bは合成所有・装備入力から開始。通常報酬計算と使用消費はRAM、購入transactionの実永続往復は7C|実GEEK・討伐フラグの付与0。本番購入UIによる試験をしない|
|認証/Google/ランキング|initializeCloudSaveRuntime（33069）、beginCloudSaveBootstrap（33949）等は最初からdisabled adapter。終了のランキングもRAM観測まで|SDK import、fetch/XHR、WebSocket、sendBeacon、認証popup等を試験起動前から遮断・外向要求を監査|
|素材/BGM/Support演出|ローカルHTTPから必要な既存素材。通常audio処理の機能確認と負荷測定を分ける|ローカル許可パス以外の通信0。読込失敗と攻撃停止を混同しない|
|抽出/HUB/再起動|同じtest session内だけRAMの確定進行を保ち、旧runは破棄。テスト終了でRAMも捨てる|終了後に通常URLへ自動移動して実保存を開始しない|

7Bで到達する保存・通信の葉を先に列挙し、未配線はfail-closedで止める。ゲーム全体を抽象化し直す大改修に広げず、統合経路の入口・葉だけを対象にする。既存メソッドの計算とUIを借用した事実だけでは全副作用の隔離証明にならない。

試験許可はURLの真偽だけで発行しない。ローカル検証用bootstrapが明示的に持つ許可、既知fixture、現Scene・run・世代・environmentの一致を条件とする。未知queryは能力を追加しない。未知mode/fixtureは起動拒否、旧Context/終了後/別機体のcallbackは拒否。通常URLは既存2機体の入口を保ち、未公開UMBRAを選択できない。テスト起動に失敗したらエラー終了し、通常初期化へfallbackしない。

**別試験：** 7C/7Dの保存互換は、新規ブラウザContextの空の合成保存領域へ既存キーを入れ、実setItem→page reload→readbackを障害注入とともに実行する。実利用profileや本番アカウントを使わない。RAM試走0件と永続往復成功は別に報告する。

## 5. HANGER・選択・出撃・ロードの設計

### 5.1 HANGERと再検証

第一案は既存HANGERの背景・枠・カードを使う3機体選択。横長では3枚、狭幅は既存レイアウトに沿うスクロール／選択詳細で、タップ領域と価格の可読性を優先する。新しい背景画像は必須にしない。UMBRAは「低耐久・高機動／回避を軸に戦う」「MOONLIGHTから開始、SPIKE/NOVAを取得」と説明し、性能再調整や過去の「攻撃未実装」文言を通常カードへ流用しない。

|状態|表示・操作の第一案|実行時の検証|
|---|---|---|
|未公開|通常HANGERは現在の既存2機体のまま。開発表示は合成環境のみ|データ認識と販売許可を別にする|
|未討伐|LOCKED／Depth10 Final Raid討伐後|既存FinalBossのcleared、公開許可、未所有を確認|
|討伐済み・GEEK不足|10,000,000 GEEK、不足額。購入無効|9,999,999では拒否、未確定GEEKは参照しない|
|購入可能|価格とBUY。低耐久高機動の説明|owner/互換/復旧/ロック/最新確定財布を再検証|
|購入処理中|保存中、二重操作不可。完了演出をまだ出さない|transactionの読戻しと両キー整合が完了するまで待つ|
|所有済み|OWNED／SELECT、価格再減算なし|対応ID、所有、選択保存の成功を確認|
|選択中|SELECTED／次の出撃に適用|戦闘中のrun snapshotは変更しない|
|保存失敗・復旧待ち|購入を保留中、再確認／対応版への更新案内。成功音・完了表示なし|新しい購入、解析、同期、出撃による進行競合を止める|

現行purchasePlayerMech（game.js:13695）は購入直後にselectedIdも変え、購入済みならselectPlayerMech（13720）へ進む。**第一推奨はこの自動選択を維持**し、所有・選択の保存成功後にだけ表示する。購入・選択ともhandlePlayerMechHangarAction（55517）の結果UIをbooleanだけでなく、成功／保留／失敗の区別へ接続する。選択だけの保存にも読戻しを付け、失敗時は以前の選択をRAM表示へ戻す。購入後のラン開始を自動では行わない。

HANGER表示、purchase、select、SORTIEの各境界で再検証する。FinalBossのclearedは購入条件であり、購入済み所有を死亡や抽出で消す条件ではない。保存済み選択が未知・未所有なら既存標準機の安全fallbackを表示するが、元の新しいデータを旧許可表で消して再保存しない。

### 5.2 遅延ロードと通常表示

現行preloadInitialShopAssets（game.js:6771）、preloadDeferredShopAssets（6785）、preloadPlayerAssets（6622）、preloadSkillAssets（6706）、loadGameplayAssetsThenContinueSortie（59146）を入口にする。umbraPreviewAssets.js:11のpose、:68のframe、:163のapplyPoseと既存metadataを使う。24姿勢の胴体基準、pivot、表示倍率、BLOOD SPIKEの現在のフレーム矩形を変更しない。

第一案：HANGERは一覧に必要な静止姿勢の小集合、出撃時は選択機体の24姿勢＋取得済みMoonに必要な素材を用意する。SPIKE/NOVAはUnlock候補の提示／取得に合わせて必要分を追加要求する。読み込み待ちでも既存Graphics fallbackで同じ攻撃を実行する。新機体を含む全戦闘素材を通常起動へ追加しない。実測上必要なら3武装をUMBRA出撃時の一括小集合にする比較を7Bで行うが、通常2機体の起動負荷へ転嫁しない。

|ロード境界|提案|
|---|---|
|同時要求／再要求|asset keyごとにloading/ready/failedと共有promise、出撃request generationを持つ。HANGERと出撃の重複enqueueを防ぐ|
|完了|対象run要求と機体がまだ同じ場合のみbind／遷移。load完了だけで旧要求のcreateGameplayRuntimeを呼ばない|
|失敗／再試行|失敗keyだけ再要求し、理由を表示。欠損の見た目はfallback、判定・速度・周期を変更しない|
|退出／機体切替|consumerを失効。既にロードされたTextureは既存cache寿命を維持してもよいが、旧Sceneへ表示objectを追加しない|
|通常表示共有|arenaからpose更新・有限FX・数値表示のpresentation helperだけを分離。敵配置、固定HP、damage stub、診断ボタンは移植しない|
|bodyとの分離|pivot/scaleは表示Spriteだけ。半径・速度・衝突bodyへ画像寸法を反映しない。BOOST姿勢を画像全高基準へ戻さない|
|キャッシュ配信|7B以降で実際に変更したコード/moduleのURL版を更新。元PNGの再圧縮・再描画は行わない|

通常の傾き・残像・Target Fire、3武装FXと減速領域、compact/detail HUDへ共有読取モデルを接続する。FX OFFでも攻撃は継続する。入力は実レベルアップの提示token・二重確定防止を維持し、keyboard/touch/controllerのUI経路を個別に確認する。

## 6. 購入transactionの状態遷移と障害時の復旧表

### 6.1 現行の問題と再利用できる部分

**静的確認：** purchasePlayerMech（game.js:13695）→spendCoins（29292）→saveCoinWallet（34947）／persistCoinWalletAmount（34646）は財布のsetItemとreadbackを行う。その後saveShopState（13182）はsetItem例外をcatchし、成否を返さず、readbackせず、cloud pendingを設定する。purchaseはtrueを返し、handlePlayerMechHangarAction（55517）はTRANSFER COMPLETEを表示できる。財布だけ減額済みで所有が永続化されず、再起動後に再購入できる経路である。実購入・実Storage障害で再現したという意味ではない。

また財布のreadback失敗は「未書込み」とは限らず、永続値だけ変更済みでもRAMが戻る場合がある。saveFinalBossState（18107）も保存例外を握りつぶすため、購入資格にはRAMのclearedと検証済み永続clearedを区別する。既存ロードの「読取失敗＝初期値0」をtransactionの確定値に流用しない。

既存装備解析journalのread/persist/clear（13952以降）、recoverEquipmentAnalysisTransaction（14015）、commitEquipmentAnalysisTransaction（14048）は、先行journal・readback・両キー確認の考え方を再利用できる。ただしversion1、前後Equipment全体／財布／日時だけで、取引ID・UID/profile世代・phase・競合検査がない。両after以外を旧Equipment全体＋旧財布へ戻す復旧、壊れたjournal削除、createStateで復旧成否を見ず進む構造を機体購入へ流用しない。別operationとして対象patchだけを扱う。

### 6.2 提案するデータと書順

**新キー案・未承認：** lastmemoVansabaPlayerMechPurchaseTransaction、version 1。Shop内の購入receipt欄、Shop互換version、local profile ID/epochのmetadataも提案であり、今回は追加しない。既存財布キーは変更しない。Google UIDだけでは未連携時や端末進行の所有を表せないので、localProfileId＋profileEpoch＋guest/UID＋cloud適用世代をownerContextとする。

|journalの項目（提案）|意味|
|---|---|
|version／operation／transactionId／createdAt／writer capability|取引の識別。同じIDの再試行で新たな減額を作らない。日時だけで有効／失効を決めない|
|ownerContext／書込世代|端末profileとアカウントの境界。別UID・別復元世代への適用を拒否|
|mechId／price／verified prerequisite|対象UMBRA、10,000,000、検証済みRaid討伐・未所持。静的クライアントの改変防止保証ではない|
|wallet before/after、owned期待値、selected before/after|購入の対応する変更だけ。未確定GEEKは含まない|
|Shop互換version・期待fingerprint・対象patch・receipt|無関係なShop項目を保持。receiptとowned/selectedは同じShopキーへ一緒に書く|
|phase／整合情報|PREPARED→DEBIT_VERIFIED→OWNERSHIP_VERIFIED→COMMITTED。phaseより実際のreadbackを優先|

**第一推奨の書順：**

1. 同版タブ間の排他・ページ内busyを取得。未解決の購入／解析／支給／報酬／restoreが無く、owner・互換・公開・所有・討伐条件と最新の確定財布が正しいことを確認する。
2. PREPARED journalを保存してreadback。不一致・結果不明なら財布へ進まない。
3. 財布を記録したafter値へ保存・readback。単にspendCoinsを再呼出ししない。
4. DEBIT_VERIFIEDをjournalへ保存・readback。ここで失敗しても次回は実財布とShopを照合し、phaseだけで再減額しない。
5. 最新の互換Shopと期待fingerprintが一致することを確認し、当該owned＋同transaction receipt＋自動selectedのpatchだけを適用して保存・readback。他進行が変わっていれば保留する。
6. 所有側確認段階、財布、Shop、receipt、ownerを再照合し、COMMITTEDを保存・readback。
7. RAMの所有・選択とUI成功を公開。cloud未同期は整合したpayloadに対して一度だけ通知する。途中の財布saveからflushが走らないよう、保存helperのtransaction用オプションと共有gateを設ける。
8. journalを削除・readback。削除のみ失敗はCLEANUP_PENDING。新たに課金せず再起動後に削除だけ行う。

複数キーを原子的に保存する方法ではない。中断後の内容を照合して回復可能にする設計である。localStorageの個々のsetItem成功だけでowner全体の整合を主張しない。前提値が証明できない場合は停止する。

### 6.3 ページ終了・障害の復旧表

|終了／障害位置・読戻し状態|起動時の第一推奨|成功表示／再操作|
|---|---|---|
|journal前、保存失敗が確定して財布・Shopはbefore|何も適用されていない。通常の未購入状態|再購入可能。結果不明なら下の保留へ|
|PREPAREDのみ、両before、owner・世代・期待値一致|未適用として取消。journal削除を確認。起動だけで新しく減額しない|旧selectedを維持。取消完了後のみ再操作|
|wallet書込み後、journal phase更新前も含みwallet=after／Shop=before|同owner・世代・期待fingerprint完全一致のときだけ**roll-forward**。再減額せず当該owned/receipt/selectedを完成|整合commit後に一度だけ成功|
|Shop書込み後、COMMITTED前、両after＋一致receipt|再照合してCOMMITTEDと後処理を完成|課金・所有追加を重複しない|
|wallet=before、所有とreceiptだけafter|財布先の正規順序では説明できない競合|自動課金・返金・owned削除をしない。RECOVERY_REQUIRED|
|未COMMITTEDの取引でwalletがbefore/after以外、Shop予期しない変更、別receipt、owner不一致|現値とjournalを保全してCONFLICT。過去財布／Shop全体を上書きしない|新しい購入・解析・同期・restoreを保留|
|readback・復旧write・COMMITTED保存自体が失敗|取引を残して再確認待ち。成功／未適用を推定しない|同txを再確認。新txによる購入は不可|
|同owner/contextのCOMMITTED残留、一致receipt有り|削除だけを優先。commit後の正当な財布・selected変更は未完了取引の競合行へ当てはめず、before/afterへ戻さない|所有は保持、cleanup再試行。receipt不整合は保留。owner不一致はアカウント境界の行に従う|
|壊れたJSON／未知version／古い未完了tx|削除せず隔離。時刻だけで期限切れ取消をしない|保存失敗／更新案内。推測補填しない|
|journal欠損、receipt等でも減額を証明できない|正当な別出費とdebit-onlyを区別できない。自動復旧は不可能|「復旧済み」としない。同owner backupとの明示比較が必要|
|取消時のselected／保存途中のselected|未適用ならbefore表示。部分適用はcommitまで保留。矛盾した現selectedを過去値で強制保存しない|現在runは不変。次run出撃を保留して整合を先に解決|
|アカウント切替／復元世代変更|元ownerのjournalを隔離。新ownerへ適用しない|旧ownerで解決するか、保全したまま別進行を明示採用。合成しない|

### 6.4 競合操作を止める場所と限界

createStateの最初の保存読込・補完・装備解析復旧より前に、型付きreadとownerを使う復旧coordinatorを置く**提案**。未解決ならHUBは読取・復旧表示に限定し、購入、解析、支給、チケット消費、その他GEEK/Shop更新、出撃による進行、cloud flush/restore/link/signoutを共通gateで止める。既存正常経路はこのgateを通過した場合に従来どおり動かす。既存装備解析・支給journalも未解決状態を検査対象とし、無関係な進行を自動rollbackしない。

現行はタブ間storage通知・共有排他を持たず、同一ページでRAM ownedが先に立つことが通常連打を抑えているだけ。同版タブは対応環境の排他機構＋世代照合＋通知で直列化する第一案とし、排他の保証が無い環境では購入を安全に保留する。期限付きleaseとreadbackだけで原子性を保証しない。

**旧タブは新しいlockもepochも無視できる。** 全タブ更新の案内、移行backup、変更通知、前提値再照合を行っても、未知の旧タブ書込みを完全には防げない。自動復旧は観測値と所有条件を証明できる範囲のみ。完全な旧タブ隔離を必要とするなら新しいversionedローカル正本が必要になり、保存全入口に影響するため7C/7Dの別判断にする。今回の狭いjournal案がこの制限を解決したとは説明しない。

## 7. 永続データの項目・正規化・Atlas／Archive設計

### 7.1 保存項目と認識の地図

以下のversion変更、新field、新registryは**提案**。未知IDのraw保存と使用権限は分ける。未対応の将来versionを既知versionへ作り直して書かず、互換readerが無ければ読取専用／保存保留とする。壊れたJSONは表示用fallbackを使えても、元bytesを消して正常初期値を保存しない。

|現行キー／schema／許可ID|正規化・書込み・復元入口（game.js）|追加の第一案／旧データfallback|保存しないもの|
|---|---|---|---|
|lastmemoVansabaShopState。現行Shopはversion欄無し。owned/selectedはreleased集合|normalizeShopState 13054、load 13162、save 13182、cloud normalize 33286／restore 33624|既知保存ID registryにUMBRAを追加し公開とは分離。提案Shop version 2（旧無versionをlegacy入力扱い）＋当該購入receipt。旧2機体・CD・robotCustom等保持。未知IDは使用不可の保持領域、selected無効時は表示fallback|出撃snapshot、可変戦闘能力、OVL、pending|
|lastmemoVansabaCoins。既存単一確定整数財布|loadCoinWallet／persistCoinWalletAmount 34646／saveCoinWallet 34947、spendCoins 29292、restore 33624|キー・確定GEEKの意味は維持。transaction用は読取失敗・欠損・0を区別し、after値を書いて検証。Shop所有と対応|未確定GEEK、未抽出報酬|
|lastmemoVansabaFinalBossState。既存version field、cleared等|normalizeFinalBossState 18069、load 18087、save 18107、isFinalBossRaidCleared 18555|既存cleared／旧depth10RaidClearedを使う。Depth30条件や新しい討伐フラグを追加しない。購入資格は永続読戻し正常が必要|実行中Raid・演出・疑似damage状態|
|lastmemoVansabaMutationAtlasState。version 2、標準／REGALIAの各16build（定義505）|createDefault 35358、normalize 35418、load 35463、save 35475、startTriadMatrixRun 35545、cloud core|既存mechBuildsにUMBRA空16scopeを追加。形状はv2を維持する第一案、reader能力で新scopeを保護。トップentries/selectedTargetIdは標準legacy mirrorを維持|field、戦闘成立過程、可変run snapshot|
|lastmemoVansabaRunArchive。version 1、20件。技能4ID、OVL旧3ID、passive5種|normalize entry 32558付近／normalize 32684、load 32705、save 32713、append 32724、createRunArchiveEntry 32871、once guard 32955、cloud archive|提案Archive version 2。明示mechId、専用3ID Stage/Core/Final、TRIAD、COMBAT LINK・武装別OVL、Evasiveを閲覧用に追加。旧ログは砲有無推定fallback|攻撃object／slot実状態・座標／DEP/REGEN待ち／life/命中履歴／時計／listener／overlay／pending OVL|
|lastmemoVansabaEquipmentState。現行version 1、既存装備5部位等|EquipmentSystem正規化・load、createRunEquipmentLoadoutSnapshot 15276、cloud equipment|本体入手・精錬・保存schemaは維持。SENSOR/ARMAMENT/資格はrunで導出。武装別OVL履歴はArchiveへ|run loadout参照、稼働中OVL map・選択ticket|
|新キー案：lastmemoVansabaPlayerMechPurchaseTransaction v1／profile互換metadata|新しい復旧coordinator・検証save入口を提案（第6節）|journalは端末ローカルのみ、cloud進行へuploadしない。key/version/保持期間・backup上限は7Cで承認|通常プレイの継続保存やセーブスロット代わりのrun state|
|lastmemoVansabaCloudSaveMeta／既存cloud schema 1|initializeCloudSaveRuntime 33069、capture 33313、write 33519、apply 33624|schema 2・minWriter/capability・owner epoch・restore journalを第8節で提案。既存キー内progress全体を勝手に別財布へ複製しない|未解決local journal、攻撃runtime、実セーブ試験用の合成値|

過去の未知情報を何でも信用して使用する方針ではない。known部分を型・範囲検証し、将来のunknown部分はサイズ／深さ上限付きのopaque領域として保持する第一案。上限超過や不明schemaなら保留し、削って保存完了にしない。実行用定義・保存用認識・Archive表示用認識は別にする。旧版コード自体がこの方針へ従うとは限らないため第8節の降格防止が必要。

### 7.2 Atlas：成立・発見・保存・研究・報酬

現行は4 Core軸×4 Final軸＝16build（game.js:490～504）。refreshTriadMatrixSnapshot（35842）→updateMutationAtlasProgressFromSnapshot（35951）が戦闘中discovered/bestDepthを記録する。startTriadMatrixRun（35545）で**出撃機体scopeのResearch Targetを固定**する。

第一案はUMBRAへ空16scopeを追加し、既存2機体の32記録・報酬flagsを保持する。成立はrun TRIADの現在値、discoveredは記録、preservedは正常帰還達成、Researchは固定Targetの達成、reward claimedは実保存済み結果と分ける。既存記録をUMBRAへコピーしない。

|境界|現行の条件／維持する第一案|
|---|---|
|戦闘中にbuild成立|discovered・bestDepthを当該機体buildへ。成立解除で発見を戻さない。通常2機体の記録は触らない|
|正常EXTRACT|completeMutationAtlasExtractionProgress（36037）。rewardDepthReached≥6でpreserved＋当該build初回1 ANJU MEMORY|
|Research Target|同じ機体／開始時Targetのbuild、正常EXTRACT、rewardDepthReached≥8で研究とreroll ticket。HUB変更を途中で参照しない|
|EMERGENCY EXTRACT|発見・bestDepth更新まで。preserved／研究報酬無し|
|死亡／Gate崩壊|すでに保存できた発見は残る。抽出報酬なし|
|debug／arena／integration／Final Raid|shouldBlockMutationAtlasPersistence（35571）の既存debug/Final Raid条件を維持。任意debug URLがローカル保存安全とはしない。integrationはload/save/rewardの全入口がRAM|
|保存失敗|discoveredのRAM成立と永続commitを区別。報酬保存とclaim flagの片成功を成功扱いしない。未解決時は再発行・同期保留|

**報酬第一推奨・7C承認事項：** 既存flagは機体×build別なので、UMBRAの各新buildで既存の一度限り条件を適用する。既存機体へ再発行せず、新しい機体で正規達成した分だけ。AMやticketの額・条件をこの接続で強化しない。

DepthはcreateRunDepthProgressState（8979）／updateRunDepthProgressForEnteredDepth（8995）、resolveMutationAtlasRunDepthContext（35924）を再利用する。絶対到達Depth、startDepth、rewardDepthReachedを分け、Relay開始時rewardDepthは1、以後 **1＋最大絶対Depth−開始絶対Depth**。進捗情報の無いRelayは1へfallback。D30開始だけでD6／D8相当の探索報酬を付けない。

**現行保存課題：** Atlas saveは成否を伝えず、AM／ticket付与保存後にAtlasのclaim flagを保存する。片成功後の二重報酬を防げるとは確認できない。7Cで購入とは別operationの「Atlas reward commit」を設ける第一案。対象は当該mech/buildのclaimとAM／ticketだけ、owner・前提値・receipt・中断復旧は共通原則。未完了なら成功表示／再発行／cloudを保留し、古いShop全体を復元しない。正式なoperation schemaと失敗UIは7Cで承認する。

### 7.3 Archive：閲覧用の終了snapshot

現行許可IDは標準3＋REGALIA砲の4、MutationはgetAllSkillMutationSkillIds（35194）、OVL正規化（32491）は旧3ID。明示mechIdは無く、getRunArchiveSkillSlotIds（56317）は砲の取得／CoreからREGALIAを推定する。getRunArchivePassiveLevels（32761）はEvasiveを含まない5種。

第一案は保存専用registryと明示mechIdを追加し、終了時のStage/Core/Final/TRIAD/COMBAT LINK/武装別OVL/Evasiveを数値・IDだけ保存する。最大20件、entry ID dedupe、1run1件を維持する。古いログに明示mechIdが無ければ現在の砲推定、それ以外標準機。未知IDは「未対応」表示で元データを保持する。

getRunArchiveDisplayEntries（56276）→load/normalizeによる**一覧表示そのものは再保存しない**。ただし次appendやcloud capture→restoreは、欠落した正規化結果を保存し得る。これが現在の実際の危険経路であり、「一覧を開くだけで直ちに保存する」とは記載しない。

現行once guard（32955）はsave成功前にrunArchiveSavedを立て、save失敗を飲み込む。提案では「終了entry生成済み」「永続commit済み」を分け、同じentry IDで再試行する。次runへOVL、slot、待ち、履歴、未確定報酬を復元しない。抽出・緊急抽出・死亡・Gate崩壊・既存Final Raid帰還の記録条件を維持し、HUB前やページを閉じただけで新しい結果を捏造しない。

Archiveはオンラインランキングの項目・計算・並び順を変えない。Google連携時はarchive segmentへ同期されるため「Firebaseへ一切送られない」とは説明しない。

### 7.4 今回の限定RAM確認

既存 tests/umbra-phase2a-stats.test.cjs の最初のtest呼出しより前にあるcreateHarness宣言をNode VMで評価し、bridge.sourcePrototypeを合成sceneのprototypeへ設定。normalizeShopState、normalizeMutationAtlasState、normalizeRunArchive、normalizeCloudSavePayload、getRunArchiveSkillSlotIdsを手書き合成入力へ実行した。全ブラウザ試験や保存往復の再実行ではない。

|合成入力|実関数の出力|
|---|---|
|Shop：UMBRA／futureMech owned、UMBRA selected、未知field|標準機のみ、選択標準機、未知field除去|
|Atlas：version99、旧2scope＋UMBRA|version2、旧2scopeのみ。旧標準discoveredとREGALIA報酬済みは保持|
|Archive：version99、mechId、UMBRA3技能/CoreFinal/OVL/Evasive|version1、専用情報とEvasive/mechId除去、標準slot推定|
|Cloud：未知field／UMBRA所有|未知field除去、所有標準機のみ|

ハーネスのStorage property・networkはカウンタ加算後throwするstub。結果は **storage 0／network 0**。実ファイルは読取のみ、追加probeファイル無し。使用harness SHA-256：90c9f001eee60ab86eca8a15ec995d1d14f812188535c24bfd2ac431470498bf。game/Fixtures/skill/equipmentのhashは第10節。上記は現行normalizerによる欠落を裏付ける限定結果で、実購入・本番復元・人間確認・全互換試験ではない。

## 8. Google保存・旧版・複数端末・配信・戻し方

### 8.1 現行の確認

現在のCLOUD_SAVE_SCHEMA_VERSIONは **1**（game.js:2929）。playerCloudSaves/{uid} rootとsegments/core/equipment/archiveの4document。機体所有・財布・Atlasはcore、装備はequipment、Run Archive／ローカルranking／通信履歴はarchiveへ入る。

|現行入口・位置|確認した責任と不足|
|---|---|
|normalizeCloudSavePayload 33286、captureCloudSavePayload 33313、getCloudSavePayloadFingerprint 33353|固定項目から再構築。未知ID/field除去後にfingerprintするので、未知部分の欠落を変化として救済しない|
|splitCloudSavePayload 33411、joinCloudSaveSegments 33438|3segment分割と再結合。個別の財布／owned等を独立正本にしない|
|loadCloudSaveRecord 33463|rootと3segmentのschema/revision一致を検査、不一致は1回再読取後reject。未知schemaは拒否|
|writeCloudSaveRecord 33519|transactionで期待revisionを比較しroot＋3segmentを全置換。minWriter/capability検証なし|
|applyCloudSavePayload 33624|15ローカルキーを財布→Shop→他進行の順で書く。例外時はRAMに退避した旧値のrollbackを試みるが、永続restore journal／各readback無し。ページ終了を含む原子復元ではない|
|reconcileCloudSave 33772、acceptRemoteCloudSave 33730、resolveCloudSaveConflict 34283|端末／クラウドの進行全体選択。SUPPLY受取ID以外を任意unionしない|
|initializeCloudSaveRuntime 33069、request guard 33153、beginCloudSaveBootstrap 33949、flushCloudSave 34028、startGoogleCloudLink 34158、signOutCloudSaveAccount 34238|requestId/状態identity/UIDとbusyを持つ。購入journalのowner管理／未解決gateとは別|
|firestore.rules:11～104|schema1固定、Google UID所有者、server time、root/3segment同revision、+1更新とgetAfter整合。dataはmapまでで内部ID/minWriterを検証しない。rankingは別match|

同schema1内へ新IDだけ加えると、旧readerで欠落させたpayloadを正しい次revisionとして書ける。**revision一致だけでは旧版による降格を防げない。** 現行関数の静的確認と第7節RAM確認に基づく判断で、現に本番データが消えたという報告ではない。

### 8.2 方式比較と第一推奨

|方式（すべて案）|評価|
|---|---|
|schema1据置、新normalizerだけ改善|旧clientは新payloadもschema1として受理するため非推奨|
|同collectionでschema1読取→schema2へ移行|**第一推奨**。財布／所有の正本を増やさず、旧reader拒否とRulesの2→1拒否を使える|
|別collection／別wallet|新旧の正本と残高・購入の競合が増えるため第一案にしない|

**提案schema2**ではrootと全segmentを同transactionで移行し、rootにminWriterVersion／必要capabilityを設ける。schemaとwriter互換は別項目として扱い、対応能力不足、未知version、混在revisionは書込・復元を停止する。値を名乗れる静的clientなので不正改変防止の保証ではなく、正常な旧writerの拒否と互換の整合が目的。

読取した旧schema1の未正規化rawを、正規化・移行・書込みより前に同ownerのbackupへ保全し、新normalizerで旧所有・財布・Atlas・Archiveを移行する。旧2機体の記録は維持、UMBRA所有は購入済みの正規記録以外から増やさない。新readerによる旧データ読取互換と、旧writerによる新版データ書込許可は別であり、後者は許可しない。

### 8.3 cloud復元・競合・アカウント

第一案は現行の**進行全体の端末／クラウド選択**を維持する。所有union＋財布max＋Atlas maxを別々に合成すると、所有を維持しつつ財布を購入前に戻せるため採らない。SUPPLYの既存専用統合を他項目へ一般化しない。

|ケース|提案する処理|
|---|---|
|新版＋旧schema|backup後に既存全進行を一組として読取。未解決journalなしで1→2 migration|
|旧版＋新schema|cloud読取／書込を拒否。更新案内。既存旧版が案内できない場合は対応版のHUBで理由を表示|
|root/segment混在schema・revision|再読取してなお不一致なら保留。欠けた区分を初期値や端末値で埋めてrestoreしない|
|同UID・2端末が別に進行|期待revision競合を表示し全体選択。敗れた側のraw backupを保全。自動max/unionなし|
|オフライン／timeout／応答不明|整合済みlocal進行と未同期状態を保持。再試行前にremote revision/tx識別を照合し、成功不明を新規書込として重ねない|
|購入／Atlas reward／restore journal未解決|upload、restore、link、signout、アカウント変更適用をgateで止める。中間財布をcaptureして送らない|
|guest→Google／UID A→B|localProfileId/epochとUIDを固定。await後もAuth UID/request世代/owner再確認。AのjournalをBへ適用しない|
|restore途中のpage close|提案restore journalに同owner・前後の全キー整合・source revision・適用段階を記録して復旧。途中のlocal進行でHUB購入やcloud送信を開始しない|
|restore復旧時の競合|別の正当な書込みがあれば自動で古い全進行へ戻さない。前提一致時のみ続行し、競合は両候補を保全して停止|

restore journalは複数キー適用の回復手段であって原子的保存ではない。購入journalの狭いpatchと、クラウド全進行置換のoperationを混ぜない。backupはlocal専用、owner・schema・revision・hashを持ち、容量超過や保存失敗時は移行／restoreを始めない。保存内容に認証tokenを含めず、backup上限・削除タイミング・新キー名は7D承認事項。

### 8.4 旧タブ・オフラインと保証の限界

提案する移行後Rulesはschema2→1のcloud降格書込を防ぐが、同originの旧タブによる既存localStorageキー上書きを止めない。新版normalizerやlockは、すでに開いた旧JavaScriptを変更できない。

第一案は全タブ更新の案内、同ownerの移行前後backup、対応writer間排他、profile epoch/fingerprint・storage変更監査を組み合わせ、差異が出たら購入・同期・restoreを保留する。**閉じたことの案内だけを技術保証としない。** 旧オフライン進行は削除せず比較候補として保全し、新版cloudへ自動uploadしない。移行したcloudへ旧clientが保存できなくなる影響をUIで明記する。

7C/7D承認前に、残る旧タブ上書きリスクを許容した保守的保留方式でよいか判断する。完全隔離が必要なら、新しいversionedなローカル正本namespaceへの移行が別途必要になり、財布・所有だけでなく既存全保存入口の依存を再調査する。今回その大改修を黙って前提にしない。完全旧版互換／全タブ原子性という結論は出さない。

### 8.5 配信順と安全な停止

以下は**将来の順序案**。本番実施は別承認。

1. 新旧schema reader、新ID認識、未知情報保持、writer能力確認、更新／失敗案内を販売OFFで完成させる。schema2 writeもまだOFF。ローカル・emulator相当で検証する。
2. 移行対応Rulesを先に配信。未移行schema1は従来書込を維持し、4document一組の1→2を許可、2→1を拒否、対応writer条件を要求。rootだけ2や一部segment欠落を拒否する。
3. Rules反映の確認後に対応コードを配信し、schema2 writerを有効化。backup・owner・全revision一致・未解決journalなしの個別profileだけ移行する。未移行profileには新所有データを作らせない。
4. ローカル/Google双方がUMBRAを保持できることを確認してから所有データ生成を許可し、最後に通常販売・通常出撃を明示承認で公開する。Google未連携のguestでも必要なlocal互換基準は満たす。
5. 不具合時はまず販売を停止。対応reader・既存所有の認識・保存互換は保持する。戦闘だけが問題なら新規UMBRA sortieを一時保留しても所有は保持する。schema2未対応の古いバイナリへ戻さず、互換reader付きの修正版へ戻す。

新IDをschema1へ書いた後でRulesを強化する順序は避け、旧writerに新版データの欠落保存を許す期間を作らない。既存schema1の旧進行と、移行済みschema2の新進行は明確に分ける。

現行はHTML再検証、JS/CSS/assets長期immutable（_headers）、indexのURL版とmodule個別版を使い、起動時の共通capability照合は無い。7Dで配信asset manifest／必要機能の照合を追加する第一案。新game＋旧definition／旧module／コード404は「素材fallback」と別に拒否し、保存IDを削らない。24姿勢のPNG欠損だけなら判定を維持した表示fallbackを使う。キャッシュ版変更だけで混在不存在とは断定しない。

### 8.6 後続ローカル検証の準備状況

既存Node、Java21、C:/Users/akina/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jarを確認。firebase CLIはPATHと通常のglobal候補に見当たらず、firebase.jsonはRules指定だけでemulator設定無し。現存testsは専用戦闘／隔離中心で、cloud/rules用の保存障害ハーネスは見当たらない。jarの存在は起動成功・Rules試験済みの証拠ではない。

7Dでは既存jarの利用可否、ローカルproject ID・port・安全な通信境界とRulesハーネスを先に承認・構成する。導入が必要ならその時点で別承認とし、今回CLI/emulatorを導入・起動しない。本番Firebaseや実アカウントで代用しない。ランキングの項目・並び順・計算・既存matchは変更対象にしない。

## 9. Phase 7B～7DとPhase 8の実装・検証計画

**第一推奨：依頼の7B→7C→7D→8を維持する。** 7BでIO境界を作り、7Cで新IDのローカル認識・復旧を完成させ、7Dで旧writer／cloud／配信を完成させる。各Phaseは独立報告・人間確認・次の明示承認で止める。7Cの実装中も販売OFFであり、7D前に本番schema1へUMBRAを書かない。

|Phase|対象・主な変更候補ファイル／実在入口|先に必要な承認|自動確認／人間確認|完了条件・残る範囲／安全な停止|
|---|---|---|---|---|
|7B：未公開通常Scene接続|game.js：createState 8568、continueSortieFromHub 59050、createGameplayRuntime 8084、Context 63837以降、通常HUD/card、Gate/終了。専用moduleのpresentation共有、必要なloader/定義metadata、indexのコード版、限定tests/docs。IO adapter/bootstrapの小さな追加はこのPhaseで初めて実装|第10.1節。正規run Context、prepared/bind、RAM通常Scene、Depth残存life、表示共有。価格・保存schemaの正式決定は不要|純Context/初期能力/残存life、通常自然spawn→pickup→カード、Gateと終了、既存arena/2機体回帰。人間は通常画面・実入力・3武装表示と成長・復帰|通常Scene代表進行、初回装備・二重適用無し、StorageデータAPI0/外部要求0、所有未公開維持。自然完成難度・全端末・全Bossは残る。実IO接触/旧機体差分/owner漏れでテスト停止し原因報告、7Cへ進まない|
|7C：HANGER・購入・local/Atlas/Archive|game.js：HANGER 55472/55517/55595/55758、purchase 13695、save 13182/34646、復旧 14015周辺の共通gate、Atlas 35358～36124、Archive 32558～32955。必要な認識metadata・tests/docs。新journal/互換metaは承認後のみ|自動選択維持、journal/receipt/owner/key/version、復旧UI、旧タブ制限、Atlas一度限り報酬、Archive/Evasive、unknown保持。販売公開は別|純normalizer＋障害注入、空の合成ブラウザStorage実往復、全書段階終了、同版2タブ、未対応タブ干渉、HANGER3機と復旧表示を人間確認|確定GEEKとowned整合・再課金0・既存データ保護、結果不明を保留、各報酬/Archive再試行の証跡。cloud本番は未接続／販売OFF。競合で現値保全し購入/解析/同期停止。旧Shop全体rollbackは禁止|
|7D：Google・旧版・Rules・配信準備|game.js：normalize/capture/split/load/write/apply/reconcile、boot互換。firestore.rulesのcloud matchだけ、必要ならローカルemulator設定・新Rules/復元tests、index/module版・docs。equipment本体schemaとランキングmatchは維持|schema2/minWriter、移行対応Rules、restore journal/backup、旧版write拒否と更新案内、local旧タブ保証範囲、ローカル試験手段。本番配信・販売は別承認|合成local往復とローカルRules/transaction試験、root/segment混在、旧writer→新版拒否、同UID競合、owner切替、offline、部分restore、混在コード。人間は競合選択/更新/保留・復旧の理解|旧reader読取互換と降格拒否、移行・復旧手順、backup、同一進行単位の競合選択が検証可能。本番検証は未実施として残す。障害時はwrite/販売OFF、互換reader保持、古いbinaryへ戻さない|
|8：総合確認・公開判断|確定した差分のみ。代表自然進行・Relay・保存互換・端末・共存・性能のtests/報告。バランス変更が必要なら接続修正と別依頼|7B/C/D完了＋人間確認範囲、既知課題許容、正式公開／販売／本番保存検証の明示承認|下記優先群を段階的に実行。実スマートフォン、自然成長と深層生存、旧2機体、長い選択後復帰、通常出撃開始の観測。実セーブを試験材料にしない|確認条件付きの公開判断を報告。未確認を全合格にしない。本番反映・販売有効化は明示依頼と承認範囲内のみ。問題時は販売停止＋互換認識保持|

### 9.1 試験を目的別に分ける

|分類|優先する条件|証拠・完了基準|
|---|---|---|
|純計算／状態試験|現6D2の式・丸め・Stage/Core/Final/TRIAD/SENSOR/ARMAMENT/OVL。prepared/body bind、同run二重capture、旧callback拒否|新接続前後の同条件一致、旧2機体不変。確認済み全組合せを毎回ブラウザで再生しない|
|自然進行の最初の一本|合成開始進行だが実SurvivalSceneでMoon S1→自然spawn→攻撃→kill→XP/価値drop回収→実カード→自然Gate。Opening3も実UI|自然XPの量・入力列・spawn数・取得順を記録。直接S8、L合成XP、開始Depth指定の試験と別名・別結果|
|通常成長・選択接続|B/N Unlock、S4 Core、S8 Final、通常pending優先、Final/Deep bonus OVL、Lv25/Deep境界、0差I、Fire floor|提示token／FIFO／二重確定拒否、合成XP利用範囲、AP/EN一度、旧cast/DEP保持|
|Depth・終了|Depth1、討伐後通常D10、利用可能なRelay、D30→31、NEXT/FORCE、通常／緊急抽出、死亡、Gate崩壊、HUB再出撃|絶対Depth/startDepth/rewardDepthの区別、残存敵と新spawnへ受付、NOVA債務、field/trace cleanup、GEEK/AM等の既存条件|
|Final Raid境界|待機→開始→終了と通常D10／D10 Relay|専用攻撃/field/FX停止、Raid演出・疑似damage・報酬不変。通常D10をRaid扱いしない|
|共存・停止|通常pause/選択/hidden、敵だけの時間停止、吸引damage hold、実Robot Barrier/Recovery、LOST ARMS、OD発動/終了、Robot/Support overflow→STABILIZE、契約のDepth適用/解除|時計・Scene更新・物理step・damage拒否を別記録。ゲージ計算だけで発動本体確認済みにしない|
|実敵の代表|dash開始/解除、ranged charge、Boss保持dash、VOID HUNTER、NEMESIS生成時形状、hit reaction、吸引後の位置|life維持、保守除外と失敗を記録。全特殊Boss行動への一般化無し|
|表示・入力・ロード|通常compact/detail HUD、3武装共存、24姿勢/傾き/残像/Target Fire、画像／簡易／FX OFF、欠損1枚、再試行、二重load、退出／機体切替|描画OFFで攻撃を止めない。keyboard/touch/controller、狭幅と実端末の可読性は別判断|
|購入障害|未討伐、残高9,999,999／10,000,000、所持済み、連打、別タブ、journal/財布/Shop/COMMITTED/削除の各writeとreadback失敗、各段階page close|同tx再課金0、所有だけ／減額だけ／結果不明を検出、他Shop項目保持、正規復旧と競合停止を区別|
|保存互換|旧/新/欠損/不明ID/破損JSON/将来version、Atlas scope/報酬、Archive20件・重複・失敗再試行、ラン状態混入無し|純normalizerと新規合成Storage往復は別。読み一覧→別追記／cloud復元後にも新ID保持|
|cloud・複数端末|新旧writer/schema、root/3segment混在revision、offline応答不明、全体競合選択、未解決journal、UID切替、旧タブlocal上書き、混在assets|Rules拒否とlocal限界を区別。端末／cloudを項目別に不正合成しない。旧進行保全・更新案内|
|限定性能→必要な総合観測|同一敵/入力/カメラ/準備/試験時間の通常Scene代表pair。通常出撃直後、長い選択後、反復停止、通常rAFと制御step|CPU処理時間とrAF間隔を分離。計測範囲・初回/反復・Scene/world回数を記録、外れ値を除去して合格にしない。負荷測定中は他の自動ブラウザ試験を並行しない|

### 9.2 引き継ぐ未確認・既知課題

6D2の先頭rAFにLEGEND約550/567msがあり、以前の133～150msと同程度ではない。過去の大きな描画外れ値、開始時rAF差、角脱出の断続失敗／経路保守除外、boostSustainDrainRampMs／boostSustainRampMs不一致は未解決のまま引継ぐ。今回は環境調査・性能測定を最初から再実行しない。

実スマートフォンの文字・タップ、自然XPでの完成難度、深層生存性、特殊Boss全行動、実Robot/Support/OVERDRIVE MODの未確認下流、整数丸めで0差となるOVL Iの個別構成は別確認。人間確認「問題なし」を未指定条件へ広げない。接続の不具合修正のためにS1、範囲成長、OVL式、EN、無敵や敵HPを調整しない。

## 10. ユーザーが承認する必要のある項目と第一推奨案

### 10.1 次のPhase 7Bへ着手するために必要な判断

調査で判明した現行仕様を質問し直さず、以下の**第一推奨を採るか**が次の実装境界となる。今回の設計提出は7B実装承認ではない。

|判断対象|第一推奨案|採用前の判断点|
|---|---|---|
|通常実行Contextと開始順|六判定分離、PREPARED→BOUND→ACTIVE、機体・装備を初回攻撃前に一度capture|この限定的な開始順接続と、既存arenaのContext adapter更新を7B範囲として承認|
|安全な通常Scene試験|boot前IO注入＋合成RAM、実spawn/XP/Gate/終了。実StorageデータAPI/外部要求0|新しい未公開bootstrap/permitと必要な保存・通信の葉の接続を許可。通常公開はOFF|
|Depth残存敵と終了|残存生存lifeを維持して新Depthへadopt、旧経路/位置だけ無効化。NOVA残時間＋regen債務維持|命中待ちを無料リセットしない方針と、実Gate代表試験を採用|
|通常presentation|既存24姿勢/有限FXの表示部分だけ共有。通常HUD/カードmodelへ専用読取値を接続|新しい通常UI配置の実装は7Bで比較し人間確認。素材・性能は不変|
|段階分割と完了判断|7B→7C→7D→8。7Bは通常Scene代表進行と隔離確認の独立報告で停止|全自然バランスや全端末合格を7Bの完了に混ぜず、未確認を明記|

### 10.2 7C／7Dまで保留できる判断

|判断対象|第一推奨案|期限・影響|
|---|---|---|
|購入後の選択|現行どおり、durable commit後に自動選択。出撃は手動|7C。失敗時に次回selectedと表示が食い違わないこと|
|購入journal・Shop receipt・owner metadata|第6節のwallet先書順、厳密一致の部分成功だけroll-forward、競合は保全停止。key/versionは提案値|7C実装前。新キー・Shop version・receipt・復旧UIの承認が必要|
|Atlas scopeと報酬|UMBRA空16scope、既存2機体は不変。機体/buildごとの既存一度限り報酬。報酬commitを別operationにする|7C。追加scope分の正規報酬発行と中断復旧を承認|
|Archiveの閲覧項目|明示mechId、専用3Stage/Core/Final、TRIAD、COMBAT LINK、武装別OVL、Evasive。20件・同ID再試行。提案v2|7C。保存先は履歴のみ、次run復元しない|
|未知データ・local旧タブ|bounded opaque保持／不明versionは書込保留。更新案内・backup・競合停止を第一案|7C/D。旧タブのlocal完全防止が必要ならversioned正本への別設計が必要。第一案の限界を了承せず販売しない|
|Google schemaとwriter互換|同collection schema2、旧読取移行と2→1拒否、root/segment一括revision、minWriter/capability|7D。schema2は未採用、Rules/旧client保存不可の影響を承認|
|restore／backup／account境界|全進行選択を維持、restore journal、同owner backup、未解決時upload/restore/link/signout停止|7D。新キー・容量上限・復旧UI・保全データ削除条件を決める|
|ローカルRules検証手段|既存Node/Java/jarの利用をまず検証。ローカル限定の安全なハーネスを用意|7D。追加導入が必要なら別承認。今回は未実行|
|本番配信・販売／通常公開|Rules準備→対応reader/writer→profile移行→認識/所有→販売の順。停止時も認識互換保持|7D/8完了後の明示承認。本書だけでは配信・購入解放しない|

採用済みの価格・討伐条件・永続所有・無料切替・Moon S1開始、6D2までの戦闘式は再承認待ちへ戻さない。一方、上記の新しい保存形式や安全性の制限は採用済みとして実装しない。

### 10.3 今回の変更・実行した確認・未実行

今回の変更は本書、6D2報告の人間確認末尾追記、READMEの設計案内のみ。現行関数・定義・保存経路・Rulesの読取り、Git状態とSHA-256、限定RAM正規化probe、文書差分／保護hash照合を実施。node --check game.js、node --check skillDefinitions.js、node --check stageDefinitions.jsは全てexit 0。git diff --checkもexit 0（既存のLF/CRLF警告は構文や差分検査の失敗ではない）。全ブラウザ回帰・性能測定・実保存往復・本番復元・Rules emulator試験は実施しない。資料読了やprobeを実購入・人間確認と呼ばない。

製品挙動、素材、保存キー/schema、公開状態、GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、Depth6+の既存条件とリセット、UI/HUD/Shop/ランキングは今回不変。新しい保存・攻撃・検証Scene実装を追加していない。commit/push/deploy/reset/clean、依存追加、vendor/AGENTS変更、本番アカウント・実セーブ・外部通信を行っていない。

以下は着手時の関連163ファイルのhash記録。終了時はこの集合に対し、許可されたREADME／6D2報告以外のバイト一致を確認する。本書自身のhashは自己参照になるため表に含めない。

<details>
<summary>着手時SHA-256一覧（163ファイル）</summary>

|ファイル|SHA-256|
|---|---|
|AGENTS.md|e1ec8d7b2a3a128152d987357ba84a5d47dbb6d5785f1059a6f17bfde0771665|
|docs/umbra-airbrake-report.md|ba8038c8b52796cb81e85d00fa7f6af1e389a97fc22e252b7180bff4db7c5b13|
|docs/umbra-bloodspike-growth-notes.md|c39362fdad8ea38ae878d662d0fa4be66623eeccf5427ded1cafa24ab76d0210|
|docs/umbra-phase1-assets.md|5525e11e2986ccfe062d19c82ce6aa5dcec779d6f88526b8f8f6a5c6477da36d|
|docs/umbra-phase1-report.md|5a8c883ad972631ac7a7efd2f5b14c8c7de99bfd659468d3dad1e3405f5043e7|
|docs/umbra-phase2a-report.md|e3b7ef09aa5234d65fe3ab986f63b6f6a45b301503ae95dec866be8b6deacd29|
|docs/umbra-phase2b-report.md|985da8e94bf4bde99f9fc779c1a15f79294e0df8de0281f7e9adcee66c51ddb3|
|docs/umbra-phase3-report.md|6082e432461940c727b557d3900932344a75a93e6add66ff9a1ddb735bfa03bc|
|docs/umbra-phase4-latency-report.md|b09dfc1a33d0469f67bec22630dbed70b57feae30f15d43b455070ac536d5ea4|
|docs/umbra-phase4-report.md|d763fd7b909077efdddbca88e115b6c0d534d41fd19856a8e76d3858a29ed073|
|docs/umbra-phase5-report.md|2f437411c62241a0702317fd9342116cb9277cdf83a5134929f651faa2fab6cd|
|docs/umbra-phase6a-design.md|b7e16f9fac7f608059612fa7e3218e592b3a533b655f494be206cb0c2235db53|
|docs/umbra-phase6b-report.md|cd9607b6aa0a68f6845c1f76ab3bc2f0f53e6283b35c1cd50d5c45bff1e7da56|
|docs/umbra-phase6c1-ap-zero-report.md|38e7d9d27a2233516dbbca74b83a559212570fa6a7ecaebe111cbbc44765f393|
|docs/umbra-phase6c1-report.md|8655ebe488f29d662bdfcbee095747161122415e950be79801ea5a5961f9694f|
|docs/umbra-phase6c2-report.md|19ea551ca78524001d2c383f68d51a72260eaa4f98dbf31188f85d0a72a5a868|
|docs/umbra-phase6d1-report.md|492119e86547da3364cfd91d26f5d0c3e62a67cf934aec45fd562f7fcf5e6f00|
|docs/umbra-phase6d2-report.md|af97fb918bccda6e7bb73d521ae1e21520aa17983362cefa7440ccec1b8c23ba|
|equipmentDefinitions.js|02c4094e399e9bbcdf70b6fab2f7b014e4b5ab2bddb8e2b8523a91b9b2fdb25e|
|firestore.rules|75b19608ace4d192b7bdca40f0b40b7b5611d56ba9b87f3010ed17a8a59399ec|
|game.js|efa311b4277fd8ce45fe9781e3a9f3bd58458f68f7ae338d99f45a859c444db0|
|index.html|47c1494ed013b02c0c6645cc8d44f4fb45c70a2f8b101be59108e5280abf6ba7|
|README.md|a44acfbb0792b6588148c0b5c2279bb15ff3af45a0314b8f3613b1de7b921fb1|
|skillDefinitions.js|001691780f13d6d5d0f3b7d49aeaa75fe425186766a9c091dc433bc136077b04|
|stageDefinitions.js|8eba7451c5189e9dd897da29d7560797ddd3b2405d0c2e57f889096af2967973|
|style.css|f404a7f0277f681af0fd1ede41fa0ce8e653a79561a1b3fc21bb52be1f4e0f8d|
|tests/umbra-airbrake-browser.cjs|c1e6f4953793f81720d4057635efc9426803bacf700cf1e35f1e113c135ad5a3|
|tests/umbra-airbrake-realtime-browser.cjs|c14ba857e0b65f2719720def33f0a2d70a2ddb0e18eb0f590b9f1390e5c691e4|
|tests/umbra-airbrake-regression-browser.cjs|68162a040fcce362ed411b1d828f0f5b19b1b89c51f7b43815d19ffaf57351f1|
|tests/umbra-airbrake.test.cjs|3bf88a5062995c56b8a7d98a7795e82542218076c2b18ab443f2392b9ebd640f|
|tests/umbra-arena-ap-zero-browser.cjs|f55d7cd07f48c9cfb731d0367dfe8f560be79cb538b06f2dc50050afa82b9036|
|tests/umbra-bloodspike-arena-browser.cjs|1df57ab20839614a75ea5d9386281d4205623c0e755b71a67d5dc33d082316c0|
|tests/umbra-bloodspike-browser.cjs|6fa7e89ff869d234e35e3f4466e47619e1109cc1ac49a52bfa8aee832d006e58|
|tests/umbra-bloodspike-runtime.test.cjs|ebee0e99e91f8f324ccf5b01a14ad6068f7fdba58222f9650a0669ea5deb2a23|
|tests/umbra-bloodspike-stats.test.cjs|a48ce7e15be308cae2b5aed8b8388a6c6ebceebef73839ceda3fb9442e078856|
|tests/umbra-core-baseline-parity.cjs|2a8162fb8af2fdc13118980457a2d3dceb99015c488371ff2e6311986040e2ef|
|tests/umbra-core-browser.cjs|933258c53b35b2da75c413c8d7cb98a43d040c653d53d75ede478f2ce29002d9|
|tests/umbra-core-enemy-parity.cjs|60969a33a7f27087ca2ec207fadcc0411dfaf9ef56c0d7b0152cbad177deaab4|
|tests/umbra-core-fx-browser.cjs|9da1e874dd6d32e39d34c7e2aed3e23036c00475bfaf8b7a4bda5d4fc4e99222|
|tests/umbra-core-growth-parity.cjs|9e04a287a62714d5cb041f51cee0bbde96061b5cc5eff7c783f81d45ce19fcc3|
|tests/umbra-core-http.cjs|1a449d8b3fbd18b8730f41147a95c202fc02ff26dba372eb12a8c6b4baedd7a5|
|tests/umbra-core-observation.cjs|d41820b86836281d0699379a15e0bf2bcc5b8a6a5beb1f789ba3060056421acc|
|tests/umbra-core-preservation.cjs|a83af562d7d7586c7d4ca07299355e5bfee7e4da4bd45ba06fe2c4f0e67c1e6c|
|tests/umbra-core-runtime.test.cjs|d09be65bcb5196e8cb1b153aadb24aae4bd0dae8fa95169eaa79ef06166db535|
|tests/umbra-core-stats.test.cjs|4a530f7d0ff3af4df6f07502e19964e72076813fc433ecb9e68279f87c0d3cc0|
|tests/umbra-core-ui-browser.cjs|744b7dec979ebc243ec694e5ea7de543214fab28428af66b52c72cebf89fc3ce|
|tests/umbra-drive-browser.cjs|9654f14b478fa51b47e9f277cee4b8da96399d313c0698bc940842621e262603|
|tests/umbra-drive-lifecycle-browser.cjs|43298fdef993c4f355d952bd13ea4f9996a2d49810e6cb99c5ab03a59d86349b|
|tests/umbra-drive-stepped-browser.cjs|1f07112f0ffb4bb6d9fa4aa0e3791e9706be18d6ea7d51bc9378f86db7138fef|
|tests/umbra-equipment-arena.test.cjs|f36dbe025eb7ea3b753207db88e64968dc6f6680058f90e4e9f2faf9c86a29d1|
|tests/umbra-equipment-arithmetic.test.cjs|803570cfc65e168b8be577e5e3b8b5b98cecc9485752ec75018d0d3d9712b2ab|
|tests/umbra-equipment-browser.cjs|d159fb875601ccdf2e8a1763ea7e273918db3d56b3ded0f7493996b2c540f6cc|
|tests/umbra-equipment-evidence-summary.cjs|16f1715a838c8cb70e5c51848d3e97a8df19c00ccb73f9308963cf101dd31d08|
|tests/umbra-equipment-fx-browser.cjs|2b1d122068738ef493d1853dc9534a4112fe3891d45afa1a73538179aebb1503|
|tests/umbra-equipment-legacy.test.cjs|119aa3d8a71711f6362ac7affecb9f547fac71d3007b59cd3b817a8e955bcfaf|
|tests/umbra-equipment-lifecycle.cjs|008d4e2d2ead33793d61d88d963b3e664bb4efb372433cd6fad4db668b42f5a6|
|tests/umbra-equipment-numeric-report.cjs|913954e171ff6ac87f5fc6fac1e80c4a87eb687a2680721e9a7f529df8bb8557|
|tests/umbra-equipment-observation.cjs|6012d6ee328a12908b27f3b6da16af1b4047c9807fe61efe195ebb1dca9a462f|
|tests/umbra-equipment-parity.cjs|8f58e39a2d513e8184789d253fe9434170bf48f5bd3ee002fd2bc4bd6821a52b|
|tests/umbra-equipment-presentation.cjs|fbb219b5f5a4d56c5e0c75f5e03c817f6a5578e11e382ed00dd6cb107cc234fa|
|tests/umbra-equipment-preservation.cjs|70dbda393d72d7552596d8a9a3c10c0c60d8801eb11cf792b0b7c03e0fa3ddd3|
|tests/umbra-equipment-runtime.test.cjs|fb915cc9c35814641de5b26cc59fd382c85c33ef9f48ddf8619d1fcf4c2936db|
|tests/umbra-equipment-state.test.cjs|1770dc1991d8b12a9e6439660bc03f85befecf538fd7e17d03fb37ba30a14a73|
|tests/umbra-equipment-ui-browser.cjs|1a0df4c0d7ee5b09ad850efa66d28b216fb1eb1ee36ba7bdc4f096b109eade16|
|tests/umbra-final-baseline-active-empty-parity.cjs|f4f8ffb716e74fd80b62a3221239d78e1b98b480e661c201e26658c30d10070b|
|tests/umbra-final-baseline-parity.cjs|87ee3b533f8cb0eb149c673e4c8028c25ecfee6a150ef4ba5f4b2fab0cdf32cd|
|tests/umbra-final-browser.cjs|e62bf4fd4cf25586d2ba2fe21104c36499b2ff3fdaa4b2d5103dda64c3ed242c|
|tests/umbra-final-core-parity.cjs|126b19c8307e2dbcaf4c8901006c90d23c6447b09b17e68b55f8b19705e47fed|
|tests/umbra-final-empty-parity.cjs|29b85d70695e7c2bba02eee4631a235be329786cde02e2159378c4c2b83c7161|
|tests/umbra-final-enemy-parity.cjs|1ddcedc44605379fe60a3747130c53934eca7ad185233777b80dfb063b12262b|
|tests/umbra-final-fx-browser.cjs|31b5481da36e84120b3470445b68b16d9828975831c9db78a7033d075932fb5b|
|tests/umbra-final-growth-parity.cjs|ce0562569dbeb12eaa0a80b57d362f632da137daea353c06c350cf32637cf7ac|
|tests/umbra-final-http.cjs|d54bf8ab92b04d13b04b0c678a92629407d5d6e54f1817d44a4d52396f04f6f3|
|tests/umbra-final-observation.cjs|6f909f2c7b6260ab3a9379fa4a7e8631d7da0b198c4452020def89d241ddbf7f|
|tests/umbra-final-preservation.cjs|44158073224d3e878e2dc31ea22ce80504d0ee15eefd92a006c54d0752cac749|
|tests/umbra-final-runtime.test.cjs|91c20b1d2b48ea2c92fb98d0d16642fd985a0df4a3bc3d06c4946c2ba0a5dfee|
|tests/umbra-final-start-observation.cjs|8c66f44ba82bf822b2bc974293997789fd735b50359258dcfe8e00b8ebb28a6d|
|tests/umbra-final-stats.test.cjs|0d2b4b10a4446c5d7ece1feae60d1062b0e843e1b80e6d608eac2bb2fee19323|
|tests/umbra-final-ui-browser.cjs|63a29878e6c30ddce8900adaf2647dd934d4af03b42f7fa26ceb3526de9b3c3c|
|tests/umbra-growth-baseline-parity.cjs|61ac7a7856de7afeb5238c4126fca694a8b11d074c5c7088e5947dbae71cf659|
|tests/umbra-growth-browser.cjs|10a429bc68e173ed2de33762fe5a484470cbd2bbd377bbeacfef715bd34b195c|
|tests/umbra-growth-http.cjs|d29780a4f0e32a6a1c60eb95b123b95908baba1779eb744501f2bc13e7a35b0a|
|tests/umbra-growth-observation.cjs|a8a3c368f359a1afc0a7f21e49103d2b440f44023bae7c5e22786282adb3607d|
|tests/umbra-growth-preservation.cjs|988b3c4301b65ab68880a9dba1f6135c9d04a09f2cba3a8c6037e0d2a3a0617f|
|tests/umbra-growth-radius-browser.cjs|fc56ad9fbee4a9a97af94941d0745fbc5246f6d34c70b1aea8d1e1fc1faaca10|
|tests/umbra-growth-runtime.test.cjs|fad66e9f519dabf6c56b20282ffe8d86619872450514977542abda5fb88af2dc|
|tests/umbra-growth-stats.test.cjs|44ad79797e4ab801abeec795d361c62caa8c0b8819b50c52779f0e43ba599725|
|tests/umbra-growth-ui-browser.cjs|82944c6a04be150120590db62965c5007a1c0ed129026d43481eec0f4f48b358|
|tests/umbra-moonlight-arena-browser.cjs|b8d164057b3eaf4c52e2cd1e4e57fb6bded4e98bd6382e42824f39d9dca37be9|
|tests/umbra-moonlight-browser.cjs|288033e4bbde9c04d73f23b484501e953e4723c0eede8d046a57e48bbc670aa4|
|tests/umbra-moonlight-geometry.test.cjs|1477840821debbd4eea399e4e6cead663f67debc2e1ec3f0eef0ac5854d285bf|
|tests/umbra-moonlight-history.test.cjs|add96dab04208559163b2a7e2d0adaa40882f6d9409c920823736db557f190a2|
|tests/umbra-moonlight-stats.test.cjs|36f52bea3a3ebbbc91263c46178cf0840b715925701327658a134915258cb1d9|
|tests/umbra-normal-browser.cjs|deaaecb4aa7caf80d2b159626355e9ae93454d169f686d8764a278fa8f085815|
|tests/umbra-nova-baseline-parity.cjs|66c03877e075338cceba52493f4e5e8f3b1b44052450651cda5b2bfe7e59cd0c|
|tests/umbra-nova-browser.cjs|4180baf6bab3833510df1368fbae4aa67544155cbba8ba407eda410c4a21d0b0|
|tests/umbra-nova-parity-offline.cjs|073c0bc06a7cbb138ab04ce02b3cf1befd9bf248e1ae34bccf2fd8c0eb06eb5f|
|tests/umbra-nova-performance.cjs|14d5b296f19edb60695c522d8848e2b93345139ebdd57c2ceee8ba9d9c5e22af|
|tests/umbra-nova-runtime.test.cjs|ded10556491bc7267c6cb8412a034e4f8c75891dfba7b0be48c47874ed79e0e2|
|tests/umbra-nova-stats.test.cjs|c8000b67d5fb90614b1fe606a42eabb61a276a897629417ae4a8d553f9bc27d9|
|tests/umbra-nova-visual.cjs|0f34f27330926965d1ec0b6ece0a0df4f2d454acf310914600abd8485c4f3b43|
|tests/umbra-oldmech-cards-browser.cjs|5fc8a67ef2dac66e72b77ab0ce3656a52a9356d08e3bef390d18260b8c464b7b|
|tests/umbra-phantomnova-arena.test.cjs|5010bfa169aeeb50db589d02f272f2e1cd25ba9e321d03334a4f24b521c57ac2|
|tests/umbra-phase2a-candidates.test.cjs|ad6112282286ee95ff5d02eac73e2399c63e7eed78216814775bf196f2725e9a|
|tests/umbra-phase2a-stats.test.cjs|90c9f001eee60ab86eca8a15ec995d1d14f812188535c24bfd2ac431470498bf|
|tests/umbra-phase2b-candidates.test.cjs|953c6513b7e97ec5c5a0fec9cb023dfee7bc0c3e3bfc4b936010e7b78035f7c9|
|tests/umbra-phase2b-performance-browser.cjs|825bfa3098644e1ee59e2081cfa92328f1884c0eed195609558dfac1d074bedc|
|tests/umbra-phase2b-trace-browser.cjs|62d231d421bc2fd35f68721568b449591095e516d4734e6d3bf2b58351fe4089|
|tests/umbra-phase2b-trace.test.cjs|d94b45f8e19b22591f4994c19b99a6b1c56f35ccce2401b584e3046d053bd1b2|
|tests/umbra-phase3-performance-browser.cjs|d72630cdac0e91c537a62b6bf990c3d1848ed31196e932a4df6a87ea879ee3fb|
|tests/umbra-phase4-drive-browser.cjs|365e14b20c60c8918c83e465f77dcdb715c0d226506bcc4419741395c99836f4|
|tests/umbra-phase4-latency-browser.cjs|4c9a7db78024d771ca96ea10f4d6ed7f80c13382d2100d68b29cfb0d6634396f|
|tests/umbra-phase4-moonlight-browser.cjs|309f218ac7006bff016ac427e7a3826c69d81a3aa7316190c68299add6c7d43a|
|tests/umbra-phase4-performance-browser.cjs|4f804566187560929813c3ee0414f99d9e201390f6e2b2139453fdb168035bdc|
|tests/umbra-phase4-public-gate-browser.cjs|fb28d1a48fd435af1c3c112460d4680134acdd53993bfb569135284b1027f5e1|
|tests/umbra-preview-browser.cjs|abdfde74329d9265919006f97dbbeb8619f6df0df5c36e04836e905294c5525f|
|tests/umbra-registry.test.cjs|13f081af4b10c35059d5bc0fa69b6ee2286ea2aadc454131057143965b062f68|
|tests/umbra-triad-arena.test.cjs|a2ce546c4887cbb25ee9af82321d4af58971a0a71fbb3f071bac0b0ca3d50421|
|tests/umbra-triad-browser.cjs|7735a4c031f7a7bd7c2a0cf2a72544944486034bfe7394b6cebed706029adef2|
|tests/umbra-triad-energy-parity.cjs|d9174cf791ab2c59eca3ae5f3cefc1eadb006a1ab2e8e30df6234eb8040b42b4|
|tests/umbra-triad-evidence-summary.cjs|14e2ca821f4c449c6415e5473e216d4688a335ef2cd40584a1ff7a40a50b9de9|
|tests/umbra-triad-fx-browser.cjs|b864ce9f6ba5822f353b9a62274b07253f8ca6e2a0dbcee4286a085fb2957bed|
|tests/umbra-triad-lifecycle.cjs|e5ed558e19b154fcf67d19abaa3b5ceae1e576a598f9d140685c3497d5f8caf4|
|tests/umbra-triad-observation.cjs|58e28a5d4ab66b8cf86064fc201edce6e9c924a6464951b3fe67fb390c5caa81|
|tests/umbra-triad-presentation.cjs|6c5fa7ddc7d7b2b920a20c64cb9b264c7e41c3e8a1a1fa51af355b74b8323ae1|
|tests/umbra-triad-preservation.cjs|6389b6d43c757fa67fb2fa24e31eb8f21856849d99a9eb6a40ff33179300c5d5|
|tests/umbra-triad-runtime.test.cjs|057fd0cd7e2ffd99eab81aff6760cc32a5cc37ddd789c4d9a1412eea4977b3a9|
|tests/umbra-triad-stats.test.cjs|abf9756162e36ba59f78e9d151bc539d032e086f2409a63ed07afae270593cdf|
|tests/umbra-triad-ui-browser.cjs|c0ea990e4dc6296dfc58583a2c592cbd46580e2f9497d79fb1309e1a243850e7|
|umbraDrive.js|8a44657f7cce9d304a49a6dd0874735ad367b41153cae80d4930ffa919df9aaa|
|umbraDriveFixtures.js|c7016282126a33bd37986885cfdfb73083206cbee4906622d421016d88dbb7bc|
|umbraDriveRuntime.js|6fc66c5c6da41180f8bddcf56ade259c1c2c5e3ae4a799db971bd060fc4efd6d|
|umbraMoonlightArena.js|5aa81dde9fe2ace7dace96abb8d768e0cbbfac60cb4b27f5fe3e99a886909e7e|
|umbraPreview.js|18bc7068c279960284d4b15989871d9705c11955c5807071f40f5db5f53beef8|
|umbraPreviewAssets.js|b754468d7ca00f123f8019197cecd803024704687ebd411c87fb82860c65d1a7|
|vendor/phaser.min.js|3c27e64915c56b99d8c4f67664ca5924ccce8a60a234a221b74fd330748dae56|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000_BOOST.png|682bfdd98723c7ab7f128e21198507ae87ef3e71f18921cc064d80a6d705810e|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000_MOOVE.png|b67d6ff1a169c9027cb4653fd5a795e72515bab9a63f123bb3c64903a5a540b1|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000.png|a32c6c555cffb19d7cdb3e5e37b5f24903e27608d61caaadae48022c90bc8dcc|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135_BOOST.png|1caa99fe460b5c0f626331c9f1a256c247a4e96f21a7ce731ef966130a9b97c6|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135_MOOVE.png|fc7777f3df082490974c30c4c1da01a033489fb1a73b423a844b203994bfb202|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135.png|bae5f8e889e484d177c14ffe007a953b1f940d16add3a5c3fede6239bb67d3d4|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180_BOOST.png|0ada96e7b424e003b7c128c03315c9c58846c96f084f530589eeebc32322dae0|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180_MOOVE.png|b01967578318ea0298eccd022f593c205f0dd8fa0a9129ce37ab4af0bec54d59|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180.png|56aec57a9d7099edac6933ae76254e356b03224a5f013a78eb1905608f871365|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225_BOOST.png|122c973a37b7d3e2a082319e2fe4ca5cd0d53448a443aa59ee5fa94b89847cd9|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225_MOOVE.png|61828f60962115a987500892829f9b0a201802310d1c4afa64741b9e8db5f696|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225.png|15adfc764c0afe9dbed9e681e6c33e4d7befde24cb11c8057341e894c35d0888|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270_BOOST.png|c355aab2dfa3b5d50b73585cd4c5549b8ac4bc7ba2cfc3d31ea62387fdc0121a|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270_MOOVE.png|ca090423aa37e9df051f4e003267c08b5b4d799d0c784640284da6d213d5f1bc|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270.png|7c95dd6419c55f2a24e72b3fe9fca5222645c5bcd1d9f5132f9ea0e4ac361631|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315_BOOST.png|beb0b242bb85e0391a358a6397cb808657077cf94eafe5d7ce1fe80962898eff|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315_MOOVE.png|e20c0bd8a672b8065d6d05ea8b0ac0904ee6837450c98d39498cbea5ab658d30|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315.png|100b3d5ffcb7879d6686fcc7157bf58e0452691071842da3c7e2aff83f3c2c37|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45_BOOST.png|505095ab98d589c7b58f49afdfd2bf32229b5aaff5b968fb31e2d66e6328790d|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45_MOOVE.png|7b8944f125205befbf546919f284ab2bd0f5b529eed8e381b5cb782ad8eb70eb|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45.png|4330f634b08635a4c3585142eb414cfd8c3aa7d8601e5ad1eccb66856958d2bd|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90_BOOST.png|63407c3075aaaeb4596797d8a67b8db6c0f2a610ecf2c10a2b6387c9bac8c703|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90_MOOVE.png|1b9f2b09038277474d52e59508395525a510fb94c485807352ed7d30ac6aa403|
|画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90.png|391ca2013e84696176aff47955d66756a0030c5d5dd5f2c48214a0311fdfd2a0|
|画像/player/KGK-02_UMBRA_SERAPH/skilleffect/bloodspike.png|752018d5cbbf98bcb381f6c1ff9540b82bed5c95f29f5b0ad7662e63e45bc64e|
|画像/player/KGK-02_UMBRA_SERAPH/skilleffect/MOONLIGHT.png|39f10640e96e37ea0fe238ee4ef4a7c06198009e9eabe2a0955483029cc09239|
|画像/player/KGK-02_UMBRA_SERAPH/skilleffect/nova.png|2f31b165675d9e89c7424cc170b3923206dc85825833d25b8ecfb85778e47e66|

</details>

**終了時照合：** 着手163ファイルのうち161ファイルがSHA-256一致。差分は許可されたREADME.mdとdocs/umbra-phase6d2-report.mdのみ、新規は本書1件。game.js、定義、全6専用module、27PNG、全既存tests、過去docs（許可追記先を除く）、index/style、vendor、rules、AGENTSを保持した。HEADと従前の未commit・未追跡状態も維持。

6D2報告は先頭42,233bytesのSHA-256が着手値 af97fb918bccda6e7bb73d521ae1e21520aa17983362cefa7440ccec1b8c23ba と一致し、末尾追記だけであることを確認した。READMEも設計案内1段落の追加だけ。文書の現行関数参照と、Opening中の正規Unlock／後続Core選択、COMMITTED journalのcleanup優先条件、提案Rulesと現行Rulesの区別を別担当で再照合した。

Phase 7A：通常プレイ接続・購入／保存の設計案。  
製品コード・保存schema・公開状態は未変更。  
Phase 7B以降は承認待ち
