# UMBRA — MOONLIGHT短押し・射程・NOVA保護の比較実装

作業日：2026-09-11。WIDEへの継続フィードバックと、その後の「まずは推奨案で実装をお願いします」に基づくローカル比較実装。正式性能・深層バランス・通常公開の合格ではない。

## フィードバックと作業境界

人間から「WIDEは当てやすくなったがゲームオーバーのリスクに見合わない」「短押し後に旋回しながら集団へ攻撃を続けにくい」と報告された。以前のWIDE試験結果は取り消さず、操作感の評価を追加した。本人の死亡直前履歴を特定した報告ではない。

HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始時game.js SHA-256は `8a3352cd08496880202384e0e7c34f04f9f01b1ff3745828a57dc660dd8d7e7d` で前回最終値と一致した。既存の変更・未追跡成果を維持し、今回の開始時171ファイルとhash/statusを `.tmp_umbra_mobility_trial/2026-09-11-start/baseline/`、`start-manifest.json` 等へ保存した。

commit、push、deploy、reset、clean、依存追加、vendor・AGENTS・アセット編集、実保存・本番アカウント利用は行っていない。比較値を正式Stage配列・Mutation・保存へ追加していない。

## 比較設定

ローカル専用 `umbra-integration.html` の開始時入力から固定する。環境、run request、機体Contextの所有関係を確認し、HUB選択や戦闘中のURLから読み直さない。各効果は独立してON/OFFできる。未指定・不正値・重複値は、その項目を現状/OFFに戻す。標準機・REGALIAと通常URL・旧Driveはすべて従来値。

| 設定 | 値 | 内容 |
| --- | --- | --- |
| `moonReach=current` | 元の1.0倍 | 従来値 |
| `moonReach=wide` | 元の1.5倍 | 前回比較値を保持 |
| `moonReach=extended` | 元の2.0倍 | 新しい距離比較。wide比では約1.33倍 |
| `moonGlide=1` | 最大250ms | 正常ブースト解除後の、条件を満たす実滑走だけ斬撃継続 |
| `novaField=1` | 半径180px・1000ms | 正常NOVA設置でアルティメットフィールドを生成 |

| Stage | current | wide | extended |
| --- | ---: | ---: | ---: |
| S1 / S2 | 60 | 90 | 120 |
| S3 | 62 | 93 | 124 |
| S4 / S5 | 64 | 96 | 128 |
| S6 | 66 | 99 | 132 |
| S7 | 68 | 102 | 136 |
| S8 | 70 | 105 | 140 |

単位はpx。離脱外縁は通過半径＋12、REACTOR時＋8を維持する。敵shapeとの厳密sweep・広域候補・離脱・カード表示へ同じ実効値を使う。画像・body半径・威力・再命中待ちは拡大しない。

## 解除後250msの条件

同じboostSequenceで正常なpowered実移動を確認した後、終了理由が `RELEASE` の場合だけ開始する。空押し、EN切れ、強制終了で権利を作らない。滑走中も実速度・物理移動・移動指令の一致、同じbodyと世代、壁・外部補正なしを必要とする。逆入力によるAir Brake、通常移動、停止、壁への押し付け、位置飛び、pause/resume、Depth/機体/run変更で解除する。

共有移動通知の `event.valid` は解除後もfalseのまま。NOVAの設置条件を拡張せず、MOONLIGHTだけが安全な滑走区間を解釈する。物理攻撃時計とScene上の実解除時刻の両方で期限を制限し、最終stepが期限をまたぐ場合も命中時点が期限より前であることを確認する。

敵life・pass・lastHit・再命中待ちと、同じboostに属するFinalの親状態を保持する。短押しで履歴をリセットしないため、同じ敵に触れ続けて自動連打する効果ではない。選択やpause後に古い延長は持ち越さない。回避無敵は追加しない。

## NOVAの保護

S1でNOVAを取得した時点から試験効果を利用できる。正常DEP確定時の設置座標へ固定円を作り、機体の**現在の物理body中心**が円周を含む内側にある間、既存 `applyDamageToPlayer` の受付を拒否する。被弾後無敵900ms、Evasive、Barrier、APを消費・上書きせず、円を出た後にも無敵を残さない。被弾前から有効な別の保護期限はそのまま保持する。

