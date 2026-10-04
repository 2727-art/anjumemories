# KGK-02 UMBRA SERAPH — Phase 7B補正

作業日：2026-09-09。対象はMOONLIGHT主通過半径のcurrent/wide比較と、通常UMBRAのカード説明・詳細表示。wideは検証用の比較案であり、正式採用・深層バランス合格・Phase 7B全体の最終合格ではない。

## 1. 着手時の状態と人間フィードバック

- HEAD：`28cfe5ab71048b0487254dceef6f66f3a25788f9`。
- 着手時game.js SHA-256：`aaa12cd821db595b720334024b173999e55fb3d5b2111ccad6270f95f46b93ce`。7B報告の最終値と一致し、巻き戻しは行っていない。
- README.md、game.js、index.html、skillDefinitions.jsの既存変更、docs・tests・専用モジュール・素材の未追跡成果を保持。
- 新証跡：`.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/`。`start-manifest.json`と`baseline/`へ191ファイルのbytes/hash、HEAD、作業ツリー状態を記録。
- 着手前の既存純試験431/431 PASS、失敗0・skip0。`baseline-tests/pure-baseline.txt`とmanifestを保存した。

Depth20以降の接触リスクとカード説明の難解さはユーザー報告である。初回の依頼文には端末、開始Depth、装備、Stage、Evasive Lv、死亡直前APの指定がなかったため、その時点で特定の原因・構成を確認済みとはしなかった。7B報告末尾へフィードバックを追記し、過去の結果・FAILは保持した。

着手後にユーザーから、PC／Chrome、Depth Relay20、ALL LEGEND LV20、MOONLIGHT「finalLV」、Evasive Lv0、死亡直前AP300未満との追加回答を得た。代表比較へD20・Moon S8・Evasive0を含める。正確な残AP、装備★、永続強化、Core／Final選択、被弾源内訳は未確認で、既存の合成Relay fixture（5LEGEND★5 +20、永続強化25等）と完全同一ではない。

## 2. 比較設定と変更境界

専用ローカル入口`umbra-integration.html`の`moonReach=current|wide`だけで指定する。未指定、不正値、重複指定はcurrent。標準機・REGALIAではwide指定もcurrentとなる。通常URLと旧Arenaの既定性能は変更しない。

bootstrapが開始時に確定した値を、通常Contextの凍結requestとinputsへ取り込む。実効getterは現runの正当性と固定requestを照合し、主通過半径へ一度だけ1.5倍を掛ける。途中のURLやHUB選択から性能を読み直さない。既存環境のURL改変拒否は維持する。設定切替は環境終了・RAM破棄・新規ページの開始を通り、同じfixtureの初期位置・AP/EN・成長へ戻る。

| Stage | current通過半径 | wide通過半径 | 通常の離脱外縁 current / wide |
| --- | ---: | ---: | ---: |
| S1 | 60 | 90 | 72 / 102 |
| S2 | 60 | 90 | 72 / 102 |
| S3 | 62 | 93 | 74 / 105 |
| S4 | 64 | 96 | 76 / 108 |
| S5 | 64 | 96 | 76 / 108 |
| S6 | 66 | 99 | 78 / 111 |
| S7 | 68 | 102 | 80 / 114 |
| S8 | 70 | 105 | 82 / 117 |

単位はゲーム内px。REACTOR時の離脱外縁はそれぞれ通過半径＋8。広域候補・厳密sweep・離脱・カード・任意の診断目安は同じ実効getterを使用する。正規Stage配列・S1同一参照、威力、再命中間隔、Fire/SENSOR、主受付回数、PRISM、SINGULARITY、他2武装、body半径22、速度、EN、無敵、Air Brake tunedは維持する。

半径成長時は既存appliedGrowthProfile比較とradiusRebasePendingを利用する。life、lastHit、cursorを新規扱いせず、拡大後の外縁からの再離脱・再進入を要する。持続オーラ化、瞬間停止・反転、被弾取消し、新無敵は追加しない。

常時TEST表示にcurrent/wideとBRAKE tunedを表示する。任意の「ブースト通過距離の目安」はブースト中の短い側方マーカーだけで、巨大な常時円ではない。「被弾しない保証ではありません」と明示し、機体・敵・既存斬撃画像を拡大しない。

## 3. 接触と既存無敵の限定調査

### 実行順と実効値

通常Sceneの入口はArcadeのplayer-enemy overlap → `handlePlayerHit` → `getEnemyOutgoingDamage` → `applyDamageToPlayer`。被弾処理では選択中の保護・既存被弾後保護を確認し、装備等の軽減と丸め、既存AcEvade判定、900msの被弾後保護、Robot Barrier、AP減少・死亡へ進む。選択終了後の保護は既存1200ms。今回これらの順序・数値を変更していない。

Depth6以降の敵攻撃力の生成時倍率は `1.45 × 1.1^(Depth−5)`。D10は約2.335、D20は約6.057、D30は約15.710で、敵種の接触威力に掛けて丸める。その後に該当する契約・敵弱体・装備の被ダメージ軽減等が反映される。試験の一例ではD20 chaserの79が装備軽減後71、Bossの153が138、D30の204が184になった。これは全敵共通の最終ダメージではない。

