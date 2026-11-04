(function () {
  var baseAdvisors = [
    {
      id: 'selin-arslan',
      ad: 'Selin Arslan',
      unvan: 'Kıdemli Satış Direktörü & Mentor',
      sektorler: ['Teknoloji', 'SaaS', 'Liderlik'],
      deneyimYili: 12,
      hakkinda: 'Teknoloji ve ölçeklenen şirketlerde satış ekipleri kurma, büyütme ve liderlik etme deneyimimi kariyer danışmanlığına taşıyorum. Mülakatta fark yaratan, gerçek deneyimlere dayalı hikâyeler kurgulamak için danışanlarımla birlikte çalışıyorum.',
      kisaTanitim: 'Teknoloji ve ölçeklenen şirketlerde 12 yılı aşkın süredir üst düzey yetenek ve kariyer danışmanlığı yapıyor. Mülakatta fark yaratan hikâyeler kurgulamaya odaklanıyor.',
      uzmanlik: ['Satış liderliği', 'Mülakat hikâyeleştirme', 'Kariyer geçişi', 'SaaS', 'Ekip yönetimi'],
      deneyim: [
        { rol: 'Satış Direktörü', kurum: 'Pusula Teknoloji', baslangic: '2019', bitis: 'Günümüz' },
        { rol: 'Bölge Satış Müdürü', kurum: 'Nova Yazılım', baslangic: '2014', bitis: '2019' },
        { rol: 'Kurumsal Satış Yöneticisi', kurum: 'Rota Dijital', baslangic: '2011', bitis: '2014' }
      ],
      egitim: [
        { okul: 'Boğaziçi Üniversitesi', bolum: 'İşletme', yil: '2011' },
        { okul: 'Koç Üniversitesi', bolum: 'Yönetici Gelişim Programı', yil: '2018' }
      ],
      sertifikalar: ['ICF onaylı koçluk programı', 'İşe alımda yetkinlik bazlı mülakat'],
      yaklasim: ['Hedefini ve güçlü yönlerini netleştiririz.', 'Gerçek deneyimlerinden örnekleri seçip yapılandırırız.', 'Hikâyelerini prova eder, birlikte iyileştiririz.'],
      kimlerleCalisirim: ['Satış ve iş geliştirme liderleri', 'Teknoloji ve SaaS profesyonelleri', 'Kariyerinde yeni bir role geçmek isteyenler'],
      sss: [
        { soru: 'İlk seansta ne yapıyoruz?', cevap: 'Hedefini, kariyer yolculuğunu ve öne çıkarmak istediğin deneyimleri konuşuyoruz.' },
        { soru: 'Seanslara nasıl hazırlanmalıyım?', cevap: 'CV’ni ve üzerinde çalışmak istediğin iş örneklerini getirmen yeterli.' }
      ],
      yorumlar: [
        { ad: 'A.', puan: 5, metin: 'Deneyimlerimi daha net ve kendime güvenerek anlatmamı sağladı.', tarih: 'Ekim 2026' },
        { ad: 'M.', puan: 5, metin: 'Somut geri bildirimleriyle hikâyemi yapılandırmama yardımcı oldu.', tarih: 'Eylül 2026' }
      ],
      puan: 4.9,
      seansSayisi: 2,
      ucret: 1500,
      sure: 50,
      musait: 'Bu hafta müsait',
      yayinda: true,
      dogrulanmis: true
    },
    {
      id: 'emre-kaya',
      ad: 'Emre Kaya',
      unvan: 'Yönetici Ortağı & Yetenek Koçu',
      sektorler: ['Finans', 'Bankacılık', 'Yatırım'],
      deneyimYili: 10,
      hakkinda: 'Finans, bankacılık ve yatırım ekiplerinde işe alım ve liderlik deneyimine sahibim. Kariyer geçişlerinde hedefleri netleştirmeye ve güçlü örnekleri mülakatlarda anlaşılır biçimde aktarmaya odaklanıyorum.',
      kisaTanitim: 'Bankacılık ve yatırım sektöründe mülakat simülasyonları ve liderlik koçluğu sunuyor. Kariyer geçişlerinde hedeflerini netleştirmen için birlikte çalışıyor.',
      uzmanlik: ['Finans', 'Liderlik', 'Yetkinlik bazlı mülakat', 'Kariyer planlama'],
      deneyim: [
        { rol: 'Yönetici Ortak', kurum: 'Eksen Yetenek', baslangic: '2020', bitis: 'Günümüz' },
        { rol: 'İnsan ve Kültür Direktörü', kurum: 'Marmara Yatırım', baslangic: '2015', bitis: '2020' },
        { rol: 'İşe Alım Müdürü', kurum: 'Birlik Bankası', baslangic: '2012', bitis: '2015' }
      ],
      egitim: [
        { okul: 'İstanbul Üniversitesi', bolum: 'İşletme', yil: '2012' },
        { okul: 'Sabancı Üniversitesi', bolum: 'Profesyonel Yönetim Programı', yil: '2017' }
      ],
      sertifikalar: ['SHRM-SCP', 'Kariyer koçluğu uygulamaları'],
      yaklasim: ['Kariyer hedefini ve rol beklentisini belirleriz.', 'Başarı örneklerini ölçülebilir sonuçlarla güçlendiririz.', 'Mülakat provasıyla anlatımını pekiştiririz.'],
      kimlerleCalisirim: ['Finans profesyonelleri', 'İlk kez yönetici olacaklar', 'Kariyer geçişi planlayan uzmanlar'],
      sss: [
        { soru: 'Mülakat provası yapıyor muyuz?', cevap: 'Evet, hedeflediğin rolün beklentilerine göre örnek sorularla prova yapıyoruz.' },
        { soru: 'Hangi sektörlerde destek veriyorsunuz?', cevap: 'Ağırlıklı olarak finans, bankacılık ve yatırım alanlarında çalışıyorum.' }
      ],
      yorumlar: [
        { ad: 'D.', puan: 5, metin: 'Görüşme öncesi hazırlığım çok daha sistemli hale geldi.', tarih: 'Ekim 2026' },
        { ad: 'S.', puan: 5, metin: 'Hedeflerimi netleştirmeme ve güçlü yönlerimi fark etmeme yardımcı oldu.', tarih: 'Ağustos 2026' }
      ],
      puan: 4.8,
      seansSayisi: 2,
      ucret: 1500,
      sure: 50,
      musait: 'Bu hafta müsait',
      yayinda: true,
      dogrulanmis: true
    },
    {
      id: 'merve-celik',
      ad: 'Merve Çelik',
      unvan: 'Pazarlama ve Marka Direktörü',
      sektorler: ['Perakende', 'Tüketici', 'Pazarlama'],
      deneyimYili: 11,
      hakkinda: 'Hızlı tüketim ve perakende şirketlerinde marka stratejisi ve ekip yönetimi alanlarında çalışıyorum. Deneyimlerini etkili örneklere dönüştürmek ve başarılarını doğru bağlamda anlatmak isteyen profesyonellere destek veriyorum.',
      kisaTanitim: 'Hızlı tüketim ve perakende şirketlerinde marka yönetimi deneyimine sahip. Mülakatlarda deneyimini güçlü hikâyelere dönüştürmeye odaklanıyor.',
      uzmanlik: ['Marka stratejisi', 'Pazarlama', 'Perakende', 'Paydaş yönetimi'],
      deneyim: [
        { rol: 'Pazarlama ve Marka Direktörü', kurum: 'Mavi Ada Tüketim', baslangic: '2020', bitis: 'Günümüz' },
        { rol: 'Marka Grup Müdürü', kurum: 'Kent Marketleri', baslangic: '2016', bitis: '2020' },
        { rol: 'Marka Müdürü', kurum: 'Günışığı Gıda', baslangic: '2013', bitis: '2016' }
      ],
      egitim: [
        { okul: 'Marmara Üniversitesi', bolum: 'İletişim Fakültesi', yil: '2013' },
        { okul: 'Özyeğin Üniversitesi', bolum: 'Pazarlama Yönetimi Sertifika Programı', yil: '2018' }
      ],
      sertifikalar: ['Stratejik marka yönetimi', 'Ekip liderliği ve iletişim'],
      yaklasim: ['Kariyer hedefini ve deneyim haritanı çıkarırız.', 'Etki yaratan projelerini net bir akışa dönüştürürüz.', 'Anlatımını hedef role göre prova ederiz.'],
      kimlerleCalisirim: ['Pazarlama profesyonelleri', 'Marka ve perakende yöneticileri', 'Yöneticiliğe geçiş yapanlar'],
      sss: [
        { soru: 'Proje örneklerimi nasıl hazırlamalıyım?', cevap: 'Hedef, katkın ve sonuç başlıklarını düşünmen başlangıç için yeterli.' },
        { soru: 'Sadece pazarlama rolleri için mi çalışıyorsunuz?', cevap: 'Özellikle pazarlama ve perakendede çalışıyorum; aktarılabilir liderlik becerilerini de ele alıyoruz.' }
      ],
      yorumlar: [
        { ad: 'E.', puan: 5, metin: 'Projelerimdeki katkımı kısa ve anlaşılır anlatmayı öğrendim.', tarih: 'Eylül 2026' },
        { ad: 'B.', puan: 5, metin: 'Samimi yaklaşımı ve uygulanabilir önerileri çok faydalıydı.', tarih: 'Temmuz 2026' }
      ],
      puan: 4.9,
      seansSayisi: 2,
      ucret: 1500,
      sure: 50,
      musait: 'Yakında müsait',
      yayinda: true,
      dogrulanmis: true
    },
    {
      id: 'burak-tan',
      ad: 'Burak Tan',
      unvan: 'Sağlık & Medikal İK Danışmanı',
      sektorler: ['Sağlık', 'Ar-Ge', 'Biyoteknoloji'],
      deneyimYili: 9,
      hakkinda: 'Sağlık, biyoteknoloji ve klinik Ar-Ge ekiplerinde yetenek kazanımı ve organizasyon gelişimi alanlarında çalışıyorum. Teknik uzmanlığını ve iş birliği örneklerini mülakatlarda görünür kılman için pratik odaklı bir hazırlık sunuyorum.',
      kisaTanitim: 'Sağlık, biyoteknoloji ve klinik Ar-Ge alanlarında işe alım deneyimine sahip. Yetkinlik bazlı mülakatlara hazırlanman için pratik çalışmalar yürütüyor.',
      uzmanlik: ['Sağlık ve medikal', 'Biyoteknoloji', 'Yetkinlik bazlı mülakat', 'Ar-Ge ekipleri'],
      deneyim: [
        { rol: 'İK ve Yetenek Direktörü', kurum: 'Yaşam Bilimleri A.Ş.', baslangic: '2021', bitis: 'Günümüz' },
        { rol: 'Yetenek Kazanımı Müdürü', kurum: 'Anadolu Klinik Araştırmalar', baslangic: '2017', bitis: '2021' },
        { rol: 'İşe Alım Uzmanı', kurum: 'Biyogen İlaç', baslangic: '2014', bitis: '2017' }
      ],
      egitim: [
        { okul: 'Hacettepe Üniversitesi', bolum: 'Psikoloji', yil: '2014' },
        { okul: 'İstanbul Bilgi Üniversitesi', bolum: 'Örgütsel Psikoloji Yüksek Lisansı', yil: '2018' }
      ],
      sertifikalar: ['Davranışsal mülakat teknikleri', 'Klinik araştırmalarda işe alım'],
      yaklasim: ['Rolün teknik ve davranışsal beklentilerini belirleriz.', 'Örneklerini net bağlam ve sonuçlarla yapılandırırız.', 'Soru-cevap provasıyla hazırlığını tamamlarız.'],
      kimlerleCalisirim: ['Sağlık ve medikal profesyonelleri', 'Biyoteknoloji ve Ar-Ge uzmanları', 'Klinik araştırma ekipleri'],
      sss: [
        { soru: 'Teknik mülakatlara da hazırlanabilir miyiz?', cevap: 'Evet, teknik deneyimini ve ekip içindeki katkını anlaşılır biçimde aktarmaya çalışıyoruz.' },
        { soru: 'Görüşmeye ne getirmeliyim?', cevap: 'Başvuracağın rolün ilanı ve öne çıkarmak istediğin birkaç proje örneği yeterli.' }
      ],
      yorumlar: [
        { ad: 'N.', puan: 5, metin: 'Karmaşık projelerimi sade ve güçlü anlatmamı sağladı.', tarih: 'Ekim 2026' },
        { ad: 'A.', puan: 4, metin: 'Prova sırasında aldığım geri bildirimler görüşmede işime yaradı.', tarih: 'Ağustos 2026' }
      ],
      puan: 4.8,
      seansSayisi: 2,
      ucret: 1500,
      sure: 50,
      musait: 'Yakında müsait',
      yayinda: true,
      dogrulanmis: true
    }
  ];

  function cloneAdvisor(advisor) {
    return JSON.parse(JSON.stringify(advisor));
  }

  function advisorsWithSavedProfile() {
    var advisors = baseAdvisors.map(cloneAdvisor);
    try {
      var rawProfile = localStorage.getItem('guruProfile');
      var profile = rawProfile ? JSON.parse(rawProfile) : null;
      var selin = advisors[0];
      if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
        if (typeof profile.published === 'boolean') selin.yayinda = profile.published;
        else if (typeof profile.yayinda === 'boolean') selin.yayinda = profile.yayinda;
        if (typeof profile.name === 'string' && profile.name.trim()) selin.ad = profile.name.trim();
        if (typeof profile.title === 'string' && profile.title.trim()) selin.unvan = profile.title.trim();
        if (typeof profile.about === 'string') {
          selin.hakkinda = profile.about.trim();
          selin.kisaTanitim = profile.about.trim();
        }
        if (Array.isArray(profile.expertise)) {
          var savedExpertise = profile.expertise.filter(function (tag) {
            return typeof tag === 'string' && tag.trim();
          }).map(function (tag) { return tag.trim(); }).slice(0, 6);
          selin.uzmanlik = savedExpertise;
        }
        if (Array.isArray(profile.sectors)) {
          selin.sektorler = profile.sectors.filter(function (tag) {
            return typeof tag === 'string' && tag.trim();
          }).map(function (tag) { return tag.trim(); }).slice(0, 6);
        }
        if (Array.isArray(profile.experienceList)) selin.deneyim = profile.experienceList.map(cloneAdvisor);
        if (Array.isArray(profile.education)) selin.egitim = profile.education.map(cloneAdvisor);
        if (Array.isArray(profile.certificates)) selin.sertifikalar = profile.certificates.slice();
        if (Array.isArray(profile.approach)) selin.yaklasim = profile.approach.slice(0, 3);
        if (Array.isArray(profile.clients)) selin.kimlerleCalisirim = profile.clients.slice();
        if (Array.isArray(profile.faqs)) {
          selin.sss = profile.faqs.map(function (item) {
            return { soru: item.soru || '', cevap: item.cevap || '' };
          }).filter(function (item) { return item.soru.trim() && item.cevap.trim(); });
        }
        if (Number.isFinite(Number(profile.experience)) && Number(profile.experience) >= 0) {
          selin.deneyimYili = Number(profile.experience);
        }
        if (Number.isFinite(Number(profile.price)) && Number(profile.price) >= 0) {
          selin.ucret = Number(profile.price);
        }
      }
    } catch (error) {
      console.error('Danışman verisi okunamadı.', error);
    }
    return advisors;
  }

  function getAdvisor(id) {
    var key = String(id || 'selin-arslan').trim().toLocaleLowerCase('tr-TR');
    return advisorsWithSavedProfile().find(function (advisor) {
      return advisor.id === key || advisor.ad.toLocaleLowerCase('tr-TR') === key;
    }) || null;
  }

  function listAdvisors(options) {
    var advisors = advisorsWithSavedProfile();
    return options && options.yayindaOlanlar
      ? advisors.filter(function (advisor) { return advisor.yayinda; })
      : advisors;
  }

  function getAdvisorCta(session, advisorId, flow) {
    var hasFlowContext = arguments.length > 2;
    var advisor = getAdvisor(advisorId);
    if (!advisor) {
      return {
        label: 'Seçip devam et',
        href: '',
        disabled: true,
        title: 'Danışman bulunamadı'
      };
    }

    var servicePath = 'hizmet.html?danisman=' + encodeURIComponent(advisor.id);
    if (session?.role === 'danisman') {
      return hasFlowContext
        ? { hidden: true, label: '', href: '', disabled: false, title: '' }
        : {
          label: 'Seçip devam et',
          href: '',
          disabled: true,
          title: 'Danışman hesabıyla randevu alınamaz'
        };
    }

    if (session?.role === 'danisan') {
      try {
        if (localStorage.getItem('demoOdemeAlindi') === 'true') {
          return {
            label: 'Randevu al',
            href: 'takvim.html?danisman=' + encodeURIComponent(advisor.id),
            disabled: false,
            title: ''
          };
        }
      } catch (error) {
        console.error('Danışman seans hakkı okunamadı.', error);
      }
    }

    if (hasFlowContext && flow !== 'hikaye') {
      return {
        mode: 'browse',
        label: 'Satış hikâyeni oluştur →',
        href: 'danismanlar.html?akis=hikaye',
        disabled: false,
        title: ''
      };
    }

    if (!session || !['danisan', 'danisman'].includes(session.role)) {
      var registrationReturn = encodeURIComponent(servicePath);
      return {
        label: 'Bu danışmanla devam et',
        href: 'kayit.html?return=' + registrationReturn,
        loginHref: 'giris.html?return=' + registrationReturn,
        disabled: false,
        title: ''
      };
    }

    return {
      label: 'Bu danışmanla devam et',
      href: servicePath,
      disabled: false,
      title: ''
    };
  }

  window.getAdvisor = getAdvisor;
  window.listAdvisors = listAdvisors;
  window.getAdvisorCta = getAdvisorCta;
  window.DEMO_ADVISORS = listAdvisors();
})();
