-- Barber özü iş saatlarını (başlanğıc/son saat) və rezerv slotlarının
-- aralığını (dəqiqə) idarə edə bilsin deyə barbershops-a əlavə sahələr.
-- closing_time <= opening_time olarsa (məs. 13:00 – 00:00), bu, "gecə yarısından
-- sonra" mənasına gəlir — tətbiq tərəfində (generateTimeSlots) belə şərh olunur.
alter table barbershops
  add column if not exists opening_time time not null default '13:00:00',
  add column if not exists closing_time time not null default '00:00:00',
  add column if not exists slot_interval_minutes integer not null default 15 check (slot_interval_minutes > 0);
