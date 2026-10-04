# KGK-02 UMBRA SERAPH Phase 6C1 実装・検証報告

作業日: 2026-09-07。対象はStage4の専用3武装×3Core、選択UI、主受付後のCONTROLと実移動への接続。検証用性能であり、人間によるCoreの体感・公開版バランスの最終確認は未了。Final、TRIAD、装備対応、通常販売へ進めていない。

状態: **実装済み／検証未完了**。9効果と主要な機能・回帰の自動試験は通過したが、Coreの人間確認と、通常rAFの開始直後だけに再現した約66.7ms間隔差の原因特定は未完了として残す。

## 1. 着手時状態と変更範囲

- HEAD: `28cfe5ab71048b0487254dceef6f66f3a25788f9`。既存の未commit成果を保持した。
- 着手時 `game.js` SHA-256: `55f0be42ed38414d9c7bf974b7a92fa3e9c42839d601225accbffb7c54f60ef6`。指定されたPhase 6B完成版と一致。
- 比較元: `.tmp_umbra_phase6c1/2026-09-07T11-44-31-241Z/baseline/`。開始時106ファイルを新規保存。古いGit HEAD、Phase 5、Air Brake legacyは比較元にしていない。
- 開始状態・hash: 同ディレクトリの `start-manifest.json`。当初からREADME/game/index/skillDefinitionsに追跡差分があり、docs/tests/隔離module/UMBRA画像等は未追跡だった。既存差分を取り消していない。
- 最終配信ソース: `final-v1/`、12ファイルのhashは `final-sources-v1.json`。最終 `game.js` は `fda752679be2aeac231ce95edff75c0d28324983e61f56f976e75308c989717c`。

今回の製品変更は `game.js`、`umbraDrive.js`、`umbraDriveRuntime.js`、`umbraDriveFixtures.js`、`umbraMoonlightArena.js`、`index.html`。文書はREADME、本報告、Phase 6B報告の人間確認追記。新規Core試験と、既存arena純試験への3件追加を行った。`skillDefinitions.js` は作業開始時から変更していない。

`index.html` はgame.jsの配信版だけを `umbra-phase6c1-v1` に更新。game.js内の変更済み4moduleも同版へ更新し、画像・未変更のskillDefinitions・vendor等の版を維持した。AGENTS、rules、vendor、27PNG、装備・Stage定義、Phase 6A提案本文を変更していない。commit/push/deploy/reset/clean/既存差分の取消/依存追加は行っていない。

## 2. Phase 6Bの人間確認履歴

`docs/umbra-phase6b-report.md`末尾へ以下を追記した。

> ユーザーより、Phase 6Bについて人間確認では問題なしとの報告。
> 確認された基本Stage成長・表示・操作を維持してPhase 6C1へ進む。

確認端末、fixture、選択経路は未指定。全端末、自然XP進行、深層生存性、4回のパッシブ選択枠の最終バランスを承認済みとは扱わない。当時の未確認記録とPhase 6Aの提案時点の「未承認」を保持した。

## 3. 実装した9効果

|武装|ASSAULT|CONTROL（通常／Boss系、持続）|REACTOR|
|---|---|---|---|
|MOONLIGHT|加算後の主raw×1.25を一度丸める|0.78／0.92、420ms。正規主通過・lifeごと1受付後|再命中待ち×0.90、床200ms。離脱余白12→8。Stage通過半径は維持|
|BLOOD SPIKE|生成時の主impact raw×1.25|0.75／0.92、600ms。正規cast・lifeごと、成功した全対象|次に設定する再発動待ち×0.90、床500ms。有効敵なしの次探索150→100ms|
|PHANTOM NOVA|周回・残留の主pulse raw×1.25|0.85／0.95、250ms。slot・cycle・pulse・lifeで一度。次の正規pulseは更新可能|次の正常配置が保持するregen1200→1000ms|

SPIKEの複数命中に6体上限は加えていない。12対象の純試験で12回の主受付と12件のCONTROLを確認した。存在上限待ちの再探索は元のStage値150msであり、空探索100msと分けた。

主攻撃・追加命中・球数・Stage数・EN/AP/無敵は増やしていない。Execution/Prism/Singularity、field、Finalカード、TRIAD/SENSOR/ARMAMENT/OVERLIMITの対象拡張、通常HANGER、購入・所有保存、Atlas/Archive/Google/ランキングは未実装のまま。

## 4. 許可resolver、FIFO、選択の確定

現在の入口は `game.js:63824 isUmbraCoreContextActive`、`:63836 getUmbraSelectedCoreId`、`:63929 isUmbraCoreSkillOwnerValid`。明示 `coreEnabled`、既存6Bのlive run/Context/player/body/world、実行中UMBRA、正規取得Stage、現在runに結ばれた未破棄の武装ownerを確認する。Stage4未満・未知ID・偽Stage参照・未取得・旧run・破棄ownerは拒否する。HUB選択値を参照せず、保存用の静的Mutation許可表を拡張しない。

