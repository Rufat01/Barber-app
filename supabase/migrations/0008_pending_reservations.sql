-- Qonaq (ictimai portal) rezervasiyaları artıq avtomatik "confirmed" kimi
-- yaradılmır — barber özü təsdiqləməyənə qədər "pending" statusunda qalır və
-- adi (təsdiqlənmiş) cədvəldə göstərilmir. Slotu isə dərhal tutur, çünki
-- 0002-dəki unikal indeks bütün "cancelled" olmayan statuslara aiddir —
-- dəyişiklik tələb olunmur.

alter table reservations drop constraint if exists reservations_status_check;
alter table reservations add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

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
  values (p_barbershop_id, v_customer_id, p_date, p_time, 'pending', v_total_price, 'pending')
  returning id into v_reservation_id;

  insert into reservation_services (reservation_id, service_id, price_at_booking, duration_minutes)
  select v_reservation_id, s.id, s.price, s.duration_minutes
  from services s
  where s.id = any(p_service_ids) and s.barbershop_id = p_barbershop_id and s.is_active = true;

  return v_reservation_id;
end;
$$;

grant execute on function create_public_reservation(uuid, text, text, date, time, uuid[]) to anon;
