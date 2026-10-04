# UMBRA NOVA保護時間の補正（2026-09-11）

ユーザーの継続フィードバック「PHANTOM NOVAのアルティメットフィールドを展開しても、ブースト移動で範囲内に戻るころには消失する」を受け、ローカル比較の保護時間を1秒から最大3秒へ延長した。正式性能の決定ではない。以前の1秒案の報告・生データは上書きしていない。

## 原因と変更

旧比較設定は保護円1000ms、NOVA本体の設置寿命は3000msだった。したがって設置から1秒以降に戻る場合、NOVA本体が残っていても保護は既に失効していた。今回の変更は `UMBRA_MOBILITY_TRIAL_SETTINGS.novaFieldDurationMs` の1000→3000のみ。既存の生成helperが `min(比較時間, 設置本体の残存時間)` を固定するため、本体の寿命を超えて円だけ残さない。

| 項目 | 初案 | 今回 |
|---|---:|---:|
| 保護円の半径 | 180px | 180px |
| 保護円の持続 | 1000ms | 最大3000ms |
| NOVA設置本体の寿命 | 3000ms | 3000ms |
| 設置枠・間隔・最小配置距離 | 既存Stage/Core/Finalの値 | 変更なし |
| 放電の威力・間隔・範囲・受付 | 既存値 | 変更なし |
| 再生成待ち | 通常1200ms／Reactor1000ms | 変更なし |
| MOONLIGHT距離・解除後斬撃 | 比較選択値 | 変更なし |

時間は正常設置時を起点とする通常進行中の時間。停止・カード選択中の残り時間の扱いは既存のまま。退出すると保護は終了し、同じ円へ戻ると期限内に限って保護を再利用できる。戻っても期限は更新しない。設置前の接触を取り消したり、円外に保護を持ち出したりしない。

複数枠では各円の位置・半径・期限を独立に維持する。重ねても半径加算や前の円の期限延長は行わないが、円を往復して保護を利用できる時間は増す。S8の複数枠による実戦バランスは人間の確認が必要。

## ソースと保護範囲

開始HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始時点の作業ツリーを保持した。game.js SHA-256は、開始 `74fe38b6620a281022639d53b1364a1e7ca416082032898c8c300a3eed9e0c89`、変更後 `f8bf63ec00c486a6ed65a02881bd8680c850c4ed9a4f55a7647347e4e317315b`。

証跡は `.tmp_umbra_nova_field_duration/2026-09-11-duration/` に分離保存した。`baseline/`、`start-manifest.json`、`head.txt`、`status.txt` が開始時の記録。`source-before/` と `source-after/` がブラウザ比較対象。game.js全文は開始版へ上記の数値置換を1回行った結果と一致し、全メソッド本文は不変であることを `preservation.json` に記録した。

製品変更は game.jsの数値1か所、umbraIntegrationBootstrap.jsの表示「3秒」、umbra-integration.htmlの選択肢・読込版番号。READMEは現行案を更新。本報告を追加。テストはconfig/field/browserの期待値・比較用exportを更新し、往復ブラウザ試験を別ファイルで追加した。

skillDefinitions.js、stageDefinitions.js、umbraDriveRuntime.js、index.html、AGENTS.mdは開始時からhash一致。Air Brake、移動、EN、AP、Evasive、MOONLIGHT再命中履歴、NOVAの攻撃と再生成、Stage/Mutation、既存2機体、Final Raid、vendor、アセットは変更していない。保存キー追加なし。GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、購入、ランキング、クラウドへの変更なし。commit、push、deploy、依存追加は行っていない。

## 検証

- `node --check game.js`、`node --check skillDefinitions.js`、`node --check stageDefinitions.js`、`node --check umbraIntegrationBootstrap.js`、ブラウザharnessの構文、`git diff --check` を確認。
- `node --test tests/*.test.cjs`：476/476 PASS、失敗・skip 0（`pure-all.txt`）。そのうち持続時間の設定・カード・fieldは17/17 PASS。
- 数値fixture：2999msの保護、3000msのcollider前失効、30/60/120Hz、長いフレーム、複数枠、停止／復帰、Gate／body／run世代、終了破棄を確認。2秒の再進入後も元の3秒期限を維持する。実ブーストとは分けたreceiver/clock検証。
- 同じ10ms×600フレームの保護ON/OFF比較で、NOVA戦闘表示用状態・counts・skipsが全点一致。DEP/ORBIT双方の放電、1回のDEP終了と再生成を確認。攻撃周期を変更して持続時間を延長していない。
- Chromium Headless Shell 148.0.7778.96、Relay20／MOON S1／NOVA S1／Evasive0の既存隔離ブラウザ試験：16/16 PASS（`nova-after-browser/report.json`）。実tank接触damage121でAP284→284、円外181pxと期限切れでは通常受付へ戻る。FX OFFでも円と保護が残る。設置後3016.667ms付近の期限切れを確認した値であり、3000msちょうどの実測とは扱わない。
- 画面の「180px・3秒」と保護円をスクリーンショットで確認。製品3ファイルのローカルHTTPレスポンスは変更後のソースとSHA-256一致（`live-local-bytes.json`）。

