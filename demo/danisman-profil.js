(function () {
  var profile = null;
  try {
    var storedProfile = localStorage.getItem('guruProfile');
    profile = storedProfile ? JSON.parse(storedProfile) : null;
  } catch (error) {
    console.error('Danışman profili okunamadı.', error);
  }

  if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
    var profileName = document.getElementById('advisor-profile-name');
    var avatar = document.querySelector('.advisor-profile-avatar');
    var title = document.querySelector('.advisor-profile-title');
    var about = document.querySelector('.advisor-profile-about p');
    var experience = document.querySelector('.advisor-profile-experience');
    var tagsList = document.querySelector('.advisor-profile-tags');
    if (typeof profile.name === 'string' && profile.name.trim()) {
      profileName.textContent = profile.name.trim();
      avatar.textContent = profile.name.trim().split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0).toLocaleUpperCase('tr-TR');
      }).join('');
    }
    if (typeof profile.title === 'string' && profile.title.trim()) title.textContent = profile.title.trim();
    if (typeof profile.about === 'string') about.textContent = profile.about;
    if (Number.isFinite(Number(profile.experience)) && Number(profile.experience) >= 0) {
      experience.replaceChildren();
      var experienceIcon = document.createElement('span');
      experienceIcon.className = 'material-symbols-outlined';
      experienceIcon.setAttribute('aria-hidden', 'true');
      experienceIcon.textContent = 'workspace_premium';
      experience.append(experienceIcon, document.createTextNode(' ' + Number(profile.experience) + '+ yıl deneyim'));
    }
    if (Array.isArray(profile.expertise)) {
      tagsList.replaceChildren();
      profile.expertise.filter(function (tag) { return typeof tag === 'string'; }).slice(0, 6).forEach(function (tag) {
        var item = document.createElement('li');
        item.textContent = tag;
        tagsList.append(item);
      });
    }
    if (Number.isFinite(Number(profile.price)) && Number(profile.price) >= 0) {
      document.querySelector('[data-session-price]').textContent = new Intl.NumberFormat('tr-TR').format(Number(profile.price)) + ' ₺';
    }
  } else {
    var fallbackName = document.getElementById('advisor-profile-name');
    var fallbackAvatar = document.querySelector('.advisor-profile-avatar');
    if (fallbackName && fallbackAvatar) {
      fallbackAvatar.textContent = fallbackName.textContent.trim().split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0).toLocaleUpperCase('tr-TR');
      }).join('');
    }
  }

  var selection;
  try {
    var storedSelection = localStorage.getItem('demoSecim');
    selection = storedSelection ? JSON.parse(storedSelection) : null;
  } catch (error) {
    console.error('Danışman seans bilgileri okunamadı.', error);
  }

  var selectedProfileName = profile && typeof profile.name === 'string' && profile.name.trim()
    ? profile.name.trim()
    : 'Selin Arslan';
  if (!selection || (selection.guru && selection.guru !== selectedProfileName)) return;

  var sessionMinutes = Number(selection.minutes);
  var sessionCount = Number(selection.sessions);
  var sessionPrice = Number(selection.price);

  if (Number.isFinite(sessionMinutes) && sessionMinutes > 0) {
    document.querySelector('[data-session-minutes]').textContent = sessionMinutes + ' dakika';
  }
  if (Number.isFinite(sessionCount) && sessionCount > 0) {
    document.querySelector('[data-session-count]').textContent = sessionCount + ' seans';
  }
  if (!profile && Number.isFinite(sessionPrice) && sessionPrice > 0) {
    document.querySelector('[data-session-price]').textContent =
      new Intl.NumberFormat('tr-TR').format(sessionPrice) + ' ₺';
  }
})();
