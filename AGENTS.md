# Antigravity Workspace Kuralları (AGENTS.md)

Bu dosya, **MovieTvApp** projesinde çalışan yapay zeka asistanının uymak zorunda olduğu katı kuralları ve ilkeleri tanımlar.

---

## 1. Katı Adım ve Kullanıcı Onay Kuralı (Madde 3g)

- Proje 6 ana geliştirme fazına ayrılmıştır:
  - **Adım 3a**: Emülatörde uygulama açılışı ve TV D-pad odaklanma temeli
  - **Adım 3b**: Anasayfa web sitesi parse işlemi ve Netflix UI gösterimi
  - **Adım 3c**: Navigasyon ve bölümler (Anasayfa, Filmler, Kategoriler, Diziler, Arama)
  - **Adım 3d**: Filmler sayfası kataloğu ve sayfalama
  - **Adım 3e**: Diziler sayfası kataloğu, sayfalama ve sezon/bölüm detayları
  - **Adım 3f**: Video oynatıcı entegrasyonu ve reklamların temizlenmesi
- **KURAL**: Asistan hiçbir şekilde bir sonraki adıma KENDİLİĞİNDEN GEÇMEZ. Mevcut adım tamamlandığında kod doğrulanır, kullanıcıya sunulur ve **KULLANICIDAN AÇIK ONAY GELMEDİKÇE BİR SONRAKİ ADIMA BAŞLANMAZ.**

---

## 1.1. Emülatör ve Test Süreci Yönetimi (Kullanıcı İş Birliği)

- **Aktif Emülatör**: Kullanıcı `Television_1080p` AVD emülatörünü başlatmış durumdadır.
- **Test Görev Dağılımı**: UI, D-pad kumanda ve görsel testleri çoğunlukla **KULLANICI** bizzat emülatör üzerinde gerçekleştirecektir.
- **Zaman Tasarrufu ve Tekil Test Kuralı**:
  - Asistan yalnızca kritik gördüğü temel derleme, tip kontrolü veya kod doğrulamalarını yapar.
  - Uzun süren test/build süreçleri gereksiz yere tekrarlanmaz; 1 kez yapılır, bulgular ve sonuçlar not alınır ve sonraki adımlarda bu notlar referans alınarak hızlı ilerlenir.

---

## 1.2. Git ve Versiyon Kontrolü Yönetimi (Yalnızca Kullanıcı)

- **KATI KURAL**: Asistan KESİNLİKLE hiçbir git komutunu (`git add`, `git commit`, `git push`, `git pull`, `git rebase`, `git checkout` vb.) terminalde KENDİLİĞİNDEN ÇALIŞTIRMAZ.
- Tüm git, commit ve GitHub push/pull işlemleri **YALNIZCA VE BİZZAT KULLANICI** tarafından terminalden yürütülür.
- Asistan yalnızca kullanıcı açıkça talep ettiğinde hangi komutların çalıştırılması gerektiğine dair metin tabanlı öneri veya commit mesajı sunabilir.

---

## 2. Donanım ve Platform Kuralları (Next - Start 4K TV Box & Android TV)

1. **D-Pad Odaklanma Zorunluluğu (100% Remote-Driven)**:
   - Cihaz dokunmatik ekrana sahip DEĞİLDİR. Yalnızca Bluetooth uzaktan kumanda D-Pad (Yukarı, Aşağı, Sol, Sağ, Tamam/Select, Geri) tuşları ile kontrol edilir.
   - Her tıklanabilir bileşen `focusable={true}` olmalı, odaklandığında görsel olarak belirgin bir değişim göstermelidir (`transform: [{ scale: 1.05-1.08 }]`, beyaz kalın kenarlık `#FFFFFF`, zIndex artışı).
   - Odak tuzaklarına (focus traps) ve odak kaybolmalarına (focus loss) izin verilmez.
