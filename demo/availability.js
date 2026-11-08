// availability.js — Slot / müsaitlik zaman yardımcıları. Sahibi: 81 Frontend Platform.
// Kullananlar: danisman (82), takvim (83), guru-musaitlik(-ekle) (84).
// API zamanları UTC RFC 3339'dur; ekranda Europe/Istanbul gösterilir; guru slot eklerken
// yerel tarih+saat → UTC'ye çevrilir. Sahte Ocak 2027 takvimi, demoMusaitlik ve DemoAvailability kaldırıldı (GAP-D05).
//
//   SlotTime.parts(iso)                  → { date:'YYYY-MM-DD', time:'HH:MM', weekday:0-6 } (İstanbul)
//   SlotTime.toUtcIso('2026-11-10','14:00') → '2026-11-10T11:00:00.000Z'
//   SlotTime.addMinutes(iso, 50)         → ISO
//   SlotTime.dateLabel(iso)              → '10 Kasım Salı'
//   SlotTime.timeRange(startIso, endIso) → '14:00 - 14:50'
//   SlotTime.weekStart(date|iso)         → 'YYYY-MM-DD' (Pazartesi, İstanbul)
//   SlotTime.addDays('YYYY-MM-DD', n)    → 'YYYY-MM-DD'
//   SlotTime.range(fromDate, days)       → { from: ISO, to: ISO } (sorgu parametreleri için)
//   SlotTime.groupByDate(slots)          → Map<'YYYY-MM-DD', slot[]>  (slot: Availability)
//   SlotTime.today()                     → 'YYYY-MM-DD' (İstanbul)
(function () {
  'use strict';
  const CONFIG = window.APP_CONFIG || {};
  const TZ = CONFIG.timeZone || 'Europe/Istanbul';
  const DURATION = Number(CONFIG.sessionDurationMinutes) || 50;
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  const partsFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short'
  });
  const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function toDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) throw new RangeError('Geçersiz tarih: ' + value);
    return d;
  }

  function rawParts(value) {
    return partsFormatter.formatToParts(toDate(value)).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  }

  function parts(value) {
    const p = rawParts(value);
    return {
      date: `${p.year}-${p.month}-${p.day}`,
      time: `${p.hour}:${p.minute}`,
      weekday: WEEKDAY_INDEX[p.weekday]
    };
  }

  // Saat diliminin verilen andaki UTC farkı (dakika).
  function offsetMinutes(date) {
    const p = rawParts(date);
    const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }

  // İstanbul yerel tarih + saat → UTC ISO.
  function toUtcIso(dateStr, timeStr) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    const [hh, mm] = String(timeStr).split(':').map(Number);
    if (![y, m, d, hh, mm].every(Number.isFinite)) throw new RangeError('Geçersiz tarih/saat.');
    const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
    const first = new Date(guess.getTime() - offsetMinutes(guess) * 60000);
    const adjusted = new Date(guess.getTime() - offsetMinutes(first) * 60000);
    return adjusted.toISOString();
  }

  function addMinutes(iso, minutes) {
    return new Date(toDate(iso).getTime() + minutes * 60000).toISOString();
  }

  function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
  }

  function today() {
    return parts(new Date()).date;
  }

  function weekStart(value) {
    const p = parts(value === undefined ? new Date() : (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? toUtcIso(value, '12:00') : value));
    return addDays(p.date, -((p.weekday + 6) % 7));
  }

  function dateLabel(iso) {
    const p = parts(iso);
    const [, month, day] = p.date.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${WEEKDAYS[p.weekday]}`;
  }

  function timeRange(startIso, endIso) {
    const start = parts(startIso).time;
    const end = endIso ? parts(endIso).time : parts(addMinutes(startIso, DURATION)).time;
    return `${start} - ${end}`;
  }

  function range(fromDate, days) {
    const from = fromDate || today();
    return { from: toUtcIso(from, '00:00'), to: toUtcIso(addDays(from, days || 7), '00:00') };
  }

  function groupByDate(slots) {
    const map = new Map();
    (slots || []).forEach(slot => {
      const key = parts(slot.starts_at).date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    });
    map.forEach(list => list.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)));
    return map;
  }

  window.SlotTime = Object.freeze({
    timeZone: TZ, durationMinutes: DURATION, months: MONTHS, weekdays: WEEKDAYS,
    parts, toUtcIso, addMinutes, addDays, today, weekStart, dateLabel, timeRange, range, groupByDate
  });
  // Eski DemoAvailability geçiş katmanı temizlik turunda kaldırıldı (hiçbir sayfa kullanmıyor).
})();
