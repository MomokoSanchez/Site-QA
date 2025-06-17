// src/cleaner.js
import { JSDOM } from 'jsdom';

/**
 * Remove nav / footer / aside and return the visible text.
 * Strips <style> and <script> tags first so jsdom never tries to
 * parse potentially invalid CSS or JS.
 */
export function cleanHtml(html) {
  // 1) Cut <script>…</script> and <style>…</style> blocks up front
  const sanitized = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 2) Parse with jsdom
  const dom = new JSDOM(sanitized);
  const doc = dom.window.document;

  // 3) Drop obvious boiler-plate nodes
  for (const sel of ['nav', 'footer', 'aside']) {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  }

  // 4) Return joined paragraph text
  return Array.from(doc.querySelectorAll('p'))
    .map(p => p.textContent.trim())
    .filter(Boolean)
    .join('\n');
}
