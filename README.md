# ラスメモヴァンサバゲーム

Phaser 3 製のブラウザ向け 2D サバイバルゲームです。ビルド工程はなく、`index.html`、`vendor/phaser.min.js`、`skillDefinitions.js`、`stageDefinitions.js`、`game.js` をローカル HTTP サーバーで配信して動かします。

操作キャラは通常 Depth ではクマ型超巨大ロボットに搭乗し、背部ブースターで浮遊しながら高速移動します。Final Raid では専用戦闘表示に切り替わりますが、Final Raid ではない通常 Depth10 や Depth10 Relay ではロボット表示のまま進行します。スキル、パッシブ、サポート攻撃、随伴ロボット、LOST ARMS を強化しながら敵を倒し、XP と未確定 GEEK を集めます。2 分ごとに出現する Stage Gate では、Depth を上げて続行するか、未確定 GEEK を確定して帰還するかを選びます。

## 起動方法

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

起動後、ブラウザで以下を開きます。

```text
http://127.0.0.1:4173/
```

このリポジトリはビルドなしの静的構成です。`file://` 直開きは画像、音声、Phaser の読み込みで不安定になる可能性があるため、ローカル HTTP サーバー経由で確認してください。

LAN 上のスマートフォンで確認する場合は、PC とスマートフォンを同じネットワークに接続し、PC の LAN IP に対して HTTP サーバーへアクセスします。

## 操作方法

- 移動: `WASD` / 矢印キー / 左仮想スティック
- DASH: `Shift` / `Space` / 右 DASH ボタン
- レベルアップ選択: クリック / タップ / `1` `2` `3`、Opening Boost +1 使用時のみ `4`
- Gate 選択: クリック / タップ / `1` `2`
- DEPTH RELAY 選択: クリック / タップ / 表示中カードの左から `1` `2` `3`、`Escape` で OPERATIONS HUB へ戻る
- ランキング入力: 名前入力後 `Enter`
- ゲームオーバー後: `R` または `Enter` でショップへ戻る

通常 Depth の移動は `acV3 AC Movement` が標準です。入力方向へ即座に張り付く歩行ではなく、加速、慣性、減速を持つブースター滑走として動きます。DASH は `AC Quick Boost` / 継続ブーストとして機能し、押している間は BOOST EN を消費します。BOOST EN が 0 になると `FULL_OVERHEAT` になり、BOOST EN が全回復するまでブーストできません。高速滑走中に進行方向と逆向きへ入力すると Air Brake が発動します。

操作キャラは通常 Depth では 8 方向のクマ型ロボット画像へ向きを切り替え、通常移動と POST_BOOST_GLIDE では歩行/滑走フレーム、Quick Boost / 継続ブースト中だけ強いブースター画像と青白い推進FXを使います。Quick Boost / 継続ブーストの開始成功時は、プレイヤーの画面内X位置に応じて左 / 中央 / 右の3種類のステレオSEを鳴らします。target-facing により敵方向を向きながら移動でき、Target Fire は現在ターゲットを示す visual-only の連射FXとして表示されます。Target Fire は敵HP、ダメージ、projectile、collider、overlap には影響しません。通常 Depth10 と Depth10 Relay もロボット表示で、Depth10 Final Raid 中だけ専用のプレイヤー表示と専用移動へ切り替わります。当たり判定は従来のプレイヤー hitbox のままです。

## スマートフォン対応

スマートフォンで接続すると、開始前に横向きフルスクリーン開始ゲートが表示されます。対応ブラウザではフルスクリーン化と画面向きロックをリクエストし、未対応環境では通常表示で開始できます。

スマートフォンのショップ帰還ではページリロードを避け、同じページ内で OPERATIONS HUB（従来のOpening Shop）へ戻ることで横向きフルスクリーンを維持します。ブラウザ制限などで帰還処理中またはショップ上でフルスクリーンが解除された場合は、横向きフルスクリーン復帰ゲートを表示し、タップ操作で再度フルスクリーンと画面回転をリクエストします。端末側の制限でページ再読み込みへフォールバックした場合も、以前に横向きフルスクリーンを選んでいれば開始ゲートをスキップせず再表示します。

モバイル操作は左側の仮想スティックと右側の DASH ボタンです。ショップ、開始前強化、Gate 選択、ランキング入力もタップ操作に対応しています。

クエリパラメータ:

- `?mobileGate=1`: PC ブラウザでもスマートフォン開始ゲートを表示します。
- `?mobileGate=0`: スマートフォン開始ゲートを無効化します。
- `?mobileControls=1`: PC ブラウザでもモバイル操作 UI を表示します。
- `?mobileControls=0`: モバイル操作 UI を無効化します。
- `?debugStartDepth=10`: デバッグ用。`SORTIE PREP` 後のランを Depth10 から開始します。`11` 以上を指定すると通常深層として開始し、Final Raid には入りません。
- `?debugRelayStartDepth=10`: デバッグ用。保存済みの Depth10 DEPTH RELAY 解放がある場合だけ、`SORTIE PREP` 後のランを Final Raid ではなく通常 Depth10 として開始します。`20` / `30` を指定すると、必要な Anchor が連鎖解放済みの場合だけ通常 Depth20 / Depth30 Relay として開始します。解放状態は変更せず、`debugStartDepth` が同時指定された場合は `debugStartDepth` を優先します。
- `?debugRelayLaunchDepth=10`: デバッグ用。通常の OPERATIONS HUB を表示したあと、`SORTIE PREP` 押下時に保存済みの Depth10 DEPTH RELAY 解放がある場合だけ、プレイヤー向け DEPTH RELAY 選択 UI を経由せず Scene restart 経由の新規ラン初期化で通常 Depth10 へ進みます。`20` / `30` を指定すると、必要な Anchor が連鎖解放済みの場合だけ HUB 経由の Depth20 / Depth30 Relay ランチ経路を確認できます。解放状態は変更しません。
- `?debugSkipOpeningBoost=1`: デバッグ用。`SORTIE PREP` 後の Opening Boost 選択をスキップします。
- `?legacyMovement=1`: デバッグ用。通常 Depth の `acV3 AC Movement` を無効化し、旧移動へ戻します。
- `?acMovementRc=1`: 旧RC互換。現在は通常URLと同じ `acV3 AC Movement` として扱います。
- `?acMovementRc=0`: デバッグ用。`legacyMovement=1` と同じく旧移動へ戻します。
- `?debugAcMovement=1&debugAcMovementPreset=acV2`: デバッグ用。旧 acV2 比較プリセットを使います。preset未指定時は v1 比較を維持します。
- `?debugAcMovementHud=1`: デバッグ用。AC移動、BOOST EN、FULL_OVERHEAT、Air Brake、Target Fire、Evasive Firmware、Reactor Cooling、各FXの診断HUDを表示します。
- `?debugAcBoostSe=0`: デバッグ用。通常 Depth の Quick Boost SE を明示的にOFFにします。
- `?debugAcBoostSe=1`: 後方互換の明示ONです。Quick Boost SE は通常 Depth では標準ONのため、通常は指定不要です。
- `?debugAcTargetFire=0` / `?debugAcAirBrake=0` / `?debugAcReactorCoolingShop=0` / `?debugAcEvadeWindow=0` / `?debugAcEvasionPassive=0`: デバッグ用。acV3正式機能を個別に無効化します。
- `?debugAcEnergyWarning=0` / `?debugAcLockonRing=0` / `?debugAcBoostVector=0` / `?debugAcQuickTurnFx=0` / `?debugAcGroundSkid=0` / `?debugAcAttitudeJets=0` / `?debugAcWeightShadow=0`: デバッグ用。AC tactical FX を個別に無効化します。
- `?debugComms=1`: デバッグ用。戦闘中の通信UIテスト文を表示します。
- `?debugCommsStory=1`: デバッグ用。通信ストーリーの保存済みフラグを無視し、このランでは再生済み保存を行いません。
- `?debugCommsStoryReset=1`: デバッグ用。起動時に通信ストーリーの再生済み保存を削除します。
- `?debugCommsStoryDepth=1`: デバッグ用。`1` / `3` / `6` / `8` / `9` / `10` の指定Depth通信を `SORTIE PREP` 後にテスト再生します。
- `?debugEndlessVoidBgm=1`: デバッグ用。Depth11 以降の専用 BGM 切替ログを console に出します。
- `?debugScrambledComms=1`: デバッグ用。Depth11 以降のスクランブル通信ログを console に出します。この指定だけでは発生間隔は短縮しません。
- `?debugScrambledCommsInterval=5`: デバッグ用。スクランブル通信の再試行 / ランダム発生間隔を秒数で固定します。最低 5 秒です。
- `?debugScrambledCommsIntro=1`: デバッグ用。Depth11 以降の導入スクランブル通信を確認しやすくします。
- `?debugVoidHunter=1`: デバッグ用。Depth10 Final Raid 討伐済み判定と Depth11 条件を緩和し、約4秒の静止で低HPの `VOID HUNTER` を確認できます。
- `?debugVoidHunterTrace=1`: デバッグ用。`VOID HUNTER` の通常出現条件は緩和せず、静止カウントのブロック理由、警告到達、スポーン直前キャンセル、出現/討伐を console に出します。
- `?debugStartDepth=10&debugFinalRaid=1&debugFinalRaidScale=0.1&debugFinalRaidPhase=third&debugSkipOpeningBoost=1`: デバッグ用。Depth10 Final Raid を短縮タイマーの第三形態付近から確認します。
- `?debugRaidRescueLink=1`: デバッグ用。Depth10 Final Raid の RESCUE LINK 初期化、ギルド到着、HUD更新、cleanup を console に出します。
- `?debugRaidRescueGuild=10`: デバッグ用。指定ギルド番号 / `guild-010` / `all` の RESCUE LINK 到着通信とHUD登録だけをプレビューします。
- `?debugRaidRescueHud=1`: デバッグ用。RESCUE LINK HUD を Final Raid 外でもプレビュー表示できます。
- `?debugRaidRescueCompact=1`: デバッグ用。PCでもモバイル相当のコンパクト RESCUE LINK HUD を確認します。
- `?debugRaidRescueEffects=1`: デバッグ用。Depth10 Final Raid の救援効果ログを console に出し、debugプレビュー時だけ効果適用を許可します。
- `?debugRaidRescueEffect=heal|shield|beacon|all`: デバッグ用。Final Raid開始後にRELIEF PACKET / RESCUE BEACONを単体プレビューします。`debugRaidRescueEffects=1` と併用します。
- `?debugRaidRescueEffectScale=0.25`: デバッグ用。`debugRaidRescueEffects=1` 時だけ、救援シールド時間、BEACON持続、パルス間隔、toast表示時間を短縮・延長します。回復量やシールド量は変わりません。
- `?debugRaidRescueNoEffects=1`: デバッグ用。ギルド到着通信とRESCUE LINK HUDだけを確認し、RELIEF PACKET / RESCUE BEACONを無効化します。
- `?debugRaidGuildEffects=1`: デバッグ用。Depth10 Final Raid のギルド固有支援効果ログを console に出し、debugプレビュー時だけ効果適用を許可します。
- `?debugRaidGuildEffect=vanguard|ward|bulwark|regen|wind|legend|safehouse|shelter|sanctuary|frontline|excalion|all`: デバッグ用。Final Raid開始後にギルド固有支援効果を単体または一括でプレビューします。`debugRaidGuildEffects=1` と併用します。
- `?debugRaidGuildEffectScale=0.25`: デバッグ用。`debugRaidGuildEffects=1` 時だけ、ギルド固有支援の持続時間やパルス間隔を短縮・延長します。回復量、軽減率、シールド量は変わりません。
- `?debugRaidGuildEffectHit=1`: デバッグ用。ギルド固有支援プレビュー後に小ダメージを1回入れ、Robot Barrier / ギルド軽減 / RELIEF SHIELD / LEGEND GUARD の順序を確認します。
- `?debugRaidBattlefieldControlHud=left|right|both|reset`: デバッグ用。BATTLEFIELD CONTROL HUD の左右兵器状態だけをプレビューします。実際の巨大兵器拘束処理は発動しません。
- `?debugRaidAlliedMesh=1`: デバッグ用。ALLIED MESH 最終救援演出の schedule / skip / phase を console に出し、RESCUE LINK HUD をプレビューできます。
- `?debugRaidAlliedMeshPhase=arrival|maximum|recovery|restored|all`: デバッグ用。エクスカリオン到着、全ノードMAXIMUM、通信復旧中継、外部回線復旧の各表示を単体または連続で確認します。ランキング、支援効果、報酬は変更しません。
- `?debugRaidAlliedMeshScale=0.25`: デバッグ用。`debugRaidAlliedMesh=1` 時だけ、ALLIED MESH 表示演出の時間を短縮・延長します。戦闘効果やタイムラインは変わりません。
- `?debugRaidAlliedMeshIncomplete=1`: デバッグ用。`debugRaidAlliedMeshPhase=maximum` と併用すると12/13ノード不足状態を作り、MAXIMUMが発動しないことを確認できます。
- `?debugMaxBuild=1`: デバッグ用。攻撃スキル全種を最終Stage、ROBOTをLv.20/Tune Lv.20、APを300、推進出力を+100にします。
- `?debugRobotMissileLevel=10`: デバッグ用。ラン開始時のROBOT Missile Lvだけを指定値にします。値は1〜20で、Lv10の通常ミサイル確認には `debugSkipOpeningBoost=1` と併用できます。
- `?debugTriadMatrix=1`: デバッグ用。TRIAD MATRIX の再計算、状態遷移、完成 buildId を console に出します。
- `?debugTriadCore=assault|control|reactor|trinity`: デバッグ用。3攻撃スキルのStage4 Coreをラン内注入します。`trinity` は3種1個ずつになります。
- `?debugTriadFinal=execution|prism|singularity|adaptive`: デバッグ用。3攻撃スキルのStage8 Finalをラン内注入します。`adaptive` は3種1個ずつになります。
- `?debugMutationAtlas=1`: デバッグ用。OPERATIONS HUB の `ARCHIVE` 内 `MUTATION ATLAS` をサンプル状態で開き、保存データは変更しません。
- `?debugStartDepth=10&debugFinalRaid=1&debugFinalRaidScale=0.05&debugFinalRaidPhase=third&debugMaxBuild=1&debugSkipOpeningBoost=1`: デバッグ用。強化済み状態でDepth10 Final Raidを確認します。
- `?debugRecoveryFieldScale=1`: デバッグ用。Recovery Field の HUD アイコン選択画像、表示サイズ、HUD種別を console に出します。
- `?debugShopLoading=geek|shop|sequence`: デバッグ用。保存データを書き換えず、ショップローディングの GEEK 確定、ショップ起動、連続遷移を表示確認します。`debugShopLoadingAmount=12340` で表示額だけ指定できます。
- `?debugEquipmentState=1`: デバッグ用。装備保存状態、品質スコア境界、レアリティ別の未解析箱数を `[EQUIPMENT]` prefix で console に出します。サンプル装備や箱は追加しません。
- `?debugEquipmentHub=1`: デバッグ用。OPERATIONS HUB の GEEKSHOP / EQUIPMENT ANALYSIS を表示専用サンプルで開きます。LEGEND未発見状態として表示し、保存データは変更しません。
- `?debugEquipmentHub=1&debugEquipmentHubLegend=1`: デバッグ用。EQUIPMENT ANALYSIS のLEGEND発見済み表示を確認します。LEGEND装備とLEGEND箱の表示サンプルを使いますが、保存データは変更しません。
- `?debugEquipmentAnalysis=1`: デバッグ用。実際に保存済み未解析箱を解析した時だけ、費用、無料クレジット、重複返金、保存成否、残箱数、統計を `[EQUIPMENT ANALYSIS]` prefix で console に出します。
- `?debugEquipmentBonuses=1`: デバッグ用。出撃開始時の装備スナップショット、部位別スコア、合計品質スコア、各倍率、開始ステータスの適用前後、Final Raid攻撃系抑制を `[EQUIPMENT BONUSES]` prefix で console に出します。
- `?debugEquipmentBonusPreset=empty|n1|ssr5|legend5|mixed`: デバッグ用。出撃開始時の `runEquipmentLoadoutSnapshot` だけを指定プリセットに差し替えます。`lastmemoVansabaEquipmentState`、未解析箱、GEEK、統計、`bestBySlot` 保存値は変更しません。通常は `debugEquipmentBonuses=1` と併用します。
- `?debugEquipmentDrop=N|R|SR|SSR|LEGEND`: デバッグ用。`SORTIE PREP` と Opening Boost 完了後、操作可能になってから指定レアリティの装備箱を戦闘フィールドへ直接出します。これは本番ドロップの Depth 内1箱上限を消費しません。
- `?debugEquipmentDropRank=3&debugEquipmentDropSlot=weapon&debugEquipmentDropCount=1&debugEquipmentDropDistance=180`: デバッグ用。装備箱の Rank、部位、出現数、プレイヤーからの距離を調整します。Rank は1〜5、部位は `head` / `clothes` / `shoes` / `weapon` / `accessory`、出現数は1〜10です。
- `?debugEquipmentRun=1`: デバッグ用。装備箱のラン内初期化、スポーン、取得、マグネット吸引、Depth 遷移破棄、抽出保存、保存失敗、二重転送スキップを `[EQUIPMENT RUN]` prefix で console に出します。この指定だけでは箱は出現しません。
- `?debugEquipmentProduction=1`: デバッグ用。本番装備箱ドロップ判定を `[EQUIPMENT DROP]` prefix で console に出します。この指定だけでは抽選率は変わりません。
- `?debugEquipmentProductionForceDrop=1`: デバッグ用。対象敵の本番ドロップ抽選だけ成功扱いにします。対象外敵、Final Raid、Depth 内1箱上限は迂回しません。
- `?debugEquipmentProductionForceMiss=1`: デバッグ用。対象敵の本番ドロップ抽選だけ失敗扱いにします。ただし Depth1 初回 Wave Boss 保証が優先されます。ForceDrop と併用した場合は警告を出し、通常抽選に戻します。
- `?debugEquipmentProductionRarity=SSR&debugEquipmentProductionRank=5&debugEquipmentProductionSlot=weapon`: デバッグ用。本番ドロップで生成される箱のレアリティ、Rank、部位をラン内だけ上書きします。LEGEND は Depth11 以降かつ Final Raid LEGEND報酬獲得済み、または `debugEquipmentProduction=1&debugEquipmentProductionLegendUnlocked=1` の時だけ許可されます。
- `?debugFinalRaidLegendReward=1`: デバッグ用。Depth10 Final Raid の初回Equipment報酬準備・保存ログを console に出します。報酬内容を通常UIへ先行公開しません。
- `?debugFinalRaidLegendPresentation=1` / `?debugFinalRaidLegendRewardPreview=1`: デバッグ用。Final Raid の未登録Equipment信号演出だけをプレビューします。pending報酬、securedBoxes、localStorage、`finalRaidLegendRewardClaimed` は変更しません。

