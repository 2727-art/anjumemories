# MOONLIGHT＋NOVA「辻斬り」実装報告（2026-09-12）

ユーザーの「敵集団を斬り抜け、そのまま離脱する辻斬り」という方針と実装依頼を受け、未公開の通常Scene比較へ、進行方向に伸びるNOVA保護帯を追加した。元の設置円へ戻る操作を成功条件にしない。従来の円形3秒は別設定として残した。人間の再確認前に正式性能・最終合格へ昇格しない。

## 実装した仕様

| 項目 | 辻斬りの比較設定 |
|---|---|
| 使用条件 | 通常Sceneの隔離UMBRA、`novaField=lane`、MOONLIGHTとNOVAの正規所持 |
| 発生 | 既存NOVAの正常DEPが成立したとき。予約やブーストボタン押下だけでは保護しない |
| 位置 | NOVAの固定設置点を基準。機体・カメラへ追従しない |
| 向き | その設置を成立させた最初の有効物理stepの `from → to` を正規化して固定 |
| 長さ | 設置点から前方1440px、後方120px（合計1560px） |
| 幅 | 360px（中心線から左右180px） |
| 時間 | 設置から通常進行中の最大3秒、NOVA本体の設置期限内 |
| 保護 | 機体の物理body中心が長方形内にある間、既存の被ダメージ受付を拒否。円形と同じく解除後の滑走・Air Brake・停止中も対象 |
| 終了 | 範囲外、期限、run/Depth/body/slot世代の失効、終了・破棄。再進入や重なりによる延長なし |
| 複数設置 | 既存Stageによる最大3枠を維持。各帯は位置・向き・期限が独立。幅や時間の加算なし |

前方を長くした有限の長方形であり、現在の画面端を毎フレーム取り直す方式ではない。PC／スマートフォンの表示幅やカメラズームで判定距離を変えない。初比較値として採用した長さ・幅であり、長押しで帯の末端を越える移動や、3秒を超える滞在の安全を保証しない。

MOONLIGHTは既存の有効ブースト／限定滑走中に攻撃し、制動・停止中の新たな攻撃は追加していない。同じ敵への再命中待ち、外縁からの離脱・再進入、Final履歴を維持する。NOVA本体の放電は従来の攻撃範囲・周期・威力・再生成のまま。長方形全域を攻撃範囲へ拡張していない。SINGULARITYやTRIAD MATRIXの数値・発動条件も変更していない。

## 表示と操作

NOVA保護の比較欄に「辻斬り：前方の保護帯・3秒」を追加。保護帯は既存Graphicsへ半透明の面、固定境界、進行方向の矢印、残り時間の縁ゲージを描く。残り600ms未満で黄色になる。FX OFFでも保護境界は表示する。帯ごとのGameObject・Timer・listenerは新設していない。

MOONLIGHT／NOVAのカード詳細に、シナジー名、両スキル条件、前後長・幅、3秒、固定方向、滑走／制動中の保護、放電範囲不変を記載。新規取得カードでは短い説明へ反映し、数値や条件の全文は既存のページ送り付き詳細へ置く。既存の選択callback・Stage成長は維持する。

- 辻斬り：`http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=lane`
- 従来の円形3秒：同じURLの `novaField=1`
- 保護OFF：同じURLの `novaField=0`

ページ再読込後に上部の「辻斬り」を確認し、START→本編HUB→出撃→Opening／Depth Directive選択を完了する。NOVA取得後、敵集団に沿って短くブーストし、通過してから解除・制動する。元の設置点に戻らず離脱先で次の進路を選べるかを確認する。往復は任意の追加攻撃として扱う。

比較欄・fixture変更は既存RAM sessionを終了してから新規URLへ移動する。移動中の同runへ性能を差し替えない。`novaField=lane` の欠落・不正値・重複指定は保護OFF。通常URL・非ローカルURL・標準機／REGALIAでは辻斬りを有効にしない。

## 同条件ブラウザ比較

Chromium Headless Shell 148.0.7778.96、隔離Relay20、合成LEGEND構成、MOON S1／NOVA S1／Evasive0、実Openingと既存の開始準備を使用。制御60Hzの既存Game.stepを57回（950ms）実行した機能試験。正常DEP以後の観測は約916.667msであり、950msをDEP起点の値として扱わない。

入力は全条件共通：右＋Shift30step、右だけ1step、左逆入力7step、左1stepの接触確認窓、左12step、入力なし6step。最初の明示した境界配置後に機体を瞬間移動させず、HP／EN、敵HP、攻撃、移動、物理設定を書き換えていない。各比較の初期fixtureと入力時刻列の一致を確認した。

① 通過攻撃：native tank3体を前方180／310／440px、側方の攻撃境界付近（edgeGap100）に同配置。敵AI・HP・接触ダメージは既存のまま。

| 実測 | 円形3秒 | 辻斬り3秒 |
|---|---:|---:|
| MOONLIGHT受付 | 3体に各1回 | 3体に各1回 |
| 各敵へのMOON実HP減少 | 535→520（15） | 535→520（15） |
| 到着点の前方距離 | 944.401px | 944.401px |
| 到着点の横ずれ | 99.235px | 99.235px |
| 元の設置円へ戻ったか | 戻らず | 戻らず |
| 到着時の保護 | なし | あり |
| 制動中の保護sample | 0/14 | 14/14 |
| 解除後の速度→制動中最小速度 | 1454.392→565.928px/s | 1454.392→565.928px/s |
| AP | 284→284 | 284→284 |
| EN | 235→205.596 | 235→205.596 |

