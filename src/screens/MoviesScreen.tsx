import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

interface MoviesScreenProps {
  onSelectMovie?: (item: MediaItem) => void;
}

export const MoviesScreen: React.FC<MoviesScreenProps> = ({ onSelectMovie }) => {
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(877);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<MediaItem>>(null);
  const provider = ProviderRegistry.getActiveProvider();

  const isFetchingRef = useRef<boolean>(false);
  const pageRef = useRef<number>(1);
  const hasNextRef = useRef<boolean>(true);

  // İlk Sayfayı Yükle
  useEffect(() => {
    let isMounted = true;
    const fetchFirstPage = async () => {
      setInitialLoading(true);
      isFetchingRef.current = true;
      try {
        const res = await provider.getMovies(1);
        if (isMounted && res && res.items && res.items.length > 0) {
          setMovies(res.items);
          pageRef.current = res.currentPage;
          setPage(res.currentPage);
          hasNextRef.current = res.hasNextPage;
          setHasNextPage(res.hasNextPage);
          if (res.totalPages) {
            setTotalPages(res.totalPages);
          }
        }
      } catch (err) {
        console.warn('MoviesScreen fetchFirstPage error:', err);
      } finally {
        if (isMounted) {
          isFetchingRef.current = false;
          setInitialLoading(false);
        }
      }
    };

    fetchFirstPage();
    return () => {
      isMounted = false;
    };
  }, [provider]);

  // Sonraki Sayfayı Arka Planda Yükle ve Alta Ekle (Otomatik Sonsuz Kaydırma)
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasNextRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;
    try {
      const res = await provider.getMovies(nextPage);
      if (res && res.items && res.items.length > 0) {
        setMovies((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = res.items.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newUnique];
        });

        pageRef.current = res.currentPage;
        setPage(res.currentPage);

        hasNextRef.current = res.hasNextPage;
        setHasNextPage(res.hasNextPage);

        if (res.totalPages) {
          setTotalPages(res.totalPages);
        }
      } else {
        hasNextRef.current = false;
        setHasNextPage(false);
      }
    } catch (err) {
      console.warn('MoviesScreen loadMore error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [provider]);

  // TV D-Pad Kumanda: Kullanıcı son 2 satırdaki bir karta odaklandığında sonraki sayfayı erkenden tetikle
  const handleItemFocus = useCallback(
    (index: number) => {
      if (
        index >= movies.length - 8 &&
        !isFetchingRef.current &&
        hasNextRef.current
      ) {
        loadMore();
      }
    },
    [loadMore, movies.length]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <TVFocusableCard
        item={item}
        width={180}
        height={270}
        hasTVPreferredFocus={index === 0}
        onFocus={() => handleItemFocus(index)}
        onPress={() => onSelectMovie?.(item)}
      />
    ),
    [handleItemFocus, onSelectMovie]
  );

  // Butonsuz akıcı alt bilgi ve arka plan yükleyici
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.footerLoadingText}>
            Daha fazla film yükleniyor (Sayfa {pageRef.current + 1})...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && movies.length > 0) {
      return (
        <View style={styles.footerInfoBox}>
          <Text style={styles.footerEndText}>
            Tüm filmler yüklendi ({movies.length} Film)
          </Text>
        </View>
      );
    }
    return <View style={styles.footerSpacer} />;
  }, [hasNextPage, loadingMore, movies.length]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Tüm Filmler Kataloğu</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>Sayfa {page} / {totalPages}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {movies.length > 0
            ? `${movies.length} Film Yüklendi • Otomatik Sayfalama Aktif`
            : 'En son çıkan vizyon filmleri ve HD arşiv'}
        </Text>
      </View>

      {initialLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Filmler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={movies}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={4}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          // TV D-Pad Odaklanma:
          removeClippedSubviews={false}
          windowSize={11}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingLeft: 88,
    paddingRight: 32,
    paddingTop: 24,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  countBadge: {
    marginLeft: 14,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  countText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  gridContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 20,
    marginBottom: 22,
  },
  footerLoaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  footerLoadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerInfoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  footerEndText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerSpacer: {
    height: 40,
  },
});

