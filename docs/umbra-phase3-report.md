# KGK-02 UMBRA SERAPH — Phase 3 MOONLIGHT基本攻撃

2026-09-06。対象 `H:\ラスメモヴァンサバゲーム`。明示的な隔離攻撃場でMOONLIGHT検証S1を実装。正式公開・正式性能・人間操作の最終合格を示すものではない。BLOOD SPIKE／PHANTOM NOVA、Stage2～8、Mutation、TRIAD、装備の新3武装対応、販売、Phase 4は未着手。

## 1. 着手時の状態と保護

HEAD `28cfe5ab71048b0487254dceef6f66f3a25788f9`。着手時game.js SHA-256 `15479571d8829ffe5aa9fb8254d946b05ac63b473418b9bb3b55cb65dfc2b968` は依頼されたPhase 2B最終値と一致。README/game/index/skillDefinitionsの既存変更、未追跡の検証module・docs・tests・画像を保持した。Git HEADや旧legacyを比較基準にせず、Phase 2B完成状態＋tunedを `.tmp_umbra_phase3/baseline/` に別保存した。着手時hash/status/HEADは同ディレクトリの親に保存。過去のbaselineとJSONは上書きしていない。

AGENTS.md、README.md、Phase 1報告・素材記録・Phase 2A・Air Brake補正・Phase 2B報告を確認。Phase 0の独立した報告mdは存在しないため、読み取り済みとはしていない。今回の依頼と現コードから必要な接続を確認した。

Air Brakeの人間承認は過去報告の採用根拠として維持する。Phase 2B通知の追加の人間確認、今回の辻斬り操作感確認は報告されておらず、確認済みとは記載しない。初期「Air Brake問題なし」→継続テストで再調整→tuned採用の履歴を削除していない。

commit/push/deploy/reset/clean、ライブラリ追加、npm/bundler/TypeScript、vendor変更は行っていない。通常Sceneの更新順・物理step・Air Brake係数や式・機体24姿勢・pivot/scale・27PNG・フレームmetadataは維持。`boostSustainDrainRampMs`／`boostSustainRampMs`の不一致も据え置き。

最終game.js SHA-256は `307ea67fe2bed619ba02f1739c956d44b2bca41df14b98a6774d3ce0b5b57de6`。最終攻撃102条件とarena受付・表示・終了試験は、この版を凍結配信して再実行し、JSON内source hashと現行ファイルの一致を確認した。localhost配信11ファイルのHTTP200・配信bytesのSHAとローカルSHA一致は `phase3-integrity.json` に記録。着手時hashはディスク退避の値であり、当時未採取のHTTP応答を採取済みとはしない。

## 2. ファイルと実装範囲

| ファイル | Phase 3の変更 |
|---|---|
| game.js | MOONLIGHT専用の幾何helper、通知consumer、生存履歴、HP受付観測、仮パラメーターgetter、専用パッシブ説明。既存spawn2箇所の生存登録とkill時の履歴解放。明示query時だけ新moduleを配信 |
| skillDefinitions.js | MOONLIGHTの`verificationStage1`だけ追加。`previewOnly:true / startsUnlocked:false / stages:[]`は維持 |
| umbraDriveRuntime.js | 明示攻撃モードだけ専用helperを本番prototypeの関数参照で取り込む |
| umbraDrive.js | 既存隔離Sceneから専用arenaのcreate/reset/update/destroyを呼ぶ。通常Driveの入力・移動・A/B診断は維持 |
| umbraMoonlightArena.js | 明示攻撃場、敵配置、RAMのHP/通常ドロップ、限定adapter、接触ON/OFF、FX、診断UI |
| index.html | 変更したgame.jsとskillDefinitions.jsのコード版を`umbra-phase3-v1`へ。動的moduleは変更ファイルだけ同版、未変更moduleと画像版は据え置き |
| README.md / 本報告 | 入口・操作・仮性能・接続と検証範囲 |
| tests/umbra-moonlight-*.cjs / tests/umbra-phase3-performance-browser.cjs | 幾何・履歴・補正・実Phaser・攻撃場と回帰検証 |

