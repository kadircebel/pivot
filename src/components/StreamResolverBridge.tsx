import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView as RNWebViewComponent } from 'react-native-webview';
import {
  ExtractedStream,
  SubtitleTrack,
  resolveSubtitleNameAndLanguage,
} from '../services/streamExtractor';

const WebView = RNWebViewComponent as any;

interface StreamResolverBridgeProps {
  embedUrl: string;
  refererUrl: string;
  sourceName?: string;
  onResolved: (stream: ExtractedStream) => void;
  onError: (errorMsg: string) => void;
}

const INJECTED_EXTRACTOR_JS = `
  (function() {
    window.open = function() { return null; };
    window.alert = function() {};
    window.confirm = function() { return true; };
    window.prompt = function() { return null; };

    var isResolved = false;

    function isStreamUrl(url) {
      if (!url || typeof url !== 'string') return false;
      var u = url.toLowerCase();
      return u.includes('.m3u8') || u.includes('.mp4') || u.includes('master.txt') || u.includes('.txt');
    }

    function postSuccess(streamUrl, rawTracks) {
      if (isResolved || !streamUrl) return;
      isResolved = true;

      var subtitles = [];
      try {
        if (Array.isArray(rawTracks)) {
          rawTracks.forEach(function(t, idx) {
            if (t.file && (t.kind === 'captions' || t.kind === 'subtitles' || !t.kind)) {
              var sUrl = t.file;
              if (sUrl.startsWith('//')) {
                sUrl = 'https:' + sUrl;
              } else if (sUrl.startsWith('/')) {
                sUrl = window.location.origin + sUrl;
              }
              subtitles.push({
                title: t.label || t.name || '',
                language: t.language || '',
                uri: sUrl,
                index: idx
              });
            }
          });
        }
      } catch (e) {}

      // URL temizliği
      var finalStream = streamUrl;
      if (finalStream.startsWith('//')) {
        finalStream = 'https:' + finalStream;
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: 'SUCCESS',
        streamUrl: finalStream,
        subtitles: subtitles
      }));
    }

    function checkSources() {
      if (isResolved) return;

      // 1. JWPlayer Playlist & Configs (player, videoplayer, index 0, window.player)
      try {
        if (typeof window.jwplayer === 'function') {
          var players = [
            window.player,
            window.jwplayer('videoplayer'),
            window.jwplayer('player'),
            window.jwplayer(0),
            window.jwplayer()
          ];

          for (var i = 0; i < players.length; i++) {
            var p = players[i];
            if (!p) continue;

            if (typeof p.getPlaylist === 'function') {
              var pl = p.getPlaylist();
              if (pl && pl[0] && isStreamUrl(pl[0].file)) {
                postSuccess(pl[0].file, pl[0].tracks);
                return;
              }
            }
            if (typeof p.getConfig === 'function') {
              var cfg = p.getConfig();
              if (cfg && isStreamUrl(cfg.file)) {
                postSuccess(cfg.file, cfg.tracks);
                return;
              }
              if (cfg && cfg.playlist && cfg.playlist[0] && isStreamUrl(cfg.playlist[0].file)) {
                postSuccess(cfg.playlist[0].file, cfg.playlist[0].tracks);
                return;
              }
            }
          }
        }
      } catch(e) {}

      // 2. Global rplayer / zk6iy / configs değişkenleri
      try {
        if (typeof window.zk6iy === 'string' && isStreamUrl(window.zk6iy)) {
          var tracks = (window.configs && window.configs.tracks) || [];
          postSuccess(window.zk6iy, tracks);
          return;
        }
        if (typeof window.configs === 'object' && window.configs && window.configs.sources) {
          var src = window.configs.sources[0]?.file;
          if (isStreamUrl(src)) {
            postSuccess(src, window.configs.tracks);
            return;
          }
        }
      } catch(e) {}

      // 3. Doğrudan video etiketi (HTML5 Video)
      try {
        var videoEl = document.querySelector('video');
        if (videoEl) {
          videoEl.muted = true;
          if (videoEl.src && isStreamUrl(videoEl.src)) {
            postSuccess(videoEl.src, []);
            return;
          }
          var srcEl = videoEl.querySelector('source');
          if (srcEl && srcEl.src && isStreamUrl(srcEl.src)) {
            postSuccess(srcEl.src, []);
            return;
          }
        }
      } catch(e) {}
    }

    // Periyodik kontrol
    var pollInterval = setInterval(checkSources, 200);

    // 8 saniye sonra DOM'da regex ile son bir arama yap, bulamazsa hata dön
    setTimeout(function() {
      clearInterval(pollInterval);
      if (!isResolved) {
        try {
          var html = document.documentElement.innerHTML;
          // .m3u8 veya master.txt ara
          var streamMatch = html.match(/https?:\\\\?\\\/\\\\?\\\/[^"'\\s<>]+(?:\\.m3u8|master\\.txt)[^"'\\s<>]*/i);
          if (streamMatch) {
            var cleanUrl = streamMatch[0].replace(/\\\\/g, '');
            postSuccess(cleanUrl, []);
            return;
          }
        } catch(e) {}

        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'TIMEOUT',
          message: 'Video akışı çözümlenemedi.'
        }));
      }
    }, 8500);
  })();
  true;
`;

export const StreamResolverBridge: React.FC<StreamResolverBridgeProps> = React.memo(
  ({ embedUrl, refererUrl, sourceName, onResolved, onError }) => {
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
      // Güvenlik zaman aşımı (12 saniye)
      timeoutRef.current = setTimeout(() => {
        onError('Kaynak bağlantısı zaman aşımına uğradı.');
      }, 12000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [onError]);

    const handleMessage = (event: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.status === 'SUCCESS' && data.streamUrl) {
          const rawSubtitles = data.subtitles || [];
          const subtitles: SubtitleTrack[] = [];
          const titleCounts: Record<string, number> = {};

          rawSubtitles.forEach((t: any, idx: number) => {
            const detected = resolveSubtitleNameAndLanguage(
              t.title || t.name || t.label || '',
              t.language || '',
              t.uri || t.file || '',
              idx
            );

            titleCounts[detected.title] =
              (titleCounts[detected.title] || 0) + 1;

            subtitles.push({
              title: detected.title,
              language: detected.language,
              uri: t.uri || t.file,
            });
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

          onResolved({
            streamUrl: data.streamUrl,
            headers: {
              Referer: embedUrl.startsWith('http') ? embedUrl : refererUrl,
              'User-Agent':
                'Mozilla/5.0 (Linux; Android 11; Television_1080p) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            subtitles,
            sourceName: sourceName || 'Kaynak',
          });
        } else {
          onError(data.message || 'Video kaynağı çözülemedi.');
        }
      } catch (err) {
        onError('Geçersiz veri yanıtı.');
      }
    };

    return (
      <View style={styles.hiddenContainer} pointerEvents="none">
        <WebView
          source={{
            uri: embedUrl,
            headers: {
              Referer: refererUrl,
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          }}
          injectedJavaScript={INJECTED_EXTRACTOR_JS}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          style={styles.hiddenWebView}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 320,
    height: 240,
    top: -3000,
    left: -3000,
    overflow: 'hidden',
  },
  hiddenWebView: {
    width: 320,
    height: 240,
  },
});
