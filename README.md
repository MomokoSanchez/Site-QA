# Site QA Pipeline

Lightweight weekly QA pipeline that crawls a website, checks for typos and publishes a static dashboard.

* **Stack**: Playwright, retext, LanguageTool, Node 20+ (confirmed working with v24.2.0)
* **CI**: GitHub Actions + Pages
* **Output**: `/dist` folder served on `gh-pages` branch

## Quick start (local)

```bash
git clone <repo>
cd site-qa
npm install
# set endpoint for slack (find url in Typo Bot app - https://api.slack.com/messaging/webhooks or ask Sonia) - this only work in windows cmd!
set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
# set languagetool api key (find in languagetool account)
set LANGUAGETOOL_API_KEY=12345689
# crawl + checks + UI build
npm run start
# open dist/index.html in your browser
```
---

## 🔍 Local preview

| Method | Commands | Open this URL |
|--------|----------|---------------|
| **Node-based one-liner (recommended)** | ```bash # one-time global install (or use npx each time)  npm install --global serve  # then, from repo root  serve dist          ``` | http://localhost:3000 |
| **XAMPP Apache** | 1. Start Apache in the XAMPP control panel<br>2. Copy the latest `dist` folder to `C:\xampp\htdocs\qa` | http://localhost/qa/ (or `:8080/qa/` if Apache runs on 8080) |

`serve dist` spins up a tiny HTTP server so `app.js` can fetch
`report.json` without browser security blocks.  
Hit **Ctrl + C** to stop the server when you’re done.

---

## 🛠️  Troubleshooting npm installs

| Symptom | Fix |
|---------|-----|
| **`EBADENGINE`** engine mismatch | Install the recommended LTS with `nvm install 20.17.0 && nvm use 20.17.0` |
| **`ETARGET`** “No matching version” | Edit the offending line in `package.json` to a published version (check with `npm view <pkg> versions --json`) |
| **Persistent lockfile errors / corrupt node_modules** | ```bash rmdir /s /q node_modules  # Windows<br>del /f package-lock.json<br>npm cache clean --force<br>npm install``` |
| **Stalled dependency tree** | Run `node check-ranges.js` to validate that every semver range in `package.json` matches at least one published release. |

After cleaning the cache and reinstalling, re-run the pipeline:

```bash
npm run start      # crawl → checks → build UI
```
---

Report written to report.json
UI built to dist/

---