APは既存の永続強化・CD・装備等を含む開始値にUMBRAの0.4補正を一度適用する。`statsApplied`とContext bindを確認した範囲では、通常接続による二重適用を認めていない。Evasiveの実効窓はLv0で70ms、Lv10で1700ms。実通常UMBRAでAcEvadeによる接触拒否を観測した。ブースト開始直後の窓であり、押し続けた全時間・解除後滑走・Air Brake全体を無敵にするものではない。

vendorの物理stepはcollider処理後にWORLD_STEPを通知する。MOONLIGHTはその通知から有効移動を処理するため、同一stepに重なった接触判定が斬撃受付より先になる。記録でも接触callback → 既存保護による拒否 → Moon受付の順を確認した。入力開始を扱うScene.updateより前の物理stepで既に重なっていた被弾を、後からMoon命中で取り消す仕組みはない。新しい無敵や被弾後のAP復元は追加していない。

### 判定shapeと測定範囲

プレイヤーの実body半径は22。機体画像の翼・先端とは一致しない。敵も表示画像・原寸のbody.radiusだけで測らず、実スケール反映後の円halfWidthまたは矩形境界を用いる。D20 Boss例では実body幅約205.32に対し元のradiusプロパティ約150.22が残り、表示位置には約−34.33のY差があった。主斬撃と接触はこの実shapeを基準に評価する。

追加診断はテスト側だけで、接触・被弾・ブースト・命中の上限付きリングと、最大8体のタグ敵についての物理step後距離を保存する。全敵からの実接触受付とタグ敵の距離は別集団として集計した。player-enemy overlap後にも壁colliderによる位置補正があるため、WORLD_STEP後の一時的な負のgapだけで「接触受付が欠落した」とは判定しない。実callback時の相手shapeは別記録を使う。撮影・JSON出力は測定区間外。

### 死亡原因の分類

| 分類 | 今回確認できた範囲 |
| --- | --- |
| 満APから接触1回で死亡 | 今回の代表構成では未観測。すべての敵・装備で起きないという証明ではない。 |
| 負傷済みAPから死亡 | 通常rAFのD30/S8/E0で観測。AP292から184減少して108、回復で112となった後、別の大きな接触で死亡。回復4を被ダメージ合計と分離した。 |
| 多数の接触callback | 多数が既存900ms保護で拒否された。callback数をAP減少回数へ読み替えない。同じ接触が重複してAPを削る接続不具合は今回未検出。 |
| 弾・床・敵接触が重なった死亡 | ユーザー本人の直前履歴がなく未確定。全複合条件を再現していない。 |

深層の攻撃倍率、低い残AP、Evasive0の開始70msを過ぎた接近や解除後の接触が危険になることを、コードと代表実測が支持する。ユーザー本人の死亡原因を一つに同定した結果ではない。Barrierは今回のfixtureで未解放・吸収0のため、Barrierあり構成の新たな安全性確認とはしない。

## 4. current / wide の戦闘比較

### 初期条件を一致させた制御比較

採用証跡は `contact-controlled2/`。60Hzで既存Game.stepを呼ぶ外部テスト制御で、通常rAFとは別測定。Scene更新順・delta上限・物理step・敵HP・接触・AIは製品のまま。乱数、相対時計、敵のAI期限、カメラ、開始位置・速度・shape・HP、装備・パッシブ・武器・入力列を各ペアで厳密照合した。Scene絶対時刻の起点は別々で、相対時刻の一致を確認している。

開始AP284/284、EN260/260。既存Relayの5部位LEGEND★5/+20、永続強化25等と実Opening選択を使用する合成構成。Moon S8、ASSAULT・EXECUTION・OVL I。Evasiveは表どおりで、全ケースに最大Lvを付けていない。3ペア・6ケースに限定した。

| 条件 | current → wide：斬撃成功数 / タグ敵命中数 | 実接触受付 | AP減少合計 | 開始→終了AP | 接触なし成功ブースト |
| --- | --- | --- | --- | --- | --- |
| D20 / S8 / E0：集団外周 | 3 / 1体 → 6 / 3体 | 0 → 0 | 0 → 0 | 両方284→284 | 2 → 2 |
| D20 / S8 / E0：Boss正面 | 4 / 1体 → 4 / 1体 | 2 → 2 | 276 → 276 | 両方284→12 | 0 → 0 |
| D30 / S8 / E10：壁沿い | 2 / 1体 → 2 / 1体 | 0 → 0 | 0 → 0 | 両方284→284 | 2 → 2 |

死亡はこの6ケースで0。Boss正面では153→軽減後138を2回受けた。AP284→146、回復4で150→12となり、wideでも接触は安全にならなかった。全接触callbackはcurrent74/wide47だが、APを削った受付は両方2。集団外周では、接触を増やさず届くタグ対象が1→3体に増えた。無制限の巻込みや、どの外周でも安全という意味ではない。

