import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

export interface CategoryItem {
  id: string;
  name: string;
  path: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'aksiyon', name: 'Aksiyon Filmleri', path: 'tur/aksiyon-filmleri-izleyin-8/' },
  { id: 'action-adventure', name: 'Action & Adventure Filmleri', path: 'tur/action-adventure/' },
  { id: 'aile', name: 'Aile Filmleri', path: 'tur/aile-filmleri-izleyin-7/' },
  { id: 'animasyon', name: 'Animasyon Filmleri', path: 'tur/animasyon-filmlerini-izleyin-5/' },
  { id: 'belgesel', name: 'Belgesel Filmleri', path: 'tur/belgesel-filmlerini-izle-2/' },
  { id: 'bilim-kurgu', name: 'Bilim Kurgu Filmleri', path: 'tur/bilim-kurgu-filmlerini-izleyin-5/' },
  { id: 'biyografi', name: 'Biyografi Filmleri', path: 'tur/biyografi-filmleri-izle-3/' },
  { id: 'dram', name: 'Dram Filmleri', path: 'tur/dram-filmlerini-izle-2/' },
  { id: 'fantastik', name: 'Fantastik Filmleri', path: 'tur/fantastik-filmlerini-izleyin-4/' },
  { id: 'film-noir', name: 'Film-Noir Filmleri', path: 'tur/film-noir/' },
  { id: 'game-show', name: 'Game-Show Filmleri', path: 'tur/game-show-izle/' },
  { id: 'gerilim', name: 'Gerilim Filmleri', path: 'tur/gerilim-filmlerini-izle-4/' },
  { id: 'gizem', name: 'Gizem Filmleri', path: 'tur/gizem-filmleri-izle-4/' },
  { id: 'kids', name: 'Kids Filmleri', path: 'tur/kids/' },
  { id: 'komedi', name: 'Komedi Filmleri', path: 'tur/komedi-filmlerini-izleyin-2/' },
  { id: 'korku', name: 'Korku Filmleri', path: 'tur/korku-filmlerini-izle-9/' },
  { id: 'macera', name: 'Macera Filmleri', path: 'tur/macera-filmlerini-izleyin-5/' },
  { id: 'muzik', name: 'Müzik Filmleri', path: 'tur/muzik-filmlerini-izle/' },
  { id: 'muzik-arsiv', name: 'Müzik Filmleri (Arşiv)', path: 'tur/muzik-filmlerini-izle-844/' },
  { id: 'news', name: 'News Filmleri', path: 'tur/news/' },
  { id: 'polisiye', name: 'Polisiye Filmleri', path: 'tur/polisiye-filmleri-izle/' },
  { id: 'reality', name: 'Reality Filmleri', path: 'tur/reality-izle/' },
  { id: 'reality-tv', name: 'Reality-TV Filmleri', path: 'tur/reality-tv-izle/' },
  { id: 'romantik', name: 'Romantik Filmleri', path: 'tur/romantik-filmleri-izle-3/' },
  { id: 'savas', name: 'Savaş Filmleri', path: 'tur/savas-filmleri-izle-5/' },
  { id: 'sci-fi-fantasy', name: 'Sci-Fi & Fantasy Filmleri', path: 'tur/sci-fi-fantasy/' },
  { id: 'science-fiction', name: 'Science Fiction Filmleri', path: 'tur/science-fiction/' },
  { id: 'short', name: 'Short Filmleri', path: 'tur/short-filmleri/' },
  { id: 'soap', name: 'Soap Filmleri', path: 'tur/soap/' },
  { id: 'spor', name: 'Spor Filmleri', path: 'tur/spor-filmleri-izle-3/' },
  { id: 'suc', name: 'Suç Filmleri', path: 'tur/suc-filmleri-izle-3/' },
  { id: 'tarih', name: 'Tarih Filmleri', path: 'tur/tarih-filmleri-izle-5/' },
  { id: 'tv-movie', name: 'TV Movie Filmleri', path: 'tur/tv-movie-1/' },
  { id: 'war-politics', name: 'War & Politics Filmleri', path: 'tur/war-politics/' },
  { id: 'western', name: 'Western Filmleri', path: 'tur/western-filmleri-izle-3/' },
];

const ROW_HEIGHT = 108; // 92px kart yüksekliği + 16px dikey boşluk (gap)
const MOVIE_ROW_HEIGHT = 240; // 5 kolonlu film kataloğu satır yüksekliği

/**
 * TV D-Pad Kumanda için Özel 3 Kolonlu Kategori Kartı
 * - Beyaz kenarlık YOK
 * - Pürüzsüz donanım hızlandırmalı Zoom (scale 1.06)
 * - Odaklanınca Netflix Kırmızısı (#E50914)
 * - Otomatik görünür alana kaydırma (Auto-scroll focus)
 */
