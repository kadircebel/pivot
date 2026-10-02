# MovieTvApp Proje Planı ve Yol Haritası (Project Plan)

Bu plan, **MovieTvApp** uygulamasının adım adım geliştirilmesini, her aşamada kullanıcının onayının alınmasını ve **Next - Start 4K TV Box** donanımına tam uyumlu çalışmasını garanti altına alır.

---

## Genel Geliştirme İlkeleri

1. **Katı Onay Kuralı (Madde 3g)**: Antigravity, bir adımı tamamladığında kullanıcıya sunar, test eder ve kullanıcının açık onayı olmadan bir sonraki aşamaya GEÇMEZ.
2. **TV & D-Pad Önceliği**: Eklenen her ekran ve bileşen doğrudan Android TV uzaktan kumandası (Yukarı, Aşağı, Sol, Sağ, Tamam, Geri) ile test edilebilir olmalıdır.
3. **Netflix TV Tasarımı**: Karanlık tema, hero billboard banner, yatay kaydırmalı poster satırları, odaklandığında büyüyen ve parlayan kartlar.
4. **Çoklu Kaynak Desteği**: Tüm veri çekme işlemleri `IMovieSourceProvider` üzerinden yapılır. Varsayılan kaynak: `https://www.hdfilmcehennemi.nl/`.

---

## Fazlar ve Adımlar

```
┌─────────────────────────────────────────────────────────────┐
│  Adım 3a: Emülatörde Uygulama Açılışı & TV Focus Temeli     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Kullanıcı Onayı 1]
┌─────────────────────────────────────────────────────────────┐
│  Adım 3b: Anasayfa Web Parse & Netflix UI Gösterimi         │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Kullanıcı Onayı 2]
┌─────────────────────────────────────────────────────────────┐
│  Adım 3c: Navigasyon & Bölümler (Anasayfa, Filmler vb.)     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Kullanıcı Onayı 3]
┌─────────────────────────────────────────────────────────────┐
│  Adım 3d: Filmler Sayfası (Katalog, Paging & Kategoriler)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Kullanıcı Onayı 4]
┌─────────────────────────────────────────────────────────────┐
│  Adım 3e: Diziler Sayfası (Katalog, Paging & Bölüm Detayı)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Kullanıcı Onayı 5]
┌─────────────────────────────────────────────────────────────┐
│  Adım 3f: Video Oynatıcı & Reklam Temizleme                 │
└──────────────────────────────┬──────────────────────────────┘
                               ▼  [Nihai Kabul]
```

---

### Adım 3a: Emülatörde Başlatma ve TV Temeli Kurulumu
- **Hedef**: `react-native-tvos` projesinin emülatörde (veya TV cihazında) hatasız derlenip açılması; D-Pad kumanda odaklanmasının temelini test etmek.
- **Yapılacak İşler**:
  1. Gerekli kütüphanelerin eklenmesi (`cheerio`, navigasyon için TV uyumlu yapı veya React Navigation, ikonlar/vektörler).
  2. Profil seçimi ekranı olmadan doğrudan Netflix tarzı TV Karşılama ekranının oluşturulması.
  3. Kumanda (D-pad) tuşları ile odak değiştirilebilen örnek kartların ve butonların eklenmesi.
  4. Android build ve emülatörde çalıştırma doğrulamasının yapılması.
- **Kabul Kriterleri (DoD)**:
  - Uygulama TV emülatöründe sorunsuz açılmalı.
  - Kumanda yukarı-aşağı-sağ-sol tuşları ile odaklanılabilir kartlar arasında geçiş yapılmalı.
  - Odaklanan kartın kenarlığı beyazlaşmalı ve büyümelidir (scale efekti).
- 🛑 **Onay Noktası**: Kullanıcı ekranı ve kumanda etkileşimini onayladıktan sonra Adım 3b'ye geçilir.

---

