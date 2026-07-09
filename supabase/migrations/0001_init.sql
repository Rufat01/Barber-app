-- BarberApp initial schema
-- Tək barber MVP, amma multi-tenant SaaS-a keçid üçün barbershop_id hər yerdə saxlanılıb.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- barbershops
-- ---------------------------------------------------------------------------
create table if not exists barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_phone text,
  plan text not null default 'trial',
  trial_ends_at timestamptz,
  subscription_status text not null default 'trialing',
  whatsapp_number text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration_minutes integer check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists services_barbershop_active_idx
  on services (barbershop_id, is_active);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  full_name text not null,
  -- Normalize edilmiş format: 994XXXXXXXXX ("+" işarəsi yoxdur)
  phone text not null check (phone ~ '^994(50|51|55|70|77|99|10)[0-9]{7}$'),
  notes text,
  no_show_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (barbershop_id, phone)
);

create index if not exists customers_barbershop_phone_idx
  on customers (barbershop_id, phone);

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  date date not null,
  time time not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  total_price numeric(10, 2) not null default 0 check (total_price >= 0),
  whatsapp_sent_at timestamptz,
  whatsapp_status text
    check (whatsapp_status is null or whatsapp_status in ('pending', 'sent', 'failed')),
  whatsapp_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists reservations_barbershop_date_idx
  on reservations (barbershop_id, date);

-- ---------------------------------------------------------------------------
-- reservation_services (rezervdə seçilən xidmətlər, tarixi qiymətlə)
-- ---------------------------------------------------------------------------
create table if not exists reservation_services (
  reservation_id uuid not null references reservations(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  -- Servisin qiyməti sonradan dəyişsə belə köhnə rezervin qiyməti qorunsun deyə.
  price_at_booking numeric(10, 2) not null check (price_at_booking >= 0),
  primary key (reservation_id, service_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- MVP tək-barber mərhələsindədir, hələ Supabase Auth ilə giriş yoxdur — frontend
-- birbaşa anon key ilə sorğu göndərir. Ona görə hazırda hər cədvələ tam açıq
-- (permissive) policy qoyulur. Multi-tenant SaaS mərhələsinə keçəndə bu policy-lər
-- auth.uid() əsaslı barbershop-scoped policy-lərlə əvəz olunmalıdır.
-- ---------------------------------------------------------------------------
alter table barbershops enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table reservations enable row level security;
alter table reservation_services enable row level security;

create policy "mvp_allow_all" on barbershops for all
  using (true) with check (true);
create policy "mvp_allow_all" on services for all
  using (true) with check (true);
create policy "mvp_allow_all" on customers for all
  using (true) with check (true);
create policy "mvp_allow_all" on reservations for all
  using (true) with check (true);
create policy "mvp_allow_all" on reservation_services for all
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed: MVP tək barbershop (sabit id, frontend-də konstant kimi istifadə olunur)
-- ---------------------------------------------------------------------------
insert into barbershops (id, name, slug, plan, subscription_status)
values ('11111111-1111-1111-1111-111111111111', 'Mənim Barbershopum', 'default', 'trial', 'trialing')
on conflict (id) do nothing;

insert into services (barbershop_id, name, price, duration_minutes, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Saç kəsimi', 10, 30, true),
  ('11111111-1111-1111-1111-111111111111', 'Saqqal düzəltmə', 5, 15, true),
  ('11111111-1111-1111-1111-111111111111', 'Saç + Saqqal', 13, 45, true)
on conflict do nothing;