ブラウザ測定中は実Storage APIと外部通信を禁止する既存監査を使用し、隔離監査PASS、page errorなし。新旧ソースの試験は順次実行する。制御Game.stepは機能確認であり、通常rAFの性能や人間の操作感を保証しない。

### 同じ実ブースト往復での比較

`tests/umbra-nova-field-return-browser.cjs` を旧1秒／新3秒のfrozen sourceへ同一のまま実行し、各21/21 PASS。`return-before-final-browser/`、`return-after-final-browser/` と `return-comparison.json` に保存した。最終harness SHA-256は `1d764cdbe233bd808c4c0f91f9315bd99cd6b0ab2797eb3e7729f64bbaf1e518`。依存harnessも各出力先に同梱した。

同じRelay20／MOON S1／NOVA S1／Evasive0のfixtureで、同じ準備手順・境界配置・入力時刻列を使用した。最初の明示した境界配置以降は、player瞬間移動、HP/EN書換え、敵追加、直接damage注入、移動・物理の上書きを行わない。入力列は60Hzで、右＋Shift18step（300ms）、右のみ6step（100ms）、左逆入力42step（700ms）、左＋Shift42step（700ms）、合計108step（1800ms）。初回正常DEPは開始後2回目の物理stepで成立したため、DEP以後の比較sampleは107点。

| 実測（初DEP起点） | 旧1秒 | 新3秒 |
|---|---:|---:|
| 元円からの退出 | 200.000ms付近 | 200.000ms付近 |
| 元設置位置からの最大距離 | 720.982px | 720.982px |
| ブースト再進入 | 1566.667ms付近 | 1566.667ms付近 |
| 再進入時のbody中心距離 | 175.054px | 175.054px |
| 同じslot/cycleの元円による保護 | 失効済み | 有効 |
| 再進入時の保護残時間 | なし | 1433.333ms |

107点すべてでDEPからの相対時刻、body位置・速度、EN、AP、移動mode、boost状態が一致。帰還時は `VALID_BOOST`、左向き実速度、Evasive終了済み、既存被弾猶予終了済みを確認した。今回の帰還試験は実移動と製品保護判定の確認であり、帰還瞬間に攻撃を注入していない。被弾受付の確認は前述の独立した16件の試験と区別する。1つの代表入力列で3秒案の利用時間改善を確認した結果で、任意の大回りを保証しない。

試験作成中の失敗も保持している。`return-before-browser/` の初回入力列は右ブースト300ms→右へ滑走700ms→逆入力300ms→左ブースト押下1500ms。元円から最大1412.317pxまで離れ、帰路のShift押下時点がAIR_BRAKE中だったため帰路のブーストは始まらず、試験時間内に再進入しなかった。この条件へ3秒化が十分とは主張しない。製品の移動処理を修正して試験を成立させず、短い離脱の比較へ限定した。

`return-before-v2-browser/` は短い入力列で帰還したが、harnessのcycle維持assertが「初DEP前のORBITING cycle0」まで含め、正常DEP後cycle1との差を誤って失敗扱いした。対象を初DEP成立以降に直し、帰還時の有効ブーストと既存回避・被弾猶予の終了も確認するようにした。失敗時のソース・harness・生データは各出力先へそのまま残した。

## 人間用の再試走

`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=1`

ページを再読み込みし、上部に「NOVA保護 180px・3秒」と出ることを確認して新規試走を開始する。START→本編HUB→出撃→Opening／Depth Directiveの選択を完了し、NOVAを取得する。実行中の古いrunへ設定を途中適用しない。

NOVAを設置して円外へ離れ、2秒程度で戻る操作を再確認する。外周の残り時間表示が尽きると保護は消える。最大3秒を過ぎて戻る場合の保護は保証しない。まずは「戻って円を足場にできるか」と「S8複数枠で保護が過剰にならないか」を判断する。

本件は持続時間の局所補正。長時間の生存率、全Boss攻撃、全Core/Final組合せ、スマートフォン・gamepad、低FPSの操作感は未確認。前回Relay20全手順で保護円外の接触死が発生した記録も、この変更によって解消したとは扱わない。人間の再確認前に正式採用・最終合格とせず、後続Phaseや公開へ進まない。