フィールドの半径・期限は設置時に固定し、同じ設置へ後から再生成・延長しない。既存slot/cycle、run/depth/body、DEP期限に紐付け、複数の円は独立した和集合とする。NOVAの既存設置3秒、800ms間隔、120px設置間距離、再生成1200ms（REACTOR1000ms）、最大3枠は維持する。SINGULARITYの減速領域とは別で、その半径・効果・寿命は変更しない。

Arcade colliderはWORLD_STEPより先に動く。既存のNOVA攻撃時計を進めず、既存preupdate listener内に保護用の期限時計を追加して、受付時の期限遅れを防ぐ。正の有限Scene deltaを全量扱い、長いframeを切り捨てて保護を延長しない。pause中は時計を止め、Depth変更・終了で保護を破棄する。NOVAの再生成負債は維持する。

**予約時点の保護と被弾取消しはない。設置確定より前、同stepで先に発生した接触は防げない。** NOVA未取得時も保護はない。既存の被ダメージ受付を通らないGate崩壊・終了条件を無効化する効果ではない。

保護円は薄いシアンの面と外周、残り時間を示す輪で表示する。FX OFFでも表示し、実効半径180pxと一致させる。新しい画像・Timer・listenerは追加せず、既存presentationのGraphicsを使い、Depth/終了時に消去する。カード表面の文を短くし、詳しい条件は既存の詳細ページへ加える。

## 検証

### 純試験・保持確認

`node --test tests/*.test.cjs`：474/474 PASS、skip0。新規の設定・カード5件、滑走11件、防護10件を含む。滑走期限をまたぐsweep、再命中履歴、空押し・制動・外部補正・停止・世代変更、field内外・期限・重複・防御消費・pause・Gate負債を検証した。fieldは30/60/120Hzの数値timelineと長いframeを確認したが、これを実機の表示Hz・長時間の性能保証へ読み替えない。

`node --check game.js` / `skillDefinitions.js` / `stageDefinitions.js` / `equipmentDefinitions.js` / `umbraDriveRuntime.js` / `umbraIntegrationBootstrap.js` と `git diff --check` は成功。`pure-final.txt`、`syntax.json`、`diff-check.txt` を保存。

`preservation.json` で開始時171ファイル中166ファイルがbyte一致。変更はgame.js、umbraDriveRuntime.js、umbraIntegrationBootstrap.js、専用HTML、READMEの5ファイル。確認対象3390メソッド中18メソッドだけを今回の変更対象とし、移動・Air Brake・Evade・共有BoostTraceの82メソッド本文は一致した。被ダメージ受付はfield guardを除去すると旧本文と一致する。これは行境界での本文比較とレビューでありASTによる同値証明ではない。

前回の記録に対してvendorとUMBRA画像27枚のhashも一致した（`protected-assets-v2.json`）。初回の資産照合はパス区切りの不一致で対象0になったため採用せず、28件を必須件数として再確認した。旧ファイルは残している。

### 実Chrome・同条件の機能比較

Chrome 152.0.7977.83、`complete`の合成D1、Moon S1／NOVA S1、Evasive0、開始AP244・EN185。全条件で実OpeningからNOVA、Reactor Overcharge、Fire Control Linkを同じ順に選択した。既存のLEGEND装備等を含むfixtureであり、ユーザーのD20・Moon Final構成そのものではない。入力・配置を揃えた既存60Hz Game.stepの制御試験で、敵AI・物理・HP・威力・プレイヤーAP/ENを上書きしていない。

| 条件 | 機能assert | S1半径 | 解除後に配置した敵への斬撃 | 外縁試験の斬撃 |
| --- | ---: | ---: | --- | ---: |
| 前回WIDE | 15/15 | 90 | 0 | 0 |
| 距離だけ2.0倍 | 15/15 | 120 | 0 | 1 |
| WIDE＋解除後250ms | 16/16 | 90 | 1、解除後約66.667ms | 0 |
| 2.0倍＋250ms＋NOVA保護 | 30/30 | 120 | 1、解除後約33.333ms | 1 |

