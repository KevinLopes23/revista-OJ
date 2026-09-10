// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // the magazine's own domain — the shop lives at oficinadasjoias.com.br and
  // is a separate site. Used for the sitemap and the canonical/OG URLs, so
  // it has to be the host the link is actually shared as (apex, no www).
  site: "https://revistaoj.com.br",
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
