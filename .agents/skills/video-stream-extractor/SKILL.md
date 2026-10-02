---
name: video-stream-extractor
description: >-
  Video embed oynatıcılardan reklamları temizleme, doğrudan m3u8/mp4 akış URL'si çıkarma ve ExoPlayer (react-native-video) entegrasyonu rehberi.
---

# Video Stream Extractor & Reklam Temizleme Kılavuzu

Bu kılavuz, film ve dizi sağlayıcılarının sunduğu iframe oynatıcılardaki reklam katmanlarını devre dışı bırakmayı ve doğrudan video stream (`.m3u8` / `.mp4`) URL'lerini elde etme yöntemlerini anlatır.

---

## 1. Reklam Temizleme Felsefesi

Web siteleri genellikle video üzerine ve etrafına kumandayla kapatılması imkansız reklam katmanları (`.money-wrapper`, `xpartner-ps.js`, tıklama tuzakları) yerleştirir.

**En Temiz ve Güvenli Yol**:
Iframe'i bir WebView'da kullanıcıya göstermek YERİNE, arka planda HTML/JS incelenerek doğrudan video kaynağının (`https://.../master.m3u8` veya `.mp4`) bulunup native video oynatıcıya (`react-native-video`) iletilmesidir. Böylece:
1. Hiçbir reklam kodu çalışmaz.
2. Hiçbir açılır pencere (pop-up) açılmaz.
3. Donanım hızlandırmalı video akışı en düşük RAM ve CPU kullanımıyla gerçekleşir.

---

## 2. Yaygın Embed Oynatıcı Tipleri ve Çıkarım Yöntemleri

### 2.1. Rapidrame / Close Player
- **Iframe URL**: `https://hdfilmcehennemi.mobi/video/embed/{id}/?rapidrame_id={rapidrame_id}`
- **Çıkarım Yöntemi**:
  1. Iframe URL'ine HTTP GET isteği gönderilir (`Referer: https://www.hdfilmcehennemi.nl/`).
  2. Dönen kaynak kodunda `<script>` bloğundaki video yapılandırma nesnesi aranır (genellikle `sources: [...]` veya `file: "https://...master.m3u8"`).
  3. Base64 veya rot13/packer ile şifrelenmişse `eval` yerine AST parser ile regex deseni çözülür.

### 2.2. VidMoly / StreamSB
- `sources: [{ file: "https://.../master.m3u8", type: "hls" }]` deseni regex ile ayıklanır:
  ```typescript
  const m3u8Regex = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g;
  const match = html.match(m3u8Regex);
  ```

---

## 3. Gerekli HTTP Başlıkları (Headers)

Birçok CDN video sunucusu (Cloudflare, BunnyCDN, vb.) `Referer` veya `Origin` başlığı olmadan 403 Forbidden döndürür. Bu nedenle `react-native-video` bileşenine özel başlıklar tanımlanmalıdır:

```tsx
<Video
  source={{
    uri: streamResult.streamUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Next-Start-4K-Box) AppleWebKit/537.36',
      'Referer': streamResult.referer || 'https://hdfilmcehennemi.mobi/',
    },
  }}
  style={styles.fullScreenVideo}
  resizeMode="contain"
  controls={false} // TV için özel D-Pad kumanda kontrolleri kullanılır
/>
```

---

## 4. Altyazı ve Dublaj Seçenekleri

- Iframe kaynağında `tracks: [{ kind: 'captions', file: '...', label: 'Türkçe' }]` yapısı parse edilerek oynatıcı menüsüne eklenir.
- Dual ses kanallarında (Türkçe Dublaj / Orijinal Dil) HLS audio stream track seçimi ExoPlayer üzerinden yönetilir (`selectedAudioTrack`).
