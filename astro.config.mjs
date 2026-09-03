// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the final .com.br domain once it's registered —
  // used for the sitemap and canonical/OG URLs. See README "Deploy" section.
  site: "https://www.oficinadasjoias.com.br",
  integrations: [sitemap()],
  compressHTML: true,
  security: {
    // Astro computes hashes for its own bundled/inlined scripts (e.g. the
    // coloring game) at build time and emits a <meta> CSP tag with them —
    // so this stays correct automatically as the code changes, no manual
    // hash-pinning needed. Headers that a <meta> tag can't express
    // (frame-ancestors, HSTS, etc.) live in vercel.json instead.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ],
    },
  },
});
