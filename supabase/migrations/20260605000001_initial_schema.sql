-- Enable required extensions
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid references auth.users primary key,
  email text,
  display_name text,
  avatar_url text,
  home_location text,
  baseline_preferences jsonb,
  is_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ZONES
-- Queryable columns for filtering; full document in data jsonb.
-- ============================================================
create table zones (
  id text primary key,
  name text not null,
  state text not null,
  region text not null,
  skill_level text not null,
  vehicle_requirement text not null,
  drive_time_from_denver_hours numeric not null,
  off_grid_level integer not null check (off_grid_level between 1 and 4),
  crowd_level integer not null check (crowd_level between 1 and 5),
  hidden_gem_score integer not null check (hidden_gem_score between 1 and 5),
  best_seasons text[] not null default '{}',
  camping_types text[] not null default '{}',
  coordinates geometry(Point, 4326),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spatial index for future proximity queries
create index zones_coordinates_idx on zones using gist (coordinates)
  where coordinates is not null;

-- Text search index on name + region
create index zones_name_trgm_idx on zones using gin (name gin_trgm_ops);

-- Zones are public read, admin-only write (no RLS — public table)
-- Future: add RLS if zone visibility needs gating

-- ============================================================
-- PREFERENCE SNAPSHOTS
-- Stores serialized TripPreferences behind an opaque UUID.
-- ============================================================
create table preference_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  preferences jsonb not null,
  created_at timestamptz not null default now()
);

alter table preference_snapshots enable row level security;

create policy "anyone can insert snapshots"
  on preference_snapshots for insert with check (true);

create policy "anyone can read snapshots by id"
  on preference_snapshots for select using (true);

-- ============================================================
-- SAVED TRIPS
-- Pro feature: user saves a zone + preference snapshot.
-- ============================================================
create table saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  zone_id text not null references zones(id) on delete restrict,
  preference_snapshot_id uuid references preference_snapshots(id) on delete set null,
  score numeric,
  notes text,
  saved_at timestamptz not null default now()
);

alter table saved_trips enable row level security;

create policy "users can manage own saved trips"
  on saved_trips for all using (auth.uid() = user_id);

-- ============================================================
-- FIELD REPORTS
-- Pro feature: post-trip record tied to a saved trip.
-- ============================================================
create table field_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  saved_trip_id uuid not null references saved_trips(id) on delete cascade,
  zone_id text not null references zones(id) on delete restrict,
  rating integer check (rating between 1 and 5),
  notes text,
  trip_start_date date,
  trip_end_date date,
  -- Structured conditions: { road: string, crowds: string, weather: string }
  conditions jsonb,
  would_return boolean,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table field_reports enable row level security;

create policy "users can manage own field reports"
  on field_reports for all using (auth.uid() = user_id);

create policy "public field reports visible to all"
  on field_reports for select using (is_public = true);
