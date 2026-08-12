# VFX Field Sheet

iPhone/iOSの撮影現場で使うオフライン優先のVFX記録PWAです。記録は端末のIndexedDBへ保存され、未同期データはJSONでバックアップ・復元できます。

## GitHub Pagesへの公開

`main`ブランチへのpushでGitHub Actionsが静的サイトをGitHub Pagesへデプロイします。初回のみGitHubのリポジトリ設定で**Settings → Pages → Build and deployment → Source**を**GitHub Actions**に設定してください。公開先は通常、`https://utunes-s.github.io/VFXSheet/`です。

GitHub Pagesは静的ホスティングのため、`/api/sync`のNetlify Functionは動作しません。FlowPT同期を利用する本番運用はNetlify公開を使用してください。

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
- **Export FlowPT ZIP**は、CSV、`thumbnails`、`pdfs`フォルダを含むZIPファイルを1つダウンロードします。CSVには5桁ゼロ埋めのローカル`ID`（例: `00001`）と一意識別子の`UUID`を別列で出力します。`Shooting Data Name`は`Episode_Scene_Shot_Reel`形式です。添付したShot Data Thumbnailは`thumbnails/[ID5桁]_[Shooting Data Name]_[撮影日YYYYMMDD].jpg`として格納され、CSVの`ThumbText`列にはその相対パスが入ります。複数画像は登録順を維持し、各画像のアスペクト比を保ったままトリミングせず、全体が可能な限り16:9に近くなる行レイアウトのコラージュJPEGになります。各Shooting Dataには、通常のPDF出力と同じVFX Sheetデザインの個別PDFが`pdfs/[ID5桁]_[Shooting Data Name]_[撮影日YYYYMMDD].pdf`として1ファイルずつ生成され、CSVの`PDF`列にはその相対パスが入ります。PDFのレポート背景は180 dpi相当で圧縮し、サムネイルとスケッチのみを最大2000 pxの高品質JPEGとして個別に保持するため、通常は1ファイル約10 MB以内を目標にします。クリップ名の列名は`ClipName`です。
- PDFをShooting DataのElementとして自動紐付けするには、FlowPTのインポート機能がCSVの`PDF`列にある相対パスをElement添付として解釈する必要があります。対応していない場合は、Shooting DataをCSVで作成後に、同名の`pdfs/[Shooting Data Name].pdf`をElementとして手動登録してください。
- SafariのPWAではダウンロードしたZIPを「ファイル」アプリに保存してから展開し、CSV、`thumbnails`、`pdfs`フォルダをまとめてFlowPTへ登録してください。
- iPadのPWAで**Export PDF**を実行した場合、PDF画面上部の**Export PDF**から保存／印刷を実行できます。完了後は自動でVFX Sheetへ復帰し、復帰しない場合は**Close & Return to VFX Sheet**を押してください。
- `sw.js`、`index.html`、`manifest.webmanifest`はキャッシュしない設定です。アプリ更新時には`sw.js`の`CACHE_NAME`を増やしてください。
- Service WorkerはHTTPSでのみ動作します。`file://`で直接開く運用はPWAのオフライン起動を保証しません。
