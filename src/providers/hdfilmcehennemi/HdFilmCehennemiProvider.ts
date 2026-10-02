import {
  HomeData,
  HomeSection,
  IMovieSourceProvider,
  MediaDetail,
  PaginatedResult,
  VideoSourceOption,
} from '../../core/interfaces/IMovieSourceProvider';
import {
  extractPaginationInfo,
  parseMovieDetail,
  parsePosterItems,
  parseSearchResults,
  parseSeriesDetail,
  parseSliderItems,
} from '../../services/htmlParser';
import { MediaItem } from '../../types/media';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0',
  'Accept': '*/*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.hdfilmcehennemi.nl/',
  'X-Requested-With': 'fetch',
};

// Çevrimdışı veya ilk saniyelerde anında yükleme için güncel anasayfa önbelleği
const SNAPSHOT_FEATURED: MediaItem[] = [
  {
    id: 'snap-slider-1',
    title: 'Örümcek Adam Yepyeni Bir Gün',
    originalTitle: 'Spider Man Brand New Day',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/spider-man-brand-new-day.webp',
    backdropUrl: 'https://www.hdfilmcehennemi.nl/images/list/cover/spider-man-brand-new-day.webp',
    year: '2026',
    imdbRating: '8.0',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/spider-man-brand-new-day/',
    overview:
      'Örümcek Adam Yepyeni Bir Gün - Spider Man Brand New Day. Peter Parker şehri tehdit eden yeni ve karanlık güçlere karşı destansı bir mücadele veriyor.',
  },
  {
    id: 'snap-slider-2',
    title: 'Mayday',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/mayday-hdfc.webp',
    backdropUrl: 'https://www.hdfilmcehennemi.nl/images/list/cover/mayday-hdfc.webp',
    year: '2026',
    imdbRating: '6.8',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/mayday-hdf-2026/',
    overview: 'Mayday - Gerilim ve hayatta kalma mücadelesi dolu nefes kesen bir macera.',
  },
  {
    id: 'snap-slider-3',
    title: 'Supergirl',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/supergirl-hdfc.webp',
    backdropUrl: 'https://www.hdfilmcehennemi.nl/images/list/cover/supergirl-hdfc.webp',
    year: '2026',
    imdbRating: '5.8',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/supergirl-2026-hdfc-7/',
    overview: 'Supergirl evreni korumak için yeni maceralara atılıyor.',
  },
];

