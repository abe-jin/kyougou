# 競合価格監視システム

このプロジェクトは、楽天やAmazonなど複数の競合ECサイトから指定した商品の価格を自動取得し、履歴管理・グラフ表示・最安値通知などを行うWebダッシュボードシステムです。

## 主な機能

- 競合ECサイトからの価格自動取得（スクレイピング/API対応）
- 取得価格のCSV保存＆履歴管理
- 商品ごとの価格推移グラフ表示
- 最安値・価格変動アラート通知（メール/LINE/Slack対応）
- 最安値・価格変動アラート通知（メール/Slack/LINE/Webhook/Teams/SMS/Google Chat対応）
- Webダッシュボードによる一覧・分析画面

## 環境

- Python 3.x（スクレイピング・自動取得用）
- React（Next.js）（Webダッシュボード用）

## 使い方（例）

1. `scraping/`ディレクトリのPythonスクリプトで価格データを自動取得し、CSVへ保存します。
2. `frontend/`ディレクトリのReactアプリで、CSVまたはAPIからデータを取得し、価格一覧やグラフを表示します。
3. 価格変動時に自動通知を受け取る設定も可能です。

## セットアップ
### Python依存パッケージ
```
pip install -r scraping/requirements.txt
```

### 秘密情報の管理
Slack や LINE、Webhook、Teams、SMS、Google Chat の各トークン、JWT シークレット
などは `.env` ファイルにまとめて記述してください。`python-dotenv` により各
スクリプト起動時に自動読み込みされます。AWS Secrets Manager を使う場合は
`AWS_SECRET_NAME` を設定するとそのシークレット値が環境変数として展開されます。
サンプルとして `.env.example` を用意しています。

### S3設定
AWS S3 を使用する場合は以下の環境変数を設定してください。

- `S3_BUCKET` ... 使用するバケット名
- `PRICES_CSV_KEY` ... 価格履歴CSVのキー (デフォルト: `prices.csv`)
- `PRICES_JSON_KEY` ... JSON履歴のキー (デフォルト: `prices.json`)
- `PRODUCTS_KEY` ... 商品設定ファイルのキー (デフォルト: `products.json`)
- `USERS_JSON_KEY` ... ユーザー情報ファイルのキー (デフォルト: `users.json`)
- `users.json` の各ユーザーでは `notify` に "slack" や "line" など利用する通知チャネルをカンマ区切りで指定します
- `BACKUP_PREFIX` ... バックアップ保存用プレフィックス (デフォルト: `backup`)
- `ERROR_LOG_KEY` ... エラーログ保存先キー (デフォルト: `error.log`)
- `SUGGESTION_KEY` ... セレクタ候補保存先キー (デフォルト: `selector_suggestions.json`)

設定すると各PythonスクリプトはこれらのファイルをS3から読み書きします。

### Firestore設定
Google Cloud Firestore を利用する場合は以下を設定します。

- `FIRESTORE_PROJECT` ... プロジェクト ID
- `FIRESTORE_COLLECTION` ... データ保存に使うコレクション名 (デフォルト: `files`)

この値が設定されていると、`s3_utils` の各関数は Firestore を利用してファイル内容を保存・取得します。

### スクレイピング設定
- `PROXY_LIST` ... カンマ区切りのプロキシURLリストを指定すると、失敗時に順番に切り替えます
- `MAX_RETRIES` ... 各プロキシでのリトライ回数 (デフォルト: 3)
- `LATENCY_THRESHOLD` ... レスポンス遅延がこの秒数を超えるとSlackに通知 (デフォルト: 5)
- `SCRAPER_RATE_LIMIT` ... 1分あたりのリクエスト上限。設定するとPoolサイズも自動調整されます
- `SCRAPER_MAX_WORKERS` ... 使用する最大プロセス数を指定 (0ならCPU数)
- `STRUCTURE_THRESHOLD` ... ページHTMLが以前と大きく異なった際にセレクタ要修正アラートを出す判定閾値 (デフォルト: 0.8)
- `OOS_KEYWORDS` ... 在庫切れを判断するキーワードをカンマ区切りで指定 (デフォルト: `在庫切れ,売り切れ,在庫なし,販売終了,販売停止`)
- `WEBHOOK_URL` ... 汎用Webhook通知先URL
- `TEAMS_WEBHOOK_URL` ... Microsoft Teams用Webhook URL
- `SMS_API_URL` ... SMS送信APIのURL
- `SMS_API_TOKEN` ... SMS API用トークン
- `GOOGLE_CHAT_WEBHOOK_URL` ... Google Chat Webhook URL

