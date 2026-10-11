# Open World Asset Pipeline (Blender)

`WORLD_DESIGN.md` 6 章「素材パイプライン仕様」の実装です。広域マップ（`?debugOpenWorld=1`）の街の素材を、CC0 テクスチャと Blender で描き出します。
パイロット（6.10 手順 1〜4）と手順 5（A〜C の残り、建物の南面の描き直し）は、どちらも承認済みです（2026-10-10）。建物は 2026-10-11 に 4 種類（`ow-bld-b01`〜`e01`）を足して 5 種類になりました（WORLD_DESIGN.md 8 章「建物の種類を増やすとき」）。`画像/openworld/manifest.json` には 46 点すべてを `publish_manifest.py` で載せていて、ゲームはすべて使います（建物は Phase 1b から、WORLD_DESIGN.md 7・8 章）。

## 使った環境

| 項目 | 版 |
| --- | --- |
| Blender | **5.2.2 LTS**（`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`） |
| 描画 | Cycles、OptiX（NVIDIA GeForce RTX 5070）。GPU がなければ CPU で描く |
| Python（取得・検証・モック） | 3.12（標準ライブラリ。検証とモックは Pillow と numpy も使う） |
| Node（現在の画面の撮影） | 24。リポジトリの `node_modules/playwright-core` とローカルの Chrome |

## 手順

すべてリポジトリのルートで実行します（PowerShell）。

```powershell
# 1. CC0 テクスチャを asset-src/openworld/cache/ に取得し、sources.json に記録する
python tools/blender/openworld/fetch_textures.py
python tools/blender/openworld/fetch_textures.py --verify   # 取得済みファイルの照合だけ

# 2. 素材を描き出す（--set all は 46 点で約 2 分。--set pilot はパイロットの 7 点、--set buildings は建物 5 種、
#    --only ow-bld-a01,ow-park のように一部だけも可）。一覧は preview/build-manifest.json に書く
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python tools/blender/openworld/build_all.py -- --set all --out 画像/openworld

# 3. 検証（寸法・透過・継ぎ目・路面標示の画素位置・小物の縁と水面マスク・建物の明るさ・容量）。
#    preview/ に 2x2 の並べ画像と build-verify.txt を書く
python tools/blender/openworld/verify_assets.py

# 4. 現在のゲーム画面を撮る（別のターミナルでローカルサーバーを起動しておく）
python -m http.server 4173 --bind 127.0.0.1
node tools/blender/openworld/capture_game.cjs

# 5. 画風の確認用合成画像を作る（パイロットは preview/pilot-mock.png、
#    手順 5 は preview/step5-mock-night.jpg / -neutral.jpg / step5-assets.jpg、
#    建物の種類は preview/buildings-roofs.jpg / buildings-block-night.jpg / -neutral.jpg）
python tools/blender/openworld/make_pilot_mock.py
python tools/blender/openworld/make_step5_preview.py
python tools/blender/openworld/make_buildings_preview.py

# 6. 承認済みの素材を 画像/openworld/manifest.json に書き出し（hash 付き）、検証する
#    （承認前の素材があるときは --exclude <key> で外す）
python tools/blender/openworld/publish_manifest.py
python tools/blender/openworld/verify_assets.py --manifest 画像/openworld/manifest.json --out tools/blender/openworld/preview/published-verify.txt
```

ゲームは `manifest.json` に載った素材だけを読みます。画像を描き直したら、手順 6 をやり直して `hash` を更新してください（`画像/*` は 1 年キャッシュされ、ゲームは `?v=<hash>` で読むため）。

