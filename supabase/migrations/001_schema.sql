-- LightRent Pro - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable RLS
alter database postgres set "app.jwt_secret" to 'your-secret';

-- GEAR (assets)
create table if not exists gear (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  categorie text not null default 'LED',
  eigenaar text,
  serienr text,
  dagprijs numeric(10,2) not null default 0,
  weekprijs numeric(10,2) not null default 0,
  aankoopprijs numeric(10,2) default 0,
  notities text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ACCESSORIES
create table if not exists accessories (
  id uuid primary key default gen_random_uuid(),
  gear_id uuid references gear(id) on delete cascade,
  naam text not null,
  dagprijs numeric(10,2) not null default 0,
  weekprijs numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- BUSSEN
create table if not exists bussen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  kenteken text,
  eigenaar text,
  km_stand integer default 0,
  kosten_per_km numeric(6,2) default 0.45,
  dagprijs numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- KM LOG
create table if not exists km_log (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid references bussen(id) on delete cascade,
  klus_id uuid,
  datum date not null,
  km_van integer not null,
  km_tot integer not null,
  gereden integer generated always as (km_tot - km_van) stored,
  created_at timestamptz default now()
);

-- GENERATORS
create table if not exists generators (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  type text not null default '60KVA',
  eigenaar text,
  created_at timestamptz default now()
);

-- GENERATOR LOG
create table if not exists generator_log (
  id uuid primary key default gen_random_uuid(),
  generator_id uuid references generators(id) on delete cascade,
  klus_id uuid,
  datum date not null,
  chauffeur text,
  liters numeric(8,2) default 0,
  draaiuren numeric(8,2) default 0,
  prijs_per_liter numeric(6,3) default 1.65,
  notitie text,
  created_at timestamptz default now()
);

-- KLANTEN
create table if not exists klanten (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  bedrijf text,
  email text,
  telefoon text,
  adres text,
  btw_nummer text,
  created_at timestamptz default now()
);

-- KLUSSEN
create table if not exists klussen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  klant_id uuid references klanten(id) on delete set null,
  verantwoordelijke text,
  start_datum date,
  eind_datum date,
  status text not null default 'gepland',
  notities text,
  generator_info jsonb default '[]',
  bus_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint status_check check (status in ('gepland', 'actief', 'afgerond'))
);

-- KLUS GEAR (many-to-many)
create table if not exists klus_gear (
  id uuid primary key default gen_random_uuid(),
  klus_id uuid references klussen(id) on delete cascade,
  gear_id uuid references gear(id) on delete cascade,
  unique(klus_id, gear_id)
);

-- KLUS ACCESSORIES (many-to-many)
create table if not exists klus_accessories (
  id uuid primary key default gen_random_uuid(),
  klus_id uuid references klussen(id) on delete cascade,
  accessory_id uuid references accessories(id) on delete cascade,
  unique(klus_id, accessory_id)
);

-- OFFERTES
create table if not exists offertes (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique,
  klant_id uuid references klanten(id) on delete set null,
  klus_id uuid references klussen(id) on delete set null,
  start_datum date,
  eind_datum date,
  bus_dagprijs numeric(10,2) default 0,
  generator_dagprijs numeric(10,2) default 0,
  korting_pct numeric(5,2) default 0,
  geldig_tot date,
  notities text,
  status text not null default 'concept',
  totaal_excl numeric(12,2) default 0,
  datum date not null default current_date,
  gear_ids uuid[] default '{}',
  accessory_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- FACTUREN
create table if not exists facturen (
  id uuid primary key default gen_random_uuid(),
  nummer text not null unique,
  klant_id uuid references klanten(id) on delete set null,
  klus_id uuid references klussen(id) on delete set null,
  offerte_id uuid references offertes(id) on delete set null,
  start_datum date,
  eind_datum date,
  bus_dagprijs numeric(10,2) default 0,
  generator_dagprijs numeric(10,2) default 0,
  korting_pct numeric(5,2) default 0,
  vervaldatum date,
  notities text,
  status text not null default 'onbetaald',
  totaal_excl numeric(12,2) default 0,
  datum date not null default current_date,
  gear_ids uuid[] default '{}',
  accessory_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- Seed generators
insert into generators (naam, type, eigenaar) values
  ('60KVA Generator aanhanger', '60KVA', null),
  ('Honda EU70IS', 'Honda', null)
on conflict do nothing;

-- Enable Row Level Security (open for now - add auth policies as needed)
alter table gear enable row level security;
alter table accessories enable row level security;
alter table bussen enable row level security;
alter table km_log enable row level security;
alter table generators enable row level security;
alter table generator_log enable row level security;
alter table klanten enable row level security;
alter table klussen enable row level security;
alter table klus_gear enable row level security;
alter table klus_accessories enable row level security;
alter table offertes enable row level security;
alter table facturen enable row level security;

-- Policies: allow all authenticated users full access
create policy "authenticated full access" on gear for all to authenticated using (true) with check (true);
create policy "authenticated full access" on accessories for all to authenticated using (true) with check (true);
create policy "authenticated full access" on bussen for all to authenticated using (true) with check (true);
create policy "authenticated full access" on km_log for all to authenticated using (true) with check (true);
create policy "authenticated full access" on generators for all to authenticated using (true) with check (true);
create policy "authenticated full access" on generator_log for all to authenticated using (true) with check (true);
create policy "authenticated full access" on klanten for all to authenticated using (true) with check (true);
create policy "authenticated full access" on klussen for all to authenticated using (true) with check (true);
create policy "authenticated full access" on klus_gear for all to authenticated using (true) with check (true);
create policy "authenticated full access" on klus_accessories for all to authenticated using (true) with check (true);
create policy "authenticated full access" on offertes for all to authenticated using (true) with check (true);
create policy "authenticated full access" on facturen for all to authenticated using (true) with check (true);
