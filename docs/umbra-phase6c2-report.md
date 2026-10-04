# KGK-02 UMBRA SERAPH — Phase 6C2 実装・検証報告

作業日: 2026-09-08。Stage8 Finalは明示隔離入口の検証用仕様。TRIAD・装備の新対応・通常販売は未着手。自動試験の結果を、人間操作・全端末・公開版バランスの最終合格には扱わない。

## 1. 着手時状態・比較基準・変更ファイル

AGENTS.md、README、Phase 6A設計、6B/6C1報告と専用武装・時計・AP0補正の既存記録を確認した。HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。着手時からREADME/game/index/skillDefinitionsは未commit差分、専用module・docs・tests・画像は未追跡の成果を含む。今回もcommit/push/deploy/reset/clean、依存追加、vendor/AGENTS/rules変更は行っていない。

指定された6C1 game.js `fda752679be2aeac231ce95edff75c0d28324983e61f56f976e75308c989717c` に対し、着手時は `b04b8be5c048f991cb73ee748f01af385aff797d270ec86607685ab885485d3c`。AP0試走終了の表示補正を参照する専用module URL版の差分を確認し、その状態を保存した。古いGit HEAD/6B/legacy Brakeへ戻していない。

今回の証跡ルートは [.tmp_umbra_phase6c2/2026-09-08-start](../.tmp_umbra_phase6c2/2026-09-08-start/)。`start-manifest.json` と `baseline/` に関連117ファイルの実体・hashを保存。最終主要試験前に `final-v1/` へ配信12ファイルを固定し、`final-sources-v1.json` と各ブラウザ結果のsource/harness SHA-256を対応させた。

| 今回変更 | 内容 |
|---|---|
| game.js | Final設定、正規選択/数値profile、主受付hook、有限副攻撃、無damage領域、専用起動flag・変更moduleの版 |
| umbraDrive.js | Final入口・指定見出し・カード接続 |
| umbraDriveRuntime.js | Final用関数の明示借用・Execution依存関数 |
| umbraDriveFixtures.js | growth/core/finalのContext許可 |
| umbraMoonlightArena.js | Final比較配置、有限表示、HUD、旧snapshotとAP0のFinal表示 |
| index.html | game.jsのURL版のみ `umbra-phase6c2-v1` |
| README.md | 新入口と仕様・操作の最小追記 |
| docs/umbra-phase6c1-report.md | 指定された人間確認を末尾へ追記 |
| tests/umbra-phantomnova-arena.test.cjs | 元の試験を保持し、fixture補助とFinal表示6試験を追加 |
| 新規tests/umbra-final-*.cjs、この報告 | 数値/FIFO/runtime/実Phaser/UI/FX/比較/観測/保護/HTTP検証 |

skillDefinitions.jsの24Stage、stage/equipment定義、27PNG、frame/pivot/scale、vendorの版は着手時のまま。最終game.js SHA-256は `5d7cdaa03fa7f47eac63cfab5a93d1bfb9eedd0c1764e6a2c11c78c266d365d4`。配信12件の全hashは上記manifestを参照。

## 2. 6C1の人間確認と未解決記録

6C1報告の当時の「人間未確認」「検証未完了」は消さず、次を追記した。

> ユーザーより、Phase 6C1について人間確認では問題なしとの報告。
> 確認されたCoreの操作・表示を維持し、Phase 6C2へ進む。
> 通常rAF開始直後の約66.7ms間隔差の原因は引き続き未確定。

開始差の限定試験は**着手時b04の製品コード**を使用。Coreなし側にも同じS4カード3回の表示・postrender・360ms演出、manual Game.step、pause/resume、rAF開始を与えた。なし側のカードonSelectだけハーネス内でno-opにしてCore未選択を維持したことを明示する。製品関数・時計・攻撃設定は変更しない。準備signatureが一致する1ペア、各12秒のみ測定した。

両側ともCPUサンプル718、rAF間隔717。先頭最大66.608msが両側に現れ、CPU Game.step最大はCoreなし5.30ms／CONTROL6.30ms、100ms以上0。全16敵が生存、CONTROL適用101。最初の区間を捨てず、生frame/手動step/停止復帰境界を保存した。

**確認できたこと**: 今回同じ準備にすると、以前の「CONTROL側だけ」という開始差は両側へ揃った。**支持する証拠があるが未確定**: カード・手動step・起動準備の違いが観測差に関係する。**未確定**: 66.7msを生む具体的な処理・スケジューリング原因。CPU時間からGPU待ちを推定していない。無関係な環境調査へ拡張せず、この限定比較で止めた。

生データ: `baseline-start-observation/final-start-observation-1788854517345.json`。Phase4の800.3ms、Phase3の565.3ms、過去の大きな外れ値は計測範囲が異なり、今回の最大値から改善率や解消を主張しない。

## 3. Final 9効果・Core×Final 27形態

各武装はASSAULT/CONTROL/REACTORの3CoreとEXECUTION/PRISM/SINGULARITYの3Finalを組み合わせる。武器classやPNGを27個作らず、同じ3武装のimmutable profileとCore色×Final形状で27形態を表現した。Coreの既存数値・条件は保持。

