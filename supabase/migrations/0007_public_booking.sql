-- Müştəri özünə-xidmət (qonaq, hesabsız) rezervasiya portalı üçün.
-- Əsas cədvəllərə heç bir anon SELECT/INSERT policy AÇILMIR (bax 0005-in
-- owner_full_access qərarı) — bunun əvəzinə iki dar SECURITY DEFINER funksiya
-- ilə yalnız lazım olan, təhlükəsiz əməliyyatlar açılır. Yalnız PII daşımayan
-- "salon kataloqu" məlumatı (salon + aktiv xidmətlər) üçün əlavə SELECT policy
-- qoyulur — bu, mövcud owner_full_access-i əvəz etmir, ona əlavə olunur.

create policy "public_read" on barbershops for select
  using (true);

create policy "public_read_active" on services for select
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- public_taken_times: verilmiş salon/tarix üçün tutulmuş vaxtları qaytarır.
-- Heç bir müştəri/rezerv identifikasiyası (id, ad, telefon) qaytarılmır.
-- ---------------------------------------------------------------------------
create or replace function public_taken_times(p_barbershop_id uuid, p_date date)
returns table (slot_time time, duration_minutes integer)
language sql
security definer
set search_path = public
as $$
  select r.time as slot_time, coalesce(max(rs.duration_minutes), max(s.duration_minutes), 0)::integer as duration_minutes
  from reservations r
  left join reservation_services rs on rs.reservation_id = r.id
  left join services s on s.id = rs.service_id
  where r.barbershop_id = p_barbershop_id
    and r.date = p_date
    and r.status <> 'cancelled'
  group by r.id, r.time;
$$;

grant execute on function public_taken_times(uuid, date) to anon;

-- ---------------------------------------------------------------------------
-- create_public_reservation: qonaq rezervasiyası yaradır. Müştərini
-- (barbershop_id, phone) üzrə upsert edir, qiymətləri client-dən gələn dəyərə
-- etibar etmədən `services` cədvəlindən yenidən hesablayır, sonra rezervi və
-- xidmət sətirlərini yaradır. Slot artıq tutulubsa (bax 0002-dəki unikal
-- indeks) '23505' xətası adi şəkildə yuxarı ötürülür.
-- ---------------------------------------------------------------------------
create or replace function create_public_reservation(
  p_barbershop_id uuid,
  p_full_name text,
  p_phone text,
  p_date date,
  p_time time,
  p_service_ids uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_reservation_id uuid;
  v_total_price numeric(10, 2);
begin
  insert into customers (barbershop_id, full_name, phone)
  values (p_barbershop_id, p_full_name, p_phone)
  on conflict (barbershop_id, phone)
  do update set full_name = excluded.full_name
  returning id into v_customer_id;

  select coalesce(sum(price), 0) into v_total_price
  from services
  where id = any(p_service_ids) and barbershop_id = p_barbershop_id and is_active = true;

  insert into reservations (barbershop_id, customer_id, date, time, status, total_price, whatsapp_status)
  values (p_barbershop_id, v_customer_id, p_date, p_time, 'confirmed', v_total_price, 'pending')
  returning id into v_reservation_id;

  insert into reservation_services (reservation_id, service_id, price_at_booking, duration_minutes)
  select v_reservation_id, s.id, s.price, s.duration_minutes
  from services s
  where s.id = any(p_service_ids) and s.barbershop_id = p_barbershop_id and s.is_active = true;

  return v_reservation_id;
end;
$$;

grant execute on function create_public_reservation(uuid, text, text, date, time, uuid[]) to anon;
