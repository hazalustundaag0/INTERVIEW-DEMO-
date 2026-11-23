// onizleme-veri.js — Yerel önizleme modu için sahte API yanıtları (yalnız localhost, ?onizleme=aday).
// api-client.js, window.APP_PREVIEW açıkken bu dosyayı yükler ve isteği burada yanıtlar; eşleşmeyen
// istekler gerçek sunucuya gider. Tüm kişiler ve içerikler kurgusaldır; gerçek veri yoktur.
// Kaldırmak için bu dosyayı ve api-client.js'teki "Önizleme" bloğunu silmek yeterli.
(function () {
  'use strict';

  const DAY = 86400000;
  const now = Date.now();
  // İstanbul saatiyle belirli bir güne/saate ISO (UTC+3, yaz saati yok).
  function at(dayOffset, hour, minute) {
    const d = new Date(now + dayOffset * DAY);
    const ymd = new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 10);
    return new Date(ymd + 'T' + String(hour).padStart(2, '0') + ':' + String(minute || 0).padStart(2, '0') + ':00+03:00').toISOString();
  }
  function plus(iso, minutes) { return new Date(new Date(iso).getTime() + minutes * 60000).toISOString(); }

  const IDS = {
    candidate: '00000000-0000-4000-8000-000000000001',
    enrollment: '00000000-0000-4000-8000-000000000002',
    service: '00000000-0000-4000-8000-000000000003',
    price: '00000000-0000-4000-8000-000000000004',
    story: '00000000-0000-4000-8000-000000000005',
    draft1: '00000000-0000-4000-8000-000000000006',
    draft2: '00000000-0000-4000-8000-000000000007',
    cv: '00000000-0000-4000-8000-000000000008'
  };

  const sectors = [
    { id: 'pv-sek-1', code: 'technology', name: 'Teknoloji', sort_order: 1 },
    { id: 'pv-sek-2', code: 'finance', name: 'Finans', sort_order: 2 },
    { id: 'pv-sek-3', code: 'retail', name: 'Perakende', sort_order: 3 },
    { id: 'pv-sek-4', code: 'consulting', name: 'Danışmanlık', sort_order: 4 }
  ];

  const gurus = [
    { id: '00000000-0000-4000-8000-000000000009', first_name: 'Deniz', last_name: 'Kurgu', title: 'Kariyer Koçu', expertise_area: 'Kariyer geçişi ve mülakat hazırlığı', seniority: '12 yıl deneyim', short_bio: 'Teknoloji ve danışmanlık sektörlerinde işe alım yaptı. Adayların deneyimlerini net ve ölçülebilir bir hikâyeye dönüştürmelerine yardım ediyor.', sectors: [sectors[0], sectors[3]], avatar_url: null },
    { id: '00000000-0000-4000-8000-000000000010', first_name: 'Ece', last_name: 'Arslan', title: 'İK Direktörü', expertise_area: 'Yönetici adaylığı ve liderlik mülakatları', seniority: '15 yıl deneyim', short_bio: 'Finans sektöründe yönetici işe alım süreçlerini yönetti. Liderlik hikâyelerinde etkiyi öne çıkarmaya odaklanıyor.', sectors: [sectors[1]], avatar_url: null },
    { id: '00000000-0000-4000-8000-000000000011', first_name: 'Mert', last_name: 'Aydın', title: 'Satış Lideri', expertise_area: 'Satış ve müşteri odaklı roller', seniority: '10 yıl deneyim', short_bio: 'Perakende ve teknoloji satış ekiplerini büyüttü. Kısa ve akılda kalan tanıtım konuşmaları üzerine çalışıyor.', sectors: [sectors[2], sectors[0]], avatar_url: null },
    { id: '00000000-0000-4000-8000-000000000012', first_name: 'Selin', last_name: 'Kaya', title: 'Yetenek Danışmanı', expertise_area: 'Yeni mezunlar ve ilk iş başvuruları', seniority: '8 yıl deneyim', short_bio: 'Üniversite kariyer merkezleriyle çalıştı. Staj ve proje deneyimlerini iş diline çevirmeye yardım ediyor.', sectors: [sectors[3]], avatar_url: null },
    { id: '00000000-0000-4000-8000-000000000041', first_name: 'Burak', last_name: 'Şen', title: 'Teknoloji Lideri', expertise_area: 'Mühendislikten yöneticiliğe geçiş', seniority: '14 yıl deneyim', short_bio: 'Yazılım ekiplerini büyüttü ve yönetici adaylarının mülakatlarına katıldı. Teknik başarıları iş etkisiyle anlatmaya odaklanıyor.', sectors: [sectors[0]], avatar_url: null },
    { id: '00000000-0000-4000-8000-000000000042', first_name: 'Zeynep', last_name: 'Ak', title: 'Pazarlama Direktörü', expertise_area: 'Marka, pazarlama ve iletişim rolleri', seniority: '11 yıl deneyim', short_bio: 'Perakende ve finans markalarında pazarlama ekiplerini yönetti. Kampanya sonuçlarını kısa ve ölçülebilir bir hikâyeye çevirmeye yardım ediyor.', sectors: [sectors[2], sectors[1]], avatar_url: null }
  ];

  // Rapor V1 profil alanları için kurgusal örnekler (yalnız yerel önizleme). Kurum adları da kurgusaldır.
  const guruExtras = {
    Deniz: { country: 'Türkiye', languages: ['Türkçe', 'İngilizce'], audiences: ['Profesyoneller', 'Yönetici adayları'],
      bio_tr: 'On iki yıldır teknoloji ve danışmanlık şirketlerinde işe alım ve kariyer gelişimi alanında çalışıyorum. Yüzlerce mülakatta aday değerlendirdim; adayların çoğunun deneyimi güçlü olsa da bunu kısa ve ölçülebilir bir hikâyeye dönüştürmekte zorlandığını gördüm. Seanslarda önce hedef rolünü ve seni bu role taşıyacak iki üç anı birlikte seçiyoruz. Ardından bu anları "durum, eylem, sonuç" çizgisinde netleştiriyor, rakamla destekleyebileceğin yerleri işaretliyoruz. İkinci seansta hikâyeni sesli prova ediyor, süreyi ve vurguları birlikte ayarlıyoruz.',
      bio_en: 'For twelve years I have worked in recruitment and career development at technology and consulting firms. In our sessions we first choose your target role and the two or three moments that best support it, then shape them into a clear situation–action–result line and rehearse it together.',
      documents: [
        { title: 'Profesyonel Koçluk Sertifikası', issuer: 'Örnek Koçluk Enstitüsü', year: 2019, status: 'verified' },
        { title: 'İnsan Kaynakları Yönetimi Yüksek Lisans Diploması', issuer: 'Örnek Üniversitesi', year: 2015, status: 'verified' },
        { title: 'Yetkinlik Bazlı Mülakat Eğitimi', issuer: 'Örnek Akademi', year: 2021, status: 'pending' }
      ],
      career: [
        { role: 'Kariyer Koçu (bağımsız)', org: 'Serbest', start: 2021, end: null },
        { role: 'İşe Alım Müdürü', org: 'Örnek Teknoloji A.Ş.', start: 2016, end: 2021 },
        { role: 'İK Uzmanı', org: 'Örnek Danışmanlık Ltd.', start: 2013, end: 2016 }
      ] },
    Ece: { country: 'Türkiye', languages: ['Türkçe', 'İngilizce'], audiences: ['Yönetici adayları'],
      bio_tr: 'Finans sektöründe on beş yıl boyunca yönetici işe alım süreçlerini yönettim. Yönetici adaylarıyla çalışırken liderlik deneyimini kanıtlarla anlatmaya, karar etkisini ve ekip sonuçlarını öne çıkarmaya odaklanıyorum.',
      documents: [{ title: 'Yönetici Koçluğu Sertifikası', issuer: 'Örnek Liderlik Okulu', year: 2018, status: 'verified' }],
      career: [{ role: 'İK Direktörü', org: 'Örnek Finans A.Ş.', start: 2017, end: null }, { role: 'Yetenek Kazanım Müdürü', org: 'Örnek Banka', start: 2011, end: 2017 }] },
    Mert: { country: 'Türkiye', languages: ['Türkçe'], audiences: ['Profesyoneller'],
      documents: [{ title: 'Satış Liderliği Programı', issuer: 'Örnek İşletme Okulu', year: 2020, status: 'verified' }],
      career: [{ role: 'Satış Lideri', org: 'Örnek Perakende A.Ş.', start: 2018, end: null }] },
    Selin: { country: 'Türkiye', languages: ['Türkçe', 'İngilizce'], audiences: ['Üniversiteliler ve yeni mezunlar'],
      career: [{ role: 'Yetenek Danışmanı', org: 'Örnek Kariyer Merkezi', start: 2018, end: null }] },
    Burak: { country: 'Türkiye', languages: ['Türkçe', 'İngilizce'], audiences: ['Profesyoneller', 'Yönetici adayları'] },
    Zeynep: { country: 'Türkiye', languages: ['Türkçe'], audiences: ['Profesyoneller'] }
  };
  gurus.forEach(g => Object.assign(g, guruExtras[g.first_name] || {}));
  const guru = gurus[0];

  const templates = [
    { id: 'pv-sab-1', service_id: IDS.service, sequence_no: 1, title: 'Keşif seansı', purpose: 'Hedefini, deneyimlerini ve hikâyende öne çıkacak noktaları birlikte belirlersiniz.', output_definition: 'Danışman notu ve Hikâye Aracı için başlangıç yönlendirmesi' },
    { id: 'pv-sab-2', service_id: IDS.service, sequence_no: 2, title: 'Prova seansı', purpose: 'Hazırladığın hikâyeyi danışmanınla prova eder, son düzeltmeleri yaparsınız.', output_definition: 'Son sürüm satış hikâyesi ve mülakat cevapları' }
  ];
  const price = { id: IDS.price, service_id: IDS.service, amount_minor: 450000, currency: 'TRY', valid_from: at(-60, 0), valid_until: null, note: null, created_at: at(-60, 0) };
  const service = {
    id: IDS.service, code: 'sales-story', name: 'Satış Hikâyesi Programı',
    description: 'İki danışman seansı ve arada Hikâye Aracı ile kendi çalışman. Sonunda CV’ne, mülakat cevaplarına ve networking tanıtımına dönüşen bir satış hikâyen olur.',
    session_count: 2, session_duration_minutes: 60, is_active: true, sort_order: 1,
    created_at: at(-90, 0), updated_at: at(-30, 0), templates, price
  };

  const user = {
    id: IDS.candidate, first_name: 'Elif', last_name: 'Demir', email: 'elif.demir@example.test',
    role: 'candidate', status: 'active', preferred_language: 'tr', email_verified_at: at(-20, 10),
    password_set: true, last_login_at: at(0, 9), avatar_url: null, created_at: at(-20, 10), updated_at: at(-2, 10)
  };

  const enrollment = {
    id: IDS.enrollment, candidate_id: IDS.candidate, service_id: IDS.service, guru_id: guru.id,
    pricing_rule_id: IDS.price, session_count: 2, session_duration_minutes: 60,
    amount_minor: price.amount_minor, currency: 'TRY', status: 'active',
    purchase_confirmed_at: at(-14, 11), activated_at: at(-14, 11), completed_at: null, cancelled_at: null, created_at: at(-14, 11)
  };

  const s1Start = at(-6, 14);
  const sessions = [
    { id: '00000000-0000-4000-8000-000000000013', enrollment_id: IDS.enrollment, sequence_no: 1, availability_id: 'pv-slot-0', scheduled_start_at: s1Start, scheduled_end_at: plus(s1Start, 60), status: 'completed', completed_at: plus(s1Start, 60), cancelled_at: null },
    { id: '00000000-0000-4000-8000-000000000014', enrollment_id: IDS.enrollment, sequence_no: 2, availability_id: null, scheduled_start_at: null, scheduled_end_at: null, status: 'not_scheduled', completed_at: null, cancelled_at: null }
  ];

  const assignments = [
    { id: '00000000-0000-4000-8000-000000000015', enrollment_id: IDS.enrollment, guru_id: guru.id, enrollment_session_id: '00000000-0000-4000-8000-000000000013', kind: 'homework', title: 'Hikâyeni Hikâye Aracı’nda yaz', description: 'Konuştuğumuz proje deneyimini kendi cümlelerinle yaz. Önerileri inceledikten sonra onayladığın sürümü bana gönder.', due_at: at(3, 23, 59), status: 'open', has_submission_file: false, submission_text: null, submitted_at: null, reviewed_at: null, cancelled_at: null, created_at: plus(s1Start, 70), updated_at: plus(s1Start, 70) },
    { id: '00000000-0000-4000-8000-000000000016', enrollment_id: IDS.enrollment, guru_id: guru.id, enrollment_session_id: '00000000-0000-4000-8000-000000000013', kind: 'document_request', title: 'Güncel CV’ni yükle', description: 'Hikâyendeki tarih ve unvanların CV ile uyumlu olduğunu kontrol edebilmemiz için güncel CV’ni ekle.', due_at: at(-2, 23, 59), status: 'reviewed', has_submission_file: true, submission_text: 'Son projeyi de ekleyerek güncelledim.', submitted_at: at(-4, 20), reviewed_at: at(-3, 10), cancelled_at: null, created_at: plus(s1Start, 70), updated_at: at(-3, 10) }
  ];

  const story = {
    id: IDS.story, enrollment_id: IDS.enrollment, status: 'CANDIDATE_EDITED', status_before_pause: null,
    target_context_id: '00000000-0000-4000-8000-000000000020', question_set_id: null, prompt_config_id: 'pv-istem-1', current_question_id: null,
    last_screen: 'hikaye-oneriler', final_story_draft_id: null, final_approved_at: null,
    started_at: at(-5, 19), paused_at: null, completed_at: null, cancelled_at: null, updated_at: at(-1, 21)
  };

  const storyText = 'Üç yıldır bir e-ticaret şirketinde ürün analisti olarak çalışıyorum. Geçen yıl sepet terk oranı yüzde 70’e çıkmıştı ve ekip nedenini bilmiyordu. Kullanıcı oturumlarını inceleyip ödeme adımındaki üç sorunu buldum. Tasarım ve yazılım ekipleriyle iki haftalık bir deneme planladık. Deneme sonunda sepet terk oranı yüzde 58’e düştü ve bu değişiklik tüm kullanıcılara açıldı. Bu süreçte veriyi farklı ekiplere anlaşılır biçimde anlatmayı öğrendim; şimdi bunu ürün yöneticisi olarak daha büyük ölçekte yapmak istiyorum.';
  const drafts = [
    { id: IDS.draft1, story_session_id: IDS.story, version_no: 1, created_by: 'candidate', based_on_draft_id: null, skeleton: { character: 'Ürün analisti', goal: 'Sepet terk oranını düşürmek', challenge: 'Ekip sorunun nedenini bilmiyordu', solution: 'Oturum analizi ve iki haftalık deneme' }, story_text: storyText.split('. ').slice(0, 4).join('. ') + '.', has_external_file: false, word_count: 48, created_at: at(-5, 20) },
    { id: IDS.draft2, story_session_id: IDS.story, version_no: 2, created_by: 'ai', based_on_draft_id: IDS.draft1, skeleton: { character: 'Ürün analisti', goal: 'Sepet terk oranını düşürmek', challenge: 'Ekip sorunun nedenini bilmiyordu', solution: 'Oturum analizi, ekipler arası deneme ve ölçülebilir sonuç' }, story_text: storyText, has_external_file: false, word_count: 84, created_at: at(-1, 21) }
  ];
  const outputs = [
    { id: 'pv-cikti-1', draft_id: IDS.draft2, output_type: 'skeleton', version_no: 1, item_no: 1, content: 'Karakter: Ürün analisti\nHedef: Sepet terk oranını düşürmek\nZorluk: Sorunun nedeni bilinmiyordu\nÇözüm: Oturum analizi ve iki haftalık deneme\nSonuç: Oran %70’ten %58’e indi', created_at: at(-1, 21) },
    { id: 'pv-cikti-2', draft_id: IDS.draft2, output_type: 'story', version_no: 1, item_no: 1, content: storyText, created_at: at(-1, 21) },
    { id: 'pv-cikti-3', draft_id: IDS.draft2, output_type: 'short_summary', version_no: 1, item_no: 1, content: 'Veriyle sorunun kaynağını bulup ekipleri ortak bir denemede buluşturan bir ürün analistiyim; son projemde sepet terk oranını 12 puan düşürdük.', created_at: at(-1, 21) },
    { id: 'pv-cikti-4', draft_id: IDS.draft2, output_type: 'interview_answer', version_no: 1, item_no: 1, content: 'Kendinden bahseder misin? — Üç yıldır e-ticarette ürün analistiyim. En son, ödeme adımındaki üç sorunu bulup tasarım ve yazılım ekipleriyle bir deneme yürüttüm; sepet terk oranı %70’ten %58’e indi.', created_at: at(-1, 21) },
    { id: 'pv-cikti-5', draft_id: IDS.draft2, output_type: 'cv_summary', version_no: 1, item_no: 1, content: 'Ödeme akışındaki sorunları oturum analiziyle tespit edip ekipler arası deneme yürüttü; sepet terk oranını %70’ten %58’e düşürdü.', created_at: at(-1, 21) }
  ];
  const notes = [
    { id: '00000000-0000-4000-8000-000000000018', story_session_id: IDS.story, guru_id: guru.id, note_kind: 'first_session_note', story_draft_id: null, sentence_no: null, note_text: 'Sepet terk oranı projesi hikâyenin merkezi olsun. Sonucu rakamla ver ve neden ürün yöneticiliğine geçmek istediğini son cümlede bağla.', is_visible_to_candidate: true, created_at: plus(s1Start, 65), updated_at: plus(s1Start, 65) },
    { id: '00000000-0000-4000-8000-000000000019', story_session_id: IDS.story, guru_id: guru.id, note_kind: 'feedback', story_draft_id: IDS.draft1, sentence_no: null, note_text: 'İlk sürüm güzel başlamış. Ekiplerle nasıl çalıştığını bir cümleyle daha açarsan liderlik tarafın da görünür.', is_visible_to_candidate: true, created_at: at(-4, 11), updated_at: at(-4, 11) }
  ];

  const profileForm = [
    { id: 'pv-alan-1', field_key: 'target_position', label: 'Hedeflediğin pozisyon', help_text: 'Başvurmak istediğin rolü yaz.', field_type: 'free_text', maps_to_column: 'target_position', allows_free_text: true, is_required: true, sort_order: 1, is_active: true, options: [] },
    { id: 'pv-alan-2', field_key: 'sector', label: 'Sektör', help_text: null, field_type: 'single_choice', maps_to_column: 'sector', allows_free_text: false, is_required: true, sort_order: 2, is_active: true, options: sectors.map((s, i) => ({ id: 'pv-sec-' + i, field_id: 'pv-alan-2', value: s.code, label: s.name, sort_order: i, is_active: true })) },
    { id: 'pv-alan-3', field_key: 'seniority', label: 'Kıdem', help_text: null, field_type: 'single_choice', maps_to_column: 'seniority', allows_free_text: false, is_required: true, sort_order: 3, is_active: true, options: [['student', 'Üniversiteli / yeni mezun'], ['mid', 'Profesyonel'], ['senior', 'Yönetici adayı']].map((o, i) => ({ id: 'pv-kid-' + i, field_id: 'pv-alan-3', value: o[0], label: o[1], sort_order: i, is_active: true })) },
    { id: 'pv-alan-4', field_key: 'participation_reason', label: 'Neden katılıyorsun?', help_text: null, field_type: 'free_text', maps_to_column: 'participation_reason', allows_free_text: true, is_required: false, sort_order: 4, is_active: true, options: [] }
  ];
  const profile = {
    candidate_id: IDS.candidate, is_profile_completed: true, profile_completed_at: at(-13, 12),
    context: { id: '00000000-0000-4000-8000-000000000020', target_position: 'Ürün Yöneticisi', sector: 'technology', seniority: 'mid', participation_reason: 'Mülakatlarda deneyimimi daha net anlatmak istiyorum.', free_text: null, extra_answers: {}, completed_at: at(-13, 12), updated_at: at(-13, 12) },
    answers: { target_position: 'Ürün Yöneticisi', sector: 'technology', seniority: 'mid', participation_reason: 'Mülakatlarda deneyimimi daha net anlatmak istiyorum.' },
    labeled: [
      { field_key: 'target_position', label: 'Hedeflediğin pozisyon', field_type: 'free_text', options: [], text: 'Ürün Yöneticisi' },
      { field_key: 'sector', label: 'Sektör', field_type: 'single_choice', options: [{ value: 'technology', label: 'Teknoloji' }], text: null },
      { field_key: 'seniority', label: 'Kıdem', field_type: 'single_choice', options: [{ value: 'mid', label: 'Profesyonel' }], text: null },
      { field_key: 'participation_reason', label: 'Neden katılıyorsun?', field_type: 'free_text', options: [], text: 'Mülakatlarda deneyimimi daha net anlatmak istiyorum.' }
    ],
    avatar_url: null
  };
  const cv = {
    id: IDS.cv, entry_method: 'upload', has_file: true, file_type: 'pdf', extraction_status: 'succeeded',
    experience: [
      { company: 'Örnek E-Ticaret A.Ş.', title: 'Ürün Analisti', start_date: '2023-02', end_date: null, description: 'Ödeme akışı analizi, A/B testleri, ürün metrikleri' },
      { company: 'Örnek Yazılım Ltd.', title: 'Veri Analisti Stajyeri', start_date: '2022-06', end_date: '2022-12', description: 'Raporlama panelleri' }
    ],
    education: [{ school: 'Örnek Üniversitesi', degree: 'Lisans', field: 'Endüstri Mühendisliği', start_date: '2018-09', end_date: '2022-06' }],
    skills: ['SQL', 'Ürün analitiği', 'A/B testi', 'Paydaş yönetimi'],
    approved_at: at(-12, 18), created_at: at(-12, 17), updated_at: at(-12, 18)
  };

  const consentKinds = ['kvkk_disclosure', 'explicit_consent', 'guru_visibility', 'terms'];
  const consentTitles = { kvkk_disclosure: 'KVKK Aydınlatma Metni', explicit_consent: 'Açık Rıza Metni', guru_visibility: 'Danışman Görünürlük İzni', terms: 'Kullanım Koşulları' };
  const consentTexts = consentKinds.map((kind, i) => ({ id: 'pv-metin-' + i, kind, version: 1, language: 'tr', title: consentTitles[kind], body: 'Bu metin önizleme amaçlıdır; gerçek metin yayın öncesinde hukuk ekibince sağlanır.', published_at: at(-90, 0) }));
  const consents = consentKinds.map((kind, i) => ({ kind, current_text: consentTexts[i], active: { id: 'pv-izin-' + i, kind, consent_text_id: consentTexts[i].id, granted_at: at(-14, 10), revoked_at: null }, up_to_date: true }));

  function slots() {
    const items = [];
    for (let d = 1; d <= 14; d += 1) {
      [10, 14, 16].forEach((h, i) => {
        const start = at(d, h);
        const wd = new Date(start).getUTCDay();
        if (wd === 0 || wd === 6) return;
        items.push({ id: 'pv-slot-' + d + '-' + i, guru_id: guru.id, starts_at: start, ends_at: plus(start, 60), is_available: (d + i) % 3 !== 0 });
      });
    }
    return items;
  }

  const notifications = [
    { id: 'pv-bil-1', kind: 'guru_note', title: 'Danışmanından yeni not', body: 'Deniz Kurgu ilk sürümüne geri bildirim bıraktı.', read_at: null, created_at: at(-4, 11) },
    { id: 'pv-bil-2', kind: 'session_reminder', title: '2. seansını planla', body: 'Prova seansı için danışmanının takviminden bir saat seç.', read_at: null, created_at: at(0, 9) }
  ];

  const payment = { id: '00000000-0000-4000-8000-000000000017', enrollment_id: IDS.enrollment, user_id: IDS.candidate, amount_minor: price.amount_minor, currency: 'TRY', payment_method: 'card', provider: 'onizleme', provider_reference: 'ONIZLEME-0001', status: 'PAID', failure_code: null, failure_message: null, paid_at: at(-14, 11), failed_at: null, refunded_at: null, last_checked_at: at(-14, 11), created_at: at(-14, 11), updated_at: at(-14, 11) };
  const list = items => ({ items, next_cursor: null });

  // ── Danışman önizlemesi (?onizleme=danisman): müsaitlik takvimi için örnek veriler ──
  const guruUser = Object.assign({}, user, { id: guru.id, first_name: guru.first_name, last_name: guru.last_name, email: 'deniz.kurgu@example.test', role: 'guru' });
  const otherCandidate = { id: '00000000-0000-4000-8000-000000000031', first_name: 'Kerem', last_name: 'Yıldız', avatar_url: null };
  const otherEnrollment = Object.assign({}, enrollment, { id: '00000000-0000-4000-8000-000000000032', candidate_id: otherCandidate.id, created_at: at(-9, 10) });
  const otherStart = at(2, 14);
  const guruSessions = {
    [IDS.enrollment]: sessions,
    [otherEnrollment.id]: [
      { id: '00000000-0000-4000-8000-000000000033', enrollment_id: otherEnrollment.id, sequence_no: 1, availability_id: null, scheduled_start_at: otherStart, scheduled_end_at: plus(otherStart, 60), status: 'scheduled', completed_at: null, cancelled_at: null },
      { id: '00000000-0000-4000-8000-000000000034', enrollment_id: otherEnrollment.id, sequence_no: 2, availability_id: null, scheduled_start_at: null, scheduled_end_at: null, status: 'not_scheduled', completed_at: null, cancelled_at: null }
    ]
  };
  const guruClients = [
    { enrollment, candidate: { id: IDS.candidate, first_name: user.first_name, last_name: user.last_name, avatar_url: null }, story_session_id: IDS.story, story_status: story.status },
    { enrollment: otherEnrollment, candidate: otherCandidate, story_session_id: null, story_status: 'PROFILE_COMPLETED' }
  ];
  function guruAvailability(query) {
    const from = query.from ? Date.parse(query.from) : now - 7 * DAY;
    const to = query.to ? Date.parse(query.to) : now + 30 * DAY;
    const items = [];
    for (let d = -7; d <= 45; d += 1) {
      [10, 11, 14, 16].forEach((h, i) => {
        const start = at(d, h);
        const wd = new Date(start).getUTCDay();
        if (wd === 0 || wd === 6 || (d + i) % 3 === 0) return;
        const t = Date.parse(start);
        if (t < from || t >= to) return;
        items.push({ id: 'pv-g-slot-' + d + '-' + i, guru_id: guru.id, starts_at: start, ends_at: plus(start, 60), is_available: true });
      });
    }
    return items;
  }
  function notFound() { const e = new Error('Önizlemede bu kayıt yok.'); e.previewStatus = 404; throw e; }

  const guruRoutes = [
    ['GET', /^\/auth\/me$/, () => ({ user: guruUser, client_type: 'guru', token_expires_at: new Date(now + DAY).toISOString() })],
    ['GET', /^\/guru\/availability$/, (p, q) => list(guruAvailability(q))],
    ['GET', /^\/guru\/clients$/, () => list(guruClients)],
    ['GET', /^\/guru\/enrollments\/([^/]+)\/sessions$/, p => list(guruSessions[p[1]] || [])],
    ['GET', /^\/guru\/enrollments\/([^/]+)$/, p => {
      const c = guruClients.find(x => x.enrollment.id === p[1]);
      return c ? { enrollment: c.enrollment, candidate: c.candidate, sessions: guruSessions[p[1]] || [] } : notFound();
    }],
    ['GET', /^\/public\/gurus\/([^/]+)$/, p => gurus.find(g => g.id === p[1]) || notFound()]
  ];

  // [yöntem, desen, işleyici(params, query, body)]
  const routes = [
    ['GET', /^\/auth\/me$/, () => ({ user, client_type: 'candidate', token_expires_at: new Date(now + DAY).toISOString() })],
    ['POST', /^\/auth\/logout(-all)?$/, () => null],
    ['GET', /^\/me\/consents$/, () => list(consents)],
    ['POST', /^\/me\/consents$/, () => null],
    ['GET', /^\/me\/notifications$/, () => list(notifications)],
    ['POST', /^\/me\/notifications\/[^/]+\/read$/, () => null],
    ['GET', /^\/public\/sectors$/, () => list(sectors)],
    ['GET', /^\/public\/gurus$/, () => list(gurus)],
    ['GET', /^\/public\/gurus\/([^/]+)$/, p => gurus.find(g => g.id === p[1]) || notFound()],
    ['GET', /^\/public\/services$/, () => list([service])],
    ['GET', /^\/public\/services\/([^/]+)$/, p => (p[1] === service.id || p[1] === service.code) ? service : notFound()],
    ['GET', /^\/public\/consent-texts$/, () => list(consentTexts)],
    ['GET', /^\/public\/consent-texts\/([^/]+)$/, p => consentTexts.find(t => t.kind === p[1]) || notFound()],
    ['GET', /^\/candidate\/checkout\/preview$/, (p, q) => {
      const g = gurus.find(x => x.id === q.guru_id) || guru;
      return { service, templates, guru: g, session_count: 2, session_duration_minutes: 60, amount_minor: price.amount_minor, currency: 'TRY', pricing_rule_id: price.id };
    }],
    ['GET', /^\/candidate\/enrollments$/, () => list([enrollment])],
    ['GET', /^\/candidate\/enrollments\/([^/]+)$/, () => ({ enrollment, payments: [payment], sessions, story_session: story })],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/sessions$/, () => list(sessions)],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/assignments$/, () => list(assignments)],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/booking-prerequisites$/, () => ({ ready: true, missing: [] })],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/slots$/, () => list(slots())],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/payments$/, () => list([payment])],
    ['GET', /^\/candidate\/enrollments\/[^/]+\/cancellations$/, () => list([])],
    ['GET', /^\/candidate\/profile$/, () => profile],
    ['GET', /^\/candidate\/profile\/form$/, () => list(profileForm)],
    ['GET', /^\/candidate\/cv$/, () => cv],
    ['GET', /^\/candidate\/cv\/([^/]+)$/, () => cv],
    ['GET', /^\/candidate\/stories$/, () => list([story])],
    ['GET', /^\/candidate\/stories\/([^/]+)$/, () => story],
    ['GET', /^\/candidate\/stories\/[^/]+\/drafts$/, () => list(drafts)],
    ['GET', /^\/candidate\/stories\/[^/]+\/drafts\/([^/]+)$/, p => drafts.find(d => d.id === p[1]) || drafts[drafts.length - 1]],
    ['GET', /^\/candidate\/stories\/[^/]+\/outputs$/, () => list(outputs)],
    ['GET', /^\/candidate\/stories\/[^/]+\/notes$/, () => list(notes)],
    ['GET', /^\/candidate\/stories\/[^/]+\/next$/, () => ({ story, question: null, follow_up: null })]
  ];

  // Yazma istekleri önizlemede kaydedilmez; sayfa akışı bozulmasın diye kibarca reddedilir.
  function handle(method, path, query, body, role) {
    const clean = String(path || '').split('?')[0].replace(/\/+$/, '');
    const table = role === 'danisman' ? guruRoutes : routes;
    for (const [m, pattern, fn] of table) {
      if (m !== method) continue;
      const match = clean.match(pattern);
      if (match) return { data: fn(match, query || {}) };
    }
    if (method !== 'GET' && /^\/(candidate|guru|me)\//.test(clean)) return { readOnly: true };
    return null;
  }

  window.PreviewMock = { handle };
})();