| 武装 | EXECUTION | PRISM | SINGULARITY |
|---|---|---|---|
| MOONLIGHT | 強対象の成功主受付に×1.25 | 成功主命中点から140px、別敵最大2体、35%、武装共有600ms、1boost1試行 | 最初の成功主命中点へ固定、R90、600ms、ICD750ms、最大1 |
| BLOOD SPIKE | impact各敵の直前HPを個別評価し、強対象なら×1.25 | 最初の成功主命中点から140px、最大2体、40%、1cast1試行 | 1体以上成功したcast中心、cast半径(S8=160)、impactから1000ms、最大2 |
| PHANTOM NOVA | 各周回/DEP主pulse直前に強対象なら×1.25 | 成功主命中点から100px、最大1体、40%、全slot/周回/DEP共有500ms、1slot/cycle/pulse1試行 | 正常DEP確定地点、R80、そのDEP期限未満のみ、最大3。ORBIT/REGENには作らない |

全領域はdamage0、通常敵0.85／実Boss flag0.95、各領域最大6体。これらは検証用の通常値で、安全上限（Moon/SPIKE半径200・寿命1200、NOVA半径100）まで自動強化しない。

表示はEXECUTIONの細い標的印、成功副受付だけのPRISM短線、SINGULARITYの薄いring1＋fill1/field。fieldは最大6。PRISM成功線とMoon/NOVAの成功標的印は各最大12・ownerの180 combat ms、SPIKEの細い印は作成時profileのcast表示寿命（通常800ms）に従う。FX数上限が命中対象・攻撃数を制限することはない。H診断OFFでも攻撃表示は残り、FX OFFは表示だけを止める。

## 4. 選択FIFO・deferred・正規resolver

現在の参照箇所: `game.js:63853 isUmbraFinalContextActive`、`:63857 isUmbraFinalSkillEligible`、`:63902 queueUmbraFinalMilestone`、`:63914 getUmbraNextMutationRequest`、`:63931 syncUmbraCoreMilestones`、`:64014 applyUmbraFinalChoice`。旧設計書の行番号ではない。

隔離Scene＋growth/core/final Context＋実行中UMBRA＋正規取得S8＋その武装の選択済みCore＋現run/owner/player/body/worldを条件とする。flagだけ、S1–7、未取得、偽Stage、古いrun/body/ownerでは選べない。

通常pendingとOpeningを先に処理し、その後、選択可能なCore/Finalの元milestone orderが最小のものを出す。全武装のCore完了を待つ方式にはしない。FinalはCore選択済みになってから元のorderで接続し、deferredの元記録を削除しない。同RAMで明示Final許可を付ける場合も接続は1回。旧6B/6C1ではFinal未接続のままで、後の有効Coreを止めない。

既存3択・即時lock・360ms演出・1回適用を使用。Final選択は通常pending/Opening/Stage/パッシブ/Evasive保証を消費せず、同Stageのprofile再計算だけを行う。Escでは保留、Lで再表示。失敗/throw/stale callbackはselectedへ確定せず、再試行可能なqueueを残す。不適格なqueue要素は有限の診断列へ残し、有効な後続を止めたり空overlayを繰り返したりしない。

23技能＋3Core＋3Final＝29選択、通常の余白パッシブ4を含め33操作。合成XPを使った実選択経路の確認で、自然XP・敵撃破によるLv25到達の証明ではない。Lv25最後の通常pending後に到達Finalを残し、DEEP LEVELへ進んでも消さない。

## 5. 生raw・係数・丸め・snapshot

`game.js:81134 getUmbraSkillFinalProfile` で `{finalId, coreId, addedRaw:R, coreDamageMultiplier:C}` をfreeze。SPIKE cast、NOVA DEPへ作成時profileをコピーし、主命中/副表示もそのprofileを保持する。Final未接続の旧getterのshapeを増やさない。

`game.js:64138 getUmbraFinalMainRawDamage` は既存 `isHighValueMutationTarget` を各主受付直前に使用する。条件はBoss/Elite/Nemesis、またはHP比≥0.62、またはmaxHP≥36のOR。満HPの小さい通常敵も条件に入る。領域のBoss減速判定とは別である。

```text
R = Stage基本値 + max(0, bulletDamage - 1)
C = ASSAULTなら1.25、それ以外1
F = EXECUTIONかつその敵が強対象なら1.25、それ以外1
主raw = max(1, round(R × C × F))
副基準raw = max(1, round(R × C))
副raw = max(1, round(副基準raw × 分岐係数))
```

R=6のASSAULT+EXECUTION強対象は**9**。Core丸め8を再び1.25倍して10にはしない。S8・加算なし・ASSAULTの強対象主rawはMoon19/SPIKE8/NOVA5、他対象は15/6/4、PRISM副rawは5/2/2。CONTROL/REACTORのExecution強対象は15/6/4、Prism副rawは4/2/1。

`applyDamageToEnemy(enemy, raw, tint, null)`へ1回渡す。generic Mutationの1.12倍、Bolt、damageAlreadyScaled、supportFinisher、新しい装備/TRIAD係数を経由しない。受付抑制、既存damage multiplier、撃破/dropは既存receiverの責任を維持する。fieldはdamage0のreceiverさえ呼ばない。

## 6. PRISMの有限処理・親消費

