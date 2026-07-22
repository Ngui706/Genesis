function valueOf(row, column) {
  const value = typeof column.getValue === 'function' ? column.getValue(row) : row[column.key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function exportCsv(filename, rows, columns) {
  const csv = [columns.map((c) => csvCell(c.label)).join(','), ...rows.map((row) => columns.map((c) => csvCell(valueOf(row, c))).join(','))].join('\n');
  download(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

function xmlEscape(value) {
  return String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) { return [value & 255, (value >>> 8) & 255]; }
function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }

// Minimal ZIP writer using stored entries. The result is a valid XLSX workbook
// and avoids adding a large client-side dependency just for exports.
function zip(entries) {
  const encoder = new TextEncoder();
  const local = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const header = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc32(data)), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    local.push(header, name, data);
    const directory = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc32(data)), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]);
    central.push(directory, name);
    offset += header.length + name.length + data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return new Blob([...local, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportXlsx(filename, rows, columns) {
  const headers = columns.map((c) => `<c t="inlineStr"><is><t>${xmlEscape(c.label)}</t></is></c>`).join('');
  const body = rows.map((row, index) => `<row r="${index + 2}">${columns.map((c) => `<c t="inlineStr"><is><t>${xmlEscape(valueOf(row, c))}</t></is></c>`).join('')}</row>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${headers}</row>${body}</sheetData></worksheet>`;
  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  download(zip([{ name: '[Content_Types].xml', content: types }, { name: '_rels/.rels', content: rels }, { name: 'xl/workbook.xml', content: workbook }, { name: 'xl/_rels/workbook.xml.rels', content: workbookRels }, { name: 'xl/worksheets/sheet1.xml', content: sheet }]), `${filename}.xlsx`);
}

export function exportPdf(filename, title, rows, columns) {
  const lines = [title, '', columns.map((c) => c.label).join(' | '), ...rows.map((row) => columns.map((c) => valueOf(row, c)).join(' | '))];
  const escapePdf = (line) => String(line).replace(/[\\()]/g, '\\$&').slice(0, 140);
  const content = ['BT', '/F1 10 Tf', '40 800 Td', ...lines.flatMap((line, index) => [`(${escapePdf(line)}) Tj`, index < lines.length - 1 ? '0 -16 Td' : '']), 'ET'].join('\n');
  const objects = [`1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`, `2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj`, `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj`, `4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`, `5 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (const object of objects) { offsets.push(pdf.length); pdf += `${object}\n`; }
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  download(new Blob([pdf], { type: 'application/pdf' }), `${filename}.pdf`);
}

export function ExportButtons({ filename, title, rows, columns }) {
  const exportRows = rows || [];
  const buttonClass = 'btn-secondary !px-3 !py-2 text-xs';
  return React.createElement('div', { className: 'flex flex-wrap gap-2' },
    React.createElement('button', { type: 'button', className: buttonClass, onClick: () => exportCsv(filename, exportRows, columns) }, 'CSV'),
    React.createElement('button', { type: 'button', className: buttonClass, onClick: () => exportXlsx(filename, exportRows, columns) }, 'XLSX'),
    React.createElement('button', { type: 'button', className: buttonClass, onClick: () => exportPdf(filename, title, exportRows, columns) }, 'PDF'),
  );
}
import React from 'react';
