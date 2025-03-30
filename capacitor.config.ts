import { CapacitorConfig } from '@capacitor/cli';
import iosConfig from './ios-config.json';

const config: CapacitorConfig = {
    appId: 'com.web3crypto.streamingapp',
    appName: 'Web3 Crypto Streaming',
    webDir: 'dist',
    bundledWebRuntime: false,
    // Use the iOS-specific configuration from ios-config.json
    plugins: iosConfig.plugins,
    ios: iosConfig.ios,
    // Settings for Android (keeping for reference)
    android: {
        allowMixedContent: false,
        captureInput: true,
        webContentsDebuggingEnabled: true,
        backgroundColor: "#1d1d1d",
        contentInset: "scrollAlways",
        initialFocus: false,
        hideSoftKeyboard: false,
        hideNavigationBar: false,
        loggingBehavior: "debug",
        minSdkVersion: 22,
        targetSdkVersion: 33
    },
    server: {
        hostname: "app.web3crypto.streaming",
        androidScheme: "https",
        iosScheme: "https",
        allowNavigation: [
            "*.web3crypto.streaming",
            "*.infura.io",
            "*.ipfs.io"
        ]
    }
};

export default config;
