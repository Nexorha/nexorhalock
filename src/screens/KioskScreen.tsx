import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { ApiService } from '../utils/ApiService';
import KioskModule from '../utils/KioskModule';

// === NEXORHA MASTER CONFIGURATION ===
const NEXORHA_LOCK_URL = 'https://subsidize.nexorha.com/device_locked.php';

const KioskScreen = () => {
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // 1. IMMORTAL BACK BUTTON BLOCKER (Consumes all Android back swipes)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    // 2. FORCE SCREEN ON & LOCK SYSTEM UI
    const secureDevice = async () => {
      try {
        await KioskModule.setKeepScreenOn(true);
        // Lock task hides Home button, Recent apps, disables Power Menu and Notifications
        await KioskModule.startLockTask(undefined, false, false, false);
      } catch (e) {
        console.log("Device Owner mode required for absolute hardware lock.");
      }
    };
    secureDevice();

    // 3. INITIALIZE BAREBONES API (So your PHP cron job can still control it remotely)
    // @ts-ignore - Suppressing TS errors for intentionally removed FreeKiosk bloatware
    ApiService.initialize({
      onReload: () => setReloadKey(prev => prev + 1),
      onReboot: async () => {
        try { await KioskModule.reboot(); } catch (e) {}
      },
      onClearCache: () => setReloadKey(prev => prev + 1),
    });
    ApiService.autoStart();

    return () => {
      backHandler.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 4. BLACKOUT THE OS (Removes battery, wifi, and time from the top) */}
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />

      {/* 5. THE INESCAPABLE WEBVIEW */}
      <WebView
        key={reloadKey}
        source={{ uri: NEXORHA_LOCK_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={false} // Forces a fresh load from your server every time
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        // Prevents users from long-pressing to copy text or open external browser windows
        injectedJavaScript="document.body.style.userSelect = 'none'; document.body.style.webkitUserSelect = 'none'; true;"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  }
});

export default KioskScreen;