## ゲーム進行

1. OPERATIONS HUB の `CDSHOP`、`GEEKSHOP`、`ROBOT CUSTOM`、`ANJU MEMORY`、`ARCHIVE` で CD、BGM、永続強化、ロボット系解放、戦闘ログ、MUTATION ATLAS 閲覧を行います。
2. `SORTIE PREP` から Opening Boost 選択へ進み、開始前に 3 回ぶんの強化を選択します。Depth10 Final Raid 討伐後は、その前に DEPTH RELAY で Depth1 通常開始または解放済み転送先を選べます。選択UIは最大3択で、Depth1は常時表示、Relay候補は解放済みAnchorの最新2件だけを表示します。Depth20 Anchor 解放後は Depth1 / Depth10 / Depth20、Depth30 Anchor 解放後は Depth1 / Depth20 / Depth30 の選択になります。
3. DEPTH RELAY で Depth10 を選んだ場合も Final Raid ではなく通常 Depth10 の新しいランとして始まり、Depth1〜9の XP、GEEK、ANJU MEMORY などのスキップ報酬は付与されません。Opening Boost 回数は通常仕様のままです。
4. Depth10 Relay は高難度の開始方法で、永続強化済みの構成を推奨します。Depth10 カードには `HIGH RISK` 警告、強化済み構成推奨、新規ラン開始、スキップ報酬なしの注意が表示されます。
5. Depth20 Relay は `EXTREME RISK` の高難度チャレンジです。Depth10 / Depth20 Anchor が解放済みなら回収ロボ Lv に関係なく選択でき、Legend 装備探索や深層チャレンジ向けの新しいランとして Depth20 から開始します。Depth1〜19の XP、GEEK、ANJU MEMORY などのスキップ報酬は付与されず、Opening Boost は通常どおり 3 回、敵難度補正も緩和しません。深層ではアイテム回収が難しくなるため回収ロボ強化は有効ですが、D20選択の必須条件ではありません。
6. Depth30 Relay は Beacon Network の最終 Anchor で、カードには `BEACON LIMIT` と Depth31 以降がビーコン圏外である警告を表示します。Depth10 / Depth20 / Depth30 Anchor が連鎖解放済みなら Depth30 から新しいランとして開始でき、Depth1〜29の XP、GEEK、ANJU MEMORY などのスキップ報酬は付与されません。D30解放後はD10がプレイヤー向け最新候補から上書きされますが、内部runtime、debug起動、旧記録表示、ランキング互換ではD10 Relayを維持します。Opening Boost は通常どおり 3 回で、Depth30 は LEGEND 掘りの高難度帯です。通常 `EXTRACT` では到達した絶対Depthを `sourceDepth` とする D30帯 Equipment Cache を保存します。Depth30 Anchor により GEEKSHOP / BASE CALIBRATION の Armament / AP Frame / Booster 上限は Lv.25 まで拡張されますが、Depth31 以降への直接 Relay は未実装です。
7. ANJU MEMORY の +1 チケットを持っている場合、最初の Opening Boost だけ 4 択になります。
8. Opening Boost 完了後に戦闘へ出撃し、敵を倒して XP、未確定 GEEK、Support、Robot、LOST ARMS アイテムを集めます。
9. レベルアップ時はスキル解放、スキル強化、パッシブ強化から 3 択で 1 つ選びます。
10. 各 Depth の開始から 120 秒で Stage Gate が開きます。
11. Stage Gate では次の Depth へ進むか、未確定 GEEK を確定してショップへ帰還します。
12. `NEXT STAGE` / `FORCE BREAKTHROUGH` で次 Depth へ進むと、地面に残った一部報酬が DATA CACHE に圧縮されます。
13. Depth10 初回未討伐時は通常フィールドではなく Depth10 Final Raid に入り、残り 40 秒でボス HP が 0 になった後、600 秒到達時に専用の `ドールを解放する` ゲートだけが出現します。このゲートは Depth11 へ進まず、討伐報酬を保存して OPERATIONS HUB へ帰還します。
14. Depth10 Final Raid 討伐後に通常プレイで Depth10 へ到達した場合は通常 Depth として進行し、CDSHOP で選択中の BGM を維持します。
15. Beacon coverage 内のDepthでは選択中CDの通常BGMと通常通信を維持します。Depth10までは常にcoverage内で、Depth10 / Depth20 / Depth30 Anchor が連鎖解放済みの場合は coverage がそれぞれ Depth10 / Depth20 / Depth30 まで広がります。coverage外では選択 CD を保存変更せずラン中だけ `音声/bgm/ENDLESSVOIDAMBIENCE.mp3` へ上書きし、Depth ごとに先頭から再生し直しません。
16. Beacon coverage 外では外部通信、味方通信、通常 Depth 通信、Final Raid 後日談通信を遮断し、既存通信 UI の `SCRAMBLED SIGNAL` 表示で短いスクランブル受信だけが低頻度で発生します。D30 Anchor後もDepth31以降はビーコン圏外です。スクランブル通信はラン内一時状態で、`lastmemoVansabaCommsStoryState` には保存しません。
17. 帰還、ゲームオーバー、Gate 崩壊後はローディング表示を挟んで OPERATIONS HUB に戻ります。

## Depth10 Final Raid

Depth10 初回未討伐時の専用戦闘です。カメラはプレイヤーとボスを同時に収める専用ズームへ切り替わり、ボスは第1形態から第3形態まで浮遊フィールド中央へ固定されます。プレイヤーがボスの奥側へ回り込んだときだけ finalboss の描画 depth がプレイヤーより前になり、手前側ではプレイヤーが前面に出る疑似立体レイヤーになります。Final Raid 中のみプレイヤー推進出力は専用の固定値になり、通常 Depth の推進出力や永続強化には影響しません。

Final Raid の表示レイヤーは、背景、浮遊型巨大機械兵器、浮遊型フィールド、ボス攻撃予兆/持続フィールド、プレイヤー関連、finalboss を基本にします。第三形態の左右巨大兵器による半面ダメージ床エフェクトもプレイヤーとボスより下のレイヤーに表示されます。移動可能範囲は浮遊型フィールドの白いタイル面に沿う六角形へ制限され、背景はわずかに揺れてフィールドが空中に浮いているように見えます。

Final Raid のボスフィールドでは `DOLL FIELD JAMMING` により LOST ARMS が使用不能になります。ABYSS RAIL / GRAVITY SEED の発動、ターゲット探索、残留フィールド、継続ダメージ処理は停止し、HUD の LOST ARMS 枠は `JAMMED` 表示になります。永続 Lv、pity、ラン内仮強化、通常抽出時の保存処理には影響しません。

Final Raid のボスに対するプレイヤー攻撃は、通常のダメージ計算を行わず軽いヒット演出と疑似ダメージ数値だけを発生させます。スキル種別、強化状況、ダメージ倍率によるボス HP や支援ランキングへの影響はありません。ギルド救援もボス HP への実ダメージ計算は行わず、ボス HP と支援ランキングは時刻ベースのストーリー演出として進行します。開始直後はボス HP バーを満タンで安定表示し、最初の救援開始後からHPバー演出が進みます。ボス HP の数値、パーセント、BREAK、REVIVE、RAID SIGNAL、OBJECTIVE 表示は行いません。支援ランキングにはギルドだけを表示し、プレイヤーは表示しません。

第1形態と第2形態では短い予兆付きフィールド攻撃が発生し、Final Raid 専用の被ダメージ値で通常フィールドより緊張感を高めています。第3形態では爆炎/氷結が約3秒残る持続フィールドになり、氷結フィールド命中時は一時的に推進出力が低下します。第3形態の爆炎/氷結はプレイヤー位置、移動方向、直近の魔法着弾点、既存の危険床、左右巨大兵器の半面床を見て候補点を評価し、完全封鎖を避けつつ逃げ道を段階的に狭める詰め将棋型の配置になります。既存4体の通常モンスター Add は第2形態専用で出現し、高耐久の Elite 扱いとして短い予兆付きの小フィールド攻撃を行います。Final Raid の Add に表示されるダメージ数値は実ダメージ計算ではなく疑似数値ですが、出現直後の保護時間、残存数、撃破上限を満たした場合だけ、攻撃ヒット時に低確率で撃破されます。撃破時は通常ドロップや XP 報酬には混ざらず、Heal アイテムだけを落とします。

浮遊型巨大機械兵器 2 体は背景とフィールドの間に表示され、通常スキルや接触ではターゲットになりません。随伴ロボットのミサイルだけが届き、命中時は実 HP を持たない疑似ダメージ数値とヒット演出だけを表示します。巨大機械兵器は第3形態から、左兵器はフィールド左半面、右兵器はフィールド右半面に持続型ダメージ床を順番に展開します。Coven が救援参加すると左の巨大機械兵器が拘束され、左半面ダメージ床とそのターゲット判定が停止します。ひとりぼっちの が救援参加すると右の巨大機械兵器が拘束され、右半面ダメージ床とそのターゲット判定が停止します。HP 低下中はボス本体の危険フィールドと巨大兵器半面床が短時間に重なりすぎないよう、巨大兵器側が短く発動を遅らせます。ボス討伐時には、左右の巨大機械兵器本体、拘束演出、ターゲット判定、残っているダメージ床をまとめて削除します。

支援ランキングは終盤まで REDWOLF が上位に残り、残り 1:45 でエクスカリオンが救援参加します。エクスカリオンは 5 位から 4 位、3 位、2 位へ段階的に上がり、残り 1:10 で 1 位になる演出です。REDWOLF は最終的に 2 位でレイドを終えます。ランキング数値は表示用の演出値で、リアルタイムのボス HP 計算には使いません。残り 2:00 で TIMELIMIT パネルが赤色に変化し、残り 0:40 でボス HP が 0 になってボス表示、当たり判定、左右の浮遊型巨大機械兵器とそのターゲット判定が消え、ランキング更新も停止します。600 秒到達後に `ドールを解放する` ゲートで討伐報酬を保存して OPERATIONS HUB へ帰還します。

Final Raid 中は `DOLL FIELD JAMMING` により福音領域外から内部への `EXTERNAL DOWNLINK` が遮断されます。一方で内部から外部への `EMERGENCY UPLINK` は有効で、救援に到着したギルドとは `LOCAL MESH` で短距離通信できます。到着済みギルドは支援ランキングとは別に `RESCUE LINK` HUDへ到着順で表示されます。各ギルド初到着時は最大AP4%分の `RELIEF PACKET` が届き、AP不足分を回復し、余剰分は12秒間の `RELIEF SHIELD` へ変換されます。RELIEF SHIELD の上限は最大AP8%で、既存 Robot Barrier Field の後、APダメージ前にだけ吸収します。7番目の `LOCAL MESH` 接続時には1回だけ `RESCUE BEACON` が展開され、10秒間に4回、範囲内のプレイヤーを最大AP3%ずつ回復します。これらはFinal Raidラン内限定の生存補助で、既存Robot Recovery Field / Barrier Fieldとは別系統です。ボスHP、支援ランキング、ギルド参戦時刻、報酬、GEEK、ANJU MEMORY、Run Archive、Firebaseには影響しません。

各ギルド初到着時には、共通の `RELIEF PACKET` に加えてラン内限定のギルド固有支援が1回だけ発動します。乙女の牙はAP不足分優先の `VANGUARD AID`、SilentAngelは氷結スローを1回防ぐ `DEBUFF WARD`、アースクリエイターは10秒間10%軽減の `EARTHEN BULWARK`、Dream_Happyは短い分割回復の `HOPE REGEN`、千の風はスロー解除とブーストEN回復の `WIND RELEASE`、JGGLegendsは次のAPダメージを50%軽減する `LEGEND GUARD`、Doll'sHouseはBEACON内だけ10%軽減とスロー無効になる `SAFEHOUSE LINK`、シルバニアファミリーはRELIEF SHIELDを上限まで補充する `FAMILY SHELTER`、アークエンジェルズは10秒間12%軽減とスロー無効の `SANCTUARY LINK`、REDWOLFは12秒間15%軽減の `FRONTLINE GUARD`、エクスカリオンは回復・シールド・スロー解除・ブーストEN全回復・15%軽減をまとめた `ALLIED MESH MAXIMUM` を付与します。軽減効果は加算せず、同時有効中の最大値だけを採用し、上限は15%です。Coven / ひとりぼっちの は既存の左右巨大兵器拘束を担当し、RESCUE LINK HUD 内の `BATTLEFIELD CONTROL` で左右兵器の `STANDBY` / `HOSTILE` / `LOCKING` / `SEALED` / `OFFLINE` 状態を確認できます。