2. **2GB RAM Bellek Bütçesi**:
   - `FlatList` ve listelerde mutlaka `removeClippedSubviews={true}`, düşük `windowSize` (3-5), `initialNumToRender` (4-6) kullanılmalıdır.
   - Resim önbelleği belleği şişirmemeli, optimize edilmiş `webp` formatları tercih edilmelidir.
   - Ekranlar arası geçişte unmount edilen bileşenlerin abonelikleri ve dinleyicileri (event listeners) mutlaka temizlenmelidir.
3. **Mali-G31 GPU Koruması**:
   - Karmaşık gölgeler (`shadowRadius > 10`), aşırı `backdrop-filter: blur`, iç içe opaklık animasyonlarından kaçınılmalıdır.

---

## 3. Çoklu Kaynak (Multi-Source) Mimari Kuralları

1. **Arayüzden Bağımsızlık**:
   - Hiçbir UI ekranı veya bileşeni (`HomeScreen`, `PosterCard` vb.) `hdfilmcehennemi.nl` sitesinin adını, CSS seçicilerini veya özel mantığını doğrudan İÇEREMEZ.
   - Tüm veri çekme işlemleri `IMovieSourceProvider` arayüzü ve `ProviderRegistry` üzerinden yürütülmelidir.
2. **Varsayılan Sağlayıcı**:
   - `HdFilmCehennemiProvider` varsayılan aktif sağlayıcıdır.
   - Arama adresi: `GET https://www.hdfilmcehennemi.nl/search/?q={query}`
   - Filmler adresi: `https://www.hdfilmcehennemi.nl/category/film-izle-2/` (sayfalama: `/load/page/{page}/categories/film-izle-2/`)
   - Diziler adresi: `https://www.hdfilmcehennemi.nl/yabancidiziizle-5/` (sayfalama: `/load/page/{page}/home-series/`)

---

## 4. Netflix Tasarım ve Kullanıcı Deneyimi Kuralları

1. **Kullanıcı Profili Yoktur**:
   - Uygulama açılışında kullanıcı profili seçimi (Kim izliyor?) ekranı ASLA OLMAYACAKTIR. Doğrudan anasayfaya geçilir.
2. **Renk ve Kontrast**:
   - Arka plan daima `#121212` veya `#0F0F0F` saf koyu renktir.
   - Aktif odak kenarlığı `#FFFFFF`, buton aksan rengi `#E50914` (Netflix Kırmızısı) olmalıdır.
3. **Bileşen Düzeni**:
   - Üstte büyük öne çıkan içerik (Billboard Hero Banner).
   - Altında yatay kaydırılabilir satırlar (Horizontal Media Rows).
4. **Anasayfa Yatay Satırlarında Sabit Satır Başı Odaklanma (Carousel / Conveyor UX)**:
   - Anasayfadaki yatay medya satırlarında (`HorizontalMediaRow`), kumandadan sağ oka basıldıkça odağın ekranın sağına doğru gezmesi engellenir.
   - Aktif seçili kart daima satır başında (`x = 0`) sabit tutulur; kullanıcı sağa bastıkça liste `CARD_STEP = 138` piksel kayarak bir sonraki kartı satır başına taşır (`flatListRef.current?.scrollToOffset({ offset: index * CARD_STEP, animated: true })`).
   - Listenin sonundaki kartların da satır başına gelebilmesi için `paddingRight: 800` sağ tamponu zorunludur.
5. **Yatay Satır Odak Sınırları ve Menü Geçiş Kuralı (Anti-Jumping)**:
   - **Satır Sonu Sağ Ok Koruması**: Slider sonundaki karttayken sağ oka basıldığında odağın alt satıra atlaması kesinlikle engellenir. `HorizontalMediaRow` kapsayıcısında `TVFocusGuideView trapFocusRight={true}` ve son kartta `nextFocusRight={selfTag}` kullanılır; kullanıcı alt satıra sadece açıkça AŞAĞI tuşuna basarak geçebilir.
   - **Satır Başı Sol Ok Menü Geçişi**: Herhangi bir satırın ilk kartındayken (`index === 0`) sol oka basıldığında odak ASLA üst satıra sıçrayamaz, doğrudan sol navigasyon menüsüne (`TVSidebar`) geçer. Bunu bozan satır bazlı yapay `<TVFocusGuideView autoFocus={true}>` sarmalayıcıları KULLANILMAZ.

