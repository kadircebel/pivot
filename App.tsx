/**
 * PIVOT - Android TV Movie & Series Streaming Application
 * "PIVOT! PIVOT! PIIIVVOOOTTT!!" - Ross Geller
 * Target: Next - Start 4K TV Box (Android TV)
 * Theme: Netflix Dark TV Style
 */

import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { TVMainContainer } from './src/navigation/TVMainContainer';
import { Colors } from './src/theme/colors';

function App(): React.JSX.Element {
  return (
    <View style={styles.root}>
      <StatusBar hidden={true} backgroundColor={Colors.background} barStyle="light-content" />
      <TVMainContainer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default App;
