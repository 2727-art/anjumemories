# KGK-02 UMBRA SERAPH — Phase 7B 未公開通常Scene接続

作業日：2026-09-09。今回の実装範囲は未公開・ローカル専用の通常Scene統合試験である。人間による通常画面の操作感・視認性・自然進行バランス・端末性能の確認は未実施。

**総合の検証判定：実装済み／検証未完了。** 通常Sceneの代表進行・Gate・終了・再出撃と以下の機能確認は通過した。一方、Lv25追加試験のbrowser.close待ちtimeout、音声ON/OFF比較の敵座標に残った最大約9.1×10⁻¹³pxの差による厳密JSON比較FAILは留保として残す。これらをゲームのフリーズや攻撃不具合と確定していないが、試験全体を全PASSにはしない。人間の操作感・可読性・実端末性能の最終合格とも別である。

## 1. 着手時の基準と変更境界

依頼によりPhase 7A設計第10.1節の六つの第一案を実装対象とした。第10.2節の購入journal／receipt、保存version、Atlas／Archiveの新scope、Google schemaは対象外。通常HANGER公開・購入・通常利用許可は追加しない。

- HEAD：`28cfe5ab71048b0487254dceef6f66f3a25788f9`。
- 着手時game.js SHA-256：`efa311b4277fd8ce45fe9781e3a9f3bd58458f68f7ae338d99f45a859c444db0`。依頼のPhase 7A確認値と一致。
- 着手時からREADME.md／game.js／index.html／skillDefinitions.jsに変更、docs／tests／専用module／UMBRA素材に未追跡の成果が存在した。比較はGit HEADとの差分ではなく、着手時ファイルを基準とする。
- 新証跡ディレクトリ：`.tmp_umbra_phase7b/2026-09-09-133732-start/`。`start-manifest.json`と`baseline/`に166ファイルのbytes／hash／元の作業ツリー状態を保存した。
- 過去の報告・生データ、Phase 1～6D2の実装・人間確認履歴は保持する。6D2の人間確認を通常Sceneの確認へ拡張しない。

commit／push／deploy／reset／clean／依存追加は実行しない。実StorageデータAPI、実アカウント、外向き通信を使わない。

## 2. 着手前回帰

凍結baselineで純試験395/395、既存隔離ブラウザ21実行がPASS。`baseline-tests/baseline-browser-completion.json`、`baseline-tests/baseline-artifact-index.json`、`baseline-tests/pure-baseline-manifest.json`にハーネス・ソースhashと各出力を記録した。ブラウザは同時実行していない。

旧Drive/Previewハーネスには監査開始前に合成sentinelを実Storageへ書く部分があるため、今回の禁止条件に従い実行を保留した。通常の実保存付きHUBと保存往復も実行していない。21実行は旧隔離入口の結果であり、通常Sceneの実証には数えない。

## 3. 工程A：起動・IO

保存呼出し89箇所を`getSurvivalStorage(kind)`へ接続した。通常環境では従来のStorageを返し、専用環境ではRAM storageを返す。保存キー、serializer、normalizer、既存の失敗処理・復旧順は変更していない。保存の葉には分岐を追加したため「保存関数がすべてbyte不変」とは扱わない。

専用の`umbra-integration.html`と`umbraIntegrationBootstrap.js`は、vendorとgame.jsより前に既知fixtureとローカル専用pathnameを照合する。URLだけでは能力を発行せず、変更不能な環境identityとScene所有を要求する。不正／欠損bootstrapは通常起動へfallbackしない。

実認証・Firebase SDK・cloud bootstrap・ランキング通信は入口でdisabled。通常Sceneの正規load/saveはRAMへ到達する。実Storageのglobal差替えは製品で行わず、試験側のthrow／spy監査と分けている。

初期の限定純試験6/6と、IO分岐追加後の既存395/395はPASS。これらはVMの合成Storageによる比較であり、実ブラウザの隔離監査とは別。

専用入口の製品コードはwindow.localStorage／sessionStorageを差し替えない。試験側だけがネイティブのget/set/remove/clear/key/lengthとproperty接触をthrow／spyし、catch後も監査失敗として集計する。vendorの存在確認1回はデータAPIと別枠で記録する。RAMのMapには既存の文字列化結果が入る。実setItem→reload試験を行った結果ではない。

主な分岐先はOperator ID・OPTION・Shop・装備・既存wallet・ANJU MEMORY・LOST ARMS・Atlas・Archive・ランキング・cloudメタデータ・帰還message・collision editorである。既存正常系では従来のStorageを返し、試験環境不正なら通常Storageへfallbackせず例外終了する。通常経路のserializer比較は限定純試験の対象関数・合成入力で行い、89箇所の全エラー順列を実アカウントで試したとは扱わない。

RAM sessionは開始前のfixture生成から所有する。抽出→同じSceneのHUB再初期化→次runではMapを保持する。「試験終了」／fixture変更／ページ離脱では新規要求を閉じ、終了snapshot→所有者破棄→Game.destroy完了後にMapを消す。通常URLへの遷移は明示操作だけで、自動fallbackや帰還reloadはない。明示遷移の自動試験では遷移先を無動作HTMLに遮断し、通常実保存の起動を実行していない。

## 4. 六つの判定、Context、初期化順

| 責任 | 今回の接続 |
| --- | --- |
| 既知ID | 既存の機体定義がUMBRAを認識する |
| 公開・販売 | 既存のrelease／previewOnly判定を維持。通常HANGERは標準機とREGALIA |
| profile所有 | 永続ownedIds／selectedIdの許可表・normalizerを拡張しない |
| 現runの機体 | 専用bootstrapの既知fixture→runLaunchRequest→固定runMech／入力snapshot |
| 戦闘・成長 | runId・generation・mode・環境identity・Scene・機体・player/body/world・stateを照合 |
| IO | 起動前に確定したRAM環境。能力Contextがあっても実保存・通信の許可にはならない |

`prepareUmbraNormalRunContext`がPREPAREDを作り、機体・装備・CD入力を固定する。この時点ではbodyがないが、Moon S1の成長modelを破棄しない。必要コードと初期素材を待って通常の`createGameplayRuntime`へ進み、`bindUmbraNormalRunContext`がbody半径22とworldを一度だけ結び、既存starting statsを一度だけ合成する。初期Moon ownerも一度だけ生成する。

BOUNDでは実Opening3回と到達済みのCore／Final等を選べるが、専用攻撃clock・受付は進まない。通常pendingを先に処理し、その後は既存のpost-overlay順でMutation→LOST ARMS→OD MOD→装備追加選択へ進む。装備追加選択の中でFinal予約とDeep予約を区別する。移動可能になるとACTIVE。overlay・pause・Gate等ではSUSPENDED。終了後はENDEDで、結果閲覧用の数値snapshotが残っても攻撃許可を復活させない。

標準機／REGALIAは従来の通常run経路で、専用Context／3武装ownerを生成しない。旧Preview／Driveのadapterは従来queryのcapabilityを保持する。旧S1入口へGrowth／Core／Final／TRIAD／装備能力を一括追加していない。

## 5. 本編処理を使う範囲と試験側の境界入力

