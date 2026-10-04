# KGK-02 UMBRA SERAPH — Phase 4補足：成長要望と遅延調査

2026-09-06。今回の範囲は成長要望の記録と計測による切り分けまで。**製品のJavaScript・設定・画像は変更していない。** 大きな遅延は、攻撃なし・追加snapshotなし・FX OFFでも再現した。再現時の長時間区間を描画／texture更新の同期呼出まで絞ったが、GPU・ドライバー・OS内部の待機原因までは確定していない。正式性能・滑らかさの合格とは扱わず、成長実装・PHANTOM NOVAには進まない。

**1. 成長要望と開始時の保護**

ユーザーの「SPIKEのレベルが上がると範囲が拡大し、複数モンスターを巻き込むようになると面白そう」という感想を、[成長要望メモ](umbra-bloodspike-growth-notes.md)へ別記した。武装Stageによる攻撃半径の成長であり、現行S1半径80の複数命中を維持する。未承認候補はS1:80、S4:110、S6:135、S8:160。探索距離600、プレイヤーLv、Depthとは別で、中間Stage・威力・周期・Mutationは未確定。生成済みcastの位置・半径を固定し、次castから反映する方針、判定と地面・角の表示の対応、castと敵個体ごとの最大1回受付、MOONLIGHT／将来のNOVAとの役割も記録した。正式stages、候補カード、保存には追加していない。この感想をPhase 4全項目・性能の最終承認へ読み替えない。

