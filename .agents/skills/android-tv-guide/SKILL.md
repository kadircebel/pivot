---
name: android-tv-guide
description: >-
  Next - Start 4K TV Box ve Android TV için D-Pad odak navigasyonu, react-native-tvos entegrasyonu ve 2GB RAM bellek optimizasyonu rehberi.
---

# Android TV & D-Pad Geliştirme Kılavuzu

Bu kılavuz, uygulamanın **Next - Start 4K TV Box** (Amlogic S905Y4, 2GB LPDDR4, D-Pad Bluetooth Kumanda) üzerinde 60 FPS akıcılıkta, bellek taşması olmadan çalışmasını sağlamak için hazırlanmıştır.

---

## 1. D-Pad Uzaktan Kumanda ve Odak (Focus) Yönetimi

Android TV'de dokunmatik ekran yoktur. Tüm kullanıcı deneyimi D-pad odak halkasına (Focus Ring) dayanır.

### 1.1. `TouchableHighlight` / `Pressable` Odaklanma Modeli

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TVFocusableCardProps {
  onPress: () => void;
  children: React.ReactNode;
  hasTVPreferredFocus?: boolean;
}

export const TVFocusableCard: React.FC<TVFocusableCardProps> = ({
  onPress,
  children,
  hasTVPreferredFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        isFocused && styles.cardFocused,
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#1F1F1F',
    borderWidth: 2,
    borderColor: 'transparent',
    transform: [{ scale: 1.0 }],
  },
  cardFocused: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.06 }],
    zIndex: 10,
    elevation: 8,
  },
});
```

### 1.2. TV Tuş Olayları (TVEventHandler)

Gerektiğinde donanım tuşlarını dinlemek için:
```tsx
import { useTVEventHandler } from 'react-native';

useTVEventHandler((evt) => {
  if (evt.eventType === 'playPause') {
    togglePlay();
  } else if (evt.eventType === 'rewind') {
    seekBackward(10);
  } else if (evt.eventType === 'fastForward') {
    seekForward(10);
  }
});
```

---

## 2. 2GB LPDDR4 RAM & Grid Odaklanma Optimizasyonu (Next TV Box)

Next - Start 4K TV Box toplam 2GB RAM'e sahiptir. Sistem servisleri çıkarıldığında uygulamaya yaklaşık 250-350MB güvenli alan kalır.

### 2.1. FlatList Sanallaştırma ve Odaklanma Kuralı
```tsx
<FlatList
  data={movies}
  keyExtractor={(item, index) => `${item.id}-${index}`}
  renderItem={renderItem}
  numColumns={4}
  removeClippedSubviews={false}      // KRİTİK: TV'de true yapılırsa ekran dışı kartlar detached olur ve kumandada 2-tık gecikmesi/odak kaybı yaşanır!
  maxToRenderPerBatch={8}            // Her karede 8 kart render et
  windowSize={11}                    // Akıcı kaydırma için güvenli pencere
  initialNumToRender={12}            // İlk ekranda 3 satır (12 kart)
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={renderFooter}
/>
```

### 2.2. D-Pad Çift Tetiklemeli Sonsuz Kaydırma / Sayfalama (Dual-Trigger Infinite Scroll)

Android TV uzaktan kumandası ile gezinirken `FlatList`'in standart `onEndReached` callback'i her zaman güvenilir tetiklenmeyebilir (çünkü kumanda kaydırması odak zıplamalarıyla gerçekleşir).

**Çözüm: Çift Tetikleme (Dual-Trigger)**
1. **Odak Tetikleyici (`handleItemFocus`)**: Kullanıcı listenin son 2 satırındaki kartlardan birine odaklandığında (`index >= items.length - 8`), sıradaki sayfa arka planda erkenden (`loadMore()`) çekilmeye başlanır. Kullanıcı son satıra inene kadar yeni sayfa listeye eklenmiş olur.
2. **Liste Sonu Tetikleyici (`onEndReached`)**: Eş zamanlı olarak FlatList'in `onEndReached` desteği aktif bırakılır.
3. **Yarış Durumu Koruması (`isFetchingRef`)**: `useRef(false)` ile eşzamanlı çift istekler engellenir, `Set` ile mükerrer kartlar elenir.

```tsx
const isFetchingRef = useRef<boolean>(false);
const pageRef = useRef<number>(1);
const hasNextRef = useRef<boolean>(true);

const loadMore = useCallback(async () => {
  if (isFetchingRef.current || !hasNextRef.current) return;
  isFetchingRef.current = true;
  setLoadingMore(true);

  const nextPage = pageRef.current + 1;
  try {
    const res = await provider.getMovies(nextPage);
    if (res && res.items && res.items.length > 0) {
      setMovies((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const newUnique = res.items.filter((m) => !existing.has(m.id));
        return [...prev, ...newUnique];
      });
      pageRef.current = res.currentPage;
      hasNextRef.current = res.hasNextPage;
    } else {
      hasNextRef.current = false;
    }
  } finally {
    isFetchingRef.current = false;
    setLoadingMore(false);
  }
}, [provider]);

const handleItemFocus = useCallback((index: number) => {
  const rowIndex = Math.floor(index / 5);
  if (rowIndex !== lastRowIndexRef.current) {
    lastRowIndexRef.current = rowIndex;
    flatListRef.current?.scrollToOffset({ offset: rowIndex * ROW_HEIGHT, animated: true });
  }
  if (index >= movies.length - 6 && !isFetchingRef.current && hasNextRef.current) {
    loadMore();
  }
}, [loadMore, movies.length]);