参照: `game.js:64256 reserveUmbraFinalDispatch`、`:64283 dispatchUmbraFinalSecondary`、主hookは`:65697 applyUmbraMoonlightHit`／`:65198 applyUmbraBloodSpikeImpact`／`:64897 applyUmbraPhantomNovaPulse`。

最初の成功主受付で親の試行を消費し、ICDが通れば候補探索前に次期限を予約する。対象0・候補死亡/再利用・副受付拒否でも同じ親から再試行しない。ICD不成立時は元の期限を延長しない。全主受付が拒否された親には副攻撃0。

Moonはそのboostでこれまでに実際に試みた全主life（拒否を含む）をSetに残し、当該物理stepの全主ループを終えてから分岐する。SPIKEは同impact全主試行lifeを除外し、最初の成功点から分岐する。cast中心を分岐中心にはしない。NOVAは当該主対象を除外し、共有ICDはslot/周回/DEP/Fire/REACTOR/同Stage更新でリセットしない。後の別物理stepで副対象へ主通過する場合は別の受付として扱う。

候補は現在bodyの円/矩形最近点・距離・実壁LOSを用い、最近傍Kだけの挿入を行う。重複group/lifeを除外。damageを線上へ拡散せず、選択済み候補が拒否/無効になっても別候補を補充しない。attackId、parentId、life Set、budget、secondaryDepth=1を持ち、副からCore/Finalを呼び出す経路はない。主再命中履歴を副で消費しない。

途中のrun/Depth/owner/body/basis/停止変化では同じ同期処理内で残りを中断する。致死主命中は死体参照の再読みに依存せず、固定成功点を使える。Timerや次frame queueは作らない。Moon表示callbackが例外を投げる経路もfinallyで未処理ticketを破棄し、次stepへ積まない。

## 7. 領域の所有・membership・時計・実移動

参照: `game.js:64322 createUmbraFinalField`、`:64366 updateUmbraFinalFields`、`:64121 getUmbraControlSpeedMultiplier`、`:64404 getUmbraFinalSnapshot`。

各武装runtimeの `finalState.fields` Mapが所有し、fieldIdを独立したsubownerにする。生成位置/半径/profile/作成時刻/期限/世代はproperty自体も変更不可。可変なのはmembership Mapと次観測時刻だけ。主CONTROLのMap・期限や、同じ倍率の別fieldへ寄与を混ぜない。

生成した許可物理stepで**初回membershipを1回**評価し、その後はowner combat clockで100msごとに現在body距離/LOSの最近傍6体へ入れ替える。遅れた更新のcatch-upを連続再生しない。退出・LOS変化には原則最大約100 combat ms＋物理量子化の観測遅延がある。life/body/死亡/Raid/supportDamageHoldは読み取りgetterでも即時に再確認するため、次membership時刻を待って保護対象を減速し続けない。Support保護の比較はSceneの `time.now` を使い、武装時計との絶対時刻比較はしない。

期限は半開区間。期限ちょうどは失効が先で、最後のmembership更新を追加しない。Moonは幾何hit時刻ではなくowner step終了clockから600ms、SPIKEは成功impactから1000msで角画像800msと独立。NOVAは正常DEP確定直後、敵が0でも生成できるが、予約/配置拒否・周回/再生成では生成しない。

各owner時計は別々。getter/HUD/FXは時計を進めない。pause/候補overlay/hiddenでは時計と残りを保持。通常boost終了/Air Brakeはfieldを消さない。Moon通知OFF/武装停止は当該ownerのfieldを掃除し、時計停止による永久fieldを残さない。Depthは旧field座標/membershipを破棄、NOVAの旧DEP残時間＋regen負債は維持。死亡/帰還/新試走/Scene終了はownerの既存cleanupを通る。

主CONTROL0.75/600msとfield0.85/1000msが同時なら0.75→0.85→他の補正へ戻る。既存0.50を0.85へ弱めず、掛け算しない。6C1の本番移動adapter（追跡/dash/ranged/Boss接近・記録済みlightning dash指令）に合成後の最小倍率を一度だけ反映する。現在速度への累積倍率や保存した昔の速度への復元は追加していない。特殊Boss全行動の対応確認へ一般化しない。

## 8. 旧状態・既存機能の保護

`preservation/preservation-2026-09-08T08-17-13-450Z.json` はPASS。着手baseline117ファイルの保存hash、保護108ファイル、27PNG、skillDefinitions全体、117設定、fixture数値、移動allowlistを照合した。

旧3279関数は3255がbyte一致、24がFinalの接続変更、追加29、削除0。分類別には移動211、EN20、AP/無敵42、通知16、敵AI/移動adapter17、receiver4、XP/通常予算7、保存/クラウド/ランキング155、公開/HANGER/Atlas99がbyte一致（分類に重複を含み、単純合計しない）。Core保護10関数中8は一致、2はFinal領域のpruneとmin合成の厳密に限定した差分。

新しいStage/Core/Finalの選択で既存SPIKE cast、NOVA DEP/regen、Moon life/cursor/主履歴、slots、時計を作り直さない。old cast/DEPの無Final snapshotは遡及せず、次cast/次正常DEPから新profileが入る。元PNG/frame/pivot/表示倍率は変更0。AP0の終了表示は終了時のFinal取得記録を読み、武装の生存許可を回復しない。

