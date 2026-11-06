-- PitchLog Phase 5 Migration: Tournaments, Tournament Teams, Fixtures, RLS & Public RPC

-- 1. Tournaments Table
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  format text not null,
  config jsonb not null,
  status text not null default 'draft',
  share_token text unique not null,
  is_public boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 2. Tournament Teams Table
create table if not exists tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  name_snapshot text not null,
  group_id text,
  seed integer
);

-- 3. Fixtures Table
create table if not exists fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  stage text not null,
  round integer not null,
  group_id text,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  scheduled_at timestamptz,
  match_id uuid references matches(id) on delete set null,
  status text not null default 'scheduled',
  result_override jsonb,
  bracket_slot jsonb,
  winner_advances_to_fixture_id uuid,
  winner_advances_to_slot text,
  loser_advances_to_fixture_id uuid,
  loser_advances_to_slot text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- 4. Alter Matches to link to Tournament and Fixture (Nullable)
alter table matches add column if not exists tournament_id uuid references tournaments(id) on delete set null;
alter table matches add column if not exists fixture_id uuid references fixtures(id) on delete set null;

-- Indexes
create index if not exists idx_tournaments_share_token on tournaments(share_token) where is_public = true and deleted_at is null;
create index if not exists idx_tournaments_owner on tournaments(owner_id) where deleted_at is null;
create index if not exists idx_tournament_teams_tourn on tournament_teams(tournament_id);
create index if not exists idx_fixtures_tourn on fixtures(tournament_id) where deleted_at is null;
create index if not exists idx_fixtures_match on fixtures(match_id) where match_id is not null;
create index if not exists idx_matches_tourn on matches(tournament_id) where tournament_id is not null;

-- ========================================================
-- Row Level Security (RLS)
-- ========================================================

alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table fixtures enable row level security;

-- Tournaments Policies (Single-Writer Owner Model)
create policy "Owners can view own tournaments"
  on tournaments for select
  using (owner_id = auth.uid());

create policy "Owners can insert own tournaments"
  on tournaments for insert
  with check (owner_id = auth.uid());

create policy "Owners can update own tournaments"
  on tournaments for update
  using (owner_id = auth.uid());

create policy "Owners can delete own tournaments"
  on tournaments for delete
  using (owner_id = auth.uid());

-- Tournament Teams Policies
create policy "Owners can view own tournament teams"
  on tournament_teams for select
  using (exists (select 1 from tournaments t where t.id = tournament_teams.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can insert own tournament teams"
  on tournament_teams for insert
  with check (exists (select 1 from tournaments t where t.id = tournament_teams.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can update own tournament teams"
  on tournament_teams for update
  using (exists (select 1 from tournaments t where t.id = tournament_teams.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can delete own tournament teams"
  on tournament_teams for delete
  using (exists (select 1 from tournaments t where t.id = tournament_teams.tournament_id and t.owner_id = auth.uid()));

-- Fixtures Policies
create policy "Owners can view own fixtures"
  on fixtures for select
  using (exists (select 1 from tournaments t where t.id = fixtures.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can insert own fixtures"
  on fixtures for insert
  with check (exists (select 1 from tournaments t where t.id = fixtures.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can update own fixtures"
  on fixtures for update
  using (exists (select 1 from tournaments t where t.id = fixtures.tournament_id and t.owner_id = auth.uid()));

create policy "Owners can delete own fixtures"
  on fixtures for delete
  using (exists (select 1 from tournaments t where t.id = fixtures.tournament_id and t.owner_id = auth.uid()));

-- ========================================================
-- Public Read-Only Security Definer Function
-- ========================================================
create or replace function get_public_tournament(token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tourn record;
  v_teams json;
  v_fixtures json;
  v_matches json;
begin
  if token is null or length(trim(token)) = 0 then
    return null;
  end if;

  -- 1. Select tournament if share token matches and is_public is true
  select *
  into v_tourn
  from tournaments
  where share_token = token
    and is_public = true
    and deleted_at is null;

  if not found then
    return null;
  end if;

  -- 2. Select tournament teams
  select coalesce(
    json_agg(
      json_build_object(
        'id', tt.id,
        'tournament_id', tt.tournament_id,
        'team_id', tt.team_id,
        'name_snapshot', tt.name_snapshot,
        'group_id', tt.group_id,
        'seed', tt.seed
      )
    ),
    '[]'::json
  )
  into v_teams
  from tournament_teams tt
  where tt.tournament_id = v_tourn.id;

  -- 3. Select non-deleted fixtures
  select coalesce(
    json_agg(
      json_build_object(
        'id', f.id,
        'tournament_id', f.tournament_id,
        'stage', f.stage,
        'round', f.round,
        'group_id', f.group_id,
        'home_team_id', f.home_team_id,
        'away_team_id', f.away_team_id,
        'scheduled_at', f.scheduled_at,
        'match_id', f.match_id,
        'status', f.status,
        'result_override', f.result_override,
        'bracket_slot', f.bracket_slot,
        'winner_advances_to_fixture_id', f.winner_advances_to_fixture_id,
        'winner_advances_to_slot', f.winner_advances_to_slot,
        'loser_advances_to_fixture_id', f.loser_advances_to_fixture_id,
        'loser_advances_to_slot', f.loser_advances_to_slot
      ) order by f.round asc, f.scheduled_at asc nulls last
    ),
    '[]'::json
  )
  into v_fixtures
  from fixtures f
  where f.tournament_id = v_tourn.id
    and f.deleted_at is null;

  -- 4. Select linked matches
  select coalesce(
    json_agg(
      json_build_object(
        'id', m.id,
        'config', m.config,
        'team_a', m.team_a,
        'team_b', m.team_b,
        'status', m.status,
        'share_token', m.share_token,
        'is_live', m.is_live,
        'tournament_id', m.tournament_id,
        'fixture_id', m.fixture_id
      )
    ),
    '[]'::json
  )
  into v_matches
  from matches m
  where m.tournament_id = v_tourn.id;

  return json_build_object(
    'tournament', row_to_json(v_tourn),
    'teams', v_teams,
    'fixtures', v_fixtures,
    'matches', v_matches
  );
end;
$$;
