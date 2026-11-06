# Sayfa Envanteri ve API Eşlemesi

## Okuma notu

Bu envanter `demo/` altındaki **ana dizindeki 44 HTML sayfasını** kapsar; `stitch_...` altındaki tasarım/önizleme HTML'leri ana route kabul edilmemiştir. Route sütunu dosya adını; sorgu parametreleri olan yerlerde ilgili parametreleri gösterir. UI düz HTML/JavaScript demosudur ve aşağıdaki API'ler önerilen backend gereksinimleridir; sayfalar bugün bu API'lere bağlı değildir.

**VARSAYIM:** Endpoint örnekleri `/api/v1` önekli HTTP/JSON kaynaklarıdır; hosting, auth biçimi ve API standardı seçilmemiştir. `— (API yok)` statik yönlendirme/onay/yardım ekranını ifade eder; UI state'inin kalıcı backend kaydı olduğunu göstermez.

## Sayfa → Gerekli Endpoint

| Route | Amaç ve ekrandaki veri alanları | Kullanıcı aksiyonları | Gerekli API uçları (öneri) |
|---|---|---|---|
| `index.html` | Ürün tanıtımı, süreç adımları ve örnek çıktılar | Danışmanları gör, hizmete ilerle; video düğmesi yakında | `GET /services`, `GET /gurus` |
| `danismanlar.html` | Guru dizini; isim/unvan/uzmanlık, sektör ve sıralama | İsim/uzmanlık arama, sektör filtreleri, Önerilen/A-Z/Deneyim sıralama, filtreleri temizle, profili aç | `GET /gurus?q=&sector=&sort=` |
| `danisman.html?id={guruId}` | Seçilmiş Guru profili, sektör/deneyim/uzmanlık, müsaitlik ve hizmet CTA | Profili incele, hizmet seçimine veya randevu akışına geç | `GET /gurus/{guruId}`, `GET /gurus/{guruId}/availability`, `GET /services` |
| `danisman-profil.html?id={guruId}` | Eski profil URL'si; `danisman.html`'e yönlendirir | Otomatik redirect, alternatif profil bağlantısı | `GET /gurus/{guruId}` hedef sayfada |
| `kayit.html` | Ad soyad, e-posta, parola alanları | Alan doğrula, hesap oluştur, girişe geç | `POST /auth/register`, `POST /auth/email-verifications` |
| `eposta.html` | E-posta ve 6 haneli kod kutuları | Kodu gir/doğrula, tekrar gönder, kayıttaki e-postayı değiştir | `POST /auth/email-verifications/confirm`, `POST /auth/email-verifications` |
| `giris.html` | Aday e-posta/parola, rol sekmeleri | Giriş, parola görünürlüğü, kayıt/Guru girişine geç, parola yardımı | `POST /auth/sessions`, `POST /auth/password-resets` (ürün kararı gerekli) |
| `giris-danisman.html` | Guru e-posta/parola; yöneticiyle iletişim metni | Guru girişi, parola göster/gizle, aday girişine geç | `POST /auth/sessions`; iletişim formu UI'da yok, `—` |
| `giris-hata-rol.html` | Yanlış rol uyarısı ve giriş alanları | Doğru rol girişine geç, tekrar giriş | `POST /auth/sessions` |
| `davet.html` | Guru hesap etkinleştirme, e-posta/parola/tekrar parola | Hesabı etkinleştir, parola göster/gizle | `POST /auth/invitations/accept` (rapor hedef akışının API ayrıntısı teyit edilmeli) |
| `hizmet.html` | Hizmet kartları; Guru kataloğu, sektör uzmanlıkları, seçili hizmet/Guru, fiyat/seans özeti | Hizmet seç, isim ara, sektör filtresi, Guru seç, profili aç, siparişe geç | `GET /services`, `GET /gurus?q=&sector=`, `POST /enrollments` |
| `siparis.html` | Sipariş özeti, Guru/hizmet/seans/fiyat, hizmet onayı, KVKK rızası, kart/havale seçimi | Siparişi onayla, rıza/policy görüntüle, ödeme türünü seç, ödemeyi başlat | `GET /enrollments/{id}`, `POST /enrollments/{id}/consents`, `POST /enrollments/{id}/payments` |
| `odeme-ok.html` | Ödeme alındı, makbuz özeti ve sonraki adımlar | Profilini doldur, ana ekrana dön, makbuzu yazdır | `GET /payments/{id}`, `GET /enrollments/{id}` |
| `odeme-bekle.html` | Ödeme durumu kontrol ediliyor | Bekleme/yenileme veya ana ekrana git | `GET /payments/{id}` (yenileme aralığı sunucu/istemci kararı) |
| `odeme-hata.html` | Ödeme başarısız bilgisi ve referans görünümü | Tekrar dene, siparişe dön | `GET /payments/{id}`, `POST /enrollments/{id}/payments` |
| `ana.html` | Aday ilerlemesi, sonraki adım, seanslar, Guru ve not özetleri | Hikâye oluştur, notları oku, seans/ödev/profil ekranına git | `GET /me`, `GET /me/enrollments`, `GET /me/appointments`, `GET /me/notes`, `GET /me/assignments`, `GET /story-sessions/current` |
| `profil.html` | Hedef pozisyon, sektör, katılım nedeni, ek notlar; hazırlık adımları | Alan seç/gir, kaydet-devam et veya ertele | `GET /profile-form`, `GET /me/profile`, `PUT /me/profile` |
| `cv.html` | CV yükle/elle giriş sekmeleri, ayrıştırılmış deneyim/eğitim/yetkinlikler ve kontrol kutuları | Dosya yükle/değiştir, sekme değiştir, kayıt düzenle/sil, kontrol/onayla ve randevuya geç | `POST /enrollments/{id}/cv-files`, `POST /enrollments/{id}/cv-manual-entry`, `GET /cv-files/{id}`, `PUT /cv-files/{id}/approval` |
| `randevu-on.html` | Randevu öncesi profil, rıza ve CV adımları | Eksik adımı tamamla, randevu al/takvime geç | `GET /enrollments/{id}/booking-readiness`; güncelleme uçları ilgili profil/consent/CV sayfalarında |
| `takvim.html` | Ay takvimi, Guru uygun gün/saatleri, seçili randevu özeti | Ay değiştir, gün/saat seç, randevuyu onayla | `GET /gurus/{guruId}/availability?from=&to=`, `POST /enrollments/{id}/appointments` |
| `randevu-ok.html` | Seans no, Guru, tarih/saat ve teyit | Ana ekrana veya seanslara git | `GET /me/appointments`, `GET /appointments/{id}` |
| `seanslar.html` | Yaklaşan/tamamlanan sekmeleri; seans, tarih/saat, Guru, ücret, not bağlantısı | Sekme değiştir, seans detayını/notu aç, randevu takvimine git | `GET /me/appointments`, `GET /me/notes` |
| `seans-notlari.html` | İlk seans notları, genel not ve sonraki adımlar | Seans/hikâye akışına dön | `GET /me/notes?session=1` |
| `seans2-ok.html` | İkinci seans planlandı teyidi | Ana ekrana veya seanslara dön | `GET /me/appointments` |
| `hikaye-giris.html` | YZ ile oluşturma veya hazır hikâye yükleme seçimi, Guru notu | Sorulara başla, hikâye yükle | `GET /story-sessions/current`, `POST /enrollments/{id}/story-sessions`, `GET /me/notes` |
| `soru1.html` | İlk ana soru, cevap alanı, autosave/progress | Cevapla, atla/bilmiyorum, sonraki soru, sonra devam et | `GET /story-sessions/{id}`, `PUT /story-sessions/{id}/answers/{questionId}`, `POST /story-sessions/{id}/answers/{questionId}/skip` |
| `soru2.html` | İkinci ana soru ve cevap | Cevapla, atla, önceki/sonraki, sonra devam et | `GET /story-sessions/{id}`, `PUT /story-sessions/{id}/answers/{questionId}`, `POST /story-sessions/{id}/answers/{questionId}/skip` |
| `soru3.html` | Üçüncü ana soru ve cevap | Cevapla, atla, önceki/sonraki, sonra devam et | `GET /story-sessions/{id}`, `PUT /story-sessions/{id}/answers/{questionId}`, `POST /story-sessions/{id}/answers/{questionId}/skip` |
| `soru4.html` | Dördüncü ana soru ve cevap | Cevapla, atla, önceki/sonraki, sonra devam et | `GET /story-sessions/{id}`, `PUT /story-sessions/{id}/answers/{questionId}`, `POST /story-sessions/{id}/answers/{questionId}/skip` |
| `soru5.html` | Beşinci ana soru ve cevap | Cevapla, atla, önceki soruya dön, hikâyeyi üret, sonra devam et | `GET /story-sessions/{id}`, `PUT /story-sessions/{id}/answers/{questionId}`, `POST /story-sessions/{id}/generate` |
| `hikaye-yukle.html` | Hikâye metni, dosya/metin girişi ve kelime sayısı | Metni yapıştır/dosya seç, yükle ve çıktıları oluştur | `POST /story-sessions/{id}/drafts`, `POST /story-sessions/{id}/generate` |
| `ciktilar.html` | Hikâye, kısa özet, mülakat cevapları, CV özeti ve kaynak/boşluk alanları | Hikâyeyi düzenle/kaydet, çıktıları aç/indir, yeniden üret | `GET /story-sessions/{id}/outputs`, `GET /story-sessions/{id}/drafts`, `POST /story-sessions/{id}/drafts`, `POST /story-sessions/{id}/generate` |
| `odevler.html` | Adaya atanmış ödev/belge talepleri ve durumları | Talep detayını aç, teslim ekranına git | `GET /me/assignments` |
| `odev-goruntule.html` | Tek ödev başlığı/açıklaması/son tarihi ve durumu | Listeye dön, teslim et | `GET /assignments/{id}`, `GET /me/assignments` |
| `odev-teslim.html` | Dosya veya metin sekmesi, dosya inputu, cevap textarea | Dosya/metin seç, teslim et, vazgeç/geri dön | `POST /assignments/{id}/submissions` |
| `guru-danisanlar.html` | Aday tablosu: ad, hedef rol, seans, hikâye durumu, son işlem | Adayı aç | `GET /guru/candidates` |
| `guru-danisan-detay.html` | Dinamik aday kartı, Genel/Hikâye/Notlar/Ödevler sekmeleri, profil ön bilgisi ve seanslar | Sekme seç, seansı tamamlandı işaretle, not/ödev/hikâyeye git | `GET /guru/candidates/{candidateId}`, `GET /guru/candidates/{candidateId}/appointments`, `PATCH /appointments/{id}` |
| `guru-hikaye.html` | Aday hikâyesi, takip soruları, cevap kaynakları ve eksik bilgi alanları | Kaynakları incele, cümle yorumu/notu ekle, takip/gap türünü ata | `GET /guru/story-sessions/{id}`, `GET /guru/story-sessions/{id}/sources`, `POST /story-sessions/{id}/notes` |
| `guru-notlar.html` | Seans seçimi, not textarea, önceki notlar/taslak-paylaşım durumu | Taslak kaydet, adaya paylaş, güncelle/iptal et | `GET /enrollments/{id}/notes`, `POST /enrollments/{id}/notes`, `POST /enrollments/{id}/notes/{noteId}/share`, `PUT /enrollments/{id}/notes/{noteId}` |
| `guru-odevler.html` | Yeni talep türü (ödev/belge/soru), başlık, açıklama/sorular, son tarih, verilenler | Tür seç, alan düzenle, soru ekle, adaya gönder, talep detayını görüntüle | `GET /enrollments/{id}/assignments`, `POST /enrollments/{id}/assignments`, `GET /assignments/{id}` |
| `guru-musaitlik.html` | Guru takvimi ve müsait/rezerve slotlar | Takvimde gezin, saat ekle/düzenle/sil | `GET /guru/availability?from=&to=`, `PUT /guru/availability`, `DELETE /guru/availability/{slotId}` |
| `guru-musaitlik-ekle.html` | Tarih, saat aralığı, haftalık tekrar ve tekrar sayısı | Tarih seç, tekrar seçeneği ayarla, saatleri kaydet | `POST /guru/availability` |
| `guru-seanslar.html` | Aday, seans sırası/durumu/tarih ve bağlantı durumu | Yaklaşan/tamamlanan filtrele, seansı tamamlandı işaretle, bağlantıyı aç/düzenle | `GET /guru/appointments`, `PATCH /appointments/{id}`, `PUT /appointments/{id}/meeting-link` (link yönetimi UI'da demo; ürün kararı gerekli) |
| `guru-profil.html` | Profil tamamlama, ad/unvan/hakkında/sektör/uzmanlık/deneyim/eğitim/fiyat ve yayın önizlemesi | Sekmelerde düzenle, taslak kaydet, yayınla/onayla, çık | `GET /guru/profile`, `PUT /guru/profile`, `POST /guru/profile/publish` |

## Önemli notlar

- `odeme-ok.html`, `odeme-bekle.html` ve `odeme-hata.html` ödeme sonucu görünümüdür; gerçek durum yalnızca sağlayıcıdan doğrulanmış backend kaydıyla belirlenmelidir.
- Guru detayındaki aday ve seans değerleri, `guru-danisanlar.html` tablosu, örnek hikâye ve notlar sabit demo kayıtlarından gelir.
- Aday sayfalarındaki soru/çıktı iş akışı `localStorage` kullanır; sunucu kaydı, resume ve cihazlar arası tutarlılık henüz yoktur.
- Randevu takvimi demo müsaitlik verisiyle çalışır; gerçek zamanlı çakışma engeli API/DB transaction gerektirir.
- Pagination UI'da ana liste sayfalarında görünür değildir. Endpoint pagination destekleyecekse **VARSAYIM** olarak API contract'ta belirtilmeli; ekranda sayfalama varmış gibi yazılmamalıdır.
- Admin UI olmadığı için gereken admin endpointleri [PRD](./PRD.md) ve [API taslağında](./BACKEND-API-SPEC.md) ayrı hedef kapsam olarak yer alır.

## İlgili belgeler

- [PRD ve fonksiyonel gereksinimler](./PRD.md)
- [Veri modeli ve ER diyagramı](./DATA_MODEL.md)
- [Backend API taslağı](./BACKEND-API-SPEC.md)
- [Backend mimarisi](./BACKEND-ARCHITECTURE.md)
