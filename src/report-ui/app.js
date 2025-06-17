// src/report-ui/app.js
async function main() {
  const data = await (await fetch('report.json')).json();

  const rows = data.map(
    r => `<tr>
            <td style="vertical-align:top;">${r.file}</td>
            <td>
              ${r.issues.length
                ? `<ul>${r.issues.map(i => `<li>${i}</li>`).join('')}</ul>`
                : '0'}
            </td>
          </tr>`
  ).join('');

  document.getElementById('root').innerHTML = `
    <table>
      <thead>
        <tr><th>Page</th><th>Issues (message → excerpt)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

main().catch(err => {
  document.getElementById('root').textContent =
    'Failed to load report.json – ' + err.message;
});
