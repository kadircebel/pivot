import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

// Temel harf ve rakam düzeni (Türkçe karakter destekli)
const RAW_KEYBOARD = [
  ['A', 'B', 'C', 'Ç', 'D', 'E', 'F', '1', '2', '3'],
  ['G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', '4', '5', '6'],
  ['L', 'M', 'N', 'O', 'Ö', 'P', 'R', '7', '8', '9'],
  ['S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z', '0', '-'],
];

const SPECIAL_KEYS = ['SHIFT', 'BOŞLUK', 'SİL', 'TEMİZLE', 'ARA'];

const SUGGESTIONS = ['Örümcek Adam', 'Mayday', 'Supergirl', 'Dune', 'Mortal Kombat'];

interface SearchScreenProps {
  onSelectMovie?: (item: MediaItem) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onSelectMovie }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Android standardı: Başlangıçta ilk harf BÜYÜK, sonraki harfler KÜÇÜK
  const [isUppercase, setIsUppercase] = useState(true);

  const provider = ProviderRegistry.getActiveProvider();
  const searchTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // Klavyenin anlık büyük/küçük harf görünümü
  const currentKeyboard = useMemo(() => {
    return RAW_KEYBOARD.map((row) =>
      row.map((k) => {
        // Rakam ve tire değişmez
        if (/\d|-/.test(k)) return k;
        return isUppercase
          ? k.toLocaleUpperCase('tr-TR')
          : k.toLocaleLowerCase('tr-TR');
      })
    );
  }, [isUppercase]);

  // Doğrudan arama yap
  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      setLoading(true);
      setHasSearched(!!q);
      try {
        const res = await provider.search(q);
        setResults(res.items);
      } catch (err) {
        console.warn('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  // Yazarken D-pad gecikmeli (debounced) arama
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
        }, 350);
      } else if (q.length === 0) {
        searchTimeoutRef.current = setTimeout(() => {
          executeSearch('');
        }, 200);
      }
    },
    [executeSearch]
  );

  // Sayfa ilk açıldığında popüler arama önerilerini getir
  useEffect(() => {
    let isMounted = true;
    provider
      .search('')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setResults(res.items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [provider]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'SHIFT') {
        setIsUppercase((prev) => !prev);
      } else if (key === 'BOŞLUK') {
        const nextQuery = query + ' ';
        setQuery(nextQuery);
        setIsUppercase(true);
      } else if (key === 'SİL') {
        const nextQuery = query.slice(0, -1);
        setQuery(nextQuery);
        if (nextQuery.length === 0 || nextQuery.endsWith(' ')) {
          setIsUppercase(true);
        }
        triggerDebouncedSearch(nextQuery);
      } else if (key === 'TEMİZLE') {
        setQuery('');
        setIsUppercase(true);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        executeSearch('');
      } else if (key === 'ARA') {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        executeSearch(query);
      } else {
        const nextQuery = query + key;
        setQuery(nextQuery);
        if (isUppercase) {
          setIsUppercase(false);
        }
        triggerDebouncedSearch(nextQuery);
      }
    },
    [executeSearch, isUppercase, query, triggerDebouncedSearch]
  );

  const renderCard = useCallback(
    ({ item }: { item: MediaItem }) => (
      <TVFocusableCard
        item={item}
        width={155}
        height={232}
        onPress={() => onSelectMovie?.(item)}
      />
    ),
    [onSelectMovie]
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        {/* Arama Kutusu (Android TV Sistem Klavyeli & Sesli Arama Desteği) */}
        <View
          style={[
            styles.searchInputBox,
            isInputFocused && styles.searchInputBoxFocused,
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
            placeholder="Ara veya sesle yaz..."
            placeholderTextColor="#7A8090"
            style={styles.textInputField}
            focusable={true}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              focusable={true}
              android_disableSound={true}
              onPress={() => {
                setQuery('');
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                executeSearch('');
              }}
              style={({ focused }) => [
                styles.clearInputButton,
                focused && styles.clearInputButtonFocused,
              ]}
            >
              <Text style={styles.clearInputText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* TV Kumandası Uyumlu Akıllı Ekran Klavyesi */}
        <View style={styles.keyboardContainer}>
          {currentKeyboard.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyboardRow}>
              {row.map((char) => {
                const isFocused = focusedKey === char;
                return (
                  <Pressable
                    key={char}
                    focusable={true}
                    hasTVPreferredFocus={rowIndex === 0 && char === 'A'}
                    android_disableSound={true}
                    onFocus={() => setFocusedKey(char)}
                    onBlur={() => setFocusedKey(null)}
                    onPress={() => handleKeyPress(char)}
                    style={[
                      styles.keyButton,
                      isFocused && styles.keyButtonFocused,
                    ]}
                  >
                    <Text
                      style={[
                        styles.keyText,
                        isFocused && styles.keyTextFocused,
                      ]}
                    >
                      {char}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Özel Kontrol Tuşları Sırası */}
          <View style={styles.keyboardRow}>
            {SPECIAL_KEYS.map((sKey) => {
              const isFocused = focusedKey === sKey;
              const isShiftActive = sKey === 'SHIFT' && isUppercase;

              let label = sKey;
              if (sKey === 'SHIFT') {
                label = isUppercase ? '⇧ ABC' : '⇩ abc';
              } else if (sKey === 'BOŞLUK') {
                label = '␣ Boşluk';
              } else if (sKey === 'SİL') {
                label = '⌫';
              } else if (sKey === 'TEMİZLE') {
                label = '✕';
              } else if (sKey === 'ARA') {
                label = '🔍 Ara';
              }

              return (
                <Pressable
                  key={sKey}
                  focusable={true}
                  android_disableSound={true}
                  onFocus={() => setFocusedKey(sKey)}
                  onBlur={() => setFocusedKey(null)}
                  onPress={() => handleKeyPress(sKey)}
                  style={[
                    styles.specialKeyButton,
                    isShiftActive && styles.shiftActiveButton,
                    isFocused && styles.keyButtonFocused,
                  ]}
                >
                  <Text
                    style={[
                      styles.specialKeyText,
                      isFocused && styles.keyTextFocused,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Hızlı Arama Önerileri */}
        <View style={styles.suggestionsRow}>
          <Text style={styles.suggestionsLabel}>Önerilenler:</Text>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              focusable={true}
              android_disableSound={true}
              onPress={() => {
                setQuery(s);
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                executeSearch(s);
              }}
              style={({ focused }) => [
                styles.suggestionPill,
                focused && styles.suggestionPillFocused,
              ]}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sağ Panel: Arama Sonuçları */}
      <View style={styles.rightPanel}>
        <Text style={styles.panelTitle}>
          {loading
            ? 'Aranıyor...'
            : hasSearched
            ? `Arama Sonuçları: "${query}" (${results.length})`
            : 'Popüler Arama Önerileri'}
        </Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Sonuçlar aranıyor...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            key="search-grid-3col"
            data={results}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsGrid}
            columnWrapperStyle={styles.columnWrapper}
            removeClippedSubviews={true}
            initialNumToRender={6}
            windowSize={5}
          />
        ) : hasSearched ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>
              "{query}" için arama sonucu bulunamadı.
            </Text>
            <Text style={styles.emptySubText}>
              Farklı bir kelime deneyebilir veya önerilenlere göz atabilirsiniz.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>
              Aramak istediğiniz filmi veya diziyi soldaki klavyeden yazın.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingLeft: 84,
    paddingRight: 20,
    paddingTop: 20,
  },
  leftPanel: {
    width: 270,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2D3038',
    marginBottom: 10,
  },
  searchInputBoxFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#20232B',
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  textInputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  clearInputButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#2A2D36',
  },
  clearInputButtonFocused: {
    backgroundColor: Colors.primary,
  },
  clearInputText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  keyboardContainer: {
    backgroundColor: '#13151A',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#20232A',
  },
  keyboardRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  keyButton: {
    flex: 1,
    height: 30,
    marginHorizontal: 1,
    backgroundColor: '#1E212A',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKeyButton: {
    flex: 1,
    height: 30,
    marginHorizontal: 1,
    backgroundColor: '#262933',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftActiveButton: {
    backgroundColor: 'rgba(229, 9, 20, 0.4)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  keyButtonFocused: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.08 }],
    elevation: 6,
    zIndex: 10,
  },
  keyText: {
    color: '#E0E3EB',
    fontSize: 11,
    fontWeight: '700',
  },
  specialKeyText: {
    color: '#E0E3EB',
    fontSize: 9,
    fontWeight: '700',
  },
  keyTextFocused: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
  },
  suggestionsLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
    marginBottom: 3,
  },
  suggestionPill: {
    backgroundColor: '#1A1C24',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#282B35',
  },
  suggestionPillFocused: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  rightPanel: {
    flex: 1,
    paddingLeft: 18,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  resultsGrid: {
    paddingBottom: 80,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