`build_all.py` は乱数の種を固定しているので、同じ版の Blender と同じテクスチャなら同じ画像になります（GPU の違いでノイズが少し変わることはあります）。
ただし、描き直すとノイズの差でファイルの中身はわずかに変わり（平均 0.001/255 程度）、`hash` も変わります。承認済みの素材を変えずに置きたいときは、`--only` で描き直す素材だけを指定してください。
作業用の `.blend` は `asset-src/openworld/<key>.blend` に保存されます（git に入れない）。Blender で開いて直接調整できます。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `fetch_textures.py` | Poly Haven / ambientCG から CC0 テクスチャを取得し、`sources.json` を書く。取得済み（チェックサム一致）のものは再取得しない。API に届かないときも、取得済みのファイルが前回の記録と一致すれば、その記録をそのまま使う |
| `sources.json` | 取得した素材の出典・ライセンス・URL・取得日時・解像度・使ったマップ・チェックサム |
| `build_all.py` | Blender の入口。素材を描き出し、描き出した一覧を `preview/build-manifest.json` に書く（`--set all` / `pilot` / `buildings`、`--only`） |
| `ow_common.py` | 共通：縮尺（1 m = 40 px）、カメラ、光、色管理、メッシュ、シェーダーの組み立て、継ぎ目なしノイズ、発光レイヤー、EXR の読み込み、PNG の書き出し |
| `ow_ground.py` | 地面タイル（`ow-asphalt-a` / `-b`、`ow-sidewalk`、`ow-plaza`、`ow-parking`、`ow-park`、`ow-lot`）、縁石（`ow-curb-h` / `-v`）、汚れ（`ow-grit`） |
| `ow_markings.py` | 路面標示（`ow-dash-v` / `-h`、`ow-zebra-v` / `-h`、`ow-edgeline-v` / `-h`） |
| `ow_props.py` | 小物 25 種（6.6 C）。水たまりの水面マスク |
| `ow_building.py` | 建物（`ow-bld-a01`：roof / south / 各 emit）。南面の補助光の調整、4 枚の描き出し（`render_building`）、屋上の明るさ合わせ（`calibrate_roof`） |
| `ow_building_types.py` | 建物 b01〜e01。大きさ・階数・外壁・窓・1 階の店と看板・屋上の設備と防水を種類ごとに書く（`TYPES`、`facade_<style>`、`roof_<style>`） |
| `verify_assets.py` | 6.9 の検証（manifest に `hash` があればその一致も） |
| `publish_manifest.py` | 承認済みの素材を `画像/openworld/manifest.json` に書き出し、`hash` を付ける（標準ライブラリだけ） |
| `capture_game.cjs` | 現在のゲーム画面（広域マップ 1a、東京ステージ）を 1280x720 で撮る |
| `make_pilot_mock.py` | パイロットの画風の確認用合成画像 |
| `make_step5_preview.py` | 手順 5 の確認用画像。新しいタイル・縁石・小物と描き直した建物を、ゲームの夜の光の式（環境光・光だまり・水たまりの照り返し）で並べる |
| `make_buildings_preview.py` | 建物の種類の確認用画像。5 種類の屋上・夜の屋上・南面・south_emit・通りの光（ゲームの `getOpenWorldBuildingNeon` と同じ計算）を並べたものと、ゲームの配置と夜の光で組んだ 4 街区 |
| `preview/` | 合成画像、2x2 の並べ画像、撮影した現在の画面、`build-manifest.json` と検証結果 |

## パイロットの素材

| キー | 出力 | 内容 |
| --- | --- | --- |
| `ow-asphalt-a` | `ground/ow-asphalt-a.jpg` 1024x1024 | aerial_asphalt_01 を 1 枚 1 回、asphalt_02 を 8 回。砂ぼこり、油染み、細かいひび |
| `ow-sidewalk` | `ground/ow-sidewalk.jpg` 512x512 | concrete_pavers を 7 回（1.83 m）。目地の苔、汚れ、欠け |
| `ow-dash-v` / `-h` | `markings/*.png` 16x1920 / 1920x16 | 120 px の線と 120 px の間隔を 8 回、線幅 10 px（左右 3 px は余白） |
| `ow-zebra-v` / `-h` | `markings/*.png` 704x150 / 150x704 | 34 px の縞と 30 px の間隔を 11 回 |
| `ow-bld-a01` | `buildings/ow-bld-a01-*.png` | L 768x1024、6 階。roof 768x1024、south 768x384（k = 0.5）、各 emit |

