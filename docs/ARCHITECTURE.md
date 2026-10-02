# MovieTvApp Mimari Dokümanı (Architecture)

## 1. Genel Bakış ve Hedefler

**MovieTvApp**, Android TV ekosistemi (özellikle **Next - Start 4K TV Box**) için optimize edilmiş, uzaktan kumanda (D-pad) ile kusursuz yönetilebilen, Netflix arayüz stiline sahip, çoklu kaynak (multi-source) web scraping tabanlı bir film ve dizi izleme uygulamasıdır.

Uygulamanın ilk ve varsayılan parse kaynağı: `https://www.hdfilmcehennemi.nl/` sitesidir.

---

## 2. Donanım Profili ve Kısıtlar Analizi (Next - Start 4K TV Box)

Uygulamanın çalışacağı hedef donanım özellikleri:

| Bileşen | Donanım Özelliği | Mimari Kısıt / Optimizasyon Kuralı |
| :--- | :--- | :--- |
| **Yonga Seti / İşlemci** | Amlogic S905Y4 (4 Çekirdek Cortex-A35 @ 2.0 GHz, 16500 DMIPS) | CPU single-core performansı kısıtlıdır; JS thread'i bloke eden ağır senkron HTML parse işlemlerinden kaçınılmalı, asenkron parse ve memoization uygulanmalıdır. |
| **Grafik (GPU)** | ARM Mali-G31 MP2 (OpenGL ES 3.2) | Ağır CSS filtreleri, aşırı blur ve gölge (box-shadow) efektlerinden kaçınılmalıdır; GPU render maliyeti minimumda tutulmalıdır. |
| **Bellek (RAM)** | **2 GB LPDDR4** | **En kritik kısıt!** React Native JS heap'i ve görsel belleği sıkı kontrol edilmelidir. Resimler için disk/bellek önbellek boyut limitleri (max 100MB disk cache), FlatList/FlashList için `removeClippedSubviews={true}` ve düşük `windowSize` (örn. 3-5) kullanılmalıdır. |
| **Depolama** | 16 GB eMMC | Yerel önbellek, geçici video buffer dosyaları periyodik temizlenmelidir. |
| **Video Çözünürlük & Kodekler** | 4K UHD @ 60fps, Dolby Vision, HDR10+, AV1, HEVC H.265, AVC H.264, MPEG-4, VP8/VP9 | Donanım hızlandırmalı video oynatıcı (`react-native-video` ExoPlayer tabanlı) doğrudan AV1/HEVC H.265 streamleri native olarak oynatabilmelidir. |
| **Ses Kodekleri** | Dolby Atmos, MS12, AAC | Native ses geçişi (passthrough) ve surround ses uyumluluğu sağlanmalıdır. |
| **Ağ Bağlantısı** | Wi-Fi 2.4/5GHz Dual Band + RJ45 Ethernet (10/100) | Düşük ping ve HLS buffer optimizasyonu (Adaptive Bitrate Streaming). |
| **Kumanda** | Bluetooth & Sesli Kumanda (D-Pad Odak Navigasyonu) | **Dokunmatik ekran (Touch) varsayımı KESİNLİKLE YOKTUR.** Tüm etkileşimler D-Pad (Yukarı, Aşağı, Sol, Sağ, Tamam/Select, Geri) ile çalışmalıdır. |

---

## 3. Katmanlı Sistem Mimarisi (Clean Architecture)

```
┌────────────────────────────────────────────────────────┐
│                   UI Katmanı (Netflix TV UI)           │
│  - Billboard / Hero Banner                             │
│  - Yatay Kaydırma Satırları (Horizontal Rows)          │
│  - TV Odaklanabilir Bileşenler (TVFocusableCard vb.)   │
│  - Yan Menü / TV Sidebar (Drawer)                      │
├────────────────────────────────────────────────────────┤
│             Navigasyon & Odak Yönetimi Katmanı         │
│  - react-native-tvos Focus Engine                      │
│  - D-Pad Spatial Navigation & Focus Trapping Koruması  │
├────────────────────────────────────────────────────────┤
│                  State / ViewModel Katmanı             │
│  - HomeState, CatalogState, PlayerState                │
│  - React Query / Zustand / Context State               │
├────────────────────────────────────────────────────────┤
│           Multi-Source Provider Katmanı (Plugin)       │
│  - IMovieSourceProvider (Standart Arayüz)              │
│  - ProviderRegistry (Kaynak Yöneticisi & Değiştirici)  │
│  - HdFilmCehennemiProvider (Varsayılan Kaynak)         │
│  - [Gelecek]: SourceXProvider, SourceYProvider...      │
├────────────────────────────────────────────────────────┤
│             Servis Katmanı (Scraping & Media)          │
│  - HtmlParserService (Cheerio / Hafif AST Parser)      │
│  - AdBlockerService (Reklam Temizleme & URL Filtre)    │
│  - StreamExtractorService (m3u8 / MP4 Çıkarıcı)        │
│  - HttpService (User-Agent, Cookie, Cloudflare Bypasser)│
├────────────────────────────────────────────────────────┤
│                 Platform & Donanım Katmanı             │
│  - react-native-tvos Native Modülleri                  │
│  - ExoPlayer (Native react-native-video 4K Oynatıcı)   │
└────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Source Scraper (Çoklu Kaynak) Mimarisi

Uygulamanın temel prensibi, UI bileşenlerinin hangi web sitesinden veri aldığını bilmemesidir. Tüm kaynaklar `IMovieSourceProvider` sözleşmesine (interface) uyar.

### 4.1. `IMovieSourceProvider` Standart Arayüzü

```typescript
export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  backdropUrl?: string;
  year?: string;
  imdbRating?: string;
  languageBadge?: string; // "Dublaj & Altyazılı", "Türkçe Dublaj", vb.
  type: 'movie' | 'series';
  detailUrl: string;
}