`recordUmbraDeferredMilestones`（`:64052`）は6BのCore/Final履歴を保持し、`syncUmbraCoreMilestones`（`:63859`）がCoreだけを元order順に既存 `skillMutationState.pendingQueue` へ接続する。`queueSkillMutationSelect`（`:36729`）の明示growth分岐から `queueUmbraCoreMilestone`（`:63845`）を使用する。元deferredは消さず、queue内／選択済みを確認して重複転送を防ぐ。Finalのselected/queuedを偽装しない。

通常pending、Opening残数、他overlay、fixture構築中はCore画面を開かない。選択時がS5以上でも到達済みCoreを選べる。Finalが履歴の先頭でも後続Coreを抽出できる。同RAMの明示fixtureで6B履歴へ許可を付けた場合は、既存runtime・時計・castを作り直さず所有を接続する。ページ間保存・復元はない。

`showSkillMutationSelect`（`:36869`）→隔離用Phaserカード→既存 `selectLevelUpCard` →既存360ms確認→`completeLevelUpCardSelection`（`:83139`）の `skillMutation` 分岐を使用。通常pendingを減らす分岐へ流れない。`applyUmbraCoreChoice`（`:63892`）はlive選択token、入力lock、FIFO先頭、ID、Stage、ownerを再検証し、同Stage適用が成功してからselectedを確定する。適用false／例外は未選択queueを残し、例外文字列はRAMのbounded `lastError` に残す。

問い合わせだけでは選択しない。入力後の連打、旧overlay/runのcallback、破棄後callback、別Coreへの上書きを拒否。Escでは元queueを保持しLで再表示。Coreは常に3択で、Opening+1フラグを4択化へ流用しない。既存の通常選択・Evasive提示保証・Stage・共通statの回数を消費しない。

## 5. 威力、周期、実効カード

`game.js:80666 getUmbraSkillCoreProfile` と既存専用getterに限定して補正する。24Stage定義・S1 aliasの同一参照は保持。

```text
R = Stage基礎 + max(0, stats.bulletDamage - 1)
ASSAULT A = max(1, round(R * 1.25))
他Core/未選択 = 従来R

q = clamp((stats.fireInterval - 160) / 380, 0, 1)
T0 = max(floor, round(floor + (Stage基本周期 - floor) * q))
Moon/SPIKE REACTOR T = max(floor, round(T0 * 0.90))
それ以外 T = T0
```

NOVA pulse周期にはREACTOR係数を掛けない。Aを `applyDamageToEnemy` に `impact=null` で一度渡し、damageMultiplier/CD/機体/OVERDRIVE/対象補正は従来の受付が処理する。`damageAlreadyScaled`、汎用Mutation1.12等、Final/TRIAD係数は通さない。受付前raw、HP差、実効HP損失、撃破を分けている。

|baseline・攻撃パッシブ0|Coreなし|ASSAULT|REACTOR|
|---|---:|---:|---:|
|S4 Moon raw|7|9|7|
|S4 SPIKE raw|5|6|5|
|S4 NOVA 周回／残留raw|2／3|3／4|2／3|
|S4 Moon 待ち／離脱外縁|725ms／76px|同左|653ms／72px|
|S8 Moon 待ち／離脱外縁|650ms／82px|同左|585ms／78px|
|SPIKE 待ち／敵なし探索|1800ms／150ms|同左|1620ms／100ms|
|NOVA 次配置regen|1200ms|1200ms|1000ms|

`numbers-final-v1.json` はS4/S8×baseline/medium/deep×R0F0/R3F2×Coreなし/3Coreの48行、各行に3武装を記録する。これは純計算であり、DPSや実HP損失ではない。R3F2はReactor Overcharge3回、Fire Control2回の実パッシブcallbackによる入力。fixtureは武器Lv/CD由来の攻撃stat比較であり、全移動・装備・AP/EN fixtureの再現ではない。

`buildUmbraCoreCard`（`:81205`）はASSAULTの係数+25%と丸め後rawを併記する。NOVA2→3を実ダメージ厳密25%増とは説明しない。CONTROLは通常/Bossの低下率と秒数を分け、スタン・完全停止とは呼ばない。周期が床に達したREACTORは0ms短縮を効果として示さず、Moon余白・SPIKE空探索の改善を示す。Reactor Overcharge／Fire Control／Stageカードは現在Coreを含めて次の実効値を計算し、共通statは1選択につき1回だけ加算する。

## 6. 同Stage適用、生成済み攻撃と表示

既存 `applyUmbraSkillStageChange`（`:64064`）自体の6B差分適用は変更していない。前回の数値profileと比較するので、Core ID設定後もMoon外縁12→8を検出できる。