エクスカリオン初到着時に13ギルド全ノードが接続済みなら、RESCUE LINK HUD 内の `MESH ARRAY` が順番に点灯し、全13ノードが `ALLIED MESH: MAXIMUM` として同期します。この同期表示はネットワーク状態の演出であり、エクスカリオン到着時の既存支援効果を再適用、延長、強化しません。ボス撃破後はALLIED MESHが中継回線となり、HUDは `ALLIED MESH: RELAY MODE`、後日談通信の復旧ログ表示時は `VOICE CARRIER DETECTED`、専用帰還ゲート出現時は `ALLIED MESH: STABLE` へ段階的に変化します。

## GEEK 仕様

`GEEK` はゲーム内通貨です。

- 確定 GEEK: ショップで使用できる所持通貨です。
- 未確定 GEEK: ラン中に獲得し、帰還するまで確定しない通貨です。
- HUD には未確定 GEEK、GEEK 係数、Depth、Gate 残り時間が表示されます。
- 通常 `EXTRACT` では未確定 GEEK の 100% が確定 GEEK になります。
- 通常ゲームオーバー、Depth 5 までの Gate 崩壊では未確定 GEEK を失います。
- Depth 6 以降の不安定 Gate では、緊急脱出時に未確定 GEEK の一部だけを確定できます。

Depth 6 以降では `GEEK MILESTONE BONUS` が解禁され、Depth / 不安定度 / ANOMALY CONTRACT の既存 GEEK 係数に加算されます。これはラン中に獲得する未確定 GEEK の補正であり、確定 GEEK、ショップ通貨、`lastmemoVansabaCoins` を直接増やすものではありません。

GEEK MILESTONE BONUS:

- Depth6 `DEEP SIGNAL`: GEEK 係数 +0.15
- Depth8 `VOID RESONANCE`: GEEK 係数 +0.30
- Depth10 `ANJU MEMORY FIELD`: GEEK 係数 +0.50
- Depth12 `SINGULARITY GATE`: GEEK 係数 +0.75
- Depth15 `LASTMEMO DEEP CORE`: GEEK 係数 +1.10

節目ボーナスは到達済み最大節目だけが有効です。Depth10 では +0.50 が適用され、Depth6 / Depth8 の値をさらに足しません。`ANJU MEMORY FIELD` は名称上の演出で、ANJU MEMORY 通貨を直接増やす効果ではありません。

適用対象は Bronze / Silver / Gold の未確定 GEEK 成分に加え、OVERDRIVE / STABILIZE overflow、DEPTH DIRECTIVE、NEMESIS BOSS、LOST ARMS RESONANCE overflow など `scaleRunCoinReward()` 経由で計算されるラン内未確定 GEEK 報酬です。DATA CACHE は生成時点で milestone 込みの絶対値 payload を持つ場合のみ反映され、回収時には再計算しません。

互換性維持のため、確定 GEEK の localStorage キー名は `lastmemoVansabaCoins` のままです。

## アイテムと報酬

通常アイテム:

- XP オーブ: XP のみを獲得します。
- Bronze: 10 XP / 基礎 100 GEEK を獲得します。
- Silver: 20 XP / 基礎 1,000 GEEK を獲得します。
- Gold: 38 XP / 基礎 3,000 GEEK を獲得します。
- DATA CACHE: Depth 遷移時に残った XP / 未確定 GEEK 報酬を圧縮した箱です。
- Heal: AP を回復します。
- Magnet: XP オーブ、Bronze / Silver / Gold、DATA CACHE、Robot、LOST ARMS、装備箱を引き寄せます。
- Support: サポート攻撃を発動します。
- Robot: 随伴ロボットの本体レベルやチューニングを強化します。
- LOST ARMS コア: レア武器のラン内仮強化です。
- 装備箱: 通常 Wave Boss、Elite、NEMESIS、Gold Slime、Silver Slime から低確率で出現する未解析 Equipment 箱です。拾うとラン内の一時リストに入り、通常 EXTRACT で全箱、EMERGENCY EXTRACT で最高品質1箱だけ `lastmemoVansabaEquipmentState.securedBoxes` に保存されます。NEXT STAGE / FORCE BREAKTHROUGH では拾得済み箱だけ持ち越し、地面に残った箱は DATA CACHE に変換せず破棄します。さらに Depth10 以上で通常 EXTRACT に成功した場合は、深層抽出報酬として未解析 Equipment Cache が 1 個 `securedBoxes` に追加されます。Cache の品質は抽出時の絶対 sourceDepth 帯で変わり、D10帯はR以上、D20帯はSR以上、D30帯はSSR以上になります。LEGENDはどの帯でも低確率で、D30帯でも5部位LEGENDコンプは長期目標です。

Bronze / Silver / Gold の獲得 GEEK 量は Depth、Gate 不安定度、GEEK MILESTONE BONUS、ANOMALY CONTRACT で増加します。XP 成分には GEEK MILESTONE BONUS は影響しません。旧仕様の単独 GEEK オーブや、GEEK だけを直接付与する通常ピックアップは使っていません。

Gold Slime は Gold と Golden Tune Vase、Silver Slime は Silver と Silver Tune Vase を確定ドロップします。

## DATA CACHE とドロップ整理

ラン中のドロップが増えすぎないように、ドロップ上限と報酬圧縮があります。

アクティブドロップ上限:

- 全体: 260（Depth 6 以降は実効上限 220、Depth 7 は 200、Depth 8 以降は 180）
- XP: 170
- Bronze / Silver / Gold: 90（Depth 6 以降は実効上限 56、Depth 7 は 42、Depth 8 以降は 34）
- Robot: 28
- Support: 16
- Heal: 4
- Magnet: 3
- DATA CACHE: 3

上限を超えた場合、同カテゴリの報酬は可能な範囲で近いドロップへ統合され、優先度と報酬価値が低いものから整理されます。整理チェックはドロップ生成時と 1 秒ごとの安全クリーンアップで走ります。

Depth 6 以降では、Bronze / Silver / Gold の表示数が実効上限に達している場合、新しい価値ドロップは新規オブジェクトを作らず、近い既存ドロップへ XP と未確定 GEEK を 100% 保持したまま統合されます。統合されたドロップは `x2` 以上のスタック表示を持ち、拾ったときは合算済みの XP / 未確定 GEEK として処理されます。この戦闘中のスタック統合は、Depth 遷移時に残ドロップを 25% で DATA CACHE 化する報酬圧縮とは別処理です。

Depth 遷移時には、地面に残っている XP / Bronze / Silver / Gold / DATA CACHE の報酬量を集計し、XP と未確定 GEEK の 25% を DATA CACHE として再配置します。報酬量や元ドロップ数に応じて 1 から 3 個に分割されます。DATA CACHE は生成時点の絶対値 payload を保持するため、回収時に GEEK MILESTONE BONUS を再適用しません。

装備箱は DATA CACHE 圧縮、同カテゴリ統合、汎用低価値整理の対象外です。地面に残った装備箱は NEXT STAGE / FORCE BREAKTHROUGH / ゲームオーバー / ショップ復帰 / シーン破棄で保存されず破棄され、拾得済みの箱だけがラン内一時リストとして Depth をまたぎます。地面上の装備箱は専用上限 12 個を超えた場合だけ古いものから破棄されます。

## XP、レベルアップ、Overflow 報酬

XP を獲得してレベルアップすると、3 択カード UI が表示されます。

- スキル候補は最大 2 枠です。
- 残り枠はパッシブ候補です。
- 未所持スキルは `NEW SKILL`、所持済みスキルは `SKILL UPGRADE` として表示されます。
- 上限到達済み、または選んでも効果が出ない候補は表示されません。
- パッシブはラン内 Lv.10 が上限です。

### SKILL MUTATION / スキル変異

`basicSkill`、`tornadoSkill`、`rabbitThunderSkill` はラン内限定の `SKILL MUTATION` を持ちます。対象スキルが Stage4 に到達すると `MUTATION CORE SELECT` が開き、次の 3 種から方向性を選びます。

- `ASSAULT CORE`: 火力、撃破速度、Boss / Elite 処理寄り。
- `CONTROL CORE`: 鈍足、吸引、押し戻し、生存寄り。
- `REACTOR CORE`: DASH、OVERDRIVE、ROBOT SYNC、攻撃回転率との連動寄り。

対象スキルが Stage8 に到達すると `FINAL MUTATION SELECT` が開き、次の 3 種から最終形態を選びます。

- `EXECUTION FORM`: 高 HP 敵、Elite、Boss への一点突破。
- `PRISM FORM`: 分裂、連鎖、複製、多段ヒット。
- `SINGULARITY FORM`: 広範囲、持続フィールド、吸引・制圧。

Stage4 Core 3 種と Stage8 Final 3 種の組み合わせで、各スキルは `assault_execution`、`assault_prism`、`assault_singularity`、`control_execution`、`control_prism`、`control_singularity`、`reactor_execution`、`reactor_prism`、`reactor_singularity` の 9 種類の最終形態になります。HUD のスキル枠には `ASLT+PRSM` のような短い mutation チップが表示されます。

mutation は抽出、緊急抽出、ゲームオーバー、Gate 崩壊、ショップ復帰、リスタートでリセットされ、localStorage / sessionStorage には保存されません。GEEK、ANJU MEMORY、確定 GEEK、未確定 GEEK 倍率、ランキング値、Firebase 送信値も直接変更しません。見た目は既存スプライトの tint / scale / alpha / 残像と Phaser Graphics のライン・リング・パルスを組み合わせるため、新規画像が無い場合でも Graphics 等の既存フォールバックで動作します。

検証用に `?debugSkillMutation=1` を付けると選択ログが console に出ます。`?debugSkillMutationSkill=basicSkill` のように対象スキルを指定すると Stage4 選択を早期確認できます。`?debugSkillMutationCore=assault&debugSkillMutationFinal=prism` を併用すると指定 finalForm をラン内だけでプレビューできます。

### TRIAD MATRIX / MUTATION ATLAS

`basicSkill`、`tornadoSkill`、`rabbitThunderSkill` の選択済み Mutation を横断し、ラン内の `TRIAD MATRIX` 状態を算出します。Core 軸は `assault` / `control` / `reactor`、Final 軸は `execution` / `prism` / `singularity` を使い、既存 mutation 値はリネームしません。

Core / Final とも、同じカテゴリが 2 個揃うと `LINK I` になります。3 スキルすべて同じカテゴリなら `MATRIX II`、3 種が 1 個ずつなら混成 `MATRIX II` です。3 個選択済みでも 2:1 構成は `LINK I` のままで、Atlas対象の完成ビルドにはなりません。

Core完成分類:

- `ASSAULT ARRAY`
- `CONTROL GRID`
- `REACTOR LOOP`
- `TRINITY CORE`

Final完成分類:

- `EXECUTION PROTOCOL`
- `PRISM CASCADE`
- `SINGULARITY DOMAIN`
- `ADAPTIVE FORM`

Core と Final の両方が `MATRIX II` になった場合だけ、`assault_array__execution_protocol` のような安定 buildId を持つ完成ビルドになります。組み合わせは 4 x 4 の合計 16 種類です。HUD には `TRIAD: ASLT-I / PRSM-II`、`TRIAD: TRIN-II / ADPT-II` のような短縮表示が出ます。状態変化時だけ `TRIAD LINK ESTABLISHED` や `TRIAD MATRIX ONLINE` の短い通知が表示されます。

TRIAD MATRIX の戦闘効果は、3 攻撃スキルと既存 SKILL MUTATION 効果だけへ適用されます。Support、Robot 本体/ミサイル/回復フィールド、LOST ARMS、NEMESIS固有報酬、GEEK報酬、ANJU MEMORY報酬、環境ダメージには適用しません。

- `ASSAULT LINK I` / `ASSAULT ARRAY`: 3 攻撃スキルの実ダメージ x1.04 / x1.08。
- `CONTROL LINK I` / `CONTROL GRID`: 既存 Mutation 由来の鈍足、持続、押し戻し、制圧フィールド系の制御性能 x1.06 / x1.12。
- `REACTOR LINK I` / `REACTOR LOOP`: OVERDRIVEゲージ獲得量とROBOT SYNCゲージ獲得量 x1.06 / x1.12、DASH中ブーストEN消費 x0.97 / x0.94。
- `TRINITY CORE`: 実ダメージ x1.03、制御性能 x1.05、OVERDRIVE/ROBOT SYNCゲージ x1.05、DASH中ブーストEN消費 x0.97。
- `EXECUTION LINK I` / `EXECUTION PROTOCOL`: 既存のBoss / Elite / 高HP通常敵判定への3攻撃スキル対象ダメージ x1.06 / x1.12。
- `PRISM LINK I` / `PRISM CASCADE`: 既存PRISM Mutationの分岐・連鎖・副次攻撃ダメージ x1.08 / x1.15。分岐数や同時存在数は増えません。
- `SINGULARITY LINK I` / `SINGULARITY DOMAIN`: 既存SINGULARITY Mutationのフィールド半径、持続、吸引/制圧系の値 x1.06 / x1.12。
- `ADAPTIVE FORM`: Execution対象ダメージ x1.05、PRISM副次攻撃ダメージ x1.06、SINGULARITY系の値 x1.06。

`MUTATION ATLAS` は OPERATIONS HUB の `ARCHIVE` タブ内サブビューから確認できます。`RUN ARCHIVE` / `MUTATION ATLAS` を切り替え、4 行 x 4 列のセルで 16 種類の完成ビルドを表示します。Atlas状態は `lastmemoVansabaMutationAtlasState` に保存され、GEEK、ANJU MEMORY本体計算、RUN ARCHIVE、ランキング、Firebaseには混ざりません。破損JSONや古い保存データでも 16 セルを初期化して起動します。

Atlas進捗:

- `DISCOVERED`: 完成ビルド成立時に記録します。Depth制限はなく、ゲームオーバーでも保持されます。報酬はありません。
- `BEST DEPTH`: 完成ビルド成立後、そのランの最大到達 Depth が既存値を超えた場合だけ更新します。
- `PRESERVED`: 完成ビルド成立、最大到達 Depth 6 以上、通常 `EXTRACT` 成功時だけ記録します。`EMERGENCY EXTRACT`、ゲームオーバー、Gate Collapse、初回Depth10 Final Raid帰還では記録しません。
- 初回 `PRESERVED` 報酬として、既存ANJU MEMORYへ別枠の `ATLAS PRESERVE BONUS +1 AM` を 1 回だけ付与します。既存のANJU MEMORY三角数計算、マイルストーン、不安定度補正、ランキング/Firebase送信値には含めません。

`MUTATION ATLAS` では 16 セルから `RESEARCH TARGET` を 1 つ選べます。未発見セルも対象にできます。選択中セルをもう一度押すか詳細パネルの `CLEAR TARGET` で解除できます。出撃開始時の `selectedTargetId` をラン内に snapshot するため、出撃中にショップ保存値が変わってもそのランの目標は変わりません。研究達成条件は、出撃開始時の targetId と完成ビルドIDが一致し、最大到達 Depth 8 以上で通常 `EXTRACT` 成功することです。達成時は `researchCompleted` を保存し、既存の Opening Boost Reroll Ticket を 1 枚だけ付与します。