ENの開始/最低/終了は各ペアで完全一致した。Boss 260/172.19375/186.81875、集団260/187.20125/201.82625、壁260/179.6975/194.3225。通常の移動・EN・無敵の計算は変えていない。

再離脱が必要な外縁も82→117へ広がる。壁沿いでは全移動距離4308.816608pxが両案で一致し、同じタグ敵の最初の命中から再命中までが2050.000→2083.333ms、命中間移動3121.147843→3141.829947pxとなった。外縁から離れるまでの標本は116.667ms/145.001656px→200.000ms/246.207605px。これは実際に動く敵と入力列での観測点で、理論的な最短距離や、常に33ms遅くなるという保証ではない。

Boss正面では再命中1783.333→2066.667ms、命中間移動1381.780460→2238.284288px。接触・押戻し・攻撃の相互作用も含むため、この差を外縁変更だけの単独コストへ分解しない。詳しい位置・1step移動・EN・命中時刻・実shapeは `contact-summary.json` と各ケース原本に残した。

| 条件 | Scene更新 / 物理step（各案） | 制御経過ms（各案） | 実行wall時間ms current / wide | 最大1step移動px current / wide | タグ敵shapeへの最短距離px current / wide |
| --- | ---: | ---: | ---: | ---: | ---: |
| Boss正面 | 201 / 201 | 3350 | 1434.7 / 1380.3 | 24.249 / 30.503 | 0 / 0 |
| 集団外周 | 183 / 183 | 3050 | 1196.3 / 1178.6 | 38.270 / 38.270 | 46.256 / 48.271 |
| 壁沿い | 192 / 192 | 3200 | 1185.1 / 1216.2 | 38.270 / 38.270 | 20.980 / 25.437 |

距離は機体中心から実敵shapeまでで、接触gapはそこからプレイヤー半径22を引く。Bossの実接触callbackでは最大でも21.639 / 20.240pxで重なり条件に一致した。壁のcurrentのpost-step最短20.980pxは上記の位相差を含み、その瞬間の実overlap受付があったという意味ではない。制御時間3350msを実ブラウザの経過3350msと偽らない。

### 通常rAFによる代表観察

`contact3/` はD10/S1/E0側面、D20/S1/E0接近、D20/S8/E0集団、D20/S4/E10斜め、D30/S8/E0折返し、D30/S8/E10壁、通常D1開始から明示した成長・Gate操作でD6/S4/E0、D20/S8/E0 Boss正面の8組16ケース。短押し・長押しを含む。実時間・自然生成・一部のステージ配置が揃わなかったので、このcurrent/wide差を半径だけの因果効果として採用していない。D1→D6は既存の実選択・遷移経路を使う境界試験で、自然XPと120秒×5を待つ通しプレイではない。

静止継続での追加命中なし、通常移動・滑走・制動・不明経路・壁越しの拒否、成長後の再離脱、lastHit/cursor保持は純試験と既存回帰で別に確認した。これは新しい通常Sceneブラウザだけで全除外条件を再現したという意味ではない。角の保守除外や既知の断続失敗を緩めていない。

### 試験失敗の扱い

contact1のテスト側カード参照誤り、contact2の未補正circle距離、contact3の非同一初期条件を原本ごと保持した。距離を直したcontrol1の後、AI期限・カメラ・乱数の初期一致検証を追加したcontrol2を比較本体に採用した。

contact3の16ケースとcontrol2の6ケースは条件・終了・隔離チェックを満たしたが、runner全体は既存 `browser.close` の10秒timeoutでfalse。各環境END、実StorageデータAPI0、外向き0、pageError0、context.close成功、所有Chrome0/Node終了を別に確認した。全スイートPASSへ読み替えず、過去7Bの終了待ち・微小座標差FAILも保持する。

## 5. カード表面・詳細と実表示

通常UMBRAの専用Unlock/Stage/Core/Final、関連6パッシブ、OVERLIMITだけへプレイヤー向けmodelを付けた。元のoption・onSelect・候補生成・診断description/chipsは保持し、同じ新modelから表面と詳細を描く。旧Arena、標準機、REGALIA、ショップ全体の説明は変更しない。

表面は短い日本語2行、重要差分1〜2個、必要な条件、詳細ボタン。詳細は秒・距離・対象数・強化前後・生成済み攻撃への反映を日本語で整理し、raw/cast/lifeId等の診断文をそのまま表示する方式を避けた。秒と表示丸めだけを変換し、攻撃期限・威力の実値は変更しない。

数値は既存の実効getter、Core/Final/TRIAD/装備の威力計算を再利用する。次Stageの予測は現在の補正を保持して正規Stage基礎値の差だけを渡し、実際にStageを適用した結果との一致を純試験で確認した。戦闘用のStage同一参照guardを緩めていない。Core/Final選択によって新たに成立するTRIADは確定後に更新されるため、カードには「現在の組合せによる値」と明記している。

