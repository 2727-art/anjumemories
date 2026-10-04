# KGK-02 UMBRA SERAPH Phase 6A — Stage成長・Mutation・補正統合の設計案

2026-09-06。**製品コード未変更。本文のS2～8、NOVA増枠Stage、Core／Final効果、接続方法は提案であり、未承認。** Phase 6B以降への実装許可を兼ねない。

## 0. 記録の区分と比較基準

- **【Phase 5で実装・確認済み】** は現在の検証S1と、過去報告に記録された条件内の確認を指す。今回ブラウザで再測定したという意味ではない。
- **【ユーザー要望】** は今回の依頼・人間確認・SPIKE成長要望を指す。
- **【今回の提案・未承認】** は本書で示す第一案。表の見出しにこの区分がある場合、その表全体に適用する。S1の既存値だけは比較基準として併記する。
- **【現行コードで確認した制約】** は着手時の作業ツリーから読んだ事実。
- **【未確認】** は実装前の性能・バランス・人間の評価など、今回確定できないもの。

【現行コードで確認した制約】HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。比較基準は古いHEADのゲームではなく、Phase 5完成状態の作業ツリーである。game.js SHA-256は依頼の `fd27f20c159682ae7363654b238e49f29b8327e2703900205ccbf129a9e0a451` と一致した。復元・巻き戻しは行わない。

着手時のstatus（2026-09-06T11:43:37.624Zにhash一覧採取）:

```text
 M README.md
 M game.js
 M index.html
 M skillDefinitions.js
?? docs/
?? tests/
?? umbraDrive.js
?? umbraDriveFixtures.js
?? umbraDriveRuntime.js
?? umbraMoonlightArena.js
?? umbraPreview.js
?? umbraPreviewAssets.js
?? 画像/player/KGK-02_UMBRA_SERAPH/
```

AGENTS.md、README.md、Phase 5報告、BLOOD SPIKE成長メモと、以下に示す現行関数を確認した。製品コード・素材・既存証跡を編集せず、今回の数値確認はRAM内の計算に限定する。変更許可は本書、Phase 5報告の末尾追記、READMEの案内だけ。新規ハーネス・ブラウザ試験場・画像・依存は作らない。

## 1. Phase 5から引き継ぐ基準

【ユーザー要望】ユーザーより、Phase 5について人間確認で問題なしとの報告。確認された基本動作・表示を後続成長設計の基準として維持する。端末、fixture、枠数、全武装組合せの確認範囲は未指定である。過去報告の「当時は人間確認前」は履歴として残し、この確認を全端末・深層バランス・過去の遅延解消へ拡張しない。

【Phase 5で実装・確認済み】現行 `skillDefinitions.js:624` 以降の `verificationStage1` と専用getterは、依頼のS1値と一致する。

|武装|基礎と攻撃条件|時間・上限|維持する境界|
|---|---|---|---|
|MOONLIGHT|raw 4、通過半径60、離脱余白12|再命中750ms、Fire Control下限200ms、8コマ10fpsの1回再生、FX最大12|離脱＋新しい有効ブースト進入＋待ち時間。同じ通過・同じlifeに1回。通常移動・滑走・Air Brakeは非攻撃|
|BLOOD SPIKE|raw 5、探索600、固定地面中心の半径80。S1から複数敵へ命中|再発動1800／下限500ms、空探索150ms、impact200ms、8コマ10fps・800ms、cast上限3|cast生成時に位置・性能固定。impact時の実body／LOS。同cast・同lifeに最大1回の受付試行|
|PHANTOM NOVA|1枠。周回raw2／射程220、残留raw3／射程300|周回900／下限300ms、残留500／下限200ms。周回半径80・周期4000ms。設置800ms・現存DEPとの距離120。残留3000ms未満、再生成1200ms。8コマ8fps|1ブースト1基、開始時予約と初回物理評価、失敗した予約を同boostで復活させない。ORBITING＋DEPLOYED＋REGENERATING＝総枠。DEPは配置時snapshot|

共通rawは `基礎値 + max(0, stats.bulletDamage - 1)`。パッシブのReactor OverchargeとMutationのREACTOR COREは別物である。既存ダメージ受付が持つ永続・CD・機体・OVERDRIVE・対象補正をrawへ重ね掛けしない。

Air Brake tuned、通常移動、初速・加速・滑走、ENの基礎計算、無敵、AP、DEEP LEVEL、Traceの保守除外、LOS、生存世代、素材の24姿勢／8矩形／pivot／metadata scaleを維持する。S1を弱体化して成長幅を作らない。Phase 5の `umbraNovaSlots=2/3` は検証用であり、正式成長の承認ではない。

## 2. 基本Stageの第一案 — 24行

**【今回の提案・未承認】Core／Final・Reactor加算・TRIAD・装備・受付倍率より前の基本Stage表。** 単位はワールドpxとms。各行の数値差は次の実攻撃に使用する差であり、表示だけのStageは設けない。

### 2.1 MOONLIGHT: 通過威力を主軸にする

全Stageで離脱余白12、FX8コマ10fps、同時FX12、通過内1回を維持する。`M-D`＝`getUmbraMoonlightRawDamage`（game.js:80195）、`M-I`＝`getUmbraMoonlightRehitIntervalMs`（80205）、`M-G`＝`getUmbraMoonlightEffectiveStats`（80220）／`processUmbraMoonlightStep`（64738）。これらを現在Stage参照へ移行する計画であり、今回は変更しない。

|Stage|基礎raw|通過半径／離脱外縁|再命中 基本／下限|数・表示|前Stageとの差|体感・見た目|接続|
|---|---:|---|---|---|---|---|---|
|S1|4|60／72|750／200|1受付/通過/life、8コマ|現行基準|現在の斬撃を維持|M-D/I/G|
|S2|5|60／72|750／200|同上|raw +1|同じ通過の威力増。短い芯の発光、判定幅は同じ|M-D|
|S3|6|62／74|750／200|同上|raw +1、半径+2|側面通過の許容を少し拡大。外縁ガイドも+2|M-D/G|
|S4|7|64／76|725／200|同上|raw +1、半径+2、基本−25|通過火力と再進入の小改善。Coreは別途選択|M-D/I/G|
|S5|8|64／76|725／200|同上|raw +1|幅を広げず威力増。斬撃中心の輝度段階のみ|M-D|
|S6|9|66／78|700／200|同上|raw +1、半径+2、基本−25|狙った再通過を少し速める|M-D/I/G|
|S7|10|68／80|675／200|同上|raw +1、半径+2、基本−25|接近・離脱経路の許容増。薄い幅ガイド|M-D/I/G|
|S8|12|70／82|650／200|同上|raw +2、半径+2、基本−25|通過1回の威力が完成。Finalは別途選択|M-D/I/G|

半径の最終増分は10pxに抑える。敵の実shapeまでの外側距離が82pxを超えない限り、基本S8では離脱成立にしない。半径拡大は再攻撃しやすさだけでなく必要な切り返し距離も増す。ボスではshapeの大きさも加わるため、短縮間隔だけで連続命中を保証しない。画像metadataを変更せず、ゲーム側の薄い判定外縁と既存斬撃の接地点で幅を示す。

### 2.2 BLOOD SPIKE: 半径に成長を集中する

【ユーザー要望】「Stage上昇で敵集団を巻き込む成長実感」を中心に、既案のS4=110、S6=135、S8=160を採る比較案。探索600、raw5、周期1800／下限500、impact200、寿命800、cast上限3は全Stage固定。`B-G`＝`getUmbraBloodSpikeEffectiveStats`（80271）、`createUmbraBloodSpikeCast`（64324付近）、`applyUmbraBloodSpikeImpact`（64346）のcast snapshotと専用表示。

|Stage|基礎raw|半径／探索|再発動 基本／下限|数・持続|前Stageとの差|体感・見た目|接続|
|---|---:|---|---|---|---|---|---|
|S1|5|80／600|1800／500|cast≤3、200でimpact、800で終了|現行基準|現在から複数命中|B-G|
|S2|5|90／600|1800／500|同上|半径+10、面積比1.266|隣接する敵を拾いやすい。地面外縁90|B-G＋cast表示|
|S3|5|100／600|1800／500|同上|半径+10、面積比1.563|小集団への巻込み。地面外縁100|同上|
|S4|5|110／600|1800／500|同上|半径+10、面積比1.891|最初の成長節目。Core選択は別|同上|
|S5|5|122／600|1800／500|同上|半径+12、面積比2.326|中心を外した集団にも届きやすい|同上|
|S6|5|135／600|1800／500|同上|半径+13、面積比2.848|密集地面の制圧。既案の比較点|同上|
|S7|5|147／600|1800／500|同上|半径+12、面積比3.376|外周の敵を追加で狙える|同上|
|S8|5|160／600|1800／500|同上|半径+13、面積比4.000|地面攻撃範囲の完成。Final選択は別|同上|

面積比はすべてS1比 `R²/80²`。実火力倍率ではない。中間値は区間ごとに概ね等分し、110→135を+12/+13、135→160を+12/+13にした提案。単体に対する基本威力・周期は伸ばさず、Core／Finalや他武装へ単体処理の役割を残す。

### 2.3 PHANTOM NOVA: S4で2枠、S8で3枠

**【今回の提案・未承認】** S4・S8を増枠の節目にする。基本対象数は各slotの各pulseで1体のまま。周回／残留の攻撃間隔900/300・500/200、周回半径80・周期4000、残留3000未満・再生成1200、設置800・距離120、8コマ8fpsを全Stage固定する。`N-D/I/G`＝`getUmbraPhantomNovaRawDamage`（80301）／`IntervalMs`（80309）／`EffectiveStats`（80320）、`N-S`＝`initializeUmbraPhantomNovaRuntime`（63773）から分離する増枠helper。

|Stage|周回／残留raw|周回／残留射程|周回・残留間隔 基本／下限|総枠・寿命・再生成|前Stageとの差|体感・見た目|接続|
|---|---|---|---|---|---|---|---|
|S1|2／3|220／300|900/300・500/200|1枠・3000未満・1200|現行基準|1基の周回と切離しを学ぶ|N-D/I/G/S|
|S2|2／3|230／300|同上|1枠・同時間|周回射程+10|機体周辺の取りこぼしを少し減らす。球サイズ固定|N-G|
|S3|2／3|230／310|同上|1枠・同時間|残留射程+10|置いた地点から届く幅を小改善|N-G|
|S4|2／3|230／310|同上|2枠・同時間|新slotを1つ追加|1基を残し1基を置く選択。Coreは別|N-S|
|S5|3／3|230／310|同上|2枠・同時間|周回raw +1|周回を残す価値を補強。周回放電の芯のみ強調|N-D|
|S6|3／3|230／320|同上|2枠・同時間|残留射程+10|残留地点の守備範囲を小改善|N-G|
|S7|3／3|240／320|同上|2枠・同時間|周回射程+10|機体周囲に残す役割を維持|N-G|
|S8|3／3|240／320|同上|3枠・同時間|新slotを1つ追加|周回・残留・再生成を配分。Finalは別|N-S|

枠増加は最大3倍の攻撃機会を生むため、残留威力・寿命・周期・連鎖・標的数を同時には伸ばさない。S2/3/6/7は10pxの射程だけの小さい成長で、強い増枠Stageの間を埋める意図である。範囲だけのカードが十分な成長感を持つかは人間確認事項。これを理由に先に周期や対象数を追加しない。

## 3. 役割と範囲表示

**【今回の提案・未承認】** MOONLIGHTは危険を伴う経路選択による高い1通過火力、SPIKEは自動の固定地面範囲攻撃、NOVAは周回を残すか場所を守らせるかの配分にする。3武装すべてを常時周辺攻撃・全画面放電へ近づけない。

SPIKEの第一推奨表示は、現在の角画像の高さ・接地点・frame・pivot・scaleを保ち、**同じcastのimpactRadiusから地面の薄い発光面と外縁を描く**方式。実判定が円なら上面ガイドも円にし、装飾用の潰した楕円を判定境界として見せない。壁でLOSが遮られる部分はガイドがあっても命中保証とはしない。実body境界テストと併せて確認する。

|案|利点|問題／第一判断|
|---|---|---|
|地面GraphicsのみRに合わせて拡大、主角画像固定|機体と敵予兆を隠しにくく、画像再編集不要|**第一推奨**。S1表示は維持し、成長分の地面を追加|
|角画像を縦横R/80倍|実装は短い|S8で高さまで2倍となるため不採用。既存metadataも変えない|
|主角＋外周の小角2本|広い地面の読み取りを補助できる|追加比較候補に留める。採る場合は画像表示だけ、主角込み3描画/cast、body・attackId・受付数を増やさない|

NOVA射程を示す円は検証ガイドのみ。通常表示は成功した放電線の長さと既存球で示し、3基の大きな常時射程円で敵予兆を覆わない。Mutationの見分けはCoreの色とFinalの線形状・薄い地面パターンを組み合わせる。

## 4. Core／Finalの第一案

### 4.1 共通の実装契約

**【今回の提案・未承認】** Stage4の `assault/control/reactor`、Stage8の `execution/prism/singularity` を維持する。専用3武装だけに以下の効果を定義し、旧3武装の汎用係数・副攻撃は変更しない。27種類の武器classは作らず、Stage profile＋Core係数／制御＋Final dispatcherで合成する。