export interface HomeSection {
  id: string;
  title: string;
  items: MediaItem[];
}

export interface HomeData {
  featured: MediaItem[]; // Billboard / Üst Slider içerikleri
  sections: HomeSection[]; // Popüler, Yeni Eklenenler, vb.
}

export interface MediaDetail extends MediaItem {
  description: string;
  duration?: string;
  genres: string[];
  actors: { name: string; url?: string }[];
  director?: string;
  country?: string;
  trailerUrl?: string;
  episodes?: SeriesSeason[]; // Dizi ise sezon ve bölümler
  sources: VideoSource[]; // Oynatıcı alternatifleri (Close, Rapidrame, vb.)
}

export interface SeriesSeason {
  seasonNumber: number;
  seasonName: string;
  episodes: SeriesEpisode[];
}

export interface SeriesEpisode {
  episodeNumber: number;
  episodeName: string;
  detailUrl: string;
}

export interface VideoSource {
  id: string;
  name: string; // 'Rapidrame', 'Close', 'VidMoly' vb.
  embedUrl: string;
  language: string; // 'dual', 'tr', 'sub'
}

export interface VideoStreamResult {
  streamUrl: string; // .m3u8 veya doğrudan .mp4
  headers?: Record<string, string>; // Referer, User-Agent zorunlulukları
  subtitles?: { label: string; url: string; lang: string }[];
  qualityLevels?: { label: string; url: string }[];
}

export interface IMovieSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly version: string;

  getHome(): Promise<HomeData>;
  getMovies(page: number, categorySlug?: string): Promise<{ items: MediaItem[]; totalPages?: number; hasNextPage: boolean }>;
  getSeries(page: number): Promise<{ items: MediaItem[]; totalPages?: number; hasNextPage: boolean }>;
  getCategories(): Promise<{ name: string; slug: string }[]>;
  search(query: string, page?: number): Promise<{ items: MediaItem[]; hasNextPage: boolean }>;
  getDetails(detailUrl: string): Promise<MediaDetail>;
  getVideoStream(source: VideoSource): Promise<VideoStreamResult>;
}
```

### 4.2. Provider Registry (Kaynak Kayıt Defteri)
- Kullanıcı dilediğinde `ProviderRegistry.setActiveProvider('hdfilmcehennemi')` ile kaynak değiştirebilir.
- Yeni bir site eklendiğinde sadece `IMovieSourceProvider` sınıfı implemente edilir ve `ProviderRegistry.register(new NewSiteProvider())` çağrılır; UI'da tek bir satır kod bile değişmez.

---

## 5. UI / UX Mimarisi: Netflix TV Deneyimi

### 5.1. Profil Seçimi Yok
- Uygulama doğrudan Ana Ekrana (`HomeScreen`) açılır. Profil seçme ekranı bulunmaz.

### 5.2. 10-Foot UI (10 Metre Mesafeli TV Kullanıcı Deneyimi)
1. **Renk Paleti**:
   - Arka Plan: `#121212` (Saf siyah/koyu antrasit)
   - Kart Arka Planı: `#1E1E1E`
   - Odak (Focus) Rengi: `#E50914` (Netflix Kırmızısı) veya `#FFFFFF` yüksek kontrastlı kenarlık.
   - Metinler: `#FFFFFF` (Başlık), `#AAAAAA` (Açıklamalar), `#E5A00D` (IMDb sarısı).

2. **D-Pad Odak Durumları**:
   - Odaklanan kart boyutu ölçeklenir: `transform: [{ scale: 1.08 }]`
   - Kenarlık belirir: `borderWidth: 3, borderColor: '#FFFFFF'`
   - Z-Index yükseltilir: `zIndex: 10` (komşu kartların üzerine taşma olmaması için).
   - Kumanda `CENTER / SELECT` tuşu ile tetiklenen net `onPress`.