旧文の出典は実在する旧card builderの出力であり、依頼文の例を旧カードの引用にはしていない。全対応と数値は `card-copy-v1/card-copy-map.md` / `.json` に保存した。以下はその代表的な対応で、詳細欄は要約。

| 対象 | 旧modelの説明またはチップ | 新しい表面 | プレイヤー詳細で残す内容 |
| --- | --- | --- | --- |
| MOONLIGHT Unlock | 「有効ブーストで通過。再攻撃には離脱・再進入が必要。」＋通過半径・外縁・再命中ms | 「ブースト中に近くの敵を斬る。」 | 実移動が必要、主半径、外縁、秒単位の待ち、外へ離れて再進入する条件 |
| Moon S1→S2 | 同じ通過条件の長文＋「基礎威力 +1」 | 「斬撃の威力を高める。」 | 装備等を含めた現在→次の威力。半径が変わらないことも数値で表示 |
| SPIKE Unlock/範囲Stage | 探索と攻撃半径、受付・突き上げ等の説明 | 「地面から角を出し、周りをまとめて攻撃。」／「角が届く範囲を広げ、周りの敵を巻き込む。」 | 探索600と攻撃半径の区別、範囲内各敵に1回、威力・周期を同時強化しない |
| NOVA Unlock | 周回・設置・再生成の長い条件 | 「雷球が自動攻撃。ブーストで1基を設置。」 | 使える雷球が必要、設置・放電・再生成の秒数、次の雷球から反映 |
| NOVA S4/S8 | 枠数・射程等の一覧 | 「雷球が1基増える。」 | 今回の増枠と、既存雷球の即放電・即補充を行わない条件 |
| NOVA S5 / 射程Stage | 各実効値の一覧 | 「雷球の威力を高める。」／「雷球が攻撃できる範囲を広げる。」 | 威力だけ・射程だけ・増枠を区別した現在→次の値 |
| REACTOR | 武装別の待ち・再命中等 | Moonは再攻撃と離脱、SPIKEは次の角、NOVAは戻るまでの待ちを短縮 | Moonは外縁と再進入、SPIKEは発動待ち、NOVAは再生成待ち。EN回復効果と混同しない |
| CONTROL / ASSAULT | 補正条件と倍率 | 「命中した敵の移動を短時間遅くする。」／「この武器の威力を高める。」 | 通常敵/Boss系の減速率と時間、生存敵のみ。威力は対象武器だけ |
| PRISM | 有限分岐の数・距離・内部待ち条件 | 「命中から別の敵へ電撃が分岐する。」＋最大対象数・距離 | 武装別の最大数、発生機会、待ち時間、分岐から再分岐しない |
| SINGULARITY | 領域寿命・上限・受付条件 | 「命中地点に敵を遅くする領域。」NOVAは「雷球の設置地点」。追加ダメージ0 | 領域の数・寿命・減速、NOVAは正常設置で発生し命中不要 |
| EXECUTION | 対象分類・閾値・倍率 | 「強敵や HP の多い敵に高いダメージ。」 | Boss/Elite/Nemesis、残HP62%以上、最大HP36以上のいずれか。即死ではない |
| Evasive | 回避時間等の数値 | 「ブースト開始直後の無敵時間を長くする。」 | 実効秒数、全ブースト時間の無敵ではないこと、既存の再使用条件 |
| OVERLIMIT I/II | 装備・段階・倍率・丸め等の説明 | 対象武器の強化。0差では「今の威力は変わりません。」 | 現在→次の実効威力と上限。資格がある場合だけIIへの前段階と説明 |

「詳細」はクリック/タップ、D、既存padのフォーカス移動とAで開く。詳細中はEsc/D/Bまたは「戻る」で詳細だけを閉じる。左右キー/Enter・画面ボタンでページを送る。1〜4の選択入力は詳細中に無効。選択画面全体を閉じたり、新しいticketやNOVA予約を作ったりしない。古いpointer/key/pad actionは現在のrecordとContextを照合し、差替え後やENDED後には作用しない。

狭幅では3枚を横長3段、4枚では2×2に配置し、詳細は実Textの折返し高さでページ分けする。文字を縮めるだけでoverflowを解決しない。文字サイズはCanvasの実CSS寸法から計算し、内部1pxの余裕を加える。世界カメラ・機体・敵scaleは変更していない。既存のUI ContainerはworldCamera内でスクロール補正と逆zoomを行う構成なので、測定も実world transform・camera zoom・Canvas CSS縮小を掛け合わせる。実在しない独立UI cameraで測ったとはしない。

実画面の最終測定値・スクリーンショット・pointer補正再試験結果は検証節に記載する。初回の13.922 CSS px、合成padのtimestamp前提誤り、次の実pointer伝播FAILは原本を残して修正対象とした。

## 6. 検証・最終成果・未確認事項

### 実カードの表示と入力

`player-cards-browser3/` は最終候補source3を対象に、desktop 215、narrow 221、独立したtouch Opening 24、計460 checks PASS。実カードを撮影し、Text枠内・交差、D/Esc、合成pad A/B、実クリック/タップの開く→戻る、旧callback、pending/ticket/時計/NOVA予約の不変を確認した。pageError、実StorageデータAPI、外向き通信は0。全context・所有プロセスの終了も確認した。