## 手順 5 の素材

| キー | 出力 | 内容 |
| --- | --- | --- |
| `ow-asphalt-b` | `ground/ow-asphalt-b.jpg` 1024x1024 | 傷んだ道路：補修跡、亀甲状と長いひび、穴。`-a` と同じ明るさで、区間ごとに混ぜる（平均輝度 0.37） |
| `ow-plaza` | `ground/ow-plaza.jpg` 1024x1024 | 0.8 m の石の平板と 3.2 m ごとの太い目地（実行時の `ow-tile` と同じ 128 px）、板ごとの色むら、割れ・欠け、目地の雑草（0.42） |
| `ow-parking` | `ground/ow-parking.jpg` 960x960 | 区画線（幅 120 px の枠、奥行き 190 px の列、通路 100 px、周期 480 px）、油染み、車止め（0.38） |
| `ow-park` | `ground/ow-park.jpg` 1024x1024 | 荒れた芝生：まだらな芝、枯れた所、むき出しの土、落ち葉、伸びた草の塊（0.36） |
| `ow-lot` | `ground/ow-lot.jpg` 1024x1024 | 空き地：砂利、がれき、むき出しの土、雑草、割れた基礎のコンクリート（0.38） |
| `ow-curb-h` / `-v` | `ground/*.jpg` 1024x16 / 16x1024 | 道路側 10 px が側溝、6 px が 0.15 m 高い縁石の天端。道路は上（`-h`）・左（`-v`）。manifest に `roadSide` |
| `ow-grit` | `ground/ow-grit.png` 512x512 | 透過の汚れ。画面全体に薄く重ねる |
| `ow-edgeline-v` / `-h` | `markings/*.png` 8x2048 / 2048x8 | すり減った 6 px の路肩線（左右 1 px は余白） |
| `ow-prop-*` | `props/*.png` | マンホール、排水溝、水たまり a〜c（`_water` 付き）、ひび a / b、陥没 c、がれき a〜d、ゴミ袋、バリケード、車 3 種、木 3 種、街灯の灯具。寸法は 6.6 C |

### 小物の描き方

- 路面に貼るもの（マンホール・排水溝・水たまり・ひび）は、地面タイルと同じく空の光だけで描く。`ow-asphalt-*` の上で明るさの段差が出ない。manifest に `"decal": true`。
- 高さのあるもの（がれき・ゴミ袋・バリケード・車・木・灯具）は、建物と同じく空の光と北西の主光で描く。車とバリケードは向きごとに `-h` / `-v` を描き、主光の向きを保つ。
- 接地の影は 2 回に分けて描く（`render_with_contact_shadow`）。1 回目は小物だけ、2 回目は小物を隠して、空の光だけで照らした影受けの面に落ちる影を描く。影は小物の輪郭をぼかした範囲（8 px）に限り、画像の縁に向けて消す。主光の長い影は画像に入れない（6.5）。
- 画像の中心が置く位置（`origin [0.5, 0.5]`）。縁の 1 px は透明（アルファ 8/255 以下）。

### 水たまりと水面マスク

- 実際に形を作って描く。asphalt_02 の凹凸で路面を起こし、くぼみを掘って、その上に水面を張る。水には深さに応じた暗い色を付け、空の映り込みは 20% だけ残す（夜の空は暗いため）。
- 路面を白・黒にした 2 回の描画から、透過の画像を作る。白と黒の差から「路面が透けて見える割合」を出してアルファにし、色は中間の明るさの路面（0.133）の上で元の見た目になるよう解く。どのアスファルトの上に置いても、水の暗さと縁の濡れ色がなじむ。
- 浮いた落ち葉は LeafSet014 の葉を 1 枚ずつ切り出した板で、0.28〜0.40 m。水たまり a / b / c に 5 / 8 / 12 枚。濡れた色のマテリアルにしてある。
- 3 回目の描画で水面マスク（`<key>_water.png`）を作る。水面だけを発光させ、路面と落ち葉は Holdout にする。同じ寸法・同じ位置で、ゲームはこれを街灯の色で加算して照り返しにする（WORLD_DESIGN.md 7 章「夜の光」）。
- 乾いた路面に出る描画ノイズは、水たまりの範囲から外側に向けて消すマスクで取り除く。

