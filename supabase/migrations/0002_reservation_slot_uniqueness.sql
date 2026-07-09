-- Tək barber eyni anda yalnız bir müştəriyə baxa bilər, ona görə eyni
-- (barbershop_id, date, time) üçün iki aktiv rezerv ola bilməz.
-- Ləğv edilmiş ("cancelled") rezervlər bu qaydadan istisnadır — o vaxt yeri
-- boşalır və yenidən bron edilə bilər.
create unique index if not exists reservations_barbershop_date_time_active_idx
  on reservations (barbershop_id, date, time)
  where status <> 'cancelled';