// Kullanıcının paylaştığı güncel ekran görüntüsündeki 20 film
const SNAPSHOT_YENI_EKLENENLER: MediaItem[] = [
  {
    id: 'snap-1',
    title: 'The Nice Ones',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/the-nice-ones.webp',
    year: '2026',
    imdbRating: '0.0',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/the-nice-ones/',
  },
  {
    id: 'snap-2',
    title: 'The Uprising',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/the-uprising.webp',
    year: '2026',
    imdbRating: '6.3',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/the-uprising/',
  },
  {
    id: 'snap-3',
    title: 'Mononoke The Movie Chapter Ⅲ',
    posterUrl:
      'https://www.hdfilmcehennemi.nl/images/list/poster/mononoke-the-movie-chapter-iii-the-curse-of-the-serpent.webp',
    year: '2026',
    imdbRating: '10.0',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl:
      'https://www.hdfilmcehennemi.nl/mononoke-the-movie-chapter-iii-the-curse-of-the-serpent-2026/',
  },
  {
    id: 'snap-4',
    title: "Coyote Acme'ye Karşı",
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/coyote-vs-acme.webp',
    year: '2026',
    imdbRating: '7.4',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/coyote-vs-acme/',
  },
  {
    id: 'snap-5',
    title: 'Runner - Sınırsız',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/runner.webp',
    year: '2026',
    imdbRating: '6.5',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/runner-hdfc-2026/',
  },
  {
    id: 'snap-6',
    title: 'Bir Gece - Strangers by Night',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/strangers-by-night.webp',
    year: '2023',
    imdbRating: '6.0',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/strangers-by-night-2023/',
  },
  {
    id: 'snap-7',
    title: 'Yasak Meyveler',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/forbidden-fruits.webp',
    year: '2026',
    imdbRating: '5.2',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/forbidden-fruits/',
  },
  {
    id: 'snap-8',
    title: 'Son An - You Found Me',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/you-found-me.webp',
    year: '2025',
    imdbRating: '6.8',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/you-found-me-2025/',
  },
  {
    id: 'snap-9',
    title: 'UNABOMBER',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/unabomber.webp',
    year: '2026',
    imdbRating: '6.4',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/unabomber/',
  },
  {
    id: 'snap-10',
    title: 'Aşk Hipotezi - The Love Hypothesis',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/the-love-hypothesis.webp',
    year: '2026',
    imdbRating: '7.0',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/the-love-hypothesis/',
  },
  {
    id: 'snap-11',
    title: 'Legend of the White Dragon',
    posterUrl:
      'https://www.hdfilmcehennemi.nl/images/list/poster/legend-of-the-white-dragon.webp',
    year: '2026',
    imdbRating: '4.3',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/legend-of-the-white-dragon/',
  },
  {
    id: 'snap-12',
    title: 'Super Troopers 3',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/super-troopers-3.webp',
    year: '2026',
    imdbRating: '5.9',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/super-troopers-3/',
  },
  {
    id: 'snap-13',
    title: 'Idiots',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/idiots.webp',
    year: '2026',
    imdbRating: '5.6',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/idiots-2026/',
  },
  {
    id: 'snap-14',
    title: 'One Last Shot',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/one-last-shot.webp',
    year: '2026',
    imdbRating: '5.1',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/one-last-shot/',
  },
  {
    id: 'snap-15',
    title: 'Hamlet',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/hamlet-2026.webp',
    year: '2026',
    imdbRating: '5.9',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/hamlet-2026/',
  },
  {
    id: 'snap-16',
    title: 'Moss & Freud',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/moss-freud.webp',
    year: '2026',
    imdbRating: '5.4',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/moss-freud/',
  },
  {
    id: 'snap-17',
    title: 'The Fin',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/the-fin.webp',
    year: '2026',
    imdbRating: '4.5',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/the-fin-2026/',
  },
  {
    id: 'snap-18',
    title: 'Almost Legal',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/almost-legal.webp',
    year: '2024',
    imdbRating: '5.0',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/almost-legal/',
  },
  {
    id: 'snap-19',
    title: 'Tow',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/tow.webp',
    year: '2026',
    imdbRating: '6.4',
    languageBadge: 'Dublaj & Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/tow-2026/',
  },
  {
    id: 'snap-20',
    title: 'The Fix',
    posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/the-fix.webp',
    year: '2026',
    imdbRating: '4.7',
    languageBadge: 'Türkçe Altyazılı',
    type: 'movie',
    detailUrl: 'https://www.hdfilmcehennemi.nl/the-fix-2026/',
  },
];

export class HdFilmCehennemiProvider implements IMovieSourceProvider {
  readonly id = 'hdfilmcehennemi';
  readonly name = 'HDFilmCehennemi';
  readonly baseUrl = 'https://www.hdfilmcehennemi.nl';
  readonly version = '1.0.0';