追加の `player-cards-extra1/` はOVL II 16 checks、4択Opening 19 checksの35/35 PASSで、UI計 **495 checks PASS**。OVL IIは既存の合成LEGEND/S8境界からCore/Final/OVL Iを実選択し、明示した合成XPを既存gainExperienceへ渡して正規候補を出した。実callbackによるI→II、通常pendingの1回消費を確認。4択は新環境の合成RAMに既存+1 Ticketを1枚置き、実SORTIEでの消費、候補4枚・確認3回、キー4で確認残り3→2を確認した。詳細を開いたままENDした際の破棄と旧callback失効も通過。いずれも実保存や自然XP到達ではない。

| 表示条件 | 本文・差分の最小CSS px | 詳細の最小CSS px | 補助情報の最小CSS px | 範囲 |
| --- | ---: | ---: | ---: | --- |
| PC 1280級 / current | 20.000 | 20.000 | 画面別原本参照 | 本文・詳細の目標達成、実PNG目視 |
| PC 844×390 / wide | 14.419 | 14.917 | 10.939 | 本文・詳細の目標達成、実PNG目視 |
| 844×390 / OVL II・4択追加 | 14.917 | 14.917 | 画面別原本参照 | 正規候補と合成Ticketの境界試験、実PNG目視 |

補助情報まで14pxを達成したという意味ではない。物理スマートフォンの実機確認ではなく、PC Chromiumの指定viewportでの表示確認。touchは別のOpening入力試験で、既存モバイル開始導線によるCanvas配置とTEST帯の重なりがあるため、touch画面全体の可読性合格へ一般化しない。実ゲームパッド機器は未使用で、ブラウザのGamepad経路へ合成デバイス入力を与えて検証した。

代表画像（縮小表示ではなく、ファイルの原寸も確認）：

- [PC Opening](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-browser3/desktop-opening.png)
- [844×390 MOONLIGHT Core](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-browser3/narrow-0-umbraMoonlight-stage4.png)
- [844×390 プレイヤー詳細](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-browser3/narrow-opening-details.png)
- [844×390 NOVA Final](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-browser3/narrow-5-umbraPhantomNova-stage8.png)
- [844×390 OVERLIMIT II](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-extra1/narrow-overlimit-ii.png)
- [844×390 4択Opening](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-cards-extra1/narrow-four-opening.png)

40カードの旧文→表面→詳細、最終ハーネス2本のhash、全画像・旧FAILへの案内は [player-card-evidence-index.md](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/player-card-evidence-index.md)。UI基本harnessは `44dd01e6c3ec81b5451593c382a489e18500fb5ae564e6df7c8b30bde14bf4de`、追加harnessは `2e26e52ac481d5d84b9d57ddc86a1667596112ada78bf177a34ce10160a3ada4`。

最初のplayer-cards-browser1は細幅一部13.922pxと合成padの入力前提失敗。padはtimestampがPhaserの生成時刻より古く、wrapperへ反映されていなかったことを確認し、vendor/製品を変えず試験側のtimestampを修正した。player-cards-browser2では文字目標を満たしたが実pointerの詳細操作が親カードを選んだ。source3で通常UMBRAの詳細領域を優先し、同じpointerupの二重処理を防止した。直近イベント1件だけを保持し、teardownで解放する。旧2機体の選択優先順は変えていない。過去のFAIL原本は保持する。

### 純試験・関連回帰・通常rAF

通常rAFは `performance-source3-r3/` の3条件を直列で測定し、他の自動ブラウザや重い試験を並行しなかった。各条件で実Openingを4秒間表示した後、実選択3回を経てMoon S1の通常戦闘を予定20秒観察。元からいる4体に、既存spawnEnemyで8体を追加配置した合成負荷で、HP・AI・接触は変更しない。自然生成・自然レベルアップは継続。初期stats、選択結果、全敵配置・shape、カメラ、表示設定、意図した100点の入力列は厳密一致した。

CPUは既存TimeStepに登録されたGame.step callbackの開始〜終了。Scene/物理/描画と少量の命中記録コストを含むが、外側の配列push、JSON出力、撮影は区間外。rAFは隣接する実コールバックtimestampの間隔で、最初の観測開始からのoffsetは別記録。詳細snapshot観測器は測定前に解除し、1秒ごとの小さな数値記録だけにした。外れ値は除去していない。

| CPU区間 / 設定 | サンプル数 | 平均ms | 中央値ms | p95ms | p99ms | 最大ms | 100ms以上 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Opening静止 / 旧版current | 241 | 2.273 | 2.200 | 2.700 | 2.900 | 4.000 | 0 |
| Opening静止 / 新current | 241 | 2.178 | 2.100 | 2.600 | 3.500 | 5.900 | 0 |
| Opening静止 / wide | 240 | 2.345 | 2.200 | 2.900 | 4.400 | 6.700 | 0 |
| 戦闘 / 旧版current | 1224 | 6.500 | 6.700 | 8.600 | 10.500 | 12.200 | 0 |
| 戦闘 / 新current | 1223 | 6.640 | 6.400 | 10.400 | 12.900 | 22.500 | 0 |
| 戦闘 / wide | 1225 | 7.339 | 6.900 | 10.500 | 12.100 | 14.000 | 0 |