|契約|第一推奨|
|---|---|
|主受付|MOONの有効通過、SPIKEのcast impact、NOVAのslot pulseという現在の条件を先に満たす。`applyDamageToEnemy`へ一度渡し、実HP差が正の場合だけ命中後効果を出す。NOVA SINGULARITYだけは別記の非damage設置効果。拒否を別コマや同親の副攻撃で再試行しない|
|威力Core|ASSAULTはrawに対する×1.25を一度だけ適用。副次攻撃にも自身のrawから一度反映する。×1.20ではNOVA raw2が丸めで2のままになるため、第一案は×1.25|
|強対象|EXECUTIONは主攻撃の対象が現行`isHighValueMutationTarget`（game.js:36206）なら×1.25、それ以外×1。追加Boltは出さない。Boss/Elite/Nemesis、HP比≥0.62、またはmaxHP≥36という既存判定なので、満HPの小敵も含む。Boss専用と誤表示しない|
|副次攻撃|`attackId={run,depth,skill,parentId,kind,serial}`、独立life Set、有限予算を持つ。主攻撃と区別して計数。`secondaryDepth=1`で終了し、Coreの鈍足・REACTOR・Final dispatcherを再発火しない|
|副威力|親のHP損失や装備適用済み値を入力しない。親が保持した生raw・Core/Final/TRIAD profileを用い、副対象向けに一度だけ威力を計算→分岐係数とTRIAD PRISMを一度→OVERLIMIT/ARMAMENTを一度→既存受付。詳細は第7節|
|対象・壁|専用生存世代と現在の円／矩形body、元点→対象最近点LOS、boundsを使う。NOVA周回では元のプレイヤー→球LOSも維持。角の除外区間をMutationで復活させない|
|ICD|武装の許可戦闘時計で管理。pause/hidden/overlayは凍結、stage変更でも残り保持。記載するICDはFire Control/SENSOR/REACTORで短縮しない|
|色と形|Core: Assault赤金／Control青紫／Reactor淡いシアン。Final: Execution細い標的印／Prism細い分岐線／Singularity薄い地面リング。新画像・音声、透明余白・frame・pivot変更は不要|
|範囲効果|Singularityは**ダメージなしの残留制御**を第一案にする。論理攻撃数・SPIKEの再impact・NOVA枠を増やさない。通常敵の移動slow、Boss系は弱いslow。力による押出し・吸引・EN/AP/無敵付与なし|

制御fieldは共通小helper `updateUmbraMutationControlFields`（新規候補）で扱う。各fieldは生成時の位置・半径・profile・期限を固定、100msごとに最大6つの生存敵を現在body距離／LOSで選ぶ。近い6体のlife membershipをfieldごとに保持し、次回対象から外れたlifeの寄与は削除してから新membershipへ置き換える。field期限/Depth/破棄でもそのfieldの寄与だけ削除する。離れた旧6体へ残効を蓄積して同時上限を超えない。これは**新副効果の仕様上限**であり、主攻撃の命中上限を下げるものではない。catch-upで制御判定をまとめ打ちしない。field1つにつきring1＋fill1まで。Moon1・SPIKE2・NOVAは現存DEP最大3の合計最大6field。枠満杯時は古いfieldを消さず新fieldを見送り、診断理由を残す。

slowは通常敵の移動倍率0.85、Boss/Nemesisは0.95をfieldの基本とし、CONTROL主効果がある場合は下表を使う。主CONTROLと各fieldは**独立した所有元・強度・期限の寄与record**を持ち、生きている寄与の最小倍率を使う。単一recordに「最強倍率＋別効果の最大期限」を合成しない。同じ所有元・同じ強度の反復だけ期限maxで更新可、強度が異なる旧寄与は本来の期限まで。TRIAD CONTROLは減速量 `(1-slow)` と主CONTROLの持続時間へ一度、TRIAD SINGULARITYはfield半径・寿命へ一度。field membershipには離脱後の追加durationを持たせない。UMBRA由来の最終slowは通常敵≥0.65、Boss/Nemesis≥0.90、主CONTROLの付与時間≤1000ms。他武装の既存slowを弱める上書きはしない。

【現行コードで確認した制約】`applySkillMutationSlow`（36280）はTRIAD CONTROLを内包しScene時刻を使う。現行専用武装はpause時に独自戦闘時計を止めるため、そのまま呼ぶと時計が混在する。**新規の小さいUMBRA制御recordと実効slow合成adapter**を推奨する。game.js:68771以降のLOST ARMS・Cleaning・既存Mutationの既存積を先に維持し、その従来総合slowとUMBRAの生存寄与のminを取る。既存個々の補正を消したり、UMBRAを新たに掛けて拘束を増幅したりしない。UMBRA寄与0件の旧計算結果は完全一致させる。各runtimeの許可時計で残りを減らし、死亡/Depth/終了で所有recordを破棄する。既存Scene時計・物理stepは変更しない。これは敵制御の新効果として6Cで明示的に実装・確認する範囲。

### 4.2 MOONLIGHTのCore 3種

**【今回の提案・未承認】**

|ID|条件・対象・仮効果|持続／ICD／上限・受付区分|カード説明と見た目|最小接続|
|---|---|---|---|---|
|assault|有効通過の主威力×1.25。Prism派生は自身のrawへ同係数を一度|主通過の既存1回/life制限。追加攻撃なし|「通過斬撃の威力+25%」。赤金の刃芯|`getSkillMutationDamageMultiplier`専用分岐→`applyUmbraMoonlightHit`|
|control|主受付に成功し生存する敵へslow0.78、Boss系0.92、420ms|同通過/life1回、副攻撃から付与しない。重複はmin/期限max|「斬った敵の移動を短く鈍らせる」。青紫の薄い足元印|成功後dispatcher→新制御record|
|reactor|再命中間隔×0.90（下限200維持）、離脱余白12→8|主攻撃の再入条件は維持。時間下限でも余白−4は残る。Stage/選択時は半径rebase契約を使用|「再攻撃待ち−10%、再進入に必要な離脱余白−4」。淡い二本線|M-I/M-G専用profile、`rebaseUmbraMoonlightRadius`（新規）|

MOON REACTORは移動速度・Air Brake・Traceの有効性を変更しない。S8の離脱外縁は70+8=78px。余白変更だけでarmedにしない。半径や余白が変わる強化では、実際の外側観測から再開する。

### 4.3 BLOOD SPIKEのCore 3種

**【今回の提案・未承認】**

|ID|条件・対象・仮効果|持続／ICD／上限・受付区分|カード説明と見た目|最小接続|
|---|---|---|---|---|
|assault|主impact威力×1.25、Prism派生にも自身のrawへ一度|同cast/life1試行、元castの複数敵命中を維持。追加impactなし|「突き上げ威力+25%」。主角の赤金の芯|専用倍率profile→cast snapshot→impact|
|control|主受付に成功し生存する各敵へslow0.75、Boss系0.92、600ms|各cast/life1付与。主の複数敵数は制限しない、副から付与なし|「突き上げた敵を短く足止め」。青い地面印|`applyUmbraBloodSpikeImpact`成功後→新制御record|
|reactor|再発動×0.90（下限500維持）、敵なし時の再探索150→100ms|生成済みcast/impact200/寿命800不変。次castの既存deadlineは保持。周期が下限でも再探索改善は残る|「再発動待ち−10%、敵なし時の再探索を高速化」。予兆リングに短い刻み|B-Iと空探索設定の専用profile。既存observe内の次待ちだけ|

空探索の改善は敵がいない間の観測頻度を増やすため、その単独費用を6Cで比較する。範囲、威力、周期、cast数を一括強化する効果ではない。下限時のカードは「周期500ms（下限）／再探索100ms」と実効値を表示する。

### 4.4 PHANTOM NOVAのCore 3種

**【今回の提案・未承認】**

|ID|条件・対象・仮効果|持続／ICD／上限・受付区分|カード説明と見た目|最小接続|
|---|---|---|---|---|
|assault|周回・残留の主pulse威力×1.25、Prism派生にも自身のrawへ一度|主は1target/slot/pulse、枠は増えない。DEPは配置時profile保持|「周回・残留放電の威力+25%」。小さい赤金の球芯|N-D/profile、commit時snapshot、pulse受付|
|control|成功主pulseの生存敵へslow0.85、Boss系0.95、250ms|同slot/pulse/life1回、副から付与しない。別pulseで更新可|「放電した敵を一瞬鈍らせる」。青紫の細い放電線|`applyUmbraPhantomNovaPulse`成功後→新制御record|
|reactor|次に配置する球の再生成1200→1000ms|既存DEPのsnapshot、既存REGENERATINGのdeadlineは不変。残留3000、pulse間隔、設置800/120は不変|「次に置く球の再生成待ち−200ms」。再生成表示にシアンの短い進捗刻み|N-G、commit時snapshot。regen完了の次pulse初回待ちは維持|

NOVA REACTORは基礎枠を即補充せず、残留を終えた後の無攻撃時間を200msだけ短くする。火力周期短縮と再生成短縮を混同しない。再生成時間の提案下限は1000ms（他補正を掛けない）。

### 4.5 Final 3種 × 3武装

**【今回の提案・未承認】** EXECUTIONは3武装とも共通の×1.25主係数で、追加attack・ICD・持続はなし。強対象の判定は各主受付の直前に行う。PRISM/SINGULARITYの条件は次表で個別化する。

|武装／Final|条件・対象・仮効果|時間・予算・重複防止|カード説明・既存素材による形|接続候補|
|---|---|---|---|---|
|MOON execution|有効通過の強対象へ主×1.25|同通過/life1回を維持。副Boltなし|「強対象への通過威力+25%」。細い縦の標的印|専用倍率profile／`applyUmbraMoonlightHit`|
|MOON prism|成功した最初の主命中点から140以内の別敵へ最大2分岐、各0.35倍|武装ICD600ms、1boostSequenceにつき1dispatch、各副life1回。元主対象を除外。後で別の有効主通過が同敵へ当たることは別受付|「通過命中から近くの別敵へ最大2本、威力35%」。短い二股線|成功後`dispatchUmbraMutationSecondary`（新規）|
|MOON singularity|成功した最初の主命中点へ半径90、600msの非damage制御field|ICD750ms、1boostにつき1生成、同時1field。止まっていても主斬撃を再発火しない|「通過命中地点に短い減速域」。薄い円と途切れた縁|成功後→共通field updater|
|SPIKE execution|impact時の強対象へ主×1.25|同cast/life1試行。既存200ms以外の追撃なし|「強対象への突き上げ威力+25%」。主角に細い縦印|cast profile→impact対象判定|
|SPIKE prism|impactの最初の成功点から140以内へ最大2分岐、各0.40倍|1cast1dispatch。主impactの全試行lifeを先に確定し、その全員を副から除外（拒否敵も再試行しない）。別castは独立。副life各1回|「突き上げの外へ最大2本、威力40%」。外縁から細い二股線|impact主ループ終了後→専用secondary|
|SPIKE singularity|主impact成功時に同cast中心・同impactRadiusの非damage制御field、1000ms|1cast1生成、同時2field、追加damageなし。cast800msで角は終了しfieldだけ残る。field生成後のStage変更で拡大しない|「突き上げた地面に1秒の減速域」。角は従来どおり消え、低い地面光が残る|impact成功集約→共通field updater|
|NOVA execution|各pulseの強対象へ主×1.25|同slot/pulse1target。枠・pulse数は増えない|「強対象への放電威力+25%」。成功線の先端だけ標的印|配置profile／pulse受付|
|NOVA prism|成功主pulse点から100以内の別敵へ1本、0.40倍|全slot共通ICD500ms、1pulse1dispatch、副life1回。対象の存在/LOSを再確認しslotは複製しない|「放電から別敵へ1本、威力40%（共有待ち0.5秒）」。細い枝線|成功後→専用secondary、武装単位ICD|
|NOVA singularity|正常DEP確定時、球中心の半径80に非damage制御field。主pulse性能はそのまま|field寿命はそのDEPの残留期限未満、1DEP1field・最大3。距離/壁/開始失敗では生成しない。再生成に入ったら終了|「置いた球の近くに減速域」。小さい低輝度円、球や論理枠は増やさない|`commitUmbraPhantomNovaReservation`→所有DEP field|

PRISMは分岐対象がいなければ主命中だけで終わる。親キーはMoon=`run/depth/boostSequence`、SPIKE=`run/depth/castId`、NOVA=`run/depth/slotId/cycleGeneration/pulseSerial`。Moonは最初の成功主命中時に親dispatch試行済みを記録し、ICD待ち/field満杯でもそのboostでは再試行しない。SPIKEも最初の成功があるcastで1回だけ。ICDが通ったdispatchの予約時に次ICDを設定し、敵なしや後続拒否でも戻さない。ICD待ちの失敗は既存次ICDを延長しない。

Moonの副実行はその実stepの主ループ後に行い、同boost内で既に主試行したlife（成功・拒否）を除外する。後続stepで新しい主進入が副対象へ成立することは別の主受付であり、未来の主対象を事前予測して除外する設計ではない。SPIKEは同impactの全主試行lifeを除外する。NOVAは同pulseの主対象を除外する。主対象が受付で死亡しても成功位置snapshotから分岐を探索できるが、旧runtimeへ切り替わった場合は全副処理を止める。副受付は拒否後に別対象へ振り替えない。