Depth 6 以上の `DEEP EXTRACTION RESULT` では、完成ビルドがある場合に `TRIAD BUILD`、`ATLAS: DISCOVERED / PRESERVED`、`BEST DEPTH`、`ATLAS PRESERVE BONUS +1 AM`、`RESEARCH TARGET COMPLETE`、`OPENING BOOST REROLL +1` を別行で表示します。通常の抽出GEEK、緊急抽出保護率、既存ANJU MEMORY計算、ランキング登録、Firebase送信値は変更しません。RUN ARCHIVE 詳細にも `BUILD: CONTROL GRID / PRISM CASCADE` のように完成ビルドを保存・表示します。

Depth10初回 Final Raid 中は TRIAD HUD、TRIAD戦闘効果、Atlas記録、PRESERVED、Research Target、Atlas報酬をすべて無効化します。Final Raid のボス、Add、巨大兵器、救援、タイマー、報酬、帰還ゲートには影響しません。Final Raid討伐後に後続ランで通常Depth10へ到達した場合は通常ランとしてTRIAD MATRIX / MUTATION ATLASの対象になります。

検証用に `?debugTriadMatrix=1` を付けるとTRIAD再計算、状態遷移、完成 buildId を console に出します。`?debugTriadCore=assault|control|reactor|trinity` と `?debugTriadFinal=execution|prism|singularity|adaptive` は3スキルへラン内Mutationを注入します。この注入ランではAtlas保存、ANJU MEMORY報酬、Reroll Ticket報酬、Research完了、実RUN ARCHIVEへのTRIADビルド保存を行いません。`?debugMutationAtlas=1` はOPERATIONS HUB起動時に保存を書き換えないサンプルAtlasを表示します。

通常のレベルアップ強化は Lv.25 までを基準にし、Depth 6 以降で Lv.25 に到達している場合は `DEEP LEVEL` 成長に切り替わります。`DEEP LEVEL` は Lv.99 まで上昇し、カード選択を出さずに 1 レベルごとに Lv.25 時点の最大AP基準で約 1% の最大APと同量の現在APを加算します。Depth 6 未満では `DEEP LEVEL` は解禁されません。

すべてのスキル候補とパッシブ候補が上限に達した後の XP は `OVERDRIVE` に変換されます。

Depth 6 以降の `DEEP LEVEL` 中は、獲得 XP が Lv.99 までの Deep Level 進行にも入りつつ、既存どおり `OVERDRIVE` ゲージにも変換されます。Lv.99 到達後の XP は `OVERDRIVE` へ流れます。

OVERDRIVE:

- 100% で発動します。
- 1 XP が 1% ゲージになります。
- Overflow XP の 12% 相当を基礎値として、Depth / 不安定度補正つきの未確定 GEEK も得ます。
- 発動時間は 30 秒、延長込み最大 60 秒です。
- 発動中はダメージ x1.15、推進出力 x1.12、攻撃間隔 x0.88 になります。
- HUD 中央に `OD` ゲージと残り秒数が表示されます。

Depth 6 以降で OVERDRIVE が新規発動する場合、即時発動ではなく `OVERDRIVE MOD SELECT` の 3 択カードが開き、その OVERDRIVE 中だけ有効な MOD を 1 つ選びます。Depth 1〜5 は従来どおり自動発動します。すでに OVERDRIVE 中にゲージが 100% へ到達した場合は選択 UI を出さず、現在の MOD を維持したまま発動時間だけ延長します。レベルアップ、Gate、STABILIZE PROTOCOL、LOST ARMS RESONANCE など別 overlay が開いている場合、MOD 選択はキューされ、overlay が閉じてから表示されます。抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄で MOD 状態と未表示キューは破棄され、保存データには残りません。

OVERDRIVE MOD:

- `CHAIN VOLTAGE`: 0.9 秒ごとに最大 3 体へ連鎖雷撃を行います。範囲 280、威力は通常弾基準 x0.65 で、再分岐はしません。
- `HUNTER MODE`: ボス/エリートへのプレイヤー側ダメージ x1.25、高 HP 通常敵へのダメージ x1.12。Support finisher 由来の広域ダメージは上限を抑えます。
- `MAGNET STORM`: 発動時に半径 900 内の XP、価値ドロップ、DATA CACHE、Robot、Support、LOST ARMS / RESONANCE ECHO を引き寄せ、通常 MAGNET の範囲 x1.60、引き寄せ速度 x1.35。
- `GOLD FEVER`: Bronze / Silver / Gold の未確定 GEEK x1.20、DATA CACHE の未確定 GEEK x1.15。確定 GEEK と保存済み通貨には影響しません。
- `GUARD PULSE`: 発動直後 2.5 秒だけ被ダメージ x0.78、半径 220 の敵を押し戻します。
- `COOLDOWN REACTOR`: OVERDRIVE 中の攻撃間隔をさらに x0.88、推進出力を x0.96 にします。

検証用に `?debugOverdriveMod=1` を付けると、Depth 1 から MOD 選択条件を確認でき、console に選択ログが出ます。

## STABILIZE

Robot 報酬や Support 報酬が上限または無効で通常効果を出せない場合、`STABILIZE` と未確定 GEEK に変換されます。

変換量:

- Robot Core 上限: STABILIZE +28%、基礎 120 GEEK
- Silver Tune Vase 上限: STABILIZE +18%、基礎 80 GEEK
- Golden Tune Vase 上限: STABILIZE +42%、基礎 220 GEEK
- Support 無効時: STABILIZE +22%、基礎 100 GEEK

STABILIZE は 100% で 1 チャージになり、最大 3 チャージまで保持します。チャージ上限を超える分は未確定 GEEK に変換されます。Depth 1〜5 では従来どおり、次に Stage Gate が出現したとき保持チャージをすべて自動消費し、1 チャージあたり Gate 安定時間を 5 秒延長します。

Depth 6 以降では Stage Gate 出現時に STABILIZE チャージを自動消費せず、Gate 上で `STABILIZE PROTOCOL` として使い道を選べます。Gate 選択中に `3`、または `STABILIZE PROTOCOL` パネルを押すと Protocol メニューを開きます。1 つの Gate で使える Protocol action は 1 回だけです。

STABILIZE PROTOCOL:

- `EXTEND GATE`: 全チャージ消費、1 チャージあたり Gate 安定時間 +5 秒、最大 +15 秒。
- `SEAL INSTABILITY`: 2 チャージ消費、不安定度 -1。現在の不安定度が 0 の場合は使えません。
- `SECURE CACHE`: 1 チャージ消費、次 Depth 開始時の DATA CACHE 報酬に 60 + Depth x10 XP と Depth / 不安定度補正つきの基礎 500 GEEK を追加または統合します。次 Depth へ進まない場合、この予約報酬は破棄されます。
- `ANCHOR EXTRACT`: 3 チャージ消費、次の `EMERGENCY EXTRACT` の未確定 GEEK 保護率 +25%。保護率は既存の不安定度・契約補正を下げない範囲で最大 85% 目安に制限され、ANJU MEMORY の保存率には影響しません。
- `HOLD CHARGES`: 消費せずに Protocol メニューを閉じ、チャージを温存します。

HUD 中央に `ST` ゲージとチャージ数が表示されます。抽出、ゲームオーバー、ショップ復帰時には OVERDRIVE / STABILIZE とラン内パッシブ Lv はリセットされます。

## Depth と Stage Gate

Depth は 1 から開始します。各 Depth の開始から 120 秒で Stage Gate が開き、出現 30 秒前から警告が始まります。Gate は通常 30 秒間安定し、STABILIZE チャージを持っている場合は出現時に安定時間が延長されます。

Gate 接近演出:

- 30 秒前からワールド中央に `GATE SIGNAL` とカウントダウンリングが表示されます。
- 残り 10 秒から `GATE IMMINENT` になり、HUD のエッジ警告とテンションバーが強まります。
- Gate 出現中は `GATE ONLINE` / `GATE COLLAPSING` / `UNSTABLE GATE` の表示、円形タイマー、粒子、パルスで残り時間と危険度を示します。
- 不安定化時は画面フラッシュ、ピンク系の Gate 色、`INSTABILITY STACK` 表示で状態変化を示します。

通常 Gate 選択:

- `NEXT STAGE`: 次の Depth に進み、敵強化と GEEK 係数上昇を受けます。
- `EXTRACT`: 未確定 GEEK を 100% 確定してランを終了します。

不安定 Gate 選択:

- `FORCE BREAKTHROUGH`: 不安定度を保持したまま次の Depth へ進みます。
- `EMERGENCY EXTRACT`: 不安定度に応じた割合だけ未確定 GEEK を確定し、残りを失います。

Depth 5 までに Gate を放置すると崩壊してゲームオーバーになります。Depth 6 以降では崩壊の代わりに不安定度が蓄積し、敵 HP、敵攻撃力、GEEK 係数、緊急脱出率に影響します。

Depth6、8、10、12、15 に入ると `GEEK MILESTONE` 通知が短く表示されます。HUD の GEEK 係数には現在の節目が `D8+0.30` のように併記され、Gate 表示では次の節目がある場合に `NEXT D10`、節目到達直前の NEXT / FORCE カードでは `NEXT DEPTH 10 BONUS` のように表示されます。Depth15 以降は `MAX` / `D15 CORE` 表示になります。

### DEEP EXTRACTION RESULT

Depth 6 以降に通常 `EXTRACT` または `EMERGENCY EXTRACT` が成功すると、ランキング入力やショップ復帰の前に `DEEP EXTRACTION RESULT` が表示されます。通常抽出では `DEEP EXTRACTION RESULT`、緊急抽出では `EMERGENCY DEEP EXTRACTION / Partial data secured` として、到達 Depth、確定 GEEK、生存時間、撃破数、Elite / Boss、Instability、GEEK 最大倍率、ANJU MEMORY、LOST ARMS、装備箱の保存 / 喪失、Depth10 以上の通常抽出で保存された Equipment Cache、NEMESIS、DEPTH DIRECTIVE、TRIAD BUILD / MUTATION ATLAS、ベスト更新、Grade を表示します。

この画面は演出と集計表示だけです。`secureRunCoins()` の確定額、緊急脱出の保護率、`lastmemoVansabaCoins`、`lastmemoVansabaExtractionMessage`、ランキング、Firebase 送信値は変更しません。Continue、Enter、Space、タップで既存のランキング入力または OPERATIONS HUB 復帰へ進みます。

検証用に `?debugDeepResult=1` を付けると、OPERATIONS HUB 起動直後に保存なしのプレビュー結果画面を表示し、Depth 6 未満の抽出でも結果画面の発生条件を確認できます。デバッグ指定は表示条件だけを緩和し、GEEK / ANJU MEMORY / ランキング保存値は増やしません。

## ANOMALY CONTRACT

Depth 6 以降へ `NEXT STAGE` または `FORCE BREAKTHROUGH` で進むと、次 Depth だけ有効な `ANOMALY CONTRACT` を 3 択から選びます。契約には `DANGER` と `REWARD` があり、契約状態はラン内だけの一時状態です。ショップ永続強化、確定 GEEK、localStorage には保存されません。

契約一覧:

- `GREED PROTOCOL`: 敵 HP +18%、敵攻撃力 +8% / GEEK 係数 +0.35
- `LOST SIGNAL`: 敵 HP +8%、ボス HP +30% / LOST ARMS 抽選率 +2.5%、pity 上昇量 +25%
- `STABILIZE ANCHOR`: 敵 HP +12% / STABILIZE 獲得量 +35%、Gate 安定時間 +5 秒、EMERGENCY EXTRACT 保護率 +10%
- `OVERDRIVE CIRCUIT`: 敵移動速度 +8%、敵攻撃力 +6% / OVERDRIVE 獲得量 +40%、発動時間 +5 秒
- `CACHE BLOOM`: 敵 HP +10%、敵攻撃力 +6% / DATA CACHE 圧縮率 +10%、DATA CACHE 内の未確定 GEEK +15%
- `GOLD STORM`: 敵 HP +15%、ボス攻撃力 +10% / Gold Slime・Silver Slime 抽選重み x1.25、Bronze / Silver / Gold の未確定 GEEK +20%

## DEPTH DIRECTIVE

Depth 6 以降の各 Depth 開始時に、短期ミッション `DEPTH DIRECTIVE` を 3 択カードから 1 つ選びます。Depth 遷移と ANOMALY CONTRACT の有効化が完了したあとにキューされ、レベルアップ、Gate、STABILIZE PROTOCOL、OVERDRIVE MOD、LOST ARMS RESONANCE など別 overlay が開いている場合は、その overlay が閉じてから表示されます。

DIRECTIVE はその Depth 中だけ有効なラン内一時状態です。localStorage / sessionStorage / Firebase には保存されず、抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄で未表示キュー、進捗、Beacon、Directive Slime、タイマーを破棄します。Gate 開放時点で未達成の DIRECTIVE は失敗します。

DIRECTIVE 一覧:

- `BOSS HUNTER`: Boss / Elite を撃破。Depth 6 は 1 体、Depth 7 以降は 2 体。報酬は LOST ARMS SIGNAL と未確定 GEEK。
- `DATA RECOVERY`: Directive Beacon を 3 個回収。報酬は DATA CACHE。DATA CACHE が上限 3 個に達している場合は既存 CACHE へ payload を統合します。
- `NO RETREAT`: Gate 開放時に AP 50% 以上を維持。報酬は STABILIZE +100% と未確定 GEEK。
- `SLIME SIGNAL`: Depth 中に出現する Directive Slime を撃破。報酬は Gold cache と未確定 GEEK。Directive Slime の通常 Gold Slime 確定報酬と LOST ARMS 抽選は抑制します。
- `CLEAN SWEEP`: 敵を `160 + (Depth - 6) x 12` 体撃破。報酬は OVERDRIVE +50% と未確定 GEEK。
- `GATE ANCHOR`: Elite 1 体撃破、かつ Bronze / Silver / Gold を 8 個回収。報酬は次に開く Gate の安定時間 +8 秒と未確定 GEEK。
- `RESONANCE HUNT`: LOST ARMS Core / RESONANCE ECHO を 1 個回収。報酬は対象 LOST ARMS の RESONANCE +1。候補がない場合は未確定 GEEK へ変換します。

HUD 中央には active DIRECTIVE の名称、進捗、報酬が小さく表示されます。`?debugDepthDirective=1` を付けると Depth 1 から選択条件を確認でき、console に選択・完了・失敗ログが出ます。

## NEMESIS BOSS

Depth 6 以降では、各 Depth に最大 1 体だけ高 Depth 専用ボス `NEMESIS BOSS` が出現する可能性があります。出現抽選率は D6=25%、D7=35%、D8=45%、D9=55%、D10+=65% です。抽選に通った場合、Depth 開始から 45〜90 秒後に出現を試みます。

NEMESIS は Gate が近すぎる場合、Gate が開いている場合、Gate 選択中、通常 wave boss が生存中、元素騎士イベント中、別 overlay 表示中には出現しません。overlay / 元素騎士 / 通常 boss で一時的に塞がれている場合は Gate まで余裕がある間だけ retry します。NEMESIS が warning / active の間は通常 wave boss の出現も遅延します。Gate が開いた時点で生存中の NEMESIS は cleanup され、Depth 遷移、抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄でも timers / tweens / marker / HP HUD を破棄します。

使用素材は元素騎士イベントのモンスター boss 素材 3 体です。サポートキャラクター素材は使いません。