AGENTS.md、README.md、[過去のPhase 4報告](umbra-phase4-report.md)と実装・生データを確認。HEADは開始・終了とも `28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始game.js SHA-256は依頼指定の `85093a6d5121846fc3988854ec5737f98808e3f4b1862efdb4edcb94194db96e` と一致し、終了時も同一。README/game/index/skillDefinitionsの既存変更と、未追跡のPhase 1～4 module・docs・tests・27 PNGを保持した。開始記録は `.tmp_umbra_phase4_supplement/start-head.txt`、`start-status.txt`、`start-hashes.json` と `baseline/`。比較対象はこの作業開始状態であり、Git HEADへ戻す操作ではない。

今回変更した既存ファイルはREADMEへの案内追加だけ。新規ファイルは本報告、成長要望メモ、`tests/umbra-phase4-latency-browser.cjs`。新しい生データ・集計は別ディレクトリへ保存した。旧Phase 4報告・旧ハーネス・旧JSONは上書きしていない。commit、push、deploy、reset、clean、依存追加、vendor・AGENTS変更は行っていない。

**2. 計測範囲と条件**

ブラウザはChromium headless shell **148.0.7778.96**、Phaser **3.70.0**、1280×800。WebGLは `ANGLE / Vulkan / SwiftShader Device (Subzero)` と報告されたソフトウェア描画環境。実機GPUや人間の表示画面の測定とは区別する。ブラウザ試験は1つずつ実行し、他の自動ブラウザ試験を並行させていない。ローカルHTTPだけを許可し、外部リクエストとStorage APIを遮断したfresh contextを使用した。実セーブ・本番アカウントは使用していない。

全比較はUMBRA baseline、empty arena、接触ダメージOFF、同じカメラ設定・開始位置・満EN。敵の実HPを変えず、elite HP14を使用した。先頭16体は `x=600+(i%4)*10, y=490+floor(i/4)*10`。残りは `x=600+floor(i/16)*70, y=1200+(i%8)*30`。配置・当たり判定・ダメージ受付は既存arenaを使う。後方の敵も描画更新・対象管理から除外していない。

| 試験 | 入力・期間・回数 | Game.step内に含むもの | 外側／省略するもの |
|---|---|---|---|
| 過去Phase 4 load | 単体は静止、併用だけ右DASH。16/128/512、初回＋反復2回 | Scene、物理、詳細WORLD_STEP snapshot、通知JSON clone、描画 | 帰還後snapshot・最終JSON出力は直接含まない。入力条件が異なるため武装追加コストの対照にはしない |
| A：旧詳細observer付き | 16/128 × なし/MOON/SPIKE/併用。各初回＋反復2回。全構成とも最初50ms中立、その後900ms右＋DASH。60Hz論理時刻57回 | 上記observerを再利用し、共通の区分timerを追加 | 敵生成・reset、帰還後snapshot、数値記録、ファイル出力は外側。旧ハーネスそのものの完全再実行ではない |
| B：追加observerなし | Aと同じfixture・入力・57回。A/B順を武装ごとに反転 | 同じ製品攻撃、FX、HUD、既存通知A/B consumer、共通timer | テスト独自の詳細WORLD_STEP記録・通知clone・帰還後の詳細snapshotだけ省略。製品内snapshotは保持 |
| FX/HUD要因比較 | 再現済み128体・併用・B、同じ57回、各3回 | 同じ攻撃・物理。変更する表示要因以外は保持 | 画像→簡易→FX OFF。別軸でHUD表示OFF、さらにstatus HUD更新OFFを比較 |
| C：通常rAF | 128体、4武装、各5秒×3回。中立→右DASH→950ms以後全解除 | 通常TimeStepのrAF・delta補正と同じ攻撃/表示、軽量区分timer | 強制Game.stepループなし。入力は到達した実callbackで適用し、実時刻を残す。実施時間と論理57回を同一視しない |
| dispatch間隔の追加対照 | 128体・併用・B、連続→待ちあり→待ちあり→連続、各3回 | 57回の論理時刻・入力・物理・描画が同じ | 待ちありは各step後にsetTimeout(16.667ms)。待ちはwallMs外。正確な60Hz表示試験ではない |
| 起動待ち後rAF | 128体・併用のみ。敵なし通常rAF120回後、同じfixtureをresetし10秒 | TimeStep設定は変更せず、起動補正終了後を確認 | 待機・resetは測定外。この1区間を4武装の追加比較や長時間保証に使わない |

CPU側の `performance.now()` 差分は同期呼出の経過時間で、CPU占有時間やGPU完了時間ではない。主区間は `SceneManager.update → Drive.sys.step → PRE_UPDATE / UPDATE event / sys.sceneUpdate / POST_UPDATE` と `renderer.preRender / SceneManager.render / renderer.postRender`。UPDATE eventはClock、Tween、World等を含み、World単体とは表示しない。World.stepだけではWorld.update内の初回物理stepを捕捉できないため、実WORLD_STEP回数を別記した。すでに束縛されたScene.updateではなくsys.sceneUpdateをラップし、イベントの順序を変更していない。

制御試験の各rowにも `rawDelta / smoothedDelta` は記録されるが、これは停止前のTimeStep値であり、この列を制御57回の更新間隔として集計しない。制御試験で実際に渡したdeltaは別列の16.666…ms、物理は各frame 1stepである。

下位区間はSPIKE observer入口全体、MOON receiver入口全体、Trace入口、Arena更新、敵Graphics、FX、HUD、全Text更新、canvas texture更新。後続の要因比較から同期WebGL呼出も計測した。親子はinclusive時間であり加算しない。既存 `spikeCoreMs / moonCoreMs` は最後の物理stepの内部timerで、0step時には前値、複数step時には最後の値になる。frame全体は今回の `spikeEntry / moonEntry` を使用する。

測定中にスクリーンショット、ファイル保存、巨大な最終JSON生成、console出力は行わず、contextの全計測終了後に出力した。Aで必要な詳細記録だけは意図的に残した。共通数値captureの直接時間はA/B最大0.4ms、他群最大0.2msでGame.step外。Aの追加observer直接時間は16体で平均0.0175／最大0.2ms、128体で平均0.0225／最大0.1ms。帰還後snapshotは最大0.2msでGame.step外。wrapperの呼出と時計読み取り全体を無計測の対照で較正した試験ではなく、その負荷は共通計測に含まれる。約0.1msの時計量子化にも注意する。別のブラウザトレースは採取していない。

**3. 同条件の測定結果**

以下の単位はms、percentileは昇順のnearest rank、中央値は偶数なら中央2値の平均。初回と反復を含み、外れ値を除外していない。A/B各行171 samples＝57×3。生データには各repeatと各frameの実時刻を保持した。

|条件|n|平均ms|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|16 / none / A|171|4.705|1.800|3.000|7.400|463.900|1|
|16 / none / B|171|4.716|1.600|2.800|7.500|494.200|1|
|16 / moonlight / A|171|4.924|1.800|3.200|7.400|491.900|1|
|16 / moonlight / B|171|4.962|1.800|3.300|7.600|503.700|1|
|16 / bloodSpike / A|171|4.801|1.800|3.600|7.400|476.300|1|
|16 / bloodSpike / B|171|4.812|1.800|4.000|7.700|482.500|1|
|16 / both / A|171|5.076|1.900|3.800|8.100|499.800|1|
|16 / both / B|171|5.033|1.900|3.600|7.400|500.400|1|
|128 / none / A|171|9.283|5.400|6.700|16.200|668.300|1|
|128 / none / B|171|9.139|5.200|6.700|15.900|668.500|1|
|128 / moonlight / A|171|9.552|5.800|7.200|16.900|671.200|1|
|128 / moonlight / B|171|9.471|5.600|7.300|15.900|671.000|1|
|128 / bloodSpike / A|171|9.306|5.400|7.800|15.900|661.800|1|
|128 / bloodSpike / B|171|9.258|5.400|7.500|15.700|656.700|1|
|128 / both / A|171|9.622|5.600|7.500|16.200|678.000|1|
|128 / both / B|171|9.573|5.800|7.400|16.000|661.200|1|

A/B全2,736 samples中16点が100ms以上。全条件で反復2回目に1点ずつ発生した。16体は全8 contextのindex25、128体は全8 contextのindex17。初回・反復1回目の各57点には100ms以上なし。「初回画像ロードだけ」という説明とは一致しない。初回／反復別の平均・最大は `.tmp_umbra_phase4_supplement/analysis/new-ab-audit.json` に保存した。

同N・同武装・同repeatのA/B **24組でfinalState完全一致**。全敵HP・位置・active、プレイヤー位置・速度・EN、攻撃カウンター、Scene/物理回数、通知hashを比較した。4武装間でも位置・速度・EN、Scene57回／物理57回は一致。全ケースの撃破は0。

| 武装 | SPIKE cast/impact/受付 | MOON受付 | 先頭16体の残HP | 後方の敵 |
|---|---|---:|---:|---|
| なし | 0/0/0 | 0 | 14 | HP14 |
| MOONLIGHT | 0/0/0 | 16 | 10 | HP14 |
| BLOOD SPIKE | 1/1/16 | 0 | 9 | HP14 |
| 併用 | 1/1/16 | 16 | 5 | HP14 |

要因比較も各行171 samples、128体・併用・B。FX OFFは既存の武装FXとダメージ数字の表示条件で、攻撃・命中判定を止めない。HUD `hidden` はuiCamera.visibleだけをOFF。`updates-off` はhidden条件からstatus HUD文字列更新を止めた条件で、Traceのworld線更新・寿命処理、敵caption、武装描画は保持する。「全診断OFF」ではない。

|条件|n|平均ms|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|image / on|171|9.856|5.800|7.900|16.700|674.400|1|
|fallback / on|171|9.505|5.700|8.000|15.900|640.200|1|
|off / on|171|9.471|5.700|7.200|16.300|656.300|1|
|image / hidden|171|9.191|5.500|7.700|16.500|623.300|1|
|image / updates-off|171|8.784|4.600|6.400|13.800|721.000|1|

5条件の各repeatをimage/onの同repeatへ照合し、移動・EN・HP・受付・cast・通知を含む**全15結果が一致**した。HUD文字列更新を止めると中央値は5.8→4.6msになったが、大きな停止は残る。短い順序付き試験であり、この差を全端末の改善値とは扱わない。

通常rAFは実時間約5秒を各3回。Game.step時間と独立したrAF callback timestamp間隔を分ける。

|条件|n|平均ms|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|none|539|5.895|5.900|7.200|8.000|15.800|0|
|moonlight|525|6.337|6.200|7.900|9.500|16.300|0|
|bloodSpike|535|6.516|6.500|7.800|9.600|14.100|0|
|both|532|6.838|6.800|7.800|9.800|14.300|0|

|条件|n|平均ms|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|none|536|28.077|33.300|33.400|33.400|66.600|0|
|moonlight|522|28.926|33.300|33.400|33.400|66.700|0|
|bloodSpike|532|28.351|33.300|33.400|33.400|66.700|0|
|both|529|28.480|33.300|33.400|33.500|66.700|0|

通常rAFの全2,131 Game.stepと2,119 rAF間隔で100ms以上は0。ただしrAF中央値は33.3ms、最大66.7msで、60fpsや滑らかさの合格ではない。callback間隔は画面の実present間隔ではなく、headlessで人間が見た結果でもない。敵生成はGame.step外だが、その時間はrAF間隔に含まれる。各 `setup` に生成費用と時刻を保存した。

通常rAFでは同じ予定入力を次のcallbackで適用する。DASH開始実時刻は50.0～66.6ms付近、解除は950.0～983.3ms付近で、完全に同時刻の入力が届いたとは扱わない。Scene173～181回、物理212～225回。MOON取得時は各16受付。SPIKE取得時はcast2／impact2／受付32で、併用のみSPIKEで16撃破、他は撃破0だった。自然な撃破後の敵数・drop差も含むため、この5秒の平均差だけを武装追加の純粋な費用と断定しない。厳密な入力と最終結果比較は上記の57回制御試験を使用する。

実vendorのTimeStep.startは `_coolDown=120` に戻り、最初の120 callbackでraw deltaをtarget約16.667msへ抑え、その後も10値の履歴平均を使う。今回のrAF各repeatはloopを再開始したため、この既存起動補正を毎回受けた。raw約5秒に対し、渡されたdelta合計は3547.1～3750.6ms。全2,131行でこの補正式の再計算とcallback deltaが一致し、持越しworld._elapsedを含む物理回数も一致した。証跡は `analysis/raf-smoothing-audit.json`。移動のdelta上限は現行50msで今回未到達であり、32ms上限やSPIKE独自の間引きによる差ではない。

起動補正が終わるまで敵なしで通常rAF120回（約2020.1ms）進め、再度fixtureだけをresetした追加区間では、実時間10060.4ms、Scene329／物理600回。Game.stepは平均7.745、中央値7.7、p95 9.2、p99 11.5、最大15.9、100ms以上0/329。rAF間隔は平均30.588、中央値33.3、p95/p99 33.4、最大66.7、100ms以上0/328。SPIKE cast1／impact1／受付16、MOON受付16、撃破0。通常の時間進行では移動距離が変わり後続の探索結果も異なったため、起動直後5秒の攻撃回数・平均との優劣比較には使わない。

描画要求を連続で出す実行方式を追加で比較した結果は以下。全条件で同じ57回・論理950ms、同repeatのfinalStateは連続／待ちあり／反転した順序を含む4 contextで一致した。

|条件|n|平均ms|中央値|p95|p99|最大|100ms以上|
|---|---:|---:|---:|---:|---:|---:|---:|
|controlled|342|9.542|5.600|7.700|15.700|686.200|2|
|paced|342|6.517|6.500|8.100|11.100|16.300|0|

連続→待ちあり→待ちあり→連続の順で、連続条件の反復2回目に686.2／670.4msが再現。待ちあり6区間342点では再現しなかった。待ちありの実区間は1875.1～1892.2ms、連続は324.9～1012.8msで、論理950msと実処理時間は違う。攻撃回数や入力、敵数を減らした比較ではない。この結果はdispatch頻度との関係を支持するが、待機を挟めば全環境で解決するという証明ではない。

**4. 遅延が起きた区間と原因の確度**

過去の1,026点／18外れ値／最大800.3msはそのまま保持した。最大点はSPIKE単体128体・反復2回目index27、cast生成後300ms、impactの100ms後、物理1step。前後でcast1／impact1／受付16／HP差分80は不変だった。18点すべて物理1stepで、うち3点はcast生成前。旧データだけでは描画・GC・待機のどこが支配したかは判断できず、今回の内訳を過去の全点へ遡って割り当てない。Phase 3の565.3msとは範囲が違うため悪化率は算出しない。

新A/Bの16外れ値のうち14点はSceneManager.render（463.0～676.9ms）が支配。残り2点は16体・併用のA/Bで、Arena HUD内のText更新→updateCanvasTextureが497.6／498.5msを占めた。従来のSPIKE内部timerだけでは捕捉できなかった区間である。

後続のGL計測付き試験では次の7点が発生した。全て物理1stepで、CPU側の同期WebGL bufferData呼出が長かった。raw JSONには全frameのScene/物理前後回数、実開始/終了時刻、攻撃累計、Timer等を残した。

|suite/context/repeat/index|whole|sceneRender|HUD|bufferData|texImage2D|physics|
|---|---:|---:|---:|---:|---:|---:|
|factors-1/1/2/17|674.400|672.600|1.100|668.300|0.200|1|
|factors-1/2/2/17|640.200|639.300|0.500|634.900|0.100|1|
|factors-1/3/2/17|656.300|655.200|0.600|650.900|0.400|1|
|factors-1/4/2/46|623.300|621.900|0.700|618.300|0.000|1|
|factors-1/5/2/47|721.000|720.500|0.000|717.000|0.000|1|
|cadence-1/1/2/17|686.200|685.100|0.600|681.800|0.000|1|
|cadence-1/4/2/17|670.400|669.400|0.500|665.600|0.100|1|

- **確認できたこと:** この環境では攻撃なし、B、簡易FX、FX OFF、HUD文字列更新OFFでも100ms以上を再現した。大きな停止の支配区間は描画またはtexture更新の同期呼出で、後続7点ではbufferData内に618.3～717.0ms滞在した。物理のcatch-up連打、SPIKEの多重impact、追加observer直接時間の増大とは一致しない。既存HUDには毎frameと約40ms更新の重複、およびPhase 4で従来文字列を作った後に再設定する処理がある。
- **支持する証拠があるが未確定:** SwiftShader環境で、描画要求を同期ループから連続投入することと、描画命令処理・転送時の待機の関係。予定入力・結果を保ったdispatch比較で再現／非再現／再現となった。snapshot除去だけが原因を取り除いたという説明は支持されない。
- **判断できないこと:** GPU処理そのものの時間、ドライバー・コマンド待ち・OSスケジューラ・GCの寄与率、実GPU搭載ブラウザでの同じ現象、旧18点それぞれの内部原因。CPU側の長いGL呼出だけでGPUの待ち時間を数値化しない。通常rAFで今回は再現しなかったことを「解消済み」としない。

**5. 製品と検証側の切り分け、状態の増加**

検証側には、詳細を縮めて保存する前にfull snapshotを生成していたこと、通知のJSON clone、単体静止／併用DASHの比較条件差、長い同期Game.step列という特徴があった。A/Bで追加snapshotだけを変えた結果、大外れ値は双方に残った。同期実行を負荷・見た目の性能評価へそのまま読み替えることは避け、今後も機能試験と通常rAFの測定を分ける。

一方、描画や診断HUDのコードは実際に動いており、攻撃内部timerが小さいだけで表示負荷を除外することもできない。現データは「攻撃判定を変える根拠」にはならず、「製品全体に問題なし」という結論にもならない。私設arenaの診断HUD費用と通常SurvivalSceneのHUD費用は別である。

| 武装 | DisplayList最大 16体/128体 | Timer active最大 | MOON FX最大 | SPIKE表示最大 | 数字最大 |
|---|---:|---:|---:|---:|---:|
| なし | 147/483 | 0 | 0 | 0 | 0 |
| MOON | 171/507 | 16 | 12 | 0 | 12 |
| SPIKE | 161/497 | 16 | 0 | 1 | 12 |
| 併用 | 173/509 | 32 | 12 | 1 | 12 |

この表はA/Bの同時数であり、DisplayListはContainer/Layer内の子やGPU資源を全列挙する数ではない。同じ構成の初回・反復で増加せず、各resetの表示数は99に戻った。終了Timer active/挿入待ち/除去待ちは0、Tweenも0。反復開始時にbody/updateListへ旧敵の削除待ちが残るが、更新後は敵数＋1／敵数＋4へ戻り累積しない。通常rAF併用の撃破後body129は、player1＋生存敵112＋XP16で説明できた。

listenerはgame/scene/world/input/keyboardをevent別にbefore/after/restoredへ記録。AだけWORLD_STEPが3→4→3、Bは3。計測wrapper復元前後でScene/物理回数・実時刻を保存した。反復や復元後のlistener差分は0。これは短時間の観測で、長時間のheap/GPU資源リークを否定する試験ではない。

**6. 診断変更と製品挙動の保護**

テストはfresh pageの関数を一時ラップし、引数・this・返り値・呼出順を保持する。finallyで逆順に元へ戻す。rAFには終了・例外・timeout時のloop停止とwatch解除を入れた。FX/HUD条件もRAM内だけで復元する。製品のA/B通知consumer、MOON履歴、SPIKE時計と受付、実物理stepはそのまま通す。

12配信ファイル、vendor、27 PNG、AGENTS、旧Phase 4報告と旧SPIKE browser harnessは開始hashを照合した。Air Brake tuned、移動、EN、無敵、AP、MOON再命中履歴、SPIKE半径80／威力／周期／200ms／8コマ、素材矩形・pivot・scaleを変更していない。敵HP・敵上限・報酬・角脱出の断続失敗と保守除外も変更していない。通常候補・HANGER公開・購入・クラウド・保存キーの追加なし。GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、Depth6+の発生条件・reset条件、Shop／Rankingの変更もない。

主要試験の全30 context（別途smoke 1 contextも同結果）で外部要求0、page error0、Storageメソッド0、通常Scene初期化0。起動時のStorage可用性getter probeだけ各1回遮断され、実データは読んでいない。攻撃/通知consumer error0、通知A/B一致。隔離arena内の撃破では既存XPを生成したが実セーブへ反映していない。通常ショップや本番アカウントを新たに開いた試験は行っていない。

構文確認は `node --check game.js`、`skillDefinitions.js`、`stageDefinitions.js`、`equipmentDefinitions.js`、`tests/umbra-phase4-latency-browser.cjs`。加えてgit diff --check、開始・終了hash、保存harness hash、A/Bと表示要因とdispatchの結果照合を実施。今回の性能測定は機能回帰261項目等の再実行ではなく、測定fixture内の状態一致と旧製品ソース不変を確認したもの。

最終照合は `.tmp_umbra_phase4_supplement/final-checks.json`。開始時44ファイルのうち差分はREADMEだけ。主要試験30 context／88区間／6,735 Game.step samples、保存harnessと12配信ソースのhash、全consumer正常性・隔離・listener復元を照合した。git diff --checkは空白エラーなし、既存設定によるLF→CRLFの注意表示のみだった。

**7. 証跡と再実行方法**

保存先は `C:/Users/akina/.codex/visualizations/2026/09/05/01a071c8-0738-7ea2-a8fc-0927c6aa0777/umbra-phase4-supplement/`。`ab-1`、`factors-1`、`raf-1`、`cadence-1`、`raf-steady-1` の各 `latency-report.json` と `context-N.json` が生データ。各ディレクトリの `harness.cjs` が実行版。`smoke-1` は計測入口を確認した独立1区間で本表に混ぜていない。派生集計は同rootの `tables.md` と、repoの `.tmp_umbra_phase4_supplement/analysis/`。

| 実行版 | harness SHA-256 | 差分 |
|---|---|---|
| A/B・smoke | `d3a18b446db8802f8ec837ee831df678a91ae766902f649dbd88afc30777b77a` | Scene/攻撃/HUD/textureとobserverの区分 |
| FX/HUD・rAF | `5e4e260d51d794af7b87d0331b90ede7fe2a0d0dfbd32d6ff8c3a5091516d5a2` | renderer.render/GL区分、例外timeout、結果guardを追加 |
| dispatch比較 | `f194cf4e9eb6cb327fc50d2303add6d679db655e3f795ab339310172d1c252a1` | Game.step外の待ちだけを比較可能にした |
| 起動待ち後rAF・最終 | `4c9a7db78024d771ca96ea10f4d6ed7f80c13382d2100d68b29cfb0d6634396f` | 空場で既存起動補正が終わる区間を追加 |

各実行のsource hashはJSONの `sources` に全12件保持し、4版とも製品コードは同一。比較群の途中でその群のハーネスを変更していない。異なる版の測定値を同じ計測器の厳密な差として引かず、後続要因試験にはその版でimage/on対照を再取得した。旧load harness SHAは `e1ebd37215e6b45df1ea7e394c9ec145a9711f487a877a5bd67da5ef907104fd`。

ローカルHTTPは既存の4173を使用。ブラウザの入口は `http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraBloodSpike=1&umbraMoonlight=1` のまま。診断比較の追加URLや通常UIは作っていない。機械比較は下記で、出力は毎回新しいディレクトリを指定する。既存結果があれば上書きせず停止する。

```powershell
$env:NODE_PATH='C:\Users\akina\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:UMBRA_TEST_BROWSER='C:\Users\akina\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe'
$env:UMBRA_TEST_OUTPUT='H:\ラスメモヴァンサバゲーム\.tmp_umbra_phase4_supplement\new-ab-run'
node tests/umbra-phase4-latency-browser.cjs ab
# 別の新規出力先を指定して、必要な群だけを順番に実行する:
# factors / raf / cadence / raf-steady
```

新しい依存は追加しておらず、既存のPlaywright/runtimeを使った。保存済みの版を再現する場合、project解決が `__dirname/..` のため、保存harnessをそのまま出力ディレクトリから起動せず、内容とhashを確認してrepoのtests配下の別名へ置く必要がある。

**8. 最小修正案とPhase 5への残課題**

現段階では製品の攻撃・移動・物理を修正する根拠はない。検証側は、決定的な機能比較には制御Game.step、表示の継続観測には通常rAFを使い、snapshot頻度・起動補正・実時刻と物理時刻を明示する運用が最小の対応となる。今回その入口を診断harnessへ用意した。同期ループへ任意の待ちを足した結果だけを製品改善として採用しない。

製品側で別途小さく検討できるのは、隔離arenaの重複HUD更新と、一度捨てる旧文字列の構築を整理する案。対象はarena/Driveの診断表示だけで、目的は平常時の文字列・texture作業削減。HUD更新OFFでも721msが残ったため、この変更で大停止を修正できるとは予測しない。確認は同じ取得武装・入力・敵・FXを維持し、表示内容・更新頻度・通知／HP／EN一致とCPU区分を比較する。今回は適用していない。

Phase 5へ進む判断には、実際のプレイ端末・通常ブラウザ・使用GPUで、同じ私設場のrAFと体感を再確認する余地がある。再現時だけ別試験のブラウザtraceを採り、trace自体の負荷を分けてGL呼出内待機の原因を追う。現試験は最長10秒の単一区間であり、長時間・多数端末の滑らかさを保証しない。16/128体で再現を得て原因区間とdispatch差を確認できたため、今回512体へ無目的に拡張しなかった。角脱出の断続失敗と保守除外、従来の未確認事項は解消扱いにしない。

成長候補の採否・正式性能・Phase 5開始は今回確定していない。今回の記録と調査で終了する。
