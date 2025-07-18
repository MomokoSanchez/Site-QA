import fetch from 'node-fetch'; // v2 or higher
import fs from 'fs/promises';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Load report.json
const jsonText = await fs.readFile('report.json', 'utf8');
const data = JSON.parse(jsonText);


if (data.length === 1 && data[0].file === 'ERROR') {
  await sendToSlack(`❌ Report Error: ${data[0].issues[0]}`);
  process.exit(1);
}

// Count totals
let totalWarnings = 0;
const summaries = [];

for (const [i, r] of data.entries()) {
  const count = r.issues?.length || 0;
  totalWarnings += count;
  if (!count) continue;

  const label =
    i === 0
      ? 'Header'
      : i === data.length - 1
      ? 'Footer'
      : r.url || r.file;

  summaries.push(`• ${label}: ${count} typo${count !== 1 ? 's' : ''}`);
}


const message = `📝 Typo Report Summary
Total Pages: ${data.length}
Total Warnings: ${totalWarnings}

${summaries.join('\n') || '✅ No issues found!'}

\n Full Report: https://momokosanchez.github.io/Site-QA/`;

await sendToSlack(message);

// Send to Slack via webhook
async function sendToSlack(text) {
  const payload = { text };
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error(`Failed to send to Slack: ${res.statusText}`);
    process.exit(1);
  }
  console.log('✅ Successfully sent report to Slack!');
}