- `NEMESIS BRUTE`: `画像/support/gensoKnights/boss_01.png`、既存 `boss_crack` の拡大型 shockwave。
- `NEMESIS CASTER`: `画像/support/gensoKnights/boss_02.png`、既存 `boss_random_blast` の広域 rune blast。
- `NEMESIS WRAITH`: `画像/support/gensoKnights/boss_03.png`、既存 `boss_lightning_dash` の広域 dash / lightning。

撃破報酬は未確定 GEEK、Gold / Silver、STABILIZE +50%、Robot 追加抽選、LOST ARMS 追加抽選です。通常 boss と同じ `isBoss` 扱いで LOST ARMS / Robot の既存抽選にも乗りますが、wave boss 進行は進めません。DEPTH DIRECTIVE では `BOSS HUNTER` にカウントし、`CLEAN SWEEP` の通常敵撃破数には入りません。NEMESIS 状態はラン内一時状態で、localStorage / sessionStorage / Firebase には保存されません。

検証用に `?debugNemesis=1` を付けると Depth 1 から出現抽選を通し、約 10 秒後に低 HP の NEMESIS を出現させ、console に schedule / spawn / defeat ログを出します。

## VOID HUNTER

`VOID HUNTER` は Depth10 Final Raid 討伐後、Depth11 以降の Endless Void でだけ出会える裏ボスです。通常プレイ中の経過時間では出現せず、プレイヤーが操作可能な状態でほぼ静止し続けた時間だけを計測します。移動、DASH、Gate 選択、レベルアップ UI、各種 overlay、ショップ、Final Raid 中は計測しません。通常 Wave Boss の出現中も静止カウントと出現判定は継続しますが、NEMESIS、元素騎士イベント、敵版 `VOID HUNTER`、`虚無を狩る者` サポート中は競合回避のため停止します。

Depth11 以降で 40 秒ほぼ静止すると、25 秒付近で微弱な警告、35 秒付近で強い警告が出たあと、プレイヤー付近に `VOID HUNTER` が出現します。非常に低速で追跡しますが、3 秒予告付きの3点範囲攻撃は必ずプレイヤー足元を1点含み、残り2点で移動方向先と横回避先を塞ぎます。足元予兆は最初の約1秒だけゆっくり追尾してから固定されるため、立ち止まり続けると大ダメージを受ける設計です。攻撃命中時は `VOID JAMMING` が 6.5 秒発生し、Recovery Field のHP回復と Barrier Field のフィールド由来再充填を停止します。攻撃中は `画像/hunter/hunter_attack_motion01.png` から `hunter_attack_motion15.png` を再生し、`hunter_attack_motion12.png` 付近で静止して攻撃範囲を予告します。爆発エフェクトには `画像/hunter/hunter_skill_effect.png` を使い、地面に 2 秒間残留します。

`VOID HUNTER` は出現した Depth 内だけの存在です。Depth11 で出現したあと Gate から Depth12 へ移動した場合、裏ボスは消滅し、討伐フラグは立ちません。討伐する場合は Gate 出現後も同じ Depth に滞在し続け、Depth6+ の不安定度蓄積を受けながら長時間戦う必要があります。抽出、緊急抽出、ゲームオーバー、リスタート、ショップ復帰、シーン破棄でも cleanup されます。

撃破時は通常ドロップ、XP、未確定 GEEK、DATA CACHE、LOST ARMS、STABILIZE には混ざらず、初回討伐時だけ `lastmemoVansabaFinalBossState` に `voidHunterDefeated` と `unlockedVoidHunterSupport` を保存します。以後、Support アイテムから低確率でサポート攻撃 `虚無を狩る者` が参戦します。`虚無を狩る者` は既存サポート攻撃と同じカットイン演出で `画像/hunter/cutin.png` を表示し、敵として出現した `VOID HUNTER` と同じスケール、低速移動、攻撃モーション、3秒予告付き3点範囲攻撃を40秒間行います。サポート版の攻撃は敵だけを対象にし、プレイヤーには命中しません。敵版 `VOID HUNTER` が出現中は `虚無を狩る者` を抽選候補から除外し、`虚無を狩る者` が active の間は敵版 `VOID HUNTER` の静止カウントを停止してリセットします。裏ボスの状態は保存済み初回討伐フラグ以外はラン内一時状態で、Depth 遷移時に持ち越しません。

通常条件でも `voidHunterDefeated` 保存後に再出現します。ただし同一 Depth 内では、出現済みまたは討伐済みの場合は再出現しません。2回目以降の討伐は追加報酬なしで、初回討伐フラグとサポート解禁状態だけを維持します。

検証用に `?debugVoidHunter=1` を付けると Depth 1 から条件確認でき、静止時間は約 4 秒、HP は低倍率になります。`?debugStartDepth=11&debugSkipOpeningBoost=1&debugVoidHunter=1` と併用すると Endless Void 側の確認に使えます。

## ANJU MEMORY

`ANJU MEMORY` は Depth 6 以降の生還でだけ獲得できるメタ報酬通貨です。確定 GEEK、未確定 GEEK、CD/永続強化のショップ状態とは別に保存され、`lastmemoVansabaCoins` や `lastmemoVansabaShopState` には混ざりません。

獲得条件:

- ラン中に到達した最大 Depth が 6 以上のときだけ候補になります。
- 通常 `EXTRACT` または `EMERGENCY EXTRACT` が成功した瞬間に保存されます。
- ゲームオーバー、Depth 5 までの Gate 崩壊、リスタート、ショップ復帰、デバッグ終了では保存されません。
- Depth 6 に初到達したランでは `ANJU MEMORY UNLOCKED` が表示されますが、抽出するまで保存されません。

報酬計算:

- Depth 繰り返し報酬は `maxDepthReached - 5` の三角数です。例: D6=1、D7=3、D8=6、D9=10、D10=15、D12=28。
- 初到達マイルストーンは D6:+3、D8:+5、D10:+8、D12:+12、D15:+20 です。
- 不安定度 1 スタックごとに +8%、最大 +40% のボーナスが乗ります。
- 通常抽出は `floor(raw * 1.0)`、Depth 6 以上なら最低 1 AM です。
- 緊急抽出は `floor(raw * 0.35)` で、raw が 1 以上なら最低 1 AM です。
- マイルストーンは保存された報酬が 1 AM 以上のときだけ達成済みにします。緊急抽出でも 1 AM 以上を獲得した場合は、そのランで到達した未達マイルストーンを消費します。
- MUTATION ATLAS の初回 `PRESERVED` 報酬は `ATLAS PRESERVE BONUS +1 AM` として別枠で加算されます。既存の三角数計算、マイルストーン、不安定度補正、ランキング/Firebase送信値には含めません。

OPERATIONS HUB の `ANJU MEMORY` タブでは、AM 残高、累計獲得、最高抽出 Depth、チケット所持数を確認できます。HUD では Depth 6 以降に `ANJU MEMORY +n? / Extract to preserve` として未確定の見込み値を表示します。

ANJU MEMORY ショップ報酬:

- Deep CD: `ANJU ECHO` は Depth6+ の STABILIZE 獲得量 +5%、`VOID SIGNAL` は Depth6+ の LOST ARMS 抽選率 +0.005、`GATE REFRAIN` は Depth6+ の Gate 安定時間 +2 秒です。購入後は選択不要で常時有効ですが、効果は Depth6+ のみです。
- HUD / Gate / LOST ARMS スキン: 購入して選択します。見た目だけを変え、性能には影響しません。
- Opening Boost +1 Ticket: 次ラン開始時、`SORTIE PREP` 後の最初の Opening Boost だけ候補数を +1 し、表示直前に 1 枚消費します。
- Opening Boost Reroll Ticket: Opening Boost 画面に `REROLL` を表示し、1 ラン 1 回だけ候補を引き直します。押した時点で 1 枚消費します。
- Title / Badge: 購入して選択すると HUD やランキング表示に反映されます。
- Memory Log: 購入後、ANJU MEMORY ショップ内で本文を読めます。
- Result Frame: Depth6+抽出で AM を獲得した結果画面のフレームを変えます。
- Contract Card Back: ANOMALY CONTRACT のカード背面を変えます。

## 戦闘仕様

プレイヤー初期値:

- AP（アーマーポイント）: 100
- 推進出力: 310
- BOOST EN: 100
- DASH 速度倍率: 1.68
- DASH ブーストEN消費: 38 / 秒
- ブーストEN回復: 24 / 秒

通常 Depth では acV3 移動、target-facing、EN warning ring、Lock-on ring、Boost Vector、Quick Turn FX、Ground Skid FX、Attitude Jet、Weight Shadow、Air Brake、Target Fire visual-only、Evade Window、Evasive Firmware、Reactor Cooling、Quick Boost SE が標準有効です。Final Raid 中はこれらの AC 移動・AC HUD・AC演出・target-facing・Target Fire・Evade Window・Air Brake・Reactor Cooling の acV3 効果、Quick Boost SE を無効化し、Final Raid 専用挙動を維持します。

BOOST EN は Quick Boost / 継続ブーストで消費し、EN 0 の `FULL_OVERHEAT` では全回復までブーストできません。Reactor Cooling や装備 BOOSTER の回復補正は通常回復量へ乗算され、FULL_OVERHEAT 中はその回復量に overheat 回復倍率がかかります。Air Brake 中と Air Brake 後の短い停止時間は既存どおり回復を抑制します。

Quick Boost SE は Quick Boost / 継続ブーストの開始成功時だけ鳴ります。画面左側では `boostse_L.wav`、中央付近では `boostse_M.wav`、右側では `boostse_R.wav` を使い、runtime pan は通常OFFです。EN不足、不発、`FULL_OVERHEAT` / RECOVERING、NEED_RELEASE、Air Brake、POST_BOOST_GLIDE移行、Final Raidでは鳴りません。連続ブースト時のSEは cooldown 80ms / 最大3音までに制限します。

敵タイプ:

- Chaser: 標準的な追跡型です。
- Dash: 突進で間合いを詰めます。
- Tank: 高耐久の近接型です。
- Ranged: 距離を取りながらビーム攻撃を行います。
- Gold Slime / Silver Slime: レア GEEK アイテムと Robot 花瓶を確定ドロップします。

ボスは各 Wave 開始から 15 秒後に出現します。撃破すると次の Wave へ進み、次のボスも 15 秒後に出現します。ボス攻撃は出現後すぐに予兆付きで始まり、亀裂、ビーム、扇状弾、三連弾、ランダム爆撃、雷ダッシュの 6 種類が Wave ごとにローテーションします。敵 HP は全体的に底上げされ、Depth 6 以降は追加の耐久スケールが乗ります。ボスと NEMESIS は通常敵より強い耐久補正を持つため、2 分間を逃げ切って帰還するか、立ち回りを組み立てて撃破報酬を狙うかの判断が重要になります。

## スキル

攻撃スキル:

- `basicSkill`: 初期解放の周回球と自動雷撃です。
- `tornadoSkill`: 画面内の敵を追尾する竜巻です。
- `rabbitThunderSkill`: 雷兎が突進し、成長すると着地雷衝撃などが追加されます。

各攻撃スキルは Stage 1 から Stage 8 まで強化できます。未解放スキルはレベルアップ選択で解放し、解放済みスキルは次 Stage へ強化します。

パッシブ:

- Reactor Overcharge: 電撃ダメージを増やします。
- Fire Control Link: 攻撃間隔を短縮します。
- Booster Tuning: 推進出力を上げます。
- Energy Capacitor: 最大ブーストENとブーストEN回復余地を増やします。
- AP Reinforce: 最大APと現在APを増やします。
- Evasive Firmware: Quick Boost開始時の Evade Window を延長します。Lv10で最大 1700ms になり、DASH長押し中の常時無敵ではありません。Opening Boost には出ず、通常レベルアップ候補として出現します。

## LOST ARMS / ロストアームズ

左上 HUD の既存スキル 3 枠の右側 2 枠は、レア武器 `LOST ARMS` 専用枠です。通常のレベルアップ 3 択には出ません。

- `ABYSS RAIL` / アビスレール: 高 HP 敵、ボス、エリートを狙う貫通レーザーです。
- `GRAVITY SEED` / グラビティシード: 敵密集地点に重力核を置き、鈍足、吸引、継続ダメージ、崩壊爆発で範囲制圧します。

Depth10 Final Raid 中はボスフィールドのジャミングで LOST ARMS が使用不能になり、ABYSS RAIL / GRAVITY SEED の戦闘処理と進化選択 UI は停止します。Final Raid 外では、保存済み Lv とラン内状態を保持したまま通常どおり使用できます。

共通仕様:

- 各武器の最大 Lv は 8、初期 Lv は 0 です。
- Lv.1 以上はラン開始時から自動発動します。
- 1 ランで拾える LOST ARMS 強化は最大 2 個までです。
- MVP では同じ武器の仮強化は 1 ラン中に最大 +1 までです。
- `NEXT STAGE` では仮強化を持ったまま次 Depth へ進みます。
- 通常 `EXTRACT` では仮強化を永続 Lv に保存します。
- ゲームオーバー、Gate 崩壊、`EMERGENCY EXTRACT` では、そのラン中の仮強化は失われます。
- Depth 5 までで両方 Lv.8、またはそのランで候補がない場合の抽選成功は Gold 相当の代替報酬に変換されます。
- Depth 6 以降で通常コア候補がなくても進化可能な武器がある場合は `RESONANCE ECHO` に変わり、進化可能な武器もない場合だけ Gold 相当の代替報酬になります。

LOST ARMS コアは通常敵からは出ず、ボス、エリート、Gold Slime、Silver Slime の追加抽選でのみ出現します。ドロップ率は Depth と対象種別で変わり、対象抽選に失敗するたびに pity が最大 0.10 まで増えます。成功時は pity が 0 に戻ります。

### LOST ARMS RESONANCE

Depth 6 以降では、通常の LOST ARMS コア取得が成功した武器に `RESONANCE` が +1 されます。通常コアを出せない抽選成功時に、そのランで進化可能な LOST ARMS がある場合は Gold 代替ではなく `RESONANCE ECHO` が出現し、拾うと対象武器の RESONANCE が +1 されます。Echo は LOST ARMS 強化取得数には数えません。

RESONANCE は各武器 3/3 で 2 択の進化カードを開きます。進化は各武器 1 ラン 1 回だけ、ラン内だけ有効で、`lastmemoVansabaLostArmsState` には保存されません。通常抽出、緊急抽出、ゲームオーバー、ショップ復帰、リスタート、シーン破棄でリセットされます。HUD の LOST ARMS 枠には `RES 1/3` または `EVO EXEC` のように進捗と進化名が表示されます。

ABYSS RAIL 進化:

- `EXECUTION RAIL`: ボス/エリートへの ABYSS RAIL ダメージ x1.35、高 HP 標的へのダメージ x1.20、命中前 HP が 18% 未満の標的へレールダメージの 30% の追加バーストを発生させます。
- `PRISM RAIL`: ABYSS RAIL 命中時、近くの敵へ最大 3 本の分岐レールを放ちます。範囲 260、分岐ダメージは元命中ダメージの 45%、分岐 cooldown は 700ms で、分岐から再分岐はしません。

GRAVITY SEED 進化:

- `EVENT HORIZON`: 崩壊範囲 x1.25、崩壊ダメージ x1.25。3 体以上巻き込むと、45% ダメージの二次崩壊を 1 回発生させます。
- `SINGULARITY GARDEN`: 持続時間 x1.30、吸引力 x1.30、鈍化 +0.10、同時展開数 +1。

