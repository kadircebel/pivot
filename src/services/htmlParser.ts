import {
  EpisodeItem,
  MediaDetail,
  SeasonItem,
  VideoSourceOption,
} from '../core/interfaces/IMovieSourceProvider';
import { MediaItem } from '../types/media';

/**
 * HTML varlıklarını (entities) Türkçe ve evrensel karakterlere dönüştürür.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&icirc;/g, 'î')
    .replace(/&Icirc;/g, 'Î')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

/**
 * Göreceli URL'leri tam alan adı ile tamamlar.
 */
export function normalizeUrl(url: string, baseUrl: string = 'https://www.hdfilmcehennemi.nl'): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

/**
 * Sitenin üst slider (öne çıkanlar) HTML bloğunu parse eder.
 */
export function parseSliderItems(html: string): MediaItem[] {
  const items: MediaItem[] = [];
  const slideRegex = /<div class="slider-slide">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match;

  while ((match = slideRegex.exec(html)) !== null) {
    const block = match[1];

    // Detay URL & Başlık
    const linkMatch = /<a[^>]+href="([^"]+)"[^>]*title="([^"]*)"/i.exec(block);
    if (!linkMatch) continue;
    const detailUrl = normalizeUrl(linkMatch[1]);
    const rawTitle = linkMatch[2] || '';

    // ID / Token
    const tokenMatch = /data-token="([^"]*)"/i.exec(block);
    const id = tokenMatch ? `slider-${tokenMatch[1]}` : `slider-${detailUrl}`;

    // Poster Görseli
    const imgMatch = /<img[^>]+(?:data-src|src)="([^"]+)"/i.exec(block);
    let posterUrl = imgMatch ? normalizeUrl(imgMatch[1]) : '';
    // Base64 boş placeholder'ı data-src ile değiştir
    if (posterUrl.startsWith('data:image')) {
      const dataSrcMatch = /data-src="([^"]+)"/i.exec(block);
      if (dataSrcMatch) {
        posterUrl = normalizeUrl(dataSrcMatch[1]);
      }
    }

    // Başlık (güçlü etiket içinden)
    const titleMatch = /<strong class="poster-title">([\s\S]*?)<\/strong>/i.exec(block);
    const title = decodeHtmlEntities(titleMatch ? titleMatch[1] : rawTitle);

    // IMDb Puanı
    const imdbMatch = /<span class="imdb">[\s\S]*?<\/svg>\s*([\d.]+)\s*<\/span>/i.exec(block);
    const imdbRating = imdbMatch ? imdbMatch[1].trim() : undefined;

    // Yıl
    const yearMatch = /<div class="poster-meta">[\s\S]*?<span>(\d{4})<\/span>/i.exec(block);
    const year = yearMatch ? yearMatch[1] : undefined;

    // Dil
    const langMatch = /<span class="poster-lang">[\s\S]*?<span>([\s\S]*?)<\/span>/i.exec(block);
    const languageBadge = langMatch ? decodeHtmlEntities(langMatch[1]) : undefined;

    // Tip: Dizi mi Film mi?
    const isSeries = detailUrl.includes('/dizi/') || (languageBadge && languageBadge.includes('Dizi'));

    // Backdrop görseli türetimi (cover klasörü)
    const backdropUrl = posterUrl ? posterUrl.replace('/poster/', '/cover/') : undefined;

    items.push({
      id,
      title,
      posterUrl,
      backdropUrl,
      year,
      imdbRating,
      languageBadge,
      type: isSeries ? 'series' : 'movie',
      detailUrl,
      overview: `${title}, ${year || ''} yılında yayınlanmış ${isSeries ? 'yabancı dizi' : 'sinema filmi'}. Türkçe dublaj ve altyazı seçenekleriyle kesintisiz izleyebilirsiniz.`,
    });
  }

  return items;
}

/**
 * AJAX /load/page/... isteklerinden dönen yanıt JSON ise içindeki HTML string'ini çıkarır,
 * değilse doğrudan metni döndürür.
 */