NOVA SINGULARITYは命中後効果と別の**正常配置に伴う非damage効果**で、敵なしでもfield自体は生成する。全fieldの制御対象は、専用生存世代/body/LOS/boundsに加え、Final Raid・対象不能・`supportDamageHoldUntil`等の既存受付抑止に該当しない敵だけ。damage0を投げて可否を試す方式にしない。抑止された対象へslowを付けて受付拒否を迂回しない。

SINGULARITYのfield終端と同時刻の制御更新は実行しない。NOVA fieldの寿命はTRIAD倍率でDEPの期限を越えない。Moon/SPIKEのfield半径上限は200、寿命上限は1200ms、NOVAは半径上限100・寿命上限はDEP期限。再帰・ダメージpulse・吸引はない。

【現行コードで確認した制約】`findSkillMutationTargets`（36335）は敵中心距離とsortを使い、専用攻撃の実shape/LOSを持たない。`triggerSkillMutationSingularity`（36566）も旧skill別のinterval guardで、新IDを追加するだけでは毎hit発動になり得る。`fireSkillMutationBolt`（36466）はMutation・装備を内包する。これらを専用callbackに丸ごと接続せず、既存の実damage受付と幾何helperを再利用する小dispatcherを推奨する。

### 4.6 各スキル9最終形態（計27）

**【今回の提案・未承認】** 以下はS8基本値に上の効果を合成した差。CoreとFinalの共通契約を再利用し、形態ごとの特例27分岐は作らない。主係数1.5625は1.25×1.25の丸め前で、強対象以外は1.25。装備/TRIADはまだ含めない。

|MOON形態|主と派生の違い|役割／見分け|
|---|---|---|
|assault_execution|主×1.25、強対象×1.5625、追加攻撃なし|最大の通過単発／赤金＋縦印|
|assault_prism|主×1.25、威力係数を一度反映した35%分岐2本|通過と有限分岐／赤金＋二股|
|assault_singularity|主×1.25＋90/600の非damage域|通過火力と退路制御／赤金＋地面円|
|control_execution|主強対象×1.25＋420ms slow|強対象へ通過後の退避支援／青紫＋縦印|
|control_prism|主だけslow、分岐2本は追加slowなし|中心制御と周辺削り／青紫＋二股|
|control_singularity|主slowと残留域は独立期限、生存寄与のmin|通過後の一時制圧／青紫＋地面円|
|reactor_execution|待ち×0.90、余白8、強対象×1.25|経路を作る再通過／シアン＋縦印|
|reactor_prism|待ち×0.90、余白8、分岐ICD600は短縮なし|再進入と限定分岐／シアン＋二股|
|reactor_singularity|待ち×0.90、余白8、field同時1・ICD750固定|短い退路を作る反復／シアン＋地面円|

|SPIKE形態|主と派生の違い|役割／見分け|
|---|---|---|
|assault_execution|主×1.25、強対象×1.5625|集団内の強対象も削る／赤金＋縦印|
|assault_prism|主×1.25、主範囲外へ40%分岐2本|外周への有限拡張／赤金＋二股|
|assault_singularity|主×1.25＋半径160/1000の非damage域|突き上げ後の地面制御／赤金＋地面円|
|control_execution|強対象×1.25、主成功敵へ600ms slow|強対象周囲を鈍らせる／青紫＋縦印|
|control_prism|主だけslow、外側の2敵に分岐|集団中心と外周の分担／青紫＋二股|
|control_singularity|主slow＋残留域。掛け算で拘束を増やさない|強いが有限の地面制御／青紫＋地面円|
|reactor_execution|次周期×0.90・再探索100、強対象×1.25|固定地点の回転重視／シアン＋縦印|
|reactor_prism|次周期×0.90、各cast最大2副受付|群れ外周への回転重視／シアン＋二股|
|reactor_singularity|次周期×0.90、field最大2・古い期限保持|地面の連続的な制圧／シアン＋地面円|

|NOVA形態|主と派生の違い|役割／見分け|
|---|---|---|
|assault_execution|3枠各pulse主×1.25、強対象×1.5625|配置と周回による強対象処理／赤金＋縦印|
|assault_prism|主×1.25、40%分岐1本・全slot共有500ms|3枠でも分岐予算は有限／赤金＋枝線|
|assault_singularity|主×1.25、DEPだけ半径80減速域|場所を守る攻撃配置／赤金＋地面円|
|control_execution|強対象×1.25、成功主250ms slow|近い強対象の短い制御／青紫＋縦印|
|control_prism|主のみslow、分岐1本はslowなし|放電先の分散／青紫＋枝線|
|control_singularity|主slowとDEP域は独立期限、生存寄与のmin|固定地点の減速支援／青紫＋地面円|
|reactor_execution|次設置からregen1000、強対象×1.25|周回へ戻る頻度を支える／シアン＋縦印|
|reactor_prism|regen1000、分岐共有500msは固定|復帰と有限放電／シアン＋枝線|
|reactor_singularity|regen1000、DEPの3秒は延長なし|短い配置再循環／シアン＋地面円|

Core自身にEN回復・消費変更、移動強化、無敵、全回復を加えない。6Dで既存TRIAD REACTOR/TRINITYを接続する場合のゲージ・EN効果は、専用Coreとは別の承認項目として第7節で扱う。

## 5. 強化時の状態、snapshot、deadline

### 5.1 取得・強化・破棄を分ける

【現行コードで確認した制約】3武装の取得guardは `verificationOnly` と `currentStage === verificationStage1` を要求する。Moonはgame.js:64582、SPIKEは63733、NOVAは63765。S2のobjectを代入するだけでは作動しない。NOVAのprepare（63861）はSKILL_INACTIVEでruntimeを破棄する。現行 `applySkillStage`（44286）は正式配列を前提とし、専用3behaviorを実行できない。Arenaの `connect`（umbraMoonlightArena.js:260）は3runtimeを破棄してS1を作り直すため、成長用に流用できない。

**【今回の提案・未承認】** 新helper `getUmbraActiveSkillStage(skillId)` は実行中機体Context、限定検証許可、定義、取得state、stageIndex、canonical Stage参照、専用behaviorを照合する。HUB選択値・文字列behaviorだけの許可へ緩めない。将来の `stages[0]` と `verificationStage1` は**同じ不変objectへの参照**にし、S1の2つの値表を持たない。

`applySkillStage`の既存orbital処理より前に `applyUmbraSkillStageChange(skillState, previous, reason)` を置く。初回取得だけ専用runtimeを初期化し、通常Stage/Mutationでは既存runtimeへ差分反映してreturnする。汎用orbitalの再作成・clock初期化を通さない。前回適用済み数値profileをruntimeに保持して差を取る。Mutation setterは同Stage再適用より先に選択値を書き換える（35217/36865）ため、previous Stage参照だけでは旧余白12→新8を検出できない。

|入口|初期化／更新|破棄・保存|
|---|---|---|
|初回Unlock|当該武装のみ作成。Moonは現在の新規取得規則、SPIKEは現在の初回探索、NOVAは初回待ちあり|他2武装は維持。保存しない|
|通常Stage上昇|currentStage/profile更新と下表の差分だけ|全runtime resetなし|
|Core/Final選択|同Stageの将来profile更新。半径・余白に差があればMoonだけrebase|選択前に作ったcast/DEP/field/FXは旧snapshotのまま|
|検証のR／fixture・機体・取得構成変更|現行の新規試験reset|明示的な新規条件。減Stage/減枠もここだけ|
|新規ラン／終了／死亡／Context解除|所有runtimeと副効果を破棄、新runは新世代|保存キー・所有権へ反映しない|
|Depth移行|現在の専用Depth処理を維持。新座標の基準を取り直す|MoonのDepth境界、SPIKE cast破棄、NOVAの残寿命＋再生成持越し。Stage/Mutation/総枠は維持|

### 5.2 MOONLIGHTの再基準化

**【今回の提案・未承認】** 半径または離脱外縁変更時だけ、既存敵recordに `radiusRebasePending=true` 相当を付け、`armed=false`にする。`initialEligible`による初回特例もこのgate中は攻撃根拠に使わない。新しい外縁の外にいることを、次の正常な有効経路または現行で許されるnormalPathの実start/endで観測してからgateを解除する。その後の有効boost進入だけが命中候補になる。除外された角・不明補正の弦を離脱証明に使わない。

`lifeId/passId/lastHitAt/registeredAtStep/生存世代/履歴`を保持する。**敵cursorも保持する。** `snapshotUmbraMoonlightEnemy`（64639）はcursorで敵warpを検出するため、半径変更でnullにしない。Traceのcursor、boostSequence、通知orderも変更しない。`invalidateUmbraMoonlightPasses`（64694）はcursorを消すので成長用に使わない。威力だけのStage更新ではarmed・離脱状態に触れない。新spawnのlifeだけは従来の初回ルールを使う。

【現行コードで確認した制約】Moonの再命中待ちは、独立deadlineではなく `lastHitAt＋その時点のrehitMs` で判定する（64738/80205）。第一案はこの既存Fire Controlの性質を維持する。短縮は次の正当な進入判定に使い、短縮されたという理由だけで攻撃しない。旧待ちを絶対期限へ固定する新仕様は採らない。

### 5.3 スキル別の反映表

**【今回の提案・未承認】** 「即反映」は選択適用時に行うRAM状態更新であり、その場でdamageを出す意味ではない。

|対象|現在へ即反映|次の攻撃から反映|変更しない|
|---|---|---|---|
|Moon主|現在Stage/HUD。半径・外縁差がある場合の再離脱gate|次の正当な進入で新raw/profile/再命中時間。新半径でgeometryを判定するが、命中権は新外縁の外側観測後|life/pass/lastHit/cursor、成立済み受付、古いFXの8コマ完走|
|Moon副効果|将来dispatchの設定だけ|次の条件を満たす主成功から|既存field/副attackのsnapshot、共有ICD、親boost消費履歴|
|SPIKE|現在Stage/HUDと次cast用設定だけ|次castの位置決定時にraw/半径/Core/Final/TRIAD/装備snapshot|既存cast位置・attempted・impact時刻・800ms寿命、`nextCastAtMs`、`lastCastSceneUpdate`、combat時計|
|NOVA既存ORBITING|現在Stage/HUD。現在pulseや予約をやり直さない|次の正規pulseに新raw/射程/profile。そのpulse後に新intervalを採用|slotId、cycle、現在`nextPulseAtMs`、phaseOffset、予約成否|
|NOVA既存DEPLOYED|なし（HUDは新Stageと既配置の旧性能を区別）|次の正常設置から|位置・raw・射程・interval・Core/Final/TRIAD/装備・期限・regenを配置時snapshotで保持|
|NOVA既存REGENERATING|なし|再生成完了後、最新周回interval分の初回待ち|既存`regenerateAtMs`。強化で即充填しない|
|NOVA増枠|不足分の新slotだけORBITINGで付与、予約なし|新slotは付与時刻＋実効orbitIntervalで初pulse|既存全slotとdeadline、`lastDeployAtMs/lastStartSequence/lastEventOrder`|

SPIKEはCore/Final識別子だけでなく必要な係数もcastに固定する。impact時に現選択の汎用getterを読み直して旧castを新Mutationへ変えない。NOVAのDEPも同様。対象が強対象か、実body、LOS、受付のOVERDRIVE・対象固有補正は受付時点で判断する点は現在のS1受付と区別する。

### 5.4 NOVA増枠とpause

**【今回の提案・未承認】** `reconcileUmbraPhantomNovaSlots(targetTotal)` は1～3の承認Stage数との差分だけを追加する。同Stageの再適用、S1→S8の複数Stage指定でも冪等。既存最大slotId+1を採番し、既存IDを再利用しない。新slotはORBITING・cycleGeneration0・予約なし・`nextPulseAtMs = combatTimeMs + effectiveOrbitIntervalMs`。新枠を取得した報酬なので待ち状態の既存枠を無料補充することとは分ける。新枠から即pulse・即配置はしない。

位相の第一推奨は**既存phaseOffsetを維持し、新slotだけ最大の空き角の中点へ入れる**方式。現行initの全枠均等配置（63773）を増枠時に再計算しない。DEP/REGENを含む全slotの角を予約済みとして正規化し、wrap区間も含む最大隙間を選ぶ。追加1枠ごとに角集合を更新する。1枠の角0から追加するならslot2=π、slot3=π/2（同幅の空き角は小さい開始角を優先）。均等な120度配置より、強化による既存周回位置の瞬間変化を避けることを優先する提案。最初から3枠を明示resetする旧fixtureの均等配置は別条件として残す。

増枠・再生成完了からTrace startを再送しない。継続中boostの履歴を消さないため、空枠が増えても新予約はない。選択overlayでpauseする通常経路では現在予約を取り消し、時計・残り時間を凍結する。選択後は新しい正常boost開始が必要で、無料再設置・再充填・即連射を出さない。RAM境界試験でpauseなしの増枠を呼んだ場合も、既存予約は同じslotへ保持し追加予約は発行しない。

新副効果のTimerをSceneへばらばらに追加せず、所有runtimeの有限recordを許可時計で更新する。通常Scene更新順・物理step・vendorを変えない。Phase 5の死亡Tween時計差はこの設計のために製品側で修正しない。

## 6. 取得・候補・Lv25・DEEP LEVEL

### 6.1 現行の取得経路と最小接続