### Adım 3b: Anasayfa Web Scraping & Netflix UI Gösterimi
- **Hedef**: `https://www.hdfilmcehennemi.nl/` anasayfasının parse edilip Netflix tarzı bileşenlerde gösterilmesi.
- **Yapılacak İşler**:
  1. `IMovieSourceProvider` arayüzünün ve `HdFilmCehennemiProvider` sınıfının oluşturulması.
  2. Anasayfa HTML'inin çekilmesi (`read_url_content` / axios / fetch).
  3. Slider / Billboard verisinin parse edilmesi:
     - Film adı, afiş görseli (`data-src`), IMDb puanı, yapım yılı, dil seçeneği, detay linki.
  4. Gövde bölümlerinin parse edilmesi:
     - "Yeni Eklenenler", "Tavsiye Filmler", "Yakında Gelecek Filmler".
  5. TV UI Bileşenlerinin oluşturulması:
     - `HeroBillboard`: Üstte büyük öne çıkan film (Backdrop, Başlık, IMDb, İzle/Detay butonu).
     - `HorizontalMediaRow`: Yatay kaydırılabilir film listesi satırı.
     - `TVFocusableCard`: Odaklanabilir afiş kartı.
- **Kabul Kriterleri (DoD)**:
  - Siteden canlı çekilen filmler posterleri, başlıkları ve IMDb puanlarıyla ekranda akıcı biçimde listelenmeli.
  - Kumanda ile bir satırdan diğerine veya satır içindeki posterler arasında hızlıca geçilebilmeli.
- 🛑 **Onay Noktası**: Kullanıcı anasayfa tasarımını ve veri akışını onayladıktan sonra Adım 3c'ye geçilir.

---

### Adım 3c: Navigasyon ve Ana Bölümlerin Kurulması
- **Hedef**: TV ekranına uygun sol kenar çubuğu (Sidebar) veya üst menü (Topbar) ile bölümler arası geçiş altyapısının kurulması.
- **Yapılacak İşler**:
  1. Bölümlerin tanımlanması:
     - 🏠 **Anasayfa**
     - 🎬 **Filmler**
     - 📁 **Kategoriler** (Filmler > Kategoriler)
     - 📺 **Diziler**
     - 🔍 **Arama**
     - ⚙️ **Kaynaklar** (Multi-source seçici)
  2. D-pad ile içerik alanından en sola basıldığında açılan Netflix tarzı sol menü animasyonu ve odak mekanizması.
  3. Arama ekranı altyapısı:
     - URL: `GET https://www.hdfilmcehennemi.nl/search/?q={query}`
     - TV kumandasıyla yazılabilen veya klavye açan TV arama kutusu.
- **Kabul Kriterleri (DoD)**:
  - Kumanda ile menü öğeleri arasında gezinilebilmeli ve ilgili sayfaya geçiş yapılabilmeli.
  - Arama alanına kelime girildiğinde sonuçlar anında Netflix ızgara (grid) düzeninde listelenmeli.
- 🛑 **Onay Noktası**: Kullanıcı navigasyon yapısını ve arama ekranını onayladıktan sonra Adım 3d'ye geçilir.

---

### Adım 3d: Filmler Sayfası (Katalog, Sayfalama & Kategoriler)
- **Hedef**: Filmler kataloğunun sonsuz kaydırma (paging) ve kategori filtreleme ile sunulması.
- **Yapılacak İşler**:
  1. Ana film kataloğu URL'i: `https://www.hdfilmcehennemi.nl/category/film-izle-2/`
  2. Sayfalama (Paging) URL'i: `/load/page/{page}/categories/film-izle-2/`
  3. Sonsuz kaydırma (Infinite Scroll / OnEndReached) ile TV FlatList performansı:
     - Next 4K TV Box (2GB RAM) için bellek taşmasını önlemek üzere sanallaştırma (`windowSize={5}`, `maxToRenderPerBatch={8}`).
  4. Filmler > Kategoriler:
     - Aksiyon, Komedi, Korku, Bilim Kurgu vb. kategorilerin çekilmesi ve filtreleme.