export function extractHtmlFromResponse(rawResponse: string): string {
  if (!rawResponse) return '';
  const trimmed = rawResponse.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      if (typeof data.html === 'string') return data.html;
      if (typeof data.content === 'string') return data.content;
      if (typeof data.data === 'string') return data.data;
      if (typeof data.template === 'string') return data.template;
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'string' && data[key].includes('poster')) {
          return data[key];
        }
      }
    } catch {
      // JSON parse edilemezse ham metin
    }
  }
  return rawResponse;
}

/**
 * Sayfalama konteynerinden toplam sayfa sayısını ve pagination action yolunu ayıklar.
 */
export function extractPaginationInfo(rawHtml: string): { totalPages?: number; pageAction?: string } {
  const html = extractHtmlFromResponse(rawHtml);
  const match =
    /<nav[^>]+class="[^"]*pagination-container[^"]*"[^>]*data-pages="(\d+)"[^>]*data-page-action="([^"]+)"/i.exec(html) ||
    /<nav[^>]+class="[^"]*pagination-container[^"]*"[^>]*data-page-action="([^"]+)"[^>]*data-pages="(\d+)"/i.exec(html);

  if (match) {
    const isFirstNum = !isNaN(Number(match[1]));
    const totalPages = isFirstNum ? parseInt(match[1], 10) : parseInt(match[2], 10);
    const pageAction = isFirstNum ? match[2] : match[1];
    return { totalPages, pageAction };
  }
  return {};
}

/**
 * Standart 4'lü poster listesinden film ve dizi kartlarını parse eder.
 */
export function parsePosterItems(rawHtml: string): MediaItem[] {
  const html = extractHtmlFromResponse(rawHtml);
  const items: MediaItem[] = [];
  // <a href="..." ... class="poster ..."> veya class="poster" içeren bağlantılar
  const posterRegex = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*\bposter\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = posterRegex.exec(html)) !== null) {
    const detailUrl = normalizeUrl(match[1]);
    const block = match[2];

    // Slider posterlerini ayrı aldığımız için burada filtreleyebiliriz
    if (match[0].includes('poster-slider')) continue;

    // Token ID
    const tokenMatch = /data-token="([^"]*)"/i.exec(match[0]);
    const id = tokenMatch ? `poster-${tokenMatch[1]}` : `poster-${detailUrl}`;

    // Poster Görseli (lazyload data-src önceliklidir)
    let posterUrl = '';
    const dataSrcMatch = /data-src="([^"]+)"/i.exec(block);
    if (dataSrcMatch && !dataSrcMatch[1].startsWith('data:image')) {
      posterUrl = normalizeUrl(dataSrcMatch[1]);
    } else {
      const srcMatch = /src="([^"]+)"/i.exec(block);
      if (srcMatch && !srcMatch[1].startsWith('data:image')) {
        posterUrl = normalizeUrl(srcMatch[1]);
      }
    }

    // Başlık
    const titleMatch = /<strong class="poster-title">([\s\S]*?)<\/strong>/i.exec(block);
    const altTitleMatch = /title="([^"]*)"/i.exec(match[0]);
    const title = decodeHtmlEntities(
      titleMatch ? titleMatch[1] : altTitleMatch ? altTitleMatch[1] : ''
    );

    if (!title) continue;

    // IMDb Puanı
    const imdbMatch = /<span class="imdb">[\s\S]*?<\/svg>\s*([\d.]+)\s*<\/span>/i.exec(block);
    const imdbRating = imdbMatch ? imdbMatch[1].trim() : undefined;

    // Yıl
    const yearMatch = /<div class="poster-meta">[\s\S]*?<span>(\d{4})<\/span>/i.exec(block);
    const year = yearMatch ? yearMatch[1] : undefined;

    // Dil Rozeti
    const langMatch = /<span class="poster-lang">[\s\S]*?<span>([\s\S]*?)<\/span>/i.exec(block);
    const languageBadge = langMatch ? decodeHtmlEntities(langMatch[1]) : undefined;

    const isSeries = detailUrl.includes('/dizi/') || (languageBadge && languageBadge.includes('Dizi'));
    const backdropUrl = posterUrl ? posterUrl.replace('/poster/', '/cover/') : undefined;

    items.push({
      id,
      title,
      posterUrl,
      backdropUrl,
      year,
      imdbRating,
      languageBadge,
      type: isSeries ? 'series' : 'movie',
      detailUrl,
    });
  }

  return items;
}