【現行コードで確認した制約】現行専用定義は `previewOnly:true / startsUnlocked:false / stages:[]`（skillDefinitions.js:608）。検証ArenaだけでS1を取得させている。以下は将来の限定成長検証へ接続する計画であり、現在通常候補へ出るという意味ではない。

|現行入口|役割と6Bの接続案|
|---|---|
|`buildInitialSkillStates` game.js:41143|実行中機体のskill一覧を使う。検証許可されたUMBRAだけMoon S1、SPIKE/NOVA未取得を構築。標準機/REGALIAの開始武装と通常公開guardは維持|
|`isSkillRuntimeBehaviorImplemented` 44280／`applySkillStage` 44286|canonical専用Stage照合と差分反映を追加。既存orbital処理へ落とさない|
|`getAvailableSkillChoices` 80575／`buildSkillUpgradeChoice` 80630|限定Contextで3IDのUnlock/次Stageだけを候補にする。問い合わせ時に取得・提示済み・Mutation予約を変更しない。S8/無効果候補を除外|
|`buildLevelUpUpgradeChoices` 80137|通常3択、スキル最大2、残りpassiveを維持。通常機体にあるpassive0件時の旧例外も今回変更しない|
|`markLevelUpChoicesPresented` 80169／`prioritizeEvasiveFirmwareChoice` 80531|候補問い合わせと実際の提示を分離。初回通常提示で一度だけEvasive保証、取得は任意。Opening対象外、通常重み3を保持|
|`queueSkillMutationSelect` 36712以降／`buildSkillMutationChoices` 36803|S4 Core→S8 Finalの予約・順序・重複防止を再利用。6Bは未実装カードを出さず、6Cで専用効果と文面を接続|
|`applySkillMutationChoice` 36865／`completeLevelUpCardSelection` 82479|通常Stage適用とMutation決定を分ける。Mutation後の同Stage再適用を破壊しない。二重入力guard維持|
|`gainExperience` 80056／`isXpProgressionCapped` 37807|通常Lv、全候補なし、Deep、Lv99を実コード順で扱う。武装未完成を理由にXP/Deepを新設変更しない|

パッシブ説明はReactor Overchargeが取得済み全武装のrawへ+1、Fire Controlが取得済み各周期の実効値へ作用することを示す。将来カードでも生raw、受付前値、対象固有補正後を混同しない。1枚が3武装に作用しても共通statを3回増やさない。S4/S8は基本Stageの差分チップと、後続Mutation選択があることを別に示す。

### 6.2 選択回数を実コードで数えた結果

【現行コードで確認した制約】1回の通常スキル選択で未取得→S1、またはSを1段上げる。初期statsはLv1/XP0/次XP5。Openingは3回、Lv1→25は24回のpending選択を作る。初回+1 Ticketは候補を3→4枚にするもので取得回数は増えない（41076/41097）。

|到達目標|MOON初期S1|SPIKE未取得|NOVA未取得|通常カード消費|
|---|---:|---:|---:|---:|
|全S4|3|4|4|11|
|全S8|7|8|8|23|
|Opening＋Lv25到達までの供給|—|—|—|3＋24＝27|
|全S8時のpassive等への余白（通常OVERLIMITは6D対象化後だけ）|—|—|—|27−23＝4|

Core/Finalは各武装2回、全体6回の追加操作だが、通常27枠を追加消費しない。`completeLevelUpCardSelection`はMutationの場合、通常pending減算より前にreturnする（82499/82549）。したがって全Stage完成＋6Mutationは29回の選択操作、さらに余白4回を全部使うと33回。最大3枚のカード表示を3回の取得と数えない。

|Lv25までの配分例|passive等の消費|残る武装用選択|結果|
|---|---:|---:|---|
|Evasive1＋AP1＋EN1|3|24|全S8の23を満たし、あと1選択|
|Evasive1＋AP1＋EN1＋Reactor1|4|23|全S8と両立する最小余白なしの例|
|Evasive3＋AP1＋EN1|5|22|全S8に1選択不足|
|Reactor10＋Fire Control6（baselineで160msへ到達）|16|11|全S8に12不足。Fireを無効果のまま10回取得できるとは数えない|
|medium相当の既定passive（AP3/Booster2/EN2/Evasive1）|8|19|全S8に4不足|
|deep相当の既定passive（AP10/Booster5/EN5/Evasive3）|23|4|全S8に19不足|

最後の2行はfixtureを正式ランで逐次購入した場合の選択費用の比較である。fixture自体はRAMで先に与える数値比較条件であり、実ランの到達証明ではない。装備・CD・shopの永続強化はこの27枠を使わない。

### 6.3 Depth1とRelayの差、残る選択制約

【現行コードで確認した制約】D10/D20/D30 Relayも新規Lv1・Opening3回・初期武装から始まり、飛ばしたDepthのXPやStageは付与されない。`continueSortieFromHub`（58931）から武装・statsを新規構築する。D30解放後の通常UIは最新2Anchorを出すためD10カードは上書きされるが、内部D10経路は維持されている。

|開始経路|Lv25までの基本枠|Lv25以降|
|---|---:|---|
|Depth1開始、Depth6以上へ到達|27|Depth≥6かつLv≥25ならDeepが先に選ばれ、残スキルがあっても通常カードが止まる|
|D10/D20/D30 Relay|27|最初からDepth条件を満たす。Lv25後に通常カードを追加取得できる救済はない|
|Depth1～5に留まる経路|Lv25到達までは27|**Lv25のhard stopはない。** Deep未解禁なら通常LvループがLv99まで進み得る。全有効候補が尽きればoverflow。実際に必要XPを得られることを保証しない|

`gainExperience`はLv99 cap→Deep判定→全候補なし判定→通常Lvの順。Depth≥6でLv25へ上がる最後の1回の通常pendingは生成される。その後はDeepのAP成長とOVERDRIVEへ流れる。S8＋Finalを持つ既存装備対象にはDeepでOVERLIMIT bonusの機会があるが、未取得武装のUnlockやS7→S8を救済するものではない。READMEの「Lv25までを基準」を全Depth共通の絶対上限へ読み替えない。

**【今回の提案・未承認】第一推奨は27枠の選択制約を受け入れ、Moon S1開始・SPIKE/NOVA Unlockを維持する。** 全S8と耐久/回避の大量取得が両立しないことを明示し、完成の仕方を選ぶ機体にする。Evasiveは保証提示であって強制取得にはしない。特定武装の取得・強化順は保証しないが、6Bの技能候補が有効Unlock/次Stageだけなら、未完成技能がある間は技能カードが少なくとも1枚出る。任意の技能を選び続ける23回で全S8になる計算であり、抽選順だけで追加回数が必要とはしない。27回のうち23回を技能へ配分することと、実ランでLv25まで生存・XP獲得することは別条件である。

6Dで既存方式の通常OVERLIMIT候補を混ぜると、完成した2武装のOVERLIMITが技能2枠を占め、未完成1武装がその回だけ提示されない場合がある。第一案は既存抽選方式を維持し、この6D固有の制約を完成ビルド試験で数える。未完成武装を優先する抽選変更が必要なら、6Dの別承認事項とする。

|代替案|利点|費用・判断|
|---|---|---|
|序盤の案内でUnlockの選択意義を示す|無料強化なしで誘導可能|第一推奨に含める。自動取得・抽選率変更はしない|
|UMBRA限定RelayでSPIKE/NOVA各S1を無料付与|全S8コスト23→21、Lv25余白4→6|未承認の別案。初期3武装案になり、Relay難度を変えるため今回は採らない|
|選択順の保証や専用の追加成長機会|抽選/未完成を救済できる|未承認。通常機体や共通Lv/XP/Opening回数を変えずに別仕様を要する。6Bへ黙って追加しない|

実装前の判断事項は、4回の自由枠とRelayの序盤を受け入れるかである。debug全S8、deep fixture、上限計算を根拠に通常ランで完成できると結論しない。

【現行コードで確認した制約】RAMで実メソッドのXP閾値更新を順に適用すると、Lv1→25は合計72,996XP、Lv24→25の閾値22,651。Depth1～5で次の32,843XPを得れば通常選択が28回目になる。一方、D10/20/30は次の420XPでLv26に上がっても通常選択は27のまま。これは獲得速度・生存可能性の測定ではない。

Mutationの正確な表示順は「到達瞬間に通常バッチを割り込む」ものではない。`canOpenSkillMutationSelection`（36756）が `pendingLevelUps<=0` を要求するため、Openingや大量XPの通常選択を先に消化し、Core→FinalをFIFOで開く。S4到達後に通常pendingがあればS5以降へ進むこともある。S8を一括指定した場合は未選択Coreを先にqueueする。post-overlay順はMutation→LOST ARMS evolution→OVERDRIVE MOD→EQUIPMENT OVERLIMIT bonus→debug Final Raid→Depth Directive（36921）。Lv25最後の通常カードで予約されたFinalも取り消さない。

Evasiveは表示完了callback `playLevelUpOpenAnimation`（82379）から、現在のoverlay/state世代と可視性を確かめて初回保証を消費する。queryだけで消費しない。見えた後に別カードを選んでも保証は消費済みであり、取得まで毎回保証するものではない。選択lockは `selectLevelUpCard`（82435）が即時に立て、360ms演出後の確定へ進む。検証adapterで確定関数だけを直接連打してこのguardを飛ばさない。非初回で6パッシブすべて有効ならEvasive重み3対他5×1で先頭確率37.5%となる条件があり、常時固定確率ではない。

Relayの初期パッシブは0、Core/Finalは未選択。初期S1以外の無料Stageはなく、保存済みShop/CD/装備の開始能力はStageや選択回数へ換算しない。6B期間のS4/S8カードは「基本成長のみ／Mutationは6C接続待ち」と明示し、直後に実効果付きMutationを選べるような文面にしない。

## 7. 威力・時間補正を一度ずつ適用する設計

### 7.1 現行の所有関係

**【現行コードで確認した制約】** 現在の専用3攻撃は生rawを既存damage受付へ渡す。Mutation/TRIAD/攻撃装備は未接続。下表の既存汎用helperをすべて直列に足せばよいという意味ではない。

|段階|実在する所有者／現行処理|専用3武装への第一案|
|---|---|---|
|Stage基礎|専用Stage1 getter:80191/80242/80297|canonical現在Stage resolverへ移す。基本24行は一箇所だけ|
|Reactor Overcharge加算|RawDamage:80195/80246/80301。基礎＋max(0,bulletDamage−1)|同じ加算を1回。装備や永続ATKをここに入れない|
|Core/Final/TRIAD|`getSkillMutationDamageMultiplier` 36216。既存Core×Final×TRIADをClamp0.72～1.9。`getMutatedSkillDamage` 36265がround/min1|専用3IDだけprofile/context分岐し第4節の係数を計算。既存汎用係数をさらに掛けない。外側でもTRIADを掛けない|
|OVERLIMIT|`applyRunEquipmentSkillOverlimitDamage` 14856。×1/1.10/1.20後round|次の装備helperが内包するので単独に先掛けしない|
|ARMAMENT|`applyRunEquipmentPlayerSkillDamageBonus` 15385。OVERLIMIT後に装備倍率を掛けround/min1|private実行対象だけ許可する6Dでここを1回通す。保存側IDは拡張しない|
|永続/CD/機体|`applyPermanentUpgradesToStats` 29158、CD/機体合成13477等で`stats.damageMultiplier`を構築|受付まで掛けない。永続weaponLvは1＋Lv×0.06、CDのATK+0.10/+0.06は加算、最後に機体倍率。CDを別々の乗算にしない|
|共通受付|`scalePlayerDamage` 30231、`applyDamageToEnemy` 74131|攻撃値×stats.damageMultiplier×OVERDRIVE。Support hold等の拒否を維持。`damageAlreadyScaled`を立てない|
|対象補正/HP|vulnerable1～1.5→Hunter→Support flag時だけSupport Link→hp減算（74153～）|専用攻撃はSupport flagなし。HP小数を保持、撃破/dropの既存経路を使う|

【現行コードで確認した制約】汎用MutationはAssault主1.12/強対象1.16、Control主0.94/0.98・周期1.04、Reactor主1.04/稼働中1.14・周期0.96/0.88、Executionは強対象1.14またはBoss系1.22＋追加Bolt、Prism主0.96・周期0.94＋最大3分岐、Singularity主1.04＋damage Area Pulseを持つ。**これらはUMBRA新案の値ではない。** 新IDを既存一般分岐へ流すだけでは、第4節のカードと実効果が一致しない。

### 7.2 提案式とsnapshot

**【今回の提案・未承認】** `R`を加算済み生raw、`C/F/T`を専用Core/Final/TRIADとする。

```text
R = Stage基礎 + max(0, bulletDamage - 1)
M = clamp(C × F(target) × T(target), 0.72, 1.9)
A = max(1, round(R × M))                        // 攻撃値、受付前
E = max(1, round(round(A × OVERLIMIT) × ARMAMENT)) // 装備helper内部の順
D = E × stats.damageMultiplier × OVERDRIVE × vulnerable × Hunter
```

S1未選択・装備未接続・TRIAD未成立の経路では中立倍率を使い、現在のrawと受付結果を維持する。現在rawは整数なので中立roundを追加しても同値だが、将来加算を小数化する場合は別途境界確認が必要。専用profile分岐は汎用helperの「Core/Final未選択なら1」の早期returnより前に置く案とする。6Dでは、他2武装で成立したTRIADが取得済みのS1武装にも用途に応じて効くことを専用対象契約として確認する。旧武装の早期returnは変更しない。

