// src/checks.js
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

const ignorePath = path.resolve('ignorelist.txt');
let ignoreList = [];

// Load ignore list if present
try {
  const ignoreText = await fs.readFile(ignorePath, 'utf8');
  ignoreList = ignoreText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
} catch {
  console.warn(`⚠️  No ignorelist.txt found — continuing without ignore rules.`);
}

// Load your original URLs from urls.txt (one URL per line)
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

// Build a map: slug → original URL
const urlMap = {};
for (let raw of rawUrls) {
  const fullUrl = raw.match(/^https?:\/\//) ? raw : `https://${raw}`;
  const stripped = fullUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const slug = stripped.replace(/\./g, '_').replace(/\//g, '_');
  urlMap[slug] = fullUrl;
}

// Helper: run LanguageTool check on a chunk of text
async function ltCheck(text) {
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'en-US' })
  });
  const json = await res.json();
  return json.matches || [];
}

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
    const ltMatches = await ltCheck(text);

    // Build an array of issue strings and filter by ignoreList
    const issues = ltMatches
      .map(m => {
        const excerpt = text.slice(m.offset, m.offset + m.length).trim();
        return { message: m.message, excerpt };
      })
      .filter(m => !ignoreList.includes(m.excerpt))
      .map(m => `${m.message} → “${m.excerpt}”`);

    // Derive slug from filename (without .txt)
    const slug = file.replace(/\.txt$/, '');

    // Determine URL: first try your urls.txt mapping
    let url = urlMap[slug];
    if (!url) {
      // Fallback: host = first 3 segments, path = rest joined by '-'
      const parts     = slug.split('_').filter(Boolean);
      const host      = parts.slice(0, 3).join('.');
      const tailParts = parts.slice(3);
      const tail      = tailParts.join('-');
      url = tail
        ? `https://${host}/${tail}`
        : `https://${host}`;
    }

    report.push({
      // include folder prefix so UI grouping works
      file:        `${folder}/${file}`,
      url,
      issues,
      issueCount:  issues.length,
    });
  }
}

// Write out report.json
await fs.writeFile('report.json', JSON.stringify(report, null, 2));
console.log('✅ report.json written with', report.length, 'entries.');
