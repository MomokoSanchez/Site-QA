// src/checks.js
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

const MAX_LT_TEXT = 20000;
const LANGUAGETOOL_API_KEY = process.env.LANGUAGETOOL_API_KEY;

// Load ignore list if present
const ignorePath = path.resolve('ignorelist.txt');
let ignoreList = [];
try {
  const ignoreText = await fs.readFile(ignorePath, 'utf8');
  ignoreList = ignoreText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
} catch {
  console.warn(`⚠️  No ignorelist.txt found — continuing without ignore rules.`);
}

// Load URLs from urls.txt
const urlsFile = path.resolve('urls.txt');
let rawUrls = [];
try {
  const txt = await fs.readFile(urlsFile, 'utf8');
  rawUrls = txt
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
} catch {
  console.warn(`⚠️  Could not read urls.txt — falling back to slug-based URLs.`);
}

// Build slug → URL map
const urlMap = {};
for (let raw of rawUrls) {
  const fullUrl = raw.match(/^https?:\/\//) ? raw : `https://${raw}`;
  const stripped = fullUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const slug = stripped.replace(/\./g, '_').replace(/\//g, '_');
  urlMap[slug] = fullUrl;
}

/**
 * If text is longer than MAX_LT_TEXT, break it into chunks
 * that track their original start index.
 */
function chunkText(str) {
  const chunks = [];
  let start = 0;
  while (start < str.length) {
    const slice = str.slice(start, start + MAX_LT_TEXT);
    chunks.push({ text: slice, start });
    start += MAX_LT_TEXT;
  }
  return chunks;
}

/**
 * Run a single LanguageTool check.
 * If LT returns plain text (e.g. “exceeds limit”), this will
 * throw a clean Error containing the body.
 */
async function ltCheck(text) {
  const res = await fetch('https://api.languagetoolplus.com/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 
        text, 
        language: 'en-US', 
        username: 'analytics@digdata.us', 
        apiKey: LANGUAGETOOL_API_KEY,
        enabledCategories: 'TYPOS',
        enabledOnly: 'true'
      })
  });

  if (!res.ok) {
    throw new Error(`LanguageTool API error ${res.status} ${res.statusText}`);
  }

  const body = await res.text();
  try {
    const json = JSON.parse(body);
    return json.matches || [];
  } catch {
    throw new Error(`LT returned non-JSON:\n${body}`);
  }
}

async function main() {
  const report = [];
  const folders = ['header', 'content', 'footer'];

  for (const folder of folders) {
    const dir = path.join('text', folder);
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      console.warn(`⚠️  Directory not found: ${dir}`);
      continue;
    }

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const text = await fs.readFile(fullPath, 'utf8');

      // 1) chunk & run LT
      let allMatches = [];
      if (text.length <= MAX_LT_TEXT) {
        allMatches = await ltCheck(text);
      } else {
        const parts = chunkText(text);
        for (const { text: chunk, start } of parts) {
          const matches = await ltCheck(chunk);
          for (const m of matches) {
            allMatches.push({
              ...m,
              offset: m.offset + start,
              length: m.length
            });
          }
        }
      }

      // 2) map/filter to issue strings
      const issues = allMatches
        .map(m => {
          const excerpt = text
            .slice(m.offset, m.offset + m.length)
            .trim();
          return { message: m.message, excerpt };
        })
        .filter(m => !ignoreList.includes(m.excerpt))
        .map(m => `${m.message} → “${m.excerpt}”`);

      // Derive slug and URL
      const slug = file.replace(/\.txt$/, '');
      let url = urlMap[slug];
      if (!url) {
        const parts     = slug.split('_').filter(Boolean);
        const host      = parts.slice(0, 3).join('.');
        const tailParts = parts.slice(3);
        const tail      = tailParts.join('-');
        url = tail
          ? `https://${host}/${tail}`
          : `https://${host}`;
      }

      report.push({
        file:       `${folder}/${file}`,
        url,
        issues,
        issueCount: issues.length,
      });
    }
  }

  await fs.writeFile('report.json', JSON.stringify(report, null, 2));
  console.log('✅ report.json written with', report.length, 'entries.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
