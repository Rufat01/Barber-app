-- Berber auth-u: hər barbershop bir Supabase Auth istifadəçisinə bağlanır,
-- açıq (mvp_allow_all) policy-lər tenant-scoped policy-lərlə əvəz olunur.

alter table barbershops
  add column owner_user_id uuid references auth.users(id) on delete set null;

create unique index barbershops_owner_user_id_key
  on barbershops (owner_user_id)
  where owner_user_id is not null;

-- ---------------------------------------------------------------------------
-- Köhnə açıq policy-lər silinir
-- ---------------------------------------------------------------------------
drop policy "mvp_allow_all" on barbershops;
drop policy "mvp_allow_all" on services;
drop policy "mvp_allow_all" on customers;
drop policy "mvp_allow_all" on reservations;
drop policy "mvp_allow_all" on reservation_services;

-- ---------------------------------------------------------------------------
-- Tenant-scoped policy-lər: yalnız salonun sahibi (auth.uid() = owner_user_id)
-- öz salonunun məlumatına giriş/dəyişiklik edə bilər.
-- ---------------------------------------------------------------------------
create policy "owner_full_access" on barbershops for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "owner_full_access" on services for all
  using (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()))
  with check (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()));

create policy "owner_full_access" on customers for all
  using (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()))
  with check (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()));

create policy "owner_full_access" on reservations for all
  using (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()))
  with check (barbershop_id in (select id from barbershops where owner_user_id = auth.uid()));

create policy "owner_full_access" on reservation_services for all
  using (
    reservation_id in (
      select r.id from reservations r
      join barbershops b on b.id = r.barbershop_id
      where b.owner_user_id = auth.uid()
    )
  )
  with check (
    reservation_id in (
      select r.id from reservations r
      join barbershops b on b.id = r.barbershop_id
      where b.owner_user_id = auth.uid()
    )
  );
