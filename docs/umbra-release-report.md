# UMBRA SERAPH 公開対象・事前検証記録

2026-10-04。通常プレイ・購入・保存互換の実装後、ユーザーから本番デプロイまでの明示依頼を受けた公開作業。段階実装レポートの当時の未公開／未deployという記録は保持する。

## 対象

- 開始HEADは `28cfe5ab71048b0487254dceef6f66f3a25788f9`。fetch後のorigin/mainとの差分は0/0。
- Phase 1〜7と採用済みバランス、通常HANGERの購入・選択・出撃、永続所有、旧保存互換、Google schema2を公開対象とする。
- 既存変更のgame.js／skillDefinitions.js／index.html／firestore.rules／README.md、9つのUMBRA module、隔離入口HTML、27 PNG、関連報告と検証コードを含む。
- AGENTS.md、vendor、装備・stage定義、実セーブ、素材原稿、ローカル検証ログ、認証情報は変更・追加しない。ランキングボタンなど別件は含めない。
- 正式性能は通常出撃requestへ固定する。隔離integration入口は非loopbackホストでは開始を拒否する。

## 公開前の確認

- 前回最終manifestの196ファイルすべてが同じSHA-256。
- 27 PNGと新規module／入口の計37パスは実在し、大小文字も一致。素材合計9,417,328 bytes。rootとGitHub Pagesのsubpathに対応する相対参照。
- `node --check game.js`、`skillDefinitions.js`、`stageDefinitions.js`、`equipmentDefinitions.js`、`umbraPersistence.js` に成功。
- 今回再実行した `node --test tests/*.test.cjs` は562/562 PASS、fail/skipは0。
- 同一ソースに対する実装完了時のブラウザ検証は4ケース59項目、隔離試験8ケース、Rules emulator10ケースが成功。これは新しい本番サービス上でのアカウント保存試験を意味しない。

## Firestore Rulesの先行反映

- 明示対象project: `anju-3f26d`。既存のFirebase CLI 15.32.0を使用し、新規依存を導入していない。
- 変更前のactive Rulesは開始HEADのfirestore.rulesと改行正規化後に一致し、別の本番変更がないことを確認。
- `firebase deploy --only firestore:rules --project anju-3f26d --config firebase.json --non-interactive` が成功。
- active releaseを再取得し、Rules SHA-256がローカルと完全一致した。
- 反映時刻: `2026-10-04T07:01:39.106162Z`（日本時間16:01）。ruleset: `5c96ad40-ca55-460a-9eea-447beac14ec3`。
- Rules SHA-256: `f8b844706cdb351532168ec425ed669117d9f56a6f280ee204f470fab49421b1`。
- schema1を保持しつつ1→2へ移行可能。2→1や世代混在の書込みを拒否する。ゲーム利用者のドキュメント読取り／書込みは行っていない。

## 静的配信の完了判定

GitHub mainへ公開後、以下2経路のHTML・JavaScript・素材を個別に取得し、ローカル版とのhash一致を確認する。Gitの同期だけでは完了としない。

- https://2727-art.github.io/anjumemories/
- https://miragelabyrinth.anjugames.workers.dev/

本番確認では新規ブラウザcontextのみを使い、外部認証・Firestore・ランキング通信を遮断する。合成GEEK／討伐記録を使う場合も、その破棄可能なブラウザ内だけで購入と再読込みを確認する。本番利用者のアカウント・保存データには触れない。

公開前game.js SHA-256: `d6367bb75dac9b698b37a76854c9ea8923e52a05bb3a2d0b1902e3f3d47ed99e`。HTML cache key: `umbra-production-v1`。配信時のLF／CRLF差は正規化して比較する。

各経路の取得時刻、commit、hash、ブラウザ結果は作業用 `.tmp_umbra_release/2026-10-04/` に別保存し、公開後の完了報告で結果を示す。この文書の事前検証だけで本番配信確認済みとは扱わない。

## 検証の限界

実Googleアカウント間のupload／restore、実機スマートフォン、全Depthの長時間自然進行・性能測定は今回の公開確認には含めない。Rules emulatorと隔離ブラウザの結果をこれらの保証へ拡張しない。旧版タブによるlocalStorage書込みを完全には防げないため、更新時は旧版タブを閉じて新しいページを開く。
