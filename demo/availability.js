(function () {
  const durationMinutes = 50;
  const hoursByDate = {
    '2027-01-11': ['10:00', '14:00', '16:30'],
    '2027-01-12': ['09:00', '11:00', '14:00', '17:00'],
    '2027-01-13': ['11:00', '15:00'],
    '2027-01-14': ['10:00', '13:00', '14:00', '16:00', '18:00'],
    '2027-01-15': ['09:00', '11:00', '14:00'],
    '2027-01-16': ['10:00', '12:00'],
    '2027-01-18': ['09:00', '10:00', '13:00', '15:00', '17:00'],
    '2027-01-19': ['11:00', '14:00', '16:00'],
    '2027-01-20': ['10:00', '12:00', '15:00', '18:00'],
    '2027-01-21': ['09:00', '13:00', '17:00'],
    '2027-01-22': ['10:00', '14:00', '16:00'],
    '2027-01-25': ['09:00', '11:00', '14:00', '17:00'],
    '2027-01-26': ['10:00', '13:00', '15:00'],
    '2027-01-27': ['11:00', '14:00', '18:00'],
    '2027-01-28': ['09:00', '12:00', '16:00'],
    '2027-01-29': ['10:00', '13:00']
  };

  function endTime(start) {
    const [hour, minute] = start.split(':').map(Number);
    const end = hour * 60 + minute + durationMinutes;
    return String(Math.floor(end / 60)).padStart(2, '0') + ':' + String(end % 60).padStart(2, '0');
  }

  function createDefaultSlots() {
    return Object.entries(hoursByDate).flatMap(([date, starts]) => starts.map(start => {
      const reserved = date === '2027-01-11' && start === '14:00';
      return {
        id: 'sample-' + date.replace(/-/g, '') + '-' + start.replace(':', ''),
        tarih: date,
        bas: start,
        bit: endTime(start),
        durum: reserved ? 'rezerve' : 'musait',
        ...(reserved ? { aday: 'Elif Yılmaz' } : {})
      };
    }));
  }

  function migrateLegacySlots(slots, defaults) {
    const legacyIds = new Set(['m1', 'm2', 'm3', 'm4']);
    const legacySlots = slots.filter(slot => legacyIds.has(slot.id));
    if (!legacySlots.length) return null;

    const migratedDefaults = defaults.map(function (slot) {
      const previous = legacySlots.find(item => item.tarih === slot.tarih && item.bas === slot.bas);
      return previous ? { ...slot, durum: previous.durum, ...(previous.aday ? { aday: previous.aday } : {}) } : slot;
    });
    const customSlots = slots.filter(slot => !legacyIds.has(slot.id));
    return migratedDefaults.concat(customSlots);
  }

  function validSlots(slots) {
    return Array.isArray(slots) && !slots.some(function (slot) {
      return !slot || typeof slot.id !== 'string' || typeof slot.tarih !== 'string' ||
        typeof slot.bas !== 'string' || typeof slot.bit !== 'string' ||
        !['musait', 'rezerve'].includes(slot.durum);
    });
  }

  function loadSlots(storageKey) {
    const defaults = createDefaultSlots();
    let saved;
    try {
      saved = localStorage.getItem(storageKey);
    } catch (error) {
      console.error(storageKey + ' verisi tarayıcı depolama alanından okunamadı; varsayılan veriler kullanılıyor.', error);
      return defaults;
    }
    if (saved === null) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(defaults));
      } catch (error) {
        console.error(storageKey + ' varsayılan verisi tarayıcı depolama alanına yazılamadı.', error);
      }
      return defaults;
    }

    try {
      const slots = JSON.parse(saved);
      if (!validSlots(slots)) throw new TypeError(storageKey + ' verisi geçersiz.');
      const migrated = migrateLegacySlots(slots, defaults);
      if (migrated) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(migrated));
        } catch (error) {
          console.error(storageKey + ' güncellenen verisi kaydedilemedi.', error);
        }
        return migrated;
      }
      return slots;
    } catch (error) {
      console.error(storageKey + ' verisi okunamadı; varsayılan müsaitlikler yükleniyor.', error);
      try {
        localStorage.setItem(storageKey, JSON.stringify(defaults));
      } catch (storageError) {
        console.error(storageKey + ' varsayılan verisi tarayıcı depolama alanına yazılamadı.', storageError);
      }
      return defaults;
    }
  }

  function saveSlots(storageKey, slots) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(slots));
      return true;
    } catch (error) {
      console.error(storageKey + ' verisi tarayıcı depolama alanına yazılamadı.', error);
      return false;
    }
  }

  window.DemoAvailability = Object.freeze({
    hoursByDate: Object.freeze(hoursByDate),
    durationMinutes,
    createDefaultSlots,
    endTime,
    loadSlots,
    saveSlots
  });
})();
