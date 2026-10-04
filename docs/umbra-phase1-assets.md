# UMBRA Phase 1 素材登録・基準点記録

検証専用の記録です。攻撃性能・実戦サイズ・Phase 2のAP/速度/ENを確定しません。
以下の初期登録表は圧縮前の記録です。2026-09-06の圧縮版差し替え後のサイズ・BLOOD SPIKE座標・SHA-256は末尾の「圧縮版への差し替え」を参照してください。
提供27ファイルを原本と同名・同内容でコピーし、SHA-256を照合しました。原本と配布画像を加工していません。
配置先: `画像/player/KGK-02_UMBRA_SERAPH/character/` と `skilleffect/`。

## 機体24姿勢

`umbraPreviewAssets.js` の方向・状態別定数を表示に使用します。pivotは胸郭から腰の間の胴体根元を原寸目視で合わせた値です。
翼・噴射・武器の全外接高をスケール基準にしていません。originはpivot/画像寸法、offsetは全姿勢で明示値(0,0)です。
`applyPose()` は同じtexture/origin/scale/position経路を使用し、body付きオブジェクトを拒否します。
metadata自体には追加回転を加えません。投影・腕脚姿勢の自然な変化は残します。Previewの `M` を有効にした場合だけ、既存ゲームと同じ表示関数による傾き・浮き上がりを重ねて確認できます。
値は目視で調整した検証用キャリブレーションです。全姿勢の解剖学的な同一サイズを自動計測した結果ではありません。

| 角度 / 方向 | 状態 | 実ファイル名 | 原寸 | 胴体pivot(px) | 表示scale | alpha最小-最大 |
|---|---|---|---|---|---|---|
| 000 / 下 | idle | `KGK_000.png` | 1080x1080 | (540, 450) | 0.220 | 0-255 |
| 000 / 下 | move | `KGK_000_MOOVE.png` | 1254x1254 | (627, 498) | 0.198 | 0-255 |
| 000 / 下 | boost | `KGK_000_BOOST.png` | 1254x1254 | (625, 478) | 0.214 | 0-255 |
| 45 / 左下 | idle | `KGK_45.png` | 1080x1080 | (470, 460) | 0.220 | 0-255 |
| 45 / 左下 | move | `KGK_45_MOOVE.png` | 1254x1254 | (499, 692) | 0.200 | 0-255 |
| 45 / 左下 | boost | `KGK_45_BOOST.png` | 1254x1254 | (482, 746) | 0.204 | 0-255 |
| 90 / 左 | idle | `KGK_90.png` | 1080x1080 | (462, 471) | 0.225 | 0-255 |
| 90 / 左 | move | `KGK_90_MOOVE.png` | 1254x1254 | (419, 664) | 0.205 | 0-255 |
| 90 / 左 | boost | `KGK_90_BOOST.png` | 1254x1254 | (390, 733) | 0.208 | 0-255 |
| 135 / 左上 | idle | `KGK_135.png` | 1080x1080 | (553, 467) | 0.220 | 0-255 |
| 135 / 左上 | move | `KGK_135_MOOVE.png` | 1254x1254 | (610, 551) | 0.213 | 0-255 |
| 135 / 左上 | boost | `KGK_135_BOOST.png` | 1254x1254 | (543, 499) | 0.222 | 0-255 |
| 180 / 上 | idle | `KGK_180.png` | 1080x1080 | (535, 470) | 0.220 | 0-255 |
| 180 / 上 | move | `KGK_180_MOOVE.png` | 1254x1254 | (650, 507) | 0.190 | 0-255 |
| 180 / 上 | boost | `KGK_180_BOOST.png` | 1254x1254 | (673, 505) | 0.192 | 0-255 |
| 225 / 右上 | idle | `KGK_225.png` | 1080x1080 | (624, 430) | 0.225 | 0-255 |
| 225 / 右上 | move | `KGK_225_MOOVE.png` | 1254x1254 | (956, 516) | 0.198 | 0-255 |
| 225 / 右上 | boost | `KGK_225_BOOST.png` | 1254x1254 | (983, 501) | 0.202 | 0-255 |
| 270 / 右 | idle | `KGK_270.png` | 1080x1080 | (592, 470) | 0.225 | 0-255 |
| 270 / 右 | move | `KGK_270_MOOVE.png` | 1254x1254 | (940, 709) | 0.200 | 0-255 |
| 270 / 右 | boost | `KGK_270_BOOST.png` | 1254x1254 | (934, 735) | 0.200 | 0-255 |
| 315 / 右下 | idle | `KGK_315.png` | 1080x1080 | (579, 491) | 0.225 | 0-255 |
| 315 / 右下 | move | `KGK_315_MOOVE.png` | 1254x1254 | (822, 743) | 0.210 | 0-255 |
| 315 / 右下 | boost | `KGK_315_BOOST.png` | 1254x1254 | (807, 793) | 0.208 | 0-255 |