### リプライサー設定
- `EC_API_URL` ... 自社ECサイトの価格更新APIベースURL
- `EC_API_TOKEN` ... API認証トークン
- `REPRICE_MARGIN_PERCENT` ... 競合最安値から下げる割合(デフォルト: 1)
- `ERP_API_URL` ... ERP/在庫管理システムAPIベースURL
- `ERP_API_TOKEN` ... ERP API認証トークン
- `COMPLIANCE_DIFF_THRESHOLD` ... 市場平均からの乖離率がこの値を超えると警告 (デフォルト: 0.3)
- `COMPLIANCE_MEDIAN_THRESHOLD` ... 中央値からの乖離率がこの値を超えると警告 (デフォルト: 0.3)
- `COMPLIANCE_STD_THRESHOLD` ... 平均から何σ離れたら警告するか (デフォルト: 2)
- `COMPLIANCE_MODE_THRESHOLD` ... 最頻値からの乖離率がこの値を超えると警告 (デフォルト: 0.3)
- `COMPLIANCE_COLLUSION_DAYS` ... 何日連続で同一価格が続くと共謀の疑いと判断するか (デフォルト: 3)
- `COMPLIANCE_WINDOW` ... 価格判定に用いる直近データ数 (デフォルト: 5)
- `LOG_RETENTION_DAYS` ... 操作ログを保持する日数 (デフォルト: 30)
- `HISTORY_RETENTION_DAYS` ... 価格履歴を保持する日数 (デフォルト: 90)
- `SILENT_START` ... サイレントタイム開始時刻(0-23)
- `SILENT_END` ... サイレントタイム終了時刻(0-23)
- `ALERT_SUPPRESS_COUNT` ... 同じ商品でこの回数連続でアラートが出た場合に通知を抑制する (デフォルト: 3)
- `ALERT_SUPPRESS_HOURS` ... 抑制中に何時間経過すればカウントをリセットするか (デフォルト: 12)

### React依存パッケージ
```

cd frontend && npm install
```
Next.js では `.env.local` にフロントエンド用の環境変数を記述できます。



## サンプルスクリプト

### 1. 価格取得
```
python scraping/scrape_prices.py
```
CSV(`prices.csv`)に商品名・価格・取得日時が追記されます。
URLリスト内の複数商品は`multiprocessing.Pool`で並列に取得されます。Poolのサイズは商品数や`SCRAPER_RATE_LIMIT`に応じて自動調整されます。
5xxや429エラー時は自動的にリトライし、失敗が続くと`PROXY_LIST`で指定したプロキシに切り替わります。
レスポンス遅延が`LATENCY_THRESHOLD`を超えた場合もSlackに通知されます。
スクレイピングエラーは`ERROR_LOG_KEY`で指定した場所に記録され、Slackにも通知されます。
セレクタが見つからない場合はページHTMLの差分を計算し、過去のベースラインと比較して大きく変化していればSlackに「セレクタの修正が必要」と通知します。さらに旧要素を手掛かりに新しいHTMLから推定したCSSセレクタ候補を`SUGGESTION_KEY`で指定した場所(`selector_suggestions.json`がデフォルト)へ保存し、管理画面の「セレクタ候補」一覧で確認できます。ベースラインHTMLは`scraping/baselines/`に保存されます。
ページ内に`OOS_KEYWORDS`で指定した文言（例: 在庫切れ、販売終了）が見つかった場合もSlackへ在庫切れアラートを送ります。