AGENTS、stageDefinitions、equipmentDefinitions、style.css、Firestore rules、過去Phase報告は今回変更しない。保存キー追加・変更は0。通常HANGER、購入allowlist、所有、通常出撃、通常候補の公開制限は維持する。専用Stageは通常`stages`と分離し、UMBRAの隔離Contextにだけ取得stateを作る。Stage2～8の同値埋め、basic orbit／雷撃へのfallbackは作らない。他の2スキルは未取得のまま。

## 3. 仮パラメーターとダメージ

| 設定 | 検証開始値・意味 |
|---|---|
| Stage1基礎威力 | 4。raw=`4 + max(0, stats.bulletDamage - 1)` |
| 通過半径 | プレイヤーの物理body中心から60ワールドpx。プレイヤー半径22を加算しない |
| 離脱余白 | 12px。離脱側は72px＋実敵bodyで別判定 |
| 再命中間隔 | 基礎750ms、Fire Control実効下限200ms。時間だけでは再攻撃しない |
| FX | 8コマ／10fps／scale 0.38／800ms、一回再生、同時12個。判定数・ダメージ数の上限ではない |

現行D1／Wave1はdurability1.25を含み、Chaser3、Dash2、Ranged6、Tank9、Silver9、Gold10、Elite Chaser14／Tank36、Crack Wave Boss275。既存Stage1のbaseはorbit1、tornado1、rabbit3、REGALIA砲14。操作と離脱を必要とする基礎4を初期比較値とした。敵HPを一括弱体化していない。

| 補正 | 適用箇所・今回の扱い |
|---|---|
| Reactor Overcharge | 既存`stats.bulletDamage += 1`をrawへ+1として接続。専用カードは基礎と実効差分を表示 |
| Fire Control Link | 既存`stats.fireInterval -=70`／floor160を維持し、`max(200, round(200 + 550 * clamp((fireInterval-160)/380,0,1)))`で再命中へ接続 |
| 永続Weapon強化 | 既存stats.damageMultiplierの`1+Lv*0.06` |
| 所有CD | 既存statsへnandeyanen威力+.10/fire×.94、kotokoto威力+.06、mirai fire×.95。最終fire丸め/floor120を維持 |
| 機体 | UMBRA×1、標準×1、REGALIA×1.2という既存damageMultiplier。MOONLIGHTはUMBRAだけ |
| OVERDRIVE威力 | 既存`scalePlayerDamage`の×1.15。有効時に受付で1回 |
| 敵のvulnerable／HUNTER | 既存受付の対象別倍率。vulnerable1～1.5、HUNTER Boss/Elite1.25・通常高HP1.12 |
| Support Link | supportDamage／supportFinisherを指定しないため新たに加算しない。Support保護は通常どおり拒否 |
| OVERDRIVE速射／Mutation／装備間隔 | MOONLIGHT再命中への新接続なし。TRIAD、SENSOR／ARMAMENT／OVERLIMIT、REGALIA装備対応も後続範囲 |

攻撃側はrawを渡し、受付が既に掛ける倍率を掛け直さない。基礎／中程度／deep fixtureは、通常対象への威力4／6.4／10.64、Reactor 1回後5／8／13.3。基礎のFire Control連続取得は750→649→547→446→345→243→200ms。実効下限に達した候補を除外し、200msと離脱条件を説明する。CD入り初期間隔は中程度711ms、deep666ms。ブースト開始間隔・EN・無敵・8コマの再生時間は変更しない。

## 4. 通知から成功表示まで

```text
既存PRE_UPDATE／World.update・追加step／collider・overlap（順序維持）
  → Phase 2B WORLD_STEP通知（start/step/end/invalidateは従来どおり）
    ├ A/B診断consumer（独立）
    └ MOONLIGHT consumer
       現Context・取得・生存・停止・Raid・世代・order/step重複確認
       → 同stepの全対象数値snapshotを先に作成
       → 相対swept AABB候補 → 円／丸角矩形の厳密sweep
       → 通過履歴・離脱・再命中時間 → 命中時点の実壁LOS
       → applyDamageToEnemy(raw, tint, null)
          通常倍率・Support保護 → HP → killEnemy → 通常XP/ドロップ
       → HP前後観測で成功だけ確定 → immutable命中座標 → 1回のFX
```