## スキル矩形と基準点

矩形は原寸 `(x,y,width,height)`、pivotはフレーム内座標、再生順は1→8です。全3素材はRGBA。
MOONLIGHT: 1774x887、列0/444/887/1330/1774、行444。
BLOOD SPIKE: 2172x724、列0/543/1086/1629/2172、行392。単純362px等分による角先端・接地面の切断を避けます。
NOVA: 1774x887、列0/444/887/1317/1774、行468。1330pxの列境界ではframe3/4の発光が混ざるためalphaの谷1317pxを使用します。
フレームごとの外接範囲を同一サイズに正規化せず、全コマ共通表示scale0.38で元の膨張・収縮を残しています。
MOONLIGHT/BLOOD SPIKEは確認用10fps一回再生、NOVAは8fpsループ。いずれも攻撃周期の設定ではありません。

| スキル | コマ | 原寸rect(px) | frame内pivot(px) | 矩形外周alpha最大(0-255) |
|---|---|---|---|---|
| MOONLIGHT | 1 | (0, 0, 444, 444) | (221, 226) | 1 |
| MOONLIGHT | 2 | (444, 0, 443, 444) | (220, 232) | 1 |
| MOONLIGHT | 3 | (887, 0, 443, 444) | (234, 229) | 1 |
| MOONLIGHT | 4 | (1330, 0, 444, 444) | (223, 241) | 1 |
| MOONLIGHT | 5 | (0, 444, 444, 443) | (235, 208) | 2 |
| MOONLIGHT | 6 | (444, 444, 443, 443) | (259, 213) | 2 |
| MOONLIGHT | 7 | (887, 444, 443, 443) | (257, 185) | 1 |
| MOONLIGHT | 8 | (1330, 444, 444, 443) | (214, 209) | 1 |
| BLOOD SPIKE | 1 | (0, 0, 543, 392) | (270, 340) | 1 |
| BLOOD SPIKE | 2 | (543, 0, 543, 392) | (272, 350) | 1 |
| BLOOD SPIKE | 3 | (1086, 0, 543, 392) | (295, 359) | 1 |
| BLOOD SPIKE | 4 | (1629, 0, 543, 392) | (283, 368) | 1 |
| BLOOD SPIKE | 5 | (0, 392, 543, 332) | (264, 303) | 1 |
| BLOOD SPIKE | 6 | (543, 392, 543, 332) | (277, 303) | 1 |
| BLOOD SPIKE | 7 | (1086, 392, 543, 332) | (278, 299) | 1 |
| BLOOD SPIKE | 8 | (1629, 392, 543, 332) | (274, 301) | 1 |
| PHANTOM NOVA | 1 | (0, 0, 444, 468) | (226, 247) | 1 |
| PHANTOM NOVA | 2 | (444, 0, 443, 468) | (225, 244) | 1 |
| PHANTOM NOVA | 3 | (887, 0, 430, 468) | (220, 252) | 4 |
| PHANTOM NOVA | 4 | (1317, 0, 457, 468) | (232, 249) | 3 |
| PHANTOM NOVA | 5 | (0, 468, 444, 419) | (230, 215) | 1 |
| PHANTOM NOVA | 6 | (444, 468, 443, 419) | (225, 213) | 7 |
| PHANTOM NOVA | 7 | (887, 468, 430, 419) | (220, 214) | 1 |
| PHANTOM NOVA | 8 | (1317, 468, 457, 419) | (228, 214) | 1 |

外周alpha最大は8以下で、重要な本体・角先端・明るい発光を矩形境界で切っていないことを画素検査しました。
完全透明の分離線ではなく、元画像には境界にalpha1〜7程度のごく薄い粒子が残ります。全粒子を矩形だけで完全分離することはできません。原本のalpha修正・再描画はしていません。
NOVAの8→1は球中心を固定しますが、元素材の外炎の形・位相は同一ではありません。完全にシームレスなループを保証する素材ではなく、人間の連続再生確認が必要です。
MOONLIGHT消散コマの命中点は白い核が弱まるため目視推定を含みます。

## 検査した範囲