Prism副次は、同じ生raw/profileから**その副対象に対して**Aを一度作り、`B=max(1,round(A×branchRate×TRIAD_PRISM))` を装備helperへ渡す。主のAやHP損失を新たに `getMutatedSkillDamage` へ入力しない。Prism Finalの主倍率は本案では1で、Execution Finalとは同時選択しない。混成TRIADの強対象補正は副対象の実状態で判定する。branch×TRIAD_PRISMはこのBでだけ適用し、装備helper側で再適用しない。同lifeへ別親から副攻撃が重なる場合も、それぞれのattackId予算内でB→装備→受付が各1回で、倍率を前回damageへ累積しない。

`raw`、`A/B/E`、`D（拒否されなかった場合の計算damage）`、`hpBefore−hpAfter`、`min(max(hpBefore,0),正のHP差)`による実効HP損失を診断で分ける。表示用 `damageBeforeTargetModifiers` を実ダメージの入力へ使わない。HPが3しかない敵へD=10なら、生のHP差10と実効損失3を別に記録する。

攻撃が所有するStage/raw/Core/Final/TRIAD係数と装備/OVERLIMITは、Moonでは新しい受付評価、SPIKEではcast生成、NOVA周回では正規pulse、DEPでは配置確定でsnapshotする。既存cast/DEPへ後のStage/Mutation/他武装TRIAD完成/OVERLIMIT取得を遡及しない。敵の生存・強対象・LOSと受付側OVERDRIVE/Hunter/vulnerableは現在の受付時点で評価する。これは「生成済み攻撃の攻撃性能固定」と「既存受付の共通一時倍率」を分ける設計。

### 7.3 時間の所有と下限

**【今回の提案・未承認】** 現在のq補間を維持し、6C/6Dで該当する周期だけを後段補正する。

```text
q = clamp((stats.fireInterval - 160) / 380, 0, 1)
T0 = max(floor, round(floor + (Stage基本周期 - floor) × q))
T = max(floor, round(T0 × 専用REACTOR周期係数 × SENSOR))
```

Fire Controlは共通fire statを1取得につき70減らし160で止める。**現在の装備未接続fixture**ではbaseline/mediumは6回、deepは5回でfire160に達する。6C/6Dでは取得済み全武装の最終Tの差を見て、無効果ならこれより早く候補終了させる。例: mediumのFire5でfire163、T0のNOVA305/202にSENSOR0.96を掛けると300/200のfloorに達し、全武装が下限なら6回目は無効果である。Reactor周期とSENSORの間に追加roundを入れず、最終roundは1回。`getRunEquipmentAdjustedSkillIntervalMs`に浮動小数のCore後値と武装固有floorを渡す案に対応する。

|時間|対象補正／下限|更新時刻・既存待ち|
|---|---|---|
|Moon再命中|q→Moon Reactor0.9→SENSOR→200|lastHitAtは保持、次の正当な進入で新T。独立deadlineを新設しない|
|SPIKE再発動|q→SPIKE Reactor0.9→SENSOR→500|既存nextCastAtMs保持、次castを作った後の待ちから|
|NOVA周回pulse|q→SENSOR→300（本案Reactorは掛からない）|現在nextPulseAtMs保持、次の正規pulse後から新待ち|
|NOVA残留pulse|q→SENSOR→200|配置時に固定。生成済みDEPの間隔変更なし|
|NOVA残留期限|3000未満、周期短縮なし|配置時。期限処理をpulseより先に行う|
|NOVA再生成|基本1200、Reactorのみ1000、下限1000|配置時snapshot。既存regen期限は引き寄せない|
|設置安全間隔/距離|800ms/120px固定|Fire/SENSOR/Mutation/TRIADで短縮しない|
|SPIKE空探索|150、専用Reactorのみ100|既存探索待ちは保持、次の失敗探索から。SENSOR対象外|
|Mutation ICD|Moon Prism600/field750、NOVA Prism共有500等|短縮なし。選択・pauseで0へ戻さない|
|制御field|第4節のTRIAD用途別補正だけ、個別cap|生成時固定、許可時計、期限未満|
|演出時間|Moon800、SPIKE800/impact200、NOVA8コマ8fps、既存雷撃/再生成収縮|攻撃周期補正を掛けない。開始済みFXは完走|

【現行コードで確認した制約】`getCurrentPlayerFireInterval`（38025）はbasicSkill固定でOVERDRIVE連射0.88・汎用Mutation・SENSORを内包する。専用qの前処理に流用しない。現専用3周期はOVERDRIVE連射0.88を通らず、今回も新たに入れる案にしない。OVERDRIVEのdamage1.15は現時点でも受付で効く。汎用contactの70ms下限（36269）を専用攻撃へ持ち込まない。

### 7.4 TRIAD・装備のRAM対象と保存境界

【現行コードで確認した制約】戦闘slot registry（game.js:302）にはUMBRA3IDがあるが、Mutation対象map（308）は既存2機体だけ。**Archive用ID（313）はそのmapから自動導出**される。そこへUMBRAを追加するだけの実装は保存allowlist拡張になる。COMBAT LINK固定3ID（2026）もruntimeとArchive正規化で共用し、REGALIA砲さえ現装備対象ではない。

**【今回の提案・未承認】** `getSkillMutationTargetSkillIds`（35124）と装備の実行対象判定に、許可されたUMBRA実行Context専用の3IDを別registryから返す分岐を設ける。保存用 `getAllSkillMutationSkillIds`（35135）、Atlas2機体（472）、Archive正規化（32450）、クラウドallowlistは変更しない。通常公開判定も維持。REGALIA砲を装備対象にする変更は混ぜない。

TRIAD純計算は `resolveTriadMatrixAxis`（35608）、`buildTriadMatrixCombatModifiers`（35678）、`createTriadMatrixSnapshot`（35734）を再利用する。2同種はLINK I、3同種または3種類1つずつでMATRIX II、2:1はLINK I。Core/Finalの両方IIで完成buildという集計は維持する。

|TRIAD軸|LINK I／MATRIX IIの既存値|UMBRAで一度だけ適用する先|
|---|---|---|
|Assault|damage1.04／1.08|AのT|
|Control|制御1.06／1.12|減速量とduration。既存helper内包分を重ねない|
|Reactor|OD/Robotゲージ1.06／1.12、DASH EN drain0.97／0.94|既存ゲージ・消費の用途別入口のみ。Core自身からEN効果を追加しない|
|Execution|強対象damage1.06／1.12|AのT、Prism副は副対象判定|
|Prism|副damage1.08／1.15|Bだけ、分岐数は増やさない|
|Singularity|field値1.06／1.12|field半径/寿命だけ。主半径、pulse、NOVA保有枠は増やさない|
|Trinity混成|damage1.03、control1.05、ゲージ1.05、drain0.97|各所有箇所に1回|
|Adaptive混成|Execution1.05、Prism1.06、Singularity1.06|各用途へ1回|

**6D承認時に確認する境界:** 既存TRIAD Reactor/Trinityを有効にすれば、基本EN設定が同じでも選択中のランには上表の消費補正が生じる。これはAir Brake tunedやUMBRA基礎ENを再調整することではなく、既存TRIADの戦闘効果を新3IDで成立させる別の効果である。全回復・新規無敵・Core由来の追加EN倍率は付けず、既存用途別helperへ一度だけ渡す。ユーザーがこの連動まで承認する前に有効化しない。

保存隔離は「通知OFF」だけでは成立しない。`startTriadMatrixRun`（35486）はAtlasをloadし、`refreshTriadMatrixSnapshot`（35783）はnotify:falseでもAtlas進捗を更新する。`shouldBlockMutationAtlasPersistence`（35512）は現状debug/Final Raid条件のみ。検証では純RAM初期化を使い、refreshの保存側の葉も明示して遮断し、Storage/Network guardで0を検証する。Atlas状態を読んでから書込みだけ止める方式にしない。COMBAT LINKもrun snapshot/OVL選択だけRAMで作り、既存保存正規化へUMBRAを渡さない。

## 8. S1／S4／S8の机上比較

**【今回の提案・未承認】以下のS4/S8は本書の仮Stageを式へ代入した値。ブラウザ実測・実ラン到達・人間のバランス合格ではない。** 既存fixtureの能力合成は既存pure計算をRAMで実行して確認し、提案部分は同じ丸め位置による限定計算を行った。保存・通信呼出しは0。短い小数は表示上丸め、原式を併記する。

### 8.1 現在のfixtureの意味

|条件|Shop/CD/装備|bullet／fire|共通damage倍率|SENSOR／ARMAMENTの装備値|専用攻撃の現在の適用|
|---|---|---|---:|---|---|
|baseline|shop0、anju、装備なし|1／540|1|1／1|共通倍率だけ|
|medium|shop10、anju/hanseikai/miraiwoikiteru、5部位SR★3・精錬5|1／513|1.6|0.96／1.186|装備の攻撃2倍率は未適用|
|deep|shop25、CD全所持、5部位LEGEND★5・精錬20|1／482|2.66|0.9075／1.42|装備の攻撃2倍率は未適用|

根拠: umbraDriveFixtures.js:5/99/161。medium fire=`540×0.95=513`、deep fire=`round(540×0.94×0.95)=482`。deep damage=`1+25×0.06+0.10+0.06=2.66`。装備の品質点はSR★3=13、LEGEND★5=25。SENSOR=`1−(点×0.0025＋精錬×0.0015)`、ARMAMENT=`1＋点×0.012＋精錬×0.006`（equipmentDefinitions.js:793/836/890/931）。

medium/deepとも攻撃Reactor/Fire Controlは0、TRIAD/OVERDRIVE/Robot/Support/Deep CDなし。deepの装備なら別途COMBAT LINK IIの条件を満たし得るが、このfixtureはCOMBAT LINK snapshotをcaptureせずOVERLIMIT未取得。これを「実効最大装備込みのUMBRA火力」と記載しない。

### 8.2 基本Stage＋既存補正だけ

表のdamageは共通倍率までの**1対象・1受付の計算値**で、敵補正・拒否・過剰ダメージを含めた実HP損失ではない。Mutationと将来の装備対応はまだ入れない。

|武装／項目|S1 無補正／medium／deep|S4 無補正／medium／deep|S8 無補正／medium／deep|
|---|---|---|---|
|Moon damage|4／6.4／10.64|7／11.2／18.62|12／19.2／31.92|
|Moon再命中ms|750／711／666|725／688／645|650／618／581|
|SPIKE damage|5／8／13.3|5／8／13.3|5／8／13.3|
|SPIKE再発動ms|1800／1708／1602|1800／1708／1602|1800／1708／1602|
|SPIKE半径|80|110|160|
|NOVA周回damage|2／3.2／5.32|2／3.2／5.32|3／4.8／7.98|
|NOVA残留damage|3／4.8／7.98|3／4.8／7.98|3／4.8／7.98|
|NOVA周回ms|900／857／808|900／857／808|900／857／808|
|NOVA残留ms|500／479／454|500／479／454|500／479／454|
|NOVA総枠|1|2|3|

SENSOR接続後の一例は、mediumのS1/S4/S8 Moonが `round(711/688/618×0.96)`＝683/660/593ms、deepでは `round(666/645/581×0.9075)`＝604/585/527ms。これは**6Dの提案値**で、現fixtureの既存実効値と別列である。周期floorは最後に適用する。

### 8.3 Reactor Overcharge3＋Fire Control2

baselineへパッシブを各3回/2回適用する仮比較。bullet4、fire400、q=12/19。Core REACTORとは別。計5選択を使うため、この配分のまま全S8をLv25までに完成させる予算は1回不足する。

|武装|S1 raw／周期|S4 raw／周期|S8 raw／周期|
|---|---|---|---|
|Moon|7／547|10／532|15／484|
|SPIKE|8／1321|8／1321|8／1321|
|NOVA周回|5／679|5／679|6／679|
|NOVA残留|6／389|6／389|6／389|

Fire Control下限ではMoon200、SPIKE500、NOVA周回300/残留200。Reactor CoreやSENSORを重ねてもこのfloorを割らない。特にMoonは短い周期になっても実際の離脱と新進入が必要で、floorの逆数を実DPSにはしない。

### 8.4 Core/Finalの代表差

無補正・パッシブ0・TRIAD/装備なしで比較する。S1にCore/Finalはない。S4ではCoreだけ、S8ではCore＋Finalを適用可能とする。

|例|Moon|SPIKE|NOVA周回／残留|
|---|---|---|---|
|S4 Assault|raw7→round8.75=9|5→round6.25=6|2→3／3→4|
|S4 Control|主7、slow420ms|主5、slow600ms|主2/3、slow250ms|
|S4 Reactor|待ち725→653ms、外縁76→72|1800→1620ms、空探索100|主2/3のまま、次配置regen1000|
|S8 Assault＋Execution・強対象|12→round18.75=19|5→round7.8125=8|3→round4.6875=5／5|
|S8 Assault＋Prism・副対象1体|A=15→round(15×0.35)=5|A=6→round(6×0.40)=2|A=4→round(4×0.40)=2／2|
|S8 Reactor＋Singularity|待ち650→585、外縁78、field90/600|周期1620、field160/1000|regen1000、DEPだけfield80/残留期限|