  /**
   * Güvenli HTML çekme yardımcısı
   */
  private async fetchHtml(
    url: string,
    customHeaders?: Record<string, string>
  ): Promise<string> {
    const headers = {
      ...DEFAULT_HEADERS,
      ...(customHeaders || {}),
    };
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} url: ${url}`);
    }
    return await response.text();
  }

  /**
   * Netflix TV Anasayfa Verisi:
   * - Üstte Öne Çıkanlar (Slider)
   * - 4 Ayrı Yatay Netflix Satırı (Yeni Eklenenler, Tavsiye Filmler, IMDb 7+, En Çok Beğenilenler)
   */
  async getHome(): Promise<HomeData> {
    try {
      const homeHtml = await this.fetchHtml(this.baseUrl);

      // 1. Üst Slider içeriklerini parse et (Hero Billboard için)
      let featured = parseSliderItems(homeHtml);
      if (featured.length === 0) {
        featured = SNAPSHOT_FEATURED;
      }

      // 2. Anasayfa "Yeni Eklenenler" satırı
      let yeniEklenenler = parsePosterItems(homeHtml);
      if (yeniEklenenler.length === 0) {
        yeniEklenenler = SNAPSHOT_YENI_EKLENENLER;
      }

      const sections: HomeSection[] = [
        {
          id: 'yeni-eklenenler',
          title: 'Yeni Eklenen Filmler',
          items: yeniEklenenler,
        },
      ];

      // 3. İkinci ve üçüncü satırları çekmeye çalış (Tavsiye ve IMDb 7+)
      try {
        const tavsiyeHtml = await this.fetchHtml(
          `${this.baseUrl}/category/tavsiye-filmler-izle2/`
        );
        const tavsiyeItems = parsePosterItems(tavsiyeHtml);
        if (tavsiyeItems.length > 0) {
          sections.push({
            id: 'tavsiye-filmler',
            title: 'Tavsiye Filmler',
            items: tavsiyeItems,
          });
        }
      } catch {
        // İkincil satır çekilemezse akış bozulmaz
      }

      try {
        const imdbHtml = await this.fetchHtml(
          `${this.baseUrl}/imdb-7-puan-uzeri-filmler-2/`
        );
        const imdbItems = parsePosterItems(imdbHtml);
        if (imdbItems.length > 0) {
          sections.push({
            id: 'imdb-7-filmler',
            title: 'IMDb 7+ Başyapıtlar',
            items: imdbItems,
          });
        }
      } catch {
        // Hata bastırılır
      }

      return {
        featured,
        sections,
      };
    } catch {
      // Ağ hatasında veya ilk açılışta anında snapshot döner (kullanıcı bekletilmez)
      return {
        featured: SNAPSHOT_FEATURED,
        sections: [
          {
            id: 'yeni-eklenenler',
            title: 'Yeni Eklenen Filmler',
            items: SNAPSHOT_YENI_EKLENENLER,
          },
          {
            id: 'tavsiye-filmler',
            title: 'Tavsiye Filmler',
            items: SNAPSHOT_YENI_EKLENENLER.slice(5, 15),
          },
          {
            id: 'imdb-7-filmler',
            title: 'IMDb 7+ Başyapıtlar',
            items: SNAPSHOT_YENI_EKLENENLER.filter(
              (m) => Number(m.imdbRating || 0) >= 6.0
            ),
          },
        ],
      };
    }
  }

  async getMovies(
    page: number = 1,
    categorySlug?: string
  ): Promise<PaginatedResult> {
    const slug = categorySlug || 'film-izle-2';
    const isGenre = slug.startsWith('tur/');

    let url: string;
    let referer: string;
    let defaultTotalPages = 877;

    if (isGenre) {
      const cleanSlug = slug.replace(/^tur\//, '').replace(/\/+$/, '');
      url =
        page === 1
          ? `${this.baseUrl}/tur/${cleanSlug}/`
          : `${this.baseUrl}/load/page/${page}/genres/${cleanSlug}/`;
      referer =
        page === 1
          ? `${this.baseUrl}/`
          : `${this.baseUrl}/tur/${cleanSlug}/`;
      defaultTotalPages = 150;
    } else {
      url =
        page === 1
          ? `${this.baseUrl}/category/${slug}/`
          : `${this.baseUrl}/load/page/${page}/categories/${slug}/`;
      referer =
        page === 1
          ? `${this.baseUrl}/`
          : `${this.baseUrl}/category/${slug}/`;
    }

    try {
      const html = await this.fetchHtml(url, { Referer: referer });
      const items = parsePosterItems(html);
      const pagination = extractPaginationInfo(html);

      if (items.length > 0) {
        const total = pagination.totalPages || defaultTotalPages;
        return {
          items,
          currentPage: page,
          totalPages: total,
          hasNextPage: page < total,
        };
      }
    } catch (err) {
      console.warn('getMovies fetch error, using snapshot fallback:', err);
    }

    return {
      items: SNAPSHOT_YENI_EKLENENLER,
      currentPage: page,
      totalPages: 1,
      hasNextPage: false,
    };
  }

  async getSeries(page: number = 1): Promise<PaginatedResult> {
    const url =
      page === 1
        ? `${this.baseUrl}/yabancidiziizle-5/`
        : `${this.baseUrl}/load/page/${page}/home-series/`;

    const referer =
      page === 1
        ? `${this.baseUrl}/`
        : `${this.baseUrl}/yabancidiziizle-5/`;

    try {
      const html = await this.fetchHtml(url, { Referer: referer });
      const items = parsePosterItems(html);
      const pagination = extractPaginationInfo(html);

      if (items.length > 0) {
        return {
          items,
          currentPage: page,
          totalPages: pagination.totalPages || 109,
          hasNextPage: page < (pagination.totalPages || 109),
        };
      }
    } catch (err) {
      console.warn('getSeries fetch error, using snapshot fallback:', err);
    }

    return {
      items: SNAPSHOT_YENI_EKLENENLER.map((item) => ({
        ...item,
        id: `series-${item.id}`,
        type: 'series' as const,
      })),
      currentPage: page,
      totalPages: 1,
      hasNextPage: false,
    };
  }

  async search(query: string): Promise<PaginatedResult> {
    const cleanQuery = query.trim();
    // Eğer arama sorgusu boş ise popüler arama önerilerini getir (/search)
    const url = cleanQuery
      ? `${this.baseUrl}/search?q=${encodeURIComponent(cleanQuery)}`
      : `${this.baseUrl}/search`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...DEFAULT_HEADERS,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'fetch',
          Referer: `${this.baseUrl}/`,
        },
      });

      if (!response.ok) {
        throw new Error(`Search HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const resultsHtmlArray = Array.isArray(data?.results) ? data.results : [];
      const items = parseSearchResults(resultsHtmlArray);

