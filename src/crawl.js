import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import sitemapsPkg from 'sitemaps';
import fetch from 'node-fetch';

const { SitemapStream, parseSitemaps } = sitemapsPkg;
const seed = process.env.SEED_URL || 'https://forwardnetworks.com';

const htmlOutDir = 'tmp/html';
const textBaseDir = 'text';
const textDirs = {
  header: path.join(textBaseDir, 'header'),
  content: path.join(textBaseDir, 'content'),
  footer: path.join(textBaseDir, 'footer'),
};

// Ensure all folders exist
await fs.mkdir(htmlOutDir, { recursive: true });
for (const dir of Object.values(textDirs)) {
  await fs.mkdir(dir, { recursive: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const toVisit = new Set([seed]);
const visited = new Set();

while (toVisit.size) {
  const url = toVisit.values().next().value;
  toVisit.delete(url);
  visited.add(url);

  console.log('▶', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  const html = await page.content();
  const slug = url.replace(/https?:\/\//, '').replace(/[^\w]/g, '_');

  await fs.writeFile(path.join(htmlOutDir, slug + '.html'), html);

  // Extract separate text parts
  const { header, content, footer } = await page.evaluate(() => {
    const getText = el => el?.innerText?.trim() || '';

    const headerText = getText(document.querySelector('header'));
    const footerText = getText(document.querySelector('footer'));

    // Temporarily hide header/footer for "content" extraction
    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector('footer');
    if (headerEl) headerEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'none';

    const contentText = document.body.innerText.trim();

    // Restore visibility (not strictly necessary in headless, but clean)
    if (headerEl) headerEl.style.display = '';
    if (footerEl) footerEl.style.display = '';

    return { header: headerText, content: contentText, footer: footerText };
  });

  await fs.writeFile(path.join(textDirs.header, slug + '.txt'), header);
  await fs.writeFile(path.join(textDirs.content, slug + '.txt'), content);
  await fs.writeFile(path.join(textDirs.footer, slug + '.txt'), footer);

  const links = await page.$$eval('a[href^="http"]', els => els.map(a => a.href));
  links.forEach(l => {
    if (l.startsWith(seed) && !visited.has(l)) toVisit.add(l);
  });
}

await browser.close();