export interface ParsedMovieDetail extends MediaDetail {
  languages: { id: string; name: string }[];
}

/**
 * Film detay sayfasını (başlık, açıklama, kapak, türler, oynatıcı alternatifleri) parse eder.
 */
export function parseMovieDetail(rawHtml: string, detailUrl: string): ParsedMovieDetail {
  const html = extractHtmlFromResponse(rawHtml);

  // 1. Başlık & Yıl
  const titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const yearMatch = /\((\d{4})\)/.exec(rawTitle);
  const year = yearMatch ? yearMatch[1] : undefined;
  let title = rawTitle.replace(/<[^>]+>/g, '').trim();
  title = title.replace(/\s*\(\d{4}\)\s*/g, '').replace(/\bizle\b/gi, '').trim();
  title = decodeHtmlEntities(title);

  // 2. Açıklama (Story / Overview)
  let description = '';
  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  if (articleMatch) {
    description = articleMatch[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!description) {
    const metaDesc = /<meta[^>]+name="description"[^>]+content="([^"]+)"/i.exec(html);
    if (metaDesc) {
      description = metaDesc[1].trim();
    }
  }
  description = decodeHtmlEntities(description);

  // 3. Poster & Backdrop
  let posterUrl = '';
  const posterMatch =
    /"image":"([^"]+)"/i.exec(html) ||
    /<div class="poster-wrapper"[\s\S]*?src="([^"]+)"/i.exec(html);
  if (posterMatch) {
    posterUrl = normalizeUrl(posterMatch[1]);
  }

  let backdropUrl = '';
  const coverMatch = /src="([^"]*\/images\/list\/cover\/[^"]*)"/i.exec(html);
  if (coverMatch) {
    backdropUrl = normalizeUrl(coverMatch[1]);
  } else if (posterUrl) {
    backdropUrl = posterUrl.replace('/poster/', '/cover/');
  }

  // 4. IMDb Puanı
  const imdbMatch = /class="imdb"[\s\S]*?<\/svg>\s*([\d.]+)/i.exec(html);
  const imdbRating = imdbMatch ? imdbMatch[1].trim() : undefined;

  // 5. Süre
  let duration: string | undefined;
  const durMatch = /"duration":"PT(\d+)M"/i.exec(html);
  if (durMatch) {
    duration = `${durMatch[1]} dk`;
  }

  // 6. Türler (Genres)
  const genres: string[] = [];
  const genreRegex = /<a[^>]+href="[^"]*\/tur\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let gMatch;
  while ((gMatch = genreRegex.exec(html)) !== null) {
    const gName = decodeHtmlEntities(gMatch[1].replace(/<[^>]+>/g, '').trim());
    if (gName && !genres.includes(gName)) {
      genres.push(gName);
    }
  }

  // 7. Dil Seçenekleri (Language Tabs)
  const languages: { id: string; name: string }[] = [];
  const langRegex =
    /<button[^>]*class="[^"]*language-link[^"]*"[^>]*data-lang="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi;
  let lMatch;
  while ((lMatch = langRegex.exec(html)) !== null) {
    const lName = decodeHtmlEntities(lMatch[2].replace(/<[^>]+>/g, '').trim());
    languages.push({ id: lMatch[1], name: lName });
  }

  // 8. Video Alternatifleri (Player Butonları)
  const sources: VideoSourceOption[] = [];
  const defIframeMatch =
    /<div class="video-container"[\s\S]*?<iframe[^>]+data-src="([^"]+)"/i.exec(html);
  const defaultEmbedUrl = defIframeMatch ? normalizeUrl(defIframeMatch[1]) : '';

  const buttonRegex =
    /<button([^>]*)class="[^"]*alternative-link[^"]*"([^>]*)>([\s\S]*?)<\/button>/gi;
  let bMatch;
  while ((bMatch = buttonRegex.exec(html)) !== null) {
    const fullTag = bMatch[1] + ' ' + bMatch[2];
    const vidMatch = /data-video="([^"]+)"/i.exec(fullTag);
    const activeMatch = /data-active="([^"]*)"/i.exec(fullTag);
    const name = decodeHtmlEntities(bMatch[3].replace(/<[^>]+>/g, '').trim()) || 'Player';
    const videoId = vidMatch ? vidMatch[1] : '';
    const isActive = activeMatch ? activeMatch[1] === '1' : false;

    sources.push({
      id: videoId,
      name,
      embedUrl:
        isActive && defaultEmbedUrl
          ? defaultEmbedUrl
          : `https://www.hdfilmcehennemi.nl/video/${videoId}/`,
      language: languages.length > 0 ? languages[0].id : 'tr',
    });
  }

  // Eğer buton bulunamadıysa ama varsayılan iframe varsa fallback olarak ekle
  if (sources.length === 0 && defaultEmbedUrl) {
    sources.push({
      id: 'default',
      name: 'Varsayılan Player',
      embedUrl: defaultEmbedUrl,
      language: 'tr',
    });
  }

  return {
    id: detailUrl,
    title,
    year,
    duration,
    imdbRating,
    posterUrl,
    backdropUrl,
    description,
    genres,
    actors: [],
    languages,
    sources,
    type: 'movie',
    detailUrl,
  };
}