- Moon: ASSAULT/CONTROLだけでは新たなrebaseを行わない。REACTORでは6Bの `radiusRebasePending` により、次の信頼できる外側観測と正規進入を要求する。life/pass/lastHit/敵cursorを同Stage適用で消さない。再命中は最新間隔で次の正規進入時に評価し、選択時の無料命中はない。
- Core overlayを開く際の**既存world.pauseによるTrace無効化**は維持する。これは同Stage適用による履歴削除とは別であり、既存のpause/resumeでcursorを再基準化する場合がある。安全でないpause前後の移動を通過区間として連結しない。
- SPIKE: `createUmbraBloodSpikeCast`（`:64757`）でraw/radius/位置/時刻に加えimmutable `coreProfile` を保存し、`:64780 applyUmbraBloodSpikeImpact` はそれを使用。選択前castは旧raw・CONTROLなしで完走する。既存nextCast/空探索期限を変更しない。
- NOVA: `commitUmbraPhantomNovaReservation`（`:64410`）でDEPのCore/control/regenを保存。ORBITは次の正規pulseで最新Coreを読み、nextPulse/位相/slot IDは維持。旧DEPは後のREGENにも旧1200msを使い、現在REGEN期限を引き寄せない。同Stage再適用で枠・pulse・listenerを増やさない。
- overlayは3武装/専用FX/CONTROL時計を止め、既存規則でNOVA未確定予約を取消す。resumeでboost startを捏造しない。Depth移行は選択Stage/Coreを保持し、旧敵への寄与を無効化、NOVA残寿命＋配置時regenの待ちを維持する。

表示はASSAULT赤金、CONTROL青紫、REACTOR淡いシアン。Moonのhit FX、SPIKE cast、NOVA DEPは開始profileの色を保持し、ORBITは最新の正規状態を表示する。HUDは現在Coreと旧cast/DEP snapshotを別表示。CONTROLの小さい足元印は有効な寄与だけに対応し、FX OFFでは消える。描画callbackから期限を延長・解除せず、PNG/frame/pivot/scale/球サイズ/角の高さを変えていない。

## 7. CONTROLの時計・独立期限・合成

`initializeUmbraControlOwner`（`:63943`）は各runtimeを現在runに結び、対象→倍率別recordのMapと、所有するpreupdate cleanupだけを追加する。命中ごとのTimer、永久hit履歴、Final field updaterは作らない。

recordはskill、owner世代、run、life参照/ID、body、倍率、付与時刻、owner時計上の期限、主攻撃IDを区別する。主受付の正のHP減少を確認した後に `applyUmbraControlHit`（`:63978`）を呼び、同期処理後の同life/body・生存・run/ownerを再検証する。受付拒否・Support保護・致死・再利用は付与しない。主通過/cast/pulse側の既存一回受付を維持し、副damageやdamage0の可否試験はない。

|所有時計|加算箇所|そのstep内の順序|
|---|---|---|
|Moon|`:65147 receiveUmbraMoonlightTrace` の許可physical event|combatTime加算→当ownerの期限掃除→既存主通過→成功後に加算済み時計のnowで付与|
|SPIKE|`:64828 observeUmbraBloodSpikeStep`|combatTime加算→期限掃除→impact→期限切れcast処理→次cast判定|
|NOVA|`:64539 observeUmbraPhantomNovaStep`|combatTime加算→期限掃除→配置commit/DEP/REGEN処理→正規pulse|

Moonの幾何上のhitTimeは物理step途中であり得るが、CONTROL付与時刻は実際に受付したstep終端のowner時計である。そこから420msを与え、同stepのdeltaを再控除しない。期限は半開区間で、比較誤差許容1e-7ms。物理60Hzでは指定期限を跨いだ次の更新で解除される。getter/HUDは時計もMapも更新しない。preupdate cleanupも期限値を減らさない。

同owner・同倍率は `max(旧期限, ownerNow+持続)`。異なるowner・倍率は別recordで、絶対deadlineを他owner間で比較しない。UMBRA内は有効倍率のmin、最終値は `min(既存LOST ARMS×Cleaning×既存Mutation, UMBRA min)`。既存0.50＋UMBRA0.75は0.50。今回の安全床0.65/0.90と持続上限1000msはUMBRA寄与だけに適用する。

通常移動/敵不在でも許可時計が進めば失効し、pause/hidden/overlayは凍結。Moon通知OFF/停止で止まる時計の寄与は無効化し、preupdateでそのowner分だけ掃除する。SPIKE停止はowner無効化、NOVA停止/未取得は既存prepare/destroyに従う。owner破棄は自分のMap/listenerだけを解除する。死亡/再利用/Depth変更/旧runの寄与はlife/depth/run検証で無効となり、次のcleanupで除去する。

## 8. 本番敵移動との接続・対象分類

