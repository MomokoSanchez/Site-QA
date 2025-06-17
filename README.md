# Site QA Pipeline

Lightweight nightly QA pipeline that crawls a website, checks for typos,
broken links and readability, and publishes a static dashboard.

* **Stack**: Playwright, retext, LanguageTool, Node 20+
* **CI**: GitHub Actions + Pages
* **Output**: `/dist` folder served on `gh-pages` branch

## Quick start (local)

```bash
git clone <repo>
cd site-qa
npm install
# crawl + checks + UI build
npm run start
# open dist/index.html in your browser
```

Set `LANGUAGETOOL_API_URL` and `LANGUAGETOOL_API_KEY` in `.env` to use
LanguageTool Cloud, or leave unset to hit the public endpoint
(300‑req/day limit).