RESONANCE がすでに進化済み、または進化候補がない状態でさらに RESONANCE 相当の報酬を得た場合は、RESONANCE overflow として未確定 GEEK、OVERDRIVE +20%、STABILIZE +15% に変換されます。

検証用に `?debugLostArms=1` を付けると、対象敵の LOST ARMS 抽選が成功扱いになり、console に抽選ログが出ます。`?debugLostArmsResonance=1` を併用すると、Depth 1 から RESONANCE 条件を確認できます。

## サポート

Support アイテムを拾うとサポート攻撃が発動します。Support アイテム自体は通常戦闘の撃破ペースでおおむね 60〜75 秒に 1 個を目安に調整されています。直前と同じ通常サポートは避けて抽選され、通常サポートはノーマル、いしでんはレア、元素騎士は超レアの重みで発動します。Depth9 では Doll Field Jamming により Support のドロップと発動が停止し、SUP HUD は `JAMMED` 表示になります。残っている Support アイテムを拾った場合も、通常発動せず STABILIZE と未確定 GEEK に変換されます。

通常サポート:

- ぽぽちゃん
- えいとふぉー
- いもたろう
- かぴぴ
- えも子
- いしでん
- アシグラ
- ドールを解放せし者: Depth10 Final Raid 討伐後のみ低確率で抽選され、20秒間に爆炎/氷結魔法を約8回放ちます。
- 虚無を狩る者: VOID HUNTER 討伐後のみ低確率で抽選され、敵版と同じ巨大スケールで40秒間フィールドに残り、敵群へ3秒予告付きの3点範囲攻撃を行います。

元素騎士:

- 専用カットイン、BGM、4 体の支援キャラクター、4 体のイベントボスが出現します。
- ひろまろ、アラモード、オマル、くろかげがそれぞれ攻撃、掃討、防御役として動きます。
- イベント中の報酬でも Bronze / Silver / Gold が出現し、Depth と不安定度の GEEK 補正を受けます。

いしでんのタイミング報酬でも Bronze / Silver / Gold が出現します。元素騎士イベント中、またはいしでんのサポート攻撃中など Support が通常発動できない状態で Support アイテムを拾った場合は、STABILIZE と未確定 GEEK に変換されます。

SUPPORT LINK SYSTEM:

- OPERATIONS HUB の GEEKSHOP で 60,000 GEEK を支払うとインストールされ、`LINK Lv.1` になります。
- インストール後、Support アイテム取得でサポートアタックが正常発動した累計回数だけが `ACTIVATIONS` として保存されます。Depth9 の JAMMED や、元素騎士 / いしでん中などで STABILIZE 変換された Support はカウントされません。
- LINK は GEEK を追加消費せず、累計正常発動数で Lv.6 まで自動成長します。必要累計発動数は Lv1: 0、Lv2: 15、Lv3: 30、Lv4: 60、Lv5: 100、Lv6: 160 です。
- 効果は `Support combat effect` で、Support 起点のダメージ、Support 回復、Support の状態異常 / time stop 持続に適用されます。Lv1 から +5% / +8% / +12% / +16% / +21% / +25% です。
- GEEKSHOP では現在 Lv、累計正常発動回数、次 Lv までの進捗バー、現在効果を表示します。SUP HUD にはインストール後 `L1` から `MAX` までの短縮表示が付きます。

## ロボット

随伴ロボットはラン開始時からプレイヤーについてきます。初期状態は Missile Lv.1 / Field Lv.1 です。

- Missile Core: ミサイル本体レベルを上げます。
- Recovery Core: 回復フィールド本体レベルを上げます。
- Golden Tune Vase: ミサイル系チューニングを 2 択で選びます。
- Silver Tune Vase: フィールド系チューニングを 2 択で選びます。

通常ミサイルはカメラ内側にいる敵だけをロックオンする高誘導ミサイルです。画面外から狙いすぎないよう、カメラ端から左右120px / 上下84pxぶん内側に入った対象だけを候補にします。Lv1-2で1枠、Lv3-4で2枠、Lv5-6で3枠、Lv7-8で4枠、Lv9で5枠、Lv10で6枠、Lv11-12で7枠、Lv13-14で8枠、Lv15-16で9枠、Lv17以降で最大10枠のロック枠を持ちます。各枠は緑色のターゲットマーカーで敵を追尾し、画面内に対象がいない間はロボット周辺の狭い範囲を薄く旋回する索敵表示になります。通常敵は1体につき1枠だけロックし、画面内のボスがいる場合は未割当の余り枠をボスへ集中させます。ボスへ複数枠が集中した場合、マーカーは完全に重ならないようボス周辺へ小さく散らして表示します。ロック完了前に対象が死亡またはサーチ範囲外へ移動した時は、次の対象へプレイヤー通常移動速度相当で半透明移動します。同じ対象を3秒ロックすると赤色のロック完了マーカーへ切り替わり、その枠の通常ミサイルを発射します。ロック完了後は対象が死亡または非activeになるまで赤マーカーを維持し、対象死亡時は緑色の索敵表示へ戻って画面内の次候補を探します。サーチ範囲外へ出ても死亡していなければ同じ対象をロックし続けます。Rapid Launcher は発射後クールダウンを 2400ms から最短 1500ms まで短縮します。ROBOT SYNC DRIVE 中はこのクールダウンが短縮され、最短 1300ms になります。通常ミサイル速度は480を基準にチューニングで最大540まで伸び、寿命は3200msです。1発の通常ミサイル威力は従来計算の約1.45倍です。Depth10 でも距離無制限・生存時間2倍の特例は使わず、通常ミサイルの新規ロック対象はカメラ内側の敵に限定されます。Lv11以降も通常ミサイルの画像サイズはLv10相当で固定です。

GEEKSHOP の `回収ロボ` は、確定 GEEK で Lv.1-10 まで永続強化する別系統の非ダメージサポートです。出撃中はキャラクター周辺のドロップを探してロボット自身が拾いに行き、回収後はプレイヤー付近へ戻ります。Lv が上がるとサーチ範囲、移動速度、回収対象が広がり、Lv2 以降は周囲の敵を押し戻す掃除パルス、Lv4 以降は短い鈍足補助も発生します。対象は Lv1 で XP / Bronze / Silver / Gold、Lv2 で DATA CACHE、Lv3 で Heal / Magnet、Lv5 で Robot / Support / LOST ARMS まで広がります。画像は `./画像/robot/cleaning_robot_lv1.png` から `cleaning_robot_lv10.png` を使用し、未読み込み時は既存ロボット画像へフォールバックします。

ミサイルと回復フィールドの本体レベルは通常 Lv.10 が上限です。OPERATIONS HUB の `ROBOT CUSTOM` で確定 GEEK を使ってLv上限を段階解放すると、各系統ごとに Lv.12 / 14 / 16 / 18 / 20 まで伸ばせます。チューニングは Rapid Launcher、Warhead Boost、Field Cycle、Care Output があり、それぞれ最大 Lv.20 です。

通常ミサイル命中、通常ミサイル撃破、回復パルスでもロボット経験値が入り、Lv1-10までは既存テンポで本体レベルが上がります。Lv10以降は自動経験値では上がらず、Missile / Recovery Core を複数取得して `CORE x/y` を満たすと1レベル上がります。必要Core数は Lv10->11:1、Lv11->12:2、Lv12->13:3、Lv13->14:3、Lv14->15:4、Lv15->16:5、Lv16->17:6、Lv17->18:7、Lv18->19:8、Lv19->20:10 です。Boss撃破時のRobot報酬抽選は基本32%ですが、Depth6以降の通常Wave Bossだけ40%になります。Missile Lv10以上かつ上限未到達の間は、Robot報酬候補内のMissile Core重みが5から8に上がります。すでに現在の上限に達した Robot 報酬を拾った場合は、STABILIZE と未確定 GEEK に変換されます。

ROBOT EX:

- `Napalm Missile`: `ROBOT CUSTOM` で 2,000,000 GEEK、Missile Cap Tier 1 以上が必要です。購入後、Missile Lv1+で通常ミサイルとは別に上空からのナパーム砲撃を一定間隔で要請します。ナパームは通常ミサイル画像を置き換えず、カメラ内の敵密集地点を評価して中心付近へ降り注ぎ、着弾範囲内の敵へダメージと燃焼を与えます。狙える候補がない間は砲撃を待機します。ナパーム実効Lvは Missile Lv と Napalm Cap の低い方で、購入直後の Cap は Lv11、追加 GEEK 解放で Lv13 / 15 / 17 / 20 まで伸びます。実効Lvが上がると1回あたりのナパーム弾数、着弾範囲、燃焼ダメージ、燃焼時間が増え、Lv11+では持続するダメージ床を生成します。Lv20付近では爆撃が密集地点を中心に広がり、逃げながら延焼と炎上床で敵群を削る制圧性能が高くなります。着弾爆発、燃焼ダメージ、ダメージ床は既存の敵ダメージ処理を通るため、撃破・ドロップ・ランキング加算は通常処理に乗りますが、Missile Lv1-10 のロボット経験値は付与しません。
- `Barrier Field`: `ROBOT CUSTOM` で 2,000,000 GEEK、Recovery Cap Tier 1 以上が必要です。購入後、Recovery Lv1+でHPとは別のシールドを生成します。Barrier実効Lvは Recovery Lv と Barrier Cap の低い方で、購入直後の Cap は Lv11、追加 GEEK 解放で Lv13 / 15 / 17 / 20 まで伸びます。Barrierは被弾時にHPより先に削られ、破壊後はクールダウンを経て回復フィールドのパルスで再構築されます。実効Lv1-20にかけてシールド量が増加し、実効Lv20では90秒クールダウンのLast Standがあり、致死ダメージ時に一度だけHP1で踏みとどまります。
- ロボット本体は Lv11-15 で `robot_lv11.png`、Lv16-19 で `robot_lv16.png`、Lv20 で `robot_lv20.png` を使います。通常ミサイルは Lv11 以降も `missile_frame_01.png` から `missile_frame_08.png` の通常フレームを使います。ナパーム弾は Lv1-15 / 16-19 / 20 で `robot_bombslv11.png` / `robot_bombslv16.png` / `robot_bombslv20.png` を使います。燃焼は `missile_explosion_frame_01.png` から `missile_explosion_frame_08.png` のフレームアニメーションです。
- Recovery Field はプレイヤー/ロボットの足元に画像デカールを表示せず、HUD 上の FIELD アイコンだけを回復フィールドLvに応じて更新します。Lv1-2 は `recovery_field_lv01.png`、Lv3-4 は `recovery_field_lv04.png`、以降は Lv5-6 / Lv7-8 / ... / Lv19-20 の2Lv刻みで `recovery_field_lv06.png` から `recovery_field_lv20.png` を使います。画像未読込時は低いLv側へフォールバックし、最後は既存のリング/グロー表現へ戻します。Barrier Field 展開中はキャラクター本体に白い半透明シールドを重ねて表示します。

ROBOT SYNC DRIVE:

- ミサイル命中・撃破、回復フィールドのパルス、Missile / Recovery Core 取得、Golden / Silver Tune Vase のチューニング選択で `SYNC` ゲージが蓄積します。
- `SYNC` 100% で 18 秒間の `ROBOT SYNC DRIVE` が自動発動します。発動中に再度 100% へ到達した場合は最大 30 秒まで延長されます。
- 発動中は通常ミサイルの発射後クールダウン x0.86、ミサイル威力 x1.16、回復フィールド範囲 x1.12、回復量 x1.18 になります。
- 発動中の回復パルスは `SYNC PULSE` になり、周囲の敵へ小ダメージと押し戻しを与えます。
- `SYNC` はラン内一時状態です。ショップ復帰、抽出、ゲームオーバー、リスタートでリセットされ、localStorage / sessionStorage には保存されません。
- 検証用に `?debugRobotSync=1` を付けると、初期 `SYNC` ゲージが高い状態になり、ゲージ獲得量が増えて発動確認しやすくなります。

## OPERATIONS HUB / 拠点

OPERATIONS HUB では `CDSHOP`、`GEEKSHOP`、`ROBOT CUSTOM`、`ANJU MEMORY`、`ARCHIVE` をタブで切り替えます。CDSHOP は CD 購入と BGM 選択専用です。GEEKSHOP と ROBOT CUSTOM では確定 GEEK を使用します。GEEKSHOP は Armament / AP Frame / Booster / Reactor Cooling と回収ロボの永続強化、ROBOT CUSTOM はラン中Lvを直接購入する画面ではなく、Missile / Recovery のLv上限と EX 機能を解放する画面です。ANJU MEMORY では深層メタ報酬の購入・選択、ARCHIVE では RUN ARCHIVE と MUTATION ATLAS を確認します。CD は BGM 選択と永続ボーナスを兼ねており、購入済み CD の永続効果は選択中 BGM に関係なく常時発動します。

ラン中 BGM は Beacon coverage 内では CDSHOP の選択 CD を再生します。Depth1〜10は常にcoverage内で、D20 Anchorが連鎖解放済みならDepth20まで、D30 Anchorが連鎖解放済みならDepth30まで選択CD BGMと通常通信を維持します。初回未討伐の Depth10 Final Raid だけ Final Raid 専用 BGM に切り替わります。Beacon coverage外では `./音声/bgm/ENDLESSVOIDAMBIENCE.mp3` をラン中だけ一時上書きし、外部通信は `SCRAMBLED SIGNAL` になります。この専用 BGM は CD として購入・選択・保存されず、`lastmemoVansabaShopState` の CD 選択値も変更しません。

GEEKSHOP は `BASE CALIBRATION` と `EQUIPMENT ANALYSIS` の2つのサブビューを持ちます。`BASE CALIBRATION` は従来の確定 GEEK 永続強化画面です。`EQUIPMENT ANALYSIS` では、保存済みの未解析箱を確定 GEEK または無料解析クレジットで解析し、5部位それぞれの最高品質装備を更新できます。装備箱 GameObject、ラン内一時保持、HUD、通常 / 緊急 / Final Raid 帰還時の抽出保存、通常戦闘の本番ドロップ、Depth10 Final Raid 初回LEGEND確定箱、5部位のラン内ステータス補正まで実装済みです。

GEEKSHOP / BASE CALIBRATION:

- Armament: 基本上限 Lv.10、Depth10 Anchor 解放で Lv.15、Depth20 Anchor 解放で Lv.20、Depth30 Anchor 解放で Lv.25。攻撃力 +6% / Lv
- AP Frame: 基本上限 Lv.10、Depth10 Anchor 解放で Lv.15、Depth20 Anchor 解放で Lv.20、Depth30 Anchor 解放で Lv.25。最大AP +10 / Lv
- Booster: 基本上限 Lv.10、Depth10 Anchor 解放で Lv.15、Depth20 Anchor 解放で Lv.20、Depth30 Anchor 解放で Lv.25。推進出力 +8 / Lv
- Reactor Cooling: 基本上限 Lv.10、Depth10 Anchor 解放で Lv.15、Depth20 Anchor 解放で Lv.20、Depth30 Anchor 解放で Lv.25。BOOST EN回復倍率 +2% / Lv。Lv10で x1.20、Lv25で x1.50 になり、基礎回復量 24 / 秒は変更しません。
- 上限解放は購入可能Lvを広げるだけで、無料Lvは付与されません。Lv21〜25も従来と同じ効果式と確定 GEEK の価格式を継続します。Depth31 以降はビーコン圏外のため、現時点で Lv26 以上はありません。Depth30 Anchor による上限解放は、D30転送カードの表示条件と同じく Anchor 解放状態だけを参照し、購入済みLvや装備状態はD30選択条件にしません。
- SUPPORT LINK SYSTEM: 60,000 GEEK でインストール。インストール後は Support の正常発動累計で `LINK Lv.1-6` まで自動成長し、Support combat effect が +5% から最大 +25% になります。
- 回収ロボ: 最大 Lv.10。必要 GEEK は 100,000 / 150,000 / 230,000 / 350,000 / 520,000 / 780,000 / 1,150,000 / 1,700,000 / 2,500,000 / 3,600,000。

