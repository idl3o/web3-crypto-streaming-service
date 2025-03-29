import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.web3cryptostream.app',
    appName: 'Web3 Crypto Streaming',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: false,
            backgroundColor: '#ffffffff',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: true,
            androidSpinnerStyle: 'large',
            spinnerColor: '#8B4513',
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#ffffff'
        }
    },
    android: {
        overrideUserAgent: false,
        appendUserAgent: 'Web3CryptoStreamApp',
        backgroundColor: '#ffffff',
        versionName: "1.0.0",
        versionCode: 10000
    }
};

export default config;