実SurvivalSceneのHUB、SORTIE、Opening、候補生成、Stage／Core／Final／OVL確定、starting stats、自然spawn、AI、body・物理step、既存damage受付、kill、drop、pickup、XP、Gate、抽出計算、既存RAM向けload/saveを実行する。arenaの敵HP、報酬stub、固定入力、Game.step制御ループを通常Sceneへ移植していない。

試験側のobserverは元のreceiver・引数・戻り値を維持して記録する。機能試験の詳細snapshotは重い計測器として区別し、性能観測前に解除する。開始fixtureの装備・永久強化・CD・Relay資格は合成値であり、実購入・実討伐・実セーブから取得した入力ではない。

境界試験では全S8ボタンが`unlockSkill`／`upgradeSkill`を使う。XP・Lv・passiveは付与せず、Core／Finalは実カード選択へ残す。合成Gate作成、被弾入力、報酬入力、既存機能の開始処理を直接呼ぶ試験は、それぞれJSONに記録し、自然発生の証拠とは分ける。

## 6. Depth残存lifeと攻撃所有者

通常spawnで敵のnormal life tokenを発行する。NEMESIS等の同bodyに対する形状変更・再登録は同じlifeを使い、新しいspawn・body交換・死んだ旧lifeは別扱いとする。

Gate選択後、`captureUmbraGateSurvivors`が生存敵・body・normal life・各武装lifeを記録する。実Depth完了側の`adoptUmbraGateSurvivors`は同じtransition ticketを一度だけ受け付け、現在group内の同body・生存lifeだけを引き継ぐ。combat clockを継続し、MOONLIGHTのlastHitAtを保持する。旧軌跡は切り、現在位置に新たな基準を作る。範囲外への離脱を確認するまでは初回hit資格・armedを与えず、Depth変更を無料の再hit機会にしない。

旧SPIKE cast・Final field・CONTROL寄与を消し、旧NOVA配置は既存のDepth処理で「残留の残時間＋その配置が捕捉したregen待ち」に一度だけ変換する。新Stage／Core／装備へ遡って期限を短縮しない。周回slotは通常の所有者に残る。プレイヤー速度、Air Brake、EN、無敵、vendorは変更していない。既存の物理step・移動処理の相対順を維持し、通常updateへ専用Contextの更新／停止guardと共有presentation呼出しを追加した。

純試験は同life再登録、Moon再命中待ち、死人／body交換／再利用の拒否、cast清掃、NOVAの1300ms残留＋900ms regen＝2200msの一回継承を確認する。これは物理Gate操作の実証ではなく、実Gateのブラウザ記録と併記する。

## 7. 終了snapshot、RAM結果、HUB再出撃

`endUmbraNormalRun`は新受付を閉じてから、Stage/Core/Final/OVL、TRIAD、COMBAT LINK資格、AP/EN、Depth、未確定GEEK、cast/field/slotの数値・IDを凍結snapshotへ採取する。その後に3武装、Trace、寄与、成長、表示を解放する。bodyやGameObjectへの参照を結果へ保存せず、二度目の終了・古いcallbackを無作用にする。

通常抽出ではsnapshotを取ってから既存のGEEK確定計算を実行する。RAM書込みの失敗は`RAM_RESULT_UNCERTAIN`として画面と診断へ記録する。同期wallet値が更新済みでも保存成功とは扱わず、戦闘再開・蘇生・同じ結果の二重加算を許可しない。次のHUBは実際のRAMに入っている値を既存loaderで読み直す。

UMBRAのAtlas／Archiveは既存schemaが未対応のため書かない。終了snapshotと保存予定要求を診断に残し、`UNIMPLEMENTED_UMBRA_SCOPE`として区別する。標準機やREGALIAのscopeへUMBRA結果を代入しない。TRIAD戦闘集計は専用RAMのまま。新保存キー、新version、購入journal、receiptは追加していない。

同session HUB復帰は通常のScene.restartを使う。新runは新runId／generation、Moon S1のみ、OVL0、旧cast／DEP待ち／入力保持なしで始める。全Scene終了と単武装のcleanupを分け、単武装終了で全体Timer/TweenのkillAllを呼ばない。

実試験で見つかった通常Scene接続上の終了問題を限定修正した。

1. vendored Layer.destroy(true)→子Text.destroy(true)→DESTROY通知→Layer.remove(child,true)がText.destroyを再入させ、CanvasTextureのmanager=nullで例外になった。元ソースの再現ログでは同TextにpreDestroyが2回来た。最初のremoveAll(true)案は短い条件で87 Text／87個体・二重破棄0だったが、自然戦闘後の帰還では子のremoveFromDisplayList→Layer.remove(child,true)という別の再入を確認した。この中間案を解消済みとは扱わない。最終案は統合試験の全Scene終了時にremoveAll(false)でlistenerとdisplayListの両方を先に切り、その後に子をdestroyする。vendorと通常URLの終了経路は変更しない。自然Gate達成と後続帰還での失敗を別々に記録する。
2. 同Sceneのrestart後、createStateがHUD作成より前に各systemを初期化し、前runの破棄済みhudTriadTextを読んだ。統合試験のinitで、Phaser GameObjectかつsceneを失った直接参照だけをnullにしてから通常createStateへ進む。生存GameObject、RAM、数値modelは消さない。実抽出→HUB→再出撃で再確認した。
3. D30→31後の試験終了ではDepth Directiveの残存beaconが、Phaserのgroup破棄後の既存resetでremoveを呼んだ。全Scene終了準備の冒頭に既存cleanupDepthDirectiveObjectsを移してgroup生存中にownerを空にする。D31後の終了を再確認した。
4. 必要コード404でGameを終了した後、入口のResizeObserverが破棄済みcanvasにscale.refreshを呼んだ。専用bootstrapの終了時にResizeObserver・resize／details listenerを解除し、遅れて届く通知にもclosing／closed／canvas guardを設けた。

## 8. 通常表示と共有presentation

`umbraPresentation.js`へ既存Arenaの有限FXの生成・表示更新・破棄を移した。通常とArenaで表示式を別コピーにしない。24姿勢は既存素材metadataのapplyPoseを表示Spriteだけへ適用し、body半径22・衝突・速度と分離する。傾き、影、残像、Target Fireの既存処理を維持し、Target Fireへdamageを追加していない。

出撃時は24姿勢＋初期MOONLIGHT、SPIKE/NOVAは候補提示／初取得に応じて要求する。同asset keyのloading/ready/failedとpromiseを共有する。画像欠損はGraphics表示へfallbackし、同じ候補の反復で失敗要求を再発行しない。明示retryを用意する。必要コード欠損では通常出撃へfallbackしない。退出・run変更後の古いload完了はContext照合で拒否する。

通常compactの3枠をMOON／SPIKE／NOVAへ、detailをStage/Core/Final・NOVA周回/残留/再生成待ち・TRIAD両軸・COMBAT LINK資格・武装別OVLへ接続した。生成済みcast／DEPの旧snapshotを現設定と区別する。座標・全slot履歴の大きな診断panelを通常HUDへ追加していない。detailだけBUILD枠を必要な7行へ広げ、compactの位置は維持する。