各条件は250ms後とAir Brake中の新規命中0も確認。NOVAは併用条件だけで保護を有効にして、他条件では正常設置しても保護しないことを確認した。

併用条件では本来の接触威力20を持つtankとの実Arcade overlapが1回発生。Evasive終了後かつ被弾後無敵期限から800ms経過した時点で、field内のAP182→182、既存無敵期限・Barrierは不変だった。円中心から181pxへ移した受付試験では入力5に対しAP182→177、期限後の中心ではAP181→176。後者の開始APは間の自然回復を含み、手動補充ではない。5の受付試験は実弾を生成した試験と区別する。

Phaser Graphicsによる円と残り時間の輪をスクリーンショットで確認。FX OFFでも保護円と判定を維持した。実NEXT STAGEのD1→D2で旧field0、滑走ticketなし。通常rAFへ復帰した最後の機能確認では20物理step・約279.10pxの実移動を記録した。これは短い入力確認で、CPU/GPU時間の性能測定ではない。

全4ケースで実StorageデータAPI、外向き通信、page error、console errorは0。`mobility-browser-source3-final/`に76/76の各ケース原本がある。ただし、この実Chrome実行は全ケースとcontext終了後の`browser.close()`が10秒以内に完了せず、**集計のpassed:falseを保持**している。機能assert成功とrunner終了の問題を分け、全体PASSへ書き換えていない。対象の完了済みrunnerに子プロセスがないことを確認して、そのsessionだけ終了した。

### 採用しなかった試験と再確認

- `initialization-source2/`：Playwright既定browserの実行ファイルが未導入で起動前に終了。依存を追加せず、既存Chromeを明示した`initialization-source2-chrome/`で実通常Sceneのbaseline起動・Openingを確認した。
- `mobility-browser-source3-first/`：外縁tankのネイティブHP9が、ブースト前に別武装で尽きていた。距離の観測として無効。双方同じ通常spawnのBoss対象に変更し、ダメージ元を観測した。製品のHP・威力を変更していない。
- `mobility-browser-source3-second/`：斬撃で破棄された敵bodyをハーネスが参照した。保持済みの実物理サンプルを使うよう検証側だけを修正した。
- `mobility-browser-source3-third/`：修正後の併用30/30を確認。続く上記最終Chrome実行で4条件76/76を確認した。過去の失敗原本は保持。

既存インストール済みのChrome Headless Shell 148.0.7778.96でも、同じ製品source3・同じハーネスを全4条件で再実行した。`mobility-source3-shell/report.json` は76/76 PASS、browser終了を含む集計もPASS。page error・実Storage・外向き通信は0。この再実行を根拠に、先のChrome152終了timeoutを解消済みへ書き換えない。ハーネスSHA-256は `7590f28408204cd3785369565c9b3b7ab2a1c18c2dae320c9750106c78623d81`。

旧Driveの標準機・REGALIAでも既存カード3択、選択による正規パッシブ適用、HUD更新、専用3武装runtimeなしを実ブラウザで確認した（`oldmech-source3/`、2/2 PASS）。通常公開Sceneの全武器・保存の網羅試験ではない。

### Relay20の限定追加試験：死亡例と円内保護を分離

`relay20-source3-shell/`の最初の試行は、Opening後の既存Depth Directiveをハーネスが選択せずにACTIVEを待って失敗した。物理step0・AP284・選択中の停止であり、製品のフリーズとして扱わない。通常カードを選択してから走るよう検証側を修正した。

`relay20-source3-shell-second/`ではMoon S1／NOVA S1・Evasive0、開始AP284・EN235、OpeningでNOVA／Fire Control Link／Booster Tuningを選択し、Depth Directiveも実カードで選択した。解除後の命中と期限後の非攻撃は確認したが、一連の操作の途中で**保護fieldなし・Evasiveなしの接触入力121によりAP70→0**となった。Air Brakeの観測条件へ到達できず11/12で停止し、集計FAILを保持している。runは通常のENDEDへ移り、page error・console error・実Storage・外向き通信0。この結果を、短い保護で深層の危険が解消した証拠にはしない。

