// src/report-ui/app.js
async function main() {
  const data = await (await fetch('report.json')).json();

  function renderIssues(section) {
    if (!section) return 'Missing';
    return section.issues.length
      ? `<ul>${section.issues.map(i => `<li>${i}</li>`).join('')}</ul>`
      : '0';
  }

  function countIssues(section) {
    return section?.issues?.length || 0;
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

  const totalWarnings = data.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
  const totalPages = Object.keys(grouped).length;

  const root = document.getElementById('root');
  root.innerHTML = `<p>There are ${totalWarnings} warnings on ${totalPages} pages.</p>`;

  const rows = [
    '<tr><th>Slug</th><th>Warnings</th><th>Issues</th></tr>'
  ];

  // Add HEADER row
  const headerRow = grouped[Object.keys(grouped)[0]]?.header;
  rows.push(
    `<tr><td style="font-weight:bold;">HEADER</td><td>${countIssues(headerRow)} warning${countIssues(headerRow) !== 1 ? 's' : ''}</td><td>${renderIssues(headerRow)}</td></tr>`
  );

  // Add content rows (one per slug)
  for (const slug of Object.keys(grouped)) {
    const content = grouped[slug].content;
    rows.push(
      `<tr><td>${slug}</td><td>${countIssues(content)} warning${countIssues(content) !== 1 ? 's' : ''}</td><td>${renderIssues(content)}</td></tr>`
    );
  }

  // Add FOOTER row
  const footerRow = grouped[Object.keys(grouped)[0]]?.footer;
  rows.push(
    `<tr><td style="font-weight:bold;">FOOTER</td><td>${countIssues(footerRow)} warning${countIssues(footerRow) !== 1 ? 's' : ''}</td><td>${renderIssues(footerRow)}</td></tr>`
  );

  root.innerHTML += `
    <table class="table">
      ${rows.join('\n')}
    </table>
  `;
}

main();