小さいrawでは整数丸めの影響が大きい。例えばNOVAの35%ではなく本案40%分岐でも、A=4の40%=1.6が2になる。カードに百分率だけを出して厳密なHP比と誤認させず、現在の実効攻撃値を併記する。Controlはdamage増なしでも実制御があり、Reactorは周期floor時に残る余白・再探索・regenの差を示す。

### 8.5 強くなりやすい乗算と副攻撃

上限寄りの**未承認・RAM仮構成**: 仮S8、Reactor Overcharge10、shop25/CD全所持（共通2.66）、5LEGEND★5/精錬20、OVERLIMIT II取得、3Assault/3ExecutionのTRIAD II。専用主係数1.25×1.25、TRIAD1.08×1.12で合成1.89（cap1.9以内）。現UMBRAに未接続の効果を含む。Deepデフォルトではなく、23Stage＋Reactor10だけでも27枠を6回超えるためLv25通常完成runの例ではない。

|S8主1受付|生raw|Mutation round|OVL round|ARM round|共通2.66後|さらにOD1.15|さらにHunter Boss1.25|
|---|---:|---:|---:|---:|---:|---:|---:|
|Moon|22|42|50|71|188.86|217.189|271.48625|
|SPIKE|15|28|34|48|127.68|146.832|183.54|
|NOVA周回|13|25|30|43|114.38|131.537|164.42125|
|NOVA残留|13|25|30|43|114.38|131.537|164.42125|

Hunter ModeはOVERDRIVEがactiveなだけでは得られない別取得条件で、一般高HP判定もMutationと異なる（game.js:37365）。vulnerable1.5が同時に成立する別条件なら271.48625等の1.5倍だが、現在のfixtureや各敵へ常時成立する前提にしない。NOVAの表を3枠×常時残留×逆周期で実DPSへ変換しない。

別の最大分岐寄り構成は3Assault/3Prism。主の合成は1.25×1.08=1.35で、Prism副係数1.15は副だけに掛かる。上と同じraw/装備/共通/OD条件（Hunter/vulnerableなし）で:

|副1受付|生raw→副対象向けA|branch×TRIAD後round|OVL→ARM|受付計算damage|イベント予算|
|---|---|---:|---|---:|---|
|Moon|22→30|round(30×0.35×1.15)=12|14→20|61.18|最大2別敵/boost、共有ICD600|
|SPIKE|15→20|round(20×0.40×1.15)=9|11→16|48.944|主試行対象を除いた最大2敵/cast|
|NOVA|13→18|round(18×0.40×1.15)=8|10→14|42.826|1別敵、全slot共通ICD500|

最も注意するのは、Moon単発の乗算、SPIKEの敵密度と半径、NOVAの3枠×Fire下限にPrismを重ねた受付数である。3Control/3Singularityの最大制御例では、Moon域100.8/672ms、SPIKE域179.2/1120ms、NOVA域89.6/DEP期限まで。SPIKE主slowは0.75→0.72、600→672ms。Coreとfieldをさらに掛け算して敵を停止させない。damage・control・分岐の完成形を一つの最大状態に同時成立させない。

### 8.6 実DPSと切り離した操作モデル

Moon: 10秒間に条件を満たす通過を同敵へ4回成功させたという**仮定**なら、無補正のS1/S4/S8の合計は16/28/48。停止しているだけなら0。各通過は離脱外縁・再進入・LOS・間隔を満たす必要があり、この4回を実測回数とは記載しない。再命中が200msでも50回成功するという意味ではない。

SPIKE: 1cast単体はS1/S4/S8とも5。もしそれぞれ2/3/5体を巻き込めたという独立の配置仮定なら合計10/15/25だが、巻込み数はR²から算出していない。同じ中心、敵数、座標、現在shape/LOSで2/3/5になるかは6Bで実測する。S8半径の面積4倍だけをもって20damage/対象とはしない。

NOVA: `[0,6000)` の許可戦闘時刻で、t=0に各仮Stageの総枠がORBITING、初pulseはinterval後という**比較用初期状態**を置く。正常配置確定を1000/2000/3000msで試みる。各boostは別開始、開始点は(0,0)/(200,0)/(400,0)、800ms間隔・120px距離を満たし、障害物なし・十分なEN・各pulseに生存対象がいる仮定。枠がない試行は失敗し同boostで復活しない。S4/S8を実ラン開始から無料所持する仕様ではない。

|slot|設置前の周回pulse（基本900）|DEP pulse（基本500）|expiry→regen完了→次orbit|
|---|---|---|---|
|1|900|1500,2000,2500,3000,3500|4000→5200→6100（観測外）|
|2（S4以降）|900,1800|2500,3000,3500,4000,4500|5000→6200→7100（観測外）|
|3（S8）|900,1800,2700|3500,4000,4500,5000,5500|6000→7200→8100（観測外）|

|仮Stage|基本 周回/DEP pulse数|基本raw合計（全pulse成功仮定）|Reactor3/Fire2 周回/DEP数|同raw合計|
|---|---|---:|---|---:|
|S1・1枠|1／5|1×2＋5×3＝17|2／7|2×5＋7×6＝52|
|S4・2枠|3／10|3×2＋10×3＝36|4／14|4×5＋14×6＝104|
|S8・3枠|6／15|6×3＋15×3＝63|8／21|8×6＋21×6＝174|

Reactor3/Fire2はpulse679/389ms。slot1は679msに周回、DEPは1389～3723の7pulse、4000～5200は無攻撃、再生成後の初回は5879。基本500msは期限未満で5pulse、389msでは7pulse、下限200msでは14pulse（15発目は3000ms期限と一致し不成立）。下限周回300msで同じ6秒列ならS1/S4/S8の周回数5/11/20、DEP14/28/42。この数は実Sceneの欠落/catch-up省略、LOS、対象消滅、pauseを入れていない上側の予定数である。

Core REACTORのregen1000を選ぶ別例では、基本周期でもslot1が5000で戻り5900に1回周回できる。一方、DEPにいる1000～4000とregen中はslot1の周回火力を失う。全枠を常時DEP状態とするモデルは使わない。Stage途中増枠の実試験では第5節どおり追加時刻から初回待ちを始め、この比較用t=0へ時計を戻さない。

## 9. 最小接続箇所とPhase 6B～6D

### 9.1 現行ファイルへの接続地図

**【今回の提案・未承認】** 行番号は本書着手時のhashに対応する。後続で増行したら関数名を基準に照合し直す。以下は変更予定であり、今回変更したファイルの一覧ではない。

|ファイル／現行箇所|必要な限定接続|保護するもの|
|---|---|---|
|skillDefinitions.js:608/624/638/659、Mutation metadata:691以降|承認した24Stageと専用Core/Final文面。S1 objectは1つにしverificationStage1と共有|素材パス/metadata、既存武装ID・Stage、公開guard|
|game.js:13365/41143/41180/44280/44286/81289/81302|限定成長Contextの取得照合、初回のみ生成、専用Stage差分反映|通常機体のavailability、通常HANGER、既存orbital|
|game.js:63733/63765/64582、80191～80331|共通currentStage resolverと専用性能getter|S1無補正、固定値、取得していないruntimeが作動しないこと|
|game.js:64639/64694/64738|Moon geometry rebase gate、前回適用profile、親予算|life/cursor/pass/history、Trace除外、通常移動/EN|
|game.js:64324/64346/64412|SPIKE次cast profileとimpact後の有限副効果|旧cast/attempted/200ms/nextCastAtMs|
|game.js:63773/63940/63988/64112、Depth:63884|NOVA増枠差分、配置profile、次pulse、親予算|slotId/deadline/既設置/初回物理予約/Depth持越し|
|game.js:35124/36216/36246/36265/36803/36865|ラン用Mutation対象、専用係数・カード・選択適用|旧汎用Mutation、保存対象map、既存pending順|
|game.js:68771～68781|専用制御寄与がある場合だけ既存総合slowと合成|旧敵移動の積、プレイヤー移動、物理設定、既存効果の期限|
|game.js:14648/14856/15367/15385/35124/35486/35734/35783|6DのRAM TRIAD/装備対象・一度の係数適用・保存葉の明示遮断|保存normalizer/Atlas/Archive/クラウドallowlist、REGALIA装備対象|
|game.js:80137/80169/80372/80575/80630/82379/82435/82479|実効差分カード、query/提示/選択の分離、S4/S8の順序|Evasive重み/初回保証、Opening回数、旧候補例外|
|umbraDriveFixtures.js:40/99、umbraDriveRuntime.jsのmethod許可一覧|専用成長Contextに限り必要な取得/計算methodを明示借用|create/save/load/purchase/auth等を導入しない|
|umbraMoonlightArena.js:260/287/370/417/591|resetと成長操作を分離、同castの範囲表示、slot/選択の表示|既存R/fixture切替、FX OFFで同じ攻撃、旧S1入口|
|README.md／docs／既存tests/umbra-*.test.cjs・browser系|承認Phaseごとの使い方と限定試験を追加|過去報告・失敗raw・ソースhash付き証跡|

新helperは、現在Stage resolver、専用Stage反映、Moon geometry rebase、NOVA容量調整、専用profile計算、有限secondary dispatcher、制御field updater/slow合成程度に分ける。武装ごとに新Scene・物理world・27武器classを作らない。定数は専用設定へ置き、既存巨大関数への無制限な追記を避ける。

### 9.2 Phase 6B — 基本Stageと取得・強化だけ

|項目|計画|
|---|---|
|前提|本書の24値、初期Moon S1、NOVA S4/8増枠、状態引継ぎ、選択制約に対するユーザー承認。Phase 5完成hashを開始比較基準として再記録|
|対象ファイル|game.js、skillDefinitions.js、必要な範囲のumbraDriveFixtures.js/umbraDriveRuntime.js/umbraMoonlightArena.js、既存testsとREADME/新報告。index.htmlは現入口を再利用し、原則変更不要|
|実装|canonical Stage、Unlock/Upgrade、実効差分カードとHUD、3guard/resolver、Stage差分反映、Moon再離脱gate、SPIKE snapshot、NOVA差分枠。現隔離試走に成長操作だけを加える|
|実装しないもの|Core/Final実効果・無効果カード、TRIAD/攻撃装備の新対象、通常公開/購入/保存、Lv/XP/Opening変更、遅延・角修正|
|S4/S8の暫定扱い|画面は「基本Stage成長のみ／Mutationは6C接続待ち」。未実装Mutationカードを出さずselected/queuedを偽装しない。専用RAMのdeferred milestone（skillId/phase/到達順）だけ記録し、通常pendingを止めるqueueへ無効項目を入れない|
|6Cへの接続|6C有効化時の限定fixtureで未選択milestoneを既存queueへ一度だけ接続。各skillのCoreがFinalより先、到達順FIFO、通常pendingが先。新しいブラウザrunは新規fixtureとして作り、6B状態を保存・復元しない|
|テスト|24Stageの値/差、23回の技能選択、4/5passive配分、Lv25/Relay、query/提示/二重入力、強化中のcast/slot/life保持、S1旧比較、通常2機体/保存隔離|
|人間確認|S2/3など小さい成長の納得感、SPIKE地面の80/110/135/160、NOVA増枠と既存待ち、カード可読性。少なくともbaseline/mediumで操作条件を記録|
|完了条件|基礎成長の実効果と説明一致、状態保護・隔離の必要試験が通り、未確認を残した独立報告がある。人間確認前は操作感の最終合格にしない|
|停止条件|承認値と実効値不一致、同敵の無料再hit、旧cast変化、枠無料補充、保存/API接触、既存機体差分が出たら範囲内で原因を切り分け報告。6Cへ自動で進まない|

### 9.3 Phase 6C1 — Core、6C2 — Final

第一推奨はCoreとFinalを分ける。制御所有・時計を先に確認してから、Prismとfieldを追加するため。

|項目|6C1 Core|6C2 Final|
|---|---|---|
|前提|6BのStage/状態保持を確認し、Core仮値・slow合成とNOVA再生成1000に承認|6C1基準とFinalの有限予算/非damage field/表示の承認|
|対象ファイル|game.js、skillDefinitions.js、既存Arena/必要なmethod adapter、既存tests、docs/README|同左。既存画像の加工・追加依存は不要|
|実装|Core3×3実効果、専用倍率分岐、独立期限slow record、Core選択pauseと再基準化、専用カード色|Final3×3実効果、有限secondary、6field上限とmembership、親消費履歴、Core＋Finalの27形態の合成表示|
|実装しない|新TRIAD/装備対象、Finalの偽カード、EN/AP/無敵等のCore付与、保存・通常公開|TRIAD/装備の新対象、damage付きfield化、追加枠/連鎖の無制限化、通常公開/保存|
|未実装選択の扱い|Coreは既存FIFOへ接続。Finalは専用deferredに留めselected/queuedを偽装しない|deferredを一度だけ正規queueへ。Core未選択Finalを先に出さない|
|テスト|各Core単体、low raw丸め、周期floor、slow独立期限、同StageMutation再適用、選択pause/旧deadline|27形態を個別純数値/状態試験、主副attackId/予算/LOS/拒否/再帰0、既存cast/DEPの旧profile、代表3武装と視認性|
|人間確認|色だけでなく実際に何が変わったか、NOVA待ちとMoon離脱余白、SPIKE再探索の説明|Execution/Prism/Singularityの役割差、敵予兆/機体中心が読めるか、最大3基とfield/分岐が重なる場面|
|完了条件|Coreの説明・数値・実制御が一致、基礎Stageと既存機能を保持した報告|27形態の個別効果、代表併用、有限上限、状態保持を確認した報告。全729併用の同一重み実測を条件にしない|
|停止条件|旧武装へ係数漏れ、Coreで基礎EN/移動差、slow延長漏れ等を解決/報告して停止|副再帰/拒否迂回、期限漏れ、無制限object/対象、視認性崩れを解決/報告して停止。6Dへ自動進行しない|