保存キー追加/変更0。GEEK/ANJU MEMORY/LOST ARMS/DATA CACHE/OVERDRIVE/STABILIZE、Shop/Ranking、通常HANGER/購入/所有/Atlas/Archive/装備許可ID、Deep発生条件を変更していない。新しいFinal状態はラン内RAMのみ。既存の角脱出断続失敗、保守経路除外、boostSustainDrainRampMs/boostSustainRampMsの不一致も据え置く。

ブラウザは新規の隔離contextを使用し、StorageデータAPI呼出し0、通常Scene/認証/クラウド/ランキング入口0、外部要求0をguardと結果で確認した。vendorの`localStorage`存在確認は各context 1回で、データ取得とは別に記録する。旧比較ハーネスの合成sentinel書込みは新規contextの試験準備だけで、その後の製品データAPIは禁止。実プロフィール・本番アカウント・実保存領域を読み書きしていない。

## 9. 検証結果と計測範囲

着手前: 純258/258。凍結b04の実ブラウザはCore60ケース/780確認、Core UI35、Growth53＋23技能カード、Moon105、SPIKE261、NOVA122、AP0 22確認がPASS。起動時4173サーバーが停止していたため最初のCore/UIにロードtimeoutが発生し、環境不足として元ログを保持。サーバー準備後の新contextで再実行して通過した。製品の着手前失敗とは区別した。

最終固定v1では純試験**320/320 PASS**（元258＋Final数値/選択39＋Final runtime17＋arena表示6）。結果は`pure-final-v2.txt`。ブラウザでの機能結果は次のとおり。開発途中の結果を最終版へ読み替えず、各`final-v1-*`のsource hashを確認した。

| 試験 | 結果 | 範囲 |
|---|---|---|
| Final実Phaser | 51ケース / 828確認 PASS | Scene30/60/120各17、既存fixed60物理。3武装×3FinalのHP差分・raw、field6対象と主9対象、旧cast/DEP、FIFO |
| Final追加境界 | 21ケース / 549確認 PASS | 同3頻度各7、3武装同敵へのkill/drop一回性、副致死、NOVA3slot共有ICD、壁LOS、停止/通知OFF、readonly50回 |
| 実カード/UI | 38ケース PASS | 実360ms確認、33操作、狭幅、旧callback/保留、最新HUD/slot表示 |
| Final FX | 12ケース PASS | 画像/簡易/FX OFF/実404のHP・効果一致、Core色・旧profile・有限表示 |
| 旧Core | 60ケース / 780確認 PASS | 30/60/120、Core9効果と旧時計・選択・制御 |
| 旧Core UI | 35ケース PASS | 最終v1の旧6C1入口で実選択・保留・破棄・狭幅を再実行 |
| 旧Growth | 53ケース PASS | 24Stage、23技能の実カード経路、旧snapshot等 |
| 旧専用S1 | Moon105 / SPIKE261 / NOVA122 PASS | 今回のFinal入口を付けない旧URL |
| 旧AP0/機体候補 | AP0 22確認、既存2機体候補2ケース PASS | 終了表示/リセット、標準機・REGALIAの候補 |
| b04との旧Core比較 | 20対一致 | 生frame/実HP/skip/時計/期限。許可したrun ID・CPU時間のみ正規化 |
| b04との旧Growth比較 | 21対一致 | 同Stage/入力、武装snapshot・攻撃数 |
| b04との敵移動比較 | 3対一致 | 本番4AI移動・既存減速なし/0.50/旧3倍率積 |
| b04との旧移動/S1併用比較 | 12対一致 | 既存3機体×3fixtureの空走行9対＋UMBRA S1共存30/60/120の3対 |
| Final有効の敵なし比較 | 12記録一致 | 最終版の未選択/3Final×30/60/120。未選択の自比較3を含み、独立した比較は9対。位置/速度/EN/Brake/Evade/trace |
| b04対Final選択済み空走行 | 3対一致 | 同ASSAULT S8、Execution/Prism/Singularity、Scene60。準備と測定開始を分離 |

最後の直接比較は、測定前だけ両側をScene時刻50000・body(480,500)・EN100/AP40・既存`resetAcMovementState`・world accumulator0へ揃えた。trace/Scene/physicsは測定開始originからの増分を比較し、準備差と元traceを別に保存した。実戦の途中状態が同じだったとする測定ではない。

補足のHP1は「すでに損傷した敵」の撃破境界を作る機能fixtureで、性能測定の敵HP変更には使用していない。通知OFFは同じrun/Contextを保持したまま、試験内の既存`isUmbraBoostTraceEnabled`だけをfalseにして独立cleanupを確認した。製品UIに途中通知OFFボタンを追加していない。foreign Context交換は全owner無効化となる別試験で、通知OFFだけの期待と誤った初回結果も保存した。

### 通常rAFの同条件比較

Windows、HeadlessChrome 148.0.0.0、Phaser 3.70、WebGL（ANGLE / NVIDIA RTX 5070 / Direct3D11）、既存fixed60物理。GPU処理時間は測っていない。Game.step全体のCPU処理時間をwrapperで測り、直後の同じゲームループcallback内で数値採取時間を別計測した。別rAF callbackでは間隔だけを記録する。詳細snapshotの毎frame文字列化、JSON保存、スクリーンショットは測定区間外。Scene/物理回数、数値位置、攻撃・field・資源数は測定中にも採取するため、観測負荷自体は0ではない。別rAF callbackの間隔はブラウザの表示機会の指標であり、画面への実提示時刻やGPU時間の直接測定ではない。