---

## 5. Reklam Temizleme ve Oynatıcı Kuralları

1. **Mümkünse Doğrudan Stream**:
   - Iframe oynatıcılardaki (`Rapidrame`, `VidMoly`, `Close` vb.) doğrudan `.m3u8` veya `.mp4` video URL'leri ayıklanıp native `react-native-video` (ExoPlayer) ile oynatılmalıdır.
2. **Reklam Filtreleme**:
   - Sayfadaki `.money-wrapper`, `.money-text`, `xpartner-ps.js`, `xpartner-pre.js` ve pop-up tetikleyiciler filtrelenmeli, kullanıcının TV ekranında kumandayla kapatılamayan hiçbir reklam penceresi gösterilmemelidir.

---

## 6. Kategori Grid Düzeni ve Otomatik D-Pad Merkezleme Kuralları

1. **1 Satırda 3 Kolon Standardı (`numColumns={3}`)**:
   - Kategori ve tür listeleme ızgaralarında satır başına daima 3 kolon (`numColumns={3}`) kullanılmalıdır.
   - Kartlar ferah ölçülerde olmalı (`height: 92px`, `gap: 16px`, toplam satır yüksekliği `ROW_HEIGHT = 108px`).
2. **Beyaz Kenarlık (Border) Yasağı ve Odak Görünümü**:
   - Kategori kartlarında odaklanıldığında KESİNLİKLE beyaz kenarlık (`borderWidth: 0`, `borderColor: 'transparent'`) KULLANILMAYACAKTIR.
   - Odaklanıldığında:
     - Donanım hızlandırmalı yumuşak zoom efekti (`Animated.timing`, scale: 1.06, duration: 150ms, `useNativeDriver: true`).
     - Zengin Netflix Kırmızısı (`#E50914`) arka plan rengi.
     - Saf beyaz (`#FFFFFF`) kalın başlık metni ve açık renk rozet.
     - `elevation: 12`, `zIndex: 10`.
3. **Ekran Dibinde Kesilmeyi Önleme ve Otomatik Merkezleme (`scrollToOffset`)**:
   - Çok kolonlu (`numColumns > 1`) FlatList'lerde `scrollToIndex` ve `getItemLayout` KULLANILMAZ (React Native'in iç mimarisinde satır/eleman indeksi uyuşmazlığına yol açtığı için).
   - Bunun yerine her zaman doğrudan piksel hesaplamalı `scrollToOffset` kullanılır:
     ```tsx
     const rowIndex = Math.floor(index / 3);
     const targetOffset = Math.max(0, (rowIndex - 1) * ROW_HEIGHT);
     listRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
     ```
   - Bu sayede kumandayla aşağı inildiğinde odaklanan kart ASLA ekranın alt çerçevesine yapışmaz veya yarım kalmaz; daima ekranın ferah 2. sırasına (üst-orta) çekilir. Kullanıcının kartı görmek için ikinci kez basma ihtiyacı kesin olarak engellenir.
   - Liste altına en az `paddingBottom: 240px` tampon eklenerek en alttaki satırların da rahatça ekran ortasına kadar çıkabilmesi garanti edilmelidir.

---

## 7. Native TV Video Player (ExoPlayer & IPTV Kumanda Standartları)

1. **`useMemo` ile Nesne Sabitleme (Cızırtı ve Yeniden Başlatmayı Önleme)**:
   - `<Video>` bileşenine geçilen `source` ve `bufferConfig` nesneleri ASLA inline literal olarak verilmez; daima `useMemo` ile sabitlenmelidir.
   - Aksi takdirde menü açıldığında, D-pad ile odak değiştiğinde veya her progress güncellemesinde ExoPlayer tamponu sıfırlayıp seste "tık tık cızırtı" / audio buffer underrun oluşturur.