通常カードは専用metadataとraw／周期／条件のformatterを使い、既存680msの入力待ちと360ms確定・二重選択防止を維持する。実画像でCOMMS/HUDが効果文を覆う問題を確認したため、通常UMBRAカードだけ同じUI Container内でbackdropとoverlayを前面に出し、破棄時に元の順番へ戻す。全体のdepth、旧2機体のカード配置を変更していない。

画像27枚、frame矩形、pivot、表示倍率、vendor、24Stage値、S1 object参照、装備値・schemaは保護対象。indexではgame.jsのコード版を更新し、game.js内の遅延loaderでは変更したDriveRuntime／Arenaと新presentationへ7Bのコード版を指定した。未変更のDrive／Fixtures／Preview／PreviewAssets、画像、vendor、定義の版は維持する。通常indexから新bootstrapを自動ロードしない。

## 9. 検証方法と採用する証跡

以下のパスは証跡ディレクトリ `.tmp_umbra_phase7b/2026-09-09-133732-start/` からの相対パス。失敗・中間版も保存し、採用したcaseと再試行を区別する。試験番号を足して一つの網羅率にはしない。

### 9.1 計測範囲

| 種類 | 実行するもの | 合成入力・観測負荷 | 主張できないこと |
| --- | --- | --- | --- |
| 純試験 | 実helper・runtime・定義をVMへ読み、数値／identity／終了条件を比較 | Phaser等の限定stub、合成入力、同期時計 | 実描画、実AI、可聴性 |
| 旧隔離ブラウザ | 既存Preview／Drive／Arenaの実Phaserと専用runtime | 既存fixture、制御時計／snapshot、隔離IO監査 | 通常Sceneの自然進行 |
| 通常Scene機能試験 | 実HUB／Opening／カード／owner／Gate／結果／Scene.restart | 報告ごとに明示した境界spawn・XP・Gate作成、詳細snapshot | 境界を自然到達とすること、CPU性能 |
| 自然進行 | 実rAF、自然spawn、AI、撃破・drop・pickup、通常カード、120秒Gate | 開始強化だけ合成、合法キー時系列、詳細observer | 自然全S8完成、深層全経路の生存性 |
| 通常rAF性能 | TimeStepに登録済みのGame.step callback全体、独立rAF interval | 毎callbackの時刻と配列push、1秒の数値観測、400msごとの入力・状態取得 | GPU待ち時間、長時間／全端末の滑らかさ |

全ブラウザは新規Contextで、専用入口より前から実StorageデータAPIと外向き通信を監査する。ローカル配信のコードは対象sourceへ固定し、画像とvendorは保護hashを照合する。正常な採用caseは実データAPI0・外向き要求0・SDK／認証／cloud／ランキング実通信0。Storage sentinelを実際に書いてから消す方式は使わない。

### 9.2 通常Sceneの機能・終了・隔離

| 証跡 | 結果と範囲 | 対象source |
| --- | --- | --- |
| `candidate-lifecycle5/integration-lifecycle.json` | 11/11。実Opening3、明示S8、Core／Final6＋OVL3実カード、実NEXT、抽出123 GEEK→同RAM HUB→Moon S1新run。4生存敵の採用。採用後全武装hitとDEP中の債務はこの試験単独の根拠ではない | source3 |
| `dev-coexistence2/integration-coexistence.json` | 2case／28check。実Robot攻撃・Recovery・Barrier、Support保護／解除、吸引、Robot上限STABILIZE、OD期限、5→6契約とDATA CACHE、6→7 FORCE | source3 |
| `dev-boundaries1/integration-boundaries.json` のrelay10・relay20 | 19check。資格を合成した実Relay D10→EMERGENCY／D20死亡、RAM HUB復帰。relay30失敗caseは採用しない | source3 |
| `dev-boundaries2/integration-boundaries.json` | 22check。Relay D30→31後のEND、D5崩壊、D5開始から明示Gate5回→D10 Raid load/startで専用owner終了 | source4 |
| `candidate-result-failure1/integration-result-failure.json` | RAM wallet書込みの直前／直後失敗、2case／14check。ENDED・snapshot123・不確定通知・再抽出で二重加算なし・HUB再読込0／123・新run S1 | source5 |
| `candidate-assets1/integration-assets.json` のdelay／standard／regalia／oldPreview／oldEquipmentDrive | 5case／27check。遅延退出後callback、旧2機体は専用module／素材不要、旧入口を厳密隔離で実行 | source4 |
| `candidate-assets2/integration-assets.json` のimage404 | 15check。24姿勢＋Moonの25keyが欠損してもbody22・owner稼働。失敗key自動再要求なし、明示retry一度、run/body/Opening回数不変 | source5 |
| `candidate-assets4/integration-assets.json` | 19check。必要code404→REQUIRED_CODE_MISSING終了→新Context再開、狭幅Opening／compact／detail、終了後callback例外0 | source5 |
| `candidate-safety1/integration-safety.json` のHUB以外7case＋`candidate-safety2/integration-safety.json` のHUB | 不正fixture／query／重複、bootstrap欠損、game404、constructor失敗、明示通常遷移、標準HUB／ENDの8独立caseを採用 | source5 |

source3からsource4の製品差は統合Scene終了時のDirective owner清掃追加、source4からsource5は終了後viewport callbackの停止。game.jsはsource4とsource5で同じ。途中版の結果をsource5で再計測したとは書かない。該当した失敗経路は変更後のcaseで再確認する。

source5からsource6では旧ArenaのafterResetにある4種のFX診断counterだけを修正した。共有presentationとArenaが同じcounterを参照していたのに、Arena側が新objectへ再代入していたため、リセット後のHUD／snapshotが0のままだった。Object.assignによる同参照の0初期化へ変更した。実FX object・攻撃・期限の変更ではないが、旧NOVAのGraphics fallback checkが失敗したため表示診断の回帰として扱う。新純試験は4参照保持／値0／次のMoon・Prism表示による増加を確認する。source6のgame.js／bootstrap／presentationはsource5と同じ。

初期化ブラウザではbody無しPREPAREDのmodel保持、BOUND初期化一回、Opening中のSPIKE／NOVA取得と攻撃0を確認した。Moon S4 Coreは候補が連続しない最初の2試行を到達未成立として残し、3回目で実Moon S2→S3→S4→ASSAULT Coreが確定するまで攻撃0を確認した。旧2機体の初期化・能力・初期skill・HUB帰還もRAMで試験し、初期のText破棄失敗は終了修正後に再確認した。

終了試験の一部は明示被弾・GEEK入力・Gate作成・通常終了関数呼出しを使う。例えば吸引は既存Gravity SeedのLv3効果入力から既存force／tick／damageを実行し、自然LOST ARMS取得の証拠にはしない。既存ODは期限境界のdelta入力を用いる。詳細は各JSONと `coexistence-boundary-diagnostic-notes.md` に残した。

### 9.3 失敗を残したままの扱い

