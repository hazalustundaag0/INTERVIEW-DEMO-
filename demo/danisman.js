(function () {
  var main = document.getElementById('advisor-profile');
  if (!main || typeof window.getAdvisor !== 'function') {
    console.error('Danışman profili başlatılamadı: danışman verisi yüklenemedi.');
    return;
  }

  var monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var weekdayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function section(title, icon, className) {
    var article = node('section', 'public-advisor-card ' + (className || ''));
    var heading = node('div', 'public-advisor-section-heading');
    var symbol = node('span', 'material-symbols-outlined', icon);
    var titleId = 'public-advisor-heading-' + title.toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    article.setAttribute('aria-labelledby', titleId);
    symbol.setAttribute('aria-hidden', 'true');
    var headingText = node('h2', '', title);
    headingText.id = titleId;
    heading.append(symbol, headingText);
    article.appendChild(heading);
    return article;
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toLocaleUpperCase('tr-TR');
    }).join('');
  }

  function appendList(items, list, renderer) {
    (items || []).forEach(function (item, index) {
      var row = renderer ? renderer(item, index) : node('li', '', item);
      if (row) list.appendChild(row);
    });
    return list;
  }

  function dateFromKey(value) {
    var parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function formatDate(value) {
    var date = dateFromKey(value);
    return date.getDate() + ' ' + monthNames[date.getMonth()] + ' ' + weekdayNames[date.getDay()];
  }

  function sessionForUser() {
    return typeof window.getSession === 'function'
      ? window.getSession()
      : { role: null, name: '', state: null };
  }

  function makeBookingLink(advisor, cta, slot) {
    var link = node('a', 'public-advisor-booking', cta.label);
    var destination = cta.href;
    if (slot && destination.indexOf('takvim.html?') === 0) {
      var query = new URLSearchParams(destination.split('?')[1]);
      query.set('tarih', slot.tarih);
      query.set('saat', slot.bas);
      destination = 'takvim.html?' + query.toString();
    }
    link.href = destination;
    var icon = node('span', 'material-symbols-outlined', 'arrow_forward');
    icon.setAttribute('aria-hidden', 'true');
    link.appendChild(icon);
    return link;
  }

  function makeCheckoutSelectionLink(advisor) {
    var link = node('a', 'public-advisor-booking', 'Bu danışmanı seç');
    link.href = checkoutSelectionHref(advisor);
    link.setAttribute('aria-label', advisor.ad + ' danışmanını seç ve hizmet seçimine dön');
    var icon = node('span', 'material-symbols-outlined', 'arrow_forward');
    icon.setAttribute('aria-hidden', 'true');
    link.appendChild(icon);
    return link;
  }

  function checkoutSelectionHref(advisor) {
    return 'hizmet.html?danisman=' + encodeURIComponent(advisor.id) + '&from=checkout';
  }

  function makeDisabledBookingButton(cta) {
    var button = node('button', 'public-advisor-booking', cta.label);
    button.type = 'button';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.title = cta.title;
    return button;
  }

  function makeLoginLink(cta) {
    if (!cta.loginHref) return null;
    var link = node('a', 'public-advisor-login-link', 'Hesabın var mı? Giriş yap');
    link.href = cta.loginHref;
    return link;
  }

  function upcomingSlots(advisor) {
    var availability = window.DemoAvailability;
    if (!availability) {
      console.error('Danışman profili için ortak müsaitlik modülü yüklenemedi.');
      return [];
    }
    var slots;
    try {
      slots = availability.loadSlots('demoMusaitlik');
    } catch (error) {
      console.error('Danışman müsaitlikleri yüklenemedi.', error);
      return [];
    }
    var today = new Date();
    var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    return slots.filter(function (slot) {
      return slot.durum === 'musait' && slot.tarih >= todayKey;
    }).sort(function (first, second) {
      return (first.tarih + first.bas).localeCompare(second.tarih + second.bas);
    }).slice(0, 3);
  }

  function renderBooking(advisor, session, slots, previewMode, flow, checkoutFlow) {
    var card = node('aside', 'public-advisor-card public-advisor-booking-card');
    card.setAttribute('aria-labelledby', 'public-advisor-booking-title');
    card.appendChild(node('h2', '', 'Seans bilgileri'));
    card.querySelector('h2').id = 'public-advisor-booking-title';

    var details = node('dl', 'public-advisor-session-details');
    [
      ['Ücret', new Intl.NumberFormat('tr-TR').format(advisor.ucret) + ' ₺'],
      ['Seans süresi', advisor.sure + ' dakika'],
      ['Seans sayısı', advisor.seansSayisi + ' seans']
    ].forEach(function (item) {
      var row = node('div');
      row.append(node('dt', '', item[0]), node('dd', '', item[1]));
      details.appendChild(row);
    });
    card.appendChild(details);

    var cta = checkoutFlow
      ? { checkoutSelection: true, href: checkoutSelectionHref(advisor) }
      : window.getAdvisorCta
        ? window.getAdvisorCta(session, advisor.id, flow)
        : { label: 'Bu danışmanla devam et', href: '', disabled: true, title: 'Danışman işlemi açılamadı' };

    if (previewMode) {
      card.appendChild(node('p', 'public-advisor-advisor-note', 'Önizleme modunda randevu alınamaz.'));
      card.appendChild(node('div', 'public-advisor-slots', 'En yakın müsait saatler önizlemede gösterilmez.'));
    } else {
      var slotsHeading = node('h3', 'public-advisor-slots-heading', 'En yakın müsait saatler');
      card.appendChild(slotsHeading);
      var slotsList = node('div', 'public-advisor-slots');
      slotsList.setAttribute('aria-label', 'En yakın üç müsait seans');
      slots.forEach(function (slot) {
        var slotLabel = formatDate(slot.tarih) + ' · ' + slot.bas;
        if (!cta.hidden && !cta.disabled && cta.href.indexOf('takvim.html?') === 0) {
          var link = makeBookingLink(advisor, { label: slotLabel, href: cta.href }, slot);
          link.classList.add('public-advisor-slot');
          link.setAttribute('aria-label', formatDate(slot.tarih) + ' saat ' + slot.bas + ' için randevu al');
          slotsList.appendChild(link);
        } else {
          slotsList.appendChild(node('span', 'public-advisor-slot public-advisor-slot--static', slotLabel));
        }
      });
      if (!slots.length) {
        slotsList.appendChild(node('p', 'public-advisor-no-slots', 'Şu anda müsait saat yok.'));
      }
      card.appendChild(slotsList);
      if (cta.checkoutSelection) {
        card.appendChild(makeCheckoutSelectionLink(advisor));
      } else if (!cta.hidden) {
        if (cta.mode === 'browse') {
          var storyLink = node('a', 'public-advisor-directory-cta', cta.label);
          storyLink.href = cta.href;
          card.appendChild(storyLink);
        } else {
          card.appendChild(cta.disabled ? makeDisabledBookingButton(cta) : makeBookingLink(advisor, cta));
          var loginLink = makeLoginLink(cta);
          if (loginLink) card.appendChild(loginLink);
        }
      }
    }
    return card;
  }

  function renderSimilar(advisor, flow, checkoutFlow) {
    var published = window.listAdvisors ? window.listAdvisors({ yayindaOlanlar: true }) : [];
    var others = published.filter(function (candidate) { return candidate.id !== advisor.id; });
    var ranked = others.map(function (candidate, index) {
      var overlap = candidate.sektorler.filter(function (sector) {
        return advisor.sektorler.some(function (ownSector) {
          return ownSector.toLocaleLowerCase('tr-TR') === sector.toLocaleLowerCase('tr-TR');
        });
      }).length;
      return { advisor: candidate, overlap: overlap, index: index };
    }).sort(function (first, second) {
      return second.overlap - first.overlap || first.index - second.index;
    }).slice(0, 3);
    if (!ranked.length) return null;

    var wrapper = node('section', 'public-advisor-similar');
    var heading = node('div', 'public-advisor-similar-heading');
    heading.append(node('h2', '', 'Benzer danışmanlar'));
    var allLink = node('a', '', 'Tüm danışmanları gör →');
    allLink.href = 'danismanlar.html' + (flow === 'hikaye' ? '?akis=hikaye' : '');
    heading.appendChild(allLink);
    var grid = node('div', 'public-advisor-similar-grid');
    ranked.forEach(function (entry) {
      var other = entry.advisor;
      var card = node('a', 'public-advisor-similar-card');
      card.href = 'danisman.html?id=' + encodeURIComponent(other.id) +
        (flow === 'hikaye' ? '&akis=hikaye' : checkoutFlow ? '&from=checkout' : '');
      var avatar = node('span', 'public-advisor-similar-avatar', initials(other.ad));
      avatar.setAttribute('aria-hidden', 'true');
      var content = node('span', 'public-advisor-similar-content');
      content.append(node('strong', '', other.ad), node('span', '', other.unvan),
        node('small', '', other.sektorler.slice(0, 2).join(' · ')));
      card.append(avatar, content);
      grid.appendChild(card);
    });
    wrapper.append(heading, grid);
    return wrapper;
  }

  function render(advisor, session, isOwner, previewMode, flow, checkoutFlow) {
    document.title = advisor.ad + ' · Danışman profili';
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = advisor.ad + ' · ' + advisor.unvan + ' danışman profili ve seans bilgileri.';
    main.replaceChildren();
    var layout = node('div', 'public-advisor-layout');
    var content = node('div', 'public-advisor-content');

    var hero = node('article', 'public-advisor-card public-advisor-hero');
    var avatar = node('div', 'public-advisor-avatar', initials(advisor.ad));
    avatar.setAttribute('aria-hidden', 'true');
    var identity = node('div', 'public-advisor-identity');
    identity.append(node('span', 'public-advisor-eyebrow', 'Danışman profili'),
      node('h1', '', advisor.ad), node('p', '', advisor.unvan));
    var credentials = node('div', 'public-advisor-credentials');
    if (advisor.dogrulanmis) {
      var verified = node('span', 'public-advisor-badge');
      var verifiedIcon = node('span', 'material-symbols-outlined', 'verified');
      verifiedIcon.setAttribute('aria-hidden', 'true');
      verified.append(verifiedIcon, document.createTextNode('Doğrulanmış'));
      credentials.appendChild(verified);
    }
    credentials.appendChild(node('span', 'public-advisor-experience', advisor.deneyimYili + '+ yıl deneyim'));
    var rating = node('span', 'public-advisor-rating');
    rating.setAttribute('aria-label', '5 üzerinden ' + advisor.puan.toFixed(1).replace('.', ','));
    rating.append(node('span', 'public-advisor-rating-stars', '★'),
      document.createTextNode(' ' + advisor.puan.toFixed(1) + ' · ' + advisor.seansSayisi + ' seans'));
    credentials.appendChild(rating);
    var sectors = node('ul', 'public-advisor-chips');
    sectors.setAttribute('aria-label', 'Sektörler');
    (advisor.sektorler || []).forEach(function (sector) { sectors.appendChild(node('li', '', sector)); });
    identity.appendChild(sectors);
    hero.append(avatar, identity, credentials);
    content.appendChild(hero);

    if (isOwner && !advisor.yayinda) {
      content.appendChild(node('p', 'public-advisor-owner-status', 'Bu profil şu an yayında değil. Ziyaretçiler profili göremez.'));
    }

    if (advisor.hakkinda) {
      var about = section('Hakkında', 'person_book');
      about.appendChild(node('p', 'public-advisor-copy', advisor.hakkinda));
      content.appendChild(about);
    }

    if (advisor.uzmanlik && advisor.uzmanlik.length) {
      var expertise = section('Uzmanlık alanları', 'stars');
      expertise.appendChild(appendList(advisor.uzmanlik, node('ul', 'public-advisor-chips')));
      content.appendChild(expertise);
    }

    if (advisor.deneyim && advisor.deneyim.length) {
      var experience = section('Deneyim', 'work');
      var experienceList = appendList(advisor.deneyim, node('ol', 'public-advisor-timeline'), function (item) {
        var row = node('li');
        row.append(node('strong', '', item.rol), node('span', '', item.kurum),
          node('small', '', item.baslangic + ' – ' + item.bitis));
        return row;
      });
      experience.appendChild(experienceList);
      content.appendChild(experience);
    }

    if (advisor.egitim && advisor.egitim.length) {
      var education = section('Eğitim', 'school');
      education.appendChild(appendList(advisor.egitim, node('ul', 'public-advisor-records'), function (item) {
        var row = node('li');
        row.append(node('strong', '', item.okul), node('span', '', item.bolum), node('small', '', item.yil));
        return row;
      }));
      content.appendChild(education);
    }

    if (advisor.sertifikalar && advisor.sertifikalar.length) {
      var certificates = section('Sertifikalar', 'workspace_premium');
      certificates.appendChild(appendList(advisor.sertifikalar, node('ul', 'public-advisor-bullet-list')));
      content.appendChild(certificates);
    }

    if (advisor.yaklasim && advisor.yaklasim.length) {
      var approach = section('Seanslar nasıl ilerler?', 'route');
      approach.appendChild(appendList(advisor.yaklasim, node('ol', 'public-advisor-steps'), function (item, index) {
        var step = node('li');
        step.append(node('span', 'public-advisor-step-number', String(index + 1)), node('p', '', item));
        return step;
      }));
      content.appendChild(approach);
    }

    if (advisor.kimlerleCalisirim && advisor.kimlerleCalisirim.length) {
      var audience = section('Kimlerle çalışırım?', 'groups');
      audience.appendChild(appendList(advisor.kimlerleCalisirim, node('ul', 'public-advisor-bullet-list')));
      content.appendChild(audience);
    }

    if (advisor.yorumlar && advisor.yorumlar.length) {
      var reviews = section('Danışan yorumları', 'forum');
      reviews.appendChild(node('p', 'public-advisor-review-summary', '★ ' + advisor.puan.toFixed(1) + ' / 5'));
      reviews.appendChild(appendList(advisor.yorumlar, node('div', 'public-advisor-reviews'), function (item) {
        var review = node('blockquote');
        var reviewTop = node('div', 'public-advisor-review-top');
        reviewTop.append(node('strong', '', item.ad), node('span', 'public-advisor-review-stars', '★'.repeat(item.puan)));
        review.append(reviewTop, node('p', '', item.metin), node('cite', '', item.tarih));
        return review;
      }));
      content.appendChild(reviews);
    }

    if (advisor.sss && advisor.sss.length) {
      var faq = section('Sık sorulan sorular', 'help');
      var faqList = node('div', 'public-advisor-faq');
      advisor.sss.forEach(function (item, index) {
        var entry = node('div', 'public-advisor-faq-item');
        var button = node('button', 'public-advisor-faq-question', item.soru);
        var answerId = 'advisor-faq-answer-' + index;
        var answer = node('p', 'public-advisor-faq-answer', item.cevap);
        button.type = 'button';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', answerId);
        answer.id = answerId;
        answer.hidden = true;
        button.addEventListener('click', function () {
          var expanded = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!expanded));
          answer.hidden = expanded;
        });
        entry.append(button, answer);
        faqList.appendChild(entry);
      });
      faq.appendChild(faqList);
      content.appendChild(faq);
    }

    var aside = renderBooking(advisor, session, upcomingSlots(advisor), previewMode, flow, checkoutFlow);
    layout.append(content, aside);
    main.appendChild(layout);

    var similar = renderSimilar(advisor, flow, checkoutFlow);
    if (similar) main.appendChild(similar);

    var mobileBar = node('div', 'public-advisor-mobile-bar');
    if (!previewMode) {
      var cta = checkoutFlow
        ? { checkoutSelection: true, href: checkoutSelectionHref(advisor) }
        : window.getAdvisorCta
          ? window.getAdvisorCta(session, advisor.id, flow)
          : { label: 'Bu danışmanla devam et', href: '', disabled: true, title: 'Danışman işlemi açılamadı' };
      if (cta.checkoutSelection) {
        mobileBar.appendChild(makeCheckoutSelectionLink(advisor));
      } else if (!cta.hidden && cta.mode !== 'browse') {
        mobileBar.appendChild(cta.disabled ? makeDisabledBookingButton(cta) : makeBookingLink(advisor, cta));
        var mobileLoginLink = makeLoginLink(cta);
        if (mobileLoginLink) mobileBar.appendChild(mobileLoginLink);
      }
    }
    if (mobileBar.childElementCount) document.body.appendChild(mobileBar);
  }

  var session = sessionForUser();
  var params = new URLSearchParams(window.location.search);
  var flow = params.get('akis') === 'hikaye' ? 'hikaye' : null;
  var checkoutFlow = params.get('from') === 'checkout';
  var headerHost = document.getElementById('site-header');
  if (checkoutFlow && headerHost) {
    headerHost.dataset.backLabel = '← Seçime dön';
    headerHost.dataset.backHref = 'hizmet.html?danisman=' + encodeURIComponent(params.get('id') || '') + '&from=checkout';
  }
  var requestedPreview = params.get('onizleme') === '1';
  var advisorId = params.get('id');
  var advisor = advisorId ? window.getAdvisor(advisorId) : null;
  var isOwner = session.role === 'danisman' && advisor && advisor.id === 'selin-arslan';
  var previewMode = requestedPreview && isOwner;

  if (previewMode && advisor) {
    var previewBanner = node('div', 'public-advisor-preview-banner');
    previewBanner.append(node('span', '', 'Önizleme modundasın. Ziyaretçiler profilini böyle görür.'));
    var editLink = node('a', '', 'Düzenlemeye dön');
    editLink.href = 'guru-profil.html';
    previewBanner.appendChild(editLink);
    document.body.insertBefore(previewBanner, main);
  }

  if (!advisor) {
    document.title = 'Danışman bulunamadı · Interview Demo';
    var missingDescription = document.querySelector('meta[name="description"]');
    if (missingDescription) missingDescription.content = 'Danışman bulunamadı. Tüm danışman profillerini görüntüle.';
    var notFound = node('section', 'public-advisor-card public-advisor-not-found');
    notFound.append(node('h1', '', 'Danışman bulunamadı'),
      node('p', '', 'Aradığın danışman profili bulunamadı.'));
    var allAdvisors = node('a', 'public-advisor-directory-cta', 'Tüm danışmanları gör');
    allAdvisors.href = 'danismanlar.html';
    notFound.appendChild(allAdvisors);
    main.replaceChildren(notFound);
    return;
  }

  if (!advisor.yayinda && !isOwner && !previewMode) {
    document.title = advisor.ad + ' · Danışman profili';
    var unpublishedDescription = document.querySelector('meta[name="description"]');
    if (unpublishedDescription) unpublishedDescription.content = 'Bu profil şu an yayında değil.';
    var unpublished = node('section', 'public-advisor-card public-advisor-not-found');
    unpublished.append(node('h1', '', 'Bu profil şu an yayında değil'),
      node('p', '', 'Danışmanlarımızın diğer profillerini inceleyebilirsin.'));
    var publishedList = node('a', 'public-advisor-directory-cta', 'Tüm danışmanları gör');
    publishedList.href = 'danismanlar.html';
    unpublished.appendChild(publishedList);
    main.replaceChildren(unpublished);
    return;
  }

  render(advisor, session, isOwner, previewMode, flow, checkoutFlow);
})();