- **Kabul Kriterleri (DoD)**:
  - "Filmler" butonuna basıldığında tüm film listesi gelmeli.
  - Aşağı kaydırdıkça sonraki sayfalar takılma olmadan yüklenmeli.
  - Kategori seçildiğinde sadece o kategorideki filmler filtrelenmeli.
- 🛑 **Onay Noktası**: Kullanıcı film listesini ve sayfalama performansını onayladıktan sonra Adım 3e'ye geçilir.

---

### Adım 3e: Diziler Sayfası (Katalog, Sayfalama & Sezon/Bölüm Detayı)
- **Hedef**: Diziler kataloğunun çekilmesi, sayfalama ve diziye tıklandığında sezon/bölüm seçim arayüzü.
- **Yapılacak İşler**:
  1. Diziler URL'i: `https://www.hdfilmcehennemi.nl/yabancidiziizle-5/`
  2. Sayfalama (Paging) URL'i: `/load/page/{page}/home-series/`
  3. Dizi Detay Ekranı:
     - Sezon sekmesi (1. Sezon, 2. Sezon...).
     - Bölüm listesi (1. Bölüm, 2. Bölüm...) ve bölüm açıklamaları.
  4. TV kumandasıyla kolay sezon ve bölüm seçimi.
- **Kabul Kriterleri (DoD)**:
  - "Diziler" tıklandığında diziler listesi ve sayfalama sorunsuz çalışmalı.
  - Bir dizi seçildiğinde sezon ve bölümler net bir listeyle kumandayla seçilebilmeli.
- 🛑 **Onay Noktası**: Kullanıcı dizi kataloğunu ve bölüm seçim ekranını onayladıktan sonra Adım 3f'ye geçilir.

---

### Adım 3f: Video Oynatıcı & Reklam Temizleme
- **Hedef**: Film ve dizi bölümlerinin reklamsız, yüksek kaliteli donanım hızlandırmalı video oynatıcı ile oynatılması.
- **Yapılacak İşler**:
  1. Oynatıcı kaynaklarının tespiti (`Close`, `Rapidrame`, `VidMoly` vb.).
  2. Iframe ve video embed sayfalarındaki reklam script'lerinin (`xpartner-ps.js`, `xpartner-pre.js`, `.money-wrapper`) temizlenmesi.
  3. Doğrudan video akış URL'sinin (`.m3u8` veya `.mp4`) çözümlenmesi (Extractor Service).
  4. `react-native-video` ile Android TV ExoPlayer entegrasyonu:
     - 4K AV1 / HEVC H.265 donanım kod çözücü desteği.
     - Kumanda ile Oynat/Duraklat, 10 saniye ileri/geri sarma, ses açma/kapama, altyazı ve dublaj dili seçebilme.
- **Kabul Kriterleri (DoD)**:
  - Video tıklandığında reklamsız ve gecikmesiz olarak tam ekranda başlamalı.
  - Kumanda ile ileri/geri sarma, duraklatma ve altyazı seçimi sorunsuz çalışmalı.
- 🛑 **Nihai Onay**: Kullanıcı oynatıcıyı ve reklam temizleme performansını onaylar.

---

## Donanım Uyum Matrisi (Next - Start 4K TV Box)

| Aşama | Performans Kriteri | Sınır Değer |
| :--- | :--- | :--- |
| **RAM Tüketimi** | Uygulama açıkken toplam RAM kullanımı | < 180 MB |
| **Görsel Belleği** | Poster önbelleği disk/bellek sınırı | < 100 MB |
| **Kare Hızı (FPS)** | D-Pad liste kaydırma akıcılığı | 60 FPS |
| **Video Başlama Süresi** | "İzle" butonuna basıldıktan videonun başlamasına kadar geçen süre | < 2.5 saniye |
