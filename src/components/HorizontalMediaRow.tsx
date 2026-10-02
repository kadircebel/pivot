import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { MediaItem } from '../types/media';
import { TVFocusableCard } from './TVFocusableCard';

interface HorizontalMediaRowProps {
  title: string;
  items: MediaItem[];
  onCardPress: (item: MediaItem) => void;
  onCardFocus?: (item: MediaItem) => void;
}

export const HorizontalMediaRow: React.FC<HorizontalMediaRowProps> = ({
  title,
  items,
  onCardPress,
  onCardFocus,
}) => {
  const renderCard = useCallback(
    ({ item }: { item: MediaItem }) => (
      <TVFocusableCard
        item={item}
        onPress={onCardPress}
        onFocus={onCardFocus}
      />
    ),
    [onCardPress, onCardFocus]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        data={items}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    paddingHorizontal: 36,
  },
  rowTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingVertical: 8,
    paddingRight: 40,
  },
});
