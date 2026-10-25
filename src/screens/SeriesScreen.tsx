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
import { SNAPSHOT_SERIES_LIST } from '../providers/hdfilmcehennemi/HdFilmCehennemiProvider';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

const ROW_HEIGHT = 240;

interface SeriesScreenProps {
  onSelectSeries?: (item: MediaItem) => void;
}

export const SeriesScreen: React.FC<SeriesScreenProps> = ({ onSelectSeries }) => {
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(109);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<MediaItem>>(null);
  const lastRowIndexRef = useRef<number>(0);
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
        const res = await provider.getSeries(1);
        if (isMounted && res && res.items && res.items.length > 0) {
          setSeries(res.items);
          pageRef.current = res.currentPage;
          setPage(res.currentPage);
          hasNextRef.current = res.hasNextPage;
          setHasNextPage(res.hasNextPage);
          if (res.totalPages) {
            setTotalPages(res.totalPages);
          }
        }
      } catch (err) {
        console.warn('SeriesScreen fetchFirstPage error:', err);
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
      const res = await provider.getSeries(nextPage);
      if (res && res.items && res.items.length > 0) {
        setSeries((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newUnique = res.items.filter((s) => !existingIds.has(s.id));
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
      console.warn('SeriesScreen loadMore error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [provider]);

  // TV D-Pad Kumanda: Aşağı inildiğinde aktif seçili satırı tepeye çek ve altındaki görünmeyen satırı ekrana getir
  const handleItemFocus = useCallback(
    (index: number) => {
      const rowIndex = Math.floor(index / 5);
      if (rowIndex !== lastRowIndexRef.current) {
        lastRowIndexRef.current = rowIndex;
        const targetOffset = rowIndex * ROW_HEIGHT;
        flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      }

      // Liste sonuna 3 satır (15 dizi) kala bir sonraki sayfayı erkenden çek
      if (
        index >= series.length - 15 &&
        !isFetchingRef.current &&
        hasNextRef.current
      ) {
        loadMore();
      }
    },
    [loadMore, series.length]
  );

  // Yeni sayfa eklendiğinde Android ScrollView'ın satır hizasını bozmasını önle
  useEffect(() => {
    if (lastRowIndexRef.current > 0) {
      const targetOffset = lastRowIndexRef.current * ROW_HEIGHT;
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [series.length]);

  const renderCard = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <TVFocusableCard
        item={item}
        width={140}
        height={170}
        hasTVPreferredFocus={index === 0}
        onFocus={() => handleItemFocus(index)}
        onPress={() => onSelectSeries?.(item)}
      />
    ),
    [handleItemFocus, onSelectSeries]
  );

  // Sabit yükseklikli alt bilgi (yüklenirken layout kaymasını ve titremeyi kesin olarak önler)
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.footerLoadingText}>
            Daha fazla dizi yükleniyor (Sayfa {pageRef.current + 1})...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && series.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerEndText}>
            Tüm diziler yüklendi ({series.length} Dizi)
          </Text>
        </View>
      );
    }
    return <View style={styles.footerContainer} />;
  }, [hasNextPage, loadingMore, series.length]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Yabancı Diziler Kataloğu</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>Sayfa {page} / {totalPages}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {series.length > 0
            ? `${series.length} Dizi Yüklendi • Otomatik Sayfalama Aktif`
            : 'Popüler yabancı diziler ve güncel sezonlar'}
        </Text>
      </View>

      {initialLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Diziler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          key="series-grid-5col"
          ref={flatListRef}
          data={series}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={5}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          // TV D-Pad Odaklanma ve Kesintisiz Sayfalama:
          removeClippedSubviews={false}
          windowSize={11}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
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
    paddingLeft: 64, // Sol menünün bittiği yerden başlar
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 46, // Kartlar ile tam 46px simetrik hizalama
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
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
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  flatList: {
    flex: 1,
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
    paddingHorizontal: 46, // 46px sol ve sağ kenar boşluğu -> Ekranda tam ortalı, sol menüden 46px uzakta
    paddingBottom: 480, // En son satırın dahi ekranın en tepesine kadar çıkabilmesi için tam ekran tampon
  },
  columnWrapper: {
    gap: 26, // 5 kart (140) + 4 boşluk (26) = 804px. 804 + 92 = 896px = Tam içerik genişliği
    marginBottom: 10, // Kart yüksekliği 230 + margin 10 = Tam 240px satır yüksekliği (ROW_HEIGHT = 240)
  },
  footerContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footerLoadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerEndText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});

