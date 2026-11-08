// js/advisors.js — Danışman (guru) kataloğu API adaptörü. Sahibi: 81 Frontend Platform.
// Kaynak: GET /public/gurus (sayfalı), GET /public/gurus/{id}, GET /public/sectors.
// Sahte danışman verisi (DEMO_ADVISORS) ve guruProfile birleştirmesi kaldırıldı (GAP-D08).
//
// Asenkron API (yeni kod bunu kullanmalı):
//   await Advisors.list({ sector, limit })  → AdvisorVM[]
//   await Advisors.get(guruId)              → AdvisorVM | null (404 → null)
//   await Advisors.sectors()                → [{ id, code, name, sort_order }]
//   Advisors.toViewModel(GuruCard)          → AdvisorVM
//   Advisors.cta(session, guruId, { hasActiveEnrollment, flow }) → CTA nesnesi (senkron)
//   Advisors.sectorCode(uiValue)            → eski UI kodlarını backend koduna çevirir
//   Advisors.cached(guruId)                 → önbellekteki VM | null (senkron)
//   cta: hasActiveEnrollment = adayın BU danışmanla aktif kaydı var mı (82 böyle hesaplar).
// AdvisorVM: { id, ad, first_name, last_name, unvan, uzmanlikAlani, kidem, kisaTanitim, hakkinda,
//              sektorler: string[] (ad), sektorKodlari: string[] (kod), card: GuruCard }
//   Backend'de olmayan alanlar (puan, yorumlar, ücret, deneyim listesi, SSS …) VM'de YOKTUR;
//   ilgili bloklar gizlenir (K52). Fiyat hizmet/fiyat kuralından gelir (K53).
// Eski senkron API (listAdvisors / getAdvisor / getAdvisorCta / DEMO_ADVISORS) temizlik turunda kaldırıldı.
(function () {
  'use strict';

  const LEGACY_SECTOR_CODES = {
    finance: 'finance_banking',
    retail: 'retail_fmcg',
    health: 'healthcare_pharma',
    production: 'manufacturing',
    tech: 'technology'
  };

  const cache = new Map();
  let sectorsPromise = null;

  function api() {
    if (!window.Api) throw new Error('js/advisors.js: api-client.js yüklenmemiş.');
    return window.Api;
  }

  function toViewModel(card) {
    if (!card) return null;
    const name = [card.first_name, card.last_name].filter(Boolean).join(' ').trim();
    const sectors = Array.isArray(card.sectors) ? card.sectors : [];
    return {
      id: card.id,
      ad: name,
      first_name: card.first_name || '',
      last_name: card.last_name || '',
      unvan: card.title || '',
      uzmanlikAlani: card.expertise_area || '',
      kidem: card.seniority || '',
      kisaTanitim: card.short_bio || '',
      hakkinda: card.short_bio || '',
      sektorler: sectors.map(sector => sector.name),
      sektorKodlari: sectors.map(sector => sector.code),
      card
    };
  }

  function remember(vm) {
    if (vm && vm.id) cache.set(vm.id, vm);
    return vm;
  }

  function sectorCode(value) {
    const key = String(value || '').trim().toLowerCase();
    return LEGACY_SECTOR_CODES[key] || key;
  }

  async function list(options) {
    const o = options || {};
    const query = { sector: o.sector ? sectorCode(o.sector) : undefined };
    const cards = o.limit
      ? (await api().page('/public/gurus', { query, limit: o.limit, auth: false })).items
      : await api().listAll('/public/gurus', { query, auth: false });
    return cards.map(card => remember(toViewModel(card)));
  }

  async function get(id) {
    if (!id) return null;
    try {
      const card = await api().get('/public/gurus/' + encodeURIComponent(id), { auth: false });
      return remember(toViewModel(card));
    } catch (error) {
      if (error && error.status === 404) return null;
      throw error;
    }
  }

  function sectors() {
    if (!sectorsPromise) {
      sectorsPromise = api().get('/public/sectors', { auth: false })
        .then(data => (data && data.items) || [])
        .catch(error => { sectorsPromise = null; throw error; });
    }
    return sectorsPromise;
  }

  // Danışman kartı/profilindeki ana CTA. hasActiveEnrollment sayfa tarafından
  // GET /candidate/enrollments ile belirlenir (eski demoOdemeAlindi bayrağının yerine).
  function cta(session, guruId, options) {
    const o = options || {};
    const hasFlowContext = Object.prototype.hasOwnProperty.call(o, 'flow');
    if (!guruId) {
      return { label: 'Seçip devam et', href: '', disabled: true, title: 'Danışman bulunamadı' };
    }
    const servicePath = 'hizmet.html?guru=' + encodeURIComponent(guruId);
    if (session && session.role === 'danisman') {
      return hasFlowContext
        ? { hidden: true, label: '', href: '', disabled: false, title: '' }
        : { label: 'Seçip devam et', href: '', disabled: true, title: 'Danışman hesabıyla randevu alınamaz' };
    }
    if (session && session.role === 'danisan' && o.hasActiveEnrollment) {
      return { label: 'Randevu al', href: 'takvim.html', disabled: false, title: '' };
    }
    if (hasFlowContext && o.flow !== 'hikaye') {
      return { mode: 'browse', label: 'Satış hikâyeni oluştur →', href: 'danismanlar.html?akis=hikaye', disabled: false, title: '' };
    }
    if (!session || !session.role) {
      const registrationReturn = encodeURIComponent(servicePath);
      return {
        label: 'Bu danışmanla devam et',
        href: 'kayit.html?return=' + registrationReturn,
        loginHref: 'giris.html?return=' + registrationReturn,
        disabled: false,
        title: ''
      };
    }
    return { label: 'Bu danışmanla devam et', href: servicePath, disabled: false, title: '' };
  }

  // cached(id): bu sayfada list/get ile daha önce alınmış VM (ağ çağrısı yapmaz).
  function cached(id) {
    return cache.get(id) || null;
  }

  window.Advisors = Object.freeze({ list, get, sectors, toViewModel, cta, sectorCode, cached });
})();
