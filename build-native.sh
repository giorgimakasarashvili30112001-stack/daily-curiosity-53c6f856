#!/bin/bash

# Native Android App Build Script
# Builds APK and AAB for Daily Curiosity app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      Daily Curiosity - Native Android App Builder           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found${NC}"

if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}⚠️  ANDROID_HOME not set. Attempting to auto-detect...${NC}"
    # Try common Android SDK locations
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo -e "${GREEN}✓ Found Android SDK at $ANDROID_HOME${NC}"
    else
        echo -e "${RED}❌ Android SDK not found. Please set ANDROID_HOME${NC}"
        echo "   Download from: https://developer.android.com/studio"
        exit 1
    fi
fi

if ! command -v gradle &> /dev/null && [ ! -f "./android/gradlew" ]; then
    echo -e "${RED}❌ Gradle not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Gradle found${NC}"

# Build web app
echo -e "${YELLOW}[2/5] Building web app...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Web app built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build web app${NC}"
    exit 1
fi

# Sync to Capacitor
echo -e "${YELLOW}[3/5] Syncing to Android...${NC}"
if npx cap sync android; then
    echo -e "${GREEN}✓ Synced to Android${NC}"
else
    echo -e "${RED}❌ Failed to sync to Android${NC}"
    exit 1
fi

# Build APK (debug)
echo -e "${YELLOW}[4/5] Building Debug APK...${NC}"
cd android
if ./gradlew assembleDebug; then
    echo -e "${GREEN}✓ Debug APK built${NC}"
else
    echo -e "${RED}❌ Failed to build Debug APK${NC}"
    cd ..
    exit 1
fi

# Build Release (APK + AAB)
echo -e "${YELLOW}[5/5] Building Release APK and AAB...${NC}"
if ./gradlew bundleRelease assembleRelease; then
    echo -e "${GREEN}✓ Release builds completed${NC}"
else
    echo -e "${RED}❌ Failed to build Release${NC}"
    cd ..
    exit 1
fi

cd ..

# Summary
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ BUILD COMPLETE!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}📦 Output Files:${NC}"
echo ""
echo -e "${BLUE}Debug APK (for testing):${NC}"
echo "  android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo -e "${BLUE}Release APK (for distribution):${NC}"
echo "  android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo -e "${BLUE}Release AAB (for Google Play Store):${NC}"
echo "  android/app/build/outputs/bundle/release/app-release.aab"
echo ""

echo -e "${YELLOW}📱 Install Debug APK on device:${NC}"
echo "  adb install -r android/app/build/outputs/apk/debug/app-debug.apk"
echo ""

echo -e "${YELLOW}📤 Upload to Google Play Store:${NC}"
echo "  https://play.google.com/console"
echo "  Release → Production → Create new release → Upload app-release.aab"
echo ""

echo -e "${GREEN}Happy building! 🚀${NC}"
