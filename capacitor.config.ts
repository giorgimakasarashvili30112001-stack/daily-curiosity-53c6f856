import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native Android/iOS shell for the server-rendered app.
 * The shell loads the published site, so `webDir` only needs to exist.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.dailycuriosity",
  appName: "The Daily How",

  // Not used for content (server.url wins), but Capacitor requires it to exist.
  webDir: "public",

  server: {
    url: "https://curious-daily-tales.lovable.app",
    androidScheme: "https",
    cleartext: false,
  },

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
