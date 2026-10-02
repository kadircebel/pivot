import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';

const IMAGE_HEADERS = {
  'Referer': 'https://www.hdfilmcehennemi.nl/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':
    'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'sec-fetch-dest': 'image',
  'sec-fetch-mode': 'no-cors',
  'sec-fetch-site': 'same-origin',
};

interface TVFocusableCardProps {
  item: MediaItem;
  width?: number;
  height?: number;
  hasTVPreferredFocus?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onPress: (item: MediaItem) => void;
  onFocus?: (item: MediaItem) => void;
}

export const TVFocusableCard: React.FC<TVFocusableCardProps> = ({
  item,
  width = 160,
  height = 240,
  hasTVPreferredFocus = false,
  isFirst = false,
  isLast = false,
  onPress,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentUri, setCurrentUri] = useState<string>(item.posterUrl || '');
  const [nodeTag, setNodeTag] = useState<number | undefined>(undefined);

  // Smooth Zoom (Büyüme) Animasyonu
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: isFocused ? 1.07 : 1.0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  // item değiştiğinde görsel URI'sini güncelle
  useEffect(() => {
    setCurrentUri(item.posterUrl || '');
    setImageError(false);
  }, [item.posterUrl]);

  const handleImageError = useCallback(() => {
    if (currentUri && currentUri.endsWith('.webp')) {
      setCurrentUri(currentUri.replace(/\.webp$/, '.jpg'));
    } else {
      setImageError(true);
    }
  }, [currentUri]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.(item);
  }, [item, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusable={true}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={handlePress}
      style={[
        styles.pressableWrapper,
        { width },
        isFocused && styles.pressableFocused,
      ]}
    >
      <Animated.View
        style={[
          styles.animatedCard,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.animatedCardFocused,
        ]}
      >
        <View style={[styles.posterWrapper, { height }]}>
          {!imageError && currentUri ? (
            <Image
              source={{
                uri: currentUri,
                headers: IMAGE_HEADERS,
              }}
              style={styles.posterImage}
              resizeMode="cover"
              onError={handleImageError}
            />
          ) : (
            <View style={styles.fallbackPoster}>
              <Text style={styles.fallbackIcon}>🎬</Text>
              <Text style={styles.fallbackText} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          )}

          {/* IMDb Puanı */}
          {item.imdbRating ? (
            <View style={styles.imdbBadge}>
              <Text style={styles.imdbStar}>★</Text>
              <Text style={styles.imdbText}>{item.imdbRating}</Text>
            </View>
          ) : null}

          {/* Dil Rozeti */}
          {item.languageBadge ? (
            <View style={styles.languageBadge}>
              <Text style={styles.languageText} numberOfLines={1}>
                {item.languageBadge}
              </Text>
            </View>
          ) : null}

          {/* Odaklandığında Ortada Oynat Butonu */}
          {isFocused ? (
            <View style={styles.focusedOverlay}>
              <View style={styles.playButtonCircle}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text
          style={[styles.title, isFocused && styles.titleFocused]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {item.year ? (
          <Text style={styles.metaText}>{item.year}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressableWrapper: {
    marginRight: 16,
    paddingVertical: 8,
  },
  pressableFocused: {
    zIndex: 10,
  },
  animatedCard: {
    width: '100%',
    // Beyaz border tamamen kaldırıldı! Yalnızca smooth zoom ve zIndex artışı var.
    borderWidth: 0,
    borderColor: 'transparent',
  },
  animatedCardFocused: {
    zIndex: 10,
    elevation: 8,
  },
  posterWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E2026',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  fallbackPoster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 8,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  fallbackText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  imdbBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(229, 160, 13, 0.4)',
  },
  imdbStar: {
    color: Colors.imdbGold,
    fontSize: 10,
    marginRight: 3,
  },
  imdbText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  languageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '85%',
  },
  languageText: {
    color: '#E5E5E5',
    fontSize: 10,
    fontWeight: '600',
  },
  focusedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 3,
  },
  title: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  titleFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});

