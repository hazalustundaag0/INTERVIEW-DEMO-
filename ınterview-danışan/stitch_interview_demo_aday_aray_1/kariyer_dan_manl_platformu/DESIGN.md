---
name: Kariyer Danışmanlığı Platformu
colors:
  surface: '#fcf9f5'
  surface-dim: '#dcdad6'
  surface-bright: '#fcf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ef'
  surface-container: '#f0edea'
  surface-container-high: '#ebe8e4'
  surface-container-highest: '#e5e2de'
  on-surface: '#1c1c1a'
  on-surface-variant: '#404848'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f3f0ed'
  outline: '#717978'
  outline-variant: '#c0c8c7'
  surface-tint: '#3b6564'
  primary: '#013434'
  on-primary: '#ffffff'
  primary-container: '#1f4b4a'
  on-primary-container: '#8ebab8'
  inverse-primary: '#a2cfcd'
  secondary: '#625e56'
  on-secondary: '#ffffff'
  secondary-container: '#e8e2d7'
  on-secondary-container: '#68645c'
  tertiary: '#482515'
  on-tertiary: '#ffffff'
  tertiary-container: '#623b29'
  on-tertiary-container: '#dda68f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#beebe9'
  primary-fixed-dim: '#a2cfcd'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#224d4c'
  secondary-fixed: '#e8e2d7'
  secondary-fixed-dim: '#ccc6bc'
  on-secondary-fixed: '#1e1b15'
  on-secondary-fixed-variant: '#4a463f'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#f3baa2'
  on-tertiary-fixed: '#311305'
  on-tertiary-fixed-variant: '#643d2b'
  background: '#fcf9f5'
  on-background: '#1c1c1a'
  surface-variant: '#e5e2de'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

Bu tasarım sistemi; iş arama ve mülakat hazırlığı sürecindeki stresi en aza indiren, dingin, odaklı, dürüst ve ayakları yere basan bir editoryal minimalizm üzerine kuruludur. Dijital gürültüden, yapay zeka gösterişinden (parıltılar, robot simgeleri, degrade geçişler) ve aşırı neşeli/oyunlaştırılmış kalıplardan bilinçli olarak kaçınır. 

Kullanıcıyı bir "aday" veya veri nesnesi olarak değil; kariyerinde kritik bir eşikte duran bir profesyonel olarak konumlandırır. Arayüzün hissi; kaliteli bir defter sayfası, iyi aydınlatılmış sade bir danışmanlık odası ve güven veren sakin bir yüz yüze görüşme hissini taşır.

Tasarım tarzı: **Warm Editorial Minimalism**. Sıcak kırık beyaz arka plan üzerinde net 1px yapısal kenarlıklar, kusursuz tipografik hiyerarşi ve sıfır gölge (`box-shadow: none`) prensibiyle çalışır.

Tutum ve İletişim:
- Türkçe, saygılı, samimi ve duru bir "sen" dili kullanılır.
- Ekranda bilişsel yükü artıran gereksiz animasyon, emoji veya süsleme bulunmaz.
- "Tek ekranda tek temel amaç" ilkesi geçerlidir.

## Colors

Renk paleti, organik ve sakinleştirici tonlardan oluşur. Göz yormayan sıcak baz zeminler ile dikkat dağıtmayan koyu petrol yeşili birincil vurgu rengi dengeli bir kontrast sunar.

### Temel Palet
- **Zemin (Canvas):** `#F6F4EF` (Sıcak kırık beyaz — ekran genelinde soğuk dijital parlamayı önler)
- **Kart ve Yüzeyler (Surface):** `#FFFFFF` (Saf beyaz — içerik odak alanları)
- **Kenarlıklar (Border):** `#E3DFD6` (1px sıcak gri — derinlik yerine yapısal ayrım sağlar)
- **Birincil Vurgu (Primary Accent):** `#1F4B4A` (Koyu petrol yeşili — yalnızca birincil buton, aktif adımlar, odak halkası ve seçili radyo/checkbox durumlarında kullanılır)
- **Ana Metin (Text Primary):** `#1E1E1C` (Koyu kömür — yüksek okunabilirlik)
- **İkincil Metin (Text Muted):** `#5E5A52` (Sıcak gri — etiketler, meta veriler ve yönlendirmeler)