2. **Gelişmiş Tamponlama (`bufferConfig`)**:
   - `minBufferMs: 15000` (15 saniye), `maxBufferMs: 45000` (45 saniye), `bufferForPlaybackMs: 2500`, `bufferForPlaybackAfterRebufferMs: 5000`, `backBufferDurationMs: 0`.
   - 2GB RAM'li TV cihazlarında `backBufferDurationMs: 0` tutularak Android BufferPool2.0 bellek şişmesi ve periyodik oluşan `AudioTrack` stall / tık cızırtısı tamamen önlenir. `bufferConfig` asla `videoSource` içine konulmaz, doğrudan `<Video bufferConfig={...} />` prop'u olarak verilir.
3. **Pürüzsüz Ses ve Donanım Ayarları**:
   - `mixWithOthers="mix"` kullanılmalıdır (kesinlikle `"duck"` kullanılmaz; duck ayarı menü/odak geçişlerinde sesi anlık kısıp açtığı için patlama/çıtırtı yapar).
   - `disableFocus={true}`, `preventsDisplaySleepDuringVideoPlayback={true}`, `ignoreSilentSwitch="ignore"`.
   - Kumanda ve menü butonlarında Android sistem tıklama sesinin videoya karışmasını önlemek için tüm `Pressable` bileşenlerinde `android_disableSound={true}` zorunludur.
   - `progressUpdateInterval={1000}` (1 saniye) olarak tutulmalıdır; 500ms gibi aşırı sık güncellemeler TV işlemcisinde render yükü yaratarak ses senkronunu bozar.
4. **Yerel Altyazı Motoru (Native Subtitle Engine)**:
   - ExoPlayer'ın HLS dahili altyazı motoruna bağımlı olunmaz; WebVTT dosyası doğrudan `fetch` + `parseVtt` ile ayrıştırılıp React Native yerel `<Text>` bileşeniyle ekrana basılır.
   - **Saydam Arka Plan**: Altyazı kutusu `backgroundColor: 'transparent'` olmalı, siyah kutu ve kenarlık olmamalıdır.
   - **Boyut ve Kontrast**: Yazı boyutu `fontSize: 24`, `lineHeight: 32`, `fontWeight: '800'`. Açık renkli sahnelerde bile kusursuz görünmesi için saf siyah 6px gölge (`textShadowColor: '#000000'`, `textShadowRadius: 6`, `textShadowOffset: { width: 2, height: 2 }`) uygulanır.
   - **Dinamik Konum**: Kontroller gizliyken `bottom: 50`, alt kontrol çubuğu açıkken altyazının bar altında kalmaması için `bottom: 140` kullanılır.
   - **Yalnızca Değişimde Render**: `lastCueTextRef` kullanılarak yalnızca altyazı cümlesi değiştiğinde re-render tetiklenir.
5. **Akıllı Dil Tespiti ve Sıralama**:
   - Altyazı dilleri URL içindeki ortak dizin adlarından (`-tr-` gibi) değil; parça etiketinden (`label`/`name`) ve dosya sonundaki dil ekinden (`_subtitles01engtr.vtt`, `_en.vtt` vb.) `resolveSubtitleNameAndLanguage` ile tespit edilir.
   - Çoklu aynı dil altyazıları otomatik numaralandırılır (`Türkçe Altyazı 1`, `Türkçe Altyazı 2`).
   - Altyazı listesinde **Türkçe Altyazı daima 1. sırada (en üstte)** yer alır.
   - Ses kanalları da otomatik olarak "Türkçe Dublaj" ve "Orijinal Ses (İngilizce)" olarak adlandırılır.
