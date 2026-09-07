# Build APK/AAB with GitHub Actions

## ✅ Setup Complete!

Your Daily Curiosity app is configured to build native Android APK and AAB files automatically using GitHub Actions.

**No local Java or Android SDK needed!** Everything is built on GitHub's servers.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Trigger the Workflow
Go to: https://github.com/giorgimakasarashvili30112001-stack/daily-curiosity-53c6f856/actions

### Step 2: Select and Run
1. Click "Build Native Android APK & AAB" on the left
2. Click "Run workflow" button
3. Confirm to start build

### Step 3: Download
- Wait for workflow to complete (green checkmark) ~10-15 minutes
- Scroll to "Artifacts" section
- Download your files

---

## 📁 Output Files

| File | Purpose | Size |
|------|---------|------|
| `app-debug.apk` | Testing on device | ~80-120MB |
| `app-release.apk` | Share with friends | ~80-120MB |
| `app-release-aab` | Upload to Play Store | ~80-120MB |

---

## 🔄 Build Triggers

### Automatic (On Every Push)
```bash
git push origin main
# Workflow starts automatically
```

### Manual (Anytime)
1. Go to Actions tab
2. Click "Build Native Android APK & AAB"
3. Click "Run workflow"

### On Git Tag (For Releases)
```bash
git tag v1.0.0
git push origin v1.0.0
# Creates GitHub Release with APK/AAB attached
```

---

## 📱 Install and Test

### Download APK
1. Go to Actions tab
2. Click latest successful workflow
3. Download `app-debug.apk` from Artifacts

### Install on Phone
```bash
adb install -r app-debug.apk
```

### Test Offline
1. Disable WiFi on phone
2. Restart the app
3. Verify it works without internet

---

## 📤 Upload to Google Play Store

### Step 1: Download AAB
Get `app-release-aab` from workflow artifacts

### Step 2: Create Google Play Account
- Go to https://play.google.com/console
- Developer account ($25 one-time fee)

### Step 3: Create App
1. Click "Create app"
2. Fill in app details
3. Add descriptions, screenshots, icons

### Step 4: Upload
1. Go to Release → Production
2. Click "Create new release"
3. Upload the AAB file
4. Fill release notes
5. Review and publish

---

## ⚠️ Signing Configuration (For Signed Releases)

Currently, release APKs are unsigned. For production builds, add signing:

### Step 1: Create Signing Key (Local Machine)
```bash
keytool -genkey -v -keystore daily-curiosity.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias daily-curiosity-key
```

### Step 2: Base64 Encode
```bash
base64 -i daily-curiosity.keystore -o keystore.b64
```

### Step 3: Add GitHub Secrets
1. Go to repo Settings → Secrets
2. Add these secrets:
   - `KEYSTORE_FILE` (paste keystore.b64 content)
   - `KEYSTORE_PASSWORD` (your password)
   - `KEY_ALIAS` (daily-curiosity-key)
   - `KEY_PASSWORD` (your password)

### Step 4: Update Workflow
Add signing configuration to `.github/workflows/build-android.yml` (can do next)

---

## 📊 Workflow Details

### What Happens (Automatically)
1. ✅ Checkout code
2. ✅ Install Node.js 18
3. ✅ Install Java 17
4. ✅ Install Android SDK
5. ✅ Install dependencies (npm ci)
6. ✅ Build web app (npm run build)
7. ✅ Sync to Android (npx cap sync android)
8. ✅ Build debug APK
9. ✅ Build release APK
10. ✅ Build AAB for Play Store
11. ✅ Upload artifacts

### Build Time
- **First build:** ~15-20 minutes (downloads dependencies)
- **Subsequent builds:** ~10-15 minutes (cached)

### Environment
- **OS:** Ubuntu latest
- **Java:** JDK 17
- **Node:** 18
- **Android SDK:** API 34, Build Tools 34.0.0

---

## 🐛 Troubleshooting

### Build Fails
Check the workflow logs:
1. Go to Actions tab
2. Click failed workflow
3. Click job that failed
4. Scroll to see error messages

### Common Errors

**"Could not find tools.jar"**
- Java version mismatch
- Workflow uses Java 17 (correct)

**"Sync failed"**
- Web app build failed first
- Check "Build web app" step logs

**"Gradle timeout"**
- Network issue or large build
- Run workflow again

---

## 🔐 Security Notes

✅ **Artifacts are private** - Only you can download them
✅ **Builds are ephemeral** - No code stored on GitHub servers
✅ **Keep keystore password safe** - Don't commit to repo
✅ **Use GitHub Secrets** - For sensitive data (passwords, keys)

---

## 📅 Artifacts Retention

- Artifacts stored for **30 days**
- After 30 days, automatically deleted
- You can re-run workflow to rebuild anytime

---

## 🚀 Example: Build and Test

```bash
# 1. Make a change
echo "// Update" >> src/main.tsx
git add .
git commit -m "Test build"
git push origin main

# 2. Go to Actions tab and watch the build

# 3. When complete, download app-debug.apk

# 4. Install and test
adb install -r app-debug.apk

# 5. Test offline - disable WiFi and verify app works
```

---

## 📞 Support

For issues:
1. Check workflow logs in Actions tab
2. Read error messages carefully
3. Try running workflow again
4. Check GitHub Actions documentation

---

## ✨ Next Steps

✅ Build your first APK:
1. Go to Actions tab
2. Run workflow
3. Download APK when complete

✅ Test on your phone:
1. Install debug APK
2. Test features
3. Test offline

✅ Publish to Play Store (when ready):
1. Configure signing (see section above)
2. Download AAB from workflow
3. Upload to Play Console

---

## 📝 Workflow File

Location: `.github/workflows/build-android.yml`

The workflow is fully configured and ready to use. You can modify it if needed (add signing, change Java version, etc).

---

**Everything is set up and ready! Go build your APK! 🎉**