② 制動時の被弾：通過攻撃とは別の新規runを使い、同じ入力時刻列の制動中に、実際に到達した機体位置へnative tankを1体配置。これは被弾受付を分離する明示的な境界試験であり、自然遭遇の再現ではない。既存のEvasiveと被弾猶予が終了していることを確認した。

| 実測 | 円形3秒 | 辻斬り3秒 |
|---|---:|---:|
| native接触callback | 4 | 4 |
| 被ダメージ受付 | 1回 | 0回 |
| AP | 284→175 | 284→284 |
| 制動中の保護sample | 0/14 | 14/14 |

ブラウザ最終試験は4条件、20＋25＋21＋27＝93/93確認PASS。FX OFF時も帯を描画して保護し、上部表示／比較選択肢も確認。保存・外部通信の既存監査は全条件PASS、page errorなし、終了処理も成功した。画像は測定区間の後に取得した。

これは小群の通過と独立した接触受付の確認であり、密集敵全般、全Boss、通常rAFの滑らかさ、長時間の生存率を保証しない。S8の3本による形状・期限の独立性は数値fixtureで確認したが、実戦での保護密度やバランスは未確認。

## 回帰検証・証跡

- `node --test tests/*.test.cjs`：493/493 PASS、fail／skip 0。新規config7、field10を含む。
- field数値fixture：軸・斜め・各辺／角の境界、実body中心と表示判定の一致、円外、期限、方向欠損・未所持の無効化、固定向き、最大3本、Gate・run・body世代の掃除を確認。
- 6秒・600frameのOFF／円形／辻斬り比較で、NOVAの敵HP・受付回数・HP減少・放電期限・DEP終了・再生成が一致。700px先の敵は保護帯内でもNOVAの放電対象に増えない。
- `node --check`：game.js、skillDefinitions.js、stageDefinitions.js、Bootstrap、DriveRuntime、変更・追加harness。`git diff --check` を確認。

証跡は `.tmp_umbra_tsujigiri/2026-09-12-start/`。`baseline/`、`start-manifest.json`、`status.txt`、`head.txt` は開始時の記録。ブラウザは凍結した `source-after/` を使用し、`browser-second/report.json` と各case／harness／画像を保存した。新旧sourceと前回までの報告・生データは保持している。

初回 `browser-first/` は4条件ともharnessのassertでFAIL。3000msを浮動小数点の完全一致で判定し、実値2999.9999999999995msを拒否したことと、MOONが通らない汎用damage hookを期待したことが原因。後者は正常MOON受付に含まれる実HP前後と、native敵自身の測定終了時HPの両方を確認するように修正。時間は1e-7ms未満の演算誤差を許容した。製品コード・敵・入力・性能を変えず同じ凍結ソースで再実行し、失敗原本も残した。

## 変更範囲と未確認事項

開始HEAD：`28cfe5ab71048b0487254dceef6f66f3a25788f9`。開始game.js SHA-256：`f8bf63ec00c486a6ed65a02881bd8680c850c4ed9a4f55a7647347e4e317315b`。変更後：`6eea84d8eafdbaa1a1be0b44b12af7fe233f0c9c90d27aa11974ae00861e4408`。

- game.js：lane限定設定・run固定入力、正常DEP方向snapshot、共通形状判定、保護帯描画・カード説明。
- umbraIntegrationBootstrap.js／umbra-integration.html：lane比較入口とUI・状態記録・読込版番号。
- umbraDriveRuntime.js：共通形状判定helperの借用一覧のみ。旧Driveで辻斬りを有効化しない。
- README.md、本報告、新規tsujigiriテスト3本、既存mobility browserのlane query対応。

開始時179ファイル中173ファイルがbyte一致、変更は上記の既存6ファイルに限定（新規ファイルは別）。既存メソッド本文の比較で移動／Air Brake／Evasive／共有traceの82メソッド、被弾receiver、MOON物理判定、NOVA更新処理を維持。vendorとUMBRA素材27枚は以前の記録hashと一致。構文・hash・変更一覧・比較sourceの詳細は証跡内manifest参照。

保存キー、GEEK／ANJU MEMORY／LOST ARMS／DATA CACHE／OVERDRIVE／STABILIZE、Depth進行・Gate報酬、AP・EN・無敵時間、購入、ランキング、クラウド、Final Raid、技能の正式Stage/Mutation配列を変更していない。実セーブ・本番アカウント・外部通信、commit／push／deploy／reset／clean、依存・画像追加は行っていない。

残る判断は、人間が「戻らず斬り抜けられる」と感じるか、長さ・幅が過不足ないか、S8の複数帯で回避や離脱の選択が薄れないか。実スマートフォン／gamepad、長いブースト、全Boss、低FPSと長時間性能は未確認。今回の結果を過去の全条件へ一般化せず、次のPhaseや通常公開へ自動で進まない。