### 2. CSVからJSON生成
```
python scraping/csv_to_history.py
```
`prices.json`が生成されます。Reactアプリではこのファイルを読み込みます。

### 3. 通知スクリプト
`.env` に Slack や LINE、Webhook などのエンドポイントを記述した上で実行します。
環境変数を直接指定することもできます。
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/... \
LINE_NOTIFY_TOKEN=xxxxxxxxx \
WEBHOOK_URL=https://example.com/webhook \
TEAMS_WEBHOOK_URL=https://outlook.office.com/... \
SMS_API_URL=https://sms.example.com/send \
SMS_API_TOKEN=sms_token \
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/... \
python scraping/notify.py
```
`frontend/products.json` の各商品では、`nameSelector` と `priceSelector` でスクレイピングに使用する CSS セレクタを指定します。さらに `dropPercent` や `belowPrice`、`minPrice`、`notify` プロパティでアラート条件と通知先を設定できます。`notify` には `slack`、`line`、`webhook`、`teams`、`sms`、`chat`、`both` などを設定でき、商品ごとに通知先を切り替えられます。複数指定したい場合はカンマ区切りで `slack,line` のように記述します。
サイレントタイムを設定したい場合は `SILENT_START` と `SILENT_END` に時間(0-23)を指定します。その時間帯は通知が送信されません。
さらに、同じ商品でアラートが続く場合は `ALERT_SUPPRESS_COUNT` 回を超えると通知を抑制し、`ALERT_SUPPRESS_HOURS` 時間経過でカウントがリセットされます。

### 4. Next.jsアプリ
```
cd frontend
npm install
npm run dev
```
ブラウザで`http://localhost:3000`を開きます。`public/prices.json`に価格履歴を配置することでテーブルとグラフが表示されます。

### 5. 商品管理画面
ブラウザで`http://localhost:3000/manage`を開きます。ページ上で監視対象商品の追加・編集・削除が行えます。URLとCSSセレクタをフォーム入力するだけで新しいサイトを登録でき、**Auto Detect**ボタンを押すとページ内容から商品名・価格のセレクタを自動推定します。`dropPercent`や`belowPrice`、`minPrice`、`notify`を指定して商品ごとのアラート条件と通知先を設定できます。編集結果は`frontend/products.json`に保存されますが、S3またはFirestore設定時は同名キーでクラウドにも保存されます。
`Test` ボタンで入力したURLとセレクタを使ったスクレイピングを即時実行し、取得した商品名と価格を確認できます。各商品行にも同様のTestボタンがあります。
セレクタエラー時は推定候補が `SUGGESTION_KEY` で指定した場所に保存され、管理画面の「セレクタ候補」で確認できます。さらに対象商品の行にはセレクタ修正フォームと**再取得**ボタンが表示され、入力を保存するとその場でバッチが再実行されます。
さらに **Pause/Resume** ボタンでその商品の監視を一時停止/再開、**Run** ボタンで即時取得が行えます。Pause を押すと `paused` フラグが付与され、スケジューラが実行中でもその商品をスキップします。Run を押すと `manual_scrape.py` を呼び出して手動取得し、結果は履歴に追加されます。
各商品には`owner`フィールドで担当者メールアドレスを設定します。担当者は自分が`owner`の商品のみ編集・削除でき、管理者はすべての操作が可能です。
`users.json`にはユーザーごとのデフォルト通知チャネルを`notify`フィールドで指定できます。商品登録時に担当者を選択すると、そのユーザーの`notify`値が初期値として反映され、管理画面からいつでも変更できます。
管理画面では商品行のプルダウンから担当者や通知チャネルを切り替えることもできます。
管理画面とダッシュボードにはモバイル向けのレスポンシブCSSを適用しているため、スマホやタブレットでも快適に操作できます。右上のドロップダウンから日本語とEnglishを切り替えられる簡易i18n機能も備えています。
ヘッダーにはダーク/ライトテーマ切替と検索バー、ナビゲーションリンクを配置し、サイドバーから各ページへ簡単に移動できます。
各商品は`ecId`フィールドで自社ECサイトの商品IDを指定できます。リプライサーがこのIDを使って価格更新を行います。 10%以上の価格変更は自動更新されず `pending_prices.json` に記録され、管理者が承認したときだけ反映されます。