各比較内で敵16体・定義由来HP275・共通の検証用30×30矩形body・配置・カメラ・準備・入力を統一した。全武装S8 REACTOR、既存の有効候補からRapid Sigilを6回取得（Fire間隔160ms、SPIKEは500ms下限）。7枚目は効果がなく候補に出ない。通常バランス用baselineではなく、短い周期と上限の境界fixtureである。敵は同じ120px帯を70px/sで上下移動し、1秒単位で右→下→左→上の入力、各秒先頭220msだけDASHする。敵のHP変更/再生成はない。Coreのみ側にも同じFinalカード3回・360ms演出・manual step・停止復帰を与え、選択callbackだけ試験内でno-opにして未選択を維持した。3構成の準備signature一致を確認した。

最初は各**設定35秒（30秒攻撃＋5秒武装停止後観測）**。全構成でNOVA最大DEP3・cycle6、敵16/16生存、終了field0。SINGULARITYの最大fieldは5だったため、この試験の`passed:false`（上限6の観測不足）をそのまま残した。例外や機能assert失敗が原因ではないが、上限観測まで合格したとはしない。

上限不足に限定し、16体中最後の2体の開始Yだけ785→1220へ移し、同じ120px移動帯を保つ補足を別保存した。3構成とも新しい同一配置で各**設定12秒（8秒攻撃＋4秒停止後観測）**、一度ずつ測定。HP・攻撃設定・寿命・入力・枠数は変更しない。SINGULARITYで開始約**2016.742ms**から実際にMoon1＋SPIKE2＋NOVA3＝**6field**が同時存在し、該当36frameを保存。最大DEP3、cycle2、敵16/16生存、終了field0。この補足はPASSだが、元35秒の最大5や外れ値を置き換えない。

以下の時間単位はms。p95/p99は昇順配列のnearest-rank、中央値は偶数件なら中央2値の平均。丸め前の値・全frameは生JSON、集約は`final-performance-summary.json`に保存した。

| 区間 / 構成 | CPU件数 | 平均 | 中央値 | p95 | p99 | 最大 | ≥100ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 35秒 / Coreのみ | 2095 | 1.346 | 1.2 | 2.4 | 3.3 | 6.1 | 0 |
| 35秒 / PRISM | 2094 | 1.198 | 1.1 | 2.4 | 3.0 | 6.0 | 0 |
| 35秒 / SINGULARITY | 2094 | 1.560 | 1.4 | 2.7 | 3.6 | 7.3 | 0 |
| 補足12秒 / Coreのみ | 715 | 1.263 | 1.1 | 2.2 | 3.2 | 5.8 | 0 |
| 補足12秒 / PRISM | 714 | 1.127 | 1.0 | 2.1 | 3.3 | 4.9 | 0 |
| 補足12秒 / SINGULARITY | 714 | 1.372 | 1.2 | 2.3 | 3.1 | 3.9 | 0 |

| 区間 / 構成 | rAF間隔件数 | 平均 | 中央値 | p95 | p99 | 最大 | ≥100ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 35秒 / Coreのみ | 2094 | 16.715 | 16.7 | 16.8 | 16.9 | 116.600 | 1 |
| 35秒 / PRISM | 2093 | 16.723 | 16.7 | 16.8 | 16.9 | 133.500 | 1 |
| 35秒 / SINGULARITY | 2093 | 16.723 | 16.7 | 16.8 | 16.9 | 133.308 | 1 |
| 補足12秒 / Coreのみ | 714 | 16.807 | 16.7 | 16.8 | 16.9 | 116.700 | 1 |
| 補足12秒 / PRISM | 713 | 16.831 | 16.7 | 16.8 | 16.9 | 133.308 | 1 |
| 補足12秒 / SINGULARITY | 713 | 16.831 | 16.7 | 16.8 | 16.8 | 133.442 | 1 |

数値採取処理の標本は各CPU件数と同数。35秒の平均はCoreのみ/PRISM/SINGULARITY順に0.008926/0.007832/0.014183ms、補足は0.011049/0.009384/0.012745ms。全6構成の中央値0、p95/p99各0.1ms、最大は35秒すべて0.2ms、補足0.2/0.1/0.2ms、100ms以上0。中央値0は時計分解能の結果で、観測コストが存在しない意味ではない。

**100ms以上は全6構成とも最初のrAF intervalの1件だけ**で、直前・直後のGame.step CPUは1.7〜2.5msだった。35秒Coreのみの最初の実間隔116.6msに対し、Game.stepへ渡されたdeltaは15ms、Scene/物理回数は31/30→32/31。既存TimeStepの平滑化を含むため、実時間・Scene更新・物理stepを同一視しない。設定やvendorは変更していない。開始間隔の具体的原因は未確定で、CPU結果からGPU待ち・解消を推定しない。

### 実際の発生数・停止・資源