| 戦闘rAF / 設定 | サンプル数 | 平均ms | 中央値ms | p95ms | p99ms | 最大ms | 100ms以上 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 旧版current | 1223 | 17.062 | 16.700 | 16.800 | 16.900 | 500.000 | 1 |
| 新current | 1222 | 17.049 | 16.700 | 16.800 | 16.800 | 483.300 | 1 |
| wide | 1224 | 17.062 | 16.700 | 16.800 | 16.800 | 500.100 | 1 |

Openingでは物理step0、AP/EN/戦闘clock/pendingの消費0で比較できた。rAFも100ms以上0、最大16.9/17.0/16.9ms。本文・レイアウト改修後にこの短い停止区間で大きなCPU増加は観測されなかったが、長時間の快適さの保証ではない。

戦闘の実測wall時間は約20.882/20.853/20.899秒、Scene更新1224/1223/1225、物理step1156/1023/1153。主受付・撃破は12/17/21、広域候補119/165/211、厳密幾何301/370/473。実入力時刻、自然のカード停止、最終AP/EN・敵数は一致しなかった。よって戦闘CPU差を文字変更だけ・半径だけの純コストに帰属させず、結果同一の証明にも使わない。wideで命中数が増えること自体は意図した差であり、一致を強要しない。

各戦闘で観測した483〜500msのrAF間隔の原因は今回同定していない。CPUが小さいことだけでGPU待ち・ブラウザ外処理を推定せず、過去Phase4のGame.step全体遅延が解消したとも言わない。今回の性能runnerのPASSは機能・隔離・比較開始条件の合格で、性能の最終合格ではない。

各OpeningのGameObject数は48→48 / 36→36 / 36→36、listenerは109のまま、Timerは2→1。戦闘では自然生成と選択が進むためObject数・listener数の増減も残した。3環境とも終了・context.close成功、所有Chrome0、実StorageデータAPI/外向き通信/pageError0。初稿のfresh出力判定順とSTART前Phaser RNG待ちの2つのハーネス前提失敗は測定開始前のもので、`performance-source3` / `-r2` に原本保持した。

最終source3の純試験は **448/448 PASS、skip0**（既存431＋Reach7＋カード10）。`pure-source3/pure.txt` と `manifest.json` に対象15ソース・harness・実行前後不変を記録した。既存期待値の一括緩和は行っていない。

`regression-source3/` の既存ブラウザ11ジョブは10 PASS・1 FAIL。そのFAILを補足試験へ隠して全11 PASSとはしない。

| 回帰 | 結果 |
| --- | --- |
| 旧Moon / Growth / Core / Final | PASS。Moon105ケース、Core60、Final51を含む既存条件 |
| 旧SPIKE / NOVA / TRIAD / 装備統合 | PASS。SPIKE261、NOVA122、TRIAD21等の既存行列 |
| 標準機 / REGALIA | 2機体の隔離Arenaパッシブ候補・HUD PASS。通常UMBRA専用modelの対象外は純試験と条件分岐の読取で確認 |
| 通常Scene lifecycle | 11 checks PASS。終了snapshot、cleanup、RAM HUB再出撃等 |
| 既存normal-adoption | 14項目目のnewspawn Moon命中でFAIL。前13項目はPASS、終了・隔離・pageError0 |
| 新しい限定adoption補足 | 21/21 PASS。実カード確定後の通過、両敵×全3武装の実命中、life/lastHit/DEP債務を再確認 |
| 明示wideでの実Gate補足 | 23/23 PASS。上記21項目に加え、開始時とDepth2移行後のS1半径90・外縁102を確認 |

既存adoptionの直接原因は、DEP債務待ちの間に正規XPカードが発生したのに、ハーネスが通過入力後までカード確定を待っていたこと。rawのnewspawn near/cross操作は前後ともSUSPENDED・worldPaused=true・block=PAUSED・pending1で、45step入力後もプレイヤー位置が配置直後のまま、敵HP324も不変だった。LOSや今回のwide変更を原因にしていない。

旧ハーネスとFAIL原本はそのまま残し、`tests/umbra-reach-adoption-browser.cjs` に限って、債務待ち後・通過前に実カードを確定する待ちを追加した。ACTIVE/world再開・実移動・物理step増加を明示assertしてから同じ実攻撃を確認。敵HP、時計、候補、攻撃設定、許容誤差は変更しない。補足は `adoption-supplement-source3/integration-adoption.json`、harness SHA-256 `9a6e6e66cd37d228474be116300a796e1385e4d8a3e7b85b31b22f755eac4868`。21項目と終了・隔離はPASSで、別の自然プレイ全体へ一般化しない。

