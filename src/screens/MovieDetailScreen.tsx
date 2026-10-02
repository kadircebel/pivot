import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MediaDetail, VideoSourceOption } from '../core/interfaces/IMovieSourceProvider';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';
import { StreamResolverBridge } from '../components/StreamResolverBridge';
import { TVVideoPlayer } from '../components/TVVideoPlayer';
import { ExtractedStream, extractDirectStream } from '../services/streamExtractor';

const IMAGE_HEADERS = {
  'Referer': 'https://www.hdfilmcehennemi.nl/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
};

interface MovieDetailScreenProps {
  movie: MediaItem;
  onBack: () => void;
}

interface PlayerButtonProps {
  label?: string;
  source: VideoSourceOption;
  index: number;
  hasPreferredFocus: boolean;
  disabled?: boolean;
  onPress: (source: VideoSourceOption, index: number) => void;
}

const PlayerButton: React.FC<PlayerButtonProps> = React.memo(
  ({ label = 'Hemen İzle', source, index, hasPreferredFocus, disabled = false, onPress }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setFocused(true);
      Animated.timing(scaleAnim, {
        toValue: 1.06,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    return (
      <Pressable
        focusable={!disabled}
        hasTVPreferredFocus={!disabled && hasPreferredFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={() => onPress(source, index)}
        style={styles.playerPressable}
      >
        <Animated.View
          style={[
            styles.playerButton,
            focused ? styles.playerButtonFocused : styles.playerButtonNormal,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={[styles.playerIcon, focused && styles.playerTextFocused]}>
            ▶
          </Text>
          <Text
            style={[
              styles.playerButtonTitle,
              focused && styles.playerTextFocused,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }
);

export const MovieDetailScreen: React.FC<MovieDetailScreenProps> = ({
  movie,
  onBack,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Kaynak akışını çözümleme durumu
  const [resolvingSource, setResolvingSource] = useState<{
    source: VideoSourceOption;
    index: number;
    embedUrl: string;
  } | null>(null);
  const [resolvingError, setResolvingError] = useState<string | null>(null);

  // Aktif Native Video Akışı
  const [activeStream, setActiveStream] = useState<ExtractedStream | null>(null);
  const [currentSourceIndex, setCurrentSourceIndex] = useState<number>(0);

  // Çözümlenen video akışlarını önbellekte tut (Kaynak 1 ve Kaynak 2 arasında 0ms gecikmesiz anında geçiş sağlar)
  const streamCacheRef = useRef<Record<number, ExtractedStream>>({});

  const [posterUri, setPosterUri] = useState<string>(movie.posterUrl);
  const [backdropUri, setBackdropUri] = useState<string>(
    movie.backdropUrl || movie.posterUrl
  );

  const provider = ProviderRegistry.getActiveProvider();

  // Film detaylarını çek
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await provider.getDetails(movie.detailUrl);
        if (isMounted && res) {
          setDetail(res);
          if (res.posterUrl) setPosterUri(res.posterUrl);
          if (res.backdropUrl) setBackdropUri(res.backdropUrl);
        }
      } catch (err) {
        console.warn('MovieDetailScreen fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [provider, movie.detailUrl]);

  // Donanımsal TV Kumandası "Geri" Tuşu Yönetimi
  useEffect(() => {
    const handleHardwareBack = () => {
      if (activeStream) {
        setActiveStream(null);
        return true;
      }
      if (resolvingSource) {
        setResolvingSource(null);
        return true;
      }
      if (resolvingError) {
        setResolvingError(null);
        return true;
      }
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );

    return () => subscription.remove();
  }, [activeStream, resolvingSource, resolvingError, onBack]);

  // Kaynak seçildiğinde arka planda stream çözücüyü başlat
  const handleSelectSource = useCallback(
    async (source: VideoSourceOption, index: number) => {
      setResolvingError(null);
      setCurrentSourceIndex(index);

      // Daha önce çözümlenmişse önbellekten ANINDA (0 ms) aç
      if (streamCacheRef.current[index]) {
        setActiveStream(streamCacheRef.current[index]);
        return;
      }

      try {
        let finalUrl = source.embedUrl;
        if (provider.resolveVideoUrl) {
          finalUrl = await provider.resolveVideoUrl(source, movie.detailUrl);
        }

        // 1. Önce hızlı doğrudan çözücüyü dene (300ms içinde mobi/close çözülür)
        const directResult = await extractDirectStream(
          finalUrl,
          movie.detailUrl,
          `Kaynak ${index + 1}`
        );
        if (directResult) {
          streamCacheRef.current[index] = directResult;
          setActiveStream(directResult);
          return;
        }

        // 2. Doğrudan çözülemediyse StreamResolverBridge (WebView) ile çöz
        setResolvingSource({ source, index, embedUrl: finalUrl });
      } catch (err) {
        console.warn('resolveVideoUrl fallback:', err);
        setResolvingSource({ source, index, embedUrl: source.embedUrl });
      }
    },
    [provider, movie.detailUrl]
  );

  // StreamResolverBridge akışı başarıyla bulduğunda
  const handleStreamResolved = useCallback(
    (stream: ExtractedStream) => {
      if (resolvingSource) {
        streamCacheRef.current[resolvingSource.index] = stream;
      }
      setResolvingSource(null);
      setActiveStream(stream);
    },
    [resolvingSource]
  );

  // StreamResolverBridge hata aldığında
  const handleStreamError = useCallback((errorMsg: string) => {
    setResolvingSource(null);
    setResolvingError(errorMsg);
  }, []);

  const sources = detail?.sources || [];
  const overviewText =
    detail?.description ||
    movie.overview ||
    `${movie.title} filmini HD kalitede, Türkçe Dublaj ve Altyazı alternatifleriyle donmadan izleyebilirsiniz.`;

  const isPlayerBusy = !!activeStream || !!resolvingSource || !!resolvingError;

  return (
    <View style={styles.container}>
      {/* 1080p Arka Plan Kapak Görseli */}
      <ImageBackground
        source={
          backdropUri
            ? { uri: backdropUri, headers: IMAGE_HEADERS }
            : undefined
        }
        style={styles.backgroundImage}
        resizeMode="cover"
        onError={() => {
          if (backdropUri.endsWith('.webp')) {
            setBackdropUri(backdropUri.replace(/\.webp$/, '.jpg'));
          }
        }}
      >
        <View style={styles.gradientOverlay}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            pointerEvents={isPlayerBusy ? 'none' : 'auto'}
            importantForAccessibility={
              isPlayerBusy ? 'no-hide-descendants' : 'auto'
            }
          >
            {/* Üst Başlık & Geri Bildirimi */}
            <View style={styles.topNavRow}>
              <Pressable
                focusable={!isPlayerBusy}
                onPress={onBack}
                style={({ focused }) => [
                  styles.navBackButton,
                  focused && styles.navBackButtonFocused,
                ]}
              >
                <Text style={styles.navBackIcon}>‹</Text>
                <Text style={styles.navBackText}>Geri Dön</Text>
              </Pressable>
              <Text style={styles.brandTitle}>
                PIVOT
              </Text>
            </View>

            {/* Film Detay Ana Gövdesi (Sol Poster + Sağ Bilgiler) */}
            <View style={styles.detailRow}>
              {/* Sol: Büyük Poster */}
              <View style={styles.posterContainer}>
                <Image
                  source={{ uri: posterUri, headers: IMAGE_HEADERS }}
                  style={styles.posterImage}
                  resizeMode="cover"
                  onError={() => {
                    if (posterUri.endsWith('.webp')) {
                      setPosterUri(posterUri.replace(/\.webp$/, '.jpg'));
                    }
                  }}
                />
              </View>

              {/* Sağ: Başlık, Meta, Açıklama ve Oynatıcı Butonları */}
              <View style={styles.infoContainer}>
                <Text style={styles.movieTitle} numberOfLines={2}>
                  {detail?.title || movie.title}
                </Text>

                {/* Rozetler ve Meta Bilgiler */}
                <View style={styles.metaRow}>
                  {movie.year || detail?.year ? (
                    <View style={styles.badgeNormal}>
                      <Text style={styles.badgeText}>
                        {detail?.year || movie.year}
                      </Text>
                    </View>
                  ) : null}

                  {movie.imdbRating || detail?.imdbRating ? (
                    <View style={styles.badgeImdb}>
                      <Text style={styles.imdbStar}>★</Text>
                      <Text style={styles.imdbText}>
                        IMDb {detail?.imdbRating || movie.imdbRating}
                      </Text>
                    </View>
                  ) : null}

                  {detail?.duration ? (
                    <View style={styles.badgeNormal}>
                      <Text style={styles.badgeText}>{detail.duration}</Text>
                    </View>
                  ) : null}

                  {movie.languageBadge ? (
                    <View style={styles.badgeAccent}>
                      <Text style={styles.badgeAccentText}>
                        {movie.languageBadge}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Türler */}
                {detail?.genres && detail.genres.length > 0 ? (
                  <View style={styles.genreRow}>
                    {detail.genres.map((genre) => (
                      <View key={genre} style={styles.genrePill}>
                        <Text style={styles.genreText}>{genre}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Film Açıklaması / Hikayesi */}
                <Text style={styles.overviewText} numberOfLines={5}>
                  {overviewText}
                </Text>

                {/* Oynatıcı Bölümü */}
                <View style={styles.playerSection}>
                  <Text style={styles.sectionHeader}>OYNATICI</Text>

                  {loading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.loadingText}>
                        Oynatıcı aranıyor...
                      </Text>
                    </View>
                  ) : sources.length > 0 ? (
                    <View style={styles.playerButtonsRow}>
                      <PlayerButton
                        label="Hemen İzle"
                        source={sources[0]}
                        index={0}
                        hasPreferredFocus={true}
                        disabled={isPlayerBusy}
                        onPress={handleSelectSource}
                      />
                    </View>
                  ) : (
                    <View style={styles.emptyPlayerBox}>
                      <Text style={styles.emptyPlayerText}>
                        Bu içerik için aktif video oynatıcı bulunamadı.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      {/* Kaynak Çözümleniyor Katmanı (Arka planda sessizce m3u8 ayıklar) */}
      {resolvingSource && (
        <View style={styles.resolvingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.resolvingText}>
            Video akışı hazırlanıyor, lütfen bekleyin...
          </Text>
          <StreamResolverBridge
            embedUrl={resolvingSource.embedUrl}
            refererUrl={movie.detailUrl}
            sourceName={`Kaynak ${resolvingSource.index + 1}`}
            onResolved={handleStreamResolved}
            onError={handleStreamError}
          />
        </View>
      )}

      {/* Kaynak Hata Uyarısı Katmanı */}
      {resolvingError && (
        <View style={styles.resolvingOverlay}>
          <Text style={styles.errorModalTitle}>⚠ Video Yükleme Sorunu</Text>
          <Text style={styles.errorModalDesc}>{resolvingError}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {sources.length > 1 && (
              <Pressable
                focusable={true}
                hasTVPreferredFocus={true}
                onPress={() => {
                  setResolvingError(null);
                  const nextIdx = (currentSourceIndex + 1) % sources.length;
                  handleSelectSource(sources[nextIdx], nextIdx);
                }}
                style={({ focused }) => [
                  styles.retryButton,
                  focused && styles.retryButtonFocused,
                  { backgroundColor: '#E50914', borderColor: '#FFFFFF' },
                ]}
              >
                <Text style={styles.retryButtonText}>
                  {`Diğer Kaynağa Geç (${(currentSourceIndex + 1) % sources.length + 1}/${sources.length})`}
                </Text>
              </Pressable>
            )}
            <Pressable
              focusable={true}
              hasTVPreferredFocus={sources.length <= 1}
              onPress={() => setResolvingError(null)}
              style={({ focused }) => [
                styles.retryButton,
                focused && styles.retryButtonFocused,
              ]}
            >
              <Text style={styles.retryButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 100% Native TV Video Oynatıcı (ExoPlayer & D-Pad Kontrolleri) */}
      {activeStream && (
        <TVVideoPlayer
          movieTitle={detail?.title || movie.title}
          stream={activeStream}
          sources={sources}
          currentSourceIndex={currentSourceIndex}
          onClose={() => setActiveStream(null)}
          onSwitchSource={(newSource, newIndex) => {
            setActiveStream(null);
            handleSelectSource(newSource, newIndex);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 60,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navBackButtonFocused: {
    backgroundColor: Colors.primary,
    elevation: 8,
  },
  navBackIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 6,
  },
  navBackText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: '#FFFFFF',
    fontWeight: '300',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  posterContainer: {
    width: 230,
    height: 345,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    elevation: 10,
    marginRight: 36,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  movieTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '600',
  },
  badgeImdb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 197, 24, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.4)',
  },
  imdbStar: {
    color: '#F5C518',
    fontSize: 14,
    marginRight: 4,
    fontWeight: 'bold',
  },
  imdbText: {
    fontSize: 14,
    color: '#F5C518',
    fontWeight: '800',
  },
  badgeAccent: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  badgeAccentText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  genrePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 13,
    color: '#BBBBBB',
    fontWeight: '500',
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 25,
    color: '#D0D0D0',
    marginBottom: 24,
  },
  playerSection: {
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#888888',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  playerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  playerPressable: {
    borderRadius: 8,
  },
  playerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 8,
    minWidth: 160,
  },
  playerButtonNormal: {
    backgroundColor: '#222222',
  },
  playerButtonFocused: {
    backgroundColor: Colors.primary,
    elevation: 10,
  },
  playerIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 10,
  },
  playerButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  playerTextFocused: {
    color: '#FFFFFF',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 10,
  },
  emptyPlayerBox: {
    paddingVertical: 12,
  },
  emptyPlayerText: {
    fontSize: 14,
    color: '#777777',
  },
  resolvingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    padding: 32,
  },
  resolvingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 12,
  },
  errorModalDesc: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonFocused: {
    backgroundColor: '#FF1E27',
    elevation: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