### Durum Renkleri
- **Uyarı (Warning):** `#B7791F` (Sönük kehribar)
- **Hata (Critical / Error):** `#A63D2F` (Tuğla kırmızısı)
- **Hata Zemin (Error Surface):** `#FDF5F4` (Hafif tuğla tonu arka plan)

### Kesin Kurallar
- Mor, pembe, lila, neon renkler ve çok renkli degrade (gradient) geçişler kesinlikle yasaktır.
- Yarı saydam arka plan bulanıklıkları (backdrop-filter / glassmorphism) yasaktır.
- Renkler bir süs öğesi olarak değil, yalnızca durumu ve eylemi bildiren işlevsel sinyaller olarak kullanılır.

## Typography

Tipografi tüm arayüz genelinde tek aileye dayanır: **IBM Plex Sans**. Bu tercih, sisteme teknik bir ciddiyet, yüksek editoryal okunabilirlik ve hümanist bir ritim kazandırır.

Hiyerarşi İlkeleri:
- **Başlıklar (`headline-lg` / 24px Semi-Bold):** Sayfa ana başlıkları için kullanılır. Ekran başına kural olarak tek bir `headline-lg` yer alır.
- **Kart Başlıkları (`headline-sm` / 18px Semi-Bold):** Danışman kartları, soru modülleri ve seans blokları için kullanılır.
- **Gövde Metinleri (`body-lg` / 16px Regular):** Kullanıcının okuduğu ana danışmanlık notları, mülakat ipuçları ve yönergeler için standarttır.
- **Açıklama ve Yardımcı Metinler (`body-sm` / 14px Regular `#5E5A52`):** Alan altı yönergeleri, seans tarihleri, pasif durumlar için kullanılır.
- **Etiketler (`label-md`, `label-sm`):** Buton metinleri, form başlıkları ve durum rozetleri için dengeli orta kalınlık (500) tercih edilir.

## Layout & Spacing

Bu tasarım sistemi öncelikli olarak mobil ekranlar için kurgulanmıştır ve tek sütunlu, akıcı dikey bir akış modeli uygular.

- **Dış Boşluk (Margin):** Ekran kenarlarından `1.25rem` (20px) sabit güvenli alan bırakılır.
- **Hiyerarşik Ritim:** İçerik blokları arasında `space-lg` (24px) veya `space-xl` (32px), blok içi öğeler arasında `space-md` (16px) veya `space-sm` (8px) kullanılır.
- **Ferahlık İlkesi:** Mobil ekranda dikey sıkışıklık yaratılmamalıdır; kullanıcı her adımda tek bir göreve odaklanmalıdır. Form elemanları ve interaktif alanlar rahat dokunma mesafelerine (minimum 48px dokunma hedefi) sahiptir.
- **Gövde Konumlandırması:** Birincil aksiyonlar genellikle sayfanın en altında sabit (sticky) veya akışın sonunda net tek birincil buton olarak yer alır.

## Elevation & Depth

Tasarım sistemi bütünüyle düz ve yapısal düzlemlerle çalışır. **Geleneksel `box-shadow` veya katman gölgeleri kesinlikle kullanılmaz.**

Derinlik ve Ayrışım Kuralları:
1. **Zemin Kontrastı:** Tüm sayfa `#F6F4EF` zeminindedir. İçerik taşıyan modüller, kartlar ve form panelleri `#FFFFFF` yüzey üzerinde yükselir.
2. **1px Yapısal Sınırlar:** Beyaz kartlar ve form kutuları `1px solid #E3DFD6` kenarlık çizgisi ile arka plandan ayrıştırılır.
3. **Seçim & Odak Durumları:** Seçili durumdaki bir kart ya da aktif input alanı gölgeyle değil; kenarlık kalınlığının veya renginin `#1F4B4A` değerine dönüşmesiyle belirtilir.
4. **Modal ve Sayfa Altı Panelleri (Bottom Sheet):** Katmanlı açılan pencerelerde gölge yerine saf beyaz zemin, üstte `1px solid #E3DFD6` sınır ve arkada düz `%30` opaklığa sahip `#1E1E1C` karartma katmanı (overlay) kullanılır.