複数商品を選択して通知条件やセレクタをまとめて更新できる **一括編集** フォームと、テンプレートから設定を流し込む **テンプレート適用** ボタンも利用できます。テンプレートは `frontend/templates.json` に定義しておき、管理画面で選択して適用します。

### 6. 競合比較ダッシュボード
`http://localhost:3000/compare` を開くと、各社の商品価格を横並び比較できます。
最新価格から算出したシェアを円グラフで、最安値との差額を棒グラフで表示します。

### 7. 操作ログ
`operation.log` にログインや商品追加・編集・削除の履歴が JSON 形式で追記されます。
各行は次のフィールドを持ちます: `time`(UTC ISO8601), `user`, `action`。
環境変数 `LOG_FILE` を指定すると保存場所を変更できます。

### 8. ロールバック
管理画面には編集や削除を取り消す **Rollback** ボタンがあります。各操作前に
`frontend/products_prev.json` が自動生成され、管理者はワンクリックで直前の状態を
復元できます。

### 9. 取得スケジューラ
`scraping/scheduler.py` は `PRODUCTS_KEY` で指定した商品設定(S3またはFirestore)の `interval` 値に従い、
各商品を定期的に取得します。`interval` は時間単位で、1 なら毎時、2 なら 2 時間ごと、24 なら 1 日 1 回の取得となります。取得処理は `multiprocessing.Pool` を使って並列実行され、プールのサイズは自動調整されます。
```bash
python scraping/scheduler.py
```
実行中は取得のたびに `notify.py` を使ったアラート判定も行われます。
個別に取得したい場合は `scraping/manual_scrape.py --index 0` のように実行します。管理画面の **Run** ボタンからも同様に呼び出されます。

### 10. 定時実行例 (cron)
```
0 9 * * * /usr/bin/python3 /path/to/scraping/scrape_prices.py && \
  /usr/bin/python3 /path/to/scraping/csv_to_history.py && \
  SLACK_WEBHOOK_URL=... LINE_NOTIFY_TOKEN=... /usr/bin/python3 /path/to/scraping/notify.py
```
毎日9時に実行し、最新データ取得→JSON生成→通知を行う例です。

### 11. 週次レポート生成
`scraping/weekly_report.py` は過去1週間の価格履歴からレポートを生成し、指定アドレスへメール送信します。`WEEKLY_REPORT_FORMAT` で `excel` または `pdf` を選択でき、`WEEKLY_REPORT_SUBJECT` と `WEEKLY_REPORT_BODY` で件名・本文を調整できます。複数の宛先に送りたい場合は `REPORT_EMAIL_TO` をカンマ区切りで設定してください。
```
REPORT_EMAIL_TO=user@example.com \
SMTP_SERVER=smtp.example.com \
SMTP_PORT=465 SMTP_USER=user SMTP_PASSWORD=pass \
WEEKLY_REPORT_FORMAT=pdf \
python scraping/weekly_report.py
```
cron に登録することで自動送信も可能です。

### 12. APIサーバー
`scraping/api_server.py` は `PRICES_JSON_KEY` で指定した JSON を読み込み、Flask で `/api/prices` エンドポイントを提供します。`/api/prices` は JWT を含む `Authorization` ヘッダーが必須です。
```
python scraping/api_server.py
```
起動後 `http://localhost:5000/api/prices`  に `Authorization: Bearer <token>` を付けてアクセスすると価格履歴を取得できます。