GEEKSHOP / EQUIPMENT ANALYSIS:

- `SENSOR`、`FRAME`、`BOOSTER`、`ARMAMENT`、`CORE` の5部位に、保存済み `bestBySlot` のレアリティと Rank I〜V を表示します。空スロットは `NO DATA` です。保存schemaの内部slot IDは互換性のため `head` / `clothes` / `shoes` / `weapon` / `accessory` のままです。
- 未解析箱は `N`、`R`、`SR`、`SSR`、LEGEND発見後のみ `LEGEND` の個数を表示します。箱のslot、rank、sourceDepth、sourceType、id、analysisCostOverrideは表示しません。
- `legendDiscovered=false` の間は、UI上に `LEGEND` や虹色枠を表示しません。未発見状態でLEGEND箱が内部にある場合は `UNKNOWN SIGNAL` として表示します。
- LEGEND表示は最高レアリティとして、CURRENT LOADOUT、解析結果、未解析一覧、SET RESONANCE、COLLECTION STATUSで滑らかな虹色グラデーション枠と発光文字を使います。
- `SET RESONANCE` は5部位の `bestBySlot` レアリティからセット進捗を導出して表示します。SSR以上5部位は `SSR+ ARRAY`、LEGEND 5部位は `LEGEND ARRAY` として判定しますが、LEGEND未発見時はLEGENDセット名やLEGEND部位数を表示しません。
- セット進捗は `EQUIPPED SLOTS`、`SSR+ ARRAY`、LEGEND発見後の `LEGEND ARRAY` を `STANDBY` / `QUALIFIED` として示します。SSR+ 5部位では `COMBAT LINK I: READY` / `OVERLIMIT CAP: I`、LEGEND発見済みのLEGEND 5部位では `COMBAT LINK II: READY` / `OVERLIMIT CAP: II` を表示します。LEGEND未発見時はLEGEND名や虹色枠を出さず、SSR+側の表示に留めます。
- `COLLECTION STATUS` では `bestBySlot` から導出した `SSR+ COLLECTION` と、LEGEND発見後の `LEGEND COLLECTION` 進捗を確認できます。未解析箱は進捗に含めず、LEGEND未発見中は `HIGHER SIGNAL / LOCKED` として秘匿します。LEGEND 5部位コンプは長期目標で、進捗や完成状態はランキング / Firebase / Deep Result へ送信しません。
- 解析費用は `N 500`、`R 2,000`、`SR 8,000`、`SSR 30,000`、`LEGEND 100,000` GEEKです。箱に `analysisCostOverride` がある場合はそれを最優先し、override が無い場合だけ `freeAnalysisCredits` を先に消費します。override 0 は無料ですが無料解析クレジットを消費しません。
- 解析時は開始前に `actualCost` 全額を所持している必要があります。既存bestより高品質なら `bestBySlot` を更新し、同品質以下の重複なら `Math.floor(actualCost * 0.5)` を返金扱いにして、実際の支払いは差額だけになります。無料解析の重複返金は0です。
- 同じslotに既存LEGEND bestがあり、より低いまたは同品質のLEGENDを解析した場合は `DUPLICATE LEGEND SIGNAL` として表示し、slot別の `LEGEND RESONANCE` として記録します。RESONANCEは現段階では表示専用で、Rank、戦闘効果、ドロップ率、交換、pity、未所持slot補完、ランキング / Firebase には影響しません。
- Deep Extractionで得た Equipment Cache も `EQUIPMENT ANALYSIS` で解析し、保存済みCacheの `slot` / `rarity` / `rank` を再抽選せず装備として確定します。解析済み装備は `bestBySlot` へ反映され、LEGENDは解析成功時に初めて発見扱いになります。SSR+ / LEGEND の5部位成立は `SET RESONANCE` と次ランの Combat Link 条件になります。
- 保存成功後だけ解析結果パネルを表示します。保存に失敗した場合は GEEK と Equipment 状態をロールバックし、結果パネルは出さず `ANALYSIS ABORTED / SAVE ERROR` を表示します。
- CURRENT LOADOUT には各部位の効果を表示します。SENSOR は攻撃間隔短縮、FRAME は最大AP、BOOSTER はブーストEN回復、ARMAMENT は3攻撃スキルの実ダメージ、CORE は最大ブーストENです。解析結果パネルは更新時に効果差分、重複時に `UNCHANGED` を表示します。
- 出撃開始時に保存済み `bestBySlot` だけから `runEquipmentLoadoutSnapshot` と `runEquipmentBonuses` を作成します。このスナップショットはラン中固定で、NEXT STAGE、FORCE BREAKTHROUGH、Depth遷移、レベルアップ、Gate、overlay、pause、ショップ保存値変更では再取得しません。次の出撃から最新の保存装備が反映されます。
- 装備ボーナスは品質スコア `rarityIndex * 5 + rank` を使います。SENSOR は攻撃間隔 -0.25% x score、FRAME は最大AP +3 x score、BOOSTER はブーストEN回復 +0.8% x score、ARMAMENT は `basicSkill` / `tornadoSkill` / `rabbitThunderSkill` とそれらのMutation派生ダメージ +1.2% x score、CORE は最大ブーストEN +1 x score です。LEGEND Rank5 では SENSOR x0.9375、FRAME +75、BOOSTER x1.20、ARMAMENT x1.30、CORE +25 になります。
- COMBAT LINK は出撃開始時の装備snapshotだけを参照するラン内効果です。対象3スキルが Stage8 に到達し、Final Mutation を選択済みの場合、通常 Level Up 候補として `EQUIPMENT OVERLIMIT` が出現します。Stage8 Final Mutation を正式に選択した直後にも、Combat Link 条件を満たす場合はそのスキル専用の `FINAL COMBAT LINK` OVERLIMIT bonus が出ることがあります。Depth6以降で Deep Level が実際に上がったときも、同じ条件を満たす未取得 OVERLIMIT があれば追加の `DEEP COMBAT LINK` 選択機会が出ます。OVERLIMIT I は対象スキルの実ダメージ x1.10、OVERLIMIT II は x1.20 で、Stage9 / Stage10 ではなく Stage8 のまま、Stage表記や保存schemaは増やさず、そのラン中だけ有効です。Opening Boost、Final Raid、Support、Robot、LOST ARMS、環境ダメージ、Final Raid疑似ダメージ、XP、GEEK、ANJU、Equipment報酬には影響しません。
- OVERLIMIT 取得済みの対象スキルは戦闘HUDのスキル枠に `OVL-I` / `OVL-II` を表示します。Final Raid 中は COMBAT LINK の攻撃効果を抑制するため、このHUD表示も出ません。RUN ARCHIVE にはローカル閲覧用として Combat Link 段階と各対象スキルの OVERLIMIT 段階を記録しますが、ランキング、Firebase、Deep Result へは送信しません。OVERLIMIT はラン内効果で、次のランへ持ち越しません。
- FRAME と CORE は開始ステータス再構築時に一度だけ加算します。BOOSTER はダッシュ回復遅延や消費量を変えず、ブーストEN回復量の最終倍率だけを変えます。SENSOR は3攻撃スキルの通常攻撃間隔 / 再発動間隔だけへ掛かり、演出ディレイ、持続時間、内部Mutationクールダウン、Support、Robot、LOST ARMS、CHAIN、敵行動には掛かりません。ARMAMENT は3攻撃スキル由来の実ダメージだけへ掛かり、Support、Robot、Recovery、LOST ARMS、CHAIN、環境ダメージ、敵攻撃、Final Raidの疑似ダメージ、支援ランキング、ボスHPタイムラインには掛かりません。
- Depth10 初回 Final Raid 中はボスフィールドの時刻演出とランキングを守るため、SENSOR と ARMAMENT の有効倍率だけを 1 に抑制します。FRAME、BOOSTER、CORE は Final Raid 中も有効です。Final Raid 討伐後の通常 Depth10 ではこの抑制は発生しません。
- `?debugEquipmentHub=1` と `?debugEquipmentHub=1&debugEquipmentHubLegend=1` は表示専用です。解析ボタンは `PREVIEW ONLY` になり、GEEK消費、無料クレジット消費、統計更新、保存は行いません。
- 本番装備箱は通常 Wave Boss 45%、通常 Elite 15%、NEMESIS 100%、Gold Slime 35%、Silver Slime 25% で抽選します。通常敵、Final Raid ボス/Add/巨大兵器、元素騎士イベント対象、Directive Slime、VOID HUNTER、報酬抑制対象からは落ちません。
- 本番装備箱は1 Depth につき最大1個だけ出現します。`?debugEquipmentDrop=...` の直接出現箱や Final Raid 初回確定報酬はこの上限に含めません。
- Depth1 で Equipment 進行が完全に空の場合、最初の通常 Wave Boss だけ本番ドロップ抽選を100%にします。中身のレアリティ、Rank、部位はDepth1用テーブルで通常どおり決まります。
- LEGEND の本番ドロップは Depth11 以降かつ `finalRaidLegendRewardClaimed=true` の時だけ解禁されます。未解禁時の LEGEND 重みは SSR に再配分され、`legendDiscovered` では解禁されません。
- 装備箱を拾うとラン内の `runUnsecuredEquipmentBoxes` にだけ入り、拾った瞬間には `lastmemoVansabaEquipmentState`、`securedBoxes`、`legendDiscovered`、`stats`、確定 GEEK、未確定 GEEK を変更しません。
- Depth10 以上で通常 `EXTRACT` に成功した場合は、拾得箱とは別に深層抽出の未解析 Equipment Cache を1個だけ `securedBoxes` へ保存します。`sourceDepth` はそのランの最大到達絶対Depthで、DEPTH RELAY の `rewardDepthReached` は使いません。Depth10 / Depth20 / Depth30 Relay でも通常抽出なら対象ですが、EMERGENCY EXTRACT、ゲームオーバー、Final Raid専用帰還、進行注入系debugラン、プレビューでは付与しません。
- 通常 `EXTRACT` と Final Raid の解放帰還では、拾得済み装備箱をすべて `securedBoxes` に保存します。`EMERGENCY EXTRACT` では `rarityIndex * 5 + rank` の品質スコアが最も高い1箱だけ保存し、同点の場合は先に拾った箱を保存します。
- Depth10 初回 Final Raid では、ボス撃破時に未登録Equipment信号を一度だけ表示し、専用の `ドールを解放する` 帰還が成功した時だけ固定ID `final-raid-equipment-reward-v1` のLEGEND未解析箱を `securedBoxes` の先頭へ保存します。Rank は Rank2 75% / Rank3 25%、slot は5部位均等、`sourceDepth=10`、`sourceType=finalRaid`、`analysisCostOverride=0` です。
- Final Raid 確定箱は解析前に `UNKNOWN SIGNAL` として表示され、`LEGEND`、Rank、slot は解析成功時の `LEGEND CLASS CONFIRMED` で初めて公開されます。override 0 のため解析費用は無料で、初回無料解析クレジットは消費しません。
- `finalRaidLegendRewardClaimed` は「Final Raid初回LEGEND確定箱をEquipment保存状態へ正常に確定済み」を表します。Depth10 Final Raid を装備システム実装前に討伐済みで、このフラグが false の保存データには、起動時に同じ固定ID報酬を1回だけ遡及付与します。claimed が true の場合は、箱が残っていなくても解析済みの可能性を優先して再付与しません。
- 保存失敗時は Equipment 状態を抽出前に戻し、ラン内箱は保持したまま `EQUIPMENT SAVE FAILED` を表示します。その後ショップ復帰などでランが終了する場合、未保存箱は破棄されます。
- 戦闘HUDには拾得済み箱のレアリティ別個数だけを `SEALED EQ` として表示します。`legendDiscovered=false` の間、LEGEND箱は `UNKNOWN SIGNAL` 扱いで、LEGEND文字、虹色枠、rank、slot、id、sourceTypeは表示しません。
- 掃除ロボは Lv5 以上で装備箱を回収できます。Lv1〜4では対象にしません。

ROBOT CUSTOM:

- Missile / Recovery Cap Tier 1-5: 30,000 / 60,000 / 100,000 / 160,000 / 240,000 GEEK。各Tierで該当系統の上限が+2され、最大Lv20です。
- Napalm Missile: 2,000,000 GEEK。Missile Cap Tier 1 以上が必要です。
- Napalm Payload Cap Tier 1-4: 各 2,000,000 GEEK。Napalm Missile 解放後、同じカード枠が上限解放に切り替わり、ナパーム実効Lv上限を Lv13 / 15 / 17 / 20 まで伸ばします。購入直後の基礎上限は Lv11 です。
- Barrier Field: 2,000,000 GEEK。Recovery Cap Tier 1 以上が必要です。
- Barrier Output Cap Tier 1-4: 各 2,000,000 GEEK。Barrier Field 解放後、同じカード枠が上限解放に切り替わり、バリア実効Lv上限を Lv13 / 15 / 17 / 20 まで伸ばします。購入直後の基礎上限は Lv11 です。

CD:

- Anju: 初期所持
- なんでやねんねん: 100,000 GEEK / 攻撃力 +10%、連射 +6%
- 反省会: 100,000 GEEK / 最大AP +25、最大ブーストEN +20 / `./音声/bgm/hanseikai_ver2.mp3`
- 未来を生きてる: 100,000 GEEK / 推進出力 +20、連射 +5%
- コトコト: 100,000 GEEK / 攻撃力 +6%、最大ブーストEN +15
- いっちゃいな: 100,000 GEEK / 弾速 +8%、推進出力 +12
- ドールを解放せし者: Depth10 Final Raid 討伐報酬 / 最大AP +100、最大ブーストEN +50。討伐前は CDSHOP でロック表示、討伐後は BGM として選択できます。

CDSHOP では通常 CD を 3 列 x 2 段、`ドールを解放せし者` を大型ジャケットカードとして表示します。右側の HUD には購入・解放済み CD の合計ステータスボーナス、ACTIVE CDS、OPERATIONS HUB 全体の強化を表示専用に評価した TOTAL BONUS SCORE を表示します。

永続強化の価格は基礎 1,000 GEEK からレベルに応じて増加し、100 GEEK 単位に丸められます。ショップ表示前、帰還後、ゲーム再生成時には `shop-loading-screen` が表示されます。

## ステージ

通常プレイでは `stageDefinitions.js` の `tokyoRandomStages` から 10 種類の東京ステージがランダム選択されます。指定ステージが見つからない場合はランダム東京ステージへフォールバックします。旧 `shibuyaStage1` ID は互換用に残し、軽量な `Tokyo 01: Scramble Crossing` 定義を使用します。

東京ランダムステージ:

- Tokyo 01: Scramble Crossing
- Tokyo 02: Skyscraper Plaza
- Tokyo 03: Electric Town
- Tokyo 04: Luxury Avenue
- Tokyo 05: Waterfront Plaza
- Tokyo 06: Underpass Infrastructure
- Tokyo 07: Station Rotary
- Tokyo 08: Residential Arterial
- Tokyo 09: Civic Plaza
- Tokyo 10: Urban Shrine Approach

ステージ関連のクエリパラメータ:

