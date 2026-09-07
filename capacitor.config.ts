import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native Android/iOS app configuration for SSR (Server-Side Rendered) app.
 * Since this is a TanStack Start SSR app, we use server mode instead of static files.
 * The app can still work locally with proper configuration.
 */
const config: CapacitorConfig = {
  appId: "app.dailycuriosity",
  appName: "Daily Curiosity",
  
  // Point to public assets (static files like CSS, images)
  webDir: ".output/public",
  
  // For SSR apps, configure server settings
  server: {
    androidScheme: "https",
    cleartext: false,
    // Don't specify a URL - let it use the built-in server
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
