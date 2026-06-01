# AUTO OFFICE

社内バーチャルオフィスツール。Google Calendar と連携してアバターを自動制御し、
案件アサイン状況・在籍形態を 2.5D マップで可視化します。

---

## 動作環境

| ツール | バージョン |
|---|---|
| Node.js | 22.x |
| Docker / Docker Compose | 最新安定版 |
| npm | 10.x |

---

## セットアップ

### 1. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集（最小構成ではデフォルトのまま動作します）:

```env
DATABASE_URL="postgresql://autooffice:dev@localhost:5432/autooffice"
REDIS_URL="redis://localhost:6379"
PORT=3001
```

> Google Calendar 連携は任意です。未設定時はモックデータを使用します。

### 2. Docker で DB / Redis を起動

```bash
docker compose up -d
```

### 3. 依存パッケージをインストール

```bash
npm run install:all
```

### 4. DB マイグレーション + シードデータ投入

```bash
cd backend
npx prisma migrate deploy
npx ts-node prisma/seed.ts
cd ..
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:3001
- ヘルスチェック: http://localhost:3001/health

---

## 初回ログイン

1. ブラウザで http://localhost:5173 を開く
2. 右上の **設定** ボタンをクリック
3. 表示されたユーザー一覧から自分のアカウントを選択（例: 田中 太郎）

---

## デモシナリオ（予選用）

### 前提

- `docker compose up -d` で DB / Redis 起動済み
- `npm run dev` でフロント / バック 起動済み
- 設定画面で **田中 太郎（admin）** としてログイン済み

### 手順

| # | 操作 | 確認内容 |
|---|---|---|
| 1 | 管理者ボタン → **デモ** タブ → **朝会シナリオ開始** | 田中・鈴木・山田・高橋が会議室（竹）に移動 / 加藤・吉田が在宅エリアへ |
| 2 | マップを眺める | アサインドットで受託（青）・自社（橙）・空き（緑）が一目でわかる |
| 3 | 任意のアバターをクリック | 詳細カード（氏名・役職・在籍形態・今日のカレンダー）が開く |
| 4 | 詳細カード内 **プロフィールを見る** | プロフィールパネルがスライドイン |
| 5 | 左サイドバー検索欄に「ECサイト」と入力 | ECサイト刷新メンバーのみ浮き上がる（他は 15% 透明） |
| 6 | 任意のアバターをクリック → **チャットを開く** | 1対1チャットパネルが開く |
| 7 | 管理者 → デモ → **全員リセット** | カレンダー連動状態に戻る |

---

## ディレクトリ構成

```
auto-office/
├── backend/
│   ├── src/
│   │   ├── routes/        REST API ルーター
│   │   ├── systems/       stateEngine / calendarClient / wsHub / cache
│   │   └── server.ts
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/
│   ├── src/
│   │   ├── scenes/        Phaser シーン（OfficeScene / LoadingScene）
│   │   ├── sprites/       AvatarSprite（スプライトベース）
│   │   ├── ui/            React コンポーネント
│   │   └── store/         Zustand ストア
│   └── public/
│       └── assets/sprites/  スプライトシート（命名規約は CLAUDE.md 参照）
├── scripts/
│   └── generate-placeholders.mjs  プレースホルダー PNG 生成
├── docker-compose.yml
├── .env.example
└── CLAUDE.md              技術仕様・開発ルール
```

---

## 主要コマンド

```bash
# 開発サーバー（フロント + バック同時起動）
npm run dev

# フロントエンドビルド
cd frontend && npm run build

# DB GUI
cd backend && npx prisma studio

# マイグレーション
cd backend && npx prisma migrate dev --name <name>

# プレースホルダースプライト再生成
node scripts/generate-placeholders.mjs
```

---

## Google Calendar 連携（任意）

1. GCP コンソールでサービスアカウントを作成し JSON キーをダウンロード
2. 対象カレンダーにサービスアカウントを読み取り権限で共有
3. `.env` に設定:

```env
# ファイルパスで指定
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json

# または JSON 文字列で直接指定
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

未設定時はモックデータにフォールバックします（10:00〜11:00 に朝会が発生）。

---

## 在籍形態と判定ロジック

| 状態 | 判定 | 色 |
|---|---|---|
| 出社 | デフォルト | 緑 |
| 会議中 | 進行中のカレンダー予定 | 赤 |
| 在宅 | 「在宅」「WFH」キーワード | 青 |
| 客先常駐 | 「常駐」「SES」キーワード | 橙 |
| 休暇 | 「有給」「休暇」キーワード | 紫 |
| 出張 | 「出張」「訪問」キーワード | シアン |
| 早退 | 手動設定（翌0時リセット） | グレー |

優先順位: `vacation → early_leave → business_trip → ses → remote → in_meeting → office`

---

## Phase ロードマップ

| Phase | 期限 | 内容 |
|---|---|---|
| **Phase 1** | 6/19（予選） | 基本機能（本リポジトリ） |
| Phase 2 | 8/21（決勝） | Slack times 連携・誕生日通知・LATEPO・2.5D ビジュアル・他拠点 |
| Phase 3 | コンペ後 | 外販・セキュリティ強化 |
