import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app is server-rendered, so the native shell loads the hosted build
 * instead of a static bundle. Swap `server.url` for your published domain
 * when you go live.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.dailycuriosity",
  appName: "The Daily How",
  webDir: "dist/client",
  server: {
    url: "https://project--4537fc7c-9d89-4404-be9b-4ff997c88324.lovable.app",
    cleartext: false,
  },
};

export default config;
