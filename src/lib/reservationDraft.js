const STORAGE_PREFIX = 'reservationDraft:'

/**
 * Yeni rezerv formu yarımçıq doldurulub səhifədən çıxılsa da (tab bağlanması,
 * mobil brauzerin fonda səhifəni sıfırlaması və s.) məlumatın itməməsi üçün
 * localStorage-da saxlanılır. Rezerv uğurla yaradılanda clearReservationDraft
 * ilə silinir.
 */
function storageKey(barbershopId) {
  return `${STORAGE_PREFIX}${barbershopId}`
}

export function loadReservationDraft(barbershopId) {
  try {
    const raw = localStorage.getItem(storageKey(barbershopId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveReservationDraft(barbershopId, draft) {
  try {
    localStorage.setItem(storageKey(barbershopId), JSON.stringify(draft))
  } catch {
    // localStorage əlçatan olmaya bilər (məs. private mode) — sükutla keç
  }
}

export function clearReservationDraft(barbershopId) {
  try {
    localStorage.removeItem(storageKey(barbershopId))
  } catch {
    // yuxarıdakı kimi
  }
}
