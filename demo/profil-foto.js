// profil-foto.js — Adayın profil fotoğrafı: yükle / değiştir / kaldır (83, Etap 4 · K83/K90/K91, GAP-B23).
//   PUT    /me/avatar   multipart `file` (JPEG/PNG/WebP, ≤ 2 MB, her kenar 32–4096 px) → { avatar_url }
//   DELETE /me/avatar   → 204 (idempotent)
//   GET    /candidate/profile → avatar_url (göreli, ör. "/me/avatar?v=…"; yoksa null → baş harfler)
// K91: sunucu yeniden kodlamaz → seçilen görsel canvas ile en uzun kenarı ≤ 1024 px olacak şekilde küçültülür
// (bu, EXIF/GPS'i de düşürür; sunucu ayrıca temizler). Fotoğraf isteğe bağlıdır (KVKK); yalnız aday ve
// atanmış danışmanı görür (K90). Görüntü: kendi fotoğrafı Bearer ister → avatar.js + Api.avatarSrc
// (fetch + Authorization → blob:; token URL'e girmez). localStorage kullanılmaz.
(function () {
  'use strict';

  const block = document.querySelector('[data-profile-photo]');
  if (!block || !window.Api) return;
  const avatar = block.querySelector('[data-avatar-self]');
  const pick = block.querySelector('[data-action="avatar-pick"]');
  const remove = block.querySelector('[data-action="avatar-remove"]');
  const input = block.querySelector('[data-avatar-input]');
  const status = block.querySelector('[data-avatar-status]');
  const body = block.querySelector('.profile-photo-body') || block;

  const MAX_EDGE = 1024;                 // K91
  const MAX_BYTES = 2 * 1024 * 1024;     // sunucu sınırı (küçültülmüş dosya)
  // Etap 14 (TC-ADAY-07-005/009): seçilen ÖZGÜN dosya en fazla 5 MB. Daha büyüğü seçimde reddedilir, yüklenmez;
  // ≤ 5 MB dosyalar tarayıcıda en uzun kenar 1024 px olacak şekilde küçültülüp (≤ 2 MB) gönderilir (K91).
  const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  let photoUrl = null;
  let busy = false;

  function setStatus(text) {
    if (status) status.textContent = text || '';
  }

  function render() {
    const has = Boolean(photoUrl);
    pick.textContent = has ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle';
    remove.hidden = !has;
    block.dataset.photoState = has ? 'photo' : 'none';
    // Kendi avatarı: önce oturumdaki (/auth/me) değer; burada sayfanın bildiği güncel değer yazılır.
    if (avatar && window.DemoAvatar) window.DemoAvatar.render(avatar, { url: photoUrl || '' });
    else if (avatar) {
      if (photoUrl) avatar.dataset.avatarUrl = photoUrl; else delete avatar.dataset.avatarUrl;
    }
  }

  function setBusy(value, button, text) {
    busy = value;
    pick.disabled = value;
    remove.disabled = value;
    if (button) window.Api.ui.setLoading(button, value, text ? { text } : undefined);
    block.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  // Sunucu hata kodları → anlaşılır Türkçe (60 sözleşmesi: 413/415/422/400/403).
  function errorText(error) {
    const code = error && error.code;
    const status = error && error.status;
    if (status === 413 || code === 'avatar_too_large' || code === 'payload_too_large') {
      return 'Fotoğraf en fazla 2 MB olabilir. Daha küçük bir fotoğraf seç.';
    }
    if (status === 415 || code === 'unsupported_image_type') {
      return 'Bu dosya türü desteklenmiyor. JPEG, PNG veya WebP biçiminde bir fotoğraf seç.';
    }
    if (code === 'invalid_image_dimensions') {
      return 'Fotoğrafın her kenarı 32 ile 4096 piksel arasında olmalı.';
    }
    if (status === 422) {
      const field = error.fields && error.fields.file;
      return field ? window.Api.ui.fieldMessage(field) : 'Fotoğraf kabul edilmedi. Başka bir fotoğraf dene.';
    }
    if (status === 400 || code === 'empty_file' || code === 'invalid_multipart') {
      return 'Fotoğraf okunamadı. Dosyanın bozuk olmadığından emin olup tekrar dene.';
    }
    if (status === 403) return 'Bu hesapla profil fotoğrafı yüklenemiyor.';
    return window.Api.ui.message(error);
  }

  function showError(message) {
    window.Api.ui.showError(body, message, { position: 'append' });
  }

  function clearError() {
    window.Api.ui.clearError(body);
    body.querySelectorAll(':scope > .api-alert').forEach(node => node.remove());
  }

  // ─── Küçültme (K91) ──────────────────────────────────────────────────────────
  function loadImage(file) {
    if (typeof window.createImageBitmap === 'function') {
      return window.createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(() => window.createImageBitmap(file));
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function toBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function prepare(file) {
    const image = await loadImage(file);
    const width = image.width;
    const height = image.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    if (scale === 1 && file.size <= MAX_BYTES) {
      if (image.close) image.close();
      return file;   // zaten küçük: olduğu gibi (sunucu EXIF'i temizler)
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (image.close) image.close();
    let type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    let blob = await toBlob(canvas, type, 0.9);
    if (!blob || blob.size > MAX_BYTES || blob.type !== type) {
      type = 'image/jpeg';
      blob = await toBlob(canvas, type, 0.85);
    }
    if (!blob) throw new Error('encode');
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const base = String(file.name || 'profil').replace(/\.[^.]+$/, '') || 'profil';
    return new File([blob], base + '.' + ext, { type });
  }

  // ─── Oturum avatarının tazelenmesi ───────────────────────────────────────────
  async function refreshSession() {
    try {
      // /auth/me önbelleği güncellenir → 'api:session' → menü/başlık avatarları avatar.js ile yeniden çizilir.
      await window.Api.auth.me({ redirectOn401: false });
    } catch (error) {
      // Önbellek tazelenemese de bu sayfadaki görünüm günceldir.
    }
  }

  async function upload(file) {
    clearError();
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      showError('Bu dosya türü desteklenmiyor. JPEG, PNG veya WebP biçiminde bir fotoğraf seç.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
      showError('Fotoğraf en fazla 5 MB olabilir (seçilen: ' + mb + ' MB). Daha küçük bir fotoğraf seç.');
      if (input) input.value = '';
      return;
    }
    setBusy(true, pick, 'Yükleniyor…');
    setStatus('');
    try {
      let prepared;
      try {
        prepared = await prepare(file);
      } catch (error) {
        showError('Fotoğraf okunamadı. Dosyanın bozuk olmadığından emin olup tekrar dene.');
        return;
      }
      const result = await window.Api.upload('/me/avatar', { method: 'PUT', file: prepared });
      photoUrl = (result && result.avatar_url) || null;
      window.Api.forgetAvatars();   // eski blob adresleri bırakılır
      render();   // QA-028a: önce sayfadaki avatar yeni adrese geçer, sonra oturum tazelenir
      await refreshSession();
      setStatus('Fotoğrafın kaydedildi.');
    } catch (error) {
      showError(errorText(error));
    } finally {
      setBusy(false, pick);
      render();
    }
  }

  async function removePhoto() {
    clearError();
    setBusy(true, remove, 'Kaldırılıyor…');
    setStatus('');
    try {
      await window.Api.del('/me/avatar');
      photoUrl = null;
      window.Api.forgetAvatars();   // eski blob adresleri bırakılır
      render();   // QA-028a: eski /me/avatar?v= adresi bir daha istenmez (404 yok)
      await refreshSession();
      setStatus('Fotoğrafın kaldırıldı.');
    } catch (error) {
      showError(errorText(error));
    } finally {
      setBusy(false, remove);
      render();
      pick.focus();
    }
  }

  pick.addEventListener('click', event => {
    event.preventDefault();
    if (busy) return;
    input.value = '';
    input.click();
  });
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = '';
    upload(file);
  });
  remove.addEventListener('click', event => {
    event.preventDefault();
    if (!busy) removePhoto();
  });

  async function init() {
    try {
      if (window.sessionReady) await window.sessionReady;
      const profile = await window.Api.get('/candidate/profile');
      photoUrl = (profile && profile.avatar_url) || null;
      render();
      pick.disabled = false;
    } catch (error) {
      // Profil formu kendi hata kutusunu gösterir; burada yalnız düğme kapalı kalır.
      setStatus('Fotoğraf bilgisi alınamadı.');
    }
  }

  // QA-024: init, tüm betikler (aday-yolculuk.js dahil) çalıştıktan ve oturum doğrulandıktan sonra başlar.
  new Promise(resolve => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve()))
    .then(() => window.sessionReady).then(init);
})();
