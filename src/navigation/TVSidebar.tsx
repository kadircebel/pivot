import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
import { Colors } from '../theme/colors';

export type SectionId = 'search' | 'home' | 'movies' | 'categories' | 'series';

export interface TVMenuItem {
  id: SectionId;
  label: string;
  icon: string;
}

export const MENU_ITEMS: TVMenuItem[] = [
  { id: 'search', label: 'Arama', icon: '🔍' },
  { id: 'home', label: 'Anasayfa', icon: '🏠' },
  { id: 'movies', label: 'Filmler', icon: '🎬' },
  { id: 'categories', label: 'Kategoriler', icon: '📁' },
  { id: 'series', label: 'Diziler', icon: '📺' },
];

interface TVSidebarProps {
  activeSection: SectionId;
  onSelectSection: (sectionId: SectionId) => void;
  onFocusChange?: (isSidebarFocused: boolean) => void;
}

export const TVSidebar: React.FC<TVSidebarProps> = ({
  activeSection,
  onSelectSection,
  onFocusChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<SectionId | null>(null);

  // Menü elemanlarının düğüm etiketleri (Focus Trapping / Dikey Kilit İçin)
  const itemRefs = useRef<(View | null)[]>([]);
  const [nodeTags, setNodeTags] = useState<(number | undefined)[]>([]);

  // Pürüzsüz açılıp kapanma animasyonu
  const widthAnim = useRef(new Animated.Value(64)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isExpanded ? 230 : 64,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onFocusChange?.(isExpanded);
  }, [isExpanded, onFocusChange, widthAnim]);

  // Düğüm etiketlerini güncelle
  const updateNodeTags = useCallback(() => {
    const tags = itemRefs.current.map((ref) => (ref ? findNodeHandle(ref) || undefined : undefined));
    setNodeTags(tags);
  }, []);

  const handleItemFocus = useCallback(
    (item: TVMenuItem) => {
      setIsExpanded(true);
      setFocusedItemId(item.id);
    },
    []
  );

  const handleItemBlur = useCallback(() => {
    setIsExpanded(false);
    setFocusedItemId(null);
  }, []);

  return (
    <Animated.View
      style={[
        styles.sidebar,
        { width: widthAnim },
        isExpanded && styles.sidebarExpanded,
      ]}
    >
      {/* Üst Logo */}
      <View style={styles.topLogoSection}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>P</Text>
        </View>
        {isExpanded ? (
          <Text style={styles.logoTitle} numberOfLines={1}>
            PIVOT
          </Text>
        ) : null}
      </View>

      {/* Menü Öğeleri Listesi */}
      <View style={styles.menuItemsContainer} onLayout={updateNodeTags}>
        {MENU_ITEMS.map((item, index) => {
          const isActive = activeSection === item.id;
          const isItemFocused = focusedItemId === item.id;

          // Dikey kilit: Yukarı/aşağı basıldığında asla başka ekrana zıplamaz
          const prevTag = index > 0 ? nodeTags[index - 1] : nodeTags[index];
          const nextTag = index < MENU_ITEMS.length - 1 ? nodeTags[index + 1] : nodeTags[index];
          const selfTag = nodeTags[index];

          return (
            <Pressable
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              hasTVPreferredFocus={false}
              focusable={true}
              // Dikey kilit: Menü içinde yukarı/aşağı gitmeyi garantiler
              nextFocusUp={prevTag}
              nextFocusDown={nextTag}
              nextFocusLeft={selfTag} // Sola basınca menü dışına çıkamaz
              onFocus={() => handleItemFocus(item)}
              onBlur={handleItemBlur}
              onPress={() => onSelectSection(item.id)}
              style={[
                styles.menuItem,
                isActive && styles.menuItemActive,
                isItemFocused && styles.menuItemFocused,
              ]}
            >
              {/* Aktif sekme kırmızı dikey çizgi göstergesi */}
              {isActive ? <View style={styles.activeIndicator} /> : null}

              {/* Menü kapalıyken şık, transparan, background ile bütünleşik ikon */}
              {!isExpanded ? (
                <Text style={[styles.itemIcon, isActive && styles.itemIconActive]}>
                  {item.icon}
                </Text>
              ) : (
                /* Menü açıldığında ikonlar kaybolur, sade ve şık metinler kalır */
                <Text
                  style={[
                    styles.itemLabel,
                    isActive && styles.labelActive,
                    isItemFocused && styles.labelFocused,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Menü açıkken altta rehber */}
      {isExpanded ? (
        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>▶ Sağa bas: İçeriğe Dön</Text>
        </View>
      ) : (
        <View style={styles.bottomPlaceholder} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#121212', // Kapalıyken arkaplanla birebir aynı renkte bütünleşik
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 100,
    elevation: 20,
    paddingVertical: 24,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  sidebarExpanded: {
    backgroundColor: '#18191E', // Açıldığında hafif açılan zarif koyu panel
    borderRightColor: '#282A32',
    elevation: 24,
  },
  topLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  logoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 12,
    letterSpacing: 1,
  },
  menuItemsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)', // Aktif öğe için hafif kırmızı saydamlık
  },
  menuItemFocused: {
    // Beyaz arkaplan kaldırıldı! Koyu temaya tam uyumlu zarif odak arkaplanı
    backgroundColor: '#262933',
    borderWidth: 1,
    borderColor: '#3D4252',
    elevation: 6,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  itemIcon: {
    fontSize: 18,
    width: 32,
    textAlign: 'center',
    opacity: 0.45, // Kapalıyken transparan, arkaplana monte edilmiş gibi durur
  },
  itemIconActive: {
    opacity: 0.9,
  },
  itemLabel: {
    color: '#8E929E',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingLeft: 6,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bottomHint: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomPlaceholder: {
    height: 24,
  },
});