- medium自然1は約83秒でAP0。complete自然2はGateが通常時刻に開いたが入力経路がGateから離れ、通常の猶予後に崩壊した。敵HPや無敵を変更してPASSへ置き換えていない。
- complete自然3は自然Gate・実選択・D2移行に成功したが、後続のHUB帰還でText破棄の再入例外が発生した。個別checkがtrueでも全体をPASSとして扱わない。
- `dev-coexistence1` はSupport保護の画面内targetという試験前提が不成立。対象を画面内に配置して再試験した。
- `candidate-assets1` は画像方向の思い込み、終了後Scene参照がnullになるという過剰な試験条件に加え、実際のResize callback例外を含む。Graphics.getBoundsを誤用したassets2の別case、キーを短く押しすぎたassets3も保存した。必要コード欠損後の最終判定はassets4を使う。
- `candidate-safety1` の標準HUBはSTART後に折り畳まれたENDボタンへ直接clickしてtimeoutした。実summary操作を追加したsafety2の同caseで確認した。
- 下記の性能1はCPU計測器が誤っており、rawのpassedフラグを成功証拠に採用しない。訂正文を別保存した。

### 9.4 自然進行の採用結果

`candidate-natural4/integration-natural.json` と `candidate-natural4-summary.json`、source5、13/13 check、pageErrors／errorsなし。ハーネスhashは `b4b41495a3d79a9e2007a24e9181643c9a3a79c6b37db429beaf4289e24ccd97`。自然3と同じ入力policyを使い、自然の乱数・敵配置・候補結果を強制一致させてはいない。

completeという名前の**境界fixtureの開始強化だけ**を使い、合成S8ボタンは使わない。初回BOUNDはAP244／EN185、Lv1、Moon S1、永続強化各25・5LEGEND★5＋20。実OpeningはSPIKE取得→NOVA取得→NOVA S2。以後は自然drop／pickupによるXPと実カードだけで成長した。

| 到達点 | 生存時計ms | 実時刻ms（performance.now） | Scene更新／物理step |
| --- | ---: | ---: | --- |
| 自然Gate開放 | 120001.57 | 134101.2 | 7928／7206 |
| 実Gate接触 | 122251.58 | 136390.6 | 8065／7341 |
| 実NEXT後D2 | 引継ぎ後snapshot | 136583.9 | 8077／7343 |

spawn217、撃破170、XP pickup109、gainExperience110呼出・要求XP合計135、rare pickup1、DATA CACHE pickup1。D2時点はLv8、AP233／244、EN167.41／185、Moon S1／SPIKE S6／NOVA S3、SPIKE ASSAULT Core。DATA CACHE回収で次カードが開いたためContextは**SUSPENDED**であり、D2 ACTIVEと書き換えない。

生存時計で18.05秒にNOVA S3、26.48秒にSPIKE S2、58.67秒にS3、62.20秒にS4＋ASSAULT Core、74.50秒にS5、90.12秒にS6を実選択した。全入力時系列、spawn種別、各drop／pickup、カード前後とGateのbody位置はraw JSONに保存した。全S8、Lv25、全3武装Core／Finalの自然到達はこの試験の結果ではない。

D2到達の後に、**別の境界操作として**既存EXTRACT処理を呼び、未確定25→RAM確定25→同RAM HUBで25再読込→新run generation2／BOUND／Moon S1／Opening3を確認した。2回目の自然Gate到達を主張しない。試験終了後はRAM local／session key0、実StorageデータAPI0・外向き要求0。長い自然戦闘後のHUB再出撃が最終終了処理で通ったことの根拠であり、以前の失敗rawは残す。

### 9.5 残存life／DEPの実Gate境界

`dev-adoption3/integration-adoption.json`、source6、17/17。ハーネスhash `023ba0563e95572c33aa289755220dd42651dd8d4fac38d8cafc0edb43deec9f`。実Openingで3武装S1を取得し、実boostでNOVA DEPが存在する状態を作って実Gate選択へ進んだ。

既存boss_crackのHP・係数・body設定を使い、試験配置の座標だけを明示する。同じsurvivorのenemy/body/lifeとMoon lastHitをGate前後で保持し、旧SPIKE castは空、同じtransition ticketの再投入でDEP待ちは追加されない。Gate直後に近くにいるだけではMoon再受付0。次に有効な離脱・再進入の移動と既存周期を経て、**残存敵／正規新spawn × Moon／SPIKE／NOVAの6組**すべてで実accepted callbackを得た。各handler errors0、実Storage／外向き通信0。

実DEPは戦闘時計100msに始まり、配置期限3100ms、Gate時216.6667ms。残る2883.3333ms＋捕捉済みregen1200ms＝残債4083.3333msとなり、再生成絶対期限は4300msだった。同じticketを再投入しても4300msのまま。純試験の1300＋900という例を、実測値へ転記していない。

この試験は60Hz制御Game.stepと明示Gate作成、body中心に合わせた個別横断・既存周期待ちを使う機能境界で、自然Gate時刻や人間の自由操作の証拠ではない。adoption1は2体の中央を横断する入力で残存敵Moon／NOVA等の受付が揃わず、adoption2は自然XPによる正規カード待ちで止まった。実カードのpassive選択を挟んで継続するようハーネスを補正し、敵HP・専用判定・NOVA期限は変更していない。失敗原本も保持した。

### 9.6 純試験と旧入口

最終source6に対し `pure-final-source6.txt` は**431/431 PASS、skip0**。既存395に、IO6・通常Context12・通常lifecycle6・通常presentation10・通常coexistence2を追加した。途中source5の430から増えた1件は、共有FX counter参照保持の回帰試験である。

旧21のsource4実行は `candidate-regression21-completion.json` に保存し、20ジョブPASS／NOVA1ジョブFAIL。NOVAは122case中、画像404時のGraphics fallbackカウンタを検査した1caseが失敗した。Final FXの旧semantic比較は通っていてもcounter自体の正しさはassertしていなかったため、それを診断正常の根拠にはしない。装備runtimeは15case／474checkで、baseline477との差3は抽選されたOVL候補へ到達する既存選択ループの回数差であり、固有assertの削除ではない。

source6でNOVA122case／666check、Final FX12case、TRIAD FX12case、Equipment FX3caseを追加の4ジョブとして再実行し、すべてPASS。合計149case・32独立Context。NOVAのPNG404 fallbackも成功し、image／fallback／OFFのHP・body・受付・領域の比較は一致、reset後counterが実際に非0へ増えることを確認した。実IO／外向き要求／pageErrors0。ハーネスは既存のものと同一で、今回の4ジョブではbrowser.close待ちの問題もなかった。

採用集約は `candidate-regression-adopted-completion-v3.json` と `candidate-regression-adopted-artifact-index-v3.json`。**旧21系統を採用PASS＋追加TRIAD FX1系統**であり、全21本をsource6で取り直したという意味ではない。source4の18系統を保持し、影響した旧3系統をsource6で置換採用、source6の追加TRIAD FXを別に記録した。先行v2集約は `final-fx`／`old-final-fx` のID別名を別系統に数えた索引の誤りがあり、原本を残してv3で訂正した。試験rawの成否を改変したものではない。

### 9.7 Lv25最後のpending、Deep、Final／Deep bonus

