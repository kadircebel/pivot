import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useTVEventHandler,
  View,
} from 'react-native';
import Video, {
  SelectedTrack,
  SelectedTrackType,
  TextTrackType,
} from 'react-native-video';
import { VideoSourceOption } from '../core/interfaces/IMovieSourceProvider';
import {
  ExtractedStream,
  formatTime,
  SubtitleCue,
  SubtitleTrack,
  parseVtt,
  resolveSubtitleNameAndLanguage,
} from '../services/streamExtractor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_RATIO = SCREEN_WIDTH / SCREEN_HEIGHT;

interface SubtitleItem {
  index: number;
  title: string;
  language?: string;
  uri?: string;
}

interface TVVideoPlayerProps {
  movieTitle: string;
  stream: ExtractedStream;
  sources: VideoSourceOption[];
  currentSourceIndex: number;
  onClose: () => void;
  onSwitchSource: (source: VideoSourceOption, index: number) => void;
}

type AspectRatioMode = 'contain' | 'cover' | 'stretch';
type DrawerType = 'audio' | 'subtitle' | 'sources' | 'aspect' | null;

interface TVControlButtonProps {
  id?: string;
  title: string;
  icon?: string;
  active?: boolean;
  hasPreferredFocus?: boolean;
  buttonRef?: React.Ref<any>;
  onFocusCallback?: () => void;
  onPress: () => void;
}

/**
 * Siyah-Beyaz IPTV Alt Bar Kontrol Butonu
 */
