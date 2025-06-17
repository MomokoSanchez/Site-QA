/* ────────── Site-QA · checks.js  (LT-only) ────────── */

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

import { cleanHtml } from './cleaner.js';
import blc from 'broken-link-checker';   // optional 404 checker

/* ── 1. LanguageTool helper ─────────────────────────── */
async function ltCheck(text) {
  const res = await fetch(
    'https://api.languagetool.org/v2/check',
    { method: 'POST', body: new URLSearchParams({ language: 'en-US', text }) }
  );
  if (!res.ok) throw new Error(`LanguageTool API ${res.status}`);
  return (await res.json()).matches;          // array of rule objects
}
/* ───────────────────────────────────────────────────── */

const htmlDir = 'tmp/html';
const files   = await fs.readdir(htmlDir);
const report  = [];

for (const file of files) {
  const html = await fs.readFile(path.join(htmlDir, file), 'utf8');
  const text = await cleanHtml(html);

  // 1) Grammar / spelling from LanguageTool
  const ltMatches = await ltCheck(text);

  /* Transform each match into a concise string:
     "Message → offendingText"  */
  const issues = ltMatches.map(m => {
    const excerpt = text.slice(m.offset, m.offset + m.length).trim();
    return `${m.message} → “${excerpt}”`;
  });

  report.push({
    file,
    issues,                // <── array of strings
    issueCount: issues.length
  });
}


await fs.writeFile('report.json', JSON.stringify(report, null, 2));
console.log('Report written to report.json');
