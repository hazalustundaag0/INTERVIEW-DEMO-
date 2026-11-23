// hikaye-akis-ornek.js — Satış hikâyesi akışının ÖRNEK verisi (kurgusal kişi; gerçek aday verisi değildir).
// Yapay zekâ servisi bağlanınca bu dosyanın yerini API yanıtları alacak; ekranlar yalnız
// window.StoryFlowSample alanlarını okur, bu yüzden değişim tek noktadan yapılır.
(function () {
  'use strict';

  // 1. adımda "Örnek metinle doldur" düğmesinin yazdığı aday metni.
  const story = [
    "Atlas Sağlık Teknolojileri'nde yaklaşık bir yıldır iş analisti stajyeri olarak çalışıyorum.",
    'Bu sürede sağlık, e-ticaret ve İK alanlarında sekiz projede yer aldım.',
    'Projelerde müşterilerle toplantılara katılıyor, ihtiyaçları analiz dokümanına çeviriyorum.',
    'Toplantılar bazen iki kişiyle bazen on kişiyle oluyor.',
    'Developerlarla doğru iletişim kurabilmek için temel seviyede kod bilgisi edindim.',
    'Çalışmayı seven, işin niceliğinden çok niteliğine odaklanan biriyim.',
    'İşi yönetmeyi, sürecin başından sonuna kadar içinde olmayı seviyorum.',
    'Gelişim alanım sunum becerisi; yaptığım işi doğru anlatmak üzerine çalışıyorum.',
    'Hedefim, kalabalık ekiplerle bir ürünü fikirden canlıya kadar takip eden bir proje yöneticisi ya da iş analisti olmak.'
  ].join(' ');

  // Örnek CV'den çıkarılmış bilgiler (aday seçmedikçe hikâyeye girmez).
  const cv = {
    fileName: 'ornek-cv.pdf',
    words: 214,
    employer: 'Nova Yazılım — İş Analisti Stajyeri (2025 – devam)',
    facts: [
      { id: 'f1', text: 'SQL ve Jira kullanımı (CV › Yetkinlikler)' },
      { id: 'f2', text: 'Scrum Fundamentals sertifikası, 2025 (CV › Sertifikalar)' },
      { id: 'f3', text: 'Mobil uygulama ve müşteri portalı projeleri (CV › Projeler)' }
    ]
  };

  // 1. okuma önerileri. target: önerinin bağlı olduğu cümlenin metindeki sırası (0'dan).
  const firstReading = [
    {
      id: 'r1-1', kind: 'rewrite', badge: 'Önerilen metin', title: 'Daha akıcı bir giriş',
      targets: [0, 1],
      proposal: "Atlas Sağlık Teknolojileri'nde yaklaşık bir yıldır iş analisti stajyeri olarak çalışıyorum ve bu sürede sağlık, e-ticaret ve İK alanlarında sekiz projede yer aldım.",
      why: 'İlk iki cümleyi birleştirmek girişi hızlandırır. Yeni bilgi eklenmedi.'
    },
    {
      id: 'r1-2', kind: 'add', badge: 'Ekleyin', title: 'Eksik eylem',
      targets: [4],
      question: 'Kod bilgisi edinmek için hangi somut adımları attın?',
      example: 'Her hafta [belirli bir süre] SQL çalışıyorum ve [bir araç/proje] üzerinde pratik yapıyorum.',
      why: 'Görüşmeci öğrenme isteğini somut bir adımla duymak ister.'
    },
    {
      id: 'r1-3', kind: 'cv', badge: 'CV ile uyuşmuyor', title: 'Kurum CV’nle uyuşmuyor',
      targets: [0],
      storySays: "Atlas Sağlık Teknolojileri'nde … iş analisti stajyeri olarak çalışıyorum.",
      cvSays: 'Nova Yazılım — İş Analisti Stajyeri',
      why: 'Görüşmeci hikâyeni CV’nle birlikte okur; uyuşmayan bir bilgi anlattıklarına olan güveni zedeler.',
      openIssue: 'CV’ni güncelle: hikâyende “Atlas Sağlık Teknolojileri” diyorsun; CV’nde “Nova Yazılım” yazıyor.'
    },
    {
      id: 'r1-4', kind: 'rewrite', badge: 'Önerilen metin', title: 'Daha net ifade',
      targets: [3],
      proposal: 'Toplantı büyüklükleri 2 kişiden 10 kişiye kadar değişiyor.',
      why: 'Aynı bilgiyi daha kısa ve net söyler.'
    },
    {
      id: 'r1-5', kind: 'add', badge: 'Ekleyin', title: 'Somut sonuç',
      targets: [2],
      question: 'Hazırladığın bir analizin sonucunu bir örnekle anlatabilir misin?',
      example: 'Hazırladığım analiz sayesinde [ekip/süreç] [ne kadar] hızlandı.',
      why: 'Bir sonuç örneği, katkını görüşmecinin gözünde canlandırır.'
    }
  ];

  // "Hikâyemi kur" sonrası gösterilen kontrol listesi.
  const buildChecklist = [
    'Aldığın bir sertifika varsa adını ekleyebilirsin.',
    'Hazırladığın bir analiz dokümanını örnek verebilirsin.'
  ];

  // "Sen anlat" bölümünde "Örnek sonucu göster" ile açılan kurgusal ölçüm.
  const rehearsal = {
    seconds: 84, wpm: 132, fillers: 1, missed: 2, emphasized: '3/5',
    good: 'Anlatımında neredeyse hiç dolgu sözcüğü yoktu.',
    feedback: [
      { heard: '“Toplantı büyüklükleri 2 kişiden 10 kişiye kadar değişiyor.” cümlesini anlatmadın (toplam 2 cümle anlatılmadı).',
        effect: 'Bu cümledeki bilgi dinleyiciye ulaşmadı.',
        tip: 'Bu cümleyi kendi sözlerinle anlatıma ekle ya da gerekli değilse hikâyeden birlikte çıkaralım.',
        retry: 'Bu bölümü tekrar anlat.' },
      { heard: '“iş analisti stajyeri” vurgulamak istediğin bir ifadeydi; sesin cümlenin geri kalanıyla aynı seviyede kaldı.',
        effect: 'Hikâyenin asıl mesajı çevresindeki sözlerden ayrışmadı.',
        tip: 'İfadeden hemen önce kısa bir duraklama yap, ifadeyi biraz yavaş ve belirgin söyle.',
        retry: 'Bu cümleyi bir kez daha dene.' }
    ],
    emphasis: [
      { phrase: 'iş analisti stajyeri', heard: false },
      { phrase: 'sekiz projede', heard: true },
      { phrase: 'temel seviyede kod bilgisi', heard: true },
      { phrase: 'niteliğine odaklanan', heard: true },
      { phrase: 'proje yöneticisi', heard: false }
    ]
  };

  // Dolgu sözcükleri (Sen anlat ölçümü).
  const fillers = ['ee', 'eee', 'ıı', 'ııı', 'hmm', 'şey', 'yani', 'hani', 'işte', 'aslında', 'falan'];

  // K103 (Etap 6): örnek veri YALNIZ yerel önizleme modunda (gate.js APP_PREVIEW, K102). Gerçek oturumda
  // StoryFlowSample null'dır; ekranlar API verisini (hikaye-akis-api.js) kullanır. Dolgu sözcükleri örnek veri
  // değildir; ortak listesi StoryFlow.FILLERS'tadır.
  window.StoryFlowSample = window.APP_PREVIEW === true
    ? Object.freeze({ story, cv, firstReading, buildChecklist, rehearsal, fillers })
    : null;
})();