3. **Ekran Düzeni**:
   - **Üst Kısım / Hero Billboard**:
     - Odaklanan filmin veya trend içeriğin büyük backdrop görseli, başlığı, IMDb puanı, kısa açıklaması, "İzle" ve "Detay" butonları.
   - **Gövde / Yatay Satırlar (Horizontal FlatList Rows)**:
     - "Yeni Eklenen Filmler"
     - "Günün Trendleri"
     - "Popüler Yabancı Diziler"
     - "IMDb 7+ Başyapıtlar"
   - **Sol TV Navigasyon Çubuğu (Sidebar)**:
     - D-Pad ile sola gidildiğinde açılan, sağa gidildiğinde içerik satırına odak bırakan Leanback sidebar:
       1. 🏠 Anasayfa
       2. 🎬 Filmler
       3. 📁 Kategoriler
       4. 📺 Diziler
       5. 🔍 Arama
       6. ⚙️ Kaynak Seçimi

---

## 6. Reklam Temizleme ve Video Oynatma Stratejisi

Sitede video oynatıcı etrafında ve iframe içerisinde bulunan reklamlar, TV Box deneyimini bozar ve kumanda ile kapatılması imkansız pop-up'lara yol açabilir.

### Strateji:
1. **Doğrudan Stream Çıkarımı (Direct Stream Extraction)**:
   - Iframe URL'si (`hdfilmcehennemi.mobi/video/embed/...`) HTTP üzerinden çekilir.
   - Iframe kaynağındaki video sunucusunun (Rapidrame, VidMoly, Close vb.) video master playlist (`.m3u8`) veya doğrudan MP4 bağlantısı regex / AST ile izole edilir.
   - Hiçbir WebView reklam script'i çalıştırılmadan doğrudan native `react-native-video` bileşenine aktarılır.

2. **Gerektiğinde Kumanda Dostu WebView Filtreleme**:
   - Eğer stream URL'si şifreli token gerektiriyorsa, arka planda headless veya kumanda dostu bir WebView çalıştırılır.
   - Injected JavaScript ile:
     - `window.open = function() { return null; };` (Pop-up engelleme)
     - `document.querySelectorAll('.money-wrapper, .money-text, [id*="ad_"], [class*="banner"]').forEach(el => el.remove());`
     - CSS ile reklam katmanları `display: none !important; pointer-events: none !important;` yapılır.

---

## 7. Proje Dizin Yapısı

```
MovieTvApp/
├── App.tsx                        # Ana başlatıcı, Tema ve Navigasyon sağlayıcıları
├── index.js                       # RN TV giriş noktası
├── docs/                          # Mimari ve plan dokümanları
│   ├── ARCHITECTURE.md
│   └── PROJECT_PLAN.md
├── .agents/                       # Antigravity agent & skills yapılandırması
│   ├── skills/
│   │   ├── hdfilmcehennemi-scraper/
│   │   │   └── SKILL.md
│   │   ├── android-tv-guide/
│   │   │   └── SKILL.md
│   │   └── video-stream-extractor/
│   │       └── SKILL.md
├── AGENTS.md                      # Antigravity Workspace Kuralları
├── GEMINI.md                      # Antigravity Proje Kuralları
└── src/
    ├── core/                      # Tipler, arayüzler, sabitler
    │   ├── interfaces/
    │   │   └── IMovieSourceProvider.ts
    │   ├── types/
    │   │   └── media.ts
    │   └── constants/
    │       └── tvKeys.ts
    ├── providers/                 # Scraper sağlayıcıları
    │   ├── ProviderRegistry.ts
    │   └── hdfilmcehennemi/
    │       ├── HdFilmCehennemiProvider.ts
    │       ├── parser.ts
    │       └── streamExtractor.ts
    ├── navigation/                # TV D-Pad odaklı navigasyon
    │   ├── AppNavigator.tsx
    │   └── TVSidebar.tsx
    ├── screens/                   # TV Ekranları
    │   ├── HomeScreen.tsx
    │   ├── MoviesScreen.tsx
    │   ├── CategoriesScreen.tsx
    │   ├── SeriesScreen.tsx
    │   ├── SearchScreen.tsx
    │   ├── DetailScreen.tsx
    │   └── PlayerScreen.tsx
    ├── components/                # TV UI Bileşenleri
    │   ├── TVFocusableCard.tsx
    │   ├── TVFocusableButton.tsx
    │   ├── HorizontalMediaRow.tsx
    │   ├── HeroBillboard.tsx
    │   ├── TVEpisodeList.tsx
    │   └── VideoPlayerControls.tsx
    ├── services/                  # Ağ, Parse ve Reklam Engelleme
    │   ├── httpClient.ts
    │   ├── adBlockerService.ts
    │   └── cacheService.ts
    └── theme/                     # Netflix TV Tasarım Sistemi
        ├── colors.ts
        ├── typography.ts
        └── focusStyles.ts
```