本番の敵移動で変更した既存関数は以下の3つ。監査から除外して「全移動不変」とは報告しない。

|現在位置|変更理由|
|---|---|
|`game.js:69178 updateEnemies`|既存3減速の適用順を保持し、その直後に `applyUmbraControlMovementMultiplier` でminとの差分を一回だけ反映|
|`:69605 updateBossSpecialEnemy`|持続ダッシュだけ、実開始時に捕捉したAI指令を必要時に再計算|
|`:69901 fireBossLightningDash`|新規Core contextだけに、実AI開始angle/body/期限/Depthの指令を記録|

普通の追跡、dash敵のburst、ranged、Boss接近は、そのframeのAIが新しい速度指令を生成した後に減速する。既存の基礎速度・敵弾速・攻撃周期・AI時計・hitboxは変更していない。support sleep/freeze/timeStop/stunとhit recoveryによる早期returnも維持する。

Boss lightning dashは従来、開始時のvelocityを次frameでも使用する。そのまま毎frame0.92を掛けると指数的に減速するため、`:64032 recordUmbraBossDashCommand` と `:64045 updateUmbraBossDashCommand` が現在のdashSpeedと実AI開始angleから指令を再生成する。減速終了後も現在AIの速度へ戻し、付与前の古いvelocityを保存・復元しない。Core未作動ならこの再生成を行わない。実開始が捕捉できない持続dashは追加倍率を掛けず、未知の指令を推定して動かさない。

|分類|実在flag／扱い|確認範囲|
|---|---|---|
|通常／Elite／満HP・高HPの一般敵|Boss flagなし|通常倍率。高HPだけでBoss化しない純試験、実追跡body|
|Boss／Wave Boss|`isBoss` / `isWaveBoss`|弱い倍率。純受付・通常Boss接近の実body|
|Robot Boss|`isRobotBoss`|弱い倍率の純受付。固有攻撃シーケンス全体は未検証|
|Nemesis|`isNemesisBoss`（既存helperもこのflag）|弱い倍率の純受付。全Nemesis固有行動は未検証|
|Void Hunter|`isVoidHunterBoss`|弱い倍率の純受付。既存 `updateEnemies` 内の移動後adapterに届くことはコード確認、固有攻撃/描画の実試走は未検証|
|Final Raid敵／minion／giant weapon|既存3flag|専用武装の既存除外を維持、Coreで解除しない|

通常敵向けの独立したslow immunity flagは今回の該当経路では確認していない。Final Raidの制御無効系を対象拡張しない。既存Supportのdamage holdは既存受付で拒否されるためCONTROLも付かない。画面の本番AI比較は次の攻撃開始とランダム進路反転（nextStrafeFlipAt / nextBossStrafeFlipAt）を試験用に遠未来へ保留した4種の移動経路に限定し、全敵・全攻撃状態・全衝突条件対応の実証とはしない。

## 9. 検証結果と計測範囲

着手前: 純221/221、凍結Phase 6Bによるgrowth53ケース/299チェック＋23技能カード経路、旧Moon105/SPIKE261/NOVA122がPASS。着手前失敗は0。

最終ソースの純試験: **257/257 PASS**（旧221＋Core stats18＋Core runtime15＋表示3）。数値fixture/明示時刻/数値bodyの試験であり、実Phaserのbody変位とは区別する。最後のOpeningでMoon S3→S4を実通常選択から確定し、pending0ならCore、pending残りありなら通常候補が先になる2条件も確認した。

保護監査: 既存3255関数のうち3218同一、37変更、削除0、新規24。プレイヤー移動/Air Brake/Evasive211、EN20、Trace16、damage受付4、通常成長/選択7関数は字句一致。敵移動監査12関数の変更は上記3関数だけ。対象定義・27PNG等の保護49ファイルも開始hashと一致。旧2機体のgeneric Mutationは実メソッドをPhase 6Bと比較し、候補/選択/係数/周期/slowと期限が一致した。これらのUI/実攻撃描画はその純試験の証拠には含めない。

HTTP監査: 配信12ソース＋27PNG、**39/39**でHTTP200・期待hash・ローカルbytes・配信bytesが一致。`skillDefinitions.js`が未変更なので24Stage定義/S1 aliasと画像版を維持。実セーブ/本番アカウント/外部通信は使用しない。

