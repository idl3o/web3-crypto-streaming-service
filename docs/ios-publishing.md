# iOS Publishing Guide

This guide walks you through the process of publishing the Web3 Crypto Streaming Service iOS app to the Apple App Store.

## Prerequisites

Before you begin the publishing process, ensure you have the following:

1. **Apple Developer Account**: You need an active [Apple Developer account](https://developer.apple.com/) ($99/year).
2. **Xcode**: Latest version installed on your Mac.
3. **Development Certificates**: iOS Development and Distribution certificates.
4. **App Store Connect Setup**: Your app created in [App Store Connect](https://appstoreconnect.apple.com/).

## Step 1: Prepare Your App for Distribution

### Build the App for iOS

Run the iOS build script to prepare your app for distribution:

```bash
npm run ios:build
```

This script will:
- Build the web application
- Add the iOS platform if needed
- Copy web assets to the iOS project
- Update any native plugins
- Configure the build with your specified version and build number

### Configure App in Xcode

1. Open the project in Xcode:
```bash
npx cap open ios
```

2. Configure your app:
   - Select your Development Team
   - Verify Bundle Identifier (e.g., `com.yourcompany.web3cryptostreaming`)
   - Set the App version and Build number (should match what you provided during build)

3. Review app capabilities:
   - Go to the "Signing & Capabilities" tab
   - Add any required capabilities (push notifications, background modes, etc.)

### Update App Assets

1. **App Icon**: Make sure you have proper app icons in the `App/App/Assets.xcassets/AppIcon.appiconset` directory.
2. **Launch Screen**: Configure your app's launch screen in `App/App/Base.lproj/LaunchScreen.storyboard`.
3. **Screenshots**: Prepare screenshots for App Store submission.

## Step 2: Test Your App

Before submitting, thoroughly test your app:

1. Test on multiple device types and iOS versions.
2. Verify all app functionality works as expected.
3. Check for performance issues, memory leaks, or crashes.
4. Test with TestFlight to get feedback from external users.

## Step 3: Archive and Upload to App Store Connect

1. In Xcode, select a generic iOS device as the build target.

2. Select **Product > Archive** from the menu.

3. Once archiving completes, the Xcode Organizer will open automatically.

4. In the Organizer:
   - Select your archive
   - Click "Distribute App"
   - Select "App Store Connect" as the distribution method
   - Follow the prompts to complete the submission
   - Upload your build

## Step 4: Complete App Store Submission

After uploading your build to App Store Connect:

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/).

2. Navigate to your app and select the build you just uploaded.

3. Complete the required information:
   - App Store information (description, keywords, support URL)
   - Screenshots and preview videos
   - App Review Information (test account credentials if needed)
   - Version Release information
   - Pricing and Availability
   - Content rights declarations

4. Submit for Review.

5. Wait for Apple's review process to complete (typically 1-3 days).

## App Store Optimization (ASO)

To improve your app's visibility:

1. **Keywords**: Use relevant keywords in your title and subtitle.
2. **Description**: Write a clear, compelling description highlighting key features.
3. **Screenshots**: Create engaging screenshots with captions.
4. **Preview Video**: Add a preview video demonstrating your app's features.
5. **Ratings and Reviews**: Encourage users to rate and review your app.

## Handling App Updates

For future updates:

1. Update your app code and increment the version number in your package.json.
2. Run the iOS build script again (`npm run ios:build`).
3. Archive and upload the new version.
4. Complete the submission process in App Store Connect.

## Troubleshooting

### Common Issues

1. **Certificate Issues**: Ensure your certificates are valid and properly configured.
2. **Rejected Submissions**: Review rejection reasons carefully and address all concerns.
3. **Missing Privacy Declarations**: Verify all required privacy declarations are provided.
4. **App Crashes**: Test extensively before submission to catch and fix crashes.

### Support Resources

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Forums](https://developer.apple.com/forums/)
