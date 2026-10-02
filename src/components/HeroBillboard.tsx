import React, { useState, useEffect } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';
import { TVFocusableButton } from './TVFocusableButton';

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

interface HeroBillboardProps {
  item: MediaItem;
  onPlayPress: (item: MediaItem) => void;
  onDetailPress: (item: MediaItem) => void;
  onFocus?: (action: string) => void;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({
  item,
  onPlayPress,
  onDetailPress,
  onFocus,
}) => {
  const [imgUri, setImgUri] = useState<string>(
    item.backdropUrl || item.posterUrl || ''
  );

  // item değiştiğinde görsel URI'sini güncelle
  useEffect(() => {
    setImgUri(item.backdropUrl || item.posterUrl || '');
  }, [item.backdropUrl, item.posterUrl]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={
          imgUri
            ? {
                uri: imgUri,
                headers: IMAGE_HEADERS,
              }
            : undefined
        }
        style={styles.backgroundImage}
        resizeMode="cover"
        onError={() => {
          if (imgUri.endsWith('.webp')) {
            setImgUri(imgUri.replace(/\.webp$/, '.jpg'));
          }
        }}
      >
        <View style={styles.gradientOverlay}>
          <View style={styles.content}>
            <View style={styles.badgeRow}>
              <View style={styles.sourceTag}>
                <Text style={styles.sourceTagText}>ÖNE ÇIKAN</Text>
              </View>

              {item.imdbRating ? (
                <View style={styles.imdbTag}>
                  <Text style={styles.imdbStar}>★</Text>
                  <Text style={styles.imdbText}>IMDb {item.imdbRating}</Text>
                </View>
              ) : null}

              {item.year ? (
                <Text style={styles.metaYear}>{item.year}</Text>
              ) : null}

              {item.languageBadge ? (
                <View style={styles.langTag}>
                  <Text style={styles.langText}>{item.languageBadge}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {item.overview ? (
              <Text style={styles.overview} numberOfLines={3}>
                {item.overview}
              </Text>
            ) : null}

            {/* Butonlar sabit durur, odak zıplaması yapmaz */}
            <View style={styles.buttonRow}>
              <TVFocusableButton
                hasTVPreferredFocus={true}
                label="Hemen İzle"
                iconText="▶"
                variant="primary"
                onFocus={() => onFocus?.('Hemen İzle Butonu')}
                onPress={() => onPlayPress(item)}
              />

              <TVFocusableButton
                label="Detaylar"
                iconText="ℹ"
                variant="secondary"
                onFocus={() => onFocus?.('Detaylar Butonu')}
                onPress={() => onDetailPress(item)}
              />
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 380,
    width: '100%',
    backgroundColor: '#161920',
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.78)',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  content: {
    maxWidth: '65%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  sourceTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  imdbTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  imdbStar: {
    color: Colors.imdbGold,
    fontSize: 11,
    marginRight: 4,
  },
  imdbText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metaYear: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
  },
  langTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },
  overview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