- PNG寸法と登録値の一致、24poseと24frameのpivot/矩形範囲、再生順。
- 27専用texture keyの重複なし。
- 全24poseで同じ表示適用経路、body拒否、texture欠損時false。
- 24姿勢・24フレームの基準点付き静止一覧を目視確認。
- 原本27と配置先27のSHA-256一致。
- 実ブラウザの操作・ロード・一回再生/ループの確認はPhase 1本体レポート参照。静止画QAと混同しないこと。

## 初期登録した圧縮前27ファイルのSHA-256

| 相対ファイル名（元/配置先で同一） | SHA-256 |
|---|---|
| `character/KGK_000.png` | `60ed73f6aaffefcb37ec970a18cf00367d753c16a1fef43b68c9841bc5590153` |
| `character/KGK_000_MOOVE.png` | `7d69344d41f836bd521d9491e6e2334c1307f77e0f45cb1e8a66277e3e533d87` |
| `character/KGK_000_BOOST.png` | `e9840e3a10f717c3e65f82edcbf35c948c6530cf3a9c924065fd6a3b1f3c948c` |
| `character/KGK_45.png` | `f49bbcb858c14afb36de9535c224a461843f09a41be59dba5c470c5c62ed26a3` |
| `character/KGK_45_MOOVE.png` | `bcf99f17c7a99f994dc7caed1d125f533fce49ae4dea35306b0725a04026033f` |
| `character/KGK_45_BOOST.png` | `7fe34213d57f174d89bb440eee2daa582b45cc17adcfa5d61424882ea299f858` |
| `character/KGK_90.png` | `71c28635561b25d0947285e39cf06320524895e6045aeba1e6010af40f6ff3f1` |
| `character/KGK_90_MOOVE.png` | `28de45cde0abc1a06b950d08c8848f478775060f39dfa1afcf01699d2d96c586` |
| `character/KGK_90_BOOST.png` | `aafb26dbb9b023e9e9f7027824350425aad6d12c3c21b3f3eb88e1f639502c7a` |
| `character/KGK_135.png` | `1a5b150e64a399fbd90b1eac627b0aa5f54c953710652b9b2da8ef450c8c5d90` |
| `character/KGK_135_MOOVE.png` | `4eeca585397d3d22db4d10e562823c53718389fc80ab7d9a4babae5cc5f613d6` |
| `character/KGK_135_BOOST.png` | `2fdd0adb30c6445a6e391bb1f374711803ddcbe6fcc9c37831f6c4a7e5983935` |
| `character/KGK_180.png` | `01cb1972a3af5c1dba996cb5b2de8b3a3a160c48ae16b7b10c1747128b2a4a90` |
| `character/KGK_180_MOOVE.png` | `d3417c7c5cb7ea4571b5b86a1a984cbb994a2f0dffa67cf8dcb07165db58b74b` |
| `character/KGK_180_BOOST.png` | `9b09d4d804b26b660b4d624922369c4f4eb79c27d00bd5fa34da9c546bf49699` |
| `character/KGK_225.png` | `4c9aa95283632333fc1985c5bdd4404b1050657bf5700b00fa6649f2a811977d` |
| `character/KGK_225_MOOVE.png` | `2e387c649e799586edeae449141d9bfe58e30c6ac60636917928b524507cfb7c` |
| `character/KGK_225_BOOST.png` | `2b86d6ca31844dea8c72ddb36ee4a08fa729299f48eaf1760c76ace206f39559` |
| `character/KGK_270.png` | `e767fef3b048d048647aead5e92e3201380a4cc952612883c73c39d089f9f54f` |
| `character/KGK_270_MOOVE.png` | `4717250ad01bdea7cd3ce7fa5723f9d9a58cf51aaed984141788dd9a88f5211c` |
| `character/KGK_270_BOOST.png` | `0716bac3799d599caeddb0230d0213f05f78a63c04c3f8845d3366a385e2034c` |
| `character/KGK_315.png` | `18b4b283a13bd8ec535c8d83579324a68569e10c5b69fcc63bebe5bfb350af24` |
| `character/KGK_315_MOOVE.png` | `9d4f1140f66eebaaca5cbd83ba10c2d46d00d68fdff0d7a5beb110c7e58b81d2` |
| `character/KGK_315_BOOST.png` | `5a344f60bc8eaec08536c83799c69bb89aa8397e0cbba087e1317a6b654b51ba` |
| `skilleffect/MOONLIGHT.png` | `a8cfabf48e5a263466aa2a15ba9bdb5935629afe3405c638cf0880f47466629c` |
| `skilleffect/bloodspike.png` | `36927037aa9fe01e7acf515a770b3722205af0003bdfa902d446f455c7998374` |
| `skilleffect/nova.png` | `d4a413a989b224d43d784c57beb6bc805ab555e04a9f0622836823fb39a29dee` |