次に新規fixtureからNOVA設置と保護内外だけを分離した `relay20-nova-source3-shell/` を実行し、16/16 PASS。ネイティブHP535・接触威力121のtankと実overlapし、既存無敵期限から約500ms後かつEvasive終了後でも、field内AP284→284を確認。181px外の受付入力5では284→279、期限後の中心では279→274。FX OFFで円と保護を維持し、例外・実Storage・外向き通信0、runner終了も成功した。

この追加16件はfieldの機能確認であり、前の一連操作のFAILを取り消すものではない。Moon Final構成の生存率や全操作の合格は未確認である。新しいハーネスは `UMBRA_MOBILITY_FIXTURE=relay20` と `UMBRA_MOBILITY_SECTION=nova-only` を明示し、合成fixtureと省略した操作を原本へ記録する。

### 変更ファイルと適用範囲

- `game.js`：run固定設定、Moon滑走の限定解釈、NOVA保護helperと受付guard、描画・カード・終了snapshot。通常Scene更新順、物理step、攻撃・移動の既存設定は維持。
- `umbraIntegrationBootstrap.js` / `umbra-integration.html`：ローカル専用の独立比較スイッチ、常時表示、RAM新規開始、読込版番号。
- `umbraDriveRuntime.js`：共有helperの借用一覧のみ。旧Driveでは比較効果を有効にしない。
- `README.md` / 本報告：試験入口・操作・条件・結果。
- 新規tests：`umbra-mobility-config.test.cjs`、`umbra-mobility-glide.test.cjs`、`umbra-mobility-field.test.cjs`、`umbra-mobility-browser.cjs`、`umbra-mobility-preservation.cjs`。

保存キー追加なし。GEEK、ANJU MEMORY、LOST ARMS、DATA CACHE、OVERDRIVE、STABILIZEの報酬・保存・進行ルール、HUB購入、ランキング、クラウド、Final Raid、技能の正式Stage/Mutation定義は変更なし。NOVA保護は被ダメージを拒否するため、その被弾に伴う防御消費・被弾通知・押し戻しも既存の拒否経路に従って発生しない。保護外は旧受付に戻る。

最終game.js SHA-256：`74fe38b6620a281022639d53b1364a1e7ca416082032898c8c300a3eed9e0c89`。製品4ファイルは`candidate-source3`と一致する。

未確認なのはD20・Moon Final・各Core/Finalの全組合せでの長時間の生存率、実スマートフォン・物理gamepad、低FPSでの操作感、全Bossの攻撃、過去に観測した大きなframe遅延の改善である。短いrAF・CPU側の機能確認を滑らかさの保証に使わない。半径180pxの円は高速移動ですぐ退出できるため、1000msの保護時間すべてを常に利用できるわけではない。人間が「短押し旋回」と「設置円を足場にする操作」の両方を再評価する必要がある。

## 人間用の比較操作

- 前回WIDE：`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=wide`
- 距離だけ2.0倍：`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended`
- WIDE＋解除後250ms：`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=wide&moonGlide=1`
- 推奨3項目の併用：`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=1`

START→本編HUB→出撃→Opening3択を完了する。NOVA保護の比較にはNOVAをNEW SKILLから取得する。fixture・比較設定を変えると現在の試験sessionを終了し、RAM・開始位置・AP/EN・成長をリセットする。走行中の同じrunへ性能を差し替えない。比較時は同じカード・装備・Stageを揃える。

同じ条件で「集団の外側を短くブーストして横方向へ旋回」「解除後に新しい敵へ接近」「逆入力で制動」「先に設置した円内で旋回して退出」を試す。フィールドへ戻っても残り時間は更新されない。円の保護と、NOVA設置直前の危険は分けて評価する。

数値は操作感を比較する仮値である。人間の再確認前に最終合格や正式性能へ昇格せず、通常公開・購入・永続保存・後続Phaseへは自動で進まない。
