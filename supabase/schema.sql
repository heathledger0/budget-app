-- 가계부 앱 데이터베이스 스키마
-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 실행하세요.
-- 각 테이블은 user_id로 소유자가 구분되고, RLS로 본인 행만 읽고 쓸 수 있습니다.

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  day int not null default 1 check (day between 1 and 31),
  label text not null,
  amount numeric not null,
  memo text,
  series_id uuid,
  created_at timestamptz not null default now()
);

-- Migrations for projects created before these columns existed: adds them if missing.
alter table entries add column if not exists day int not null default 1 check (day between 1 and 31);
alter table entries add column if not exists series_id uuid;

create index if not exists entries_series_idx on entries (series_id);

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

-- ============================================================================
-- 가구(household) 공유 가계부
-- 부부/가족이 서로 다른 계정으로 로그인하되 같은 가계부 데이터를 공유할 수 있도록,
-- 모든 데이터 행에 user_id 대신(정확히는 추가로) household_id를 붙이고
-- RLS를 "내 가구에 속한 행"으로 바꿉니다. 초대는 이메일 발송 없이 코드 공유로 처리합니다.
-- ============================================================================

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '나의 가계부',
  created_at timestamptz not null default now()
);

-- 사용자당 정확히 하나의 가구에만 속합니다 (user_id가 PK).
create table if not exists household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references households (id) on delete cascade,
  email text,
  joined_at timestamptz not null default now()
);

create index if not exists household_members_household_idx on household_members (household_id);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 같은 테이블을 재귀적으로 조회하는 RLS 정책은 무한 재귀를 일으키므로,
-- security definer 함수로 "내 가구 id"를 조회해 RLS를 우회시킵니다.
create or replace function my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid() limit 1;
$$;

grant execute on function my_household_id() to authenticated;

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

drop policy if exists "households_select" on households;
create policy "households_select" on households for select
  using (id = my_household_id());

drop policy if exists "household_members_select" on household_members;
create policy "household_members_select" on household_members for select
  using (household_id = my_household_id());

drop policy if exists "household_members_delete_self" on household_members;
create policy "household_members_delete_self" on household_members for delete
  using (user_id = auth.uid());

drop policy if exists "household_invites_select" on household_invites;
create policy "household_invites_select" on household_invites for select
  using (household_id = my_household_id());

drop policy if exists "household_invites_insert" on household_invites;
create policy "household_invites_insert" on household_invites for insert
  with check (household_id = my_household_id());

drop policy if exists "household_invites_delete" on household_invites;
create policy "household_invites_delete" on household_invites for delete
  using (household_id = my_household_id());

-- 신규 가입자는 자동으로 자신만의 가구를 하나 배정받습니다.
create or replace function handle_new_user_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hh_id uuid;
begin
  insert into households (name) values ('나의 가계부') returning id into hh_id;
  insert into household_members (user_id, household_id, email) values (new.id, hh_id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_household on auth.users;
create trigger on_auth_user_created_household
  after insert on auth.users
  for each row execute function handle_new_user_household();

-- entries/budgets/card_entries에 household_id 추가.
alter table entries add column if not exists household_id uuid references households (id);
alter table budgets add column if not exists household_id uuid references households (id);
alter table card_entries add column if not exists household_id uuid references households (id);

-- 마이그레이션: 이 기능 이전에 가입한 사용자를 위해 개인 가구를 만들고
-- 기존 데이터의 household_id를 채워 넣습니다. (이미 처리된 사용자는 건너뜁니다.)
do $$
declare
  r record;
  hh_id uuid;
begin
  for r in
    select id, email from auth.users
    where not exists (select 1 from household_members hm where hm.user_id = auth.users.id)
  loop
    insert into households (name) values ('나의 가계부') returning id into hh_id;
    insert into household_members (user_id, household_id, email) values (r.id, hh_id, r.email);
  end loop;

  update entries e set household_id = hm.household_id
    from household_members hm where hm.user_id = e.user_id and e.household_id is null;
  update budgets b set household_id = hm.household_id
    from household_members hm where hm.user_id = b.user_id and b.household_id is null;
  update card_entries c set household_id = hm.household_id
    from household_members hm where hm.user_id = c.user_id and c.household_id is null;
end $$;

alter table entries alter column household_id set not null;
alter table budgets alter column household_id set not null;
alter table card_entries alter column household_id set not null;

alter table entries alter column household_id set default my_household_id();
alter table budgets alter column household_id set default my_household_id();
alter table card_entries alter column household_id set default my_household_id();

-- 예산은 가구당 하나여야 두 사람이 각자 입력해도 합산이 두 배로 뻥튀기되지 않습니다.
alter table budgets drop constraint if exists budgets_user_id_category_id_year_month_key;
alter table budgets drop constraint if exists budgets_household_id_category_id_year_month_key;
alter table budgets add constraint budgets_household_id_category_id_year_month_key
  unique (household_id, category_id, year, month);

-- RLS를 소유자(user_id) 기준에서 가구(household_id) 기준으로 교체: 같은 가구 구성원은
-- 서로의 입력을 보고 고치고 지울 수 있습니다.
drop policy if exists "entries_owner" on entries;
create policy "entries_household" on entries
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

drop policy if exists "budgets_owner" on budgets;
create policy "budgets_household" on budgets
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

drop policy if exists "card_entries_owner" on card_entries;
create policy "card_entries_household" on card_entries
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- 초대 코드로 가구에 참여: 기존 개인 데이터는 함께 옮겨져 하나의 공유 가계부로 합쳐집니다.
create or replace function join_household(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  old_household_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into inv from household_invites where code = invite_code and expires_at > now();
  if not found then
    raise exception '초대 코드가 올바르지 않거나 만료되었습니다';
  end if;

  select household_id into old_household_id from household_members where user_id = uid;

  if old_household_id = inv.household_id then
    return inv.household_id;
  end if;

  update entries set household_id = inv.household_id
    where household_id = old_household_id and user_id = uid;
  update budgets set household_id = inv.household_id
    where household_id = old_household_id and user_id = uid;
  update card_entries set household_id = inv.household_id
    where household_id = old_household_id and user_id = uid;

  update household_members set household_id = inv.household_id, joined_at = now()
    where user_id = uid;

  delete from household_invites where id = inv.id;

  return inv.household_id;
end;
$$;

grant execute on function join_household(text) to authenticated;

-- 가구에서 나가기: 자신의 데이터를 들고 새 개인 가구로 분리됩니다.
create or replace function leave_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_household_id uuid;
  new_household_id uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  select household_id into cur_household_id from household_members where user_id = uid;

  if (select count(*) from household_members where household_id = cur_household_id) <= 1 then
    return cur_household_id;
  end if;

  insert into households (name) values ('나의 가계부') returning id into new_household_id;

  update entries set household_id = new_household_id
    where household_id = cur_household_id and user_id = uid;
  update budgets set household_id = new_household_id
    where household_id = cur_household_id and user_id = uid;
  update card_entries set household_id = new_household_id
    where household_id = cur_household_id and user_id = uid;

  update household_members set household_id = new_household_id, joined_at = now()
    where user_id = uid;

  return new_household_id;
end;
$$;

grant execute on function leave_household() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'household_members'
  ) then
    alter publication supabase_realtime add table household_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'household_invites'
  ) then
    alter publication supabase_realtime add table household_invites;
  end if;
end $$;