|最終ブラウザ試験|結果|範囲|
|---|---|---|
|Core実Phaser|60ケース／780確認（20×Scene30/60/120）PASS|9効果の実カード確定/主HP受付、旧cast/DEP/REGEN、独立期限、実AI body、FIFO|
|Core UI/FIFO|35/35 PASS|実postrender、pointer＋key、360ms確定、Esc/旧callback、740×420、27通常＋3Coreの実rAF選択|
|着手時6Bとの比較|12/12ペア PASS|3機体×3fixtureのbody/入力/EN/Evade/tuned/Trace、3つのScene制御条件でS1全3武装の旧結果|
|Core有効・未選択の敵移動比較|3配置ペア PASS|各配置に4AI。減速なし/既存0.50/既存合成0.504、各90stepのbody/HP/速度が6Bと一致|
|旧Growth入口の6Bとの境界比較|21/21ペア PASS|60Hzの追加境界を含む。攻撃snapshot・期限・受付数の一致|
|画像／簡易／FX OFF／実画像欠損|4/4条件 PASS|3武装PNGを実HTTP404にした場合も、攻撃/HP/移動/CONTROL/時計が一致|
|旧Growth|53ケース／299確認＋23技能カード選択 PASS|Scene30/60/120で16＋21＋16ケース、基本Stage成長と境界|
|旧武装S1|Moon105／SPIKE261／NOVA122 PASS|従来ハーネスの全ケース。最終12ソースのhash確認あり|
|旧drive|3機体×3fixture等 PASS|候補/HUD/Opening/各入力/EN/過熱/壁/角/pause/終了。既知の保守除外を解決済みにしない|
|既存2機体の実UI|2ケース PASS|隔離passiveカード/HUD。通常公開Sceneのskill/Mutation UIは起動していない|
|通常rAF|4本の観測完了|16体、各12秒。下記の開始直後の間隔差を含み、性能最終合格ではない|

UIのLv25試験は、Opening中にRAMへ24レベル分の合成XPを一度加え、23技能＋4パッシブの通常27選択を先に消化し、Core3件を実カードで順に確定したもの。通常pending0、Core queue0、全3武装S8、Final3件deferred維持を確認。自然XP獲得の到達試験ではない。

最終ブラウザ13レポートは `browser-completion-v2.json` に個別path/hash・source/harness hash付きで集約した。StorageデータAPI呼出0、通常Scene/認証/クラウド/ランキング入口0、外部要求0、実保存データへのアクセスなし。vendorのlocalStorage存在probeは別配列に記録され、データAPI0と混同しない。

### 9.1 通常rAFの同条件観測

Windows HeadlessChrome148、Phaser3.70、ANGLE／NVIDIA GeForce RTX 5070／Direct3D11。S4全3武装、Core未選択／全CONTROL、画像FXと診断HUDあり、同じ固定カメラ。16体は既存 `boss_crack` 定義のHPを維持し、同じ2列配置・上下往復入力（速度65、範囲400～630）を与え、本番の減速合成helperを通す。この観測は本番AIの全攻撃負荷ではなく、反復受付・寄与更新・解除と描画の比較である。

両構成とも空arenaで許可戦闘時計500msまで準備し、通常pendingを1件保留して未選択Coreの割込みを止める。測定入力は開始後4000msから右＋dash、4180msから右だけ、7600msから無入力。実rAFの適用時刻もJSONへ記録し、4180ms指定の実適用は4183.3～4183.5ms付近。各12秒、初回/反復の4本を単独実行した。ここでの反復は同じブラウザ内の新しい隔離page/contextで同条件を再実行したもの。

|観測範囲|含む処理|区間外・限界|
|---|---|---|
|制御Game.step機能試験|実Scene更新・固定60Hz物理・攻撃・描画、各ハーネスの詳細snapshot|疑似Scene周期。通常rAF性能との数値比較に使わない|
|rAF CPU|`g.step(time,delta)` 全体。製品の攻撃/描画/HUDと内部の記録処理|毎step後の追加数値観測は別計時。GPU待ち時間を直接測っていない|
|軽量追加観測|個数/座標/受付数/owner時計/record identityの更新数等|フレーム配列へのpushの一部やrAF scheduling等は独立の観測計時に含まれず、実rAF間隔には影響し得る|
|rAF間隔|別rAF callback間の実時刻差。外れ値を保持|CPU時間や画面の実発光間隔とは同一ではない|
|測定区間外|初期Core実選択、詳細攻撃snapshot、JSON文字列化・保存、画像取得|Coreありだけ実カード3件の準備手順があるため、開始境界の差の原因を切り分ける必要がある|

|構成|CPU samples|平均|中央値|p95|p99|最大|100ms以上|Scene増分／物理増分|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|なし・初回|721|2.586ms|2.5ms|4.0ms|5.2ms|9.6ms|0|721／719|
|CONTROL・初回|718|2.416ms|2.3ms|3.8ms|4.7ms|6.1ms|0|718／716|
|なし・反復|721|2.374ms|2.3ms|3.7ms|4.3ms|7.1ms|0|721／719|
|CONTROL・反復|718|2.533ms|2.5ms|4.1ms|5.0ms|8.4ms|0|718／716|