/**
 * Dizi detay sayfasını (başlık, açıklama, kapak, türler, sezonlar ve bölümler) parse eder.
 */
export function parseSeriesDetail(rawHtml: string, detailUrl: string): MediaDetail {
  const html = extractHtmlFromResponse(rawHtml);

  // 1. Başlık & Yıl
  const titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const yearMatch = /\((\d{4})\)/.exec(rawTitle);
  const year = yearMatch ? yearMatch[1] : undefined;
  let title = rawTitle.replace(/<[^>]+>/g, '').trim();
  title = title.replace(/\s*\(\d{4}\)\s*/g, '').replace(/\bizle\b/gi, '').trim();
  title = decodeHtmlEntities(title);

  // 2. Açıklama
  let description = '';
  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  if (articleMatch) {
    description = articleMatch[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!description) {
    const metaDesc = /<meta[^>]+name="description"[^>]+content="([^"]+)"/i.exec(html);
    if (metaDesc) {
      description = metaDesc[1].trim();
    }
  }
  description = decodeHtmlEntities(description);

  // 3. Poster & Backdrop
  let posterUrl = '';
  const posterMatch =
    /"image":"([^"]+)"/i.exec(html) ||
    /<div class="poster-wrapper"[\s\S]*?src="([^"]+)"/i.exec(html);
  if (posterMatch) {
    posterUrl = normalizeUrl(posterMatch[1]);
  }

  let backdropUrl = '';
  const coverMatch = /src="([^"]*\/images\/list\/cover\/[^"]*)"/i.exec(html);
  if (coverMatch) {
    backdropUrl = normalizeUrl(coverMatch[1]);
  } else if (posterUrl) {
    backdropUrl = posterUrl.replace('/poster/', '/cover/');
  }

  // 4. IMDb
  const imdbMatch = /class="imdb"[\s\S]*?<\/svg>\s*([\d.]+)/i.exec(html);
  const imdbRating = imdbMatch ? imdbMatch[1].trim() : undefined;

  // 5. Türler
  const genres: string[] = [];
  const genreRegex = /<a[^>]+href="[^"]*\/tur\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let gMatch;
  while ((gMatch = genreRegex.exec(html)) !== null) {
    const gName = decodeHtmlEntities(gMatch[1].replace(/<[^>]+>/g, '').trim());
    if (gName && !genres.includes(gName)) {
      genres.push(gName);
    }
  }

  // 6. Sezon Sekmeleri (Season Tabs)
  const seasonsDict: Record<number, SeasonItem> = {};
  const seasonTabRegex =
    /<button[^>]+class="[^"]*section-tab[^"]*"[^>]*data-tab="(\d+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let stMatch;
  while ((stMatch = seasonTabRegex.exec(html)) !== null) {
    const sNum = parseInt(stMatch[1], 10);
    const sTitle = decodeHtmlEntities(stMatch[2].replace(/<[^>]+>/g, '').trim()) || `Sezon ${sNum}`;
    seasonsDict[sNum] = {
      seasonNumber: sNum,
      title: sTitle,
      episodes: [],
    };
  }

  // 7. Bölümler (Episodes) - Çoklu Strateji ve Güvenli Ayrıştırma Motoru
  const parsedEpisodeIds = new Set<string>();

  const addEpisodeItem = (
    epUrl: string,
    rawSNum: number | undefined,
    rawEpNum: number | undefined,
    epBody: string
  ) => {
    // 1. Sezon ve Bölüm Numarası Tespiti (URL veya İçerikten)
    let sNum = rawSNum;
    let epNum = rawEpNum;

    if (!sNum) {
      const sMatch = /\/sezon-(\d+)/i.exec(epUrl);
      if (sMatch) sNum = parseInt(sMatch[1], 10);
    }
    if (!epNum) {
      const epMatch = /\/bolum-(\d+)/i.exec(epUrl);
      if (epMatch) epNum = parseInt(epMatch[1], 10);
    }

    // Eğer URL'de bulunamadıysa içerikten ara (örn: "1. Sezon 2. Bölüm")
    if (!sNum) {
      const textSMatch = /(\d+)\s*\.\s*Sezon/i.exec(epBody);
      sNum = textSMatch ? parseInt(textSMatch[1], 10) : 1;
    }
    if (!epNum) {
      const textEpMatch = /(\d+)\s*\.\s*Bölüm/i.exec(epBody);
      epNum = textEpMatch ? parseInt(textEpMatch[1], 10) : 1;
    }

    const uniqueId = `${sNum}-${epNum}`;
    if (parsedEpisodeIds.has(uniqueId)) return;
    parsedEpisodeIds.add(uniqueId);

    // 2. Başlık
    const titleM =
      /<h[3-6][^>]*class="[^"]*mini-poster-title[^"]*"[^>]*>([\s\S]*?)<\/h[3-6]>/i.exec(epBody) ||
      /<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(epBody) ||
      /<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(epBody);

    const epTitle = titleM
      ? decodeHtmlEntities(titleM[1].replace(/<[^>]+>/g, '').trim())
      : `${sNum}. Sezon ${epNum}. Bölüm`;

    // 3. Tarih
    const dateM =
      /<time[^>]*class="[^"]*episode-date[^"]*"[^>]*>([\s\S]*?)<\/time>/i.exec(epBody) ||
      /<time[^>]*>([\s\S]*?)<\/time>/i.exec(epBody);
    const epDate = dateM
      ? decodeHtmlEntities(dateM[1].replace(/<[^>]+>/g, '').trim())
      : undefined;

    // 4. Dublaj & Altyazı Rozetleri
    const isDubbed = epBody.includes('tr-flag') || epBody.toLowerCase().includes('dublaj');
    const hasSubtitles =
      epBody.includes('svg') ||
      epBody.toLowerCase().includes('altyaz') ||
      epBody.toLowerCase().includes('cc');

    if (!seasonsDict[sNum]) {
      seasonsDict[sNum] = {
        seasonNumber: sNum,
        title: `Sezon ${sNum}`,
        episodes: [],
      };
    }

    seasonsDict[sNum].episodes.push({
      id: uniqueId,
      seasonNumber: sNum,
      episodeNumber: epNum,
      title: epTitle,
      episodeDate: epDate,
      detailUrl: normalizeUrl(epUrl),
      isDubbed,
      hasSubtitles,
    });
  };

  // Strateji A: 'mini-poster' sınıfına sahip tüm <a> etiketleri (Örn: Star Wars, SWAT vb.)
  const miniPosterRegex =
    /<a\b([^>]*\bclass="[^"]*\bmini-poster\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;
  let mpMatch;
  while ((mpMatch = miniPosterRegex.exec(html)) !== null) {
    const fullTagAttributes = mpMatch[1];
    const epBody = mpMatch[2];
    const hrefM = /href="([^"]+)"/i.exec(fullTagAttributes);
    if (!hrefM) continue;

    const epUrl = hrefM[1];
    if (!epUrl.includes('/bolum-') && !epUrl.includes('/sezon-')) continue;

    const sMatch = /\/sezon-(\d+)/i.exec(epUrl);
    const epMatch = /\/bolum-(\d+)/i.exec(epUrl);

    addEpisodeItem(
      epUrl,
      sMatch ? parseInt(sMatch[1], 10) : undefined,
      epMatch ? parseInt(epMatch[1], 10) : undefined,
      epBody
    );
  }

  // Strateji B (Yedek/Fallback): Eğer Strateji A ile hiç bölüm bulunamadıysa doğrudan tüm /bolum- linklerini tara
  if (parsedEpisodeIds.size === 0) {
    const fallbackEpRegex =
      /<a\b[^>]*href="([^"]*\/bolum-(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let fbMatch;
    while ((fbMatch = fallbackEpRegex.exec(html)) !== null) {
      const epUrl = fbMatch[1];
      const epNum = parseInt(fbMatch[2], 10);
      const sMatch = /\/sezon-(\d+)/i.exec(epUrl);
      const sNum = sMatch ? parseInt(sMatch[1], 10) : 1;
      const epBody = fbMatch[3];

      addEpisodeItem(epUrl, sNum, epNum, epBody);
    }
  }

  // Sezonları ve bölümleri sayısal sırala
  const seasons: SeasonItem[] = Object.values(seasonsDict).sort(
    (a, b) => a.seasonNumber - b.seasonNumber
  );

  seasons.forEach((season) => {
    season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  });

  return {
    id: detailUrl,
    title,
    year,
    imdbRating,
    posterUrl,
    backdropUrl,
    description,
    genres,
    actors: [],
    sources: [],
    seasons,
    type: 'series',
    detailUrl,
  };
}