## 圧縮版への差し替え（2026-09-06）

ユーザー提供の `character/圧縮` と `skilleffect/圧縮` の27PNGを同名の配置先へコピー。圧縮元のファイルを再加工せず、全27枚でコピー元と配置先のSHA-256が一致しました。

機体24枚とMOONLIGHT/NOVAは初期版と同寸法です。BLOOD SPIKEだけ2172×724→2048×682になっていたため、ユーザー確認後にこの縮小版を採用しました。圧縮版は透過情報を持つindexed PNG（Pモード）で、RGBAへデコードして透過と表示を確認しています。圧縮前との画素一致・可逆圧縮を主張するものではありません。

| 対象 | 圧縮前(bytes) | 圧縮後(bytes) | 削減率 |
|---|---:|---:|---:|
| 機体24枚 | 32,564,576 | 8,126,160 | 75.05% |
| スキル3枚 | 5,013,572 | 1,291,168 | 74.25% |
| 合計27枚 | 37,578,148 | 9,417,328 | 74.94% |

BLOOD SPIKEの矩形境界はx=0/512/1024/1536/2048、y=0/369/682です。接地点は原画像の全体座標を各軸比率で変換してから、新矩形の原点を引いています。全8コマ共通の表示倍率にx方向2172/2048、y方向724/682を掛け、元の見かけの大きさを保ちます。メイン表示の実倍率はx=0.4030078125、y=0.4034017595307918。一覧にも同じ補正を適用します。コマごとの膨張・収縮は維持し、機体のpivot/scaleやhitboxは変更していません。

| コマ | 新rect(px) | 新frame内pivot(px) | 外周alpha最大 |
|---|---|---|---:|
| 1 | (0, 0, 512, 369) | (254.586, 320.276) | 1 |
| 2 | (512, 0, 512, 369) | (256.471, 329.696) | 1 |
| 3 | (1024, 0, 512, 369) | (278.158, 338.174) | 0 |
| 4 | (1536, 0, 512, 369) | (266.843, 346.652) | 1 |
| 5 | (0, 369, 512, 313) | (248.928, 285.682) | 1 |
| 6 | (512, 369, 512, 313) | (261.186, 285.682) | 1 |
| 7 | (1024, 369, 512, 313) | (262.129, 281.914) | 1 |
| 8 | (1536, 369, 512, 313) | (258.357, 283.798) | 1 |

キャッシュ更新: PNGは `umbra-assets-compressed-v3`、Preview moduleとgame.jsは `umbra-phase1-compressed-v3`。通常素材の `STATIC_ASSET_VERSION` は維持します。ページ全体の再読み込みが必要で、Preview内の再起動だけではTextureは更新されません。

