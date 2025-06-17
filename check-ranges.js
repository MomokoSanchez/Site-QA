import fs from 'node:fs';
import { execSync } from 'node:child_process';
import semver from 'semver';

// 1) Load package.json
const pj = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const ranges = { ...(pj.dependencies || {}), ...(pj.devDependencies || {}) };

console.log('\n🔍  Validating semver ranges in package.json\n');

for (const [name, range] of Object.entries(ranges)) {
  try {
    // 2) Get the full version list from npm
    const raw = execSync(`npm view ${name} versions --json`, { stdio: ['ignore', 'pipe', 'ignore'] });
    const versions = JSON.parse(raw.toString());

    // 3) Check if **any** published version satisfies the declared range
    const hasMatch = versions.some(v => semver.satisfies(v, range, { includePrerelease: true }));

    console.log(
      hasMatch ? `✅  ${name}@${range}` : `❌  ${name}@${range}  (no published match)`
    );
  } catch (err) {
    console.log(`⚠️   ${name} — could not query npm (${err.message.trim()})`);
  }
}
console.log('\nDone.\n');
