-- PitchLog Phase 3 Initial Migration: Profiles, Teams, Players, Matches, Ball Events, RLS & Live RPC

-- 1. Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now() not null
);

-- 2. Teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 3. Players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 4. Matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  config jsonb not null,
  team_a jsonb not null,
  team_b jsonb not null,
  status text not null default 'in_progress',
  share_token text unique,
  is_live boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Ball Events
create table if not exists ball_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade not null,
  seq integer not null,
  payload jsonb not null,
  deleted_at timestamptz,
  created_at timestamptz default now() not null,
  constraint unique_match_seq unique(match_id, seq)
);

-- Indexes
create index if not exists idx_matches_share_token on matches(share_token) where share_token is not null;
create index if not exists idx_matches_owner on matches(owner_id);
create index if not exists idx_teams_owner on teams(owner_id) where deleted_at is null;
create index if not exists idx_players_owner on players(owner_id) where deleted_at is null;
create index if not exists idx_ball_events_match_seq on ball_events(match_id, seq);
create index if not exists idx_ball_events_match_deleted on ball_events(match_id, deleted_at);

-- ========================================================
-- Row Level Security (RLS)
-- ========================================================

alter table profiles enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table ball_events enable row level security;

-- Profiles: user owns their profile
create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

-- Teams: owner CRUD
create policy "Owners can view own teams"
  on teams for select
  using (owner_id = auth.uid());

create policy "Owners can insert own teams"
  on teams for insert
  with check (owner_id = auth.uid());

create policy "Owners can update own teams"
  on teams for update
  using (owner_id = auth.uid());

create policy "Owners can delete own teams"
  on teams for delete
  using (owner_id = auth.uid());

-- Players: owner CRUD
create policy "Owners can view own players"
  on players for select
  using (owner_id = auth.uid());

create policy "Owners can insert own players"
  on players for insert
  with check (owner_id = auth.uid());

create policy "Owners can update own players"
  on players for update
  using (owner_id = auth.uid());

create policy "Owners can delete own players"
  on players for delete
  using (owner_id = auth.uid());

-- Matches: owner CRUD
create policy "Owners can view own matches"
  on matches for select
  using (owner_id = auth.uid());

create policy "Owners can insert own matches"
  on matches for insert
  with check (owner_id = auth.uid());

create policy "Owners can update own matches"
  on matches for update
  using (owner_id = auth.uid());

create policy "Owners can delete own matches"
  on matches for delete
  using (owner_id = auth.uid());

-- Ball Events: only match owner can access directly
create policy "Match owners can view ball events"
  on ball_events for select
  using (
    exists (
      select 1 from matches m
      where m.id = ball_events.match_id
        and m.owner_id = auth.uid()
    )
  );

create policy "Match owners can insert ball events"
  on ball_events for insert
  with check (
    exists (
      select 1 from matches m
      where m.id = ball_events.match_id
        and m.owner_id = auth.uid()
    )
  );

create policy "Match owners can update ball events"
  on ball_events for update
  using (
    exists (
      select 1 from matches m
      where m.id = ball_events.match_id
        and m.owner_id = auth.uid()
    )
  );

create policy "Match owners can delete ball events"
  on ball_events for delete
  using (
    exists (
      select 1 from matches m
      where m.id = ball_events.match_id
        and m.owner_id = auth.uid()
    )
  );

-- ========================================================
-- Public Live Read Security Definer Function
-- ========================================================
create or replace function get_live_match(token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_events json;
begin
  if token is null or length(trim(token)) = 0 then
    return null;
  end if;

  -- Select match only if token matches AND (is_live = true OR status = 'completed')
  select *
  into v_match
  from matches
  where share_token = token
    and (is_live = true or status = 'completed');

  if not found then
    return null;
  end if;

  -- Retrieve all non-tombstoned ball events ordered by sequence
  select coalesce(
    json_agg(
      json_build_object(
        'id', be.id,
        'match_id', be.match_id,
        'seq', be.seq,
        'payload', be.payload,
        'created_at', be.created_at
      ) order by be.seq asc
    ),
    '[]'::json
  )
  into v_events
  from ball_events be
  where be.match_id = v_match.id
    and be.deleted_at is null;

  return json_build_object(
    'match', row_to_json(v_match),
    'events', v_events
  );
end;
$$;
