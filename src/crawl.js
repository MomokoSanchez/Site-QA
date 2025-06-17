import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import sitemapsPkg from 'sitemaps';
import fetch from 'node-fetch';

const { SitemapStream, parseSitemaps } = sitemapsPkg;
const seed = process.env.SEED_URL || 'https://forwardnetworks.com';
const outDir = 'tmp/html';

await fs.mkdir(outDir, { recursive: true });

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
  await fs.writeFile(path.join(outDir, slug + '.html'), html);

  const links = await page.$$eval('a[href^="http"]', els => els.map(a => a.href));
  links.forEach(l => {
    if (l.startsWith(seed) && !visited.has(l)) toVisit.add(l);
  });
}

await browser.close();