### 建物の南面の補助光

- 北西の主光は南面に当たらないため、南面だけを照らす補助光を足した（`ow_building.FACADE_FILL`：方位 180°、高さ 20°、角度 45°）。
- 補助光はライトリンクで、窓ガラスと 2 階以上の室内・床には当てない（窓が灰色に浮かないように）。屋上を描くときは消す。
- 強さは、補助光なしと強さ 1 の描画を EXR で読み、南面の平均輝度が 0.37 になるよう二分法で決める（結果 1.005）。結果は南面 0.370、店舗帯 0.310、屋上 0.446。値は build-manifest の `facadeFill` に残る。

## 建物の種類（ow_building_types.py）

| キー | 敷地 / 階数 | 外壁と 1 階 | 屋上 |
| --- | --- | --- | --- |
| `ow-bld-b01` | 768×768 / 5 | タイル（square_tiled_wall）。ラーメン屋、上の階の入口、半分開いたシャッターのスナック、縦の看板（BAR・スナック・居酒屋・麻雀） | 剥がれた緑の防水塗装（painted_concrete）。南西の L 字の看板の鉄骨と通路、塔屋と機械室、横置きのステンレス水槽、室外機の架台、ケース・ドラム缶・ブルーシート、パラボラ |
| `ow-bld-c01` | 512×640 / 3 | モルタル（white_plaster_rough_01）。酒・たばこ屋（赤い看板、たばこの看板、自販機 2 台）、住宅の玄関、雨戸 | 銀色の塗装が剥げたアスファルトシート。ウッドデッキ（weathered_planks）、雑草の生えたプランター、倒れたパーゴラと電球、鉢植えの枯れ木、物干しと洗濯物、赤い屋根の物置（box_profile_metal_sheet）、波板屋根の階段室、青い水槽、パラボラ |
| `ow-bld-d01` | 1024×768 / 8 | タイル（rectangular_facade_tiles）の横長の窓。ゲームセンター（クレーンゲーム）、オフィスの入口、ドラッグストア、2 階の「カラオケ」の文字 | 薄い灰色の防水シート（2 m 幅、継ぎ目、補修）。冷却塔 2 基、柵の中の室外機（縞鋼板の床）、ダクト、割れたり欠けたりした太陽光パネル 4 列、手すり |
| `ow-bld-e01` | 512×1024 / 12 | タイル（rectangular_facade_tiles_02）。ひさしのあるホテルの入口、バー、縦の「HOTEL」の看板（T だけ消えている） | 濃い灰色の防水塗装に緊急用ヘリポートの「H」と周りの灯、ゴンドラのレールと黄色い台車、機械室と FRP 水槽、鉄塔と赤い航空障害灯、吹き流し、土のうと担架 |

作り方の要点:

- 光は a01 と同じです。南面の補助光の強さは棟ごとに求めます（6.5）。
- 屋上の平均輝度は 0.45 にそろえます。防水の材質に明るさの係数（Value ノード `roof_gain`）を入れ、屋上を低い解像度で描いて測りながら、係数を合わせます（`ow_building.calibrate_roof`）。光は変えません。係数は build-manifest の `roofGain` に残ります。
- 南面の south_emit から、ゲームは通りの光を作ります（WORLD_DESIGN.md 8 章）。細いネオン文字だけでは光る面積が足りないので、文字の後ろの板を同じ色で弱く光らせます（`fascia_sign(..., halo=...)`）。照明の付いた店内は弱めにして、看板の色に寄せます。
- 最上階の部屋の仕切りの上端は、屋上スラブの下に収めます（同じ高さだと屋上の面に出てしまうため）。

