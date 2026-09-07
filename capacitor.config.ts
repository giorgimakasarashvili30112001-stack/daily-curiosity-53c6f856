import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native Android/iOS app configuration.
 * The app runs the built web app locally (from dist/client) without needing
 * to connect to a remote URL. This provides better offline support and faster loading.
 */
const config: CapacitorConfig = {
  appId: "app.dailycuriosity",
  appName: "Daily Curiosity",
  webDir: "dist/client",
  
  // Run locally from dist/client instead of remote URL
  server: {
    androidScheme: "https",  // Use https scheme for security
  },

  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#1a1a1a",
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