/**
 * HdFilmCehennemi AJAX arama sonuçlarını (JSON içindeki HTML snippet dizisini) MediaItem[] dizisine dönüştürür.
 */
export function parseSearchResults(htmlSnippets: string[]): MediaItem[] {
  if (!Array.isArray(htmlSnippets) || htmlSnippets.length === 0) {
    return [];
  }

  const items: MediaItem[] = [];

  for (const block of htmlSnippets) {
    if (!block || typeof block !== 'string') continue;

    const hrefMatch = /href="([^"]+)"/i.exec(block);
    if (!hrefMatch) continue;
    const detailUrl = normalizeUrl(hrefMatch[1]);

    const imgMatch = /<img[^>]+(?:src|data-src)="([^"]+)"/i.exec(block);
    let posterUrl = imgMatch ? normalizeUrl(imgMatch[1]) : '';
    // Yüksek çözünürlük için thumb yerine list poster kullan
    if (posterUrl.includes('/images/thumb/poster/')) {
      posterUrl = posterUrl.replace('/images/thumb/poster/', '/images/list/poster/');
    }

    const titleMatch = /<h4[^>]*class="title"[^>]*>([\s\S]*?)<\/h4>/i.exec(block);
    const title = decodeHtmlEntities(titleMatch ? titleMatch[1] : '');
    if (!title) continue;

    const yearMatch = /<span class="year">([^<]+)<\/span>/i.exec(block);
    const year = yearMatch ? yearMatch[1].trim() : undefined;

    const imdbMatch = /<span class="imdb"[^>]*>[\s\S]*?<\/svg>\s*([\d.]+)/i.exec(block);
    const imdbRating = imdbMatch ? imdbMatch[1].trim() : undefined;

    const typeMatch = /<span class="type">([^<]+)<\/span>/i.exec(block);
    const typeText = typeMatch ? typeMatch[1].trim() : '';

    const isSeries =
      detailUrl.includes('/dizi/') ||
      typeText.toLowerCase().includes('dizi');

    const id = `search-${detailUrl.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;

    items.push({
      id,
      title,
      posterUrl,
      backdropUrl: posterUrl ? posterUrl.replace('/poster/', '/cover/') : undefined,
      year,
      imdbRating,
      type: isSeries ? 'series' : 'movie',
      languageBadge: typeText || (isSeries ? 'Dizi' : 'Film'),
      detailUrl,
    });
  }

  return items;
}