表のM/B/NはMoon/SPIKE/NOVA、受付数は既存receiverが成功した回数。Finalにより敵位置・HPが変わり、rAFの量子化もあるので、攻撃回数の違いを省略したまま平均CPU差をFinal単独の費用や高速化として断定しない。

| 区間 / 構成 | 主受付 M/B/N | SPIKE cast/impact | NOVA pulse / DEP配置 | PRISM副受付 M/B/N | field作成＝終了 M/B/N |
|---|---|---|---|---|---|
| 35秒 / Coreのみ | 27/274/111 | 55/55 | 306 / 18 | 0/0/0 | 0/0/0 |
| 35秒 / PRISM | 28/280/98 | 57/57 | 306 / 18 | 22/77/25 | 0/0/0 |
| 35秒 / SINGULARITY | 21/277/115 | 58/57 | 306 / 18 | 0/0/0 | 11/57/18 |
| 補足12秒 / Coreのみ | 11/67/77 | 15/15 | 84 / 6 | 0/0/0 | 0/0/0 |
| 補足12秒 / PRISM | 8/73/79 | 16/16 | 84 / 6 | 6/20/11 | 0/0/0 |
| 補足12秒 / SINGULARITY | 11/67/77 | 15/15 | 84 / 6 | 0/0/0 | 4/15/6 |

全6構成の撃破0・field damage/撃破0。35秒PRISMの副受付124、補足37。35秒SINGULARITYのmembership更新M/B/N＝66/565/540、入場/退場は各34/295/15で一致。補足は更新24/137/150、入場/退場各12/68/15で一致した。35秒はDEP期限終了17・regen16、補足は3/3。武装停止により未完了の攻撃を掃除した結果も保存しており、SPIKE castとimpactの差を失敗として消していない。

| 区間 / 構成 | Scene/物理：開始→武装停止→終了 | ブラウザ実時計：開始→停止→終了(ms) | GameObject：開始/最大/終了 | 実Timer最大 / 配列長合計最大 / 終了 |
|---|---|---|---|---|
| 35秒 / Coreのみ | 30/30→1824/1822→2125/2123 | 1420.3→31291.5→36293.6 | 157/180/153 | 10 / 19 / 0 |
| 35秒 / PRISM | 30/30→1823/1821→2124/2122 | 1209.1→31067.1→36068.5 | 157/182/153 | 13 / 22 / 0 |
| 35秒 / SINGULARITY | 30/30→1823/1821→2124/2122 | 1205.6→31068.3→36070.7 | 157/185/155 | 11 / 20 / 0 |
| 補足12秒 / Coreのみ | 30/30→504/502→745/743 | 1390.8→9269.5→13271.9 | 157/180/155 | 10 / 19 / 0 |
| 補足12秒 / PRISM | 30/30→503/501→744/742 | 1187.0→9047.1→13048.9 | 157/182/155 | 10 / 19 / 0 |
| 補足12秒 / SINGULARITY | 30/30→503/501→744/742 | 1200.0→9066.7→13068.8 | 157/185/155 | 10 / 19 / 0 |

実時計は各新規contextの`performance.now()`で、異なる行の絶対値同士を比較しない。設定35秒/攻撃30秒に対し、上表の実測境界は約34.86〜34.87秒/29.86〜29.87秒で、準備直後の観測originとの差も含めて元時刻を残した。Timer実個数は同一objectのSetで重複除去した値。active/pending等の配列長合計は別列であり、実個数としない。listenerは全構成で同じ減少（worldstep 4→3、preupdate 9→7など）を示し、観測区間の増加はなかった。終了GameObject総数の差を全objectのidentityまで分類した漏れ0の証明にはしない。長時間・全端末の資源安定性は未確認。

**確認できたこと**: 有敵の反復攻撃、3DEP、補足で6field、有限生成/期限/停止cleanupが実rAFで発生した。**支持する証拠があるが未確定**: この環境・短い測定ではFinalによる戦闘中の反復的な大CPU遅延は観測されていない。**判断できないこと**: 開始間隔の具体的原因、GPU待ち、長時間の滑らかさ、公開版性能合格。新しい継続CPU異常がなく上限補足も得られたため、128/512体の追加総当たりは行わなかった。

開発中のruntime純試験ではNOVAの追加予約を既存800ms配置待ちより早く出したため、領域3個の期待に対し1個、次の試行では2個となる失敗があった。待ちを正規800ms経過後に置いた試験入力へ修正して12/12通過し、その後17試験へ拡張。製品の配置待ち・HP・枠数を短縮して通したものではない。元tool出力から取り出した失敗記録は `root-test-iterations.json`。保護監査の初回FAILは既存arena testの拡張を無条件で改変扱いしたためで、元本文維持＋fixture3箇所＋Final6試験に限定されることを確認し、分類を修正した前後JSONを残した。

計測範囲は次のとおり。

