# !important Envanteri ve Temizlik Önceliği

Not: Bu rapor yalnızca envanter ve öneri içindir; kaynak CSS dosyaları değiştirilmedi. Sayım, bölümleme ve sınıflandırma selector-level tarama ile yapıldı; `theme.css` içinde yorum başlığı yoktur, bu yüzden bölümler "mantıksal aralıklar" ve "eşit bölütlü satır grupları" üzerinden ayrılmıştır.

## 1) Toplam sayılar

### 1.1 File-level özet

| Dosya | Satır sayısı | `!important` | Kural bloğu sayısı (`!important` içeren) |
|---|---:|---:|---:|
| theme.css | 12583 | 730 | 415 |
| demo/avatar.css | 220 | 21 | 12 |
| demo/guru-client-profile.css | 116 | 0 | 0 |
| demo/header.css | 395 | 18 | 12 |
| demo/pattern.css | 119 | 2 | 2 |
| demo/sidebar.css | 279 | 37 | 11 |
| Toplam demo/*.css | 1129 | 78 | 37 |
| Toplam (theme + demo) | 13712 | 808 | 452 |

### 1.2 Genel sonuç

- `theme.css` tek başına toplam `!important` kullanımının %90,2'sini oluşturuyor: 730 / 808.
- `theme.css` içindeki `!important` yoğunluğu genel olarak global selector (`body`, `button`, `input`, `article`, `table` benzeri) ve geniş kapsamlı override mantığına dayalı.
- `demo/*.css` içindeki `!important` kullanımının büyük kısmı `header.css`, `sidebar.css`, `avatar.css` gibi ayrı bileşen dosyalarına yerleşmiş durumda; bunlar daha küçük ve daha hedefli temizlik için uygun alanlar.

## 2) theme.css bölümlemesi ve yoğunluk sıralaması

`theme.css` içinde yorum başlığı olmadığı için bölümleme, satır kümesi bazlı mantıksal aralıklar ile yapıldı. Bu doğrudan selector family değil, line-bucket yaklaşımıdır.

### 2.1 10 satır bölütü (eşit aralıklı)

| Bölüm | Satır aralığı | `!important` sayısı | Not |
|---|---:|---:|---|
| Bölüm 10 | 11323-12583 | 285 | En yoğun aralık; geniş selector setleri ve çok sayıda bileşen override birleşimi |
| Bölüm 5 | 5033-6291 | 76 | Orta-yüksek yoğunluk |
| Bölüm 3 | 2517-3774 | 73 | Orta-yüksek yoğunluk |
| Bölüm 7 | 7549-8808 | 70 | Mobil/ara bileşenler ve ek görünüm kısımları |
| Bölüm 2 | 1259-2516 | 58 | Temel body ve layout override |
| Bölüm 9 | 10065-11324 | 56 | Sonraki genel yardımcı override |
| Bölüm 4 | 3775-5033 | 54 | Genel hücresel/örnek akış override |
| Bölüm 6 | 6291-7549 | 30 | Daha küçük ama tekrar eden override alanı |
| Bölüm 1 | 1-1258 | 14 | Base reset ve temel token kutusu |
| Bölüm 8 | 8807-10066 | 14 | Güçlü ama dağıtılmış yardımcı override |

### 2.2 En yoğun 10 bölümün sıralanmış özet

1. 11323-12583 — 285 (`!important`)
2. 5033-6291 — 76
3. 2517-3774 — 73
4. 7549-8808 — 70
5. 1259-2516 — 58
6. 10065-11324 — 56
7. 3775-5033 — 54
8. 6291-7549 — 30
9. 1-1258 — 14
10. 8807-10066 — 14

### 2.3 Mantıksal yorum

- En yoğun aralıklar, genel `body`/`main`/`button`/`input`/`badge`/`calendar`/`story-panel` benzeri selector setlerini kapsıyor.
- `theme.css` içinde `!important`'lerin çoğu global override olarak tasarlanmış; bunları temizlemenin ana risk kaynağı, selector genişliği ve page-specific bileşenler üzerinde aşırı öznitelik baskısıdır.
- Öncelik sıralaması için en düşük riskli temizleme alanı, `header.css` ve `sidebar.css` gibi ayrı bileşen dosyalarıdır; ardından `avatar.css`; en riskli alan ise genel `theme.css` body selector override'larıdır.

## 3) Kategori sınıflandırması

Kategoriler tanımlandı:

- a. Tailwind yardımcı sınıfını ezenler (`text-[#...]`, `bg-[#...]`, `rounded-*`, `p-*`, `border-*` vb.)
- b. Satır içi stili ezenler (`[style*="..."]`)
- c. Başka bir CSS dosyasındaki kuralı ezenler (`header.css`, `sidebar.css`, `avatar.css`, `guru-client-profile.css` gibi)
- d. Sayfa ya da bileşene özgü (`body.login-page`, `body.service-selection-page`, `body.shared-sidebar-page` gibi)
- e. Gereksiz / aynı özellik aynı değer tekrarları / artık çökmüş, gereksiz veya özgüllük yeterli olanlar

### 3.1 Kategori dağılımı

| Kategori | Sayı | Yüzde |
|---|---:|---:|
| a. Tailwind helper override | 31 | 3,8% |
| b. Inline style override | 14 | 1,7% |
| c. Diğer CSS dosyasını ezme | 372 | 46,0% |
| d. Sayfa / bileşen özgü override | 304 | 37,6% |
| e. Gereksiz / tekrar / zincir override | 87 | 10,8% |
| Toplam | 808 | 100% |

### 3.2 Kategori notları

- `c` ve `d` toplamı 676; yani `!important`'lerin yaklaşık %83,6'sı ya başka dosyayı eziyor ya da sayfa/bileşen odaklı override. Bu, temizliğin en büyük potansiyeline sahip alanın "component-local override" olduğu anlamına gelir.
- `a` kategorisindeki kullanım, özellikle `text-[]`, `bg-[]`, `rounded-*`, `border-*` gibi Tailwind helper'ları doğrudan ezmek için yazılmış `!important`'lerdir; bunun en az riskli ve en yüksek güvenlikli temizleme alanı, helper/utility üzerinden değil bileşen sınıfı ile çözmek olduğudur.
- `b` kategorisi çok düşük sayıdadır; temizleme maliyeti düşük ama çalışana dair risk de düşüktür.
- `e` kategorisi, özellikle aynı değer yineleyen global override'ları gösterir. Bunlar mostly cosmetic ve "özgüllük zaten yeterli" durumlarında en kolay çıkarılacaklar arasındadır.

## 4) Tekrarlanan seçici + özellik eşleşmeleri

Aşağıdaki liste, aynı `selector + property` kombinasyonlarının birden fazla defa tekrarlandığını gösterir. Bu veri, temizlik önceliğini belirlemede özellikle faydalıdır.

| Tekrar sayısı | Özellik | Seçici örneği |
|---:|---|---|
| 5 | `grid-template-columns` | `body.service-selection-page .demo-service-grid` |
| 4 | `padding-bottom` | `body.service-selection-page main` |
| 3 | `background` | `body.service-selection-page .service-progress-complete .service-progress-marker` |
| 3 | `color` | `body.service-selection-page .service-progress-complete .service-progress-marker` |
| 2 | `animation` | `body *, body *::before, body *::after` |
| 2 | `border-radius` | `body :is(button, input[type="button"], input[type="submit"], ... )` |
| 2 | `border-radius` | `body.advisor-directory-page .advisor-directory-search` |
| 2 | `border-radius` | `body.advisor-directory-page .advisor-directory-tags li` |
| 2 | `color` | `body.advisor-directory-page .advisor-directory-tags li` |
| 2 | `height` | `body.shared-sidebar-page > #sidebar` |
| 2 | `min-height` | `body.shared-sidebar-page > #sidebar` |
| 2 | `position` | `body.shared-sidebar-page > #sidebar` |
| 2 | `width` | `body.shared-sidebar-page > #sidebar` |
| 2 | `margin` | `body.shared-sidebar-page > main` |
| 2 | `padding` | `body.shared-sidebar-page > main` |
| 2 | `width` | `body.shared-sidebar-page > main` |
| 2 | `width` | `body.shared-sidebar-page > main.sidebar-content-grid` |

Not: Bu liste, "tekrar eden en belirgin örnekleri" gösterir; çok daha fazla düşük frekanslı tekrar da vardır. Özellikle `body.service-selection-page` ve `body.shared-sidebar-page` alanları, içsel tekrarların en yoğun olduğu iki bölgedir.

## 5) Önceliklendirme ve temizlik önerileri

### 5.1 Bölüm bazlı öneri

| Bölüm / alan | Fikir | Tahmini satır kazancı | Uygun çözüm tipi | Risk |
|---|---|---:|---|---|
| demo/header.css | `.site-header-button--primary`, `.site-header-button--secondary`, `.site-header-avatar`, user menu override | ~20-35 satır | Bileşen sınıfı + daha özgül selector | Düşük |
| demo/sidebar.css | `#sidebar .sidebar-link[aria-current="page"]`, `> #sidebar`, `> main` | ~25-40 satır | Bileşen sınıfı + layout scope | Düşük-Orta |
| demo/avatar.css | `data-avatar` mapping ve `!important`'lı görünüm override'ları | ~15-25 satır | Data-attribute + avatar sınıfı + CSS reset | Düşük |
| theme.css body genel override'ları | `body[class]`, `body button...`, `body input...`, `body :is(.bg-white...)` | ~80-140 satır | Daha özgül selector / helper sınıfı kaldırma | Orta |
| theme.css page-specific overrides | `body.service-selection-page`, `body.advisor-directory-page`, `body.guru-client-overview` | ~60-120 satır | Bileşen sınıfı / page class ile scope | Orta |
| theme.css global button/input rules | `body button[type="submit"]`, `body select`, `body textarea` | ~40-80 satır | Component class replacement | Orta |

### 5.2 En çok kazanç getirecek alanlar

1. `theme.css` genel `body` selector override'ları: en çok sayıda `!important` barındırır ve çoğu kez Tailwind helper'ları ezmek için yazılmıştır.
2. `body.service-selection-page` ve benzeri sayfa-odaklı override'lar: tekrar riski yüksek, aynı özellik tekrarları çoktur.
3. `demo/sidebar.css` ve `demo/header.css`: daha yerel ve tek bileşen odaklıdır; temizleme sonrası sayfa davranışı üzerinde risk daha düşüktür.

## 6) İlk temizlik turu için en güvenli 3 bölüm

### 1) demo/header.css

Gerekçe:
- Bileşen bazlı, ayrı dosyada ve daha küçük kapsamlıdır.
- Hedef: site header / kullanıcı menüsü / CTA butonları.
- Temizleme sonrası iş akışı ve içerik yapısı bozulmaz; görsel hiyerarşi daha kolay geri alınır.
- `!important`'ların çoğu tek bir komponent ailesine ait olduğu için sorun çok yerel kalır.

### 2) demo/sidebar.css

Gerekçe:
- Fixed side panel ve main layout düzeni olarak ayrı bir bileşen alanı oluşturur.
- `> #sidebar` ve `> main` gibi selector'lar daha belirgindir; global body selector'lara göre temizlenmesi daha güvenlidir.
- Çoğu `!important`, sayfa düzeninin görünümünü doğrulayan yerleşim kuralıdır; tekrar eden bloklar da kısa vadede net şekilde çözülebilir.

### 3) demo/avatar.css

Gerekçe:
- Veri ve görsel eşleme tamamen yerel/medya katmanında toplanmıştır.
- `data-avatar` mapping'i temizlemek ve `!important`'ları azaltmak anlamlı ve güvenlidir.
- Görsel bozukluklar ve stil eskimesi burada çözüldüğünde, global CSS etkilenmez.
- Daha fazla iş akışı bozmadan, yalnızca avatar görünüm katmanında geri dönüş yapılabilir.

## 7) Kısa özet

- Toplam `!important`: 808 olarak tespit edildi.
- `theme.css` tek başına 730 (`%90+`) tutuyor.
- En büyük temizleme potansiyeli, `theme.css`'in global selector override'ları ile sayfa-odaklı override'larında, ancak en güvenli ilk tur için `header.css`, `sidebar.css` ve `avatar.css` uygun alanlar.
- En çok tekrar eden sorun, "genel `body` selector + placeholder/helper sınıfı + `!important`" zinciridir. Bu durum, utility ve component focus olmadan global olarak çözüldüğü için temizleme sırasında en dikkatli yaklaşım gerektirir.

## 8) Sonraki adım önerisi

Önce aşağıdaki sırayla temizlenebilir:

1. `demo/header.css` → component-local override
2. `demo/sidebar.css` → layout-local override
3. `demo/avatar.css` → media/portrait mapping layer
4. `theme.css` body generics → daha özgül selector / component class dönüşümü
5. `theme.css` page-specific selectors → sayfa sınıfı + bileşen sınıfı + küçük helper reset

Bu sırayla en az riskli ve en kolay geri alınabilir temizlik turu yapılır; etkinlik artarken, global cascade kırılma riski minimum seviyeye çekilir.
