-- 가계부 앱 데이터베이스 스키마
-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 실행하세요.
-- 각 테이블은 user_id로 소유자가 구분되고, RLS로 본인 행만 읽고 쓸 수 있습니다.

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  label text not null,
  amount numeric not null,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, year, month)
);

create table if not exists card_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  label text not null,
  amount numeric not null,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_year_month_idx on entries (user_id, year, month);
create index if not exists budgets_user_year_idx on budgets (user_id, year);
create index if not exists card_entries_user_year_month_idx on card_entries (user_id, year, month);

alter table entries enable row level security;
alter table budgets enable row level security;
alter table card_entries enable row level security;

drop policy if exists "entries_owner" on entries;
create policy "entries_owner" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets_owner" on budgets;
create policy "budgets_owner" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "card_entries_owner" on card_entries;
create policy "card_entries_owner" on card_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: push INSERT/UPDATE/DELETE events so other open tabs/devices update live.
-- RLS still applies to Realtime, so each user only receives events for their own rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table entries;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budgets'
  ) then
    alter publication supabase_realtime add table budgets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'card_entries'
  ) then
    alter publication supabase_realtime add table card_entries;
  end if;
end $$;