### `ow-bld-a01` の内容

1980 年代の雑居ビルが廃墟になった想定です。

- 1 階：店舗 3 軒（シャッターが下りた居酒屋、シャッター半開きのカラオケ、ガラスが割れたまま明かりの残るミニマート）、看板。
- 2〜6 階：窓 30 枚（暗い・ブラインド・カーテン・割れ・板張り・明かりあり）。窓下の室外機、雨だれ、足元の汚れ、西側の蔦、袖看板（酒場 / BAR / 麻雀 / 占い）。
- 屋上：伸縮目地のある押えコンクリート、塔屋と高架水槽、アンテナ、室外機、配管、看板の裏の鉄骨、ブルーシートと土のう、天窓、瓦礫、苔、落ち葉、水たまり。
- 発光（emit）：明かりのある窓、看板とネオン文字、ミニマート、塔屋の灯具と非常口、看板照明、アンテナの赤色灯。

## 主なパラメータ

| 項目 | 値 | 場所 |
| --- | --- | --- |
| 縮尺 | 1 m = 40 px、正射影カメラの `ortho_scale` = 出力幅 px / 40 | `ow_common.PX_PER_M` |
| 壁面の縦の縮め | k = 0.5。画素の縦横比 2 で描き、縮小処理はしない | `ow_common.FACADE_K` |
| 空の光 | 一様な白、強さ 1.0（平らな面のアルベド A がそのまま A で写る） | `ow_common.LIGHT` |
| 主光（建物・小物） | 北西（方位 315°）、高さ 50°、放射照度 1.45（水平面で空の光の約 35%）、角度 3° | `ow_common.LIGHT` |
| 色管理 | View Transform `Standard`、Look なし、露出 0、出力 8bit sRGB | `ow_common.setup_render` |
| 地面の平均輝度 | アスファルト 0.37、歩道 0.42（sRGB）。光は変えず、マテリアルの明るさで合わせる | `ow_ground.GROUND_TILES` |
| サンプル数 | 地面 128、建物 256 + OpenImageDenoise | 各モジュール |
| 路面標示 | 128 サンプル、デノイズなし、1 px の Box フィルター（線の外ににじませない） | `ow_markings.build` |
| JPG 品質 | 88 | `ow_common.render_still` |

継ぎ目なしの作り方：画像テクスチャはタイル 1 枚に整数回だけ繰り返し、手続きノイズはタイルの大きさを周期とする 4 次元のトーラス上で評価します（`Nodes.periodic`）。地面は 3x3 枚分の広さに置いて、端の光の当たり方も隣と同じにしています。

発光レイヤー：本体は発光を切って描き、同じカメラで「発光する物だけ Emission、ガラスは透明、それ以外は Holdout」にして描き直します（`EmitLayer`）。アルファは発光する部分の被覆率、色は発光色です。

## 既知の制限と次の確認

- `ow-asphalt-a` は元テクスチャの大きなひびがタイルごとに同じ位置に出ます。ゲームは道路の区間ごとに 45% を `ow-asphalt-b` にして崩しています。
- 看板の文字は Blender 同梱の Noto Sans CJK です（SIL Open Font License）。
- 合成画像の夜の色調・街灯の光だまり・発光のにじみは、ゲーム側の光の層（6.11）の代わりに置いた近似です。`make_step5_preview.py` はゲームと同じ式を使いますが、照り返しは画素ごとに計算するので、ゲーム（四隅の透明度の補間）より少し細かく見えます。
- `capture_game.cjs` は Operations Hub の SORTIE PREP ボタンの位置（1280x720 で 1015, 660）をクリックして出撃します。HUB の配置が変わったら直してください。
