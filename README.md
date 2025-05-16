
# 📱 MyHabitBot — LINE × Supabase 習慣記録Bot

習慣の記録・目標設定・達成率のトラッキングをLINEで行えるBotです。  
Supabaseをバックエンドに使用し、達成ログをデータベースに記録・分析します。

---

## 🚀 機能一覧

| 機能 | 説明 |
|------|------|
| ✅ `/done 25/30` | 実績25回 / 目標30回を記録 |
| 📊 自動達成率計算 | 達成率を返信（例：83%） |
| 🗓️ 日付別ログ記録 | 毎日記録がSupabaseに保存されます |
| 🔁 継続記録（開発予定） | 連続記録や最大記録を可視化 |
| 📈 レポート機能（開発予定） | 週次・月次の平均達成率、グラフなど |

---

## 🧱 使用技術スタック

- 🟩 **Node.js** + Express
- 🟦 **Supabase**（DB & 認証）
- 🟢 **LINE Messaging API**
- ☁️ **Railway**（デプロイ）

---

## 🛠 セットアップ手順

### 1. このリポジトリをクローン

```bash
git clone https://github.com/your-username/myhabitbot.git
cd myhabitbot
````

### 2. パッケージをインストール

```bash
npm install
```

### 3. `.env` を作成

```bash
touch .env
```

```env
# LINE
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxx

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_anon_key
```

### 4. サーバーを起動（ローカルテスト用）

```bash
node index.js
```

---

## 🔗 LINE Developers 側の設定

* Messaging API チャネルを作成
* アクセストークン・シークレットを取得し `.env` に保存
* Webhook URL に Railwayなどで公開したURLを設定
* Webhook送信「ON」・応答メッセージ「ON」
* BotをLINEで友達追加して `/done 25/30` を送信してみよう！

---

## 📂 データベース構成（Supabase）

### `habits` テーブル

| カラム名         | 型         | 説明              |
| ------------ | --------- | --------------- |
| `id`         | bigint    | 自動採番            |
| `user_id`    | text      | LINEユーザーID      |
| `title`      | text      | 習慣名             |
| `goal_count` | int       | 目標回数（その習慣の初期目標） |
| `created_at` | timestamp | 作成日（自動）         |

### `logs` テーブル

| カラム名           | 型      | 説明               |
| -------------- | ------ | ---------------- |
| `id`           | bigint | 自動採番             |
| `habit_id`     | bigint | `habits.id` 外部キー |
| `user_id`      | text   | ユーザーID           |
| `logged_at`    | date   | 記録日              |
| `actual_count` | int    | 実績               |
| `note`         | text   | 任意のメモ            |

---

## 📌 今後の展望（TODO）

* [ ] `/summary`：週・月の平均達成率を表示
* [ ] `/history`：達成履歴の可視化
* [ ] `streak` / `max_streak`の算出
* [ ] 進化レポートの自動送信
* [ ] グラフ表示用のフロントエンド（React + Supabase）

---