const TVControlButton: React.FC<TVControlButtonProps> = React.memo(
  ({
    title,
    icon,
    active,
    hasPreferredFocus,
    buttonRef,
    onFocusCallback,
    onPress,
  }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setFocused(true);
      Animated.timing(scaleAnim, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }).start();
      onFocusCallback?.();
    }, [scaleAnim, onFocusCallback]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    return (
      <Pressable
        ref={buttonRef}
        focusable={true}
        hasTVPreferredFocus={hasPreferredFocus}
        android_disableSound={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={onPress}
        style={styles.controlButtonWrapper}
      >
        <Animated.View
          style={[
            styles.controlButton,
            focused ? styles.controlButtonFocused : styles.controlButtonNormal,
            active && !focused && styles.controlButtonActive,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {icon ? (
            <Text
              style={[
                styles.controlButtonIcon,
                focused && styles.controlButtonTextFocused,
              ]}
            >
              {icon}
            </Text>
          ) : null}
          <Text
            style={[
              styles.controlButtonText,
              focused && styles.controlButtonTextFocused,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }
);

interface DrawerItemProps {
  title: string;
  subtitle?: string;
  active?: boolean;
  hasPreferredFocus?: boolean;
  onPress: () => void;
}

/**
 * Siyah-Beyaz IPTV Yandan Açılır Menü (Side Drawer) Elemanı
 */
const DrawerItem: React.FC<DrawerItemProps> = React.memo(
  ({ title, subtitle, active, hasPreferredFocus, onPress }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setFocused(true);
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    return (
      <Pressable
        focusable={true}
        hasTVPreferredFocus={hasPreferredFocus}
        android_disableSound={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={onPress}
        style={styles.drawerItemWrapper}
      >
        <Animated.View
          style={[
            styles.drawerItem,
            focused ? styles.drawerItemFocused : styles.drawerItemNormal,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.drawerItemLeft}>
            <Text
              style={[
                styles.drawerItemTitle,
                focused && styles.drawerItemTextFocused,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.drawerItemSubtitle,
                  focused && styles.drawerItemSubtitleFocused,
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {active && (
            <View
              style={[
                styles.activeBadge,
                focused && styles.activeBadgeFocused,
              ]}
            >
              <Text
                style={[
                  styles.activeBadgeText,
                  focused && styles.activeBadgeTextFocused,
                ]}
              >
                ● Aktif
              </Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  }
);

export const TVVideoPlayer: React.FC<TVVideoPlayerProps> = ({
  movieTitle,
  stream,
  sources,
  currentSourceIndex,
  onClose,
  onSwitchSource,
}) => {
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // En-boy görüntü oranı: Varsayılan 16:9 Tam Ekran 'cover'
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('cover');
  // Video doğal boyutları (SurfaceView layout hesaplaması için)
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Kontrol paneli görünürlüğü (ilk açılışta açık gelir, 4 sn sonra video oynarken gizlenir)
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Hızlı HUD bildirim gösterimi (Play, Pause, +10s, -10s vb.)
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const hudTimeoutRef = useRef<any>(null);
  const hudAnim = useRef(new Animated.Value(0)).current;

  // Siyah-Beyaz Yandan Açılır Menü (Side Drawer) Durumu
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const drawerAnim = useRef(new Animated.Value(420)).current;

  // Odak yönetimi (Çekmece kapandığında açan butona veya oynatıcıya anında odak dönmesi)
  const [preferredFocusKey, setPreferredFocusKey] = useState<string>('play');
  const [focusEpoch, setFocusEpoch] = useState<number>(0);
  const lastOpenedDrawerRef = useRef<DrawerType>(null);

  // Akıllı ve debounced sarma (seek) yönetimi (Hızlı kumanda tıklamalarında tamponun çökmesini ve ses cızırtısını önler)
  const pendingSeekTargetRef = useRef<number | null>(null);
  const seekDebounceTimeoutRef = useRef<any>(null);
  const accumulatedSeekDeltaRef = useRef<number>(0);

  const controlRefs = {
    seekBack: useRef<any>(null),
    play: useRef<any>(null),
    seekForward: useRef<any>(null),
    audio: useRef<any>(null),
    subtitle: useRef<any>(null),
    aspect: useRef<any>(null),
    sources: useRef<any>(null),
  };

  // Ses / Dublaj Kanalları
  const [availableAudio, setAvailableAudio] = useState<
    { index: number; title: string; language: string }[]
  >([]);
  const [selectedAudio, setSelectedAudio] = useState<SelectedTrack>({
    type: SelectedTrackType.SYSTEM,
  });
  const [activeAudioLabel, setActiveAudioLabel] = useState('Ses: Varsayılan');

  // Altyazı Kanalları ve Yerel Gösterim State'leri
  const [availableSubs, setAvailableSubs] = useState<SubtitleItem[]>(() => {
    if (stream.subtitles && stream.subtitles.length > 0) {
      const items: SubtitleItem[] = stream.subtitles.map((s, idx) => {
        let title = s.title;
        let lang = s.language || '';
        if (
          !title ||
          title.startsWith('Altyazı') ||
          title.startsWith('Track') ||
          title === 'Türkçe' ||
          title === 'English'
        ) {
          const detected = resolveSubtitleNameAndLanguage(
            s.title || '',
            s.language || '',
            s.uri || '',
            idx
          );
          title = detected.title;
          lang = detected.language;
        }
        return {
          index: idx,
          title,
          language: lang,
          uri: s.uri,
        };
      });

      // Türkçe altyazıları daima en üste al, ardından İngilizce, ardından diğerleri
      items.sort((a, b) => {
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

      return items;
    }
    return [];
  });
  const [selectedSubItem, setSelectedSubItem] = useState<SubtitleItem | null>(null);
  const [activeSubLabel, setActiveSubLabel] = useState('Altyazı: Kapalı');
  const [currentCueText, setCurrentCueText] = useState<string | null>(null);
  const activeCuesRef = useRef<SubtitleCue[]>([]);
  const lastCueTextRef = useRef<string | null>(null);

  const videoRef = useRef<any>(null);

  // Kontrolleri göster ve video oynuyorsa 4 sn sonra gizle
  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Sadece video oynarken otomatik gizle; duraklatılmışsa kontroller açık kalır
    if (!paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
  }, [paused]);

  // Sadece ilk açılışta kontrolleri göster ve bileşen kapandığında zamanlayıcıları temizle
  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      if (seekDebounceTimeoutRef.current) clearTimeout(seekDebounceTimeoutRef.current);
    };
  }, []);

  // Hızlı HUD bildirimi göster (Ör: ⏸ Duraklatıldı, ▶ Oynatılıyor)
  const triggerHud = useCallback(
    (text: string) => {
      if (hudTimeoutRef.current) {
        clearTimeout(hudTimeoutRef.current);
        hudTimeoutRef.current = null;
      }
      setHudMessage(text);
      Animated.timing(hudAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      hudTimeoutRef.current = setTimeout(() => {
        Animated.timing(hudAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setHudMessage(null);
          hudTimeoutRef.current = null;
        });
      }, 1200);
    },
    [hudAnim]
  );

  // Yandan açılır menüyü aç
  const openDrawer = useCallback(
    (type: DrawerType) => {
      lastOpenedDrawerRef.current = type;
      if (type) {
        setPreferredFocusKey(type);
      }
      setDrawerType(type);
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setControlsVisible(true);
    },
    [drawerAnim]
  );

  // Yandan açılır menüyü kapat ve odağı açan butona anında geri ver
  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      const returnTarget = lastOpenedDrawerRef.current || 'play';
      setDrawerType(null);
      setPreferredFocusKey(returnTarget);
      setFocusEpoch((prev) => prev + 1);
      showControlsTemporarily();

      setTimeout(() => {
        const refObj = (controlRefs as any)[returnTarget] || controlRefs.play;
        refObj?.current?.requestTVFocus?.();
        refObj?.current?.focus?.();
      }, 50);
    });
  }, [drawerAnim, showControlsTemporarily, controlRefs]);

  // Oynat / Duraklat Değiştir (IPTV Davranışı)
  const togglePlayPause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      triggerHud(next ? '⏸ Duraklatıldı' : '▶ Oynatılıyor');
      if (next) {
        // Duraklatıldı: Alt çubuğu açık tut, kullanıcı süreyi ve butonları görsün
        setControlsVisible(true);
        setPreferredFocusKey('play');
        setFocusEpoch((e) => e + 1);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      } else {
        // Devam ediyor: 3 saniye sonra kontrolleri gizle
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      }
      return next;
    });
  }, [triggerHud]);

  // Donanımsal Geri Tuşu Yönetimi
  useEffect(() => {
    const handleBack = () => {
      if (drawerType) {
        closeDrawer();
        return true;
      }
      if (controlsVisible) {
        setControlsVisible(false);
        return true;
      }
      onClose();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [drawerType, controlsVisible, closeDrawer, onClose]);

  // Akıllı ve debounced sarma (seek) işlemi
  const handleSeek = useCallback(
    (seconds: number) => {
      const baseTime =
        pendingSeekTargetRef.current !== null
          ? pendingSeekTargetRef.current
          : currentTime;
      const target = Math.max(0, Math.min(duration, baseTime + seconds));
      pendingSeekTargetRef.current = target;
      accumulatedSeekDeltaRef.current += seconds;

      // Kullanıcı arayüzünü ve süreyi anında güncelle (sıfır gecikme ile görsel tepki)
      setCurrentTime(target);

      // Altyazıyı da yeni zamana anında senkronize et
      if (activeCuesRef.current.length > 0) {
        const cue = activeCuesRef.current.find(
          (c) => target >= c.start && target <= c.end
        );
        const nextText = cue ? cue.text : null;
        if (nextText !== lastCueTextRef.current) {
          lastCueTextRef.current = nextText;
          setCurrentCueText(nextText);
        }
      }

      // Birikimli HUD bildirim metni: ör. "+20 sn ⏩", "+30 sn ⏩"
      const totalDelta = accumulatedSeekDeltaRef.current;
      if (totalDelta > 0) {
        triggerHud(`+${totalDelta} sn ⏩`);
      } else if (totalDelta < 0) {
        triggerHud(`⏪ ${totalDelta} sn`);
      }

      showControlsTemporarily();

      // ExoPlayer'a gidecek seek çağrısını 350ms geciktir (debounce)
      // Arka arkaya hızlı tıklamalarda tampon defalarca sıfırlanıp ses donanımını çökertmez
      if (seekDebounceTimeoutRef.current) {
        clearTimeout(seekDebounceTimeoutRef.current);
      }
      seekDebounceTimeoutRef.current = setTimeout(() => {
        const finalTarget = pendingSeekTargetRef.current;
        pendingSeekTargetRef.current = null;
        accumulatedSeekDeltaRef.current = 0;
        if (finalTarget !== null) {
          videoRef.current?.seek(finalTarget);
        }
      }, 350);
    },
    [currentTime, duration, showControlsTemporarily, triggerHud]
  );

  // TV Kumandası D-Pad Olayları (Standart IPTV Remote Davranışı)
  const handleTVRemoteEvent = useCallback(
    (evt: any) => {
      if (evt?.eventKeyAction !== undefined && evt.eventKeyAction !== 0) {
        return;
      }

      const eventType = evt?.eventType;

      // Çekmece açıkken: Sol veya Geri tuşuna basıldığında çekmeceyi kapat
      if (drawerType) {
        if (eventType === 'left') {
          closeDrawer();
          return;
        }
        return;
      }

      // Standart IPTV kuralı:
      // Çekmece açık değilken ve kontroller kapalıyken OK tuşuna basıldığında DOĞRUDAN PLAY / PAUSE yap!
      if (!controlsVisible) {
        if (eventType === 'select') {
          togglePlayPause();
          return;
        }
        if (eventType === 'playPause') {
          togglePlayPause();
          return;
        }
        if (eventType === 'left') {
          // 10 sn geri sar
          handleSeek(-10);
          return;
        }
        if (eventType === 'right') {
          // 10 sn ileri sar
          handleSeek(10);
          return;
        }
        if (eventType === 'up' || eventType === 'down') {
          showControlsTemporarily();
          return;
        }
      } else {
        // Kontroller ekrandayken:
        if (eventType === 'playPause') {
          togglePlayPause();
          return;
        }
        showControlsTemporarily();
      }
    },
    [
      drawerType,
      controlsVisible,
      closeDrawer,
      togglePlayPause,
      handleSeek,
      showControlsTemporarily,
    ]
  );

  useTVEventHandler(handleTVRemoteEvent);

  // Video Yüklendiğinde
  const handleLoad = useCallback(
    (data: any) => {
      setDuration(data.duration || 0);
      setBuffering(false);

      // Video doğal boyutlarını algıla ve boyut state'ine ata
      if (data?.naturalSize && data.naturalSize.width > 0 && data.naturalSize.height > 0) {
        setVideoDimensions({
          width: data.naturalSize.width,
          height: data.naturalSize.height,
        });
      }

      if (data.audioTracks && Array.isArray(data.audioTracks)) {
        const total = data.audioTracks.length;
        const tracks = data.audioTracks.map((t: any, idx: number) => {
          let title = t.title || t.name || '';
          const lang = (t.language || '').toLowerCase();

          // Ses parçası isimlerini kullanıcı dostu Türkçeleştir
          if (
            !title ||
            title.startsWith('Ses Parçası') ||
            title.startsWith('Track') ||
            title.startsWith('Audio')
          ) {
            if (lang.includes('tr') || lang.includes('tur')) {
              title = 'Türkçe Dublaj';
            } else if (lang.includes('en') || lang.includes('eng')) {
              title = 'Orijinal Ses (İngilizce)';
            } else if (total > 1) {
              if (idx === 0) title = 'Türkçe Dublaj';
              else if (idx === 1) title = 'Orijinal Ses (İngilizce)';
              else title = `Ses Parçası ${idx + 1}`;
            } else {
              title = 'Varsayılan Ses (Türkçe / Orijinal)';
            }
          }

          return {
            index: t.index !== undefined ? t.index : idx,
            title,
            language: t.language || (idx === 0 ? 'tr' : 'en'),
          };
        });
        setAvailableAudio(tracks);

        // Öncelikli olarak Türkçe Dublaj ses kanalını etiketle
        // NOT: Başlangıçta zorla track değiştirmek AudioTrack tamponunu sıfırlayıp cızırtı oluşturur.
        // ExoPlayer'ın varsayılan seçtiği kanalı bozmadan etiketliyoruz; kullanıcı isterse menüden değiştirebilir.
        const trTrack = tracks.find(
          (t: any) =>
            t.title.includes('Türkçe') ||
            t.language.toLowerCase().includes('tr')
        );
        if (trTrack) {
          setActiveAudioLabel(trTrack.title);
        } else if (tracks.length > 0) {
          setActiveAudioLabel(tracks[0].title);
        }
      }

      // stream.subtitles yoksa ve data.textTracks varsa altyazıları oradan çek
      if (
        (!stream.subtitles || stream.subtitles.length === 0) &&
        data.textTracks &&
        Array.isArray(data.textTracks) &&
        data.textTracks.length > 0
      ) {
        const loadedTracks: SubtitleItem[] = data.textTracks.map(
          (t: any, idx: number) => ({
            index: t.index !== undefined ? t.index : idx,
            title:
              t.title ||
              t.name ||
              (t.language ? t.language.toUpperCase() : `Altyazı ${idx + 1}`),
            language: t.language || '',
          })
        );
        setAvailableSubs(loadedTracks);
      }
    },
    [stream.subtitles]
  );

  const handleTextTracks = useCallback(
    (data: any) => {
      // Eğer stream.subtitles zaten mevcutsa ExoPlayer'ın geçici track verileriyle ezmeyelim
      if (stream.subtitles && stream.subtitles.length > 0) return;

      const raw = data?.textTracks;
      if (Array.isArray(raw) && raw.length > 0) {
        const tracks: SubtitleItem[] = raw.map((t: any, idx: number) => ({
          index: t.index !== undefined ? t.index : idx,
          title:
            t.title ||
            t.name ||
            (t.language ? t.language.toUpperCase() : `Altyazı ${idx + 1}`),
          language: t.language || '',
        }));
        setAvailableSubs(tracks);
      }
    },
    [stream.subtitles]
  );

  const handleProgress = useCallback((data: any) => {
    // Sarma (seek) işlemi sürerken ExoPlayer'ın eski zaman bildirimini yok say
    if (pendingSeekTargetRef.current !== null) {
      return;
    }
    const time = data.currentTime;
    setCurrentTime(time);

    // Altyazı senkronizasyonu: Yalnızca altyazı metni değiştiğinde re-render tetikle
    if (activeCuesRef.current.length > 0) {
      const cue = activeCuesRef.current.find(
        (c) => time >= c.start && time <= c.end
      );
      const nextText = cue ? cue.text : null;
      if (nextText !== lastCueTextRef.current) {
        lastCueTextRef.current = nextText;
        setCurrentCueText(nextText);
      }
    } else if (lastCueTextRef.current !== null) {
      lastCueTextRef.current = null;
      setCurrentCueText(null);
    }
  }, []);

  // Ses Seçimi
  const handleSelectAudio = useCallback(
    (track: { index: number; title: string; language: string }) => {
      setSelectedAudio({ type: SelectedTrackType.INDEX, value: track.index });
      setActiveAudioLabel(track.title);
      closeDrawer();
      triggerHud(`🎧 ${track.title}`);
    },
    [closeDrawer, triggerHud]
  );

  // Altyazı Ağdan İndirip Ayrıştırma (Native Subtitle Engine)
  const loadSubtitles = useCallback(
    async (sub: SubtitleItem) => {
      if (!sub.uri) {
        activeCuesRef.current = [];
        lastCueTextRef.current = null;
        setCurrentCueText(null);
        return;
      }
      try {
        const subReferer =
          stream.headers?.Referer ||
          (stream.streamUrl.includes('mobi')
            ? 'https://hdfilmcehennemi.mobi/'
            : 'https://www.hdfilmcehennemi.nl/');
        let res = await fetch(sub.uri, {
          headers: {
            Referer: subReferer,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (!res.ok) {
          const altReferer = subReferer.includes('mobi')
            ? 'https://www.hdfilmcehennemi.nl/'
            : 'https://hdfilmcehennemi.mobi/';
          res = await fetch(sub.uri, {
            headers: {
              Referer: altReferer,
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
        }
        if (res.ok) {
          const text = await res.text();
          const cues = parseVtt(text);
          activeCuesRef.current = cues;
          const current = cues.find(
            (c) => currentTime >= c.start && currentTime <= c.end
          );
          if (current) {
            lastCueTextRef.current = current.text;
            setCurrentCueText(current.text);
          }
        }
      } catch (err) {
        console.warn('Altyazı indirme hatası:', err);
      }
    },
    [currentTime, stream.headers, stream.streamUrl]
  );

  // Altyazı Seçimi
  const handleSelectSubtitle = useCallback(
    (sub: SubtitleItem | null) => {
      if (!sub) {
        setSelectedSubItem(null);
        activeCuesRef.current = [];
        lastCueTextRef.current = null;
        setCurrentCueText(null);
        setActiveSubLabel('Altyazı: Kapalı');
        triggerHud('💬 Altyazı Kapatıldı');
      } else {
        setSelectedSubItem(sub);
        setActiveSubLabel(sub.title);
        triggerHud(`💬 ${sub.title}`);
        loadSubtitles(sub);
      }
      closeDrawer();
    },
    [closeDrawer, loadSubtitles, triggerHud]
  );

  // Görüntü Oranı Seçimi
  const handleSelectAspectRatio = useCallback(
    (mode: AspectRatioMode) => {
      setAspectRatio(mode);
      closeDrawer();
      const labels = {
        cover: '16:9 Tam Ekran (Doldur)',
        stretch: '16:9 Ekranı Kapla (Uzat)',
        contain: 'Orijinal Sinemaskop (Sığdır)',
      };
      triggerHud(`🔲 ${labels[mode]}`);
    },
    [closeDrawer, triggerHud]
  );

  const progressRatio = duration > 0 ? (currentTime / duration) * 100 : 0;

  // HLS veya TXT format tespiti
  const isHls =
    stream.streamUrl.includes('.m3u8') ||
    stream.streamUrl.includes('.txt') ||
    stream.streamUrl.includes('m3u8') ||
    stream.streamUrl.includes('/hls/');

  // 2GB RAM bütçeli Amlogic TV işlemcisi için optimize tamponlama
  // backBufferDurationMs: 0 yapılarak BufferPool2.0 bellek şişmesi ve AudioTrack cihaz duraklaması (tık sesi) kesinlikle önlenir
  const videoBufferConfig = useMemo(
    () => ({
      minBufferMs: 15000,
      maxBufferMs: 45000,
      bufferForPlaybackMs: 2500,
      bufferForPlaybackAfterRebufferMs: 5000,
      backBufferDurationMs: 0,
    }),
    []
  );

  // Video nesnelerini useMemo ile sabitle; menü etkileşimlerinde veya re-render'larda
  // ExoPlayer'ın tamponu sıfırlamasını ve seste "tık tık cızırtı" oluşmasını kesin olarak önle
  const videoSource = useMemo(
    () => ({
      uri: stream.streamUrl,
      headers: stream.headers,
      type: isHls ? ('m3u8' as const) : undefined,
    }),
    [stream.streamUrl, stream.headers, isHls]
  );

  const handleBuffer = useCallback(
    ({ isBuffering }: { isBuffering: boolean }) => {
      setBuffering(isBuffering);
    },
    []
  );

  const handleError = useCallback((e: any) => {
    console.warn('ExoPlayer error:', e);
    setErrorMsg('Video akışı oynatılırken bir sorun oluştu.');
  }, []);

  // Doğrudan piksel boyutlandırma ile en-boy oranı (SurfaceView / Media3 kısıtlamalarını %100 çözer)
  const videoStyle = useMemo(() => {
    // 1. 16:9 Ekranı Kapla (Uzat): 16:9 ekranın tamamına esnetilir, kenarlar kesilmez, sıfır siyah bar
    if (aspectRatio === 'stretch') {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      };
    }

    // 2. 16:9 Tam Ekran (Doldur): Siyah barları tamamen yok eder, 16:9 ekrana orantılı olarak tam doldurur
    if (aspectRatio === 'cover') {
      const vRatio = videoDimensions.width / videoDimensions.height;
      if (vRatio > SCREEN_RATIO + 0.02) {
        // Geniş ekran sinemaskop video (örn. 2.15:1 veya 2.39:1):
        // Ekran yüksekliğine tam sığdır, genişliği artır ve yatayda ortala
        const targetWidth = Math.round(SCREEN_HEIGHT * vRatio);
        const horizontalOverflow = Math.round((targetWidth - SCREEN_WIDTH) / 2);
        return {
          position: 'absolute' as const,
          top: 0,
          left: -horizontalOverflow,
          width: targetWidth,
          height: SCREEN_HEIGHT,
        };
      } else if (vRatio < SCREEN_RATIO - 0.02) {
        // 4:3 video: Ekran genişliğine tam sığdır, yüksekliği artır ve dikeyde ortala
        const targetHeight = Math.round(SCREEN_WIDTH / vRatio);
        const verticalOverflow = Math.round((targetHeight - SCREEN_HEIGHT) / 2);
        return {
          position: 'absolute' as const,
          top: -verticalOverflow,
          left: 0,
          width: SCREEN_WIDTH,
          height: targetHeight,
        };
      }
    }

    // 3. Orijinal Sinemaskop (Sığdır): Orijinal en-boy oranını korur
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    };
  }, [aspectRatio, videoDimensions]);

  return (
    <View style={styles.container}>
      {/* 16:9 Video Motoru Konteynırı */}
      <View style={styles.videoWrapper} pointerEvents="none">
        <Video
          ref={videoRef}
          source={videoSource}
          style={videoStyle}
          resizeMode={
            aspectRatio === 'cover'
              ? 'cover'
              : aspectRatio === 'stretch'
              ? 'stretch'
              : 'contain'
          }
          paused={paused}
          focusable={false}
          volume={1.0}
          muted={false}
          onLoad={handleLoad}
          onTextTracks={handleTextTracks}
          onProgress={handleProgress}
          progressUpdateInterval={1000}
          bufferConfig={videoBufferConfig}
          preventsDisplaySleepDuringVideoPlayback={true}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          mixWithOthers="mix"
          disableFocus={true}
          onBuffer={handleBuffer}
          onError={handleError}
          selectedAudioTrack={selectedAudio}
        />
      </View>

      {/* 100% Güvenilir Yerel Altyazı Gösterimi (Native Subtitle Engine) */}
      {currentCueText ? (
        <View
          style={[
            styles.subtitleContainer,
            controlsVisible && styles.subtitleContainerControlsVisible,
          ]}
          pointerEvents="none"
        >
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitleText}>{currentCueText}</Text>
          </View>
        </View>
      ) : null}

      {/* Arka plan odak ve tıklama yakalayıcı: Kontroller gizliyken TV Kumanda OK tuşu anında Play/Pause yapar */}
      <Pressable
        focusable={!drawerType}
        hasTVPreferredFocus={!controlsVisible && !drawerType}
        android_disableSound={true}
        onPress={togglePlayPause}
        style={styles.backgroundFocusCatcher}
      />

      {/* Yükleniyor Göstergesi */}
      {buffering && (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      {/* Hızlı HUD Bildirimi (10s İleri/Geri, Oynat/Duraklat vb.) */}
      {hudMessage && (
        <Animated.View
          style={[styles.hudOverlay, { opacity: hudAnim }]}
          pointerEvents="none"
        >
          <Text style={styles.hudText}>{hudMessage}</Text>
        </Animated.View>
      )}

      {/* Oynatma Hatası Katmanı */}
      {errorMsg && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>⚠ Oynatma Hatası</Text>
          <Text style={styles.errorDescription}>{errorMsg}</Text>
          <View style={styles.errorButtonsRow}>
            {sources.length > 1 && (
              <TVControlButton
                title="Diğer Kaynağa Geç"
                hasPreferredFocus={true}
                onPress={() => {
                  setErrorMsg(null);
                  const nextIdx = (currentSourceIndex + 1) % sources.length;
                  onSwitchSource(sources[nextIdx], nextIdx);
                }}
              />
            )}
            <TVControlButton title="Kapat ve Çık" onPress={onClose} />
          </View>
        </View>
      )}

      {/* Siyah-Beyaz IPTV Kontrol Arayüzü (Overlay) */}
      {controlsVisible && !errorMsg && (
        <View style={styles.controlsOverlay} pointerEvents="box-none">
          {/* Üst Bar: Başlık, Kaynak ve Geri */}
          <View style={styles.topControlBar}>
            <Pressable
              focusable={true}
              android_disableSound={true}
              onPress={onClose}
              style={({ focused }) => [
                styles.backButton,
                focused && styles.backButtonFocused,
              ]}
            >
              <Text style={styles.backButtonText}>‹ Geri Dön</Text>
            </Pressable>
            <Text style={styles.videoTitleText} numberOfLines={1}>
              {movieTitle}
            </Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {stream.sourceName || `Kaynak ${currentSourceIndex + 1}`}
              </Text>
            </View>
          </View>

          {/* Alt Bar: Scrubber Bar ve Siyah-Beyaz Kontrol Butonları */}
          <View style={styles.bottomControlBar}>
            {/* Süre İlerleme Çubuğu */}
            <View style={styles.progressRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFilled,
                    { width: `${progressRatio}%` },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Kontrol Butonları Satırı */}
            <View style={styles.buttonsRow}>
              <TVControlButton
                key={`btn-seek-back-${focusEpoch}`}
                id="seek-back"
                buttonRef={controlRefs.seekBack}
                title="-10s"
                icon="⏪"
                hasPreferredFocus={preferredFocusKey === 'seek-back'}
                onFocusCallback={() => setPreferredFocusKey('seek-back')}
                onPress={() => handleSeek(-10)}
              />
              <TVControlButton
                key={`btn-play-${focusEpoch}`}
                id="play"
                buttonRef={controlRefs.play}
                title={paused ? 'Oynat' : 'Duraklat'}
                icon={paused ? '▶' : '⏸'}
                hasPreferredFocus={preferredFocusKey === 'play'}
                onFocusCallback={() => setPreferredFocusKey('play')}
                onPress={togglePlayPause}
              />
              <TVControlButton
                key={`btn-seek-forward-${focusEpoch}`}
                id="seek-forward"
                buttonRef={controlRefs.seekForward}
                title="+10s"
                icon="⏩"
                hasPreferredFocus={preferredFocusKey === 'seek-forward'}
                onFocusCallback={() => setPreferredFocusKey('seek-forward')}
                onPress={() => handleSeek(10)}
              />

              {/* Ses / Dublaj Butonu */}
              <TVControlButton
                key={`btn-audio-${focusEpoch}`}
                id="audio"
                buttonRef={controlRefs.audio}
                title={activeAudioLabel}
                icon="🎧"
                hasPreferredFocus={preferredFocusKey === 'audio'}
                onFocusCallback={() => setPreferredFocusKey('audio')}
                onPress={() => openDrawer('audio')}
              />

              {/* Altyazı Butonu */}
              <TVControlButton
                key={`btn-subtitle-${focusEpoch}`}
                id="subtitle"
                buttonRef={controlRefs.subtitle}
                title={activeSubLabel}
                icon="💬"
                hasPreferredFocus={preferredFocusKey === 'subtitle'}
                onFocusCallback={() => setPreferredFocusKey('subtitle')}
                onPress={() => openDrawer('subtitle')}
              />

              {/* Görüntü Oranı Butonu (16:9) */}
              <TVControlButton
                key={`btn-aspect-${focusEpoch}`}
                id="aspect"
                buttonRef={controlRefs.aspect}
                title={
                  aspectRatio === 'cover'
                    ? '16:9 Doldur'
                    : aspectRatio === 'stretch'
                    ? '16:9 Uzat'
                    : '16:9 Sığdır'
                }
                icon="🔲"
                hasPreferredFocus={preferredFocusKey === 'aspect'}
                onFocusCallback={() => setPreferredFocusKey('aspect')}
                onPress={() => openDrawer('aspect')}
              />

              {/* Kaynak Değiştirme Butonu */}
              {sources.length > 1 && (
                <TVControlButton
                  key={`btn-sources-${focusEpoch}`}
                  id="sources"
                  buttonRef={controlRefs.sources}
                  title={`Kaynaklar (${currentSourceIndex + 1}/${sources.length})`}
                  icon="🔄"
                  hasPreferredFocus={preferredFocusKey === 'sources'}
                  onFocusCallback={() => setPreferredFocusKey('sources')}
                  onPress={() => openDrawer('sources')}
                />
              )}
            </View>
          </View>
        </View>
      )}

      {/* SİYAH-BEYAZ YANDAN AÇILIR MENÜ (RIGHT SIDE DRAWER) */}
      {drawerType && (
        <Animated.View
          style={[
            styles.sideDrawer,
            { transform: [{ translateX: drawerAnim }] },
          ]}
        >
          {/* Çekmece Başlığı */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>
              {drawerType === 'audio' && '🎧 SES VE DUBLAJ'}
              {drawerType === 'subtitle' && '💬 ALTYAZI SEÇENEKLERİ'}
              {drawerType === 'aspect' && '🔲 GÖRÜNTÜ ORANI'}
              {drawerType === 'sources' && '🔄 VİDEO KAYNAKLARI'}
            </Text>
            <Text style={styles.drawerSubtitle} numberOfLines={1}>
              {movieTitle}
            </Text>
          </View>

          {/* Çekmece İçerik Listesi */}
          <ScrollView
            style={styles.drawerScrollView}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* 1. Ses / Dublaj Seçenekleri */}
            {drawerType === 'audio' && (
              <>
                {availableAudio.length > 0 ? (
                  availableAudio.map((track, idx) => (
                    <DrawerItem
                      key={`audio-${track.index}`}
                      title={track.title}
                      subtitle={track.language ? `Dil: ${track.language.toUpperCase()}` : undefined}
                      active={activeAudioLabel === track.title}
                      hasPreferredFocus={idx === 0}
                      onPress={() => handleSelectAudio(track)}
                    />
                  ))
                ) : (
                  <View style={styles.drawerEmptyBox}>
                    <Text style={styles.drawerEmptyText}>
                      Bu kaynakta tek bir ses kanalı mevcut.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* 2. Altyazı Seçenekleri */}
            {drawerType === 'subtitle' && (
              <>
                <DrawerItem
                  title="Altyazıyı Kapat"
                  subtitle="Altyazısız izle"
                  active={!selectedSubItem}
                  hasPreferredFocus={!selectedSubItem}
                  onPress={() => handleSelectSubtitle(null)}
                />
                {availableSubs.map((sub, idx) => (
                  <DrawerItem
                    key={`sub-${sub.index}-${idx}`}
                    title={sub.title}
                    subtitle={sub.language ? `Dil: ${sub.language.toUpperCase()}` : undefined}
                    active={selectedSubItem?.index === sub.index}
                    hasPreferredFocus={selectedSubItem?.index === sub.index}
                    onPress={() => handleSelectSubtitle(sub)}
                  />
                ))}
              </>
            )}

            {/* 3. Görüntü Oranı Seçenekleri */}
            {drawerType === 'aspect' && (
              <>
                <DrawerItem
                  title="16:9 Tam Ekran (Doldur)"
                  subtitle="Siyah barları yok eder, ekranı doldurur (Varsayılan)"
                  active={aspectRatio === 'cover'}
                  hasPreferredFocus={aspectRatio === 'cover'}
                  onPress={() => handleSelectAspectRatio('cover')}
                />
                <DrawerItem
                  title="16:9 Ekranı Kapla (Uzat)"
                  subtitle="Görüntüyü 16:9 ekrana esnetir, kenarları kesmez"
                  active={aspectRatio === 'stretch'}
                  hasPreferredFocus={aspectRatio === 'stretch'}
                  onPress={() => handleSelectAspectRatio('stretch')}
                />
                <DrawerItem
                  title="Orijinal Sinemaskop (Sığdır)"
                  subtitle="Orijinal sinemaskop oranını korur (Üst ve altta siyah barlar)"
                  active={aspectRatio === 'contain'}
                  hasPreferredFocus={aspectRatio === 'contain'}
                  onPress={() => handleSelectAspectRatio('contain')}
                />
              </>
            )}

            {/* 4. Video Kaynakları Seçenekleri */}
            {drawerType === 'sources' && (
              <>
                {sources.map((src, idx) => (
                  <DrawerItem
                    key={src.id || `src-${idx}`}
                    title={`Kaynak ${idx + 1}`}
                    subtitle={src.language ? `${src.name} (${src.language.toUpperCase()})` : src.name}
                    active={idx === currentSourceIndex}
                    hasPreferredFocus={idx === currentSourceIndex}
                    onPress={() => {
                      closeDrawer();
                      onSwitchSource(src, idx);
                    }}
                  />
                ))}
              </>
            )}
          </ScrollView>

          {/* Çekmece Alt Bilgi / Kapatma İpucu */}
          <View style={styles.drawerFooter}>
            <Text style={styles.drawerFooterText}>
              ‹ Kumandadan [Geri] veya [Sol] ile kapatın
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 9999,
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  fullVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 50,
    left: 80,
    right: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  subtitleContainerControlsVisible: {
    bottom: 140,
  },
  subtitleBox: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    maxWidth: '92%',
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  centerLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hudOverlay: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  backgroundFocusCatcher: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  backButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444444',
  },
  backButtonFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  videoTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginHorizontal: 20,
  },
  sourceBadge: {
    backgroundColor: '#222222',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555555',
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomControlBar: {
    backgroundColor: 'rgba(10, 10, 10, 0.94)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    width: 75,
    textAlign: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  progressBarFilled: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  controlButtonWrapper: {
    borderRadius: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    maxWidth: 160,
  },
  controlButtonNormal: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  controlButtonFocused: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  controlButtonActive: {
    borderColor: '#888888',
  },
  controlButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  controlButtonTextFocused: {
    color: '#000000',
  },
  /* SİYAH-BEYAZ YANDAN AÇILIR MENÜ (DRAWER) STİLLERİ */
  sideDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 400,
    backgroundColor: '#0C0C0C',
    borderLeftWidth: 2,
    borderLeftColor: '#333333',
    paddingVertical: 28,
    paddingHorizontal: 24,
    zIndex: 10000,
    elevation: 16,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingBottom: 16,
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerScrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  drawerItemWrapper: {
    borderRadius: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  drawerItemNormal: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  drawerItemFocused: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    elevation: 10,
  },
  drawerItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  drawerItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drawerItemSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
    fontWeight: '500',
  },
  drawerItemTextFocused: {
    color: '#000000',
  },
  drawerItemSubtitleFocused: {
    color: '#333333',
  },
  activeBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeFocused: {
    backgroundColor: '#000000',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeBadgeTextFocused: {
    color: '#FFFFFF',
  },
  drawerEmptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  drawerEmptyText: {
    color: '#777777',
    fontSize: 14,
    textAlign: 'center',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingTop: 14,
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '700',
  },
  /* HATA KATMANI */
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  errorDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
});