// Sayfa eklendiğinde Android ScrollView.onLayout'un satır hizalamasını bozmasını önle:
useEffect(() => {
  if (lastRowIndexRef.current > 0) {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: lastRowIndexRef.current * ROW_HEIGHT,
        animated: true,
      });
    }, 50);
    return () => clearTimeout(timer);
  }
}, [movies.length]);
```

### 2.3. Görsel Önbellek Kuralı
- Poster görsellerinde `webp` formatı tercih edilmelidir.
- Boyutlandırma: TV ekranında posterler yaklaşık `180x270px` olduğundan, gereksiz devasa 4K afişler yüklenmemelidir.

### 2.4. Çok Kolonlu Grid D-Pad Odaklanma & Ekran Kesilmesini Önleme (`scrollToOffset`)
- **Sorun**: Android TV `ScrollView`, bir kartın sadece üstteki %10'luk kenarı ekrana girdiğinde dahi o karta odağı verir fakat kartı ekranın içine tam kaydırmaz. Kart ekranın dibinde kesik kalır, kullanıcının onu görebilmek için mecburen 2. kez aşağı tuşuna basması gerekir.
- **Kural**:
  1. Çok kolonlu (`numColumns > 1`) FlatList'lerde `scrollToIndex` ve `getItemLayout` KULLANILMAZ (React Native'in satır/eleman indeksi karışıklığı sebebiyle).
  2. Bunun yerine doğrudan piksel hesaplamalı `scrollToOffset` kullanılır:
     ```tsx
     const ROW_HEIGHT = 108; // 92px kart + 16px gap
     const handleCategoryFocus = useCallback((index: number) => {
       const rowIndex = Math.floor(index / 3);
       const targetOffset = Math.max(0, (rowIndex - 1) * ROW_HEIGHT);
       listRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
     }, []);
     ```
  3. Kart odak stili: Beyaz border KESİNLİKLE YOKTUR (`borderWidth: 0`), 150ms donanım hızlandırmalı smooth zoom (`scale: 1.06`) ve saf Netflix Kırmızısı (`#E50914`) arka plan uygulanır.
  4. Liste altında bol tampon boşluk (`paddingBottom: 240px`) bırakılır.

### 2.5. FlatList Yükseklik Çökmesi (Height Collapse) ve Menü Kesilmesini Önleme Standardı
- **Sorun 1 (Siyah Ekran / 2px Çökme)**:
  - Bir ekranda başlık (`header`) ve kardeş bileşenler varken `<FlatList>` üzerine `style={{ flex: 1 }}` veya benzeri inline flex stili verildiğinde, Android React Native Yoga/ReactScrollView motoru dikey yüksekliği hesaplayamaz. ScrollView yüksekliğini 1-2 piksele sıkıştırarak veriler çekilmiş olsa dahi ekranın tamamen siyah kalmasına neden olur.
  - **Çözüm**: `<FlatList>` üzerinde `style={{ flex: 1 }}` ASLA kullanılmaz. Boşluklar yalnızca `contentContainerStyle` ile verilir. Ana taşıyıcı için `contentArea: { flex: 1, height: '100%' }` tanımlanır.
- **Sorun 2 (Sol Menü Altında Harf Kesilmesi & Dengesiz Grid)**:
  - Kartlar sol menünün (`x = 64`) hemen dibinden başladığında, odaklanınca zoom efektiyle sola taşarak sol menünün (`TVSidebar` zIndex: 100 opak kutu) altına girer ve başlık metninin ilk harfi (örn: *Otis* -> *tis*) dikey bir çizgiyle kesilir. Ayrıca liste sağ kenardan çok uzak, sola yapışık kalır.
  - **Çözüm (Simetrik 5 Kolon Standardı)**:
    - 1080p Android TV genişliği **960 DP**'dir. Sol menü **64 DP** kaplar, geriye **896 DP** kalır.
    - Kart ölçüleri: `width: 144`, `height: 180` (ekrana dikeyde 2 tam satır sığar).
    - Kolon aralığı: `columnWrapper: { gap: 24, marginBottom: 16 }` ($5 \times 144 + 4 \times 24 = 816\text{ DP}$).
    - Kalan 80 DP, sol ve sağa eşit dağıtılarak `header` ve `gridContent` için `paddingHorizontal: 40` olarak sabitlenir ($40 + 816 + 40 = 896\text{ DP}$).
    - İlk kart sol menüden tam 40 DP uzakta başlar, zoomlandığında menünün altına giremez; liste ekranın sağı ve solu arasında tam simetrik ortalanır.
- **Sorun 3 (Canlı Ağ Motoruna Müdahale Yasağı)**:
  - UI veya CSS kaynaklı görüntüleme problemlerinde çalışan `HdFilmCehennemiProvider.ts` koduna keyfi `AbortController` veya yapay timeout eklenerek canlı istekler engellenmemelidir.

---

## 3. Donanım Video Kodekleri (Amlogic S905Y4)

Cihaz donanımsal olarak şu formatları destekler:
- AV1 MP-10@L5.1 4Kx2K@60fps
- VP9 Profile-2 4Kx2K@60fps
- H.265 HEVC MP-10@L5.1 4Kx2K@60fps
- H.264 AVC HP@L5.1 4Kx2K@30fps

Bu nedenle video akışları (`.m3u8` / `.mp4`) doğrudan ExoPlayer'a paslanmalı, yazılımsal CPU decode yapılmamalıdır.
