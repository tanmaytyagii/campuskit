/**
 * Reads CSV text the way the analyzer's pandas call does
 * (read_csv with header=None, dtype=str, keep_default_na=False and
 * skip_blank_lines=False): quoted fields may contain commas, quotes and line
 * breaks; a row with more fields than the first line is an error; shorter
 * rows and blank lines are padded with empty strings.
 */

export type CsvRead = { ok: true; rows: string[][] } | { ok: false; error: string };

function splitRecords(text: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let index = 0;
  const endRecord = () => {
    fields.push(field);
    records.push(fields);
    fields = [];
    field = '';
  };
  while (index < text.length) {
    const char = text[index] ?? '';
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
      } else {
        field += char;
      }
      index += 1;
      continue;
    }
    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      endRecord();
    } else {
      field += char;
    }
    index += 1;
  }
  // A final line without a line break still counts; a trailing line break doesn't add a row.
  if (field !== '' || fields.length > 0 || quoted) endRecord();
  return records;
}

export function readCsv(text: string): CsvRead {
  const content = text.startsWith('\uFEFF') ? text.slice(1) : text;
  // pandas finds "no columns to parse" when the file is empty or its first line is blank,
  // whatever follows; a first line of only spaces is a column without a name.
  if (content === '' || content.startsWith('\n') || content.startsWith('\r'))
    return { ok: false, error: 'The file is empty.' };
  const records = splitRecords(content);
  const width = records[0]?.length ?? 0;
  const rows: string[][] = [];
  for (const [position, fields] of records.entries()) {
    // A blank line is one empty field; pandas turns it into an all-empty row.
    const blank = fields.length === 1 && fields[0] === '';
    // pandas numbers records, not physical lines: a line break inside quotes doesn't count.
    if (!blank && fields.length > width) {
      return {
        ok: false,
        error: `The file could not be read as CSV: Error tokenizing data. C error: Expected ${width} fields in line ${position + 1}, saw ${fields.length}. Check for extra commas on that line.`,
      };
    }
    const row = blank ? [] : [...fields];
    while (row.length < width) row.push('');
    rows.push(row);
  }
  return { ok: true, rows };
}