### 9.4 Phase 6D — TRIADと装備の統合

|項目|計画|
|---|---|
|前提|6Cの基準確定。専用3IDのTRIAD戦闘対象化、既存TRIADのEN/ゲージ連動、SENSOR/ARMAMENT/OVERLIMIT、一度の丸め順を承認|
|対象ファイル|game.js中心、既存private fixture/runtime/Arena、既存tests、docs/README。equipmentDefinitions.jsの旧値・保存schemaは維持する第一案|
|実装|戦闘専用ID registry、純RAM TRIADとrun装備snapshot/OVL選択。Core/Final/TRIAD→OVL→ARM→受付の所有統一。全武装の最終周期差でFire無効果候補を除外|
|実装しない|Atlas/Archive/クラウドallowlist拡張、REGALIA砲の装備対象化、通常販売/保存、基本EN再調整、過去の遅延修正|
|テスト|LINK I/II/混成、target依存、TRIAD×副攻撃×OVL×ARM丸め、period/regen/ICD区分、run snapshot不変、通常OVLとFinal/Deep bonus順、未完成技能の提示競合、Storage/Network0|
|人間確認|代表完成形と未完成耐久配分、SENSOR下限カード、同じ敵配置で3枠/分岐/fieldの可読性、TRIAD Reactorの既存EN差を選択なしの基礎値と分けて確認|
|完了条件|同条件の代表機能・有限負荷測定、基礎S1/旧機体回帰、保存隔離を通した独立報告。上限机上構成と実ラン配分を分けて評価|
|停止条件|二重倍率、武装floor割れ、TRIAD更新で保存load/write、装備で既存DEP値の遡及、旧機体の意図しない差があれば公開せず原因と最小対応を報告。Phase 7へ自動で進まない|

Phase 7以降の通常HANGER、購入、Atlas、Archive、Google保存等は別承認。販売方針がREADMEに存在しても、今回の成長設計を通常公開や所有保存実装の許可とは扱わない。

## 10. 後続検証の分け方と既知課題

### 10.1 既存基盤へ足す重点試験

**【今回の提案・未承認】** 全Stageや全形態を同じ重さの実ブラウザ試験へ増殖させない。既存pure、専用browser、比較ハーネスを目的別に延長する。

|層|対象と条件|成功条件・残す記録|
|---|---|---|
|純数値|24Stageの全値・隣接差、S1不変、Core/Final27形態、代表TRIAD/装備/floor|生raw/A/B/E/受付計算、丸め順、無効果Stage/カード0、保存呼出し0。低raw、閾値±1、Fire163→160も含める|
|取得・選択状態|query反復、表示前破棄、初回Evasive提示後別選択、1/2/3＋pointer二重入力、通常pending中S4/8、直接S8指定|queryの副作用0、1選択1効果、Core→Final/FIFO、通常27枠とMutation6を別カウント、6B未実装フラグ0|
|成長状態|Moon内側でR拡大/余白減少、敵warp、SPIKE生成直後とimpact直前、NOVA全枠regen/予約中/長押し中の増枠|life/cursor/pass/lastHit維持、radiusだけの新hit0、cast snapshot完全一致、新slotだけ増加、旧deadline同値、再呼出し冪等|
|Mutation状態|ICD待ちで最初のMoon成功、同step複数主、拒否/撃破/reset再入、Prism主全試行除外、field満杯|同親再試行0、副深さ1、各予算内、HP差と拒否を維持、古いownerから新runへ配送0|
|制御所有|.75/600の主slowと.85/1000のfield、field6敵の入替え、LOS/範囲離脱、Death/Depth/pause|600後に.75が残らずfieldだけ、field所属は各≤6、削除は所有寄与のみ、旧slowの元期限・積は不変|
|実body機能|30/60/120制御Scene、固定60物理、円/矩形のR±境界、wall/corner、normal/glide/Air Brake、同生存敵再hit|実速度ではなく有効Trace条件を使用。幾何と時計の旧契約、主SPIKE複数命中、NOVA1boost1基/3000未満/regen初回待ち|
|代表併用|単体9形態×3の各効果を純/限定実bodyで確認後、3Assault/3Execution、3Assault/3Prism、3Control/3Singularity、Reactor混成を選抜|27個別効果＋代表併用。9³=729を等しく大規模ブラウザ化しない。枠数/主副/制御object別の上限記録|
|表示|S1/S4/S8、画像/簡易/FX OFF、3枠、広いSPIKE＋field、狭い画面、実カード/Mutation|FX OFFでも同じ主副判定。castと地面R一致、旧FX完走、8矩形/pivot/scale不変、HUD/敵予兆/機体中心の視認性|
|回帰・隔離|標準機/REGALIA、UMBRA各武装未取得、通常入口、run終了/fixture切替、Storage/API guard|旧係数/移動/EN/無敵/保存キー/公開制限維持。必要な通常入口確認もfresh隔離Contextで行い実セーブは使わない|
|負荷（6D）|16/128体、同座標/入力/カメラ/時間、なし/旧2/3武装/代表最大構成を直列。再現時のみ512を追加|同じattack/FX/診断条件で比較。CPU stepとrAF間隔を分離、初回/反復、外れ値・100ms以上・object/Timer/listener・受付数を残す|

副効果は有限でも、実装によりobject/文字列化/敵走査が増える。負荷測定を機能snapshotの大量採取と同時に行わず、巨大JSON保存・画面取得は測定区間外へ置く。必要なら同条件でsnapshotだけ/FXだけ/HUDだけを1要因ずつ変える。描画OFFで攻撃を止めない。CPU呼出時間からGPU待ちを推定せず、短時間のp99や外れ値除去で性能合格としない。

### 10.2 過去結果を維持する

**【Phase 5で実装・確認済み】** Phase 5報告に、元の全63比較の移動/EN/Evade/通知row一致、元条件54/63全項目一致と敵あり9差分、combat-alignedの18run/9比較一致を別々に記録済み。元9差分は死亡TweenのDate.nowとScene/物理時計の混在による描画破棄frame・診断件数差で、HP/旧武装命中が悪化したという測定ではない。combat-alignedはテスト条件であり製品時計の変更ではない。

|既知課題／過去資料|引継ぎ方|
|---|---|
|Phase 4のGame.step最大800.3ms、Phase 3の565.3ms|範囲が異なるため悪化率/改善率を計算しない。Phase 5通常rAFの100ms以上0を全過去条件の解消としない|
|角の保守除外・角脱出の断続失敗|現S1基準として保持。成長やMutationで除外経路を有効化せず、悪化時に同条件比較。今回の人間確認で解消済みにしない|
|同期Game.stepとrAF|前者は制御機能比較、後者は通常更新の性能。Scene更新回数・物理step回数・実時刻を別記|
|Scene/物理とTween壁時計|死亡表示frameの厳密比較は時計条件を明記。元条件とcombat-alignedの双方を保ち、vendorや通常時計は変更しない|
|巨大run配列/巨大assert差分|既存1ペアずつ比較＋限定path/value表示を使う。Phase 5の全99raw/停止記録を残し、全runを同時展開しない|

再利用する主な証跡は `.tmp_umbra_phase5/baseline-parity/`、`parity-offline-audit/`、`parity-final/2026-09-06T10-57-46-845Z-nova-baseline-parity-report.json`、`performance-final/nova-performance-1788692230985.json`。既存比較器 `tests/umbra-nova-baseline-parity.cjs`／`tests/umbra-nova-parity-offline.cjs` を起点にし、新しい基盤を作り直す計画にしない。

**【未確認】** 新24Stage/27形態の実表示・実負荷・バランスは未実装なので未確認。低耐久機で23回を技能へ配分して生存できるか、10px射程Stageの成長感、1秒減速域の視認性、Prismの外周対象への価値、実GPU/端末/長時間は今回判断しない。過去結果を新効果全体の合格へ一般化しない。

## 11. 承認が必要な項目と第一推奨

**【今回の提案・未承認】** コードで確かめられた現行値・取得回数を再質問する必要はない。実装へ進む前に判断が必要なのは以下の設計選択である。

|判断対象|第一推奨と理由|別判断が必要になる条件|
|---|---|---|
|24Stageの値|第2節の表。Moonは4→12、半径60→70。SPIKEは威力/周期を据え置いて半径80→160|SPIKE以外の単体火力をさらに伸ばしたい、NOVA射程だけのStageが物足りない場合|
|NOVA増枠|S4=2、S8=3。既存slotを維持し、新枠はORBITING＋初回待ち、既存位相維持|もっと早く枠を増やす、均等位相へ再配置する等を望む場合|
|Core|Assault1.25、Control独立期限slow、ReactorはMoonの待ち/余白・SPIKEの待ち/空探索・NOVAのregen|新しいEN/移動/無敵連動を足す場合は別仕様。現案は足さない|
|Final|Execution主強対象1.25、Prism有限分岐、Singularityは非damage制御field|damage付き残留、追加対象数、既存強対象の定義変更を望む場合|
|成長予算|Moon S1だけ開始、23技能＋その他最大4選択を基本完成目標。Relay無料強化なし|全S8＋大量Evasive/AP/ENの同時保証を求める場合|
|補正統合|Core/Final/TRIAD一度→OVL round→ARM round→既存受付。専用周期floor厳守|端数や倍率capの変更、専用攻撃へのOD連射導入は別承認|
|TRIADの効果範囲|既存の用途別戦闘効果をRAMで接続。Reactor/Trinityの既存EN/ゲージ差は明示確認|EN効果を含めないTRIADへ変える場合は別設計|
|後続順|6B→6C1→6C2→6D、各報告と人間確認を挟む|複数段階をまとめることは別承認。公開/保存はPhase 7以降|

本書を完成させることと、上の仮値を採用することを区別する。今回のPhase 6Aだけで正式性能・最終合格・6B以降への着手を確定しない。

## 12. 今回の作業・保護確認

今回作成したものは本設計書。Phase 5報告へ今回の人間確認と未指定範囲を末尾追記し、READMEへ設計書の案内を1段落追加した。製品コード・設定・素材・テストハーネスは編集していない。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth/報酬、UI/HUD/Shop/Rankingの実装変更、保存キー追加はない。

数値確認は既存pure fixtureのRAM計算、現行メソッドからのXP/選択回数、提案式のround/floor、面積比、NOVAの期限未満の有限時刻列。ブラウザ・rAF測定・スクリーンショット・実セーブ・本番アカウント・外部通信は今回使っていない。新たな測定結果を過去の生データへ書き込んでいない。

