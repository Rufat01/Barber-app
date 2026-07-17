-- Berberin öz brauzerini Web Push bildirimlərinə abunə etməsi üçün. Berber öz
-- sessiyası ilə (auth.uid()) subscribe olduğundan mövcud owner_full_access RLS
-- naxışı (bax 0005_barber_auth_rls.sql) kifayətdir — anon/public giriş yoxdur.
-- Bildiriş göndərən edge function isə service role key ilə oxuyur (RLS-i keçir).

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_barbershop_idx on push_subscriptions (barbershop_id);

alter table push_subscriptions enable row level security;

create policy "owner_full_access" on push_subscriptions for all
  using (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()))
  with check (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()));