## Shapes

Tasarım dilinde yumuşak ama net bir kurumsal geometri esastır. 

- Standart köşe yuvarlaklığı: **8px (`rounded-lg` / `rounded-[8px]`)**.
- Butonlar, kartlar, giriş alanları ve seçim kutuları istisnasız 8px köşe yuvarlaklığına sahiptir.
- Tam yuvarlak (pill / rounded-full) şekiller yalnızca sayaç badge'leri veya küçük durum noktalarında fonksiyonel gereklilik varsa kullanılır; ana kart veya butonlarda asla hap formu kullanılmaz.

## Components

### Birincil Buton (Primary Button)
- **Ölçüler:** Yükseklik 52px (`h-[52px]`), tam genişlik (`w-full`), köşe yuvarlaklığı 8px (`rounded-[8px]`).
- **Renkler:** Arka plan `#1F4B4A`, metin `#FFFFFF`, `font-semibold`, 16px.
- **Davranış:** Ekranda kural olarak tek bir birincil buton bulunur. Metin dili net eylem fiilleri taşır: "Mülakata Başla", "Danışmanı Seç", "Devam Et", "Yanıtı Kaydet".
- **Gölge:** Yok (`box-shadow: none`).

### İkincil Eylemler (Secondary Actions & Links)
- İkincil seçenekler için ayrı bir çerçeveli buton yerine; sade, altı çizgisiz, `14px` veya `15px` ağırlığında `#5E5A52` ya da `#1F4B4A` metin linkleri kullanılır. Gerektiğinde `w-full`, arka planı şeffaf, kenarlığı `1px solid #E3DFD6` olan buton varyantı tercih edilebilir.

### Kartlar (Cards)
- **Yapı:** Arka plan `#FFFFFF`, kenarlık `1px solid #E3DFD6`, köşe yuvarlaklığı 8px, iç dolgu 16px veya 20px.
- **Kullanım:** Danışman profil kartları, mülakat soru kartları ve seans özetleri bu kart mimarisiyle oluşturulur.
- **Seçili Kart:** Arka plan `#FFFFFF`, kenarlık `1.5px solid #1F4B4A`.

### Giriş Alanları (Input Fields & Textarea)
- **Yapı:** Yükseklik 48px (textarea için min 112px), zemin `#FFFFFF`, kenarlık `1px solid #E3DFD6`, köşe yuvarlaklığı 8px, iç boşluk 12px 16px.
- **Metin:** Değer metni `#1E1E1C` (15px), yer tutucu metin `#5E5A52` (14px).
- **Odak Durumu (Focus):** `border-color: #1F4B4A`, dış hat (outline) kapalı.
- **Hata Durumu:** `border-color: #A63D2F`, alt hata açıklaması 13px `#A63D2F`.

### Seçim Elemanları (Radio & Checkbox)
- **Kutu Biçimi:** 20px x 20px, kenarlık `1px solid #E3DFD6`.
- **Aktif Durum:** Dolgu `#1F4B4A`, kenarlık `#1F4B4A`, ikon rengi `#FFFFFF`.

### Süreç & Adım Göstergesi (Step Indicator)
- Mülakat aşamalarını gösteren çizgi yapısı: Tamamlanmamış adımlar `2px` kalınlığında `#E3DFD6`, aktif ve tamamlanmış adımlar `#1F4B4A`. Gösterişli daireler yerine sakin, editoryal çizgi ve metin ritmi ("Adım 2 / 5").

### Danışman Bilgi Rozetleri (Badges / Tags)
- Yükseklik 26px, dolgu 4px 10px, zemin `#F6F4EF`, kenarlık `1px solid #E3DFD6`, metin `#5E5A52`, 12px orta kalınlık (`font-medium`). Örneğin: "İnsan Kaynakları", "Teknik Mülakat", "30 Dakika".