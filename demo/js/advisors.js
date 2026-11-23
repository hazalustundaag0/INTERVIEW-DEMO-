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
//              sektorler: string[] (ad), sektorKodlari: string[] (kod), avatarUrl: string ('' = baş harf), card: GuruCard }
//   Backend'de olmayan alanlar (puan, yorumlar, ücret, deneyim listesi, SSS …) VM'de YOKTUR;
//   ilgili bloklar gizlenir (K52). Fiyat hizmet/fiyat kuralından gelir (K53).
// Eski senkron API (listAdvisors / getAdvisor / getAdvisorCta / DEMO_ADVISORS) temizlik turunda kaldırıldı.
(function () {
  'use strict';
  const LANGUAGE_LABELS = { tr: 'Türkçe', en: 'English' };
  // Ülke ISO 3166-1 alpha-2 kodu (GAP-E6-21) → Türkçe ad (ör. TR → Türkiye); çevrilemezse kodun kendisi.
  function countryName(code) {
    if (!code) return '';
    try { return new Intl.DisplayNames(['tr'], { type: 'region' }).of(String(code).toUpperCase()) || code; } catch (error) { return code; }
  }

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

  // GAP-B23 (K83): avatar_url API tabanına göre göreli ('/public/gurus/{id}/avatar?v=…', /api/v1 öneki yok).
  // Tam adres = APP_CONFIG.apiBaseUrl + avatar_url. Katalog fotoğrafı kimliksizdir → <img src> ile doğrudan.
  // null/boş → '' (avatar.js baş harfleri çizer).
  function avatarUrl(path) {
    const value = String(path || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const base = String((window.Api && window.Api.config && window.Api.config.baseUrl) ||
      (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || '').replace(/\/+$/, '');
    return base + (value.startsWith('/') ? value : '/' + value);
  }

  // K102 (Etap 6): yalnız dev sunucusunda (APP_CONFIG.previewAllowed); Docker/sunucuda false.
  function isDevelopmentHost() {
    return Boolean(window.APP_CONFIG && window.APP_CONFIG.previewAllowed === true);
  }

  function toViewModel(card) {
    if (!card) return null;
    const name = [card.first_name, card.last_name].filter(Boolean).join(' ').trim();
    const sectors = Array.isArray(card.sectors) ? card.sectors : [];
    const shortBio = card.short_bio || '';
    return {
      id: card.id,
      ad: name,
      first_name: card.first_name || '',
      last_name: card.last_name || '',
      unvan: card.title || '',
      uzmanlikAlani: card.expertise_area || '',
      kidem: card.seniority || '',
      kisaTanitim: shortBio,
      hakkinda: shortBio,
      isSample: isDevelopmentHost() && /^Kurgusal guru\./i.test(shortBio),
      sektorler: sectors.map(sector => sector.name),
      sektorKodlari: sectors.map(sector => sector.code),
      avatarUrl: avatarUrl(card.avatar_url),
      // GAP-E6-21 (Etap 6, 60): GET /public/gurus(/{id}) → country, languages[] (tr|en), bio_tr, bio_en,
      // audiences[], career[{title, org, start_year, end_year|null}], documents[] (bu turda daima boş → bölüm gizli).
      ulke: countryName(card.country),
      dilKodlari: Array.isArray(card.languages) ? card.languages : [],
      diller: (Array.isArray(card.languages) ? card.languages : []).map(code => LANGUAGE_LABELS[code] || code),
      biyografi: { tr: card.bio_tr || '', en: card.bio_en || '' },
      hedefKitleler: Array.isArray(card.audiences) ? card.audiences : [],
      belgeler: (Array.isArray(card.documents) ? card.documents : []).filter(doc => doc && doc.status === 'verified'),
      kariyer: (Array.isArray(card.career) ? card.career : []).map(item => ({
        role: item.title || item.role || '', org: item.org || '',
        start: item.start_year || item.start || '', end: item.end_year || item.end || ''
      })),
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
    const servicePath = '/hizmet?guru=' + encodeURIComponent(guruId);
    if (session && session.role === 'danisman') {
      return hasFlowContext
        ? { hidden: true, label: '', href: '', disabled: false, title: '' }
        : { label: 'Seçip devam et', href: '', disabled: true, title: 'Danışman hesabıyla randevu alınamaz' };
    }
    if (session && session.role === 'danisan' && o.hasActiveEnrollment) {
      return { label: 'Randevu al', href: '/randevu/takvim', disabled: false, title: '' };
    }
    if (hasFlowContext && o.flow !== 'hikaye') {
      return { mode: 'browse', label: 'Satış hikâyeni oluştur →', href: '/danismanlar?akis=hikaye', disabled: false, title: '' };
    }
    if (!session || !session.role) {
      const registrationReturn = encodeURIComponent(servicePath);
      return {
        label: 'Bu danışmanla devam et',
        href: '/kayit?return=' + registrationReturn,
        loginHref: '/giris?return=' + registrationReturn,
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

  window.Advisors = Object.freeze({ list, get, sectors, toViewModel, cta, sectorCode, cached, avatarUrl });
})();
