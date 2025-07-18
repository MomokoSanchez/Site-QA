// src/report-ui/app.js
async function main() {
  // ——— point at the generated JSON (move report.json into this dir or adjust path) ———
  const res = await fetch('report.json');
  if (!res.ok) throw new Error(`Unable to load report.json (${res.status})`);
  const data = await res.json();

  function renderIssues(section) {
    if (!section) return 'Missing';
    return section.issues.length
      ? `<ul>${section.issues.map(i => `<li>${i}</li>`).join('')}</ul>`
      : '0';
  }

  function countIssues(section) {
    return section?.issues?.length || 0;
  }

  // group by filename (strip folder)
  const grouped = {};
  for (const r of data) {
    if (!r.file?.includes('/')) continue;
    const [folder, name] = r.file.split('/');
    if (!grouped[name]) grouped[name] = {};
    grouped[name][folder] = r;
  }

  // handle a single ERROR entry
  if (data.length === 1 && data[0].file === 'ERROR') {
    document.getElementById('root').innerHTML = `
      <div style="color:red; font-weight:bold;">
        ${data[0].issues[0]}
      </div>`;
    return;
  }

  const totalWarnings = data.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
  const totalPages    = Object.keys(grouped).length;

  const root = document.getElementById('root');
  root.innerHTML = `<p>There are ${totalWarnings} warnings on ${totalPages} pages.</p>`;

  const rows = [
    '<tr><th>URL</th><th>Warnings</th><th>Issues</th></tr>'
  ];

  const firstKey = Object.keys(grouped)[0];

  // HEADER
  const headerRow = grouped[firstKey].header;
  rows.push(`
    <tr>
      <td style="font-weight:bold;">HEADER</td>
      <td>${countIssues(headerRow)} warning${countIssues(headerRow)!==1?'s':''}</td>
      <td>${renderIssues(headerRow)}</td>
    </tr>`);

  // CONTENT
  for (const name of Object.keys(grouped)) {
    const section = grouped[name].content;
    if (!section) continue;
    const displayURL = section?.url || name.replace(/\.txt$/, '').replace(/_/g, '.');
    rows.push(`
      <tr>
        <td>${displayURL}</td>
        <td>${countIssues(section)} warning${countIssues(section)!==1?'s':''}</td>
        <td>${renderIssues(section)}</td>
      </tr>`);
  }

  // FOOTER
  const footerRow = grouped[firstKey].footer;
  rows.push(`
    <tr>
      <td style="font-weight:bold;">FOOTER</td>
      <td>${countIssues(footerRow)} warning${countIssues(footerRow)!==1?'s':''}</td>
      <td>${renderIssues(footerRow)}</td>
    </tr>`);

  root.innerHTML += `
    <table class="table">
      ${rows.join('\n')}
    </table>`;
}

main().catch(err => {
  console.error(err);
  document.getElementById('root').innerHTML =
    `<div style="color:red;">${err.message}</div>`;
});
