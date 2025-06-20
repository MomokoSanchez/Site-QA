import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

async function ltCheck(text) {
  const res = await fetch(
    'https://api.languagetool.org/v2/check',
    { method: 'POST', body: new URLSearchParams({ language: 'en-US', text }) }
  );
  if (!res.ok) throw new Error(`LanguageTool API ${res.status}`);
  return (await res.json()).matches;
}

const folders = ['header', 'content', 'footer'];
const report = [];

for (const folder of folders) {
  const dir = path.join('text', folder);
  const files = await fs.readdir(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const text = await fs.readFile(fullPath, 'utf8');

    const ltMatches = await ltCheck(text);
    const issues = ltMatches.map(m => {
      const excerpt = text.slice(m.offset, m.offset + m.length).trim();
      return `${m.message} → “${excerpt}”`;
    });

    report.push({
      file: `${folder}/${file}`,
      issues,
      issueCount: issues.length,
    });
  }
}

await fs.writeFile('report.json', JSON.stringify(report, null, 2));
console.log('✅ Report written to report.json');
