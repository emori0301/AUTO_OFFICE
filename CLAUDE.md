# AUTO OFFICE — CLAUDE.md

## プロジェクト概要
社内バーチャルオフィスツール。Google Calendarと連携してアバターを自動制御し、
案件アサイン状況・在籍形態を2.5D等角投影マップで可視化する。

---

## 技術スタック（確定・変更禁止）

| レイヤー | 技術 |
|---|---|
| ゲームキャンバス | Phaser.js 3（pixelArt: true 必須） |
| UIシェル | React 18 + TypeScript |
| スタイリング | Tailwind CSS v3 + shadcn/ui（必要なものだけ） |
| 状態管理 | Zustand |
| ビルド | Vite |
| バックエンド | Node.js 22 + Express + TypeScript |
| ORM | Prisma |
| DB | PostgreSQL 16 |
| キャッシュ | Redis 7（未起動時はインメモリフォールバック） |
| リアルタイム | WebSocket (ws) |
| コンテナ | Docker / docker compose |
| AI | Azure OpenAI GPT-4o mini（Phase 2以降のみ） |

**不採用（提案しないこと）**: Next.js, tRPC, MUI, Chakra

---

## ディレクトリ構成

```
auto-office/
├── backend/
│   ├── src/
│   │   ├── routes/        # Express ルーター
│   │   ├── systems/       # stateEngine, calendarClient, wsHub, cache
│   │   ├── middleware/
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── scenes/        # Phaser シーン
│   │   ├── sprites/       # AvatarSprite 等
│   │   ├── ui/            # React コンポーネント
│   │   ├── store/         # Zustand ストア
│   │   └── main.tsx
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## Prisma スキーマ（確定）

```prisma
model Branch {
  id       String  @id @default(uuid())
  name     String  // 札幌・東京・名古屋・福岡・苫小牧
  users    User[]
  floors   Floor[]
}

model User {
  id           String    @id @default(uuid())
  displayName  String
  email        String    @unique
  googleId     String?   @unique
  slackUserId  String?   @unique
  role         String    @default("member") // member | admin
  jobTitle     String?
  branchId     String
  branch       Branch    @relation(fields: [branchId], references: [id])
  workStyle    String    @default("office")
  // office | remote | ses | vacation | business_trip | early_leave
  birthDate    DateTime?
  joinDate     DateTime?
  deskX        Int?
  deskY        Int?
  floorId      String?
  points       Int       @default(0)
  avatarConfig Json?     // AvatarConfig型（下記参照）
  createdAt    DateTime  @default(now())
}

model ProfileQuestion {
  id       String        @id @default(uuid())
  question String
  order    Int
  isActive Boolean       @default(true)
  answers  UserProfile[]
}

model UserProfile {
  id         String          @id @default(uuid())
  userId     String
  questionId String
  answer     String
  user       User            @relation(fields: [userId], references: [id])
  question   ProfileQuestion @relation(fields: [questionId], references: [id])
}

model Group {
  id         String      @id @default(uuid())
  name       String
  category   String      // project | team | club
  assignType String?     // client | inhouse（projectのみ）
  isActive   Boolean     @default(true)
  members    UserGroup[]
}

model UserGroup {
  userId     String
  groupId    String
  role       String?     // PM | engineer 等（projectのみ）
  assignRate Int?        // 0-100（projectのみ）
  user       User        @relation(fields: [userId], references: [id])
  group      Group       @relation(fields: [groupId], references: [id])
  @@id([userId, groupId])
}

model ChatRoom {
  id        String        @id @default(uuid())
  name      String?
  type      String        // direct | group
  members   ChatMember[]
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
}

model ChatMessage {
  id        String    @id @default(uuid())
  roomId    String
  senderId  String
  body      String
  createdAt DateTime  @default(now())
  expiresAt DateTime  // createdAt + 24h、バッチで削除
  room      ChatRoom  @relation(fields: [roomId], references: [id])
}

model PointGrant {
  id         String   @id @default(uuid())
  grantedBy  String
  targetType String   // user | branch | group
  targetId   String
  amount     Int
  reason     String?
  createdAt  DateTime @default(now())
}
```

---

## AvatarConfig 型（確定）

```typescript
export type AvatarConfig = {
  skinTone:     'pale' | 'medium';
  eyeType:      number;   // 1〜10
  mouthType:    number;   // 1〜10
  eyebrowType:  number;   // 1〜10
  hairStyle:    number;   // 1〜20
  hairColor:    string;   // HEX
  topId:        number;   // 1〜20
  bottomId:     number;   // 1〜20
  shoeId:       number;   // 1〜10
  accessory1:   number | null;
  accessory2:   number | null;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: 'medium', eyeType: 1, mouthType: 1, eyebrowType: 1,
  hairStyle: 1, hairColor: '#3D2817',
  topId: 1, bottomId: 1, shoeId: 1,
  accessory1: null, accessory2: null,
};
```

---

## スプライトアセット命名規約

```
assets/sprites/
  body/body_pale.png, body_medium.png          # 320x128px, 10コマ(5x2)
  face/eyes.png, mouth.png, eyebrows.png       # 160x48px, 16x16px/コマ
  hair/hair_01_short.png ... hair_20_mushroom.png  # 128x64px/シート(前後2コマ)
  clothing/top_01_*.png ... bottom_20_*.png    # 320x128px/シート, 10コマ(5x2)
  shoes/shoes_all.png                          # 640x128px, 10種x2方向
  accessories/accessories_all.png             # 640x128px, 10種x2方向
  environment/floor_tiles.png, wall_tiles.png, desks.png,
              chairs.png, props.png, equipment.png
