export interface SubtitleTrack {
  title: string;
  language: string;
  uri: string;
}

export interface ExtractedStream {
  streamUrl: string;
  headers?: Record<string, string>;
  subtitles?: SubtitleTrack[];
  title?: string;
  sourceName?: string;
}

/**
 * Desteklenen video kaynak tipleri
 */
export type VideoSourceType = 'rapidrame' | 'vidmoly' | 'close' | 'direct' | 'unknown';

/**
 * Verilen embed URL'sinin kaynak tipini tespit eder.
 */
export function detectSourceType(url: string): VideoSourceType {
  const lower = url.toLowerCase();
  if (lower.includes('rapidrame') || lower.includes('/rplayer/')) {
    return 'rapidrame';
  }
  if (lower.includes('vidmoly')) {
    return 'vidmoly';
  }
  if (lower.includes('close') || lower.includes('mobi')) {
    return 'close';
  }
  if (lower.includes('.m3u8') || lower.includes('.mp4')) {
    return 'direct';
  }
  return 'unknown';
}

/**
 * Saniye cinsinden zamanı formatlar (01:25:30 veya 05:42)
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export function parseVttTime(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  }
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseVtt(vttContent: string): SubtitleCue[] {
  const lines = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->');
      const start = parseVttTime(startStr.split(' ')[0]);
      const end = parseVttTime(endStr.trim().split(' ')[0]);
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '') {
        const cleaned = lines[i].replace(/<[^>]+>/g, '').trim();
        if (cleaned) {
          text += (text ? '\n' : '') + cleaned;
        }
        i++;
      }
      if (text) {
        cues.push({ start, end, text });
      }
    } else {
      i++;
    }
  }
  return cues;
}

const SUBTITLE_LANGUAGE_MAP: Record<string, { name: string; lang: string }> = {
  tur: { name: 'Türkçe Altyazı', lang: 'tr' },
  tr: { name: 'Türkçe Altyazı', lang: 'tr' },
  türk: { name: 'Türkçe Altyazı', lang: 'tr' },
  turkish: { name: 'Türkçe Altyazı', lang: 'tr' },
  eng: { name: 'İngilizce Altyazı', lang: 'en' },
  en: { name: 'İngilizce Altyazı', lang: 'en' },
  english: { name: 'İngilizce Altyazı', lang: 'en' },
  ingilizce: { name: 'İngilizce Altyazı', lang: 'en' },
  ger: { name: 'Almanca Altyazı', lang: 'de' },
  de: { name: 'Almanca Altyazı', lang: 'de' },
  deu: { name: 'Almanca Altyazı', lang: 'de' },
  german: { name: 'Almanca Altyazı', lang: 'de' },
  deutsch: { name: 'Almanca Altyazı', lang: 'de' },
  almanca: { name: 'Almanca Altyazı', lang: 'de' },
  fre: { name: 'Fransızca Altyazı', lang: 'fr' },
  fra: { name: 'Fransızca Altyazı', lang: 'fr' },
  fr: { name: 'Fransızca Altyazı', lang: 'fr' },
  french: { name: 'Fransızca Altyazı', lang: 'fr' },
  français: { name: 'Fransızca Altyazı', lang: 'fr' },
  fransizca: { name: 'Fransızca Altyazı', lang: 'fr' },
  spa: { name: 'İspanyolca Altyazı', lang: 'es' },
  es: { name: 'İspanyolca Altyazı', lang: 'es' },
  spanish: { name: 'İspanyolca Altyazı', lang: 'es' },
  español: { name: 'İspanyolca Altyazı', lang: 'es' },
  ispanyolca: { name: 'İspanyolca Altyazı', lang: 'es' },
  ita: { name: 'İtalyanca Altyazı', lang: 'it' },
  it: { name: 'İtalyanca Altyazı', lang: 'it' },
  italian: { name: 'İtalyanca Altyazı', lang: 'it' },
  italiano: { name: 'İtalyanca Altyazı', lang: 'it' },
  italyanca: { name: 'İtalyanca Altyazı', lang: 'it' },
  rus: { name: 'Rusça Altyazı', lang: 'ru' },
  ru: { name: 'Rusça Altyazı', lang: 'ru' },
  russian: { name: 'Rusça Altyazı', lang: 'ru' },
  rusca: { name: 'Rusça Altyazı', lang: 'ru' },
  ara: { name: 'Arapça Altyazı', lang: 'ar' },
  ar: { name: 'Arapça Altyazı', lang: 'ar' },
  arabic: { name: 'Arapça Altyazı', lang: 'ar' },
  arapca: { name: 'Arapça Altyazı', lang: 'ar' },
  por: { name: 'Portekizce Altyazı', lang: 'pt' },
  pt: { name: 'Portekizce Altyazı', lang: 'pt' },
  portuguese: { name: 'Portekizce Altyazı', lang: 'pt' },
  dut: { name: 'Felemenkçe Altyazı', lang: 'nl' },
  nl: { name: 'Felemenkçe Altyazı', lang: 'nl' },
  dutch: { name: 'Felemenkçe Altyazı', lang: 'nl' },
  pol: { name: 'Lehçe Altyazı', lang: 'pl' },
  pl: { name: 'Lehçe Altyazı', lang: 'pl' },
  polish: { name: 'Lehçe Altyazı', lang: 'pl' },
  jpn: { name: 'Japonca Altyazı', lang: 'ja' },
  ja: { name: 'Japonca Altyazı', lang: 'ja' },
  japanese: { name: 'Japonca Altyazı', lang: 'ja' },
  kor: { name: 'Korece Altyazı', lang: 'ko' },
  ko: { name: 'Korece Altyazı', lang: 'ko' },
  korean: { name: 'Korece Altyazı', lang: 'ko' },
  chi: { name: 'Çince Altyazı', lang: 'zh' },
  zho: { name: 'Çince Altyazı', lang: 'zh' },
  zh: { name: 'Çince Altyazı', lang: 'zh' },
  chinese: { name: 'Çince Altyazı', lang: 'zh' },
  aze: { name: 'Azerice Altyazı', lang: 'az' },
  az: { name: 'Azerice Altyazı', lang: 'az' },
  fas: { name: 'Farsça Altyazı', lang: 'fa' },
  fa: { name: 'Farsça Altyazı', lang: 'fa' },
  ell: { name: 'Yunanca Altyazı', lang: 'el' },
  el: { name: 'Yunanca Altyazı', lang: 'el' },
  ron: { name: 'Romence Altyazı', lang: 'ro' },
  ro: { name: 'Romence Altyazı', lang: 'ro' },
  bul: { name: 'Bulgarca Altyazı', lang: 'bg' },
  bg: { name: 'Bulgarca Altyazı', lang: 'bg' },
  swe: { name: 'İsveççe Altyazı', lang: 'sv' },
  sv: { name: 'İsveççe Altyazı', lang: 'sv' },
  nor: { name: 'Norveççe Altyazı', lang: 'no' },
  no: { name: 'Norveççe Altyazı', lang: 'no' },
  dan: { name: 'Danca Altyazı', lang: 'da' },
  da: { name: 'Danca Altyazı', lang: 'da' },
  fin: { name: 'Fince Altyazı', lang: 'fi' },
  fi: { name: 'Fince Altyazı', lang: 'fi' },
  ukr: { name: 'Ukraynaca Altyazı', lang: 'uk' },
  uk: { name: 'Ukraynaca Altyazı', lang: 'uk' },
  hun: { name: 'Macarca Altyazı', lang: 'hu' },
  hu: { name: 'Macarca Altyazı', lang: 'hu' },
  ces: { name: 'Çekçe Altyazı', lang: 'cs' },
  cs: { name: 'Çekçe Altyazı', lang: 'cs' },
  hin: { name: 'Hintçe Altyazı', lang: 'hi' },
  hi: { name: 'Hintçe Altyazı', lang: 'hi' },
  heb: { name: 'İbranice Altyazı', lang: 'he' },
  he: { name: 'İbranice Altyazı', lang: 'he' },
  ind: { name: 'Endonezce Altyazı', lang: 'id' },
  id: { name: 'Endonezce Altyazı', lang: 'id' },
  vie: { name: 'Vietnamca Altyazı', lang: 'vi' },
  vi: { name: 'Vietnamca Altyazı', lang: 'vi' },
  tha: { name: 'Tayca Altyazı', lang: 'th' },
  th: { name: 'Tayca Altyazı', lang: 'th' },
};

export function resolveSubtitleNameAndLanguage(
  rawLabel: string,
  rawLang: string,
  fileUrl: string,
  index: number
): { title: string; language: string } {
  const labelClean = (rawLabel || '').trim().toLowerCase();
  const langClean = (rawLang || '').trim().toLowerCase();
  const filename = (fileUrl.split('/').pop() || '').toLowerCase();

  // 1. Doğrudan kod veya etiket eşleşmesi
  if (labelClean && SUBTITLE_LANGUAGE_MAP[labelClean]) {
    return {
      title: SUBTITLE_LANGUAGE_MAP[labelClean].name,
      language: SUBTITLE_LANGUAGE_MAP[labelClean].lang,
    };
  }
  if (langClean && SUBTITLE_LANGUAGE_MAP[langClean]) {
    return {
      title: SUBTITLE_LANGUAGE_MAP[langClean].name,
      language: SUBTITLE_LANGUAGE_MAP[langClean].lang,
    };
  }

  // 2. Etiket içinde dil adı araması
  for (const key of Object.keys(SUBTITLE_LANGUAGE_MAP)) {
    if (key.length >= 3 && labelClean.includes(key)) {
      return {
        title: SUBTITLE_LANGUAGE_MAP[key].name,
        language: SUBTITLE_LANGUAGE_MAP[key].lang,
      };
    }
  }

  // 3. Dosya adının sonundaki dil takısını incele (Örn: _subtitles01engtr.vtt, _subtitles02eng.vtt)
  if (
    filename.includes('engtr') ||
    filename.endsWith('_tr.vtt') ||
    filename.endsWith('-tr.vtt')
  ) {
    return { title: 'Türkçe Altyazı', language: 'tr' };
  }
  if (
    filename.includes('eng.vtt') ||
    filename.endsWith('_en.vtt') ||
    filename.endsWith('-en.vtt')
  ) {
    return { title: 'İngilizce Altyazı', language: 'en' };
  }
  if (
    filename.includes('fre') ||
    filename.endsWith('_fr.vtt') ||
    filename.endsWith('-fr.vtt')
  ) {
    return { title: 'Fransızca Altyazı', language: 'fr' };
  }
  if (
    filename.includes('ger') ||
    filename.endsWith('_de.vtt') ||
    filename.endsWith('-de.vtt')
  ) {
    return { title: 'Almanca Altyazı', language: 'de' };
  }
  if (
    filename.includes('spa') ||
    filename.endsWith('_es.vtt') ||
    filename.endsWith('-es.vtt')
  ) {
    return { title: 'İspanyolca Altyazı', language: 'es' };
  }
  if (
    filename.includes('ita') ||
    filename.endsWith('_it.vtt') ||
    filename.endsWith('-it.vtt')
  ) {
    return { title: 'İtalyanca Altyazı', language: 'it' };
  }
  if (
    filename.includes('rus') ||
    filename.endsWith('_ru.vtt') ||
    filename.endsWith('-ru.vtt')
  ) {
    return { title: 'Rusça Altyazı', language: 'ru' };
  }
  if (
    filename.includes('ara') ||
    filename.endsWith('_ar.vtt') ||
    filename.endsWith('-ar.vtt')
  ) {
    return { title: 'Arapça Altyazı', language: 'ar' };
  }

  // 4. Eğer rawLabel bir metin içeriyorsa baş harfini büyüterek sun
  if (rawLabel && rawLabel.trim().length > 0) {
    const formatted =
      rawLabel.trim().charAt(0).toUpperCase() + rawLabel.trim().slice(1);
    return { title: `${formatted} Altyazı`, language: langClean || 'und' };
  }

  return { title: `Altyazı ${index + 1}`, language: langClean || 'und' };
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function safeAtob(input: string): string {
  const globalRef = globalThis as any;
  if (typeof globalRef.atob === 'function') {
    try {
      return globalRef.atob(input);
    } catch (e) {}
  }
  const str = String(input).replace(/[=]+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer: any, idx = 0; (buffer = str.charAt(idx++)); ) {
    const charIndex = B64_CHARS.indexOf(buffer);
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return output;
}

function safeBtoa(input: string): string {
  const globalRef = globalThis as any;
  if (typeof globalRef.btoa === 'function') {
    try {
      return globalRef.btoa(input);
    } catch (e) {}
  }
  const str = String(input);
  let output = '';
  for (
    let block = 0, charCode: any, idx = 0, map = B64_CHARS;
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

/**
 * Doğrudan HTTP fetch ve JS script çözümü ile akışı ayıklar.
 * hdfilmcehennemi.mobi (Close Player) gibi kaynakları 300ms içinde çözer.
 */
