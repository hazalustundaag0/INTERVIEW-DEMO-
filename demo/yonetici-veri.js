// yonetici-veri.js: Yönetici paneli demo veri deposu (yalnız YoneticiAPI "mock" modunda kullanılır).
// Şekiller backend'in api/openapi.yaml sözleşmesiyle aynıdır (snake_case, amount_minor, cost_micro…).
// Yapılandırma verisi backend'in 20261103101100_seed_reference_config.sql migration'ından alınmıştır;
// kişi, ödeme, YZ ve denetim kayıtları kurgusaldır.
(function () {
  var DEPO_ANAHTARI = 'yoneticiDemoVeri';
  var SURUM = 3;

  var sayac = 0;
  function uuid() {
    sayac += 1;
    return '0196f' + String(sayac).padStart(3, '0') + '-7a1c-7000-8000-' + String(sayac).padStart(12, '0');
  }
  function ts(yerel) { return new Date(yerel).toISOString(); } // '2026-10-24T14:12:00+03:00' → UTC

  function tohum() {
    sayac = 0;
    var d = {
      surum: SURUM, sectors: [], users: [], guru_profiles: [], profile_fields: [], question_sets: [], questions: [],
      follow_up_rules: [], prompt_configs: [], services: [], session_templates: [], prices: [],
      payments: [], payment_attempts: [], ai_requests: [], audit_logs: [], sayaclar: { ai: 0, audit: 0, attempt: 0 }
    };

    // ---- Sektörler
    [['technology', 'Teknoloji / Yazılım', 10], ['finance_banking', 'Finans / Bankacılık', 20], ['retail_fmcg', 'Perakende / Hızlı Tüketim', 30],
      ['manufacturing', 'Üretim / Sanayi', 40], ['healthcare_pharma', 'Sağlık / İlaç', 50], ['telecom', 'Telekomünikasyon', 60],
      ['consulting', 'Danışmanlık', 70], ['education', 'Eğitim', 80], ['energy', 'Enerji', 90], ['logistics', 'Lojistik', 100],
      ['public_sector', 'Kamu', 110], ['other', 'Diğer', 999]
    ].forEach(function (s) { d.sectors.push({ id: uuid(), code: s[0], name: s[1], sort_order: s[2] }); });
    function sektor(code) { return d.sectors.find(function (s) { return s.code === code; }); }

    // ---- Kullanıcılar
    function kullanici(ad, soyad, eposta, rol, durum, olusturma, dogrulandi, sonGiris) {
      var u = {
        id: uuid(), first_name: ad, last_name: soyad, email: eposta, role: rol, status: durum, preferred_language: 'tr',
        email_verified_at: dogrulandi ? ts(olusturma) : null, password_set: dogrulandi, last_login_at: sonGiris ? ts(sonGiris) : null,
        created_at: ts(olusturma), updated_at: ts(olusturma)
      };
      d.users.push(u);
      return u;
    }
    var yonetici = kullanici('Demo', 'Yönetici', 'yonetici@interviewdemo.com', 'admin', 'active', '2026-10-20T09:00:00+03:00', true, '2026-11-05T09:12:00+03:00');
    var gSelin = kullanici('Selin', 'Arslan', 'selin.arslan@interviewdemo.com', 'guru', 'active', '2026-10-21T10:00:00+03:00', true, '2026-11-04T18:55:00+03:00');
    var gEmre = kullanici('Emre', 'Kaya', 'emre.kaya@interviewdemo.com', 'guru', 'active', '2026-10-21T10:05:00+03:00', true, '2026-11-03T20:10:00+03:00');
    var gMerve = kullanici('Merve', 'Çelik', 'merve.celik@interviewdemo.com', 'guru', 'active', '2026-10-21T10:10:00+03:00', true, '2026-10-30T11:00:00+03:00');
    var gBurak = kullanici('Burak', 'Tan', 'burak.tan@interviewdemo.com', 'guru', 'passive', '2026-10-22T11:00:00+03:00', false, null);
    var aElif = kullanici('Elif', 'Yılmaz', 'elif.yilmaz@ornek.com', 'candidate', 'active', '2026-10-24T14:12:00+03:00', true, '2026-11-04T16:02:00+03:00');
    var aCan = kullanici('Can', 'Öztürk', 'can.ozturk@ornek.com', 'candidate', 'active', '2026-10-26T09:40:00+03:00', true, '2026-10-26T10:00:00+03:00');
    var aZeynep = kullanici('Zeynep', 'Aydın', 'zeynep.aydin@ornek.com', 'candidate', 'active', '2026-10-22T16:30:00+03:00', true, '2026-10-29T13:00:00+03:00');
    var aMert = kullanici('Mert', 'Demir', 'mert.demir@ornek.com', 'candidate', 'active', '2026-10-29T12:05:00+03:00', true, '2026-11-05T10:01:00+03:00');
    var aAyse = kullanici('Ayşe', 'Koç', 'ayse.koc@ornek.com', 'candidate', 'active', '2026-11-03T18:20:00+03:00', false, null);
    var aDeniz = kullanici('Deniz', 'Şahin', 'deniz.sahin@ornek.com', 'candidate', 'passive', '2026-10-25T08:55:00+03:00', true, '2026-10-25T09:10:00+03:00');
    var aKerem = kullanici('Kerem', 'Yıldız', 'kerem.yildiz@ornek.com', 'candidate', 'active', '2026-11-01T10:15:00+03:00', true, '2026-11-02T11:00:00+03:00');

    // ---- Guru profilleri
    function guru(u, unvan, uzmanlik, kidem, bio, aktif, sektorler) {
      var g = {
        id: uuid(), user_id: u.id, first_name: u.first_name, last_name: u.last_name, title: unvan, expertise_area: uzmanlik,
        seniority: kidem, short_bio: bio, is_active: aktif, sectors: sektorler.map(sektor), created_at: u.created_at, updated_at: u.created_at
      };
      d.guru_profiles.push(g);
      return g;
    }
    guru(gSelin, 'Kıdemli Satış Direktörü & Mentor', 'Satış liderliği, mülakat hikâyeleştirme', '12 yıl', 'Teknoloji ve ölçeklenen şirketlerde satış ekipleri kurma ve büyütme deneyimini kariyer danışmanlığına taşıyor.', true, ['technology', 'consulting']);
    guru(gEmre, 'Yönetici Ortağı & Yetenek Koçu', 'Kariyer geçişi, finans işe alımı', '10 yıl', 'Finans ve yatırım ekiplerinde işe alım ve liderlik deneyimine sahip.', true, ['finance_banking']);
    guru(gMerve, 'Pazarlama ve Marka Direktörü', 'Marka hikâyesi, pazarlama kariyeri', '11 yıl', 'Perakende ve tüketici markalarında pazarlama ekipleri yönetti.', true, ['retail_fmcg']);
    guru(gBurak, 'Sağlık & Medikal İK Danışmanı', 'Sağlık sektöründe işe alım', '9 yıl', 'Sağlık ve Ar-Ge kurumlarında insan kaynakları danışmanlığı yapıyor.', false, ['healthcare_pharma']);

    // ---- Profil formu (migration ile aynı)
    var alanlar = [
      ['target_position', 'Hedef pozisyon', 'Hedeflediğin pozisyonu seç veya yaz.', 'single_choice', 'target_position', true, true, 10, [
        ['sales_specialist', 'Satış Uzmanı'], ['key_account_manager', 'Kilit Müşteri Yöneticisi'], ['business_development', 'İş Geliştirme Uzmanı'],
        ['product_manager', 'Ürün Yöneticisi'], ['marketing_specialist', 'Pazarlama Uzmanı'], ['project_manager', 'Proje Yöneticisi'],
        ['software_engineer', 'Yazılım Mühendisi'], ['hr_specialist', 'İnsan Kaynakları Uzmanı'], ['other', 'Diğer', 999]]],
      ['sector', 'Hedef sektör', 'Sektör ile pozisyonun birbiriyle uyumlu olması gerekmez.', 'single_choice', 'sector', true, true, 20,
        d.sectors.map(function (s) { return [s.code, s.name, s.sort_order]; })],
      ['seniority', 'Kıdem', null, 'single_choice', 'seniority', false, false, 30, [
        ['intern_new_grad', 'Stajyer / Yeni Mezun'], ['junior', 'Uzman Yardımcısı (0–2 yıl)'], ['mid', 'Uzman (3–5 yıl)'],
        ['senior', 'Kıdemli Uzman (6–10 yıl)'], ['manager', 'Yönetici'], ['executive', 'Üst Düzey Yönetici']]],
      ['participation_reason', 'Satış hikâyesine neden ihtiyaç duyuyorsun?', 'Bir seçenek seç veya kendi cümlelerinle yaz.', 'single_choice', 'participation_reason', true, true, 40, [
        ['career_change', 'Kariyer değiştirmek istiyorum'], ['job_search', 'Aktif olarak iş arıyorum'], ['promotion', 'Terfi veya şirket içi pozisyon hedefliyorum'],
        ['new_graduate', 'Yeni mezunum, kendimi anlatmak istiyorum'], ['networking', 'Networking\'de kendimi etkili tanıtmak istiyorum'], ['other', 'Diğer', 999]]],
      ['free_text', 'Gurunun bilmesini istediğin başka bir şey var mı?', null, 'free_text', 'free_text', false, false, 50, []]
    ];
    alanlar.forEach(function (a) {
      var alan = { id: uuid(), field_key: a[0], label: a[1], help_text: a[2], field_type: a[3], maps_to_column: a[4], allows_free_text: a[5], is_required: a[6], sort_order: a[7], is_active: true, options: [] };
      alan.options = a[8].map(function (o, i) { return { id: uuid(), field_id: alan.id, value: o[0], label: o[1], sort_order: o[2] || (i + 1) * 10, is_active: true }; });
      d.profile_fields.push(alan);
    });

    // ---- Soru setleri: v1 yayında ve etkin, v2 taslak (sürümleme örneği)
    var sorular = [
      ['achievement', 'Başarı', 'Kariyerinde başardığın ve en çok gurur duyduğun şeyi anlatır mısın?'],
      ['emotion', 'Duygu', 'Bunu başardığında ne hissettin, seni bu işte en çok ne heyecanlandırıyor?'],
      ['challenge_solution', 'Zorluk ve çözüm', 'Seni en çok zorlayan dönem hangisiydi, onu nasıl aştın?'],
      ['identity', 'Kimlik', 'Seni tanıyan insanlar seni hangi üç kelimeyle anlatır?'],
      ['goal_bridge', 'Hedef ve köprü', 'Bir sonraki adımda nereye gitmek istiyorsun, yaşadıkların seni buna nasıl hazırladı?']
    ];
    var qs1 = { id: uuid(), name: 'sales_story_emotion_first', version: 1, language: 'tr', description: 'v1: Başarı, duygu, zorluk-çözüm, kimlik ve hedef-köprü odaklı 5 soru. Pilotta ayarlanacak.', is_active: true, published_at: ts('2026-11-03T10:11:00+03:00'), created_at: ts('2026-11-03T10:11:00+03:00'), updated_at: ts('2026-11-03T10:11:00+03:00') };
    var qs2 = { id: uuid(), name: 'sales_story_emotion_first', version: 2, language: 'tr', description: 'v2 taslak: Kimlik sorusu pilot geri bildirimiyle yumuşatıldı.', is_active: false, published_at: null, created_at: ts('2026-11-05T11:20:00+03:00'), updated_at: ts('2026-11-05T11:20:00+03:00') };
    d.question_sets.push(qs1, qs2);
    sorular.forEach(function (s, i) {
      d.questions.push({ id: uuid(), question_set_id: qs1.id, sequence_no: i + 1, focus_key: s[0], focus_label: s[1], question_text: s[2], is_required: true });
      d.questions.push({ id: uuid(), question_set_id: qs2.id, sequence_no: i + 1, focus_key: s[0], focus_label: s[1],
        question_text: s[0] === 'identity' ? 'Seni yakından tanıyan biri seni üç kelimeyle nasıl anlatırdı, neden?' : s[2], is_required: true });
    });

    // ---- Takip kuralları
    [['vague_result', 'Belirsiz sonuç', 'Cevapta sonuç belirsiz veya ölçülemez ifade ediliyor (ör. "iyiydi", "güzel geçti").', 'Bunu bir sayıyla ya da örnekle anlatabilir misin?', 10],
      ['we_language', '"Biz" dili', 'Aday kendi katkısını değil ekibin işini anlatıyor ("biz yaptık").', 'Bu işte senin payın neydi?', 20],
      ['missing_reason', 'Neden eksik', 'Aday ne yaptığını anlatıyor ama neden o yolu seçtiğini söylemiyor.', 'O sırada neden bu yolu seçtin?', 30],
      ['missing_learning', 'Öğrenme eksik', 'Deneyimin adaya ne kazandırdığı / ne öğrettiği anlatılmıyor.', 'Bu sana sonradan ne kazandırdı?', 40],
      ['cv_conflict', 'CV ile çelişki', 'Cevaptaki bilgi adayın onayladığı CV bilgisiyle çelişiyor.', 'CV\'nde {cv_value} yazıyor, burada {answer_value} diyorsun. Hangisi doğru?', 50],
      ['too_generic', 'Çok genel cevap', 'Cevap somut bir an veya olay içermiyor, genel geçer ifadelerden oluşuyor.', 'Bunu gösteren bir an anlatır mısın?', 60]
    ].forEach(function (r) {
      d.follow_up_rules.push({ id: uuid(), rule_key: r[0], name: r[1], trigger_definition: r[2], follow_up_template: r[3], priority: r[4], is_active: true, created_at: ts('2026-11-03T10:11:00+03:00'), updated_at: ts('2026-11-03T10:11:00+03:00') });
    });

    // ---- YZ istem zinciri v1
    var pc1 = {
      id: uuid(), name: 'sales_story_chain', version: 1, description: 'Satış hikâyesi istem zinciri v1 (7 adım). Aday ve guru sonuçları görebilir.',
      rule_set: '1. Metindeki her bilgi adayın bir cevabına, takip cevabına veya onaylı CV bilgisine bağlanır ve kaynak etiketi üretilir.\n2. Aday rakam, unvan, şirket adı veya tarih vermediyse bunlar eklenmez, yerine [bilgi gerekli] yazılır.\n3. "Başarılı", "lider" gibi övgü sıfatları eklenmez.\n4. Çıktı Türkçedir ve adayın kendi kelimelerine yakın tutulur.\n5. Hikâye 150–250 kelime, birinci tekil şahıs. Kısa özet 3–4 cümle. CV özeti 3–4 satır. Mülakat cevabı 2–3 adet.\n6. Aday "bilmiyorum / hatırlamıyorum" derse ısrar edilmez, alan [bilgi gerekli] olarak işaretlenir.\n7. Harici yüklenen hikâye adayın beyanıdır ve YZ çıktısıyla karıştırılmaz.',
      parameters: { language: 'tr', info_needed_marker: '[bilgi gerekli]', max_consecutive_follow_ups: 2, story_word_min: 150, story_word_max: 250,
        short_summary_sentences: { min: 3, max: 4 }, interview_answer_count: { min: 2, max: 3 }, cv_summary_lines: { min: 3, max: 4 }, timeout_seconds: 60, max_retries: 2 },
      is_active: true, published_at: ts('2026-11-03T10:11:00+03:00'), steps: [], created_at: ts('2026-11-03T10:11:00+03:00'), updated_at: ts('2026-11-03T10:11:00+03:00')
    };
    [['professional_resume', 'Özgeçmişin profesyonel anlatımı', 'Sana önce klasik formatta özgeçmişimi kronolojik olarak anlatacağım. Sonrasında bunlardan bir satış hikayesi çıkarmak istiyorum. Öz geçmişimde iş tecrübelerimi, sorumluluklarımı, başarılarım, hedeflerimi, hobilerimi madde madde anlatmış olacağım. Lütfen bunları önce profesyonel bir dille tekrar yaz.'],
      ['sales_story', 'Satış hikâyesi oluşturma', 'Şimdi bu anlatımımdaki güçlü yönlerimi, yetkinliklerimi, kırılma anlarımı, dönüm noktalarımı çıkartarak satış hikayemi oluştur. Satış hikayemde etkileyici bir anlatım ve karşı tarafla bağ kurmaya yönelik bir dil kullan.'],
      ['hidden_strengths', 'Geri planda kalan önemli noktalar', 'Klasik özgeçmiş anlatımımda parlatmam gereken hangi noktaları geri planda ve sönük bıraktım?'],
      ['missing_areas', 'Eksik veya yüzeysel alanlar', 'Klasik öz geçmişimde eksik veya yüzeysel bıraktığım alanlar neler oldu?'],
      ['punchy_sentences', 'Vurucu cümle örnekleri', 'Klasik özgeçmişim ile satış hikayemi karşılaştırarak düzeltmiş olduğum ve daha iyi şekilde ifade ettiğim cümlelerimi yaz. Hangi ifadeleri kullanmamalıydım ve bunların yerine satış hikayemde hangi cümleleri kullandım?'],
      ['weak_words', 'Zayıf / düz gelen kelimeler', 'Zayıf / düz gelen kelimeleri belirle ve her birinin yerine daha vurucu, profesyonel veya etkili olabilecek alternatif ifadeler öner.'],
      ['strong_messages', 'Hikâyede kullanılabilecek güçlü mesajlar', 'Hikayem içinde kullanılabileceğim güçlü mesaj önerileri yaz.']
    ].forEach(function (s, i) { pc1.steps.push({ id: uuid(), config_id: pc1.id, step_no: i + 1, step_key: s[0], title: s[1], prompt_text: s[2] }); });
    d.prompt_configs.push(pc1);

    // ---- Hizmet kataloğu
    var demoAciklama = 'Demo kapsamı dışında. Fiyat, seans sayısı ve süreler yeniden değerlendirilecek.';
    [['sales_story', 'Satış Hikâyesi Oluşturma', 'Adayın kariyer hikâyesini bulup CV, mülakat cevapları ve networking tanıtımına dönüştüren iki seanslık akış. Seans sayısı ve süresi ürün tanımından gelir.', 2, 50, true, 10],
      ['cv_cover_letter', 'CV veya Ön Yazı Oluşturma', demoAciklama, 1, 50, false, 20],
      ['mock_interview', 'Demo İş Görüşmesi (CV Değerlendirme Dahil)', demoAciklama, 1, 50, false, 30],
      ['networking', 'Networking', demoAciklama, 1, 50, false, 40],
      ['coaching', 'Koçluk', demoAciklama, 1, 50, false, 50],
      ['test_feedback', 'Testlerle İlgili Geri Bildirim', demoAciklama, 1, 50, false, 60]
    ].forEach(function (s) {
      d.services.push({ id: uuid(), code: s[0], name: s[1], description: s[2], session_count: s[3], session_duration_minutes: s[4], is_active: s[5], sort_order: s[6], created_at: ts('2026-11-03T10:11:00+03:00'), updated_at: ts('2026-11-03T10:11:00+03:00') });
    });
    var satisHikayesi = d.services[0];
    d.session_templates.push(
      { id: uuid(), service_id: satisHikayesi.id, sequence_no: 1, title: 'Kariyer Hedefi ve Analiz', purpose: 'CV üzerinden kariyer incelemesi, geçiş noktaları, değerler ve motivasyonlar.', output_definition: 'Danışana özel hikâye teması taslağı ve guru notları.' },
      { id: uuid(), service_id: satisHikayesi.id, sequence_no: 2, title: 'Hikâyenin Kurgulanması, Pratik ve Geri Bildirim', purpose: 'Giriş-gelişme-sonuç yapısı, mülakat tekniklerine uyarlama, anahtar ifadeler, canlı anlatım pratiği ve geri bildirim.', output_definition: 'Tamamlanmış hikâye metni, 2–3 mülakat sorusu için cevap örnekleri ve geliştirme notları.' }
    );
    d.prices.push(
      { id: uuid(), service_id: satisHikayesi.id, amount_minor: 150000, currency: 'TRY', valid_from: ts('2026-10-20T00:00:00+03:00'), valid_until: ts('2026-11-01T00:00:00+03:00'), note: 'Pilot öncesi deneme fiyatı.', created_at: ts('2026-10-20T09:30:00+03:00') },
      { id: uuid(), service_id: satisHikayesi.id, amount_minor: 0, currency: 'TRY', valid_from: ts('2026-11-01T00:00:00+03:00'), valid_until: null, note: 'Demo fiyatı (0 TRY). Fiyatlar yeniden değerlendirilecek.', created_at: ts('2026-11-01T00:00:00+03:00') }
    );

    // ---- Ödemeler (sağlayıcı: devpay)
    function odeme(u, tutar, durum, zaman, ref, hata) {
      var z = ts(zaman);
      var p = {
        id: uuid(), enrollment_id: uuid(), user_id: u.id, amount_minor: tutar, currency: 'TRY', payment_method: tutar ? 'card' : 'free', provider: 'devpay',
        provider_reference: ref, status: durum, failure_code: hata ? hata[0] : null, failure_message: hata ? hata[1] : null,
        paid_at: durum === 'PAID' || durum === 'REFUNDED' ? z : null, failed_at: durum === 'FAILED' ? z : null,
        refunded_at: durum === 'REFUNDED' ? new Date(Date.parse(z) + 2 * 86400000).toISOString() : null,
        last_checked_at: durum === 'PENDING' ? new Date(Date.parse(z) + 5 * 60000).toISOString() : z, created_at: z, updated_at: z
      };
      d.payments.push(p);
      function deneme(tur, once, sonra, sonuc, ms, ofsetSn) {
        d.sayaclar.attempt += 1;
        d.payment_attempts.push({ payment_id: p.id, id: d.sayaclar.attempt, attempt_type: tur, provider_event_id: tur === 'webhook' ? 'evt_' + ref.toLowerCase() : null,
          status_before: once, status_after: sonra, outcome: sonuc, error_code: sonuc === 'failure' && hata ? hata[0] : null, error_message: sonuc === 'failure' && hata ? hata[1] : null,
          response_payload: { provider: 'devpay', reference: ref, status: sonra }, duration_ms: ms, created_at: new Date(Date.parse(z) + ofsetSn * 1000).toISOString() });
      }
      deneme('initiate', null, 'PENDING', 'pending', 420, -40);
      if (durum === 'PAID' || durum === 'REFUNDED') deneme('webhook', 'PENDING', 'PAID', 'success', 35, 0);
      if (durum === 'FAILED') deneme('webhook', 'PENDING', 'FAILED', 'failure', 41, 0);
      if (durum === 'PENDING') deneme('status_query', 'PENDING', 'PENDING', 'pending', 10200, 300);
      if (durum === 'REFUNDED') deneme('refund', 'PAID', 'REFUNDED', 'success', 610, 2 * 86400);
      return p;
    }
    odeme(aZeynep, 150000, 'PAID', '2026-10-22T17:02:00+03:00', 'DP-7Q2K91');
    odeme(aElif, 150000, 'PAID', '2026-10-24T14:31:00+03:00', 'DP-8B4N22');
    var iade = odeme(aDeniz, 150000, 'REFUNDED', '2026-10-25T09:20:00+03:00', 'DP-3M7P10');
    var basarisiz = odeme(aCan, 150000, 'FAILED', '2026-10-26T10:02:00+03:00', 'DP-5T1X44', ['card_declined', 'Kart sağlayıcı tarafından reddedildi.']);
    odeme(aCan, 150000, 'PAID', '2026-10-26T10:09:00+03:00', 'DP-5T1X58');
    odeme(aMert, 150000, 'PAID', '2026-10-29T12:40:00+03:00', 'DP-9C6R03');
    odeme(aKerem, 0, 'PAID', '2026-11-01T10:48:00+03:00', 'DP-2H8D77');
    odeme(aAyse, 0, 'PENDING', '2026-11-05T11:52:00+03:00', 'DP-6W3J15');

    // ---- YZ çağrıları (sabit tohumlu; cost_micro = USD × 1e6, demo birim fiyat: giriş 3 $/1M, çıkış 15 $/1M)
    var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(42);
    function aralik(a, b) { return Math.round(a + rnd() * (b - a)); }
    var akislar = [[aZeynep, '2026-10-24T15:00:00+03:00', true], [aElif, '2026-10-30T19:00:00+03:00', true], [aElif, '2026-11-04T16:00:00+03:00', true],
      [aMert, '2026-11-03T21:00:00+03:00', false], [aKerem, '2026-11-02T11:00:00+03:00', false], [aMert, '2026-11-05T10:00:00+03:00', false]];
    var oturumlar = {};
    akislar.forEach(function (a) {
      var u = a[0];
      var oturum = oturumlar[u.id] || (oturumlar[u.id] = uuid());
      var t = Date.parse(a[1]);
      function kayit(tur, giris, cikis, ms, durum, configli) {
        d.sayaclar.ai += 1;
        var hatali = durum !== 'success';
        d.ai_requests.push({
          id: d.sayaclar.ai, story_session_id: tur === 'cv_parse' ? null : oturum, user_id: u.id, prompt_config_id: configli ? pc1.id : null,
          request_type: tur, provider: 'demo', model: 'demo-llm-1', input_tokens: giris, output_tokens: hatali ? 0 : cikis,
          cost_micro: hatali ? Math.round(giris * 3) : Math.round(giris * 3 + cikis * 15), cost_currency: 'USD',
          duration_ms: durum === 'timeout' ? 60000 : ms, status: durum, retry_no: 0, error_code: durum === 'timeout' ? 'ai_timeout' : null,
          created_at: new Date(t).toISOString()
        });
        if (hatali) {
          d.sayaclar.ai += 1;
          t += 3000;
          d.ai_requests.push(Object.assign({}, d.ai_requests[d.ai_requests.length - 1], { id: d.sayaclar.ai, output_tokens: cikis, cost_micro: Math.round(giris * 3 + cikis * 15), duration_ms: Math.round(ms * 0.7), status: 'success', retry_no: 1, error_code: null, created_at: new Date(t).toISOString() }));
        }
      }
      if (!akislar.some(function (b) { return b !== a && b[0] === u && Date.parse(b[1]) < Date.parse(a[1]); })) {
        kayit('cv_parse', aralik(2500, 4200), aralik(600, 900), aralik(9000, 22000), 'success', false);
        t += 60000;
      }
      var adet = a[2] ? 5 : aralik(2, 4);
      for (var i = 0; i < adet; i++) {
        t += aralik(120, 260) * 1000;
        kayit('question', aralik(900, 1800), aralik(60, 140), aralik(1800, 4800), 'success', false);
        t += aralik(60, 140) * 1000;
        kayit('follow_up_decision', aralik(1100, 2000), aralik(20, 50), aralik(1200, 3200), 'success', false);
        if (rnd() > 0.45) {
          t += 2000;
          kayit('follow_up_question', aralik(1200, 2400), aralik(40, 90), aralik(2000, 6500), rnd() > 0.9 ? 'timeout' : 'success', false);
        }
      }
      if (a[2]) {
        for (var s = 0; s < 7; s++) {
          t += aralik(8, 20) * 1000;
          kayit('prompt_chain_step', aralik(3000, 6500), aralik(400, 900), aralik(6000, 18000), 'success', true);
        }
        t += 20000;
        kayit('story_generation', aralik(5200, 7600), aralik(700, 1100), aralik(14000, 34000), 'success', true);
        t += 30000;
        kayit('output_generation', aralik(5800, 8200), aralik(900, 1400), aralik(16000, 38000), 'success', true);
      }
    });

    // ---- Denetim kayıtları
    function log(aktor, rol, eylem, varlik, varlikId, eski, yeni, zaman) {
      d.sayaclar.audit += 1;
      d.audit_logs.push({
        id: d.sayaclar.audit, actor_user_id: aktor ? aktor.id : null, actor_role: rol, action: eylem, entity_type: varlik, entity_id: varlikId,
        old_value: eski, new_value: yeni, ip: aktor ? '10.0.0.' + (10 + d.sayaclar.audit) : null, user_agent: 'Mozilla/5.0', request_id: 'req_' + String(d.sayaclar.audit).padStart(6, '0'), created_at: ts(zaman)
      });
    }
    log(yonetici, 'admin', 'pricing_rule.changed', 'pricing_rules', d.prices[0].id, null, { op: 'create', amount_minor: 150000, currency: 'TRY' }, '2026-10-20T09:30:00+03:00');
    log(yonetici, 'admin', 'user.guru_created', 'users', gSelin.id, null, { email: gSelin.email, title: 'Kıdemli Satış Direktörü & Mentor' }, '2026-10-21T10:00:00+03:00');
    log(yonetici, 'admin', 'user.guru_created', 'users', gEmre.id, null, { email: gEmre.email }, '2026-10-21T10:05:00+03:00');
    log(yonetici, 'admin', 'user.guru_created', 'users', gMerve.id, null, { email: gMerve.email }, '2026-10-21T10:10:00+03:00');
    log(yonetici, 'admin', 'user.guru_created', 'users', gBurak.id, null, { email: gBurak.email }, '2026-10-22T11:00:00+03:00');
    log(aZeynep, 'candidate', 'payment.confirmed', 'payments', d.payments[0].id, { status: 'PENDING' }, { status: 'PAID' }, '2026-10-22T17:02:00+03:00');
    log(aElif, 'candidate', 'consent.granted', 'consent_records', uuid(), null, { kind: 'kvkk_disclosure', version: 1 }, '2026-10-24T14:29:00+03:00');
    log(aDeniz, 'candidate', 'enrollment.cancellation_requested', 'service_enrollments', iade.enrollment_id, null, { reason: 'Kişisel nedenler' }, '2026-10-26T08:10:00+03:00');
    log(aCan, 'candidate', 'payment.failed', 'payments', basarisiz.id, { status: 'PENDING' }, { status: 'FAILED', failure_code: 'card_declined' }, '2026-10-26T10:02:00+03:00');
    log(yonetici, 'admin', 'payment.refunded', 'payments', iade.id, { status: 'PAID' }, { status: 'REFUNDED' }, '2026-10-27T09:20:00+03:00');
    log(yonetici, 'admin', 'user.status_changed', 'users', gBurak.id, { status: 'active' }, { status: 'passive' }, '2026-10-28T09:45:00+03:00');
    log(gSelin, 'guru', 'guru_profile.updated', 'guru_profiles', d.guru_profiles[0].id, { short_bio: '…' }, { short_bio: '…' }, '2026-10-29T12:00:00+03:00');
    log(yonetici, 'admin', 'pricing_rule.changed', 'pricing_rules', d.prices[1].id, null, { op: 'create', amount_minor: 0, currency: 'TRY', valid_from: d.prices[1].valid_from }, '2026-11-01T00:00:00+03:00');
    log(yonetici, 'admin', 'question_set.changed', 'question_sets', qs1.id, null, { op: 'publish', activate: true, version: 1 }, '2026-11-03T10:11:00+03:00');
    log(yonetici, 'admin', 'prompt_config.changed', 'ai_prompt_configs', pc1.id, null, { op: 'publish', activate: true, version: 1 }, '2026-11-03T10:11:00+03:00');
    log(aElif, 'candidate', 'story.generated', 'story_drafts', uuid(), null, { version_no: 2, created_by: 'ai' }, '2026-11-04T16:21:00+03:00');
    log(gSelin, 'guru', 'assignment.created', 'assignments', uuid(), null, { type: 'document_request', title: 'Referans mektubu' }, '2026-11-04T19:02:00+03:00');
    log(yonetici, 'admin', 'auth.login', 'auth_tokens', uuid(), null, { client_type: 'admin' }, '2026-11-05T09:12:00+03:00');
    log(yonetici, 'admin', 'question_set.changed', 'question_sets', qs2.id, null, { op: 'create', name: qs2.name, version: 2, copied_from: qs1.id }, '2026-11-05T11:20:00+03:00');

    return d;
  }

  var bellek = null;

  function yukle() {
    if (bellek) return bellek;
    try {
      var ham = localStorage.getItem(DEPO_ANAHTARI);
      if (ham) {
        var veri = JSON.parse(ham);
        if (veri && veri.surum === SURUM) { bellek = veri; return bellek; }
      }
    } catch (hata) {
      console.warn('Yönetici demo verisi okunamadı, varsayılan veri kullanılıyor.', hata);
    }
    bellek = tohum();
    return bellek;
  }

  function kaydet() {
    try { localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(bellek)); }
    catch (hata) { console.warn('Yönetici demo verisi kaydedilemedi; değişiklikler sayfa yenilenince kaybolur.', hata); }
  }

  function sifirla() {
    try { localStorage.removeItem(DEPO_ANAHTARI); } catch (hata) { /* yok say */ }
    bellek = tohum();
    return bellek;
  }

  window.YoneticiVeri = { yukle: yukle, kaydet: kaydet, sifirla: sifirla };
})();
