-- WhatsApp təsdiq mesajı əvvəllər sabit (bütün salonlar üçün eyni) SALON_NAME/BARBER_NAME/
-- SALON_CONTACT_PHONE_DISPLAY sabitlərindən istifadə edirdi. Multi-tenant qeydiyyatdan sonra
-- hər salon öz brendləmə mətnini göstərməlidir — bunun üçün "hansı barberin kəsdiyi" məlumatı
-- lazımdır (`owner_phone` artıq mövcuddur, əlaqə nömrəsi kimi istifadə olunacaq).
alter table barbershops
  add column if not exists barber_name text;
