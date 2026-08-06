/**
 * Build simple text PDFs for synthetic user-testing personas.
 * Usage: node scripts/generate-persona-pdfs.mjs
 */
import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const personasDir = join(root, 'user-testing', 'personas');

function escapePdfText(text) {
  // Helvetica in this minimal PDF is WinAnsi-ish; keep ASCII-safe.
  const ascii = text
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x09\x20-\x7E]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimal multi-page text PDF (Helvetica) readable by pdf-parse / ATS-style extractors. */
function textToPdf(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const maxLinesPerPage = 48;
  const pages = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentIds = [];
  for (const pageLines of pages) {
    let stream = 'BT\n/F1 10 Tf\n14 TL\n50 780 Td\n';
    pageLines.forEach((line, idx) => {
      const safe = escapePdfText(line.slice(0, 95));
      if (idx === 0) stream += `(${safe}) Tj\n`;
      else stream += `T* (${safe}) Tj\n`;
    });
    stream += 'ET';
    contentIds.push(
      add(
        `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
      ),
    );
  }

  const pageIds = contentIds.map((contentId) =>
    add(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    ),
  );

  // Patch parent kids reference after we know page object numbers
  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  const pagesId = add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);
  // Fix Parent refs in page objects (they temporarily said 0 0 R)
  for (const pageId of pageIds) {
    objects[pageId - 1] = objects[pageId - 1].replace(
      '/Parent 0 0 R',
      `/Parent ${pagesId} 0 R`,
    );
  }

  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

const personas = readdirSync(personasDir).filter((name) =>
  statSync(join(personasDir, name)).isDirectory(),
);

for (const name of personas) {
  const cvPath = join(personasDir, name, 'cv.txt');
  const outPath = join(personasDir, name, 'cv.pdf');
  const text = readFileSync(cvPath, 'utf8');
  writeFileSync(outPath, textToPdf(text));
  console.log(`wrote ${outPath}`);
}