interface CategoryTileProps {
  item: CategoryItem;
  index: number;
  hasTVPreferredFocus?: boolean;
  onPress: (category: CategoryItem) => void;
  onFocus: (index: number) => void;
}

const CategoryTile: React.FC<CategoryTileProps> = React.memo(({
  item,
  index,
  hasTVPreferredFocus = false,
  onPress,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: isFocused ? 1.06 : 1.0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus(index);
  }, [index, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <Pressable
      focusable={true}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={() => onPress(item)}
      style={styles.categoryPressable}
    >
      <Animated.View
        style={[
          styles.categoryTile,
          isFocused ? styles.categoryTileFocused : styles.categoryTileNormal,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.tileHeader}>
          <View style={[styles.redAccentBar, isFocused && styles.redAccentBarFocused]} />
          <Text
            style={[styles.categoryTileText, isFocused && styles.categoryTileTextFocused]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <View style={styles.tileFooter}>
          <Text style={[styles.exploreText, isFocused && styles.exploreTextFocused]}>
            Keşfet ›
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

interface CategoriesScreenProps {
  onSelectMovie?: (item: MediaItem) => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ onSelectMovie }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(150);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const provider = ProviderRegistry.getActiveProvider();
  const moviesListRef = useRef<FlatList<MediaItem>>(null);
  const categoriesListRef = useRef<FlatList<CategoryItem>>(null);
  const lastMovieRowIndexRef = useRef<number>(0);

  const isFetchingRef = useRef<boolean>(false);
  const pageRef = useRef<number>(1);
  const hasNextRef = useRef<boolean>(true);
  const categoryRef = useRef<CategoryItem | null>(null);

  // Kategoriye odaklanıldığında satırı ekranın ferah üst-orta bölgesine kaydır (Altta kesilmeyi %100 önler)
  const handleCategoryFocus = useCallback((index: number) => {
    const rowIndex = Math.floor(index / 3);
    const targetOffset = Math.max(0, (rowIndex - 1) * ROW_HEIGHT);

    categoriesListRef.current?.scrollToOffset({
      offset: targetOffset,
      animated: true,
    });
  }, []);

  // Kategori seçildiğinde Sayfa 1 filmlerini çek
  const handleSelectCategory = useCallback(
    async (category: CategoryItem) => {
      setSelectedCategory(category);
      setLastSelectedId(category.id);
      categoryRef.current = category;
      setInitialLoading(true);
      isFetchingRef.current = true;
      pageRef.current = 1;
      setPage(1);

      try {
        const res = await provider.getMovies(1, category.path);
        if (res && res.items && res.items.length > 0) {
          setMovies(res.items);
          pageRef.current = res.currentPage;
          setPage(res.currentPage);
          hasNextRef.current = res.hasNextPage;
          setHasNextPage(res.hasNextPage);
          if (res.totalPages) {
            setTotalPages(res.totalPages);
          }
        } else {
          setMovies([]);
          hasNextRef.current = false;
          setHasNextPage(false);
        }
      } catch (err) {
        console.warn('Category movies fetch error:', err);
        setMovies([]);
      } finally {
        isFetchingRef.current = false;
        setInitialLoading(false);
      }
    },
    [provider]
  );

  // Kategoriler listesine geri dön (Yalnızca Kumanda Geri Tuşu ile)
  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    categoryRef.current = null;
    setMovies([]);
    pageRef.current = 1;
    setPage(1);
    hasNextRef.current = true;
    setHasNextPage(true);
    isFetchingRef.current = false;
  }, []);

  // Kumanda / Donanım Geri Tuşu (Remote Back Button) dinleyicisi
  useEffect(() => {
    if (!selectedCategory) return;

    const onBackPress = () => {
      handleBackToCategories();
      return true; // Geri tuşunu tüket, uygulamadan çıkmayı engelle
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backSubscription.remove();
  }, [selectedCategory, handleBackToCategories]);

  // Sonraki Sayfayı Arka Planda Yükle ve Alta Ekle (Kategoriler Otomatik Sayfalama)
  const loadMore = useCallback(async () => {
    const currentCat = categoryRef.current;
    if (isFetchingRef.current || !hasNextRef.current || !currentCat) {
      return;
    }

    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;
    try {
      const res = await provider.getMovies(nextPage, currentCat.path);
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
      console.warn('Category loadMore error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [provider]);

  // TV D-Pad Kumanda: Aşağı inildiğinde aktif seçili satırı tepeye çek ve altındaki görünmeyen satırı ekrana getir
  const handleItemFocus = useCallback(
    (index: number) => {
      const rowIndex = Math.floor(index / 5);
      if (rowIndex !== lastMovieRowIndexRef.current) {
        lastMovieRowIndexRef.current = rowIndex;
        const targetOffset = rowIndex * MOVIE_ROW_HEIGHT;
        moviesListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      }

      // Liste sonuna 3 satır (15 film) kala bir sonraki sayfayı erkenden çek
      if (
        index >= movies.length - 15 &&
        !isFetchingRef.current &&
        hasNextRef.current
      ) {
        loadMore();
      }
    },
    [loadMore, movies.length]
  );

  // Yeni sayfa eklendiğinde Android ScrollView'ın satır hizasını bozmasını önle
  useEffect(() => {
    if (lastMovieRowIndexRef.current > 0) {
      const targetOffset = lastMovieRowIndexRef.current * MOVIE_ROW_HEIGHT;
      const timer = setTimeout(() => {
        moviesListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [movies.length]);

  const renderMovieCard = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <TVFocusableCard
        item={item}
        width={140}
        height={170}
        hasTVPreferredFocus={index === 0}
        onFocus={() => handleItemFocus(index)}
        onPress={() => onSelectMovie?.(item)}
      />
    ),
    [handleItemFocus, onSelectMovie]
  );

  // Sabit yükseklikli alt bilgi (yüklenirken layout kaymasını ve titremeyi kesin olarak önler)
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.footerLoadingText}>
            Daha fazla film yükleniyor (Sayfa {pageRef.current + 1})...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && movies.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerEndText}>
            Tüm içerikler yüklendi ({movies.length} Film)
          </Text>
        </View>
      );
    }
    return <View style={styles.footerContainer} />;
  }, [hasNextPage, loadingMore, movies.length]);

  // Kategori Filmleri Görünümü (Otomatik Sayfalama ve Geri Tuşu Destekli)
  if (selectedCategory) {
    return (
      <View style={[styles.container, styles.moviesContainer]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>{selectedCategory.name}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>Sayfa {page} / {totalPages}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {movies.length > 0
              ? `${movies.length} Film Yüklendi • Geri dönmek için kumandanın 'Geri' tuşuna basın`
              : `${selectedCategory.name} filmleri listeleniyor`}
          </Text>
        </View>

        {initialLoading ? (
          <Pressable
            style={styles.loaderBox}
            focusable={true}
            hasTVPreferredFocus={true}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {selectedCategory.name} filmleri yükleniyor...
            </Text>
          </Pressable>
        ) : (
          <FlatList
            key={`category-movies-grid-5col-${selectedCategory.id}`}
            ref={moviesListRef}
            data={movies}
            renderItem={renderMovieCard}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={5}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            removeClippedSubviews={false}
            windowSize={11}
            initialNumToRender={30}
            maxToRenderPerBatch={30}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Bu kategoride film bulunamadı.</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // Kategoriler Menü Listesi Görünümü (1 Satırda 3 Kolon, Tam Görünür Otomatik Kaydırmalı)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kategoriler</Text>
        <Text style={styles.headerSubtitle}>
          Tüm film türleri ve arşiv (Toplam 35 Kategori)
        </Text>
      </View>

      <FlatList
        key="categories-tiles-grid-3col"
        ref={categoriesListRef}
        data={CATEGORIES}
        renderItem={({ item, index }) => (
          <CategoryTile
            item={item}
            index={index}
            hasTVPreferredFocus={
              lastSelectedId ? item.id === lastSelectedId : index === 0
            }
            onFocus={handleCategoryFocus}
            onPress={handleSelectCategory}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.categoryColumnWrapper}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        contentContainerStyle={styles.categoryGridContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingLeft: 88, // Sol menü için güvenli TV boşluğu
    paddingRight: 32,
    paddingTop: 24,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: '#1E2028',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2F3442',
  },
  countText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryGridContent: {
    paddingBottom: 240, // Geniş alt tampon: En son satırdaki seçimler ekran dışında kalmaz
  },
  categoryColumnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  categoryPressable: {
    flex: 1,
  },
  categoryTile: {
    flex: 1,
    height: 92,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  categoryTileNormal: {
    backgroundColor: '#181A22',
    borderWidth: 1,
    borderColor: '#252936',
    elevation: 3,
  },
  categoryTileFocused: {
    backgroundColor: Colors.primary, // Netflix Kırmızı vurgu (#E50914)
    borderWidth: 0, // BEYAZ BORDER KALDIRILDI!
    elevation: 12,
    zIndex: 10,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redAccentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  redAccentBarFocused: {
    backgroundColor: '#FFFFFF',
    height: 22,
  },
  categoryTileText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DCE0EA',
    letterSpacing: 0.3,
    flex: 1,
  },
  categoryTileTextFocused: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  tileFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#70778A',
  },
  exploreTextFocused: {
    color: '#FFEAEA',
    fontWeight: '800',
  },
  moviesContainer: {
    paddingLeft: 64,
    paddingTop: 16,
  },
  flatList: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 46,
    paddingBottom: 480, // En son satırın dahi ekranın en tepesine kadar çıkabilmesi için tam ekran tampon
  },
  columnWrapper: {
    gap: 26,
    marginBottom: 10, // 230 + 10 = 240px satır yüksekliği
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
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
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