その後、同じ補足へ `UMBRA_ADOPTION_REACH=wide` の明示指定と半径assert2件だけを加え、`?fixture=complete&moonReach=wide` で1回確認した。開始と実Gate後のS1半径90・外縁102、両敵×全3武装の受付、life/debtと終了を23/23 PASS。`adoption-wide-source3/integration-adoption.json`、最終harness SHA-256 `3eb926e66bdc76b1afe86753f9c15215ebd70d437c1d43078d3fe7b0e12aa650`。current当時のハーネスはその出力内のharness/へ保持。wideもpageError・実StorageデータAPI・外向き通信0。D1→D2の実遷移境界であり、全Depthの自然到達を一度に証明したとはしない。

性能の詳細集計は `performance-source3-summary-v2.md` / `.json` を参照。敵への `counts.hpDamage` はoverkillを含む受付値なので、実HP減少とは別集計。約500msのrAF標本は各戦闘開始約490〜506ms後の隣接間隔で、初回offset5.7〜6.5msと区別している。原因は未確定のまま残す。

`combat-body-audit-source3.json` ではbaselineから、接触/移動/EN/無敵33、Moon幾何・主受付・trace41、SPIKE/NOVA47、Gate life/再命中/債務12、共通damage/CONTROL/Final22、成長commit/queue12の本文を照合し、重複除外162メソッドが同一だった。終了snapshotはmoonReach診断1項目だけの追加と別に検証した。

制御接触を測ったsource1からsource3の既存3390メソッドでは3385が同一で、5件のカードUI変更のみ。15凍結ファイルのうちgame.js以外14件も同一。これと純試験を、同じ確定構成・時計・戦闘入力で文章を理由として戦闘計算を変えていない根拠とする。全UI入力を同一結果とする主張ではなく、詳細クリックの選択伝播は今回意図して修正した挙動差。

### 変更したファイルとソースの対応

| ファイル | 今回の変更 |
| --- | --- |
| `game.js` | run固定の主半径倍率、任意の距離ガイド、通常UMBRAカードmodel/詳細/レイアウト/入力安全、終了時の詳細破棄、変更モジュールの読込版 |
| `umbraIntegrationBootstrap.js` | 専用queryのcurrent/wide既定・不正値処理、固定値、比較リセット、ガイド設定、TEST表示 |
| `umbra-integration.html` | 比較選択・目安設定、コンパクトなTEST帯と狭幅設定欄、変更assetの版 |
| `umbraDriveRuntime.js` | 旧Arenaへの既存borrow経路へ新半径helper名を追加。旧Contextでは倍率1 |
| `index.html` | game.jsの読込版だけ更新 |
| `README.md` | 正確な比較入口と新報告の案内 |
| `docs/umbra-phase7b-report.md` | 人間フィードバックと後の追加条件を末尾へ追記 |
| 本報告・新規 `tests/umbra-moon-reach*` / `umbra-moonreach-*` / `umbra-player-cards*` / `umbra-reach-performance-*` / `umbra-reach-adoption-browser.cjs` | 比較・カード・接触・負荷・選択待ちを補ったGateの限定試験と記録。旧試験原本は保持 |

| 凍結ソース | game.js SHA-256 | 使用した結果 |
| --- | --- | --- |
| baseline | `aaa12cd821db595b720334024b173999e55fb3d5b2111ccad6270f95f46b93ce` | 着手前431純試験、旧版比較 |
| reach-source1 | `e888e8cda073cd93e827e289e60051afd997c2aeffffaba58c67437e38efd65e` | 通常rAFの接触観察 |
| candidate-source1 | `4f4b5b595ce7559d54c3dc5cc3e6b14ad9fb8fedb93b750185752af56a0411f1` | 447純試験、同条件の制御接触比較、最初のUI |
| candidate-source2 | `bf704284babafe9a7f2de8a68b02b2297d79682995fc87717d0c6ca2b1aa1d5b` | フォント余白修正後のUI、pointer問題の検出 |
| candidate-source3 | `8a3352cd08496880202384e0e7c34f04f9f01b1ff3745828a57dc660dd8d7e7d` | pointer修正後のUI・最終候補。3,538,383 bytes |

source3の他の変更配信ファイル：bootstrap `ca16f88ddafa596d1f90a57a51b0d2ae4006cc53e61cd7f619beb4369765bad3`、DriveRuntime `7905f427360babb3873538b46a154fcd80a390b058c9b52b3f62e9995070b7e4`、integration.html `78646feaa776050f24918884c76650b43d83d9b6f44b681a0e91b5de8cdbade2`、index.html `46f7db5aa5c7725325a854a55c9307d8720d60dd20839393fa30f27c509f27fa`。

全15配信ファイルのhashは各 `*-manifest.json`、各実測harness hashは個別reportに結び付けた。画像・vendor・未変更定義の読込版を変更していない。HTTP bytes、構文、diff、保護監査は別JSONに保存した。

