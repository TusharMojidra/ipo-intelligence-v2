# SEO Roast Roadmap: IPO Intelligence Terminal (2026-11-27)

Verdict: A client-only React SPA on a shared `onrender.com` subdomain had an empty `<body>` for non-JS crawlers, no `/llms.txt`, no canonical tag, and a brand-first `<title>`.

| # | Tier | Issue | Traffic / User Impact | Fix | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | FATAL | Empty `<div id="root"></div>` in initial HTML | Bingbot, ChatGPT, Perplexity, and pre-JS Googlebot saw zero body text | Semantic crawler-readable HTML inside `#root` (replaced on React mount) | agent | shipped |
| 2 | FATAL | Missing `/llms.txt` & explicit AI search bot rules | Invisible to AI search citations (ChatGPT, Perplexity, Claude) | Added `/llms.txt` route with live-consistent benchmarks + updated `robots.txt` | agent | shipped |
| 3 | REVENUE | Brand-first `<title>` (`IPO Intelligence Terminal \| ...`) & missing canonical | Missed high-intent search queries (`IPO listing gain predictor India`) + `?tab=` duplicate risk | Query-first `<title>` (53 chars), `<link rel="canonical">`, and `FAQPage` JSON-LD | agent | shipped |
| 4 | COMPOUNDING | Zero Google Search Console / Bing Webmaster indexing | Google hasn't been explicitly pinged to crawl and index the sitemap | Verify site in Google Search Console & submit `sitemap.xml` | founder | next |
| 5 | COMPOUNDING | Shared `onrender.com` subdomain + 0 backlinks | Lower domain authority vs established finance sites | Connect a custom domain (e.g. `ipopredictor.is-a.dev` / `.pages.dev`) + submit to AI/tool directories | founder | next |

## Fluff (ignore until rows above ship)
- Open Graph image uses `/favicon.svg` instead of a 1200x630 PNG social card.
