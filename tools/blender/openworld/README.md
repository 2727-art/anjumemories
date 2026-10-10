# Open World Asset Pipeline (Blender)

`WORLD_DESIGN.md` 6 章「素材パイプライン仕様」の実装です。広域マップ（`?debugOpenWorld=1`）の街の素材を、CC0 テクスチャと Blender で描き出します。
パイロット（6.10 手順 1〜4）は画風の承認済みです（2026-10-10）。`画像/openworld/manifest.json` には、承認済みのうち地面と路面標示の 6 点を `publish_manifest.py` で載せています。建物 `ow-bld-a01` は南面を補助光を上げて描き直してから載せます（WORLD_DESIGN.md 6.5、6.10）。

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

# 2. 素材を描き出す（約 30 秒。--only ow-bld-a01 のように一部だけも可）
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python tools/blender/openworld/build_all.py -- --out 画像/openworld

# 3. 検証（寸法・透過・継ぎ目・路面標示の画素位置・容量）。preview/ に 2x2 の並べ画像と結果を書く
python tools/blender/openworld/verify_assets.py

# 4. 現在のゲーム画面を撮る（別のターミナルでローカルサーバーを起動しておく）
python -m http.server 4173 --bind 127.0.0.1
node tools/blender/openworld/capture_game.cjs

# 5. 画風の確認用合成画像 preview/pilot-mock.png を作る
python tools/blender/openworld/make_pilot_mock.py

# 6. 承認済みの素材を 画像/openworld/manifest.json に書き出し（hash 付き）、検証する
python tools/blender/openworld/publish_manifest.py --exclude ow-bld-a01
python tools/blender/openworld/verify_assets.py --manifest 画像/openworld/manifest.json --out tools/blender/openworld/preview/published-verify.txt
```

ゲームは `manifest.json` に載った素材だけを読みます。画像を描き直したら、手順 6 をやり直して `hash` を更新してください（`画像/*` は 1 年キャッシュされ、ゲームは `?v=<hash>` で読むため）。

`build_all.py` は乱数の種を固定しているので、同じ版の Blender と同じテクスチャなら同じ画像になります（GPU の違いでノイズが少し変わることはあります）。
作業用の `.blend` は `asset-src/openworld/<key>.blend` に保存されます（git に入れない）。Blender で開いて直接調整できます。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `fetch_textures.py` | Poly Haven / ambientCG から CC0 テクスチャを取得し、`sources.json` を書く。取得済み（チェックサム一致）のものは再取得しない |
| `sources.json` | 取得した素材の出典・ライセンス・URL・取得日時・解像度・使ったマップ・チェックサム |
| `build_all.py` | Blender の入口。素材を描き出し、描き出した一覧を `preview/pilot-manifest.json` に書く |
| `ow_common.py` | 共通：縮尺（1 m = 40 px）、カメラ、光、色管理、メッシュ、シェーダーの組み立て、継ぎ目なしノイズ、発光レイヤー |
| `ow_ground.py` | 地面タイル（`ow-asphalt-a`、`ow-sidewalk`） |
| `ow_markings.py` | 路面標示（`ow-dash-v` / `-h`、`ow-zebra-v` / `-h`） |
| `ow_building.py` | 建物（`ow-bld-a01`：roof / south / 各 emit） |
| `verify_assets.py` | 6.9 の検証（manifest に `hash` があればその一致も） |
| `publish_manifest.py` | 承認済みの素材を `画像/openworld/manifest.json` に書き出し、`hash` を付ける（標準ライブラリだけ） |
| `capture_game.cjs` | 現在のゲーム画面（広域マップ 1a、東京ステージ）を 1280x720 で撮る |
| `make_pilot_mock.py` | 画風の確認用合成画像 |
| `preview/` | 合成画像、2x2 の並べ画像、撮影した現在の画面、パイロットの manifest と検証結果 |

## パイロットの素材

| キー | 出力 | 内容 |
| --- | --- | --- |
| `ow-asphalt-a` | `ground/ow-asphalt-a.jpg` 1024x1024 | aerial_asphalt_01 を 1 枚 1 回、asphalt_02 を 8 回。砂ぼこり、油染み、細かいひび |
| `ow-sidewalk` | `ground/ow-sidewalk.jpg` 512x512 | concrete_pavers を 7 回（1.83 m）。目地の苔、汚れ、欠け |
| `ow-dash-v` / `-h` | `markings/*.png` 16x1920 / 1920x16 | 120 px の線と 120 px の間隔を 8 回、線幅 10 px（左右 3 px は余白） |
| `ow-zebra-v` / `-h` | `markings/*.png` 704x150 / 150x704 | 34 px の縞と 30 px の間隔を 11 回 |
| `ow-bld-a01` | `buildings/ow-bld-a01-*.png` | L 768x1024、6 階。roof 768x1024、south 768x384（k = 0.5）、各 emit |

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

- `ow-asphalt-a` は元テクスチャの大きなひびがタイルごとに同じ位置に出ます。区画ごとに `ow-asphalt-b` と混ぜる前提です。
- 建物の南面には北西からの主光が当たらないため、屋上より暗く写ります（屋上の平均輝度 0.45、南面 0.31、店舗帯 0.25）。主光はそのままで、空の光（補助光）を上げて南面 0.36〜0.38、店舗帯 0.30 以上にすることに決まりました（`ow_common.LIGHT`、未対応）。
- 看板の文字は Blender 同梱の Noto Sans CJK です（SIL Open Font License）。
- 合成画像の夜の色調・街灯の光だまり・発光のにじみは、ゲーム側の光の層（6.11）の代わりに置いた近似です。
- `capture_game.cjs` は Operations Hub の SORTIE PREP ボタンの位置（1280x720 で 1015, 660）をクリックして出撃します。HUB の配置が変わったら直してください。