`dev-progression3`、source6の実通常Sceneで、**製品確認48/48**を完了した。実Relay10の利用資格と開始装備だけを合成し、実Opening3の後、`gainExperience`へ明示合成XPを入力してLv25／pending24を作った。Lv・Stage・pending・Mutation・OVLを直接書き換えていない。23回の通常技能カードで3武装S8にし、最後のpending1と同じoverlayを保持したままLv26へ進めた。残り通常1枚→Core／Final6→既存OD MOD1→Final bonus3→Deep bonus3を実入力・既存commit時間で処理し、Lv29／3武装OVL II／選択数Final3・Deep3・normal0／予約0を確認した。

Lv25の最後のカードを保持してDeep XP420を入力し、Lv26でもカード配列identity181・pending1を維持。Final ticketを開いたまま追加Deep XP452／484／516を入力し、Deep予約3を得た。通常27（Opening3＋通常24）＋Mutation6＋装備6＝成長39枚に、既存Depth Directive1枚とOD MOD1枚を加え、実カード確定は41枚。`additional-normal-boundary-summary.json` と `adoption-progression-diagnostic-notes.md` にXP入力・source/harness hash・停止診断の対応をまとめた。

最初のprogression1は、Mutationの後すぐ装備bonusになるというハーネスの想定が誤り、既存OD MODが先に開いて止まった。Final予約3は保持されていた。製品の順序を変えず、OD MODの実選択を含めて再試験した。OD MODを省略してOVLだけを通した結果ではない。自然XP回収やD1からのDeep自然到達の証拠には数えない。

**ハーネス終了に留保がある。** progression2はブラウザ消滅後にNodeが終了待ちとなり、最終JSONが出なかった。progression3では各checkの小さなJSONL、全体120秒deadline、結果保存をbrowser.closeより前へ移した。製品environment END完了、RAM消去、実IO0、pageErrors0、context.close完了を記録した後、`browser.close()`だけが10秒timeoutになった。Chrome process0と所有Nodeの停止を別証跡に残し、最終JSONはcleanupErrorにより**全体passed=false**を維持している。製品48項目の結果とハーネス全体の成否を混同しない。

Node限定Inspectorの別診断はasync fs.stat callbackに停止位置を示したが、停止原因を確定できていない。ブラウザSceneのフリーズや攻撃不具合とする根拠ではない。この追加診断の負荷を、通常rAF性能結果へ混ぜない。後続のブラウザ試験はChrome0を確認してから開始した。

### 9.8 通常敵・姿勢・表示設定の追加確認

`candidate-presentation-coverage1` の `native-enemy-shape-ai` は12check、`normal-poses-motion-targetfire` は7checkがPASS。実通常Sceneでchaser／dash／ranged／Bossを既存spawnにより生成し、通常AI dispatchと3武装の既存life登録を確認した。NEMESISは元のspawn内で拡大・body再設定を行う前後を観測し、同じenemy/body/life／各target recordを保持。VOID HUNTERの既存生成とAI dispatch、通常damage受付による被弾拡縮Tween前後の同lifeも確認した。観測が未登録lifeを作らないよう、既存WeakMapを読むだけにした。

Boss Lightning Dashは既存発動段を明示入力し、通常更新中もdash指令が保持されることを確認した。副攻撃点は空の境界入力であり、全telegraph／二次落雷を通した試験ではない。NEMESIS／VOIDは生成コンポーネントの境界入力で、自然の抽選・静止召喚条件の到達ではない。敵HP・敵AIの攻撃時刻・速度・物理設定を変更していない。

表示入口では24姿勢のtexture key・pivot・scaleを実Spriteへ適用し、body半径22・位置・速度が不変。既存の傾き・浮遊・影・残像、同姿勢を使う非物理afterimageを確認した。Target Fire単独発射はvisual生成あり、damage receiver呼出し0・HP差0・専用受付差0。24方向の自由操作をすべて人間が評価したという意味ではない。

表示設定比較は別の3caseで、同じ4体の既存boss_crack、同じ装備・全S8／CONTROL／SINGULARITY・カードID、camera／障害物・初期body・入力を固定する。実Opening表示後は制御Game.stepを使い、製品constructor／Scene／正規カード関数へ透過委譲したまま、ハーネスだけがMath.randomとPhaser seedを指定する。旧ArenaのFX比較を通常Sceneの証拠へ代用していない。

最初のcoverage1比較3caseはGame構築前のPhaser RNDがnullというハーネス前提の誤りで、計測へ到達していない。coverage2は4秒区間ではNOVA再生まで約233.33ms不足しており、そのassertを失敗のまま保存した。また、制御Game.stepだけではvendorのTweenManagerが使う実Date.nowが揃わず、被弾scale Tween→body位置が異なった。比較側でDate.nowも外部時計へ分離して5秒へ延ばしたcoverage3では、3case単体がPASSし、音声ON/OFFの300行は完全一致した。FX側は敵座標だけ最大x0.000110806px／y0.000064924pxの差を保持し、HP・受付・slow・武装clock／期限・cast／field・NOVA状態は全300行で一致した。coverage3のFX全行完全一致という判定はFAILのままである。

これは実時間Tweenの比較条件の調査であり、死亡Tweenやcombat-aligned clockを製品へ移していない。実rAF性能観測（第10節）は元のDate.nowのままの別試験である。

最後の `candidate-presentation-coverage4` では外部Dateの刻みをIEEEで表せる1/4096ms単位へ固定した。Scene／物理の指定deltaは1000/60msのまま、外部Dateは16.666748046875ms/step、300stepで5000.024414ms（Scene指定時間との差約0.024414ms）。実ブラウザのDate.now更新や実rAFを再現する測定ではなく、Tweenの時計条件を同じにした限定比較である。environment auditのatMsもこの合成時計であり、元のperformance.nowとNode側のUTC・OSファイル時刻を分けて保存した。

比較3case単体は各7check、合計21/21。各300 Scene更新／300物理step、3武装の実受付Moon4／SPIKE16／NOVA15、NOVA配置2／再生1。FX OFFの実表示object0、画像モードは3武装の画像生成あり、元のGame／Scene／OPTION／Dateへの復元と実IO0・pageErrors0を確認した。coverage1の代表2caseを合わせ、採用した**5case／40checkはPASS**。

ただしcase間の厳密比較は別判定で、**2pair中1PASS／1FAIL**。FX画像／OFFは準備・初期条件と全300行が完全一致。音声ON／OFFはHP・受付・slow・全時計／期限・field・NOVA・プレイヤーbodyが完全一致したが、敵xの4点に最大9.094947017729282×10⁻¹³px、敵yの4点に最大4.547473508864641×10⁻¹³pxの差があり、厳密JSON比較FAILを維持する。小さい差だが、許容差を後付けして原本をPASSに書き換えない。時計の数値精度が関係する証拠はあるものの、最終差の原因を確定したとは扱わない。この最後の比較で追加試行を終了した。