追加数値観測の平均は同順で0.0085/0.0118/0.0060/0.0118ms、最大0.2/0.4/0.1/0.1ms。rAF間隔の中央値は全て16.7ms、p95/p99は16.8ms。最大は16.900/66.708/17.000/66.740msで、CONTROLの2本だけ最初の区間に約66.7msがあった。当該Game.step CPUは4.5/2.9ms、まだ命中もCONTROL recordも0で、他区間に25ms以上はない。Scene/物理の増分差を削除せず、前後の実時刻と全frameをJSONに残した。

全4本ともSPIKE cast7/impact7、NOVA pulse26、主受付Moon8/SPIKE76/NOVA17、撃破0、16体全生存。CONTROLのrecordは最大20、101回の新規/更新を観測し、終了0。GameObjectは152→152、測定中最大175。Timer配列長合計（active＋pendingInsertion＋pendingRemoval）は0→0だが測定中最大はなし22／CONTROL27、listener数は前後不変。開始終了の同数だけで途中の負荷が同一とはしない。CONTROL recordごとのTimer追加は実装していない。

Timerの追加読取: `game.js:74623 applyDamageToEnemy` は既存の主受付後に60ms tint解除のdelayedCallを作る。arenaのhit reaction／damage numberは配列と時計で更新し、Timerを追加しない。現vendorのClockは期限到達時に同じTimerをactiveとpendingRemovalの双方へ一時的に保持するため、上記合計は異なるTimerの実個数ではない。生frameのSPIKE11受付→期限frameの合計22、CONTROLの同frameでMoon5受付が重なる→27という結果は、既存tint Timerの二重計数と受付時刻の重なりを支持する。個別Timer identityを採っていないので全内訳を確定したとはしない。vendorは読取だけで変更していない。

**確認できたこと**: 今回の16体・12秒条件ではCPU100ms以上なし、反復命中後に寄与が解除され、終了時にMap/Timer/children/listenerの増加なし。**原因未確定**: CONTROLの測定開始直後のrAF間隔差は2本で再現した。CONTROL付与処理が原因という証拠はなく、Core選択の準備からrAF開始へのハーネス境界が候補だが、記録だけを変更した同条件比較は未実施。GPU原因・過去遅延の解消・長時間性能合格とは判断しない。製品の全体設定やvendorを変えていない。

CONTROLが重なった実PhaserではSPIKE終了後のNOVA残効を `0.75→0.85→1`、実追跡速度を `75→85→100px/s` と確認。移動敵へのMoon CONTROLでtarget discontinuityの追加がないことも確認した。持続Boss dashは本番 `fireBossLightningDash` の開始コードから速度312.8px/sを維持し、CONTROL失効後も同じdashで340px/sへ戻った。このケースは攻撃演出とプレイヤーへの攻撃leafを試験内で省略し、本番速度指令・期限・Scene Timerを使った限定試験である。

Scene制御30/60/120Hz、固定物理60Hz、通常rAFを分け、ハーネス内のcombat-aligned時計を製品へ移植しない。同期Game.stepのCPU時間を実GPU待ち時間や実端末リフレッシュレートとは呼ばない。比較ではrun/life等の単調世代IDと計測CPUだけを既存ハーネスの規則で正規化し、HP・移動・失敗を除去して一致させていない。

開発レビューで見つかった「破棄ownerがCore選択から再初期化され得る」「適用例外でlockが残る」経路は、最終版のowner binding/再検証とbounded失敗処理で修正した。Core HUD診断とボタンの小さい重なりもCore入口だけ位置補正した。開発ブラウザのpostrender前入力、旧slow属性名、resume前入力、短い残効への測定step超過はハーネス準備の失敗として別保存し、製品不具合・性能改善の根拠にしていない。最終検証の初回と修正後ハーネス結果も別ディレクトリで保持している。

証跡上の補足: 旧Growth直接比較の初回3件は、起動時の絶対Scene時計の差だった。ハーネスだけを共通seed10000／初期world accumulator0に揃え、同じ最終製品で21ペアが一致した。NOVA122の最終実行は `--final` 指定漏れで `nova-development-1788783534426.json`、metadata `final:false` のまま。フラグは名前/metadataだけに使用され、122試験の分岐やassertは同一、使用ソースは最終v1だった。元JSONを改名・書換していない。

## 10. 人間用の比較手順

