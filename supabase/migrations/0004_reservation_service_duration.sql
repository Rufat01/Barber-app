-- Rezerv daxilində hər xidmətin öz müddəti ola bilsin deyə (bron/redaktə anındakı
-- müddət, servisin standart müddətindən fərqli ola bilər — məs. müştəriyə görə
-- 30 dəqiqəlik saç kəsimi bu dəfə 40 dəqiqə çəkəcəksə).
alter table reservation_services
  add column if not exists duration_minutes integer;
