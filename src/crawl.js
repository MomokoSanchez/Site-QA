import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const htmlOutDir = 'tmp/html';
const textBaseDir = 'text';
const textDirs = {
  header: path.join(textBaseDir, 'header'),
  content: path.join(textBaseDir, 'content'),
  footer: path.join(textBaseDir, 'footer'),
};

// Clean up existing output folders
async function emptyFolder(dir) {
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      await fs.rm(path.join(dir, entry), { recursive: true, force: true });
    }
  } catch (e) {
    // Folder might not exist yet — ignore
  }
}

await emptyFolder('tmp/html');
await emptyFolder('text/header');
await emptyFolder('text/content');
await emptyFolder('text/footer');

// Ensure all folders exist
await fs.mkdir(htmlOutDir, { recursive: true });
for (const dir of Object.values(textDirs)) {
  await fs.mkdir(dir, { recursive: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Load URLs from urls.txt
const urlFilePath = path.resolve('urls.txt');
const urlFile = await fs.readFile(urlFilePath, 'utf8');
const urls = urlFile.split('\n').map(u => u.trim()).filter(Boolean);
const toVisit = new Set(urls);

// Enforce single-domain constraint
const origins = new Set(urls.map(u => new URL(u).origin));
if (origins.size > 1) {
  const msg = `❌ Error: Multiple domains detected in urls.txt:\n${[...origins].join('\n')}`;
  console.error(msg);

  await fs.writeFile('report.json', JSON.stringify([{ file: 'ERROR', issues: [msg] }], null, 2));
  process.exit(1);
}

// Track which domains we've already saved header/footer for
const savedDomains = new Set();

while (toVisit.size) {
  const url = toVisit.values().next().value;
  toVisit.delete(url);

  console.log('▶', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  const html = await page.content();
  const slug = url.replace(/https?:\/\//, '').replace(/[^\w]/g, '_');

  await fs.writeFile(path.join(htmlOutDir, slug + '.html'), html);

  // Extract separate text parts with heading newline logic
  const { header, content, footer } = await page.evaluate(() => {
    const getText = el => el?.innerText?.trim() || '';

    const headerText = getText(document.querySelector('header'));
    const footerText = getText(document.querySelector('footer'));

    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector('footer');
    if (headerEl) headerEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'none';

    // Insert real newline characters before and after headings
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      el.parentNode.insertBefore(document.createTextNode('\n'), el);
      el.parentNode.insertBefore(document.createTextNode('\n'), el.nextSibling);
    });

    const contentText = document.body.innerText.trim();

    if (headerEl) headerEl.style.display = '';
    if (footerEl) footerEl.style.display = '';

    return { header: headerText, content: contentText, footer: footerText };
  });

  // Save content file for this page
  await fs.writeFile(path.join(textDirs.content, slug + '.txt'), content);

  // Save header/footer once per domain (e.g., forwardnetworks_com)
  const domainMatch = slug.match(/^([a-z0-9]+_[a-z0-9]+)/);
  const domain = domainMatch ? domainMatch[1] : slug;

  if (!savedDomains.has(domain)) {
    await fs.writeFile(path.join(textDirs.header, domain + '.txt'), header);
    await fs.writeFile(path.join(textDirs.footer, domain + '.txt'), footer);
    savedDomains.add(domain);
  }
}

await browser.close();