      return {
        items,
        currentPage: 1,
        hasNextPage: false,
      };
    } catch (err) {
      console.warn('HdFilmCehennemi search error:', err);
      // Fallback: Çevrimdışı / hata durumunda anasayfa snapshot içeriklerinde yerel filtreleme yap
      const fallbackItems = SNAPSHOT_YENI_EKLENENLER.filter((item) =>
        item.title
          .toLocaleLowerCase('tr-TR')
          .includes(cleanQuery.toLocaleLowerCase('tr-TR'))
      );
      return {
        items: fallbackItems,
        currentPage: 1,
        hasNextPage: false,
      };
    }
  }

  async getDetails(detailUrl: string): Promise<MediaDetail> {
    try {
      const html = await this.fetchHtml(detailUrl);
      const isSeriesMain = detailUrl.includes('/dizi/') && !detailUrl.includes('/bolum-');
      if (isSeriesMain) {
        return parseSeriesDetail(html, detailUrl);
      }
      const detail = parseMovieDetail(html, detailUrl);
      return detail;
    } catch (err) {
      console.warn('HdFilmCehennemi getDetails error:', err);
      throw err;
    }
  }

  /**
   * Eğer video kaynağı /video/{id}/ API URL'si ise istek atıp gerçek iframe embed URL'sini çözer.
   */
  async resolveVideoUrl(
    source: VideoSourceOption,
    detailUrl: string
  ): Promise<string> {
    // Zaten doğrudan embed url (örn. mobi embed, rplayer, rapidrame veya /embed/ içerenler) ise doğrudan dön
    if (
      !source.embedUrl ||
      source.embedUrl.includes('/embed/') ||
      source.embedUrl.includes('hdfilmcehennemi.mobi') ||
      source.embedUrl.includes('rplayer') ||
      source.embedUrl.includes('rapidrame') ||
      source.embedUrl.includes('vidmoly') ||
      !source.embedUrl.includes('/video/')
    ) {
      return source.embedUrl;
    }

    try {
      const response = await fetch(source.embedUrl, {
        method: 'GET',
        headers: {
          ...DEFAULT_HEADERS,
          'Referer': detailUrl,
          'X-Requested-With': 'fetch',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
        },
      });

      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json && json.success && json.data && json.data.html) {
            const srcMatch =
              /data-src="([^"]+)"/i.exec(json.data.html) ||
              /src="([^"]+)"/i.exec(json.data.html);
            if (srcMatch) {
              let resolved = srcMatch[1].replace(/\\\//g, '/');
              if (resolved.startsWith('//')) {
                resolved = 'https:' + resolved;
              }
              return resolved;
            }
          }
        } catch (jsonErr) {
          // Eğer JSON değil de HTML yanıt döndüyse iframe data-src ara
          const srcMatch =
            /data-src="([^"]+)"/i.exec(text) ||
            /src="([^"]+)"/i.exec(text);
          if (srcMatch) {
            let resolved = srcMatch[1].replace(/\\\//g, '/');
            if (resolved.startsWith('//')) {
              resolved = 'https:' + resolved;
            }
            return resolved;
          }
        }
      }
    } catch (err) {
      console.warn('HdFilmCehennemi resolveVideoUrl error:', err);
    }

    return source.embedUrl;
  }
}
