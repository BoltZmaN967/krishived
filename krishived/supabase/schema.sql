-- KrishiVed — Supabase schema
-- Conceptual model (PRD §11): User -> Farmer -> Fields -> Observations ->
-- Risk Assessment -> Case -> Validation -> Advisory -> Follow-up
--
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Farmers (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.farmers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  full_name text,
  phone text,
  preferred_language text default 'en',
  village text,
  district text,
  state text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Fields (FR-01, FR-02)
-- ---------------------------------------------------------------------
create table if not exists public.fields (
  id uuid primary key default uuid_generate_v4(),
  farmer_id uuid references public.farmers(id) on delete cascade not null,
  name text not null,
  crop text not null,
  variety text,
  sowing_date date,
  crop_stage text,
  area_acres numeric,
  soil_type text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Observations — image / pest-trap / sensor input (FR-03, FR-04)
-- field_id is nullable so ad-hoc field scans are supported
-- ---------------------------------------------------------------------
create table if not exists public.observations (
  id uuid primary key default uuid_generate_v4(),
  field_id uuid references public.fields(id) on delete set null,
  farmer_id uuid references public.farmers(id) on delete cascade not null,
  observation_type text check (observation_type in ('image', 'pest_trap', 'sensor', 'manual')) default 'image' not null,
  image_url text,
  pest_count int,
  sensor_readings jsonb,
  symptoms text,
  recorded_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Cases — trackable lifecycle per FR-17
-- field_id & observation_id are nullable with on delete set null
-- ---------------------------------------------------------------------
create table if not exists public.cases (
  id uuid primary key default uuid_generate_v4(),
  farmer_id uuid references public.farmers(id) on delete cascade not null,
  field_id uuid references public.fields(id) on delete set null,
  observation_id uuid references public.observations(id) on delete set null,
  status text check (
    status in ('reported','processing','ai_assessed','under_validation','confirmed','advisory','follow_up','resolved','monitoring')
  ) default 'reported',
  risk_level text check (risk_level in ('low','moderate','high','critical')) default 'low',
  prediction text,
  confidence numeric,
  class_id text,
  evidence jsonb,
  requires_expert_review boolean default false,
  next_action text,
  lab_referral_recommended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Risk assessments — weather + context snapshot feeding a case (FR-06)
-- ---------------------------------------------------------------------
create table if not exists public.risk_assessments (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references public.cases(id) on delete cascade not null,
  weather jsonb,
  contributing_factors jsonb,
  computed_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Expert / extension-worker validation (FR-09)
-- ---------------------------------------------------------------------
create table if not exists public.validations (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references public.cases(id) on delete cascade not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  decision text check (decision in ('confirmed','rejected','alternative_diagnosis','needs_more_info')),
  alternative_diagnosis text,
  notes text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Advisories (FR-10, FR-11)
-- ---------------------------------------------------------------------
create table if not exists public.advisories (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references public.cases(id) on delete cascade not null,
  guidance text not null,
  requires_authoritative_review boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Follow-ups (FR-13)
-- ---------------------------------------------------------------------
create table if not exists public.follow_ups (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references public.cases(id) on delete cascade not null,
  status_update text check (status_update in ('Improving','Stable','Worsening')),
  note text,
  image_url text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Alerts (FR-07)
-- ---------------------------------------------------------------------
create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  farmer_id uuid references public.farmers(id) on delete cascade not null,
  field_id uuid references public.fields(id) on delete set null,
  severity text check (severity in ('low','moderate','high','critical')) not null,
  title text not null,
  detail text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Storage bucket for field images & policies
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('field-images', 'field-images', true)
on conflict (id) do update set public = true;

-- Drop existing storage policies if any to allow safe re-runs
drop policy if exists "Allow authenticated uploads to field-images" on storage.objects;
drop policy if exists "Allow authenticated updates to field-images" on storage.objects;
drop policy if exists "Allow public read access to field-images" on storage.objects;
drop policy if exists "Allow authenticated deletes on field-images" on storage.objects;

create policy "Allow authenticated uploads to field-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'field-images');

create policy "Allow authenticated updates to field-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'field-images');

create policy "Allow public read access to field-images"
  on storage.objects for select
  using (bucket_id = 'field-images');

create policy "Allow authenticated deletes on field-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'field-images');

-- ---------------------------------------------------------------------
-- Automatic Farmer profile creation on auth signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.farmers (id, user_id, full_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security — farmers only access their own data
-- ---------------------------------------------------------------------
alter table public.farmers enable row level security;
alter table public.fields enable row level security;
alter table public.observations enable row level security;
alter table public.cases enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.validations enable row level security;
alter table public.advisories enable row level security;
alter table public.follow_ups enable row level security;
alter table public.alerts enable row level security;

-- Drop existing policies for clean idempotency
drop policy if exists "Farmers manage their own profile" on public.farmers;
drop policy if exists "Farmers manage their own fields" on public.fields;
drop policy if exists "Farmers manage their own observations" on public.observations;
drop policy if exists "Farmers manage their own cases" on public.cases;
drop policy if exists "Farmers view risk assessments on their cases" on public.risk_assessments;
drop policy if exists "Farmers view validations on their cases" on public.validations;
drop policy if exists "Farmers view advisories on their cases" on public.advisories;
drop policy if exists "Farmers manage follow-ups on their cases" on public.follow_ups;
drop policy if exists "Farmers view their own alerts" on public.alerts;

-- Farmers profile policy (handles select, insert, update, delete)
create policy "Farmers manage their own profile" on public.farmers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fields policy
create policy "Farmers manage their own fields" on public.fields
  for all
  using (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  )
  with check (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  );

-- Observations policy
create policy "Farmers manage their own observations" on public.observations
  for all
  using (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  )
  with check (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  );

-- Cases policy
create policy "Farmers manage their own cases" on public.cases
  for all
  using (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  )
  with check (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  );

-- Risk assessments policy
create policy "Farmers view risk assessments on their cases" on public.risk_assessments
  for select
  using (
    case_id in (
      select id from public.cases where farmer_id in (select id from public.farmers where user_id = auth.uid())
      or farmer_id = auth.uid()
    )
  );

-- Validations policy
create policy "Farmers view validations on their cases" on public.validations
  for select
  using (
    case_id in (
      select id from public.cases where farmer_id in (select id from public.farmers where user_id = auth.uid())
      or farmer_id = auth.uid()
    )
  );

-- Advisories policy
create policy "Farmers view advisories on their cases" on public.advisories
  for select
  using (
    case_id in (
      select id from public.cases where farmer_id in (select id from public.farmers where user_id = auth.uid())
      or farmer_id = auth.uid()
    )
  );

-- Follow-ups policy
create policy "Farmers manage follow-ups on their cases" on public.follow_ups
  for all
  using (
    case_id in (
      select id from public.cases where farmer_id in (select id from public.farmers where user_id = auth.uid())
      or farmer_id = auth.uid()
    )
  )
  with check (
    case_id in (
      select id from public.cases where farmer_id in (select id from public.farmers where user_id = auth.uid())
      or farmer_id = auth.uid()
    )
  );

-- Alerts policy
create policy "Farmers view their own alerts" on public.alerts
  for select
  using (
    farmer_id in (select id from public.farmers where user_id = auth.uid())
    or farmer_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- Schema Migrations / Fixes for Existing Databases
-- (Safe to run multiple times: drops NOT NULL if table already existed)
-- ---------------------------------------------------------------------
alter table if exists public.observations alter column field_id drop not null;
alter table if exists public.cases alter column field_id drop not null;
alter table if exists public.cases alter column observation_id drop not null;
alter table if exists public.alerts alter column field_id drop not null;