開始/終了の製品と既存資料のSHA照合、許可された文書差分の確認、`node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`git diff --check`を実施した。変更のない製品に対して大規模機能試験や性能測定を繰り返さず、構文と不変性を確認した。

commit、push、deploy、reset、clean、依存追加、vendor/AGENTS.md/Firestore rules変更は行っていない。

### 12.1 着手時hashと終了照合

着手時に、Git列挙対象のソース/文書/既存ハーネス等67ファイルとUMBRA PNG27枚、計94ファイルのSHA-256をRAMへ採取した。終了時は、許可されたREADMEとPhase 5報告を除く**92/92ファイルがbyte単位で一致**。新規ファイルは本設計書だけ。Phase 5報告は旧27,096 byte全体がそのままprefixとして一致し、末尾708 byteだけ追加。READMEは案内1段落を除去すると着手時本文へ完全一致することを確認した。

保護92件のマニフェスト集約SHA-256は `5573f0448ccee95571769a62f9283492e474f730531f8bbd9ed24ce0f35ae3ac`。再計算形式はpathをen locale順に並べ、各行をUTF-8の `path + NUL + sha256 + LF` として連結したもの。画像を再圧縮・再描画していない。以下は変更許可2文書も含む着手時manifestである。

<details>
<summary>着手時94ファイルのSHA-256（比較基準）</summary>

```text
AGENTS.md  e1ec8d7b2a3a128152d987357ba84a5d47dbb6d5785f1059a6f17bfde0771665
docs/umbra-airbrake-report.md  ba8038c8b52796cb81e85d00fa7f6af1e389a97fc22e252b7180bff4db7c5b13
docs/umbra-bloodspike-growth-notes.md  c39362fdad8ea38ae878d662d0fa4be66623eeccf5427ded1cafa24ab76d0210
docs/umbra-phase1-assets.md  5525e11e2986ccfe062d19c82ce6aa5dcec779d6f88526b8f8f6a5c6477da36d
docs/umbra-phase1-report.md  5a8c883ad972631ac7a7efd2f5b14c8c7de99bfd659468d3dad1e3405f5043e7
docs/umbra-phase2a-report.md  e3b7ef09aa5234d65fe3ab986f63b6f6a45b301503ae95dec866be8b6deacd29
docs/umbra-phase2b-report.md  985da8e94bf4bde99f9fc779c1a15f79294e0df8de0281f7e9adcee66c51ddb3
docs/umbra-phase3-report.md  6082e432461940c727b557d3900932344a75a93e6add66ff9a1ddb735bfa03bc
docs/umbra-phase4-latency-report.md  b09dfc1a33d0469f67bec22630dbed70b57feae30f15d43b455070ac536d5ea4
docs/umbra-phase4-report.md  d763fd7b909077efdddbca88e115b6c0d534d41fd19856a8e76d3858a29ed073
docs/umbra-phase5-report.md  a9b9c3fb0ea4140ce2194fdb5891e62b1a137874fd28fe357e0329981c420de1
equipmentDefinitions.js  02c4094e399e9bbcdf70b6fab2f7b014e4b5ab2bddb8e2b8523a91b9b2fdb25e
firebase.json  e87125f3ec6439a59ba44d80a6dcc46378a27a0644b0cda30abeafd2efb67e20
firestore.rules  75b19608ace4d192b7bdca40f0b40b7b5611d56ba9b87f3010ed17a8a59399ec
game.js  fd27f20c159682ae7363654b238e49f29b8327e2703900205ccbf129a9e0a451
index.html  b2120e0366cf7a3caec85e53bfec07c020187e6f0d338e317c9aeb5da0841f22
MOBILITY_DESIGN.md  a567e804571bcac3c75c9a36aa6aa2b4906d2a93a0ebbb566e58ed6d42ec8d6f
README.md  a29a2567d85c45e9113be73112940940d447a63780ef5921bb35fbb03fa79f31
skillDefinitions.js  6419d22bef1bc442f493bab841b3863c3b46ad54b63f7749ea9a52bdf7284cfa
stageDefinitions.js  8eba7451c5189e9dd897da29d7560797ddd3b2405d0c2e57f889096af2967973
style.css  f404a7f0277f681af0fd1ede41fa0ce8e653a79561a1b3fc21bb52be1f4e0f8d
tests/umbra-airbrake-browser.cjs  c1e6f4953793f81720d4057635efc9426803bacf700cf1e35f1e113c135ad5a3
tests/umbra-airbrake-realtime-browser.cjs  c14ba857e0b65f2719720def33f0a2d70a2ddb0e18eb0f590b9f1390e5c691e4
tests/umbra-airbrake-regression-browser.cjs  c48bfbf29eb45f16579748acadb380505b36cfd0286cd06448d550fa2642aa3e
tests/umbra-airbrake.test.cjs  3bf88a5062995c56b8a7d98a7795e82542218076c2b18ab443f2392b9ebd640f
tests/umbra-bloodspike-arena-browser.cjs  1df57ab20839614a75ea5d9386281d4205623c0e755b71a67d5dc33d082316c0
tests/umbra-bloodspike-browser.cjs  e1ebd37215e6b45df1ea7e394c9ec145a9711f487a877a5bd67da5ef907104fd
tests/umbra-bloodspike-runtime.test.cjs  ebee0e99e91f8f324ccf5b01a14ad6068f7fdba58222f9650a0669ea5deb2a23
tests/umbra-bloodspike-stats.test.cjs  572f537c3fda28ff41ed4de6679f5a46ee0d0b29d0a3f5ae6a2fe67fd0e1dbb1
tests/umbra-drive-browser.cjs  9654f14b478fa51b47e9f277cee4b8da96399d313c0698bc940842621e262603
tests/umbra-drive-lifecycle-browser.cjs  43298fdef993c4f355d952bd13ea4f9996a2d49810e6cb99c5ab03a59d86349b
tests/umbra-drive-stepped-browser.cjs  1f07112f0ffb4bb6d9fa4aa0e3791e9706be18d6ea7d51bc9378f86db7138fef
tests/umbra-moonlight-arena-browser.cjs  b8d164057b3eaf4c52e2cd1e4e57fb6bded4e98bd6382e42824f39d9dca37be9
tests/umbra-moonlight-browser.cjs  288033e4bbde9c04d73f23b484501e953e4723c0eede8d046a57e48bbc670aa4
tests/umbra-moonlight-geometry.test.cjs  1477840821debbd4eea399e4e6cead663f67debc2e1ec3f0eef0ac5854d285bf
tests/umbra-moonlight-history.test.cjs  add96dab04208559163b2a7e2d0adaa40882f6d9409c920823736db557f190a2
tests/umbra-moonlight-stats.test.cjs  35a97c60d6241a32f9ea59ce9755ae33ef2883c4816d786a720705d09f05985f
tests/umbra-normal-browser.cjs  deaaecb4aa7caf80d2b159626355e9ae93454d169f686d8764a278fa8f085815
tests/umbra-nova-baseline-parity.cjs  66c03877e075338cceba52493f4e5e8f3b1b44052450651cda5b2bfe7e59cd0c
tests/umbra-nova-browser.cjs  7b96e08acd7d0270821f98d840b6c5b500e24adaf8626cb018c0923bac19c428
tests/umbra-nova-parity-offline.cjs  073c0bc06a7cbb138ab04ce02b3cf1befd9bf248e1ae34bccf2fd8c0eb06eb5f
tests/umbra-nova-performance.cjs  14d5b296f19edb60695c522d8848e2b93345139ebdd57c2ceee8ba9d9c5e22af
tests/umbra-nova-runtime.test.cjs  ded10556491bc7267c6cb8412a034e4f8c75891dfba7b0be48c47874ed79e0e2
tests/umbra-nova-stats.test.cjs  0a2a7f5583a7c3e43dedd2d7e77a05d0bb97a06497e95db2b167e84df40be5fe
tests/umbra-nova-visual.cjs  0f34f27330926965d1ec0b6ece0a0df4f2d454acf310914600abd8485c4f3b43
tests/umbra-phantomnova-arena.test.cjs  a262bb05306b6421c1885e1aeba573e9182dbe0f4bea79468735cc81940a9b6d
tests/umbra-phase2a-candidates.test.cjs  ad6112282286ee95ff5d02eac73e2399c63e7eed78216814775bf196f2725e9a
tests/umbra-phase2a-stats.test.cjs  90c9f001eee60ab86eca8a15ec995d1d14f812188535c24bfd2ac431470498bf
tests/umbra-phase2b-candidates.test.cjs  953c6513b7e97ec5c5a0fec9cb023dfee7bc0c3e3bfc4b936010e7b78035f7c9
tests/umbra-phase2b-performance-browser.cjs  825bfa3098644e1ee59e2081cfa92328f1884c0eed195609558dfac1d074bedc
tests/umbra-phase2b-trace-browser.cjs  62d231d421bc2fd35f68721568b449591095e516d4734e6d3bf2b58351fe4089
tests/umbra-phase2b-trace.test.cjs  d94b45f8e19b22591f4994c19b99a6b1c56f35ccce2401b584e3046d053bd1b2
tests/umbra-phase3-performance-browser.cjs  d72630cdac0e91c537a62b6bf990c3d1848ed31196e932a4df6a87ea879ee3fb
tests/umbra-phase4-drive-browser.cjs  365e14b20c60c8918c83e465f77dcdb715c0d226506bcc4419741395c99836f4
tests/umbra-phase4-latency-browser.cjs  4c9a7db78024d771ca96ea10f4d6ed7f80c13382d2100d68b29cfb0d6634396f
tests/umbra-phase4-moonlight-browser.cjs  5bf7ebd8560dfbbfc913c7dfcb99479c91cdd93ebf24f28021aff721b22eee57
tests/umbra-phase4-performance-browser.cjs  4f804566187560929813c3ee0414f99d9e201390f6e2b2139453fdb168035bdc
tests/umbra-phase4-public-gate-browser.cjs  fb28d1a48fd435af1c3c112460d4680134acdd53993bfb569135284b1027f5e1
tests/umbra-preview-browser.cjs  abdfde74329d9265919006f97dbbeb8619f6df0df5c36e04836e905294c5525f
tests/umbra-registry.test.cjs  353d93646104d1c6885ba9c3eea6800ac9510f52d506db52b6bb94a87565475d
umbraDrive.js  70812616275e4c213f66dddb39933c74117320db1cb644ff140a7da096aa1ced
umbraDriveFixtures.js  9f7c40f10e2c23f4f4aed56be38ea998a87bd3a0f6d43fdeda0a56999d79ebbf
umbraDriveRuntime.js  3c56400304aeb9c8aad07044e43ca5a72de06b15defee41e3a4dd848a0f195cc
umbraMoonlightArena.js  78dfcd83989d8dc49ea2509104a3368a4074628b51fcfd3949abcca1b7b0e723
umbraPreview.js  18bc7068c279960284d4b15989871d9705c11955c5807071f40f5db5f53beef8
umbraPreviewAssets.js  b754468d7ca00f123f8019197cecd803024704687ebd411c87fb82860c65d1a7
vendor/phaser.min.js  3c27e64915c56b99d8c4f67664ca5924ccce8a60a234a221b74fd330748dae56
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000_BOOST.png  682bfdd98723c7ab7f128e21198507ae87ef3e71f18921cc064d80a6d705810e
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000_MOOVE.png  b67d6ff1a169c9027cb4653fd5a795e72515bab9a63f123bb3c64903a5a540b1
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_000.png  a32c6c555cffb19d7cdb3e5e37b5f24903e27608d61caaadae48022c90bc8dcc
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135_BOOST.png  1caa99fe460b5c0f626331c9f1a256c247a4e96f21a7ce731ef966130a9b97c6
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135_MOOVE.png  fc7777f3df082490974c30c4c1da01a033489fb1a73b423a844b203994bfb202
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_135.png  bae5f8e889e484d177c14ffe007a953b1f940d16add3a5c3fede6239bb67d3d4
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180_BOOST.png  0ada96e7b424e003b7c128c03315c9c58846c96f084f530589eeebc32322dae0
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180_MOOVE.png  b01967578318ea0298eccd022f593c205f0dd8fa0a9129ce37ab4af0bec54d59
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_180.png  56aec57a9d7099edac6933ae76254e356b03224a5f013a78eb1905608f871365
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225_BOOST.png  122c973a37b7d3e2a082319e2fe4ca5cd0d53448a443aa59ee5fa94b89847cd9
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225_MOOVE.png  61828f60962115a987500892829f9b0a201802310d1c4afa64741b9e8db5f696
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_225.png  15adfc764c0afe9dbed9e681e6c33e4d7befde24cb11c8057341e894c35d0888
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270_BOOST.png  c355aab2dfa3b5d50b73585cd4c5549b8ac4bc7ba2cfc3d31ea62387fdc0121a
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270_MOOVE.png  ca090423aa37e9df051f4e003267c08b5b4d799d0c784640284da6d213d5f1bc
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_270.png  7c95dd6419c55f2a24e72b3fe9fca5222645c5bcd1d9f5132f9ea0e4ac361631
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315_BOOST.png  beb0b242bb85e0391a358a6397cb808657077cf94eafe5d7ce1fe80962898eff
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315_MOOVE.png  e20c0bd8a672b8065d6d05ea8b0ac0904ee6837450c98d39498cbea5ab658d30
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_315.png  100b3d5ffcb7879d6686fcc7157bf58e0452691071842da3c7e2aff83f3c2c37
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45_BOOST.png  505095ab98d589c7b58f49afdfd2bf32229b5aaff5b968fb31e2d66e6328790d
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45_MOOVE.png  7b8944f125205befbf546919f284ab2bd0f5b529eed8e381b5cb782ad8eb70eb
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_45.png  4330f634b08635a4c3585142eb414cfd8c3aa7d8601e5ad1eccb66856958d2bd
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90_BOOST.png  63407c3075aaaeb4596797d8a67b8db6c0f2a610ecf2c10a2b6387c9bac8c703
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90_MOOVE.png  1b9f2b09038277474d52e59508395525a510fb94c485807352ed7d30ac6aa403
画像/player/KGK-02_UMBRA_SERAPH/character/KGK_90.png  391ca2013e84696176aff47955d66756a0030c5d5dd5f2c48214a0311fdfd2a0
画像/player/KGK-02_UMBRA_SERAPH/skilleffect/bloodspike.png  752018d5cbbf98bcb381f6c1ff9540b82bed5c95f29f5b0ad7662e63e45bc64e
画像/player/KGK-02_UMBRA_SERAPH/skilleffect/MOONLIGHT.png  39f10640e96e37ea0fe238ee4ef4a7c06198009e9eabe2a0955483029cc09239
画像/player/KGK-02_UMBRA_SERAPH/skilleffect/nova.png  2f31b165675d9e89c7424cc170b3923206dc85825833d25b8ecfb85778e47e66
```

</details>

### 12.2 実行結果

- `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`: 全てPASS。
- `git diff --check`: PASS。既存のLF/CRLFに関するGit警告は出たが、製品hashは不変。Git HEAD比の既存大差分を今回の変更量とはしていない。
- 本書の基本Stage表24行、最終形態表27行を確認。数値、取得回数、状態所有の読取りレビューを分担し、面積比の丸め、slowの独立期限/field membership、Fireの最終実効差、Mutation前profile保持を文書で補正した。
- 通信・保存を呼ばない既存fixture/XPメソッドのRAM計算と、提案式/有限時刻列の計算のみ。新規ブラウザ実測・全機能試験・性能試験は行っていない。
- HEADは開始と同じ `28cfe5ab71048b0487254dceef6f66f3a25788f9`。今回差分は本書新規、Phase 5報告への追記、README案内だけ。

Phase 6A：成長・Mutation設計案。製品コード未変更。Phase 6B以降は承認待ち