開始成功だけでは攻撃しない。有効な後続stepも使う。通知表示OFFは攻撃consumerに影響しない。通知自体OFFでは購読を持たず、位置差分方式へfallbackしない。同期受信中に世代更新／停止／対象の生存世代変更が起きれば残りの適用を中止。遅延ダメージ予約は0。攻撃consumer例外を自身と通知基盤の両方で記録する。

`applyDamageToEnemy`は成功・拒否とも既存戻り値がundefinedのため、同期呼出し前後のHPを観測する。実減少がない受付は成功・FXへ数えない。`impact=null`は、空のimpactでも既定force140が付く既存挙動を避けるため。追加のノックバック・無敵・EN消費・hitstop・画面揺れは作っていない。受付のHP減少値はoverkill分を含み得る実HP前後差で、撃破数とは別。

## 5. 敵の形状・同step・壁

動的Arcade bodyの`prev`は各物理step先頭、`position`は衝突解決後。複数catch-up stepでも毎回snapshotする。body中心offsetを加えてE0/E1を作り、P0−E0→P1−E1の相対線分を評価する。最終位置だけでは高速横切りを絞らない。

円の実半径はvendored Phaserの衝突と同じ`body.halfWidth`（画像単位の`body.radius`ではない）。矩形はwidth/2,height/2と実bounds中央。円と矩形のMinkowski和を、2 strip＋4 corner diskの厳密な和集合で計算する。外接円や単純な拡張AABBは最終命中に使わない。広域絞り込みだけPとE両方のswept AABBを使う。画像scale/zoomは式に入らない。

前回E1と今回E0、body identity、shape、登録、当該stepの`newVelocity`と実変位の整合を確認。warp／body再設定／未知の壁補正はその敵だけ除外・再基準化し、過去の敵座標から直線を捏造しない。通常敵spawnとVOID spawnに生存登録hook、検証場のreuseは明示APIで新しいlifeIdを発行する。生存中の`configureEnemyBody`でlifeIdを振り直さない。未登録個体は`TARGET_UNREGISTERED`で除外する。Depth世代変更で履歴を解放した後、まだ残る旧Depth敵を自動で新Depthの生存個体へ登録し直さない。新規spawn/reuseの明示登録だけを認める。

本番`playEnemyHitReaction`は敵Spriteのscaleを変えるため、同bodyなら次のstepでshapeが変わり得る。共通挙動は変更せず、そのtargetを保守的に再基準化する。隔離arenaではこの表示葉だけ別Graphicsへ適用し、画像だけの拡縮試験もbodyから分離する。

LOSは候補時刻で補間したプレイヤー位置から実敵shape上の最近点へ行う。`stageObstacleBodies || walls`の実body矩形を使い、攻撃60やプレイヤー22で壁を膨張させない。実壁への接線も遮断する。最初の進入が壁遮断ならその通過を消費し、内側で壁条件が変わっても再試行しない。

`WALL_CHORD_UNVERIFIED`／`UNEXPLAINED_CORRECTION`等の除外区間は攻撃・離脱証明とも使わない。除外前後を結ばず、半径補完もしない。診断は`PATH_*`、`WALL_OCCLUDED`、`OUT_OF_RANGE`、`REHIT_WAIT`、`SAME_PASS`、対象固有の`TARGET_*`を分離する。

## 6. 生存個体と通過の履歴

生存敵ごとにlifeId、通過ID、初回可否、armed、消費済み通過、前回成功時刻、数値cursor/shapeを保持する。boostSequenceだけで消去しない。

初見の近い敵は最初の有効移動で初回候補となる。以後は72px＋敵bodyの外を信頼できる観測で確認し、60px＋敵bodyへ新しく有効ブーストで入り、実効間隔を満たす場合だけ命中する。間隔前の再進入、壁遮断、Support拒否も通過試行を消費し、範囲内で再試行しない。1stepで進入と離脱が完了すれば、終点外側を次通過の準備として扱う。同じ長押し内でも別の通過は可能。

正常な通常移動／滑走／Air Brakeの観測は離脱状態更新だけに使う。これらの経路も当該物理変位と壁経路の整合を確認し、未知の補正から離脱を推定しない。通常移動で再進入済みなら、その場でboostへ切り替えても前回成功からの新しい進入にはならない。