source3について `candidate3-http-bytes.json` でローカルHTTP配信と凍結bytesを16/16一致（15ファイル＋vendor）と確認。`candidate3-validation.json` で必須game.js/skillDefinitions.js/stageDefinitions.js/equipmentDefinitions.jsを含む14ファイルの `node --check` と `git diff --check` が終了0。

追加UIハーネス完成後の `final1-validation.json` は15ファイルの構文・diff checkがPASS。`final1-protection-audit.json` では開始時191ファイルのうち184がbyte不変で、変化は上記の既存7ファイルだけ。HEADも開始時と同じ。画像27枚・姿勢metadata、AGENTS.md、vendor、定義類、既存試験を保持した。

構文検査で実行した必須コマンドは `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`node --check equipmentDefinitions.js` と `git diff --check`。これに変更JS/新規CJSを加えた検査を上記validationに保存した。純試験はNode test runnerの直列実行、ブラウザは既存Playwright/Chromiumと専用ローカルHTTPを使用し、依存を追加していない。各ブラウザは `UMBRA_TEST_SOURCE_ROOT` で凍結ソース、`UMBRA_TEST_OUTPUT` で新しい出力先を指定して実行した。

全補足ハーネス完成後の `final3-validation.json` では16ファイルの構文と `git diff --check` がPASS。検証担当の [集約v2](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/test-completion-source3-v2.json) と [実測251ファイルの索引](H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b_adjustment/2026-09-09-204556-start/test-artifact-index-source3-v2.json) に各結果を接続した。全担当のブラウザは終了済み。

納品時のソース・新規harness・本文のhashは `final-delivery-manifest.json`、今回のbaselineコピー・失敗・成功を含む保存物全体は `evidence-artifact-index.json`。これらの索引は全試行PASSという意味ではなく、失敗も含めて結果を対象bytesへ結び付けるための記録である。

## 7. 人間が比較する入口と操作

- 現状：<http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=current>
- 1.5倍案：<http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=wide>
- 基礎値から通常進行：<http://127.0.0.1:4173/umbra-integration.html?fixture=baseline&moonReach=current>。比較案は末尾をwideにする。

1. 専用入口を再読み込みし、上部のMOON current/wideとBRAKE tunedを確認する。「START / 本編HUBを開始」から本編HUBの「SORTIE PREP」へ進み、既存Openingの3回選択を行う。
2. Relay20も通常の新run開始はMoon S1。他武装・Finalが完成済みの開始とは区別する。Stage8を手早く比べる場合は「試験設定・状態」を開き、「Opening後：合成完成構成を適用」を明示的に使う。全3武装S8を合成する境界操作で、Core/Finalは実カードから選ぶ。今回のMoon単独の自動比較と同じ武装構成を再現するボタンではない。
3. Evasive未取得条件ではOpening等でEvasiveを選ばず、HUD/詳細の実Lvを確認する。ほかの選択、FX、装備fixture、敵の接近方向も揃える。合成fixtureはALL LEGEND +20に加えて★5・永続強化25等を含むので、実プレイ装備との違いを確認する。
4. PCはWASD/矢印＋Shift/Space。まず敵集団の外側を通る距離、次に離脱して折り返す距離を比較する。任意の通過距離ガイドは設定欄でONにできる。ガイドは攻撃が届く目安で、接触無効の境界ではない。
5. current/wideを切り替える時は設定欄の「MOON距離」を変更する。現在のRAMを破棄して新規試験へ戻る。開始位置・EN・成長もリセットされ、移動中に性能だけを差し替えない。自然生成や実入力時刻は人間の再試走では同一にならないため、手触りの比較として扱う。
6. カードは短い表面を読み、詳細をD/クリックで確認する。詳細を閉じてから1/2/3、クリック、またはpadで選択する。終了は「試験sessionを終了」。通常ゲームへ移るリンクも先に試験環境を終了する。

## 8. 判断が残る点と今回の停止位置

wideは集団外周で巻き込みを増やす効果を確認できた一方、Boss正面・Evasive0で保護終了後の接触リスクが残った。再攻撃には従来より広い外縁から離れる必要もある。wideの正式採用、専用保護の必要性、深層全体の難度合格は人間の再確認待ち。

今回、接続不具合と断定して先行修正すべき二重AP適用やEvasive不適用は発見されなかった。追加保護案を実装する判断には、ご本人の残AP、敵種、開始前から重なっていたか、接触/弾/床のどれだったかという短い履歴が必要。命中後に無敵を付けても、その前の物理stepの最初の被弾を防げるとは扱わない。現時点では新しい保護方式・持続時間の採用案までは確定しない。

購入・永続保存・通常公開・Phase 7Cへ進んでいない。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZE、Depth/Gateの報酬規則とリセット規則は変更なし。新保存キー/schemaなし。実StorageデータAPI・本番アカウント・外向き通信を使わず、専用RAM内の試験のみ。commit/push/deploy/reset/clean、依存追加、vendor・AGENTS.md・Firestore rules変更は行っていない。

Phase 7B補正：MOONLIGHT範囲比較・カード説明改善の実装結果。
専用無敵、購入・永続保存・通常公開は未着手