```

---

## レイヤー合成順序（depth）

```
0: 素体(body)
1: ボトムス
2: トップス
3: 靴
4: 眉（前向きのみ）
5: 目（前向きのみ）
6: 口（前向きのみ）
7: 髪型
8: アクセサリー1
9: アクセサリー2
```

---

## 在籍形態 WorkStyle（確定）

```typescript
type WorkStyle =
  | 'office'         // 出社（デフォルト）
  | 'in_meeting'     // 会議中（カレンダー自動判定）
  | 'remote'         // 在宅（「在宅」「WFH」キーワード）
  | 'ses'            // 客先常駐（「常駐」「SES」または手動）
  | 'vacation'       // 休暇（「有給」「休暇」キーワード）
  | 'business_trip'  // 出張（「出張」「訪問」キーワード）
  | 'early_leave';   // 早退（手動設定、翌0時リセット）
```

**判定優先順位**: vacation → early_leave → business_trip → ses → remote → in_meeting → office

**気配察知通知はなし**。マップを見て自分で判断する設計。

---

## アサインドット（5色）

```typescript
type DotColor = 'free' | 'client' | 'inhouse' | 'multi' | 'special';

// projectカテゴリのGroupのみ参照。team・clubはドット色に影響しない
function getAssignDot(projects: UserGroup[]): DotColor {
  if (projects.length === 0) return 'free';       // 緑
  if (projects.length > 1)  return 'multi';       // 紫
  return projects[0].group.assignType === 'client'
    ? 'client'    // 青
    : 'inhouse';  // 橙
  // special（金）は role='special' で別途管理
}
```

---

## グループ分類（3種）

| category | 例 | ドット色への影響 |
|---|---|---|
| `project` | ECサイト刷新、モバイルアプリ | あり（上記ロジック） |
| `team` | 新規案件獲得チーム、AI強化委員会 | なし |
| `club` | ゴルフ部、読書部 | なし |

---

## Redisキャッシュキー

```
user:{id}:state          TTL 60s   現在の在籍形態・位置
calendar:{userId}:today  TTL 5min  本日の予定
slack:{userId}:times     TTL 30min timesの直近1件（24h以内のみ）
layout:{floorId}         無期限    フロアレイアウト
```

Redis未起動時はインメモリでフォールバック（開発用）。

---

## チャット仕様（重要）

- メッセージは **24時間で自動削除**（expiresAt = createdAt + 24h）
- 毎時0分のcronバッチで期限切れを削除
- WebSocketのCHAT_SEND / CHAT_MESSAGEで送受信
- テキストのみ（ファイル・画像なし）

---

## WebSocketメッセージ型

```typescript
// サーバー→クライアント
{ type: 'INIT',         payload: UserState[] }
{ type: 'STATE_CHANGE', payload: UserState   }
{ type: 'CHAT_MESSAGE', roomId: string, message: ChatMsg }

// クライアント→サーバー
{ type: 'CHAT_SEND', roomId: string, body: string }
{ type: 'PING' }
```

---

## 拠点（Phase 1 は札幌のみ実装）

- 札幌（本社）: フロアマップあり（竹・梅・松・職員室・休憩室・執務室）
- 東京・名古屋・福岡・苫小牧: タグのみ、フロアはPhase 2

---

## docker-compose.yml（確定）

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: autooffice
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: autooffice
    ports: ['5432:5432']
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
volumes:
  pgdata:
```

---

## Phase 1 実装スコープ（6/19予選まで）

必須（この8つが完成したらデモ成立）:
1. Docker + Prismaマイグレーション + 環境構築
2. Google Calendar API + 在籍形態6種の判定ロジック
3. WebSocketサーバー基盤
4. Phaserマップ + アバター自動移動（プレースホルダー素材可）
5. アサインドット + 詳細カード + 検索フィルタ
6. プロフィール + 設定画面
7. グループ管理（案件・チーム・部活）
8. チャット機能（24h削除）+ ポイント管理 + 管理者機能

**LLM不使用・追加費用ゼロ**

Phase 2（8/21決勝）以降: times連携・誕生日通知・LATEPO連携・2.5Dビジュアル差し替え・他拠点フロア

---

## 開発ルール

- **1 Issue = 1会話**で完結させる（トークン節約）
- Issueに「完了条件」を必ず書く
- 完了条件が満たせたら次のIssueへ
- 素材（スプライト）が届いたらassets/sprites/に配置してキーだけ差し替え
- AI（LLM）はPhase 2以降まで一切使わない
