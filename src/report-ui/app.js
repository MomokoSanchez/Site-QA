// src/report-ui/app.js
async function main() {
  const data = await (await fetch('report.json')).json();

  // Group entries by slug (remove .txt and folder prefix)
  const grouped = {};
  for (const r of data) {
    if (!r.file || !r.file.includes('/')) continue; // skip malformed entries

    const [folder, name] = r.file.split('/');
    if (!folder || !name) continue;

    const slug = name.replace(/\.txt$/, '');
    if (!grouped[slug]) grouped[slug] = {};
    grouped[slug][folder] = r;
  }


  const rows = Object.entries(grouped).map(([slug, parts]) => {
    return `
      <tr><td colspan="2" style="font-weight:bold; background:#eee;">${slug}</td></tr>
      ${['header', 'content', 'footer'].map(part => {
        const file = parts[part];
        return file ? `
          <tr>
            <td style="vertical-align:top;">${part.toUpperCase()}</td>
            <td>
              ${file.issues.length
                ? `<ul>${file.issues.map(i => `<li>${i}</li>`).join('')}</ul>`
                : '0'}
            </td>
          </tr>
        ` : '';
      }).join('')}
    `;
  }).join('');

  document.getElementById('root').innerHTML = `
    <table>
      <thead>
        <tr><th>Section</th><th>Issues (message → excerpt)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

main().catch(err => {
  document.getElementById('root').textContent =
    'Failed to load report.json – ' + err.message;
});
