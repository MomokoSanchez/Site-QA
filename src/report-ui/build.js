import fs from 'node:fs/promises';
import path from 'node:path';

const distDir = 'dist';
await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await fs.copyFile('report.json', path.join(distDir, 'report.json'));
await fs.copyFile('src/report-ui/index.html', path.join(distDir, 'index.html'));
await fs.copyFile('src/report-ui/app.js', path.join(distDir, 'app.js'));
console.log('UI built to dist/');