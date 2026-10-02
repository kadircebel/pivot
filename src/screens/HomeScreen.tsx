import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TVFocusGuideView,
  View,
} from 'react-native';
import { HeroBillboard } from '../components/HeroBillboard';
import { HorizontalMediaRow } from '../components/HorizontalMediaRow';
import { TVFocusableButton } from '../components/TVFocusableButton';
import { HomeData } from '../core/interfaces/IMovieSourceProvider';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

const INITIAL_BILLBOARD: MediaItem = {
  id: 'snap-slider-1',
  title: 'Örümcek Adam Yepyeni Bir Gün',
  originalTitle: 'Spider Man Brand New Day',
  posterUrl: 'https://www.hdfilmcehennemi.nl/images/list/poster/spider-man-brand-new-day.webp',
  backdropUrl: 'https://www.hdfilmcehennemi.nl/images/list/cover/spider-man-brand-new-day.webp',
  year: '2026',
  imdbRating: '8.0',
  languageBadge: 'Türkçe Altyazılı',
  type: 'movie',
  detailUrl: 'https://www.hdfilmcehennemi.nl/spider-man-brand-new-day/',
  overview:
    'Örümcek Adam Yepyeni Bir Gün - Peter Parker şehri tehdit eden yeni ve karanlık güçlere karşı destansı bir mücadele veriyor.',
};

const INITIAL_HOME_DATA: HomeData = {
  featured: [INITIAL_BILLBOARD],
  sections: [],
};

interface HomeScreenProps {
  onSelectMovie?: (item: MediaItem) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMovie }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [homeData, setHomeData] = useState<HomeData | null>(INITIAL_HOME_DATA);
  const [activeBillboardItem, setActiveBillboardItem] = useState<MediaItem | null>(INITIAL_BILLBOARD);
  const [statusMessage, setStatusMessage] = useState<string>('Hazır');

  const provider = ProviderRegistry.getActiveProvider();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatusMessage('Veriler çekiliyor...');
    try {
      const data = await provider.getHome();
      setHomeData(data);
      if (data.featured && data.featured.length > 0) {
        setActiveBillboardItem(data.featured[0]);
      }
      setStatusMessage('Veriler yüklendi');
    } catch {
      setStatusMessage('Bağlantı hatası, önbellek kullanılıyor');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCardFocus = useCallback((item: MediaItem) => {
    setStatusMessage(`Odak: ${item.title}`);
    setActiveBillboardItem((prev) => ({
      ...item,
      overview:
        item.overview ||
        `${item.title} (${item.year || ''}) - ${item.languageBadge || 'Türkçe Dublaj & Altyazılı'}. HD kalitede kesintisiz izleyebilirsiniz.`,
    }));
  }, []);

  const handleCardPress = useCallback((item: MediaItem) => {
    setStatusMessage(`Seçildi: ${item.title}`);
    onSelectMovie?.(item);
  }, [onSelectMovie]);

  const handlePlayPress = useCallback((item: MediaItem) => {
    setStatusMessage(`Oynatılıyor: ${item.title}`);
    onSelectMovie?.(item);
  }, [onSelectMovie]);

  const handleDetailPress = useCallback((item: MediaItem) => {
    setStatusMessage(`Detay: ${item.title}`);
    onSelectMovie?.(item);
  }, [onSelectMovie]);

  return (
    <View style={styles.screen}>
      {/* Üst TV Başlık ve Durum Çubuğu */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>PIVOT</Text>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>Kaynak: {provider.name}</Text>
          </View>
        </View>

        {/* Kumanda ve Odak Durumu Bildirimi */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      </View>

      {loading && !homeData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>HDFilmCehennemi içerikleri yükleniyor...</Text>
        </View>
      ) : homeData ? (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          focusable={false}
        >
          {/* Netflix Hero Billboard */}
          {activeBillboardItem ? (
            <TVFocusGuideView autoFocus={true}>
              <HeroBillboard
                item={activeBillboardItem}
                onPlayPress={handlePlayPress}
                onDetailPress={handleDetailPress}
                onFocus={(action) => setStatusMessage(`Odak: ${action}`)}
              />
            </TVFocusGuideView>
          ) : null}

          {/* Sitenin Sekmelerinden Oluşturulan Netflix Satırları */}
          {homeData.sections.map((section) => (
            <TVFocusGuideView key={section.id} autoFocus={true}>
              <HorizontalMediaRow
                title={section.title}
                items={section.items}
                onCardPress={handleCardPress}
                onCardFocus={handleCardFocus}
              />
            </TVFocusGuideView>
          ))}

          {/* Alt Bilgi */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Adım 3c: Sol Menüden Filmler, Kategoriler, Diziler ve Arama'ya Geçebilirsiniz
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>İçerik Yüklenemedi</Text>
          <TVFocusableButton
            label="Yeniden Dene"
            iconText="↻"
            onPress={loadData}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingLeft: 68, // Sol menü (Sidebar) genişliği kadar içerik kaydırma
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginRight: 16,
  },
  sourceBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#383838',
  },
  sourceText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusText: {
    color: Colors.imdbGold,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  footer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