1. ローカルサーバー4173で `http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraGrowth=1&umbraCore=1` を開き、PHASE 6C1 TEST表記を確認する。
2. 通常成長はMoon S1＋Opening3から。WASD/矢印で移動、Shift/SpaceでDASH。Lは未処理の通常候補→到達済Core→次Lvの合成XPの順。Coreは3択をクリック/タップ/1～3で選ぶ。Escは保留し、Lで再表示できる。
3. 直接比較は新規比較S4/S8等を押す（現在の比較武装に適用、初期値は3武装）。初期位置・EN・同fixtureからの新規試験で、Coreは未選択。比較武装ボタンはall→Moon→SPIKE→NOVAの単体を新規リセットして切り替える。Lで各到達Coreを選ぶ。Coreなし、単体3Core、全ASSAULT/CONTROL/REACTOR、異なるCoreの混成を作れる。
4. 配置を「Core 移動16体」「Core 本番AI移動 / 4種」へ切り替える操作も新規試験。前者は試験用の同じ往復進路＋本番slow合成、後者は本番4種移動で次の攻撃開始とランダムな進路反転を保留。旧cast/DEPを比較するには既存SPIKE/NOVA配置も使える。
5. 画像/簡易/FX OFF、H診断切替で色・足印を比較する。最新Coreと旧角/旧DEP snapshotはHUDで分けて確認。足印はスタンや残留fieldの表示ではない。
6. 別Coreを比較するときはRまたは同fixture/Stage比較で新規リセットする。走行中に選択済Coreを付け替える操作はない。旧6B URLは `umbraCore=1` を外し、旧S1入口も従来URLのまま使う。

## 11. 証跡・再実行

すべての今回証跡は `.tmp_umbra_phase6c1/2026-09-07T11-44-31-241Z/` に別保存。過去Phaseのbaseline/JSON/失敗結果を上書きしていない。