export async function extractDirectStream(
  embedUrl: string,
  refererUrl?: string,
  sourceName?: string
): Promise<ExtractedStream | null> {
  try {
    // 1. Doğrudan video linki kontrolü
    if (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4')) {
      return {
        streamUrl: embedUrl,
        headers: {
          Referer: refererUrl || 'https://www.hdfilmcehennemi.nl/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Television_1080p) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        subtitles: [],
        sourceName: sourceName || 'Kaynak',
      };
    }

    // 2. hdfilmcehennemi.mobi / Close player kontrolü
    if (embedUrl.includes('hdfilmcehennemi.mobi') || embedUrl.includes('/video/embed/')) {
      const res = await fetch(embedUrl, {
        headers: {
          Referer: refererUrl || 'https://www.hdfilmcehennemi.nl/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) return null;
      const html = await res.text();
      const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];

      let streamVar: string | null = null;
      let rawTracks: any[] = [];

      // jwplayer setup içindeki sources değişken adını ve tracks dizisini bul
      for (const s of scripts) {
        const varMatch = s.match(/sources:\s*\[\s*{\s*file:\s*([a-zA-Z0-9_$]+)/);
        if (varMatch) {
          streamVar = varMatch[1];
          const tracksMatch = s.match(/tracks:\s*(\[[^\]]+\])/);
          if (tracksMatch) {
            try {
              rawTracks = JSON.parse(tracksMatch[1]);
            } catch (e) {}
          }
          break;
        }
      }

      if (!streamVar) return null;

      // Bu değişkeni çözümlen decoder scriptini bul
      let decoderScript = '';
      for (const s of scripts) {
        if (s.includes('function') && s.includes(streamVar)) {
          decoderScript = s.replace(/<\/?script[^>]*>/gi, '');
          break;
        }
      }

      if (!decoderScript) return null;

      // Scripti güvenli bir fonksiyon içinde çalıştır
      const evalFunc = new Function(
        'atob',
        'btoa',
        `
        ${decoderScript}
        return typeof ${streamVar} !== "undefined" ? ${streamVar} : null;
      `
      );

      const streamUrl = evalFunc(safeAtob, safeBtoa);
      if (!streamUrl || typeof streamUrl !== 'string') return null;

      // Altyazıları ayrıştır ve dillere göre doğru adlandır
      const subtitles: SubtitleTrack[] = [];
      const titleCounts: Record<string, number> = {};

      if (Array.isArray(rawTracks)) {
        rawTracks.forEach((t: any, idx: number) => {
          if (
            t.file &&
            (t.kind === 'captions' || t.kind === 'subtitles' || !t.kind)
          ) {
            let sUrl = t.file;
            if (sUrl.startsWith('//')) sUrl = 'https:' + sUrl;

            const detected = resolveSubtitleNameAndLanguage(
              t.label || t.name || '',
              t.language || '',
              sUrl,
              idx
            );

            titleCounts[detected.title] =
              (titleCounts[detected.title] || 0) + 1;

            subtitles.push({
              title: detected.title,
              language: detected.language,
              uri: sUrl,
            });
          }
        });

        // Eğer aynı dilde birden fazla altyazı varsa numaralandır (Örn: Türkçe Altyazı 1, Türkçe Altyazı 2)
        const seenCounts: Record<string, number> = {};
        for (const sub of subtitles) {
          if (titleCounts[sub.title] > 1) {
            seenCounts[sub.title] = (seenCounts[sub.title] || 0) + 1;
            sub.title = `${sub.title} ${seenCounts[sub.title]}`;
          }
        }

        // Türkçe altyazıyı en başa (en üst sıraya) taşı, ardından İngilizce, ardından diğerleri
        subtitles.sort((a, b) => {
          const aIsTr = a.language === 'tr' || a.title.includes('Türkçe');
          const bIsTr = b.language === 'tr' || b.title.includes('Türkçe');
          if (aIsTr && !bIsTr) return -1;
          if (!aIsTr && bIsTr) return 1;

          const aIsEn = a.language === 'en' || a.title.includes('İngilizce');
          const bIsEn = b.language === 'en' || b.title.includes('İngilizce');
          if (aIsEn && !bIsEn) return -1;
          if (!aIsEn && bIsEn) return 1;

          return a.title.localeCompare(b.title);
        });
      }

      return {
        streamUrl,
        headers: {
          Referer: 'https://hdfilmcehennemi.mobi/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        subtitles,
        sourceName: sourceName || 'Kaynak 1',
      };
    }

    return null;
  } catch (err) {
    console.warn('extractDirectStream error:', err);
    return null;
  }
}

