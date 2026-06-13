# 🎤 SpeakUp - 英語学習アプリ MVP

スピーキング・リスニング・語彙の3技能を統合的に強化するAI英語学習アプリ。
Next.js 14 (App Router) + Supabase + Tailwind CSS で構築。

![SpeakUp UI](https://www.genspark.ai/api/files/s/bNVYgtla)

## ✨ 実装済み機能

### 🏠 ホーム画面 (`/`)
- ストリーク表示（連続学習日数）
- デイリーゴールのプログレスバー
- 今週の学習統計
- 3技能への導線カード

### 🎤 スピーキング画面 (`/speaking`)
- 4つのシナリオ選択（カフェ・空港・面接・ミーティング）
- AIとのチャット形式会話 UI
- 音声入力ボタン（Whisper連携準備済）
- 発音スコア表示（0-100点）

### 🎧 リスニング画面 (`/listening`)
- レベル別教材一覧（A2/B1/B2）
- 波形ビジュアライザー付き音声プレイヤー
- 倍速再生（0.5x〜2.0x）
- 3段階字幕モード（英+和 / 英のみ / なし）
- ディクテーションモード＆自動採点

### 📚 語彙学習画面 (`/vocabulary`)
- フラッシュカード式UI
- Web Speech API による発音再生
- **SM-2アルゴリズム**による間隔反復学習（SRS）
- Again/Hard/Good/Easy の4段階評価
- 完了画面で獲得XP表示

## 🛠 技術スタック

| 領域 | 採用技術 |
|------|---------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth/DB | Supabase (PostgreSQL + RLS) |
| AI 会話 | OpenAI GPT-4o-mini |
| 音声認識 | OpenAI Whisper |
| 音声合成 | Web Speech API (TTS) |
| Icons | lucide-react |

## 🚀 セットアップ

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集して各種APIキーを設定

# 3. Supabaseのセットアップ
# - https://supabase.com で新規プロジェクト作成
# - SQL Editor で supabase/schema.sql を実行
# - Settings → API から URL と anon key を取得し .env.local に設定

# 4. 開発サーバー起動
npm run dev
# → http://localhost:3000
```

### Supabase未設定でも動作します
全画面に**サンプルデータ**を組み込んでいるので、Supabase接続前でもUIの動作確認・デモが可能です。

### OpenAI未設定でも動作します
`OPENAI_API_KEY` 未設定時は `/api/chat` `/api/transcribe` がモック応答を返します。

## 📁 ディレクトリ構成

```
speakup-mvp/
├── src/
│   ├── app/
│   │   ├── page.tsx              # ホーム
│   │   ├── speaking/page.tsx     # スピーキング
│   │   ├── listening/page.tsx    # リスニング
│   │   ├── vocabulary/page.tsx   # 語彙学習
│   │   ├── api/
│   │   │   ├── chat/route.ts     # OpenAI 会話API
│   │   │   └── transcribe/route.ts # Whisper音声認識
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── BottomNav.tsx         # 下部タブナビ
│   └── lib/
│       ├── srs.ts                # SM-2アルゴリズム
│       ├── sample-data.ts        # サンプルデータ
│       └── supabase/
│           ├── client.ts         # ブラウザ用クライアント
│           └── server.ts         # サーバー用クライアント
├── supabase/
│   └── schema.sql                # DB スキーマ + RLS
├── .env.local.example
└── package.json
```

## 📋 データベーススキーマ概要

`supabase/schema.sql` で以下のテーブルを作成します：

- **profiles** - ユーザープロフィール
- **vocabulary_cards** - 語彙カード（SRSステート含む）
- **srs_reviews** - 復習ログ
- **listening_contents** - リスニング教材
- **listening_progress** - リスニング進捗
- **speaking_sessions** - 会話セッション
- **conversation_messages** - 会話履歴
- **daily_xp** - 日次XPログ

すべてのテーブルに **Row Level Security (RLS)** が有効化されており、ユーザーは自分のデータのみアクセス可能です。

## 🧠 SRS（間隔反復学習）アルゴリズム

`src/lib/srs.ts` にSM-2アルゴリズムを実装。
評価に応じて次回復習日を自動計算します。

| 評価 | quality値 | 効果 |
|------|----------|------|
| Again | 0 | 復習サイクルをリセット、1日後に再出題 |
| Hard | 2 | 短い間隔で再出題、難易度係数を下げる |
| Good | 4 | 標準間隔（1日→6日→EF倍） |
| Easy | 5 | 長い間隔、難易度係数を上げる |

## 🔧 今後の拡張ロードマップ

- [ ] Supabase Auth UIの統合（メール / Googleログイン）
- [ ] Whisperによる実際の音声→テキスト変換
- [ ] Azure Pronunciation Assessment 連携（実発音採点）
- [ ] OpenAI TTS による高品質音声生成
- [ ] 進捗グラフ画面
- [ ] プッシュ通知（復習リマインダー）
- [ ] React Native への移植

## 📝 ライセンス

MIT