### 13. ログインAPIとOAuth
`scraping/api_server.py` には `/api/login`、 `/api/register` に加えて Google OAuth を受け付ける `/api/oauth/google` エンドポイントがあります。`GOOGLE_CLIENT_ID` を設定し、クライアント側では `NEXT_PUBLIC_GOOGLE_CLIENT_ID` を指定します。
メールアドレスとパスワードでログインするか、Google ログインボタンで取得した `credential` を送信すると JWT が返ります。ユーザーは`role`に`admin`を指定すると管理者権限となり、その他は担当者として扱われます。
```bash
python scraping/api_server.py
```
Next.js の `/login` ページでは通常のログインのほか、Google OAuth も利用できます。取得したトークンは `localStorage` に保存され、管理画面や `/api/prices` へアクセスする際に使用されます。


### 14. タイムゾーン設定
`users.json` の各ユーザーには `tz` フィールドでタイムゾーン(IANA形式)を指定できます。
`/api/register` で `{"tz": "Asia/Tokyo"}` を渡すと保存され、JWT にも含まれます。
`/api/prices` と `scraping/weekly_report.py` はこの値を使って時刻を表示します。

### 15. セキュリティとレート制限
`REQUESTS_PER_MINUTE` を設定すると、ログインや API アクセスは 1 分あたりのリクエスト数が制限されます。デフォルトは 60 回です。入力値はサーバー側で HTML タグを除去して保存しており、React では自動エスケープが行われるため基本的な XSS を防げます。

### 16. バックアップとリストア
`scraping/backup.py` を実行すると、商品設定や価格履歴を日付付きで `BACKUP_PREFIX` 配下にコピーします。
各バッチスクリプトは起動時にこのバックアップ処理を自動で呼び出すため、実行前の状態が常に保存されます。
```bash
python scraping/backup.py
```
過去のバックアップから復元する場合は `--restore` オプションに日付を指定します。
```bash
python scraping/backup.py --restore 20240601
```
cron などで毎日実行すれば自動バックアップが行えます。

### 17. トレンド予測と異常検知
`scraping/trend_alert.py` は過去の価格履歴を学習して次回の価格を予測します。最
新価格が予測値から大きく外れたり前回から急変動している場合、Slack/LINE にアラー
トを送ります。判定閾値は `TREND_ALERT_THRESHOLD` (デフォルト 0.1 = 10%) で調整可
能です。
```
TREND_ALERT_THRESHOLD=0.15 python scraping/trend_alert.py
```


### 18. 自動リプライサー
`scraping/repricer.py` を実行すると、最新の競合価格から最適な販売価格を計算し、自社ECサイトのAPIに反映します。`EC_API_URL` と `EC_API_TOKEN` を設定してください。価格は `REPRICE_MARGIN_PERCENT` (デフォルト1%) 分だけ競合最安値より下げた値が送信されます。ただし各商品に設定した `minPrice` より低い価格は送信されず、Slack に「最低価格を下回るため変更しませんでした」と通知されます。さらに、新価格が現行価格から10%以上変化する場合は自動更新せず `pending_prices.json` に記録され、Slack へ「管理者承認待ち」と通知されます。管理者が承認するとEC APIへ更新が送信され、`ec_prices.json` に保存されます。
```bash
EC_API_URL=https://api.example.com EC_API_TOKEN=token python scraping/repricer.py
```

### 19. 価格シミュレーション
管理画面 `/manage` には、競合価格を入力して自社価格を試算するセクションがあります。
カンマ区切りで複数の競合価格を入力し、値下げ率(%)を指定して **Simulate** ボタンを押すと、
最安競合価格からその割合だけ下げた想定価格が表示されます。

### 20. ERP連携
`scraping/erp_sync.py` は ERP や在庫管理システムと商品情報・価格を同期します。
設定した `ERP_API_URL` と `ERP_API_TOKEN` を使って `/products` と `/prices`
エンドポイントへHTTPリクエストを送信します。スケジューラは起動時に ERP から商品
一覧を取得し、価格取得ごとに最新価格を ERP に通知します。
```bash
ERP_API_URL=https://erp.example.com/api ERP_API_TOKEN=token python scraping/erp_sync.py
```

