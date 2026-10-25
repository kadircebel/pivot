import React, { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';
import { TVFocusableCard } from './TVFocusableCard';

const CARD_WIDTH = 124;
const CARD_MARGIN = 14;
const CARD_STEP = CARD_WIDTH + CARD_MARGIN; // 138 DP

interface HorizontalMediaRowProps {
  title: string;
  items: MediaItem[];
  onCardPress: (item: MediaItem) => void;
  onCardFocus?: (item: MediaItem) => void;
}

const HorizontalMediaRowComponent: React.FC<HorizontalMediaRowProps> = ({
  title,
  items,
  onCardPress,
  onCardFocus,
}) => {
  const flatListRef = useRef<FlatList<MediaItem>>(null);

  // TV D-Pad Sağa/Sola Gezinme: Aktif seçili kartı daima satır başında (x = 0) sabit tut
  const handleCardFocus = useCallback(
    (item: MediaItem, index: number) => {
      const targetOffset = index * CARD_STEP;
      flatListRef.current?.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
      onCardFocus?.(item);
    },
    [onCardFocus]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <TVFocusableCard
        item={item}
        width={CARD_WIDTH}
        height={180}
        style={styles.cardSpacing}
        isFirst={index === 0}
        isLast={index === items.length - 1}
        onPress={onCardPress}
        onFocus={() => handleCardFocus(item, index)}
      />
    ),
    [onCardPress, handleCardFocus, items.length]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  if (!items || items.length === 0) return null;

  return (
    <TVFocusGuideView trapFocusRight={true} style={styles.container}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={15}
        windowSize={15}
        maxToRenderPerBatch={15}
        contentContainerStyle={styles.listContent}
      />
    </TVFocusGuideView>
  );
};

export const HorizontalMediaRow = React.memo(HorizontalMediaRowComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
    paddingHorizontal: 36, // Başlık kartlar ile tam 36px simetrik hizalama
  },
  listContent: {
    paddingLeft: 36, // Kartlar soldan 36px tamponla başlar -> Zoomlandığında asla menüye girmez ve yazılar kesilmez
    paddingVertical: 8,
    paddingRight: 800, // Listenin sonundaki kartların da satır başına kadar gelebilmesi için sağ tampon
  },
  cardSpacing: {
    marginRight: 14,
  },
});