戦闘時間は重複しない物理stepのdeltaだけを1回加算。通常移動中も進み、停止・overlay・帰還・死亡・Raid中は進めない。同じScene.time.nowの複数stepを区別し、start/endで加算しない。basis／pauseで離脱確信は捨てるが成功時刻は保持する。新規試験・Depth世代変更・死亡・敵の消滅では履歴を解放する。命中数値履歴128、診断対象表示32、理由種別40＋OTHER、既存通知256／表示120という上限を持つ。生存履歴は現在の敵数に比例し、死体履歴を蓄積しない。

## 7. 隔離と本番関数の再利用

通常SurvivalScene.createは呼ばず、既存Phase 2A fixtureからRAMのshop/CD/equipment/statsを組み立てる。実保存・認証・クラウド・ランキングは呼ばない。以下の区別はarena.getSnapshot().adapterManifestでも確認できる。

| 区分 | 処理 |
|---|---|
| 本番関数参照 | configureEnemyBody、HP受付、scalePlayerDamage、killEnemy、通常XP/保証・通常rare drop生成、merge/上限/破棄、Depth/Wave/耐久倍率、通常GEEK倍率計算、通常接触→被弾→Evade受付 |
| RAMの進行 | kill/elite/boss数、通常Wave Boss後のwave番号更新、XP/rareの実GameObject。自動戦闘進行や回収・EXTRACTは実施しない |
| 世界adapter | stage boundsと障害物照会を検証場の6000×2000・既存壁へ接続 |
| 表示adapter | 敵被弾を別Graphicsへ、ダメージ数値を12件上限、通常撃破装飾・Commsを省略。MOONLIGHT成功FXは専用所有 |
| 遮断して件数記録 | 装備箱、Robot boss報酬、LOST ARMS、Robot/Support特殊item、NEMESIS専用報酬handler、VOID討伐解放handler。永続討伐フラグの保存関数は呼ばない |
| 被弾終了adapter | 実handlePlayerHit→applyDamageToPlayerでHP/既存無敵/Evadeを処理し、致死のtriggerGameOverだけRAM停止へ。通常終了保存・HUB復帰を呼ばない |

撃破関数全体をno-opにしていない。NEMESIS／VOIDは通常HP経路の対象可否・撃破分岐までと、専用報酬／永続解放を分ける。後者は意図的に未実行。Robot Barrierなしのfixture、Directive・Comms葉の省略も通常全戦闘の検証と区別する。

新規fixtureで既存damage tint60ms／death Tween150ms／player flash220msを含む当該隔離SceneのTimer/Tweenを破棄する。このDriveは通常移動演出・SEの葉を省略しているため、これらは今回の攻撃場所有。通常の停止／候補開閉／表示切替では破棄しない。FXは敵参照／body／colliderを持たず数値命中位置だけを持ち、戦闘時間で進行し、終了時に破棄する。

GEEK確定、ANJU MEMORY、LOST ARMS保存、DATA CACHE、OVERDRIVE報酬、STABILIZE、Depth6+契約、ショップ購入・ランキングの仕様変更は0。通常dropはラン内検証オブジェクトだけで、回収から報酬確定する経路は本試験に含めない。

## 8. 試験記録