| 測定 | 実行と含むもの | 区別するもの |
|---|---|---|
| 純試験 | 実prototype、数値body、明示通知・選択関数・fakeタイマー | Phaser衝突・実端末Hzではない |
| 制御Phaser機能試験 | 実Phaser Game.step、Scene30/60/120Hz入力、既存fixed60物理、詳細snapshot | 同期時間制御であり通常rAF性能ではない |
| 最初の限定rAF | b04、同準備のなし/CONTROL各12秒、Game.step CPUと全frame間隔 | 初区間除去なし、GPU時間は未測定 |
| Final通常rAF | 同準備・入力・敵配置のCoreのみ/PRISM/SINGULARITY、連続30秒走行＋停止後観測 | 詳細JSON/画像は区間外、CPUと見た目間隔を別記 |
| 上限補足rAF | 2敵の開始Yだけを変えた同条件3構成、8秒走行＋4秒停止後観測 | 元35秒とは別配置・別標本。6fieldを観測しても旧最大5を置き換えない |
| HTTP/保護 | 固定12ファイル＋27PNG、前後hash・通常経路のbyte照合 | 本番デプロイ検証ではない |

機能試験と負荷測定は別ハーネス/出力。負荷中に他の自動ブラウザを並走させない。最初は16体を使い、再現理由のない128/512体全組合せは追加しない。Timerはactive+pending配列の重複可能性を認識し、identityを確認した値以外を実個数と断定しない。短いp99・外れ値非再現で長時間の滑らかさを保証しない。

## 10. 人間用URL・操作・比較配置

[Phase 6C2をローカルで開く](http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraGrowth=1&umbraCore=1&umbraFinal=1)

1. ページ全体を再読み込みし、`PHASE 6C2 TEST / Final変異 / TRIAD・装備対応未実装 / 進行保存なし` を確認する。旧6C1タブの画面内Rだけでは新moduleを読み込まない。
2. 通常の連続比較はMoon S1＋Opening3から。Lで合成XP/未処理カードを開き、S4 Core、S8 Finalを選ぶ。クリック/タップ/1–3で360ms確認、Esc保留、L再表示。
3. 各形態のすぐの比較は「比較武装」でMoon/SPIKE/NOVA/3武装を選び、「新規比較S8」で同fixture・初期位置・満ENから再開。Core/Finalは未選択なのでLで正規選択する。S8直接初期化は自然成長の到達証明ではない。
4. WASD/矢印＋Shift/SpaceでDASH。P停止/復帰、R新規試走、H判定、T通知表示。武装/機体/fixture/配置切替は新規リセット。FX画像/簡易/OFFだけでは効果・期限・ICDをリセットしない。
5. 「配置切替」のFinal分岐、SPIKE外縁分岐、9体領域入替、壁遮断を使用する。内部IDは`final_branch`/`final_spike_branch`/`final_field`/`final_walls`。既存group/Boss/大矩形/Core本番AI配置も維持する。
6. 旧cast/DEPの比較は連続試走中にFinalを選び、すでに生成されたものと次生成を比べる。配置やS8比較ボタンを押すと新規試験になり旧snapshotを保持しない。
7. 接触被弾ONでAP0になった場合は中央の終了表示を確認する。Pで復活せずRで新規試験へ戻る。攻撃の観測を続ける場合は接触OFFへ変更してからリセットする。

HUDの「強raw」は条件付きExecution値。カードには条件と他対象値を併記する。PRISMのICDは武器発射周期と別、SINGULARITYの半径はNOVA主射程やSPIKE探索600とは別。主CONTROLと領域を別行で読み分ける。Finalの体感・薄い地面/標的印の視認性は人間の再確認が必要。

## 11. 証跡・再実行

過去のPhase報告/生データを上書きせず、新しい`.tmp_umbra_phase6c2`へ保存した。最終HTTPは `http-1788855399489.json`、固定12コード＋27PNGの**39件PASS**。構文はgame/skill/stage/equipmentと変更4moduleの8件PASS、`git diff --check` PASS。gitのLF→CRLF通知は差分エラーではない。

既存のNode/Playwright/Chromiumを使用し、npmや依存導入なし。再実行例は次のとおり。毎回新規出力先を使い、負荷ハーネスは他のブラウザ試験の終了後に単独で実行する。

```powershell
$env:NODE_PATH = 'C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:UMBRA_TEST_BROWSER = 'C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
$umbraEvidence = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase6c2/2026-09-08-start'
$env:UMBRA_TEST_SOURCE_ROOT = "$umbraEvidence/final-v1"
$env:UMBRA_TEST_BASELINE_ROOT = "$umbraEvidence/baseline"
$umbraRerun = "H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase6c2/rerun-$([guid]::NewGuid())"
$umbraPure = @(Get-ChildItem tests -Filter '*.test.cjs' | ForEach-Object FullName)
node --test @umbraPure
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/preservation"
node tests/umbra-final-preservation.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/http"
$env:UMBRA_TEST_MANIFEST = "$umbraEvidence/final-sources-v1.json"
node tests/umbra-final-http.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/final-browser"
node tests/umbra-final-browser.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/final-ui"
node tests/umbra-final-ui-browser.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/final-boundaries"
node tests/umbra-final-browser.cjs --boundaries-only
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/final-fx"
node tests/umbra-final-fx-browser.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/final-empty"
node tests/umbra-final-empty-parity.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/baseline-active-empty"
node tests/umbra-final-baseline-active-empty-parity.cjs

# 以下は上の機能試験終了後に単独実行。既定は各35秒、capは別配置で各12秒。
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/raf"
node tests/umbra-final-observation.cjs
$env:UMBRA_TEST_OUTPUT = "$umbraRerun/cap-raf"
node tests/umbra-final-observation.cjs --cap-fixture
```