検証: 全27PNGのデコード/寸法/透過/圧縮元とのハッシュ一致、3素材×8frameの実画像範囲、接地点、従来の表示サイズを確認。隔離Chromiumで既存Preview試験を再実行し、24姿勢・24frame・一回/ループ再生・欠損・再起動・遅延完了・保存不変/Storage API 0/通常通信入口0/外部要求0がすべて通過しました。今回の検証記録と画面は `C:\Users\akina\.codex\visualizations\2026\09\05\01a071c8-0738-7ea2-a8fc-0927c6aa0777\umbra-compressed\` にあります。

Phase 2Aでのキャッシュ確認: PNG要求は同じ `umbra-assets-compressed-v3` を維持し、コードのみ `umbra-phase2a-v1` へ更新しました。新しい性能試走も同じTexture・metadataを使います。通常全アセットの版番号は変更しません。

### 現行圧縮版27ファイルの寸法・SHA-256（Phase 2A着手時再読取）

以下は現在配置中のPNG本体（IHDRとファイル全体）から再計測した値です。上部の初期版の寸法・SHA-256表は履歴です。Phase 2Aの着手前回帰と完了検証は、この圧縮版を対象にしています。画像本体、表示metadataは今回再加工しません。

| 配置ファイル | 実寸(px) | bytes | 現行SHA-256 |
|---|---:|---:|---|
| `character/KGK_000.png` | 1080×1080 | 249771 | `a32c6c555cffb19d7cdb3e5e37b5f24903e27608d61caaadae48022c90bc8dcc` |
| `character/KGK_000_BOOST.png` | 1254×1254 | 564985 | `682bfdd98723c7ab7f128e21198507ae87ef3e71f18921cc064d80a6d705810e` |
| `character/KGK_000_MOOVE.png` | 1254×1254 | 448333 | `b67d6ff1a169c9027cb4653fd5a795e72515bab9a63f123bb3c64903a5a540b1` |
| `character/KGK_135.png` | 1080×1080 | 258701 | `bae5f8e889e484d177c14ffe007a953b1f940d16add3a5c3fede6239bb67d3d4` |
| `character/KGK_135_BOOST.png` | 1254×1254 | 387402 | `1caa99fe460b5c0f626331c9f1a256c247a4e96f21a7ce731ef966130a9b97c6` |
| `character/KGK_135_MOOVE.png` | 1254×1254 | 329600 | `fc7777f3df082490974c30c4c1da01a033489fb1a73b423a844b203994bfb202` |
| `character/KGK_180.png` | 1080×1080 | 220221 | `56aec57a9d7099edac6933ae76254e356b03224a5f013a78eb1905608f871365` |
| `character/KGK_180_BOOST.png` | 1254×1254 | 524090 | `0ada96e7b424e003b7c128c03315c9c58846c96f084f530589eeebc32322dae0` |
| `character/KGK_180_MOOVE.png` | 1254×1254 | 393264 | `b01967578318ea0298eccd022f593c205f0dd8fa0a9129ce37ab4af0bec54d59` |
| `character/KGK_225.png` | 1080×1080 | 198586 | `15adfc764c0afe9dbed9e681e6c33e4d7befde24cb11c8057341e894c35d0888` |
| `character/KGK_225_BOOST.png` | 1254×1254 | 451247 | `122c973a37b7d3e2a082319e2fe4ca5cd0d53448a443aa59ee5fa94b89847cd9` |
| `character/KGK_225_MOOVE.png` | 1254×1254 | 382476 | `61828f60962115a987500892829f9b0a201802310d1c4afa64741b9e8db5f696` |
| `character/KGK_270.png` | 1080×1080 | 158728 | `7c95dd6419c55f2a24e72b3fe9fca5222645c5bcd1d9f5132f9ea0e4ac361631` |
| `character/KGK_270_BOOST.png` | 1254×1254 | 386712 | `c355aab2dfa3b5d50b73585cd4c5549b8ac4bc7ba2cfc3d31ea62387fdc0121a` |
| `character/KGK_270_MOOVE.png` | 1254×1254 | 292472 | `ca090423aa37e9df051f4e003267c08b5b4d799d0c784640284da6d213d5f1bc` |
| `character/KGK_315.png` | 1080×1080 | 187634 | `100b3d5ffcb7879d6686fcc7157bf58e0452691071842da3c7e2aff83f3c2c37` |
| `character/KGK_315_BOOST.png` | 1254×1254 | 429595 | `beb0b242bb85e0391a358a6397cb808657077cf94eafe5d7ce1fe80962898eff` |
| `character/KGK_315_MOOVE.png` | 1254×1254 | 343052 | `e20c0bd8a672b8065d6d05ea8b0ac0904ee6837450c98d39498cbea5ab658d30` |
| `character/KGK_45.png` | 1080×1080 | 208708 | `4330f634b08635a4c3585142eb414cfd8c3aa7d8601e5ad1eccb66856958d2bd` |
| `character/KGK_45_BOOST.png` | 1254×1254 | 481519 | `505095ab98d589c7b58f49afdfd2bf32229b5aaff5b968fb31e2d66e6328790d` |
| `character/KGK_45_MOOVE.png` | 1254×1254 | 402117 | `7b8944f125205befbf546919f284ab2bd0f5b529eed8e381b5cb782ad8eb70eb` |
| `character/KGK_90.png` | 1080×1080 | 195940 | `391ca2013e84696176aff47955d66756a0030c5d5dd5f2c48214a0311fdfd2a0` |
| `character/KGK_90_BOOST.png` | 1254×1254 | 324098 | `63407c3075aaaeb4596797d8a67b8db6c0f2a610ecf2c10a2b6387c9bac8c703` |
| `character/KGK_90_MOOVE.png` | 1254×1254 | 306909 | `1b9f2b09038277474d52e59508395525a510fb94c485807352ed7d30ac6aa403` |
| `skilleffect/bloodspike.png` | 2048×682 | 382346 | `752018d5cbbf98bcb381f6c1ff9540b82bed5c95f29f5b0ad7662e63e45bc64e` |
| `skilleffect/MOONLIGHT.png` | 1774×887 | 396960 | `39f10640e96e37ea0fe238ee4ef4a7c06198009e9eabe2a0955483029cc09239` |
| `skilleffect/nova.png` | 1774×887 | 511862 | `2f31b165675d9e89c7424cc170b3923206dc85825833d25b8ecfb85778e47e66` |