採用集計は `candidate-presentation-adopted-summary.json`、case原本／PNGのhash・OS UTC時刻・目視範囲は `candidate-presentation-case-evidence.json`。最終ハーネスhashは `1054de850f065370b1714ad9c271b8643e8e21109e5eb6cb294e889fa561705a`。比較3のOpening選択はNOVA Unlock→SPIKE Unlock→Rapid Sigilで一致、準備756step。OFF側のNOVA画像累計1は比較前Opening中の生成後に破棄されたものなので、OFF区間で画像を描いたという解釈をしない。最終専用FX liveは6分類すべて0。画像側ではMoon shown4／SPIKE image4／NOVA image6・field live1を確認した。

5枚の画像でTESTバナー・通常下部3武装HUDの枠内表示を確認した。近距離へ4体のBossを配置した境界画面ではBossとCOMMSで機体が隠れる場面があり、戦闘視認性を合格にはしない。画像とログの両方を残し、実スマートフォンや自然配置全体の評価へ一般化しない。

## 10. 通常rAF性能観測

採用証跡は `candidate-performance2/integration-performance.json`。Windows、Intel Core Ultra 7 265K／論理20CPU、Chromium 148.0.7778.96、Phaser 3.70.0、viewport 1280×800／DPR1、Node24.15.0。source5の単一ブラウザを使い、他の自動ブラウザ・重い純試験を並行実行しなかった。

開始条件はcomplete fixture（開始強化各25、5LEGEND★5＋20）、実Opening3回はpassiveを選択。出撃直後はMoon S1。別操作で明示S8を適用し、3武装ともCONTROL Core／SINGULARITY Finalを実カードで選択、TRIADはCTRL-II／SING-II、COMBAT LINK II、各OVL Iから後半を開始した。攻撃半径・威力・敵HP・spawn・物理設定は変更しない。方向を右→下→左→上、各4秒、400msごとの入力区間の最初の3区間だけboostとする固定繰返しをJSONに記録した。自然カード発生時は既存1キーで選択するため構成は完全固定ではなく、撮影時にはMoon OVL II／他Iになっている。この2区間を同じ構成の性能比較とは扱わない。

| 区間／計測対象 | sample | 平均ms | 中央値ms | p95 ms | p99 ms | 最大ms | 100ms以上 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 出撃後約5秒／CPU callback | 320 | 4.545 | 4.3 | 5.8 | 7.2 | 9.4 | 0 |
| 同区間／rAF timestamp差（先頭開始差を含むraw統計） | 320 | 16.614 | 16.7 | 16.8 | 16.9 | 16.9 | 0 |
| 長いカード後の約45秒戦闘／CPU callback | 2704 | 10.242 | 10.4 | 11.9 | 13.3 | 19.1 | 0 |
| 同区間／rAF timestamp差（先頭開始差を含むraw統計） | 2704 | 16.662 | 16.7 | 16.8 | 16.8 | 17.0 | 0 |

出撃後区間のScene更新320／物理step321、後半2704／2635。別々のイベントの区間境界に加え、後半には通常カードが開いて物理を止めた区間も含む（入力の約39.648／40.061秒でselection=true、観測時刻68863.7msはworldPaused=true）。回数差の原因を区間境界だけへ限定しない。rAFの先頭はperformance.nowで置いた開始基準との差（出撃後−0.1ms／後半3.4ms）であり、2つのrAF callback間のフレーム間隔ではない。上表はその点も含めた原本統計を保持している。実際の連続rAF間差は319点／2703点で、平均16.6668ms／16.6669ms、p95／p99／最大は上表と同じ、100ms以上0。`performance2-raf-scope-note.json` に両方を分けて記録し、真の最初のintervalや外れ値を除去していない。

CPUは描画命令を含む同期callbackの経過時間で、GPU完了時間ではない。区間の終了は400ms入力単位のため、要求5秒／45秒ちょうどではなく実開始終了時刻をrawに残す。

後半はSPIKE 13cast／13impact／20受付、SPIKEのFinal field13生成・13終了・membership更新156、NOVA9配置・9期限終了・8再生・171pulse。全武装のfieldは23生成／23終了／membership更新433（Moon1／1／7、SPIKE13／13／156、NOVA9／9／270）。空画面の数値ではない。後半終了時は敵44、Scene直下GameObject241、Timer2、Scene event listener119。出撃後区間終了時は敵20／GameObject117／Timer2／listener109。Stage・owner・戦闘量が異なる2区間なので、この増加を漏れとも接続コストとも断定しない。内部Container全子・全DOM listenerの網羅的なheap測定ではない。

最初のCoreカードを8秒保持した前後は、Scene更新43→524、物理step5→5、Moon clock5450ms→5450ms、SPIKE/NOVA clock0、body/AP/ENとowner identity不変。選択中は戦闘が止まり、復帰後に上記field／配置／再生が進んだ。

Phaserはboot時に `Game.step.bind(game)` をTimeStep.callbackへ保持する。最初の計測器は後からgame.stepを交換したため、CPU sampleが0だった。`candidate-performance1/integration-performance.json` のraw passed=trueは、CPU coverage assertion不足による誤判定である。`candidate-performance1-measurement-correction.json` に採用不可の理由を追記し、実callbackをreceiver／引数／戻り値を維持して包む方式とCPU sample必須checkを追加してperformance2を別実行した。製品Game.step／vendorは変更していない。

巨大JSON、撮影、source整形は測定区間外。機能用の詳細observerは測定前に解除した。CPU値は元callbackの開始／終了時刻の差で、callback内のScene／worldカウンタ更新を含む。終了時刻後の配列push、別taskでの1秒観測・入力ポーリングはCPU値の外側だが、ブラウザにはその観測負荷がありrAF間隔へ影響し得る。独立trace／GPU解析は未実施。今回100ms以上が再現しなかったことは、過去の550／567ms等の開始差や800ms級遅延の解消、長時間安定、旧arenaとの性能差の原因証明にはならない。

## 11. 人間用の入口と操作

ローカルサーバーはリポジトリで `python -m http.server 4173 --bind 127.0.0.1` を実行する。専用ページで常時表示 `PHASE 7B TEST / 通常Scene・合成RAM進行 / 永続保存なし / 未公開` とfixture説明を確認し、START→本編HUBのSORTIE PREP→Opening3回を選ぶ。

| 目的 | URL／開始条件 |
| --- | --- |
| 基礎値で通常進行 | `http://127.0.0.1:4173/umbra-integration.html?fixture=baseline` — 永続強化0、装備なし、anju、Moon S1 |
| 中程度の開始強化で通常進行 | `http://127.0.0.1:4173/umbra-integration.html?fixture=medium` — 各10、5SR★3＋5、ラン内成長の付与なし |
| 完成構成の明示境界 | `http://127.0.0.1:4173/umbra-integration.html?fixture=complete` — 各25、5LEGEND★5＋20。Opening後、ページ上部「試験設定・状態」を開き「Opening後：合成完成構成を適用」を押す。Core／Finalは実カード |
| D5→6／契約境界 | `http://127.0.0.1:4173/umbra-integration.html?fixture=depth5` — D5合成開始、スキップ報酬なし |
| Relay境界 | 同ページの `?fixture=relay10`／`relay20`／`relay30` — 討伐・利用資格をRAMで合成し、実Relay出撃 |
| 旧2機体 | 同ページの `?fixture=standard`／`regalia` — 合成RAMで従来HUB・技能・HUDを確認 |

