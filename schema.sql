-- ============================================================
-- SpeakUp 英語学習アプリ - Supabase DB Schema
-- ============================================================
-- 使い方:
-- 1. Supabaseダッシュボード → SQL Editor で本ファイルを実行
-- 2. Authentication → Providers でEmail認証を有効化
-- ============================================================

-- ユーザープロフィール（auth.users と 1:1）
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  level text default 'A2' check (level in ('A1','A2','B1','B2','C1','C2')),
  daily_goal_xp int default 200,
  streak_days int default 0,
  last_active_date date,
  created_at timestamptz default now()
);

-- 語彙カード
create table if not exists public.vocabulary_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  word text not null,
  phonetic text,
  meaning text not null,
  example text,
  example_ja text,
  level text default 'B1',
  image_url text,
  audio_url text,
  -- SRS state (SM-2)
  repetitions int default 0,
  ease_factor real default 2.5,
  interval_days int default 0,
  next_review_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_vocab_user_due on public.vocabulary_cards(user_id, next_review_at);

-- 復習ログ
create table if not exists public.srs_reviews (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references public.vocabulary_cards on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  quality text check (quality in ('again','hard','good','easy')) not null,
  reviewed_at timestamptz default now()
);

-- リスニング教材
create table if not exists public.listening_contents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_ja text,
  level text default 'B1',
  duration_sec int not null,
  audio_url text not null,
  transcript text not null,
  transcript_ja text,
  category text,
  created_at timestamptz default now()
);

-- リスニング進捗
create table if not exists public.listening_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content_id uuid references public.listening_contents on delete cascade not null,
  last_position_sec int default 0,
  dictation_score real,
  completed boolean default false,
  played_at timestamptz default now(),
  unique(user_id, content_id)
);

-- スピーキングセッション
create table if not exists public.speaking_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  scenario_id text not null,
  scenario_title text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  avg_pronunciation_score real,
  message_count int default 0
);

-- 会話メッセージ
create table if not exists public.conversation_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.speaking_sessions on delete cascade not null,
  role text check (role in ('user','assistant','system')) not null,
  content text not null,
  audio_url text,
  pronunciation_score real,
  created_at timestamptz default now()
);
create index if not exists idx_msg_session on public.conversation_messages(session_id, created_at);

-- 日次XPログ
create table if not exists public.daily_xp (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date default current_date,
  xp int default 0,
  unique(user_id, date)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.vocabulary_cards enable row level security;
alter table public.srs_reviews enable row level security;
alter table public.listening_progress enable row level security;
alter table public.speaking_sessions enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.daily_xp enable row level security;
-- listening_contents は誰でも読み取り可（コンテンツDB）
alter table public.listening_contents enable row level security;

-- 各テーブルへのポリシー（ユーザーは自分のデータのみアクセス可）
create policy "own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "own cards" on public.vocabulary_cards
  for all using (auth.uid() = user_id);

create policy "own reviews" on public.srs_reviews
  for all using (auth.uid() = user_id);

create policy "own listening progress" on public.listening_progress
  for all using (auth.uid() = user_id);

create policy "own speaking sessions" on public.speaking_sessions
  for all using (auth.uid() = user_id);

create policy "own messages" on public.conversation_messages
  for all using (
    exists(select 1 from public.speaking_sessions s
           where s.id = session_id and s.user_id = auth.uid())
  );

create policy "own xp" on public.daily_xp
  for all using (auth.uid() = user_id);

create policy "read listening" on public.listening_contents
  for select using (true);

-- ============================================================
-- 自動プロフィール作成トリガー
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Learner'));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 初期データ（リスニング教材）
-- ============================================================
insert into public.listening_contents (title, title_ja, level, duration_sec, audio_url, transcript, transcript_ja, category) values
  ('Coffee Shop Conversation', 'カフェでの会話', 'A2', 45,
   'https://example.com/audio/coffee.mp3',
   'Hi, I''d like a medium latte, please. Would you like that hot or iced? Hot, please. And could I add an extra shot of espresso? Sure, that''ll be $5.50.',
   'ミディアムラテをお願いします。ホットですか、アイスですか？ホットで。エスプレッソをもう1ショット追加できますか？はい、5.50ドルになります。',
   'daily'),
  ('Tech News Brief', 'テクノロジーニュース', 'B1', 60,
   'https://example.com/audio/tech.mp3',
   'A new study reveals that artificial intelligence is transforming how we learn languages.',
   '新しい研究によると、AIは私たちの言語学習を変革しています。',
   'news')
on conflict do nothing;