- `?stage=<stageId>`: 指定ステージを開始します。
- `?debugStage=<stageId>`: デバッグ用途で指定ステージを開始します。
- `?stageDebug=1`: ステージデバッグ表示を有効化します。
- `?debugStageOverlay=1`: ステージデバッグ表示を有効化します。
- `?debug=stage`: ステージデバッグ表示と衝突判定編集モードを有効化します。
- `?debug=stage&start=x,y`: 開始位置を指定します。
- `?debug=stage&startX=x&startY=y`: 開始位置を指定します。

衝突判定編集モード:

- クリック: Collision Zone を選択します。
- 矢印キー: 選択中 Zone を移動します。
- `Shift` + 矢印キー: 1 px 単位で移動します。
- `Ctrl` / `Alt` / `Meta` + 矢印キー: 選択中 Zone のサイズを変更します。
- `N`: マウス位置に一時 Zone を追加します。
- `Delete` / `Backspace`: 選択中 Zone を削除します。
- `C`: `stageDefinitions.js` 用の `collisionZones` をクリップボードと console に出力します。
- `S`: 編集中 Zone を localStorage に保存します。
- `L`: localStorage から編集中 Zone を読み込みます。
- `R`: 定義値に戻します。
- `Escape`: 選択を解除します。

## ランキング

ゲームオーバーまたは抽出完了時に名前を入力すると、ラン記録をランキングへ登録します。ローカルランキングは localStorage に保存され、Firebase 接続に成功した場合はオンラインランキング `leaderboardKills` も読み書きします。

Firebase SDK は `12.13.0` を dynamic import し、匿名認証で Firestore を使用します。Firebase 設定は `game.js` 内の `FIREBASE_CONFIG` にあります。Firestore ルールは `firestore.rules` を参照してください。

ランキング画面では `KILLS`、`DEPTH`、`GEEK` の 3 モードを切り替えられ、最大 10 件を表示します。`KILLS` はキル数、生存時間、レベル、エリート撃破数、Best Depth、Extracted GEEK の順で並びます。`DEPTH` は Best Depth、Extracted GEEK、キル数、生存時間、レベルの順、`GEEK` は Extracted GEEK、Best Depth、キル数、生存時間、レベルの順で並びます。表示上は選択中バッジと抽出で得た ANJU MEMORY も併記します。オンライン取得に失敗した場合はローカルランキング表示に戻ります。

ランキング entry は開始Depthを示す `startDepth` と DEPTH RELAY 開始かを示す `usedDepthRelay` を持ちます。古い entry は Depth1 通常開始として扱い、Relay entry は一覧で `RLY D10`、`RLY D20`、`RLY D30` のように開始Depthを表示します。現時点では通常ランとRelayランを別集計せず、並び順、スコア計算、参加条件は従来どおりです。

Best Depth はそのランで実際に到達した最大 Depth です。Extracted GEEK はそのランの抽出で実際に確定できた未確定 GEEK 量で、通常抽出では 100%、緊急抽出では最終保護率ぶん、ゲームオーバーや Gate 崩壊では 0 になります。これは確定 GEEK ウォレット `lastmemoVansabaCoins` の総額ではありません。

## RUN ARCHIVE / 戦闘ログ

OPERATIONS HUB の `ARCHIVE` タブから、`RUN ARCHIVE` と `MUTATION ATLAS` を切り替えられます。`RUN ARCHIVE` では直近 20 件のラン結果を新しい順に閲覧できます。各ログはローカル保存専用で、GEEK 残高、ANJU MEMORY 残高、ランキング、Firebase 送信値、ゲームバランスには影響しません。

保存対象は通常 `EXTRACT`、`EMERGENCY EXTRACT`、通常ゲームオーバー、Depth 5 までの Gate Collapse です。Depth10 Final Raid の `ドールを解放する` 帰還は通常抽出相当として保存されます。`?debugDeepResult=1` のプレビュー、ゲーム開始前、手動でページを閉じただけの中断は保存されません。1 ランにつき保存は 1 件だけで、21 件目以降は古いログから削除されます。

主な保存項目:

- 到達 Depth、抽出結果、Extracted GEEK、生存時間、撃破数、Elite / Boss
- ANJU MEMORY 獲得量、Grade、Stage
- TRIAD BUILD。完成ビルドがある通常ランでは `BUILD: CONTROL GRID / PRISM CASCADE` のように表示します。
- COMBAT LINK と対象スキルの OVERLIMIT 段階。古いログや未取得ランは従来どおり非表示です。
- スキル、パッシブ、LOST ARMS、RESONANCE / Evolution、Robot Lv / SYNC
- ANOMALY CONTRACT、DEPTH DIRECTIVE、OVERDRIVE MOD、STABILIZE PROTOCOL、NEMESIS

保存済みログがない場合は `NO RUN ARCHIVE` を表示します。`?debugRunArchive=1` を付けると、保存は行わず OPERATIONS HUB 上でサンプルログを表示でき、実保存時には console に `[RUN ARCHIVE] saved` を出します。

## 保存データ

localStorage キー:

- `lastmemoVansabaBestRecord`: ベスト記録。`bestDepth` と `bestExtractedGeek` も保存します。
- `lastmemoVansabaKillRanking`: ローカルランキング。各 entry は `bestDepth`、`startDepth`、`usedDepthRelay`、`extractedGeek`、`extractMode`、`extractionSucceeded`、`submittedAt`、`version` を持ち、古い entry にフィールドがない場合は `bestDepth = 1`、`startDepth = 1`、`usedDepthRelay = false`、`extractedGeek = 0`、`extractMode = none` に補完します。
- `lastmemoVansabaCoins`: 確定 GEEK
- `lastmemoVansabaSupportLinkState`: SUPPORT LINK SYSTEM のインストール状態、LINK Lv、累計正常発動回数
- `lastmemoVansabaShopState`: CD 所持、選択 BGM、永続強化状態、回収ロボ `cleaningRobotLevel`、`robotCustom`。`cleaningRobotLevel` は古い保存データに無い場合 Lv0 へ補完します。`robotCustom` は `missileCapTier`、`recoveryCapTier`、`napalmUnlocked`、`barrierUnlocked` を持ち、古い保存データに無い場合は初期値へ補完します。
- `lastmemoVansabaLostArmsState`: LOST ARMS 永続 Lv と pity
- `lastmemoVansabaAnjuMemoryState`: ANJU MEMORY 残高、購入済み報酬、選択中スキン/称号/バッジ、チケット、到達済みマイルストーン
- `lastmemoVansabaMutationAtlasState`: MUTATION ATLAS の 16 ビルド発見/保存/研究状態、Best Depth、選択中 Research Target
- `lastmemoVansabaRunArchive`: 直近 20 件の RUN ARCHIVE / 戦闘ログ。ローカル閲覧専用でランキングや Firebase には送信しません。
- `lastmemoVansabaFinalBossState`: Depth10 Final Raid 討伐済み、ラスボスCD、ラスボスサポート解禁状態、VOID HUNTER 討伐済み、VOID HUNTER サポート解禁状態
- `lastmemoVansabaDepthRelayState`: DEPTH RELAY の解放済み転送 Depth を保存します。`version` と `unlockedDepths` を持ち、Final Raid 討伐済み旧セーブでは Depth10 が補完されます。Depth20 / Depth30 Anchor 解放後はプレイヤー向け選択 UI にそれぞれ Depth20 / Depth30 も表示されます。
- `lastmemoVansabaCommsStoryState`: Depth 初回通信の再生済みフラグ
- `lastmemoVansabaEquipmentState`: Equipment 保存状態。version、LEGEND 発見フラグ、Final Raid LEGEND 初回報酬フラグ、無料解析クレジット、部位別best装備、未解析箱、slot別LEGEND RESONANCE、opened/upgrades/duplicates統計を保存します。破損JSONや古い形式は起動時に正規化されます。
- `collisionEditor:<stageId>`: 衝突判定編集モードの一時保存データ

sessionStorage キー:

- `lastmemoVansabaExtractionMessage`: 帰還後に OPERATIONS HUB へ表示する一時メッセージ

保存データを初期化したい場合は、ブラウザの DevTools から該当キーを削除してください。

### Equipment 保存データ

`equipmentDefinitions.js` は装備システムの定義と純粋関数を `window.EquipmentSystem` として公開します。装備部位は `head`、`clothes`、`shoes`、`weapon`、`accessory` の5種です。レアリティは `N`、`R`、`SR`、`SSR`、`LEGEND` の5種で、各レアリティは Rank1〜5 を持ちます。品質スコアは `rarityIndex * 5 + rank` で、`N Rank5 < R Rank1 < ... < LEGEND Rank5` になるよう比較します。`createEmptyEquipmentBonuses()`、`getEquipmentBonusForItem()`、`getEquipmentBonusesFromState()`、`cloneEquipmentBonuses()` は状態を変更しない純粋関数で、補正計算では `bestBySlot` だけを参照します。

`evaluateEquipmentSetStatus()` は保存済み `bestBySlot` から5部位セット進捗を毎回導出する純粋関数です。Rank、`securedBoxes`、`stats` はセット判定に使わず、セット状態用の保存フィールドや保存versionは追加しません。

保存キーは `lastmemoVansabaEquipmentState` です。初期状態は `version: 1`、`legendDiscovered: false`、`finalRaidLegendRewardClaimed: false`、`freeAnalysisCredits: 1`、5部位すべて `null` の `bestBySlot`、空の `securedBoxes`、全slot 0の `legendResonanceBySlot`、`opened/upgrades/duplicates` が0の `stats` です。Phase 7 でも保存キーと `version` は増やしません。ラン中に拾った未抽出箱は `runUnsecuredEquipmentBoxes` の一時状態だけで持ち、通常 / 緊急 / Final Raid 解放帰還の抽出成功時にだけ `securedBoxes` へ追記して `lastmemoVansabaEquipmentState` を保存します。Depth10 以上の通常EXTRACTで得る深層 Equipment Cache は中身を Deep Result や RUN ARCHIVE / ranking / Firebase へ公開せず、EQUIPMENT ANALYSIS で解析するまで未解析箱として扱います。LEGEND未発見状態では既存ルールどおりLEGEND表示を秘匿します。Emergency Extract、ゲームオーバー、Final Raid専用帰還、debugプレビューでは深層 Equipment Cache は付与されません。深層 Equipment Cacheの中身やsourceDepthはランキング / Firebaseへ送信しません。Depth10 Final Raid 初回確定箱はラン中箱とは別系統の自動報酬で、専用帰還成功時に固定IDで `securedBoxes` 先頭へ保存します。

OPERATIONS HUB の GEEKSHOP / EQUIPMENT ANALYSIS から保存済み `securedBoxes` を解析すると、`legendDiscovered`、`freeAnalysisCredits`、`bestBySlot`、`securedBoxes`、`legendResonanceBySlot`、`stats.opened/upgrades/duplicates` を更新します。`legendResonanceBySlot` は真の重複LEGENDだけでslot別に増える表示専用記録で、LEGENDコンプの長期目標を短縮しません。`finalRaidLegendRewardClaimed` は Final Raid 初回LEGEND確定箱の保存成功、または同じ固定ID箱が既に存在する状態の修復保存成功でだけ true になります。解析、通常戦闘ドロップ、抽出保存では変更しません。ラン中のステータス補正は出撃開始時に `bestBySlot` から作る `runEquipmentLoadoutSnapshot` と `runEquipmentBonuses` だけを参照し、`lastmemoVansabaEquipmentState` 自体には保存しません。

## 主なファイル

- `index.html`: DOM 構造、スマートフォン開始ゲート、ショップローディング画面、スクリプト読み込み
- `style.css`: ページ枠、モバイル表示、スマートフォン開始ゲート、ショップローディング画面
- `game.js`: ゲーム本体、ショップ、Gate、戦闘、ロボット、サポート、LOST ARMS、Firebase 連携
- `equipmentDefinitions.js`: Equipment の部位、レアリティ、解析費用、本番ドロップ抽選、品質比較、ステータス補正、保存状態正規化、未解析箱管理、抽出時追記、緊急抽出用最高品質選択、解析解決の純粋関数
- `skillDefinitions.js`: スキル定義
- `stageDefinitions.js`: ステージ定義、東京ランダムステージ、衝突判定定義
- `vendor/phaser.min.js`: Phaser 3 本体
- `firestore.rules`: Firestore セキュリティルール
- `AGENTS.md`: Codex 作業時のリポジトリ内開発指示
- `画像/`: キャラクター、敵、スキル、ステージ、CD ジャケットなどの画像素材
- `音声/`: BGM、サポート音声、SE などの音声素材

## 開発メモ

構文チェック:

```powershell
node --check game.js
node --check skillDefinitions.js
node --check stageDefinitions.js
```

ローカル配信:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

代表的な確認 URL:

```text
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0
http://127.0.0.1:4173/?debugLostArms=1
http://127.0.0.1:4173/?debugAnjuMemory=1
http://127.0.0.1:4173/?debugDepthDirective=1
http://127.0.0.1:4173/?debugDeepResult=1
http://127.0.0.1:4173/?debugGeekMilestone=1
http://127.0.0.1:4173/?debugRankingDepth=1
http://127.0.0.1:4173/?debugRunArchive=1
http://127.0.0.1:4173/?debugRobotSync=1
http://127.0.0.1:4173/?debugRobotMissileLevel=10&debugSkipOpeningBoost=1
http://127.0.0.1:4173/?debugStartDepth=11&debugSkipOpeningBoost=1&debugEndlessVoidBgm=1&debugScrambledComms=1&debugScrambledCommsInterval=5
http://127.0.0.1:4173/?debugRecoveryFieldScale=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugEquipmentState=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugEquipmentHub=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugEquipmentHub=1&debugEquipmentHubLegend=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugEquipmentAnalysis=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugSkipOpeningBoost=1&debugEquipmentBonuses=1&debugEquipmentBonusPreset=legend5
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugSkipOpeningBoost=1&debugEquipmentDrop=SR&debugEquipmentDropCount=3&debugEquipmentRun=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugSkipOpeningBoost=1&debugEquipmentProduction=1&debugEquipmentProductionForceDrop=1
http://127.0.0.1:4173/?mobileGate=0&mobileControls=0&debugStartDepth=11&debugSkipOpeningBoost=1&debugEquipmentProduction=1&debugEquipmentProductionForceDrop=1&debugEquipmentProductionLegendUnlocked=1&debugEquipmentProductionRarity=LEGEND
http://127.0.0.1:4173/?mobileGate=0&mobileControls=1&debugEquipmentHub=1
http://127.0.0.1:4173/?debugSkillMutation=1
http://127.0.0.1:4173/?debugSkillMutation=1&debugSkillMutationSkill=basicSkill
http://127.0.0.1:4173/?debugSkillMutation=1&debugSkillMutationSkill=tornadoSkill
http://127.0.0.1:4173/?debugSkillMutation=1&debugSkillMutationSkill=rabbitThunderSkill
http://127.0.0.1:4173/?debugMaxBuild=1&debugTriadMatrix=1&debugTriadCore=assault&debugTriadFinal=prism
http://127.0.0.1:4173/?debugMaxBuild=1&debugTriadMatrix=1&debugTriadCore=trinity&debugTriadFinal=adaptive
http://127.0.0.1:4173/?debugMutationAtlas=1
http://127.0.0.1:4173/?debug=stage
```

このプロジェクトには npm、bundler、TypeScript はありません。新規アセットを必須にする変更は避け、画像がない場合でも Phaser Graphics などでフォールバックできる実装を優先します。