### 21. コンプライアンスチェック
`scraping/compliance.py` を実行すると、最新価格が市場平均から大きく乖離していないか、
競合他社と同一価格が続いていないかを判定し、景品表示法や独禁法違反の疑いがある場合
にSlackへ警告を送ります。
判定基準は `COMPLIANCE_DIFF_THRESHOLD` や `COMPLIANCE_MEDIAN_THRESHOLD`
`COMPLIANCE_STD_THRESHOLD` `COMPLIANCE_MODE_THRESHOLD` (それぞれデフォルト0.3、標準偏差のみ2)
と `COMPLIANCE_COLLUSION_DAYS`、`COMPLIANCE_WINDOW` (デフォルト3日・5件) で調整できます。
```bash
python scraping/compliance.py
```

### 22. データ保持期間と自動削除
`scraping/cleanup.py` は操作ログや価格履歴の古いエントリを自動で削除します。
保持期間は環境変数 `LOG_RETENTION_DAYS` と `HISTORY_RETENTION_DAYS` で指定します。
```bash
LOG_RETENTION_DAYS=30 HISTORY_RETENTION_DAYS=90 python scraping/cleanup.py
```

### 23. AIチャットボット
管理画面右上の **Help** リンクからヘルプページ `/help` を開くと、
よくある質問や操作方法を案内するチャットボットと対話できます。
環境変数 `OPENAI_API_KEY` に OpenAI のAPIキーを設定すると、
質問内容を送信してAIが回答します。キーが無い場合は簡易回答のみを返します。

### 24. 月次・年次・カテゴリ別レポート
`scraping/summary_report.py` を使うと、過去30日または1年の価格変動をまとめたレポート
を生成できます。`--period month` で月次、`--period year` で年次、`--period category`
と `--category <name>` を指定するとカテゴリ単位で作成します。生成後は `REPORT_EMAIL_TO` で指定したアドレスにメール送信されます。複数宛先をカンマ区切りで設定することも可能です。`SUMMARY_REPORT_FORMAT` を `pdf` にするとPDFで出力され、件名と本文は `SUMMARY_REPORT_SUBJECT` `SUMMARY_REPORT_BODY` で変更できます。
```
REPORT_EMAIL_TO=user@example.com \
SUMMARY_REPORT_FORMAT=pdf \
python scraping/summary_report.py --period year
```

### 25. レポートのコメントと承認
`/api/report` で生成したレポートは `frontend/reports.json` に履歴が残り、管理画面の
**Reports** セクションから確認できます。各レポートには担当者がコメントを追加でき、
管理者は **Approve** ボタンで承認履歴を残せます。

### 26. ダッシュボードカスタマイズ
各ユーザーは `/api/prefs` を通じてダッシュボードの表示項目を保存できます。トップページ右上の
チェックボックスで「最新価格」「最安値」「グラフ」の表示有無を切り替えると、自動的に設定が
保存されます。ユーザーごとに好みのウィジェット構成でダッシュボードを利用できます。

### 27. レビュー・評価・ランキング取得
`scraping/scrape_prices.py` で `reviewSelector` `ratingSelector` `rankSelector` `trendSelector` を設定すると、レビュー数や星評価、ランキング、新着トレンドを取得して CSV に保存します。`scraping/csv_to_history.py` 実行後は `/prices.json` に反映され、ダッシュボードの表で確認できます。管理画面 `/manage` の入力欄から各セレクタを登録してください。

### 28. 共通レイアウトとデザイン
Tailwind CSS を CDN から読み込み、`Layout` コンポーネントでヘッダー・サイドバー・フッターを共通化しています。カラーパレットや角丸、シャドウの設定を拡張しており、全ページで統一された UI を利用できます。

### 29. レスポンシブ対応
メニューはモバイルサイズではハンバーガーアイコンで開閉でき、サイドバーはスライド表示されます。
テーブルは横スクロール可能なレイアウトになり、ボタンのタップ領域も広めに調整しています。

### 30. 操作フィードバック
データ取得や登録処理中は `Spinner` で画面をブロックし、ページ遷移時には上部のプログレスバーが進行状況を示します。
操作結果は `react-hot-toast` のトースト通知で表示され、成功・失敗・警告ごとに色とアイコンが切り替わります。