6. **Akıllı Debounced Sarma (Seek) ve İlerleme Koruması**:
   - Kumandadan veya alt bardan hızlı sarma yapıldığında `handleSeek` çağrıları `pendingSeekTargetRef` ve `accumulatedSeekDeltaRef` ile biriktirilir, HUD anında `+20 sn ⏩`, `+30 sn ⏩` şeklinde gecikmesiz gösterilir.
   - ExoPlayer'a gidecek `videoRef.current?.seek(finalTarget)` çağrısı **350ms debounce** ile tek seferde iletilir.
   - Bu sayede kullanıcı kumandaya 3-4 kez arka arkaya bassa dahi ExoPlayer'ın tamponu defalarca sıfırlanıp ses donanımını (AudioTrack) çökertmesi ve cızırtı oluşturması engellenir.
   - Sarma sürerken ExoPlayer'dan gelen eski zaman (`handleProgress`) olayları filtrelenerek sürenin geriye sıçraması kesin olarak önlenir.
7. **Doğrudan Piksel Boyutlandırmalı En-Boy Oranı (`videoStyle`)**:
   - Android TV `SurfaceView` donanım katmanı transformları (scale) yok saydığı için, en-boy oranı (`cover` / `stretch` / `contain`) React Native piksel boyutları (`width`, `height`, `left`, `top`) ve `Dimensions.get('window')` üzerinden dinamik hesaplanır.
   - `cover` (Tam Ekran) modunda 16:9 ekranda üst ve alttaki sinemaskop siyah barlar tamamen yok edilerek ekran %100 doldurulur.
   - Kontrol butonları `buttonsRow` içinde `flexWrap: 'nowrap'` ile tek satırda tutularak kumandadan sağ-sol tuşlarıyla kesintisiz IPTV gezintisi sağlanır.
8. **Film Detay Sayfası ve Oynatıcı Kaynak Seçimi**:
   - Film detay sayfasında birden fazla kaynak butonu (Kaynak 1, Kaynak 2 vb.) yerine tek bir **'▶ Hemen İzle'** butonu gösterilir (`hasTVPreferredFocus={true}`, odaklandığında `#E50914` kırmızı arka plan, 1.06 scale).
   - Alternatif video kaynakları doğrudan video oynatıcı (`TVVideoPlayer`) içerisindeki IPTV alt kontrol çubuğunda bulunan **'Kaynaklar (x/y)'** yan menüsü üzerinden kumandayla kolayca değiştirilir.

---

## 9. Android TV FlatList Yükseklik Çökmesi (Height Collapse) ve Grid Ortalama Kuralları

1. **FlatList'te `style={{ flex: 1 }}` Yasağı (Siyah Ekran / 2px Çökme Önlemi)**:
   - **Hata**: Başlık (`header`) veya kardeş bileşen içeren ekranlarda `<FlatList style={{ flex: 1 }}>` stili verildiğinde, Android React Native Yoga/ReactScrollView motoru dikey yüksekliği hesaplayamaz ve FlatList'i tam 1-2 piksele sıkıştırarak listenin kaybolmasına ve ekranın tamamen siyah kalmasına yol açar.
   - **Kural**: `<FlatList>` bileşenine ASLA `style={{ flex: 1 }}` verilmez. Yalnızca `contentContainerStyle` kullanılır.
   - Ekran kapsayıcısının ve `contentArea`'nın tam dikey yayılmasını garanti etmek için `contentArea: { flex: 1, height: '100%' }` tanımlanır.
2. **Katalog Grid Simetrik Ortalama ve Menü Kesilmesini Önleme Standardı**:
   - 1080p Android TV genişliği **960 DP**'dir. Sol menü **64 DP** kaplar, geriye **896 DP** alan kalır.
   - 5 kolonlu film/dizi kataloglarında:
     - Kart genişliği: `width: 144`, kart yüksekliği: `height: 180` (ekrana 2 tam satır sığar).
     - Kartlar arası yatay boşluk: `columnWrapper: { gap: 24, marginBottom: 16 }`.
     - $5 \times 144 + 4 \times 24 = 816\text{ DP}$.
     - Kalan 80 DP, sol ve sağa eşit dağıtılarak `header` ve `gridContent` için `paddingHorizontal: 40` olarak sabitlenir ($40 + 816 + 40 = 896\text{ DP}$).
   - İlk kart sol menü sınırından (`x = 64`) tam 40 piksel uzakta başlar. Kart afişi ve başlık metni tek parça halinde zoomlansa dahi menünün opak siyah katmanı altına girip dikey kesilmeye uğrayamaz; liste ekranın sağına ve soluna göre tam simetrik ortalanır.