純幾何／制御通知履歴／実Phaser制御タイムライン／通常rAFを分けて集計し、人工タイムラインを実30/120Hz端末と呼ばない。出力先はすべて `C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-phase3\`。旧Phaseの出力とは別。各JSONに入力時刻、実座標、source hash、期待と実結果、隔離件数を保持する。

| 試験 | 期待と実結果 |
|---|---|
| 構文 | game/skill/stage、Drive/Runtime/Arena/Fixtures/Preview/Assetsの9ファイルPASS |
| 旧unit回帰 | registry9、Phase 2A stats10／candidates11、Air Brake8、Phase 2B candidates10／trace10、合計58/58 PASS |
| 新unit | geometry10、stats11、history18、合計39/39 PASS。旧と合わせ97/97 |
| 純幾何 | 独立の凸距離oracleで2,500軌跡、同じ軌跡の30/60/120分割で命中・entry/exit一致。円内外±0.01px、境界、大矩形の外接円誤判定を除外 |
| 実Phaser | 30/60/120Hzの合計102条件PASS。停止・guard・再進入・外部補正・敵warp・reuse・shape変更・角除外・壁遮断・同Scene時刻の複数物理stepを検査 |
| 補足 | 外角3Hz＋FX ON/OFF・16/128/512体の反復負荷18条件、計21条件PASS |
| 16体通過とFX | 画像／簡易／OFFすべて受付成功16、HP減64、撃破16、XP16。画像と簡易はFX12／省略4、OFFはFX0。画像の0～7を1回観測、8回ダメージにはならない |
| 本番受付 | 通常／Elite／通常Bossの直接受付試験を幾何通過と分離。各kill1・XP1、Gold保証dropはXP38/GEEK3000のRAM object。Support保護中の実通過はattempt1/rejected1、HP9維持、成功FX0 |
| 特殊対象と欠損 | NEMESIS/VOIDの実判別flagを持つHP275のRAM Bossへ実通過各1、275→271。別の致死受付で専用handler遮断各1、永続save/解放spy0。専用Boss AI/出現は未試験。Raid Boss/minion/giantはHP維持・受付0。MOONLIGHT画像1要求を404にしたfresh contextでもGraphics12、成功16・HP減64・例外0 |
| 接触 | 観測OFFはAP40維持。既存接触ONは40→27、既存900ms無敵により10frame後も27。実boost Evade中は40維持、negated1 |
| 停止・破棄 | pause／候補／Raid待機／Raid進行の30stepで戦闘clock、FX age、受付数不変。復帰で通常進行。新fixture、AP0、機体切替、退出で旧runtime/敵/FXを解放 |
| 着手時tunedとの性能 | 30/60/120×3fixture×短/長boost・最大強度1540px/s制動・過熱を含む120比較すべて全sample一致、最大数値差0。通知ON/OFF×表示ON/OFF、既定値36reset、A/B表示parity30件もPASS |
| 旧browser回帰 | Preview、通常起動5、lifecycle9、stepped走行9、Air Brake回帰7、実rAF Brake12、旧通知102、legacy/tuned各81測定・81対比較はPASS。旧drive-browserの角については下記の失敗・再試行を別記録 |
| 保護差分 | 採用制動・移動・通知16helper・HP受付・被弾・取得behaviorなど33関数本文が着手時と一致。画像27のhash/寸法、表示metadata、過去報告、AGENTSが一致 |

試験場接続の初回に、実kill先の表示cleanup helper不足と、終了時にPhaserが先に破棄したgroupを再参照する問題を検出した。限定allowlistと破棄guardを修正し、再試験した。エラーが出た試験をPASSには数えない。履歴unitの意図的例外注入では攻撃側と配信側の両errorが1になることを検査し、通常実ブラウザ試験は両方0を必須にした。

### 更新頻度と実軌跡

実Phaserの物理設定は固定60Hzのまま。制御30/60/120HzはScene入力時刻列で、端末Hzではない。例えば側面通過は以下で、描画更新数を物理step数と取り違えていない。

| Scene制御Hz | Scene更新 | 物理step | 幾何候補 | 受付成功 | HP減少 |
|---:|---:|---:|---:|---:|---:|
| 30 | 26 | 52 | 8 | 1 | 4 |
| 60 | 50 | 50 | 8 | 1 | 4 |
| 120 | 98 | 49 | 8 | 1 | 4 |

入力量子化・Scene更新順・既存delta制限による軌跡差は残す。敵warpを含む短い条件では正常な対象が30Hzで2命中、60/120Hzで1命中になった。未知経路のstepは全Hzで除外し、その後に確認できた実移動の長さが違う。これを全Hz同じ件数へ補正していない。相対経路が交差しても時刻が違う条件は全Hzで0、同stepで正しく横切る条件は各1。Evade終了後に続く有効boostの通過も許可した。

壁の同じ側／向こう側の配置は各Hzとも幾何候補24、成功1、壁遮断1。内角は正常部分で1命中、保守除外区間では0。`PATH_WALL_CHORD_UNVERIFIED`は30/60/120Hzで2/3/4区間。外角は各26衝突、valid44/43/43で、全valid線分が実壁内部を横断しない独立照合もPASS。保守除外区間を接続した攻撃や離脱証明は使っていない。

### 負荷と既存角の未解決記録

全敵snapshotはstepごとO(N)、swept広域候補だけ最終形状を評価し、全敵sortはしない。16/128/512体の負荷では命中する近傍16体を揃え、snapshot累計576/4608/18432、広域候補256／幾何判定512が同じ。いずれも16命中。FXからの全敵探索は0。通常drop生成時のカメラ割当は別の生成時処理で、FX frameから呼ばない。

最終Depth guard版の画像FXあり主試験は、16/128/512体のconsumer平均0.126／0.276／1.024ms、最大2.9／4.6／5.5ms。各16命中・64ダメージを維持した。以下の反復・外角補足21条件は修正前core/Arenaのhash付き別記録で、最終版の主試験102条件とは区別する。登録済み敵の移動・幾何・HP条件は不変だが、補足の測定を最終版で採り直したと扱わない。

初回の画像FXあり16体条件でconsumer最大565.3ms（計567.9ms）という大きな外れ値を記録した。原記録を残し、追加反復では再現しなかった。原因をGPU upload等と断定せず、初回表示の負荷は未解明として残す。別の反復計測ではFX OFFの平均範囲が16体0.032～0.095ms／128体0.145～0.166ms／512体0.392～0.534ms、最大0.9／0.9／2.1ms。画像あり平均0.061～0.134／0.166～0.405／0.429～1.245ms、最大2.9／3.9／15.0ms。headless環境のconsumer全体時間であり、実端末のFPS保証ではない。

旧 `tests/umbra-drive-browser.cjs` の「角から右上の通常入力700msで脱出」期待は、初回currentとPhase3着手snapshotの両方でFAIL。角の(1757,1333)から同座標・速度0だった。元試験・期待値は変更せず、baselineも10scriptを着手時のhash付きで配信して再現した。後半を独立確認したcontinuationでは同角を脱出できる実行もあり、実rAF・入力時刻に依存する断続的な条件として記録する。これを今回のMOONLIGHTのために移動改修したり、全試験が常にPASSと扱ったりしない。失敗と後続確認は `regression/known-corner-baseline-comparison.json` などに保存。

最後に元のdrive-browserを期待値・コード無変更で再実行し、角のassertを含め最後までPASSした。ポインター／合成pad、過熱・連打、終了時listener/timer/tween各0、3 clock条件も確認。集計は `regression/regression-summary.json` の `latestRegressionsAllPassed:true` と初回失敗の両方を保持している。断続失敗を安定修正済みとはしない。

### 実行コマンド・証跡

構文は `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js` と上記module6個。unitは `node tests/<名前>.test.cjs` を9ファイル。`node --test`の子processを必要とせず同じnode:testを直接実行した。最終追加の履歴試験は、Depth更新後に旧敵を再登録しないことと、明示new lifeだけを許可することを検査した。

既存Playwright runtimeのNODE_PATH、インストール済みChromiumへのUMBRA_TEST_BROWSER、上記専用出力へのUMBRA_TEST_OUTPUTを設定して次を実行。依存追加はない。

```powershell
node tests/umbra-phase3-performance-browser.cjs --baseline-only
node tests/umbra-phase3-performance-browser.cjs
node tests/umbra-moonlight-browser.cjs
node tests/umbra-moonlight-arena-browser.cjs
node tests/umbra-preview-browser.cjs
node tests/umbra-normal-browser.cjs
node tests/umbra-drive-browser.cjs
node tests/umbra-drive-lifecycle-browser.cjs
node tests/umbra-drive-stepped-browser.cjs
node tests/umbra-airbrake-regression-browser.cjs
node tests/umbra-airbrake-realtime-browser.cjs
$env:UMBRA_BRAKE_VARIANT = "legacy"
node tests/umbra-airbrake-browser.cjs
$env:UMBRA_BRAKE_VARIANT = "tuned"
node tests/umbra-airbrake-browser.cjs
node tests/umbra-phase2b-trace-browser.cjs
git diff --check
```

負荷補足と各出力先の設定はharness／regression-summaryの実行記録に従う。旧Phase2B性能harnessは旧baseline比較なので、今回は新Phase3性能harnessの120比較に置き換えた。旧JSONは上書きしていない。性能比較のcurrent測定は `07e4ecc9097844d53e71329ae3b9f41c870c7d104fc962fc73d7f475544ecb74` 時点で凍結配信した。以後の変更は専用攻撃consumer／arenaのguard・diagnosticで、最終版の既存移動・制動・通知関数も着手時と本文一致を別途確認している。最終攻撃試験は最終ソースを再配信して実行済み。

主要証跡は `moonlight-geometry-report.json`、`moonlight-browser-report.json`（summary併記）、`phase3-performance-baseline.json`／`phase3-performance-current.json`（summary併記）、`phase3-unit-summary.json`、`phase3-integrity.json`、`arena-ui-keyboard-hit.png`、`moonlight-browser-final-hud.png`、`regression/`。追加受付・終了・画像欠損は `arena-ui-validation.json` に `pass:true` と期待値を記録済みで、欠損画像は `arena-ui-missing-image-fallback.png`。StorageデータAPI／通常認証・Scene入口／外部要求／pageerrorは隔離Contextで0。vendor初期化のlocalStorage capability getter probe各1回は拒否して別に記録し、保存データAPI呼出し0と混同しない。通常起動の回帰は人工保存だけを用い、通常モードで生じる保存・通信試行を隔離modeの0件実績に混ぜない。

## 9. 人間用入口・操作

- 攻撃場: `http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1`
- 同じ攻撃・通知表示OFF: 上記に`&umbraTrace=0`
- 通知自体OFF・攻撃0の診断: 上記に`&umbraTraceNotify=0`
- 従来の通知だけ: `http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1`

WASD/矢印で移動、Shift/SpaceでDASH、画面スティック/DASHも既存入力。初期「側面・通常/Elite」は右へboostすると接触せず斬れる配置。配置切替は「側面→横切り→16体→Boss円/矩形→壁前後→角→敵なし」。壁と角ではガイドHと通知表示Tも併用し、壁向こうの不命中と保守除外理由を確認する。

初期の「接触被弾OFF（観測）」は攻撃観測用。ONでは通常被弾を先に処理する既存順序を保ち、MOONLIGHTが必ず先に倒して接触を防ぐ仕様にはしない。R／配置／機体／fixture／攻撃ON/OFFは同じ構成の開始位置と満ENから新規試験。P／候補L／通知表示Tは履歴を保持。「Reactor Overcharge +」「Fire Control Link +」で専用パッシブの実効差を確認できる。FXボタンは画像→簡易→OFFで、取得・ダメージ・再命中履歴を変えない。Escapeで停止画面へ退出し、旧consumer・敵・FXを破棄する。

## 10. 未確認事項と次の判断

本番の全Depth／Gate／帰還／restart／Support／特殊Boss遷移、通常戦闘中の全装備・全特殊報酬、実端末タッチ、実コントローラー、実30／120Hz端末は未確認。実Phaser制御タイムラインと新規ブラウザContextによる隔離試験を、通常戦闘全体の完成とは扱わない。

Phase 2Bで残した角の保守除外は引き継ぐ。人間に確認してほしい点は、60px半径・基礎4・750msの辻斬りの成立感、離脱余白12pxと再進入操作、壁際の見送り頻度、800msのFXの見やすさ。正式性能として確定する前に再確認が必要。今回の報告後は停止し、Phase 4へ自動で進まない。

Phase 3：MOONLIGHT基本攻撃の実装結果。BLOOD SPIKE／PHANTOM NOVAの実攻撃は未着手

## Phase 4着手時の人間確認追記（2026-09-06）

ユーザーより、Phase 3Aとして共有されたMOONLIGHT基本攻撃について、人間操作では問題なしとの確認。今回確認された基本操作を維持してPhase 4へ進む。

上記の「当時は人間確認前」の記録は履歴として保持する。確認端末、fixture、接触被弾ON/OFF等は未指定であり、全端末・全地形・深層バランス・正式性能までの承認とは扱わない。初回画像FXを含むconsumer計測565.3ms、旧drive-browserの角脱出の断続失敗、Phase 2B由来の角の保守除外は未解決記録として維持する。
