import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MovieDetailScreen } from '../screens/MovieDetailScreen';
import { MoviesScreen } from '../screens/MoviesScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SeriesScreen } from '../screens/SeriesScreen';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';
import { TVSidebar } from './TVSidebar';

export type SectionType = 'search' | 'home' | 'movies' | 'categories' | 'series';

export const TVMainContainer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionType>('home');
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);

  const handleSelectSection = useCallback((section: SectionType) => {
    setActiveSection(section);
  }, []);

  const handleSelectMovie = useCallback((item: MediaItem) => {
    setSelectedMovie(item);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedMovie(null);
  }, []);

  // Eğer bir film seçilmişse Film Detay ve Oynatıcı ekranını göster
  if (selectedMovie) {
    return (
      <View style={styles.fullscreenDetail}>
        <MovieDetailScreen
          movie={selectedMovie}
          onBack={handleBackFromDetail}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ana İçerik Ekranı (İlk odak önce ana içerik ve hero banner'a verilir) */}
      <View style={styles.contentArea}>
        {activeSection === 'home' && (
          <HomeScreen onSelectMovie={handleSelectMovie} />
        )}
        {activeSection === 'movies' && (
          <MoviesScreen onSelectMovie={handleSelectMovie} />
        )}
        {activeSection === 'categories' && (
          <CategoriesScreen onSelectMovie={handleSelectMovie} />
        )}
        {activeSection === 'series' && (
          <SeriesScreen onSelectSeries={handleSelectMovie} />
        )}
        {activeSection === 'search' && (
          <SearchScreen onSelectMovie={handleSelectMovie} />
        )}
      </View>

      {/* Sol TV Navigasyon Menüsü (D-pad ile sola gidildiğinde açılır) */}
      <TVSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    flexDirection: 'row',
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fullscreenDetail: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