- `start-manifest.json` / `baseline/`: 着手状態。
- `final-v1/` / `final-sources-v1.json` / `harness-freeze-v1.json`: 主要試験前の凍結。各ブラウザ結果も自分のharness/source hashを持つ。
- `final-pure-v1b.txt`: 純257件。先行する256件の結果も別保存。
- `preservation-1788783112953.json`: 変更関数を含む保護監査。
- `http-1788783113344.json`: 配信39件。
- `numbers-final-v1.json`: 最終数値48行。SHA-256 `4a780a68d841d6ccbf4830b19416fdbe4ec6fddb91442d5278ce3183c707ad0c`。
- `source-lines-v1.json`: 本報告の現在関数行番号。
- `final-v1-core-second/core-browser-1788783264576.json`: 最終Core実Phaser60件。
- `final-v1-ui/core-ui-1788783326562.json`: 最終Core UI/FIFO35件。
- `final-v1-parity/core-parity-1788783371756.json`: 6Bとの12ペア。
- `browser-completion-v2.json`: 最終ブラウザ13レポートのpath/hashと集約。途中のv1も保持。
- `harness-final-v1b.json`: 最終ハーネスhash。主要試験前のhashから変わった場合は個別結果の実行時hashを優先する。
- `final-v1-growth-parity-second/core-growth-parity-1788783701940.json`: 旧Growthの21ペア。ハーネス本文に残る17という説明より実JSONの21件を報告値とする。
- `final-v1-enemy-parity/core-enemy-parity-1788783640124.json`: 既存4AIを含む3条件の比較。
- `final-v1-fx/core-fx-1788783434194.json`: 描画4条件と実HTTP404。
- `final-v1-growth/growth-browser-1788783452840.json`: 旧Growth53件＋カード。
- `final-v1-moon/moonlight-browser-report.json` / `final-v1-spike/bloodspike-browser-final-report.json` / `final-v1-nova/nova-development-1788783534426.json`: 旧105/261/122件。
- `final-v1-drive/drive-report.json` / `final-v1-oldmech-cards/oldmech-cards-1788783642238.json`: 旧移動と既存2機体の隔離UI。
- `final-v1-observation/core-observation-1788783833870.json`: rAF4本、全frameと開始間隔差を含む。
- `final-v1-ui/core-desktop-moon.png` / `core-narrow-spike.png` / `core-narrow-nova.png` / `core-budget-after30cards.png`: 最終カード・HUD。狭いSPIKEと30選択後HUDはrootでも画像を開き、枠内であることを確認した。
- `dev-*`: 途中の機能/画像/rAF確認。最終結果と混同しない。

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check equipmentDefinitions.js
node --check umbraDrive.js
node --check umbraDriveRuntime.js
node --check umbraDriveFixtures.js
node --check umbraMoonlightArena.js
$umbraPureTests = @(Get-ChildItem -LiteralPath tests -Filter '*.test.cjs' | ForEach-Object FullName)
node --test @umbraPureTests
node tests/umbra-core-preservation.cjs
node tests/umbra-core-http.cjs
node .tmp_umbra_phase6c1/2026-09-07T11-44-31-241Z/generate-core-numbers.cjs <新規出力JSONパス>
git diff --check
```

ブラウザ実行では `NODE_PATH=C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`、`UMBRA_TEST_BROWSER=C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`、`UMBRA_TEST_SOURCE_ROOT` に絶対パスの `final-v1`、`UMBRA_TEST_OUTPUT` に新規出力先を指定する。負荷試験は他ブラウザ試験と並列実行しない。保存/巨大JSON/screenshotは負荷計測区間外とする。

以下は新規出力ディレクトリを毎回作る再実行例。作業ディレクトリは本リポジトリ、4173サーバー稼働中、既存runtimeを使用する。出力を過去ディレクトリへ向けない。

```powershell
$env:NODE_PATH = 'C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:UMBRA_TEST_BROWSER = 'C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
$umbraEvidence = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase6c1/2026-09-07T11-44-31-241Z'
$env:UMBRA_TEST_SOURCE_ROOT = "$umbraEvidence/final-v1"
$env:UMBRA_TEST_BASELINE_ROOT = "$umbraEvidence/baseline"
$umbraRerun = "H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase6c1/rerun-$([guid]::NewGuid())"
$umbraBrowserTests = @(
  'umbra-core-browser', 'umbra-core-ui-browser',
  'umbra-core-baseline-parity', 'umbra-core-growth-parity',
  'umbra-core-enemy-parity', 'umbra-core-fx-browser',
  'umbra-growth-browser', 'umbra-phase4-moonlight-browser',
  'umbra-bloodspike-browser', 'umbra-nova-browser',
  'umbra-phase4-drive-browser', 'umbra-oldmech-cards-browser'
)
foreach ($umbraTest in $umbraBrowserTests) {
  $env:UMBRA_TEST_OUTPUT = "$umbraRerun/$umbraTest"
  $umbraFlags = @()
  if ($umbraTest -eq 'umbra-growth-browser') { $umbraFlags += '--no-raf' }
  if ($umbraTest -in @('umbra-bloodspike-browser', 'umbra-nova-browser')) { $umbraFlags += '--final' }
  node "tests/$umbraTest.cjs" @umbraFlags
  if ($LASTEXITCODE -ne 0) { throw "Failed: $umbraTest" }
}
# 上の全試験終了後に単独実行する。
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/normal-raf"
node tests/umbra-core-observation.cjs
```

NOVAの上記再実行例はラベル用`--final`を付けているが、今回の実行記録は前述のとおり付け忘れた元ファイルを維持する。drive等がローカル作業ファイルを参照する場合は、凍結12ファイルとの一致を前後に確認する。保護/HTTP監査は冒頭の標準出力先にstart-manifestと期待hashがある状態で実行するため、上の再実行環境変数を設定する前、または別PowerShellで実行する。

## 12. 未確認事項と次の判断

Coreの操作感・色の見分けやすさ・最終バランスは人間未確認。740×420の配置確認は実スマートフォンの指操作・可読性を保証しない。自然XP経路、深層生存性、実本番Gate/Relay、全敵の特殊攻撃/全衝突状態、全端末GPUの検証は行っていない。隔離fixtureの合成XP・直接Stage・攻撃保留を通常プレイの到達証明としない。

既知の角脱出の断続失敗、保守除外、過去の大きな描画外れ値、boostSustainDrainRampMs／boostSustainRampMs名の不一致は据え置き。短時間のrAF/p99で過去の遅延が解消した、長時間滑らか、GPU待ちが短縮したとは判断しない。6C2に進む前に、Coreの実操作・範囲内の減速体感・旧snapshot表示の分かりやすさを人間が再確認する必要がある。

今回の開始間隔差を次に切り分ける場合は、Coreなし側にも同数の手動step・pause/resume・rAF起動手順を用意し、準備手順だけを揃えた限定比較を先に行う案とする。現時点で製品の移動・攻撃・物理・vendorを修正すべき原因は確認できていない。この追加試験やPhase 6C2を今回の報告後に自動実行しない。

保存キーの追加・変更0。GEEK/ANJU MEMORY/LOST ARMS/DATA CACHE/OVERDRIVE/STABILIZEの製品仕様、ショップ/ランキング/保存/クラウド経路は変更0。隔離6Bの合成XP overflow遮断は従来どおり。新Control寄与はラン内のみで、owner終了/新規ラン/fixture変更/Scene終了時に破棄し、Depthでは旧lifeへの寄与を無効化する。

**Phase 6C1：Core変異・選択UI・実効果の実装結果。Final、TRIAD、装備対応、通常販売は未着手**

## 追記：Phase 6C2着手時の人間確認（2026-09-08）

ユーザーより、Phase 6C1について人間確認では問題なしとの報告。
確認されたCoreの操作・表示を維持し、Phase 6C2へ進む。
通常rAF開始直後の約66.7ms間隔差の原因は引き続き未確定。

上記は今回受け取った確認の記録であり、当時の「人間未確認」「検証未完了」の記載は履歴として残す。全端末・全敵の特殊行動・深層バランスの合格へ拡張しない。開始手順を揃えた限定比較とFinalの新しい結果は、別の [Phase 6C2報告](umbra-phase6c2-report.md) に保存する。