操作は本編のWASD／矢印＋SHIFT／SPACEによる移動・boost、カードclick／tap／1・2・3、Hによるcompact／detailを使う。R／Enterをarenaのreset操作へ変更していない。既存のタッチ／controller入力集約を利用するが、今回の自動操作はkeyboard主体。

同session内で抽出／死亡後にHUBへ戻ると、そのRAM進行を使って次runを開始する。fixtureの変更と「試験終了」はsession終了であり、同RAMの再出撃とは異なる。試験終了はowner・Gameの終了後にRAMを破棄する。通常URLへの移動は専用の明示リンクだけで、通常URL側は実保存環境であるため今回の自動試験はその実起動を実行していない。

既存 `?umbraPreview=1&umbraDrive=1` とGrowth／Core／Final／TRIAD／装備queryの入口は従来の隔離Sceneのまま。

## 12. 変更ファイルと現行コードの参照

| ファイル | 今回の変更と範囲 |
| --- | --- |
| `game.js` | 保存・通信のIO分岐、通常run Context／初期化、実spawn登録、Gate採用、終了snapshot／HUB復帰、通常presentation／HUD／カード。全変更を保護監査に含める |
| `umbraIntegrationBootstrap.js`（新規） | 起動前permit、既知fixture、RAM storage、実IO抑止、失敗記録、明示START／END／fixture reset |
| `umbra-integration.html`（新規） | 専用入口、常時TEST表示と折り畳む設定。独自styleはこのページ内だけ、既存style.cssは変更なし |
| `umbraPresentation.js`（新規） | 旧Arenaから共有した有限FX生成・更新・破棄、metadataのframe登録 |
| `umbraMoonlightArena.js` | 表示helperを共通ownerへ委譲、既存queryの機能を維持、リセット時counter参照を維持 |
| `umbraDriveRuntime.js` | 旧試走の必要コード集合へ共有presentationを1件追加 |
| `index.html` | game.jsの配信コード版のみ。通常ページから新bootstrapはロードしない |
| `tests/umbra-integration-*.cjs`／`tests/umbra-normal-*.test.cjs`（新規） | 起動IO、初期化、自然進行、実Gate／終了、境界、成長、共存、表示、性能の限定ハーネスと純試験。既存 `tests/umbra-normal-browser.cjs` は今回の新規ではない |
| 既存ブラウザハーネス4件 | `umbra-growth-browser`／`umbra-bloodspike-browser`／`umbra-nova-browser`／`umbra-phase4-moonlight-browser` が、対象sourceに存在する場合だけ共有presentationを凍結配信に含める。旧baselineに無いmoduleを強制しない |
| `tests/umbra-phantomnova-arena.test.cjs` | VMへ共有presentationを読む1行。既存expectationは変更なし |
| `README.md`／本書（新規） | 専用入口・範囲・検証・未確認事項。過去Phase報告・7A設計は変更なし |

game.jsの下表は今回のsourceで確認した行番号。7Aの番号の流用ではない。

| 関数／接続 | 行 |
| --- | ---: |
| isUmbraIntegrationRequested／getSurvivalRunEnvironment／getSurvivalStorage | 4349／4356／4365 |
| isSurvivalRemoteIODisabled／startUmbraIntegration | 4371／4378 |
| prepareUmbraPresentationAssets／requestUmbraSkillPresentationAssets | 6780／6794 |
| initializeUmbraNormalPresentation／updateUmbraNormalPresentation | 6800／6832 |
| createGameplayRuntime | 8335 |
| isUmbraRunContextCurrent／hasUmbraRunCapability | 13570／13589 |
| prepareUmbraNormalRunContext／bindUmbraNormalRunContext／updateUmbraNormalRunState | 13604／13650／13700 |
| saveRunArchiveEntryOnce／shouldBlockMutationAtlasPersistence／completeMutationAtlasExtractionProgress | 33400／36057／36529 |
| getUmbraNormalHudView／getUmbraNormalSystemsHudLine | 51662／51697 |
| continueSortieFromHub／loadGameplayAssetsThenContinueSortie | 59655／59782 |
| chooseExtract／chooseEmergencyExtract／completeExtraction | 62351／62491／62508 |
| applyUmbraIntegrationBoundaryBuild／captureUmbraNormalEndSnapshot／endUmbraNormalRun | 64522／64544／64587 |
| recordUmbraIntegrationResult／releaseUmbraIntegrationDisposedViews／prepareUmbraIntegrationSceneShutdown／returnUmbraIntegrationToHub | 64612／64626／64643／64669 |
| captureUmbraGateSurvivors／adoptUmbraGateSurvivors | 64689／64708 |
| loadFinalBossRaidAssetsThenBegin／beginFinalBossRaid | 7072／19253 |
| triggerGameOver／createUmbraNormalCardContent | 84075／84939 |

bootstrapはisLocalEntry:27、makeStorage:108、fixture seed:121、launch:175、end:198、bridge／Scene所有:249以降。共有presentationは `umbraPresentation.js`。最新hash対応は各source manifestと最終保護監査を参照する。

最終製品sourceは `candidate-source6-manifest.json`。主要SHA-256：

| ファイル | SHA-256 |
| --- | --- |
| game.js | `aaa12cd821db595b720334024b173999e55fb3d5b2111ccad6270f95f46b93ce` |
| umbraIntegrationBootstrap.js | `6fad6d255597525f7626bd8ca4c95d93d4cb66434c90bd7430820231e511159a` |
| umbraPresentation.js | `99c6c7cea5af9bd1c510d8be43c07cb126cd5e2e3dffc8d91c2fb56fc9ca7f7c` |
| umbraMoonlightArena.js | `72f14f250f66069086209685ce40ee0773a5c2bd9217577fbfa68193d8f4ef46` |

`final-source6-protection-audit.json` では着手166ファイルのうち156がSHA-256一致、変更10件は上表の製品既存4ファイル＋README＋旧ハーネス5件。game.jsのIO・初期化・Gate・終了の変更を保護対象から除外していない。skillDefinitions.js全体、stageDefinitions.js、equipmentDefinitions.js、画像27枚、vendor、AGENTS、rules／Firebase／配信設定、過去docsは一致。新規ファイルは別枠として数え、元の未commit・未追跡成果を削除していない。HEADも着手値のまま。

`source6-http-bytes.json` はコード／HTML／CSS15件＋vendor1件の**実ローカルHTTP GET**とローカルbytes・凍結hashが16/16一致。ブラウザのroute置換だけをHTTP一致の証拠にしていない。先行 `final-code5-http-bytes.json` のvendor falseは、比較器がbaselineのWindows区切りを照合できず期待hashを取得しなかったもの。HTTPとlocalのhash自体はその時点でも一致していた。path正規化後の別結果を保存し、原本は残した。

`final-source6-all-validation.json` は要求4ファイルと変更／追加module・ハーネスを含む32ファイルの `node --check` がすべて成功、`git diff --check` がexit0。最終ハーネスも上記hashで含めた。既存395を含む431純試験の結果は `pure-final-source6.txt`。報告・ソース・試験原本・画像の最終索引は `phase7b-final-artifact-index.json` に保存する。

