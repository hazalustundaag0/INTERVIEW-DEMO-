(function () {
  window.DEMO_HIKAYE_GAP_TYPES = {
    mainQuestions: {
      1: 'Kariyerinde başardığın ve en çok gurur duyduğun şeyi anlatır mısın?',
      2: 'Bunu başardığında ne hissettin, seni bu işte en çok ne heyecanlandırıyor?',
      3: 'Seni en çok zorlayan dönem hangisiydi, onu nasıl aştın?',
      4: 'Seni tanıyan insanlar seni hangi üç kelimeyle anlatır?',
      5: 'Bir sonraki adımda nereye gitmek istiyorsun, yaşadıkların seni buna nasıl hazırladım?'
    },
    gapTypes: [
      {
        id: 'achievement-type-unclear',
        label: 'Başarının ne olduğu net değilse',
        mainQuestionNo: 1,
        inputType: 'choice',
        question: 'Hangi tür bir başarıyı anlatmak istersin?',
        options: [
          'Bir hedefi veya kotayı aştım',
          'Zor bir müşteriyi veya anlaşmayı kazandım',
          'Bir ekibi veya süreci kurdum/geliştirdim',
          'Yeni bir pazarı veya ürünü büyüttüm'
        ]
      },
      {
        id: 'achievement-result-missing',
        label: 'Somut sonuç eksikse',
        mainQuestionNo: 1,
        inputType: 'number',
        question: 'Bu başarıyı bir rakamla anlatabilir misin?',
        answerTemplate: 'Bu başarıyı {answer} ile ifade edebilirim.',
        helperText: 'Kesin rakamı hatırlamıyorsan tahmini aralık yazabilirsin.',
        valuePlaceholder: 'Örn. %12 veya 10–15 adet',
        periodPlaceholder: 'Dönem (ör. 2023 4. çeyrek)',
        deferLabel: 'Rakam paylaşmak istemiyorum'
      },
      {
        id: 'achievement-role-unclear',
        label: 'Kendi rolü belirsizse',
        mainQuestionNo: 1,
        inputType: 'choice',
        question: 'Bu başarıda senin rolün neydi?',
        options: [
          'Süreci tek başıma yönettim',
          'Ekibi yönlendirdim',
          'Ekibin önemli bir parçasıydım'
        ]
      },
      {
        id: 'emotion-missing',
        label: 'Duygu yoksa',
        mainQuestionNo: 2,
        inputType: 'choice',
        question: 'Bunu başardığında en çok ne hissettin?',
        answerTemplate: 'Bunu başardığımda {answer} hissettim.',
        options: [
          'Gurur',
          'Rahatlama',
          'Kendime güven',
          'Ekibimle paylaşmanın mutluluğu'
        ]
      },
      {
        id: 'excitement-source-missing',
        label: 'Heyecan kaynağı yoksa',
        mainQuestionNo: 2,
        inputType: 'choice',
        question: 'Seni bu işte en çok ne heyecanlandırıyor?',
        answerTemplate: 'Beni bu işte en çok {answer} heyecanlandırıyor.',
        options: [
          'Müşterilerle uzun vadeli ilişki kurmak',
          'Büyüyen bir ürünün veya ekibin parçası olmak',
          'Yeni bir alan öğrenmek ve gelişmek',
          'Daha fazla sorumluluk ve liderlik almak'
        ]
      },
      {
        id: 'challenge-unclear',
        label: 'Zorluk belirsizse',
        mainQuestionNo: 3,
        inputType: 'choice',
        question: 'Seni en çok zorlayan şey neydi?',
        answerTemplate: 'Beni en çok zorlayan şey {answer} oldu.',
        options: [
          'Hedef baskısı',
          'Zor bir müşteri veya itiraz yönetimi',
          'Yeni bir ürün veya pazar öğrenmek',
          'Ekip içi koordinasyon veya değişim'
        ]
      },
      {
        id: 'challenge-solution-missing',
        label: 'Nasıl aştığı eksikse',
        mainQuestionNo: 3,
        inputType: 'short',
        question: 'Bunu nasıl aştın?',
        helperText: 'Tek veya iki cümleyle yanıtlayabilirsin.',
        maxSentences: 2,
        deferLabel: 'Seansta konuşalım'
      },
      {
        id: 'challenge-lesson-missing',
        label: 'Öğrendiği ders eksikse',
        mainQuestionNo: 3,
        inputType: 'short',
        question: 'Bu dönemden ne öğrendin?',
        optional: true
      },
      {
        id: 'three-words-incomplete',
        label: 'Üç kelimeden az verildiyse',
        mainQuestionNo: 4,
        inputType: 'short',
        question: 'Üç kelimeyi tamamlayalım; seni tanıyanlar sana başka hangi sıfatı kullanır?',
        answerTemplate: 'Seni tanıyanların kullanacağı başka bir sıfat: {answer}.',
        helperText: 'Eksik sayıda kelimeyi gir.',
        targetWordCount: 3
      },
      {
        id: 'three-words-empty',
        label: 'Hiç verilmediyse',
        mainQuestionNo: 4,
        inputType: 'multi-choice',
        question: 'Sana en yakın üç kelimeyi seç.',
        answerTemplate: 'Beni tanıyanlar beni {answer} olarak anlatıyor.',
        selectionLimit: 3,
        options: [
          'Güvenilir',
          'Kararlı',
          'Dinleyen',
          'Enerjik',
          'Analitik',
          'Yaratıcı',
          'Sabırlı',
          'Hedef odaklı'
        ]
      },
      {
        id: 'three-words-evidence-missing',
        label: 'Kelimelere kanıt gerekiyorsa',
        mainQuestionNo: 4,
        inputType: 'short',
        question: 'Bu kelimelerden birini en iyi anlatan kısa bir an hatırlıyor musun?',
        answerTemplate: 'Bu kelimelerden birini anlatan kısa bir an: {answer}.',
        optional: true
      },
      {
        id: 'target-role-unclear',
        label: 'Hedef rol belirsizse',
        mainQuestionNo: 5,
        inputType: 'choice',
        question: 'Bir sonraki adımda hangi tür role gitmek istiyorsun?',
        answerTemplate: 'Bir sonraki adımda {answer} istiyorum.',
        options: [
          'Kıdemli bireysel katkıcı',
          'Takım lideri / yönetici',
          'Stratejik hesap veya iş ortaklığı yönetimi',
          'Yeni bir sektöre veya alana geçiş'
        ]
      },
      {
        id: 'past-preparation-missing',
        label: 'Geçmişle bağ kurulmamışsa',
        mainQuestionNo: 5,
        inputType: 'short',
        question: 'Yaşadıkların seni bu role nasıl hazırladı?',
        helperText: 'Tek cümleyle yanıtlayabilirsin.',
        deferLabel: 'Seansta konuşalım'
      },
      {
        id: 'transition-reason-missing',
        label: 'Geçiş nedeni eksikse',
        mainQuestionNo: 5,
        inputType: 'choice',
        question: 'Bu yönde ilerlemene ne sebep oldu?',
        answerTemplate: 'Bu yönde ilerlememe {answer} sebep oldu.',
        options: [
          'Mevcut rolde öğrenme alanı kalmadı',
          'İlgim yeni bir alana kaydı',
          'Bir mentor veya deneyim yönlendirdi',
          'Kariyer hedefimi netleştirdim'
        ]
      }
    ]
  };
})();
