import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
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

  // Android standardı: Başlangıçta ilk harf BÜYÜK, sonraki harfler KÜÇÜK
  const [isUppercase, setIsUppercase] = useState(true);

  const provider = ProviderRegistry.getActiveProvider();

  // Klavyenin anlık büyük/küçük harf görünümü
  const currentKeyboard = useMemo(() => {
    return RAW_KEYBOARD.map((row) =>
      row.map((k) => {
        // Rakam ve tire değişmez
        if (/\d|-/.test(k)) return k;
        return isUppercase ? k.toLocaleUpperCase('tr-TR') : k.toLocaleLowerCase('tr-TR');
      })
    );
  }, [isUppercase]);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;
      setLoading(true);
      setHasSearched(true);
      try {
        const res = await provider.search(q);
        setResults(res.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'SHIFT') {
        // Kullanıcı manuel olarak büyük/küçük harfi tersine çevirebilir
        setIsUppercase((prev) => !prev);
      } else if (key === 'BOŞLUK') {
        setQuery((prev) => prev + ' ');
        // Boşluktan sonra gelen yeni kelimenin ilk harfi Android standardı gereği büyük başlar
        setIsUppercase(true);
      } else if (key === 'SİL') {
        setQuery((prev) => {
          const next = prev.slice(0, -1);
          if (next.length === 0 || next.endsWith(' ')) {
            setIsUppercase(true);
          }
          return next;
        });
      } else if (key === 'TEMİZLE') {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setIsUppercase(true);
      } else if (key === 'ARA') {
        handleSearch(query);
      } else {
        const newQuery = query + key;
        setQuery(newQuery);

        // Android standardı: İlk harf yazıldıktan sonra devam eden harfler otomatik küçük olur!
        if (isUppercase) {
          setIsUppercase(false);
        }

        // 3 karakterden sonra otomatik arama yap
        if (newQuery.trim().length >= 3) {
          handleSearch(newQuery);
        }
      }
    },
    [handleSearch, isUppercase, query]
  );

  const renderCard = useCallback(
    ({ item }: { item: MediaItem }) => (
      <TVFocusableCard
        item={item}
        width={140}
        height={210}
        onPress={() => onSelectMovie?.(item)}
      />
    ),
    [onSelectMovie]
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        {/* Arama Kutusu */}
        <View style={styles.searchInputBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchQueryText} numberOfLines={1}>
            {query || 'Film veya dizi adı yazın...'}
          </Text>
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
                label = '⌫ Sil';
              } else if (sKey === 'TEMİZLE') {
                label = '✕ Temizle';
              } else if (sKey === 'ARA') {
                label = '🔍 Ara';
              }

              return (
                <Pressable
                  key={sKey}
                  focusable={true}
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
              onPress={() => {
                setQuery(s);
                handleSearch(s);
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
            ? `Arama Sonuçları (${results.length})`
            : 'Popüler Arama Önerileri'}
        </Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsGrid}
          />
        ) : hasSearched ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>"{query}" için içerik bulunamadı.</Text>
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
    paddingRight: 24,
    paddingTop: 24,
  },
  leftPanel: {
    width: '46%',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C22',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D3038',
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchQueryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  keyboardContainer: {
    backgroundColor: '#15171D',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22252E',
  },
  keyboardRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  keyButton: {
    flex: 1,
    height: 40,
    marginHorizontal: 2,
    backgroundColor: '#22252E',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKeyButton: {
    flex: 1,
    height: 40,
    marginHorizontal: 2,
    backgroundColor: '#282C38',
    borderRadius: 6,
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
    elevation: 4,
  },
  keyText: {
    color: '#E0E3EB',
    fontSize: 14,
    fontWeight: '700',
  },
  specialKeyText: {
    color: '#E0E3EB',
    fontSize: 11,
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
    marginTop: 12,
  },
  suggestionsLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  suggestionPill: {
    backgroundColor: '#1E2028',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2D303A',
  },
  suggestionPillFocused: {
    backgroundColor: '#2A2D3A',
    borderColor: Colors.primary,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  rightPanel: {
    flex: 1,
    paddingLeft: 20,
  },
  panelTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsGrid: {
    paddingBottom: 40,
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
    fontSize: 14,
    textAlign: 'center',
  },
});