## 13. JSON・画像と再実行

主な画像（性能撮影は測定区間外）：

- [通常戦闘・compact HUD](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-performance2/normal-combat-after-measurement.png)
- [通常Coreカード](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-lifecycle5/boundary-card-0-skillMutation.png)
- [Final追加のOVLカード](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-lifecycle5/boundary-card-6-equipmentOverlimitBonus.png)
- [844×390のOpening](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-assets4/narrow-opening-844x390.png)
- [844×390のdetail](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-assets4/narrow-detail-844x390.png)
- [通常姿勢・残像・Target Fire](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-presentation-coverage1/normal-pose-afterimages-targetfire.png)
- [自然進行の採用JSON](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-natural4/integration-natural.json)
- [通常rAF性能JSON](../.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-performance2/integration-performance.json)

PowerShell例。新しい出力名を使い、過去のJSON／PNG／失敗試行を上書きしない。ブラウザハーネスは1件ずつ実行する。性能測定中は他の自動ブラウザ試験を起動しない。

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
node --check equipmentDefinitions.js
git diff --check

$env:NODE_PATH = 'C:/Users/akina/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:UMBRA_TEST_BROWSER = 'C:/Users/akina/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
$env:UMBRA_TEST_SOURCE_ROOT = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b/2026-09-09-133732-start/candidate-source6'
$env:UMBRA_TEST_OUTPUT = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b/review-natural-new-run'
$env:UMBRA_TEST_FIXTURE = 'complete'
node tests/umbra-integration-natural-browser.cjs
$env:UMBRA_TEST_FIXTURE = $null

# 独立して実行し、試験ごとに新しい出力名へ変更する
$env:UMBRA_TEST_OUTPUT = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b/review-lifecycle-new-run'
node tests/umbra-integration-lifecycle-browser.cjs
$env:UMBRA_TEST_OUTPUT = 'H:/ラスメモヴァンサバゲーム/.tmp_umbra_phase7b/review-performance-new-run'
node tests/umbra-integration-performance-browser.cjs
```

既存395純試験を含める実行例：

```powershell
$umbraManifest = Get-Content -LiteralPath '.tmp_umbra_phase7b/2026-09-09-133732-start/baseline-tests/pure-baseline-manifest.json' -Raw | ConvertFrom-Json
$umbraPureFiles = @($umbraManifest.files) + @(
  'tests/umbra-integration-io.test.cjs',
  'tests/umbra-normal-context.test.cjs',
  'tests/umbra-normal-lifecycle.test.cjs',
  'tests/umbra-normal-presentation.test.cjs',
  'tests/umbra-normal-coexistence.test.cjs'
)
node --test @umbraPureFiles
```

新ハーネスはインストールを行わない。上記Playwright runtime／ブラウザの既存パスを使った。ローカルサーバーは別の通常PowerShellで起動する。自然試験の再実行は同じ開始fixtureと入力方針を使うが、自然の乱数・候補・撃破数まで同値になる保証はない。real storage sentinelを使う旧ハーネスを、これらの代わりとして無条件に実行しない。

## 14. 未確認事項とPhase 7C前の判断

通常画面の操作感・視認性・自然成長バランスを、人間確認済みや最終合格としていない。844×390ではCanvasの実CSS寸法が約616.875×345となり、Opening最小文字は約5.27 CSS px、detailは約4.79 CSS pxだった。枠内・非交差の確認には通るが、文字が小さく、可読性合格とは扱わない。実スマートフォン、実pad、音声の可聴性は未確認。狭幅での文字サイズ・情報量の調整は人間の実画面確認を次の判断にする。

自然4は高い開始強化から1回の通常Gateまでを確認しただけで、基礎値からの長時間生存、全S8自然完成、全Deep、全ボス／特殊AI、全装備組合せの保証ではない。Relay10／20／30、D30→31、契約、Raid入口は明示した合成資格・境界操作。Final Raidの全戦闘・勝利・報酬完了は今回確認していない。

性能は約5秒＋45秒の通常rAF観測。100ms級遅延の未再現を修正済みに読み替えず、長時間のheap／GPU／全端末検証を残す。旧角脱出の断続失敗、保守除外、boostSustainDrainRampMs／boostSustainRampMs不一致、過去の開始時間差は今回の変更へ混ぜていない。

保存キー・保存versionは追加していない。GEEKは既存の未確定→抽出／EMERGENCY確定計算をRAM内で使用し、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZEは既存条件と既存終了処理を使用する。UMBRAのAtlas／Archive要求は未実装scopeとして停止する。新しいランキング項目、購入、HANGER公開、通常URLのUMBRA出撃は追加しない。

7Cでは改めて第10.2節のjournal／receipt／失敗復旧／新scope／未知データ互換等の具体案を承認する必要がある。今回のRAM保存成功は永続transactionや旧版互換の実証ではなく、Google保存・実setItem→reload→readback・Firestore Rules試験も未着手。本報告後、自動で7Cや通常公開へ進まない。

次の判断は、まず通常の操作・HUDを人間が確認し、狭幅の可読性、今回の2件の検証留保、自然成長と生存性の追加確認をどう扱うかである。製品を変更する根拠が確定していないため、座標差や検証ツールの終了待ちを理由に攻撃・移動・物理設定を調整しない。現在の総合判定は冒頭の「実装済み／検証未完了」を維持する。

Phase 7B：未公開通常Scene接続の実装結果。  
購入transaction、永続Atlas／Archive、新保存互換、  
Google保存対応、通常公開は未着手

## 15. Phase 7B補正の着手時追記：通常Sceneの人間フィードバック

2026-09-09、通常Sceneの試走後に、ユーザーから「Depth20以降では敵との接触が死亡につながり、主スキルMOONLIGHTを使うリスクが大きすぎる」「スキルカードの説明が難解で、直感的に理解できる説明にしたい」という報告を受けた。使用端末、開始Depth、装備、Stage、Evasive Lv、死亡直前APは未指定である。特定構成で満APから接触1回で死亡したと確認したものではない。

この報告を、全項目の人間確認済み、Phase 7B全体の最終合格、または深層バランス合格へ読み替えない。上記の過去の試験結果・FAIL・未確認事項は、その時点の記録として残す。今回の接触・無敵・斬撃順序の限定調査、MOONLIGHT主通過半径1.5倍の比較案、通常UMBRAカード説明・詳細の改善は、別の[Phase 7B補正報告](umbra-phase7b-adjustment-report.md)へ記録する。新しい無敵、購入・永続保存・通常公開は対象外。

同作業中の追加回答：使用端末はPC／Chrome、開始はDepth Relay20、装備は「ALL LEGEND LV20」、MOONLIGHTは「finalLV」、EvasiveはLv0、死亡直前APは「300未満」。これらはユーザーから得た条件である。正確な残AP、装備の★、永続強化、Core／Finalの選択、直前の敵・弾・床の内訳は未確認であり、S8の代表試験と完全同一とは断定しない。
