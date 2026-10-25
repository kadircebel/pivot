import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  findNodeHandle,
} from 'react-native';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

const ROW_HEIGHT = 240;

const SUGGESTIONS = [
  'Örümcek Adam',
  'Mayday',
  'Supergirl',
  'Dune',
  'Mortal Kombat',
  'Batman',
  'Yıldız Savaşları',
];

interface SearchScreenProps {
  onSelectMovie?: (item: MediaItem) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onSelectMovie }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const flatListRef = useRef<FlatList<MediaItem>>(null);
  const lastRowIndexRef = useRef<number>(0);
  const provider = ProviderRegistry.getActiveProvider();
  const searchTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // TV D-Pad Navigasyon Bağlantı Noktaları (Native Tags)
  const searchBarRef = useRef<View>(null);
  const firstChipRef = useRef<View>(null);
  const [searchBarTag, setSearchBarTag] = useState<number | undefined>(undefined);
  const [firstChipTag, setFirstChipTag] = useState<number | undefined>(undefined);

  const updateNativeTags = useCallback(() => {
    if (searchBarRef.current) {
      const sTag = findNodeHandle(searchBarRef.current);
      if (sTag) setSearchBarTag(sTag);
    }
    if (firstChipRef.current) {
      const cTag = findNodeHandle(firstChipRef.current);
      if (cTag) setFirstChipTag(cTag);
    }
  }, []);

  useEffect(() => {
    updateNativeTags();
    const timer = setTimeout(updateNativeTags, 150);
    return () => clearTimeout(timer);
  }, [updateNativeTags]);

  // Doğrudan arama yap
  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      setLoading(true);
      setHasSearched(!!q);
      try {
        const res = await provider.search(q);
        setResults(res.items || []);
        lastRowIndexRef.current = 0;
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      } catch (err) {
        console.warn('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  // Yazarken gecikmeli (debounced) canlı arama
  const triggerDebouncedSearch = useCallback(
    (searchQuery: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      const q = searchQuery.trim();
      if (q.length >= 2) {
        setLoading(true);
        searchTimeoutRef.current = setTimeout(() => {
          executeSearch(q);
        }, 400);
      } else if (q.length === 0) {
        searchTimeoutRef.current = setTimeout(() => {
          executeSearch('');
        }, 200);
      }
    },
    [executeSearch]
  );

  // Sayfa ilk açıldığında popüler içerikleri getir
  useEffect(() => {
    let isMounted = true;
    provider
      .search('')
      .then((res) => {
        if (isMounted && res.items && res.items.length > 0) {
          setResults(res.items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [provider]);

  // TV D-Pad Kumanda: Aşağı inildiğinde aktif seçili satırı tepeye çek
  const handleItemFocus = useCallback((index: number) => {
    const rowIndex = Math.floor(index / 5);
    if (rowIndex !== lastRowIndexRef.current) {
      lastRowIndexRef.current = rowIndex;
      const targetOffset = rowIndex * ROW_HEIGHT;
      flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
    }
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    executeSearch('');
    inputRef.current?.focus();
  }, [executeSearch]);

  const handleSuggestionPress = useCallback(
    (text: string) => {
      setQuery(text);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      executeSearch(text);
    },
    [executeSearch]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const isFirstRow = index < 5;
      return (
        <TVFocusableCard
          item={item}
          width={140}
          height={170}
          nextFocusUp={isFirstRow ? (firstChipTag || searchBarTag) : undefined}
          onFocus={() => handleItemFocus(index)}
          onPress={() => onSelectMovie?.(item)}
        />
      );
    },
    [firstChipTag, handleItemFocus, onSelectMovie, searchBarTag]
  );

  return (
    <View style={styles.container}>
      {/* Üst Arama Çubuğu ve Başlık Alanı */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Arama</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Android TV Klavyesi & Sesli Arama Aktif</Text>
          </View>
        </View>

        {/* Yerel Sistem Klavyeli Arama Çubuğu (Kumanda D-Pad Uyumlu Pressable Kapsayıcı) */}
        <View style={styles.searchRow}>
          <Pressable
            ref={searchBarRef}
            focusable={true}
            hasTVPreferredFocus={true}
            android_disableSound={true}
            nextFocusDown={firstChipTag}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onPress={() => {
              inputRef.current?.focus();
            }}
            onLayout={updateNativeTags}
            style={({ focused }) => [
              styles.searchInputContainer,
              (focused || isInputFocused) && styles.searchInputContainerFocused,
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                triggerDebouncedSearch(text);
              }}
              onSubmitEditing={() => {
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                executeSearch(query);
              }}
              placeholder="Film, dizi veya oyuncu ara... (Yazmak için OK'e basın)"
              placeholderTextColor="#7A8090"
              style={styles.textInputField}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              showSoftInputOnFocus={true}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
          </Pressable>

          {query.length > 0 ? (
            <Pressable
              focusable={true}
              android_disableSound={true}
              nextFocusDown={firstChipTag}
              onPress={handleClear}
              style={({ focused }) => [
                styles.actionButton,
                focused && styles.actionButtonFocused,
              ]}
            >
              <Text style={styles.actionButtonText}>✕ Temizle</Text>
            </Pressable>
          ) : null}

          <Pressable
            focusable={true}
            android_disableSound={true}
            nextFocusDown={firstChipTag}
            onPress={() => {
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              executeSearch(query);
            }}
            style={({ focused }) => [
              styles.actionButton,
              styles.searchActionButton,
              focused && styles.actionButtonFocused,
            ]}
          >
            <Text style={styles.actionButtonText}>Ara</Text>
          </Pressable>
        </View>

        {/* Hızlı Arama Önerileri (Etiketler - D-pad ile yukarı basıldığında doğrudan arama çubuğuna geçer) */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Popüler Aramalar:</Text>
          <View style={styles.suggestionsList}>
            {SUGGESTIONS.map((item, idx) => (
              <Pressable
                key={item}
                ref={idx === 0 ? firstChipRef : undefined}
                focusable={true}
                android_disableSound={true}
                nextFocusUp={searchBarTag}
                onPress={() => handleSuggestionPress(item)}
                onLayout={idx === 0 ? updateNativeTags : undefined}
                style={({ focused }) => [
                  styles.suggestionChip,
                  focused && styles.suggestionChipFocused,
                ]}
              >
                <Text style={styles.suggestionChipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Arama Durumu / Sonuç Başlığı */}
        <View style={styles.statusRow}>
          <Text style={styles.resultsTitle}>
            {loading
              ? 'Aranıyor...'
              : hasSearched
              ? `Arama Sonuçları: "${query}" (${results.length} içerik)`
              : `Popüler Öneriler (${results.length})`}
          </Text>
        </View>
      </View>

      {/* Arama Sonuçları Izgarası (Full-width 5 Kolon Standardı) */}
      {loading && results.length === 0 ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Sonuçlar aranıyor...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          key="search-grid-5col"
          ref={flatListRef}
          data={results}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={5}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          removeClippedSubviews={false}
          windowSize={11}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
        />
      ) : hasSearched ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>"{query}" için arama sonucu bulunamadı.</Text>
          <Text style={styles.emptySubText}>
            Farklı bir arama terimi deneyebilir veya popüler önerilere göz atabilirsiniz.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            Aramak istediğiniz filmi veya diziyi yukarıdaki arama kutusuna yazın.
          </Text>
          <Text style={styles.emptySubText}>
            Kumandanızın 'OK' tuşu ile klavyeyi açabilir veya mikrofon ile sesli arama yapabilirsiniz.
          </Text>
        </View>
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
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  badge: {
    marginLeft: 14,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A20',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D3038',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInputContainerFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: '#20242E',
    transform: [{ scale: 1.01 }],
    elevation: 8,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  textInputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionButton: {
    backgroundColor: '#2A2D36',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#383C48',
  },
  searchActionButton: {
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
    borderColor: Colors.primary,
  },
  actionButtonFocused: {
    backgroundColor: Colors.primary,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  suggestionsLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 10,
    marginBottom: 6,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#1E2129',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D323E',
    marginBottom: 6,
  },
  suggestionChipFocused: {
    backgroundColor: Colors.primary,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.06 }],
  },
  suggestionChipText: {
    color: '#E0E4EC',
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    marginTop: 4,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gridContent: {
    paddingHorizontal: 46, // 46px simetrik kenar hizalaması
    paddingBottom: 480, // Aşağı kaydırmada son satırın da rahatça tepeye çıkması için tampon
  },
  columnWrapper: {
    gap: 26, // 5 kart (140) + 4 boşluk (26) = 804px. 804 + 92 = 896px tam TV alanı
    marginBottom: 10, // ROW_HEIGHT = 240
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});