3. **Çalışan Scraper / Veri Motoruna Gereksiz Müdahale Yasağı**:
   - UI veya Flexbox kaynaklı görüntüleme/düzenleme sorunlarında çalışan veri çekme katmanına (`HdFilmCehennemiProvider.ts`) keyfi müdahale edilmez, `AbortController` veya yapay timeout eklenerek canlı isteklerin yarıda kesilmesine izin verilmez.
4. **Dinamik Sayfalamada (`loadMore`) Android ScrollView Satır Hizalama Koruması**:
   - **Hata**: Listede aşağı inildikçe yeni sayfa verisi (`loadMore`) çekildiğinde veya footer loader açılıp kapandığında, Android native `ReactScrollView.onLayout()` mekanizması devreye girip `scrollToChild(mFocused)` çağırarak aktif seçili kartı ekranın ortasına iter. Bu durum üstteki satırın tavanda, alttaki satırın ise tabanda yarı yarıya kesik kalmasına yol açar.
   - **Çözüm & Standart**:
     - **Matematiksel Sıfır Sapma (`ROW_HEIGHT = 240`)**: Kart yüksekliği net `230px` (afiş: 170, `cardInfo`: 48, `paddingVertical`: 4), `marginBottom: 10px` tutulur. Böylece her bir satır tam olarak $230 + 10 = 240.00\text{ DP}$ olur; 100 satır inilse dahi 1 piksel kümülatif sapma oluşmaz.
     - **Sabit Footer (`height: 60`)**: Yükleyici alt bilgi daima sabit 60px yükseklikte kalır; sayfa yüklenirken veya bittiğinde liste boyutu zıplamaz.
     - **Kesintisiz Batch Render**: `initialNumToRender={30}`, `maxToRenderPerBatch={30}`, `windowSize={11}` ile yeni sayfanın tamamı tek karede basılır, parçalı render kaynaklı scroll clamping engellenir.
     - **Post-Layout Scroll Doğrulama**: `[items.length]` değiştiğinde `useEffect` içinde 50ms gecikmeyle `scrollToOffset({ offset: lastRowIndexRef.current * ROW_HEIGHT, animated: true })` yeniden uygulanarak Android native layout motorunun satır hizasını bozması kesin olarak engellenir.


---

## 10. Android TV Arama Sayfası ve Yerel Sistem Klavyeli (IME) UX Standartları

1. **Özel Ekran Klavyesi (Matrix Keyboard) Yasağı**:
   - Arama ekranında harf harf gezilen 40 tuşluk yapay UI klavyesi kesinlikle KULLANILMAYACAKTIR (aşırı lag, D-pad gezintisi yavaşlığı ve sesli arama eksikliği nedeniyle).
2. **Yerel Android TV IME ve Sesli Arama (Microphone)**:
   - `<TextInput>` bileşeni `focusable={true}`, `hasTVPreferredFocus={true}`, `showSoftInputOnFocus={true}` ve `returnKeyType="search"` ile kullanılır.
   - Kumandadan `OK` tuşuna basıldığında Android TV'nin yerel klavyesi (Gboard / Leanback IME) ekranın altından açılarak donanım hızlandırmalı yazma, kelime tamamlama ve kumanda mikrofonu ile Türkçe sesli arama sağlar.
   - `onChangeText` ile 400ms debounced canlı arama tetiklenir; klavyeden Enter/Ara tuşuna basıldığında `onSubmitEditing` anında aramayı sonuçlandırır.
3. **5 Kolonlu Simetrik Arama Izgarası**:
   - Arama sonuçları tüm ekran genişliğini kullanır (`numColumns={5}`, kart boyutu 140x170, `paddingHorizontal: 46`).
   - Arama kutusunun altında popüler arama etiketleri (`suggestionChip`) ve temizleme (`✕ Temizle`) butonu yer alır.