作業ディレクトリは`H:/ラスメモヴァンサバゲーム`。4173が起動していなければ既存の`python -m http.server 4173 --bind 127.0.0.1`を使用する。最初の35秒ハーネスは上限6を要求するため、元配置で最大5なら再度coverage FAILになり得る。性能外れ値の削除や合格するまでの反復用コマンドではない。`--controlled --singularity-only --cap-fixture`は60Hz制御の上限資格確認であり、通常rAF測定に数えない。

| 証跡 | 内容 |
|---|---|
| [着手manifest](../.tmp_umbra_phase6c2/2026-09-08-start/start-manifest.json) / [最終配信hash](../.tmp_umbra_phase6c2/2026-09-08-start/final-sources-v1.json) | 117ファイルの着手状態、最終12配信ファイル |
| [最終ブラウザ集約v2](../.tmp_umbra_phase6c2/2026-09-08-start/browser-completion-v2.json) | 19項目の結果・生JSON/source/harness hash・失敗履歴 |
| [証跡と再実行コマンド索引v2](../.tmp_umbra_phase6c2/2026-09-08-start/browser-artifact-index-v2.json) | 旧Core/Growth/S1回帰、差分比較などの個別pathとコマンド |
| [性能集約](../.tmp_umbra_phase6c2/2026-09-08-start/final-performance-summary.json) | 全6構成の統計、環境、frame/Timer/listener、発生数 |
| [35秒rAF生データ](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-raf/final-observation-raf-1788856518631.json) | 元配置、最大field5の未充足判定を保持 |
| [12秒上限補足の生データ](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-cap-raf/final-observation-raf-1788856757844.json) | 2敵の開始Yだけを変えた3構成、最大field6 |
| [Final補足21件](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-boundaries3/final-boundaries-1788856378080.json) | 致死/報酬/共有ICD/所有/通知OFF/LOSの追加境界 |
| [HTTP39件](../.tmp_umbra_phase6c2/2026-09-08-start/http-1788855399489.json) / [保護監査](../.tmp_umbra_phase6c2/2026-09-08-start/preservation/preservation-2026-09-08T08-17-13-450Z.json) | 配信実bytes、既存成果の保持 |
| [ハーネス保管](../.tmp_umbra_phase6c2/2026-09-08-start/final-harness-archive/) | 最終新規ハーネスをSHA-256付きで保存 |

最初のFinal51件を実行した版も別途再構成し、記録済みSHA-256 `1e9bc52250d75c19a341c04ac11fb83ffbb11d915942927c7883400a1993e9a1` と完全一致する実体を保存した。補足・cap用の診断追加後のハーネスを、過去試験に使用した版とは記載しない。旧`browser-completion.json`も保持し、最後に確認漏れを埋めた旧Core UI35はv2へ追記した。

スクリーンショットは、[33操作後のHUD](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-ui/final-budget-after33cards.png)、[Moonカード](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-ui/final-desktop-moon.png)、[狭幅SPIKE](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-ui/final-narrow-spike.png)、[狭幅NOVA](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-ui/final-narrow-nova.png)、[EXECUTION併用](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-fx/final-execution-all3.png)、[PRISM併用](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-fx/final-prism-all3.png)、[SINGULARITY併用](../.tmp_umbra_phase6c2/2026-09-08-start/final-v1-fx/final-singularity-all3.png)。数値・profile検証と組み合わせて確認し、画像だけから命中/処理時間を推定しない。密集fixtureの敵名が重なる箇所、短い線や薄い領域の体感視認性まで最終合格とはしない。

## 12. 未確認事項・次の判断

Finalは隔離用に実装した結果であり、人間の操作感・視認性・公開版の最終バランスは未確認。740×420のブラウザ表示は実スマートフォンの指操作/可読性の保証ではない。通常ランの自然XP、全敵の特殊Boss行動、深層生存性、実本番Gate/Relay、全端末GPUは未確認。元のenemy AI/physicsを変えずに接続したことと、全行動検証は別である。

開始時66.7msの具体的原因、今回の先頭116〜133ms間隔、過去の大きい外れ値、角脱出断続失敗・保守除外、boostSustain名不一致は未解決として引き継ぐ。今回の機能・回帰試験では、未解決の新規Final機能不整合は検出されていない。この範囲の通過を未確認の体感・性能まで拡張しない。

Phase6DのTRIAD、装備の新対象化、OVL、通常公開/購入/保存を始めるには後続の範囲決定が必要。今回の報告後に自動で進めない。

**Phase 6C2：Final変異・有限分岐・減速領域の実装結果。TRIAD、装備対応、通常販売は未着手**

## 追記：Phase 6D1着手時の人間確認（2026-09-08）

ユーザーより、Phase 6C2について人間確認では問題なしとの報告。
確認されたFinalの操作・表示を維持してPhase 6D1へ進む。
開始時のrAF間隔差と過去の性能課題の原因解明は別事項として残す。

確認端末、fixture、全27形態の確認範囲は未指定。当時の人間未確認・性能記録を履歴として保持し、全端末、自然XP進行、深層バランス、通常公開の合格へ拡張しない。今回の接続と検証は別の [Phase 6D1報告](umbra-phase6d1-report.md) に記録する。
