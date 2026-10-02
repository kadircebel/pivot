import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EpisodeItem,
  MediaDetail,
  SeasonItem,
  VideoSourceOption,
} from '../core/interfaces/IMovieSourceProvider';
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

interface SeriesDetailScreenProps {
  series: MediaItem;
  onBack: () => void;
}

interface SeasonTabButtonProps {
  season: SeasonItem;
  isActive: boolean;
  hasPreferredFocus: boolean;
  disabled?: boolean;
  onPress: (seasonNumber: number) => void;
  onFocus?: () => void;
}

const SeasonTabButton: React.FC<SeasonTabButtonProps> = React.memo(
  ({ season, isActive, hasPreferredFocus, disabled = false, onPress, onFocus }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setFocused(true);
      Animated.timing(scaleAnim, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }).start();
      onFocus?.();
    }, [scaleAnim, onFocus]);

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
        focusable={!disabled}
        hasTVPreferredFocus={!disabled && hasPreferredFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={() => onPress(season.seasonNumber)}
        style={styles.seasonTabPressable}
      >
        <Animated.View
          style={[
            styles.seasonTabButton,
            isActive && styles.seasonTabButtonActive,
            focused && styles.seasonTabButtonFocused,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text
            style={[
              styles.seasonTabText,
              isActive && styles.seasonTabTextActive,
              focused && styles.seasonTabTextFocused,
            ]}
          >
            {season.title}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }
);

interface EpisodeCardProps {
  episode: EpisodeItem;
  index: number;
  hasPreferredFocus: boolean;
  disabled?: boolean;
  onPress: (episode: EpisodeItem) => void;
  onFocus?: (index: number) => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(
  ({ episode, index, hasPreferredFocus, disabled = false, onPress, onFocus }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = useCallback(() => {
      setFocused(true);
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 120,
        useNativeDriver: true,
      }).start();
      onFocus?.(index);
    }, [scaleAnim, onFocus, index]);

    const handleBlur = useCallback(() => {
      setFocused(false);
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const displayTitle = useMemo(() => {
      if (!episode.title) return `${episode.episodeNumber}. Bölüm`;
      // "1. Sezon 1. Bölüm" veya "1. Sezon - 1. Bölüm" formatındaki sezon kısmını kaldırıp sadece "1. Bölüm" yap
      const cleaned = episode.title
        .replace(/^\s*\d+\.\s*Sezon\s*[-–—:]*\s*/i, '')
        .trim();
      return cleaned || `${episode.episodeNumber}. Bölüm`;
    }, [episode.title, episode.episodeNumber]);

    return (
      <Pressable
        focusable={!disabled}
        hasTVPreferredFocus={!disabled && hasPreferredFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={() => onPress(episode)}
        style={styles.episodePressable}
      >
        <Animated.View
          style={[
            styles.episodeCard,
            focused ? styles.episodeCardFocused : styles.episodeCardNormal,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.episodeCardHeader}>
            <Text style={[styles.episodeTitle, focused && styles.episodeTextFocused]} numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>

          <View style={styles.episodeCardFooter}>
            <Text style={[styles.episodeDate, focused && styles.episodeDateFocused]}>
              {episode.episodeDate || `Bölüm ${episode.episodeNumber}`}
            </Text>

            <View style={styles.episodeBadgeRow}>
              {episode.isDubbed ? (
                <View style={[styles.miniBadge, focused && styles.miniBadgeFocused]}>
                  <Text style={styles.miniBadgeIcon}>🇹🇷</Text>
                </View>
              ) : null}
              {episode.hasSubtitles ? (
                <View style={[styles.miniBadge, focused && styles.miniBadgeFocused]}>
                  <Text style={[styles.miniBadgeText, focused && styles.miniBadgeTextFocused]}>CC</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }
);

export const SeriesDetailScreen: React.FC<SeriesDetailScreenProps> = ({
  series,
  onBack,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(1);

  // Bölüm Çözümleme ve Oynatıcı Durumları
  const [resolvingEpisode, setResolvingEpisode] = useState<{
    episode: EpisodeItem;
    embedUrl: string;
    sources: VideoSourceOption[];
  } | null>(null);
  const [resolvingError, setResolvingError] = useState<string | null>(null);

  // Aktif Native Video Akışı
  const [activeStream, setActiveStream] = useState<ExtractedStream | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeItem | null>(null);
  const [episodeSources, setEpisodeSources] = useState<VideoSourceOption[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState<number>(0);

  // Önbellek: Çözümlenen bölüm akışları
  const streamCacheRef = useRef<Record<string, ExtractedStream>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // TV D-pad Odak Değiştiğinde Ekranı Pürüzsüz Hizala
  const handleSeasonFocus = useCallback(() => {
    // Sezon sekmesindeyken tepeyi (y=0) göster; afiş, başlık ve ilk satır kesilmesin
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleEpisodeFocus = useCallback((index: number) => {
    const rowIndex = Math.floor(index / 3);
    // Odaklanan bölüm kartını daima ekranın ferah üst-orta kısmına çek (altta asla yarım kalmaz)
    scrollViewRef.current?.scrollTo({ y: 140 + rowIndex * 110, animated: true });
  }, []);

  const handleTopNavFocus = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const [posterUri, setPosterUri] = useState<string>(series.posterUrl);
  const [backdropUri, setBackdropUri] = useState<string>(
    series.backdropUrl || series.posterUrl
  );

  const provider = ProviderRegistry.getActiveProvider();

  // Dizi Detaylarını Çek
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await provider.getDetails(series.detailUrl);
        if (isMounted && res) {
          setDetail(res);
          if (res.posterUrl) setPosterUri(res.posterUrl);
          if (res.backdropUrl) setBackdropUri(res.backdropUrl);
          if (res.seasons && res.seasons.length > 0) {
            setActiveSeasonNumber(res.seasons[0].seasonNumber);
          }
        }
      } catch (err) {
        console.warn('SeriesDetailScreen fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [provider, series.detailUrl]);

  // Donanımsal TV Kumandası Geri Tuşu Yönetimi
  useEffect(() => {
    const handleHardwareBack = () => {
      if (activeStream) {
        setActiveStream(null);
        setActiveEpisode(null);
        return true;
      }
      if (resolvingEpisode) {
        setResolvingEpisode(null);
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
  }, [activeStream, resolvingEpisode, resolvingError, onBack]);

  // Aktif Sezon Nesnesi
  const currentSeason = useMemo(() => {
    if (!detail?.seasons) return null;
    return (
      detail.seasons.find((s) => s.seasonNumber === activeSeasonNumber) ||
      detail.seasons[0] ||
      null
    );
  }, [detail?.seasons, activeSeasonNumber]);

  // Sonraki Bölümü Hesapla (Otomatik Geçiş İçin)
  const getNextEpisode = useCallback(
    (currentEp: EpisodeItem): EpisodeItem | null => {
      if (!detail?.seasons) return null;

      const season = detail.seasons.find(
        (s) => s.seasonNumber === currentEp.seasonNumber
      );
      if (!season) return null;

      // Aynı sezondaki bir sonraki bölüm
      const epIndex = season.episodes.findIndex(
        (e) => e.episodeNumber === currentEp.episodeNumber
      );
      if (epIndex !== -1 && epIndex + 1 < season.episodes.length) {
        return season.episodes[epIndex + 1];
      }

      // Sezonun son bölümüyse: bir sonraki sezonun 1. bölümü
      const seasonIndex = detail.seasons.findIndex(
        (s) => s.seasonNumber === currentEp.seasonNumber
      );
      if (seasonIndex !== -1 && seasonIndex + 1 < detail.seasons.length) {
        const nextSeason = detail.seasons[seasonIndex + 1];
        if (nextSeason.episodes.length > 0) {
          return nextSeason.episodes[0];
        }
      }

      return null;
    },
    [detail?.seasons]
  );

  // Bir Bölüme Tıklandığında Oynatıcıyı Başlat
  const handleSelectEpisode = useCallback(
    async (episode: EpisodeItem) => {
      setResolvingError(null);
      setActiveEpisode(episode);

      const cacheKey = `${episode.detailUrl}_src_0`;
      // Daha önce çözümlenmişse önbellekten 0 ms anında aç
      if (streamCacheRef.current[cacheKey]) {
        setActiveStream(streamCacheRef.current[cacheKey]);
        return;
      }

      try {
        // Bölüm sayfasından video kaynaklarını çek
        const epDetail = await provider.getDetails(episode.detailUrl);
        const sources = epDetail?.sources || [];
        setEpisodeSources(sources);
        setCurrentSourceIndex(0);

        if (sources.length === 0) {
          setResolvingError('Bu bölüm için aktif video kaynağı bulunamadı.');
          return;
        }

        const primarySource = sources[0];
        let finalUrl = primarySource.embedUrl;
        if (provider.resolveVideoUrl) {
          finalUrl = await provider.resolveVideoUrl(primarySource, episode.detailUrl);
        }

        // Hızlı doğrudan çözücü
        const directResult = await extractDirectStream(
          finalUrl,
          episode.detailUrl,
          primarySource.name || 'Kaynak 1'
        );
        if (directResult) {
          streamCacheRef.current[cacheKey] = directResult;
          setActiveStream(directResult);
          return;
        }

        // Doğrudan çözülemediyse StreamResolverBridge (WebView) ile çöz
        setResolvingEpisode({
          episode,
          embedUrl: finalUrl,
          sources,
        });
      } catch (err) {
        console.warn('handleSelectEpisode error:', err);
        setResolvingError('Bölüm yüklenirken bir hata oluştu.');
      }
    },
    [provider]
  );

  // Bölüm İçi Kaynak Değiştirme (ExoPlayer hatasında veya menüden diğer kaynağa geçildiğinde)
  const handleSwitchEpisodeSource = useCallback(
    async (source: VideoSourceOption, index: number) => {
      if (!activeEpisode) return;
      setResolvingError(null);
      setCurrentSourceIndex(index);
      setActiveStream(null);

      const cacheKey = `${activeEpisode.detailUrl}_src_${index}`;
      if (streamCacheRef.current[cacheKey]) {
        setActiveStream(streamCacheRef.current[cacheKey]);
        return;
      }

      try {
        let finalUrl = source.embedUrl;
        if (provider.resolveVideoUrl) {
          finalUrl = await provider.resolveVideoUrl(source, activeEpisode.detailUrl);
        }

        const directResult = await extractDirectStream(
          finalUrl,
          activeEpisode.detailUrl,
          source.name || `Kaynak ${index + 1}`
        );
        if (directResult) {
          streamCacheRef.current[cacheKey] = directResult;
          setActiveStream(directResult);
          return;
        }

        setResolvingEpisode({
          episode: activeEpisode,
          embedUrl: finalUrl,
          sources: episodeSources,
        });
      } catch (err) {
        console.warn('handleSwitchEpisodeSource fallback:', err);
        setResolvingEpisode({
          episode: activeEpisode,
          embedUrl: source.embedUrl,
          sources: episodeSources,
        });
      }
    },
    [activeEpisode, provider, episodeSources]
  );

  // StreamResolverBridge akışı başarıyla çözdüğünde
  const handleStreamResolved = useCallback(
    (stream: ExtractedStream) => {
      if (resolvingEpisode) {
        const cacheKey = `${resolvingEpisode.episode.detailUrl}_src_${currentSourceIndex}`;
        streamCacheRef.current[cacheKey] = stream;
        setEpisodeSources(resolvingEpisode.sources);
      }
      setResolvingEpisode(null);
      setActiveStream(stream);
    },
    [resolvingEpisode, currentSourceIndex]
  );

  // StreamResolverBridge hata aldığında
  const handleStreamError = useCallback((errorMsg: string) => {
    setResolvingEpisode(null);
    setResolvingError(errorMsg);
  }, []);

  const nextEpisode = activeEpisode ? getNextEpisode(activeEpisode) : null;
  const isPlayerBusy = !!activeStream || !!resolvingEpisode || !!resolvingError;

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
            ref={scrollViewRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            pointerEvents={isPlayerBusy ? 'none' : 'auto'}
          >
            {/* Üst Başlık & Geri Dön Butonu */}
            <View style={styles.topNavRow}>
              <Pressable
                focusable={!isPlayerBusy}
                onPress={onBack}
                onFocus={handleTopNavFocus}
                style={({ focused }) => [
                  styles.navBackButton,
                  focused && styles.navBackButtonFocused,
                ]}
              >
                <Text style={styles.navBackIcon}>‹</Text>
                <Text style={styles.navBackText}>Geri Dön</Text>
              </Pressable>
              <Text style={styles.brandTitle}>PIVOT</Text>
            </View>

            {/* Dizi Detay Üst Başlığı (Sol Afiş + Sağ Bilgiler) */}
            <View style={styles.detailRow}>
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

              <View style={styles.infoContainer}>
                <Text style={styles.seriesTitle} numberOfLines={2}>
                  {detail?.title || series.title}
                </Text>

                {/* Rozetler ve Meta */}
                <View style={styles.metaRow}>
                  {series.year || detail?.year ? (
                    <View style={styles.badgeNormal}>
                      <Text style={styles.badgeText}>{detail?.year || series.year}</Text>
                    </View>
                  ) : null}

                  {series.imdbRating || detail?.imdbRating ? (
                    <View style={styles.badgeImdb}>
                      <Text style={styles.imdbStar}>★</Text>
                      <Text style={styles.imdbText}>
                        IMDb {detail?.imdbRating || series.imdbRating}
                      </Text>
                    </View>
                  ) : null}

                  {detail?.seasons && detail.seasons.length > 0 ? (
                    <View style={styles.badgeAccent}>
                      <Text style={styles.badgeAccentText}>
                        {detail.seasons.length} Sezon
                      </Text>
                    </View>
                  ) : null}

                  {series.languageBadge ? (
                    <View style={styles.badgeNormal}>
                      <Text style={styles.badgeText}>{series.languageBadge}</Text>
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

                {/* Dizi Özeti */}
                <Text style={styles.overviewText} numberOfLines={3}>
                  {detail?.description ||
                    series.overview ||
                    `${series.title} dizisini tüm sezon ve bölümleriyle HD kalitede izleyebilirsiniz.`}
                </Text>
              </View>
            </View>

            {/* SEZONLAR VE BÖLÜMLER ALANI */}
            <View style={styles.seasonsSection}>
              <Text style={styles.sectionHeader}>
                {detail?.title || series.title} DİZİSİNİN TÜM BÖLÜMLERİ
              </Text>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Sezonlar ve bölümler yükleniyor...</Text>
                </View>
              ) : detail?.seasons && detail.seasons.length > 0 ? (
                <>
                  {/* Yatay Sezon Sekmeleri */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.seasonsTabRow}
                  >
                    {detail.seasons.map((season, idx) => (
                      <SeasonTabButton
                        key={`s-${season.seasonNumber}`}
                        season={season}
                        isActive={season.seasonNumber === activeSeasonNumber}
                        hasPreferredFocus={idx === 0}
                        disabled={isPlayerBusy}
                        onPress={(sNum) => setActiveSeasonNumber(sNum)}
                        onFocus={handleSeasonFocus}
                      />
                    ))}
                  </ScrollView>

                  {/* Seçili Sezonun Bölümleri (TV 4 Kolon Izgara) */}
                  {currentSeason && currentSeason.episodes.length > 0 ? (
                    <View style={styles.episodesGrid}>
                      {currentSeason.episodes.map((ep, idx) => (
                        <EpisodeCard
                          key={ep.id || `ep-${idx}`}
                          episode={ep}
                          index={idx}
                          hasPreferredFocus={false}
                          disabled={isPlayerBusy}
                          onPress={handleSelectEpisode}
                          onFocus={handleEpisodeFocus}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>Bu sezona ait bölüm bulunamadı.</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Bu dizi için henüz bölüm eklenmemiş.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      {/* Bölüm Akışı Çözümleniyor Katmanı */}
      {resolvingEpisode && (
        <View style={styles.resolvingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.resolvingText}>
            {resolvingEpisode.episode.title} hazırlanıyor, lütfen bekleyin...
          </Text>
          <StreamResolverBridge
            embedUrl={resolvingEpisode.embedUrl}
            refererUrl={resolvingEpisode.episode.detailUrl}
            sourceName="Bölüm Oynatıcı"
            onResolved={handleStreamResolved}
            onError={handleStreamError}
          />
        </View>
      )}

      {/* Bölüm Yükleme Hata Katmanı */}
      {resolvingError && (
        <View style={styles.resolvingOverlay}>
          <Text style={styles.errorModalTitle}>⚠ Bölüm Bağlantı Sorunu</Text>
          <Text style={styles.errorModalDesc}>{resolvingError}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {episodeSources.length > 1 && (
              <Pressable
                focusable={true}
                hasTVPreferredFocus={true}
                onPress={() => {
                  const nextIdx =
                    (currentSourceIndex + 1) % episodeSources.length;
                  handleSwitchEpisodeSource(episodeSources[nextIdx], nextIdx);
                }}
                style={({ focused }) => [
                  styles.retryButton,
                  focused && styles.retryButtonFocused,
                  { backgroundColor: '#E50914', borderColor: '#FFFFFF' },
                ]}
              >
                <Text style={styles.retryButtonText}>
                  {`Diğer Kaynağa Geç (${(currentSourceIndex + 1) % episodeSources.length + 1}/${episodeSources.length})`}
                </Text>
              </Pressable>
            )}
            <Pressable
              focusable={true}
              hasTVPreferredFocus={episodeSources.length <= 1}
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

      {/* 100% Native TV Video Oynatıcı (ExoPlayer & Otomatik Sonraki Bölüm) */}
      {activeStream && activeEpisode && (
        <TVVideoPlayer
          movieTitle={detail?.title || series.title}
          episodeTitle={activeEpisode.title}
          stream={activeStream}
          sources={episodeSources}
          currentSourceIndex={currentSourceIndex}
          hasNextEpisode={!!nextEpisode}
          onNextEpisode={() => {
            if (nextEpisode) {
              setActiveStream(null);
              handleSelectEpisode(nextEpisode);
            }
          }}
          onClose={() => {
            setActiveStream(null);
            setActiveEpisode(null);
          }}
          onSwitchSource={(newSource, newIndex) => {
            handleSwitchEpisodeSource(newSource, newIndex);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.88)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 48, // Sol menü olmadığı için ekranın her iki tarafında dengeli 48px boşluk
    paddingTop: 24,
    paddingBottom: 160,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navBackButtonFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  navBackIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 6,
    fontWeight: 'bold',
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  posterContainer: {
    width: 155,
    height: 228,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#202020',
    elevation: 8,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 32,
    justifyContent: 'flex-start',
  },
  seriesTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
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
    marginBottom: 14,
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
    fontSize: 15,
    lineHeight: 23,
    color: '#CCCCCC',
  },
  seasonsSection: {
    marginTop: 14,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8E929E',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  seasonsTabRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  seasonTabPressable: {
    borderRadius: 8,
  },
  seasonTabButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#222222',
  },
  seasonTabButtonActive: {
    backgroundColor: '#383838',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  seasonTabButtonFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  seasonTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#AAAAAA',
  },
  seasonTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  seasonTabTextFocused: {
    color: '#000000',
    fontWeight: '900',
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  episodePressable: {
    width: '31.8%', // 1 satırda 3 kolon tam ve eşit yayılmış
    borderRadius: 8,
  },
  episodeCard: {
    padding: 14,
    borderRadius: 8,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  episodeCardNormal: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  episodeCardFocused: {
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
    elevation: 10,
  },
  episodeCardHeader: {
    marginBottom: 8,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E0E0E0',
  },
  episodeTextFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  episodeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  episodeDate: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  episodeDateFocused: {
    color: '#FFD2D2',
  },
  episodeBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  miniBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeFocused: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  miniBadgeIcon: {
    fontSize: 11,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CCCCCC',
  },
  miniBadgeTextFocused: {
    color: '#FFFFFF',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 10,
  },
  emptyBox: {
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#777777',
  },
  resolvingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
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
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF4D4D',
    marginBottom: 8,
  },
  errorModalDesc: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 400,
  },
  retryButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  retryButtonFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
