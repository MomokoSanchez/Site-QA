// src/report-ui/app.js
async function main() {
  const data = await (await fetch('report.json')).json();

  function renderIssues(section) {
    if (!section) return 'Missing';
    return section.issues.length
      ? `<ul>${section.issues.map(i => `<li>${i}</li>`).join('')}</ul>`
      : '0';
  }

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

  if (data.length === 1 && data[0].file === 'ERROR') {
    document.getElementById('root').innerHTML = `
      <div style="color: red; font-weight: bold;">${data[0].issues[0]}</div>
    `;
    return;
  }

  const rows = [
    '<tr><td style="font-weight:bold;">HEADER</td><td>' +
      renderIssues(grouped[Object.keys(grouped)[0]]?.header) + '</td></tr>',
    ...Object.entries(grouped).map(([slug, parts]) =>
      `<tr>
        <td><a href="https://${slug.replace(/_/g, '/').replace(/^([^\/]+)\//, '$1.')}">${slug.replace(/_/g, '/')}</a></td>
        <td>${renderIssues(parts.content)}</td>
      </tr>
      `
    ),
    '<tr><td style="font-weight:bold;">FOOTER</td><td>' +
      renderIssues(grouped[Object.keys(grouped)[0]]?.footer) + '</td></tr>'
  ].join('');

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
