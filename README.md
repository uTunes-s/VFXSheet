# VFX Field Sheet

iPhone/iOSの撮影現場で使うオフライン優先のVFX記録PWAです。記録は端末のIndexedDBへ保存され、未同期データはJSONでバックアップ・復元できます。

## Netlifyへの公開

1. このフォルダをGitリポジトリにコミットしてGitHub/GitLab/Bitbucketへpushします。
2. Netlifyで **Add new site** → **Import an existing project** を選択し、対象リポジトリを指定します。
3. Build settingsは設定不要です。`netlify.toml` が公開ディレクトリとFunctionを設定します。
4. Site configuration → Environment variables に次の値を登録します。
   - `FLOWPT_SYNC_URL`: FlowPTの受信API URL
   - `FLOWPT_API_TOKEN`: FlowPT用のサーバー専用Bearerトークン
5. Deploy後、iPhone Safariでサイトを開き、共有メニューから「ホーム画面に追加」を実行します。
6. その後、オンラインで一度起動完了させてから機内モードで再起動し、保存・一覧・JSON書き出しを確認します。

## 同期APIの契約

ブラウザは同一オリジンの`POST /api/sync`へ記録を送ります。Netlify Functionが`FLOWPT_SYNC_URL`へ転送します。Functionは次を付与します。

- `Authorization: Bearer <FLOWPT_API_TOKEN>`
- `Idempotency-Key: <record.uuid>`

FlowPT側は`Idempotency-Key`またはJSONの`uuid`を一意キーとして保存し、同じ値の再送を成功として扱ってください。認証トークンはブラウザ側のファイルに書かないでください。

## 現場運用

- IndexedDBは端末ストレージなので、同期前もJSONバックアップをFiles/iCloud Drive等の別領域へ保存します。
- `sw.js`、`index.html`、`manifest.webmanifest`はキャッシュしない設定です。アプリ更新時には`sw.js`の`CACHE_NAME`を増やしてください。
- Service WorkerはHTTPSでのみ動作します。`file://`で直接開く運用はPWAのオフライン起動を保証しません。
