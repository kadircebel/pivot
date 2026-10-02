---
name: hdfilmcehennemi-scraper
description: >-
  HdFilmCehennemi (https://www.hdfilmcehennemi.nl/) web sitesini parse etmek, DOM seçicilerini (cheerio), sayfalama ve arama URL yapılarını yönetmek için kılavuz.
---

# HdFilmCehennemi Web Scraper Kılavuzu

Bu beceri paketi, `https://www.hdfilmcehennemi.nl/` sitesinden veri çekerken ve HTML parse işlemlerinde kullanılan uç noktaları, seçicileri ve teknik ayrıntıları içerir.

---

## 1. URL Yapıları ve Uç Noktalar

| İşlem | URL Şablonu | Sayfalama (Paging) / Not |
| :--- | :--- | :--- |
| **Anasayfa** | `https://www.hdfilmcehennemi.nl/` | Slider (`.slider-slide`) ve içerik tabları (`.tab-section`) |
| **Filmler Listesi** | `https://www.hdfilmcehennemi.nl/category/film-izle-2/` | `https://www.hdfilmcehennemi.nl/load/page/{page}/categories/film-izle-2/` |
| **Diziler Listesi** | `https://www.hdfilmcehennemi.nl/yabancidiziizle-5/` | `https://www.hdfilmcehennemi.nl/load/page/{page}/home-series/` |
| **Arama (Search)** | `https://www.hdfilmcehennemi.nl/search/?q={query}` | GET parametresi ile arama |
| **Kategori Filtresi** | `https://www.hdfilmcehennemi.nl/category/{categorySlug}/` | `https://www.hdfilmcehennemi.nl/load/page/{page}/categories/{categorySlug}/` |
| **Film Detayı** | `https://www.hdfilmcehennemi.nl/{slug}/` | Iframe embed, video alternatifleri, oyuncu ve tür bilgileri |
| **Dizi Detayı** | `https://www.hdfilmcehennemi.nl/dizi/{slug}/` | Sezonlar, bölümler ve bölüm oynatıcı linkleri |

---

## 2. DOM Seçicileri (Cheerio Seçicileri)

### 2.1. Anasayfa Slider (Billboard / Öne Çıkanlar)
- **Kapsayıcı**: `.slider-container .slider-slide`
- **Link & Detay URL**: `a.poster.poster-slider` -> `attr('href')`
- **Görsel**: `img` -> `attr('data-src') || attr('src')`
- **Başlık**: `strong.poster-title` veya `a` -> `attr('title')`
- **IMDb Puanı**: `.poster-meta span.imdb` -> text (örn. `8.0`)
- **Yıl**: `.poster-meta span:first-child` -> text (örn. `2026`)
- **Dil Rozeti**: `.poster-lang span` -> text (örn. `Dublaj & Altyazılı`)

### 2.2. Film ve Dizi Kartları (Grid & Tab Listeleri)
- **Kapsayıcı**: `a.poster` veya `.posters-4-col a.poster`
- **ID / Token**: `attr('data-token')`
- **Link**: `attr('href')`
- **Poster Görseli**: `img` -> `attr('data-src') || attr('src')`
- **Başlık**: `strong.poster-title` -> text
- **IMDb**: `.poster-meta span.imdb` -> text
- **Yıl**: `.poster-meta span` (imdb dışındaki ilk sayısal eleman)
- **Dil / Dizi Türü**: `.poster-lang span` -> text

### 2.3. Film/Dizi Detay Sayfası
- **Schema JSON-LD**: `<script type="application/ld+json">` içeriğinde standart Schema.org `Movie` nesnesi mevcuttur. Ad, açıklama, türler (`genre`), yönetmen, oyuncular (`actor`), IMDb referansı doğrudan buradan güvenle JSON olarak parse edilebilir!
- **Video Alternatif Sekmeleri**:
  - Diller: `.video-alternatives .language-tab .language-link` (`data-lang="dual"`, `tr`, `sub`)
  - Kaynaklar: `.video-alternatives .alternative-links .alternative-link` (`data-video="id"`)
- **Iframe Oynatıcı**:
  - `.video-player-container-here .video-container iframe` -> `attr('data-src') || attr('src')`
  - Örnek: `https://hdfilmcehennemi.mobi/video/embed/{token}/?rapidrame_id={id}`

---

## 3. Sayfalama (Paging) & AJAX Mekanizması

- **Sayfalama Endpoint'leri**:
  - Filmler 1. Sayfa: `https://www.hdfilmcehennemi.nl/category/film-izle-2/` (tam HTML yanıtı)
  - Filmler 2+ Sayfalar: `https://www.hdfilmcehennemi.nl/load/page/{page}/categories/film-izle-2/`
  - Diziler 1. Sayfa: `https://www.hdfilmcehennemi.nl/yabancidiziizle-5/` (tam HTML yanıtı)
  - Diziler 2+ Sayfalar: `https://www.hdfilmcehennemi.nl/load/page/{page}/home-series/`
  - Kategoriler 1. Sayfa: `https://www.hdfilmcehennemi.nl/tur/{cleanSlug}/` (örn: `tur/aksiyon-filmleri-izleyin-8/`)
  - Kategoriler 2+ Sayfalar: `https://www.hdfilmcehennemi.nl/load/page/{page}/genres/{cleanSlug}/` (örn: `genres/aksiyon-filmleri-izleyin-8/`)

- **Kritik JSON Yanıt Yapısı & Unescaping**:
  - Sayfalama istekleri (`/load/page/...`) tarayıcıya `application/json` formatında `{ "html": "...", "meta": { ... } }` döndürür.
  - Yanıt metni doğrudan regex ile taranırsa ters bölü (`\"`) kaçış karakterleri regex'i bozar. Bu nedenle önce `JSON.parse(resText).html` ile unescape edilmeli, ardından poster ayrıştırıcıya verilmelidir (`extractHtmlFromResponse`).

- **Dinamik Toplam Sayfa Bilgisi**:
  - Sayfadaki `<nav class="pagination-container" data-pages="221" data-page-action="genres/aksiyon-filmleri-izleyin-8">` etiketi toplam sayfa sayısını ve action yolunu verir.

---

## 4. HTTP İstek Başlıkları (Headers)

AJAX isteklerinin 200 OK ile dönmesi için aşağıdaki başlıklar şarttır:

```typescript
export const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0',
  'Accept': '*/*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.hdfilmcehennemi.nl/',
  'X-Requested-With': 'fetch', // AJAX istekleri için ZORUNLU
};
```

Sayfalama isteklerinde `Referer` başlığı kategori sayfasına göre ayarlanmalıdır:
- Filmler için: `https://www.hdfilmcehennemi.nl/category/film-izle-2/`
- Diziler için: `https://www.hdfilmcehennemi.nl/yabancidiziizle-5/`
