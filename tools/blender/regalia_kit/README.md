# REGALIA Kit Asset Pipeline (Blender)

`docs/regalia-kit-design.md` 11・12 章の素材を Blender で描き出します。**R1（画風試作）は 2026-10-12 に承認済み**です。ここで描いた画像はまだゲームに組み込んでいません（`画像/` には置いていません）。

共通の設定は `tools/blender/openworld/ow_common.py` をそのまま使います（色管理 Standard、北西の主光、Cycles と GPU）。R1 は確認しやすいよう 2 倍の解像度（1 m = 80 px、ゲームは 1 m = 40 px）で描きます。

## 使った環境

| 項目 | 版 |
| --- | --- |
| Blender | 5.2.2 LTS（`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`） |
| 描画 | Cycles。GPU があれば使う（`ow_common.enable_gpu`） |
| Python（モック） | 3.12、Pillow、numpy |
| Node（ゲーム画面の撮影） | 24。リポジトリの `node_modules/playwright-core` とローカルの Chrome |

## 手順

リポジトリのルートで実行します（PowerShell）。

```powershell
# 1. R1 の 5 点を描き出す（約 15 秒）。--only shield,pulse のように一部だけも可
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python tools/blender/regalia_kit/build_r1.py -- --out tools/blender/regalia_kit/preview

# 2. REGALIA で出撃したゲーム画面を撮る（別のターミナルでローカルサーバーを起動しておく）
python -m http.server 4173 --bind 127.0.0.1
node tools/blender/regalia_kit/capture_regalia.cjs

# 3. 光のにじみを焼き込み、ゲーム画面への合成と比較画像を作る
python tools/blender/regalia_kit/make_r1_mock.py
```

撮影は新しいブラウザのプロファイルで行い、保存データには触れません。REGALIA は既存の debug 指定（`debugPlayerMech` / `debugPlayerMechUnlock`）で選びます。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `build_r1.py` | Blender の入口。盾、地面のひび、反撃波 1 コマ、アイコン 2 種を描き、それぞれ光る部分だけの `_emit.png` も描く。乱数の種は固定 |
| `capture_regalia.cjs` | REGALIA で広域マップに出撃した 1280x720 の画面と、同じ一時停止中の画面から機体だけを消した画面を撮る（差分が機体のマスクになる） |
| `make_r1_mock.py` | にじみ（`_emit` をぼかして加算）と 1 px 相当の暗い輪郭を焼き込んだ `*-final.png`、ゲーム画面への合成 2 枚（テリトリー S1 と S8）、既存の絵との比較画像を書く |
| `preview/` | 描き出した画像、撮影した画面、合成と比較の画像、`r1-assets.json`（寸法と基準点） |

## R1 の素材

| 出力 | 寸法（2 倍） | 視点 | 内容 |
| --- | --- | --- | --- |
| `r1-shield.png` | 256x320 | 北向き・20° 見下ろしの正投影（機体の画像に合わせる） | 金の縁、象牙色の面、金の象嵌線、青く光る継ぎ目、紺の盾心、金の十字と宝石、王冠の棘。先端を 0.2 m 地面に埋め、足元に瓦礫 |
| `r1-crack.png` | 256x256 | 真上（地面の小物に合わせる） | くぼみ、放射状のひび（金とシアンに光る芯）、押し上げられた路面の破片、瓦礫と影 |
| `r1-pulse.png` | 512x512 | 真上 | 黒地に発光だけで描いた衝撃の輪（半径 200 px）。合成時は明るさからアルファを作り、加算で重ねる |
| `r1-icon-aegis.png` | 256x256 | 14° 見下ろし | 盾 3 枚を並べた構図 |
| `r1-icon-pulse.png` | 256x256 | 正面 | 十字の紋章と 2 重の衝撃の輪、外向きの金の矢印 |

色は `画像/player/ALM-01_REGALIA_BASTION/ALM_000.png` とキャノンの爆発画像から拾っています（象牙 `#ece4d6`、金 `#f0c574`、紺 `#1b2250`、光 `#9fd2ff` / `#8fa0f0`、金の光 `#ffd86b`）。
