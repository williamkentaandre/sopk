import { Pair, HistoryEntry } from './types';
import ExcelJS from 'exceljs';

export interface ExportData {
  pairs: Array<{
    pair: Pair;
    history: HistoryEntry[];
  }>;
  timestamps: string[];
}

/**
 * Formats a date (YYYY-MM-DD) for column headers (one column per day)
 */
export function formatDateHeader(dateStr: string): string {
  return dateStr; // YYYY-MM-DD, one column per day
}

/** Get position for a given day (most recent measurement of that day) */
function getPositionForDay(history: HistoryEntry[], dateStr: string): number | null | undefined {
  const entries = history.filter((h) => h.checked_at.slice(0, 10) === dateStr);
  if (entries.length === 0) return undefined;
  const latest = entries.sort((a, b) => b.checked_at.localeCompare(a.checked_at))[0];
  return latest?.position ?? undefined;
}

/**
 * Generates CSV content from export data (one column per day)
 */
export function generateCSV(data: ExportData): string {
  const lines: string[] = [];

  const headers = ['Mot-clé', 'URL', 'Dernière Position', 'URL Trouvée', ...data.timestamps.map(formatDateHeader)];
  lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const { pair, history } of data.pairs) {
    const row: string[] = [];
    row.push(`"${pair.keyword.replace(/"/g, '""')}"`);
    row.push(`"${(pair.raw_url || pair.url).replace(/"/g, '""')}"`);
    const lastPos = pair.last_position;
    row.push(lastPos !== null && lastPos !== undefined ? String(lastPos) : '-');
    const lastMatchedUrl = (pair as any).last_matched_url;
    row.push(lastMatchedUrl ? `"${lastMatchedUrl.replace(/"/g, '""')}"` : '-');

    for (const dateStr of data.timestamps) {
      const position = getPositionForDay(history, dateStr);
      row.push(position !== null && position !== undefined ? String(position) : '-');
    }
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Generates XLSX workbook from export data (one column per day)
 */
export async function generateXLSX(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SEO Rankings');

  const headers = ['Mot-clé', 'URL', 'Dernière Position', 'URL Trouvée', ...data.timestamps.map(formatDateHeader)];
  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  for (const { pair, history } of data.pairs) {
    const row: (string | number)[] = [];
    row.push(pair.keyword);
    row.push(pair.raw_url || pair.url);
    const lastPos = pair.last_position;
    row.push(lastPos !== null && lastPos !== undefined ? lastPos : '-');
    const lastMatchedUrl = (pair as any).last_matched_url;
    row.push(lastMatchedUrl || '-');

    for (const dateStr of data.timestamps) {
      const position = getPositionForDay(history, dateStr);
      row.push(position !== null && position !== undefined ? position : '-');
    }
    worksheet.addRow(row);
  }

  // Auto-size columns
  worksheet.columns.forEach((column, index) => {
    if (index < 2) {
      // Keyword and URL columns
      column.width = 30;
    } else {
      // Timestamp columns
      column.width = 18;
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Collects unique days (YYYY-MM-DD) from history entries, one column per day, sorted descending (most recent first).
 * Multiple measurements on the same day are grouped into a single column.
 */
export function collectTimestamps(
  data: Array<{ history: HistoryEntry[] }>,
  maxPoints?: number
): string[] {
  const dateSet = new Set<string>();

  for (const { history } of data) {
    for (const entry of history) {
      const day = entry.checked_at.slice(0, 10); // YYYY-MM-DD
      dateSet.add(day);
    }
  }

  const dates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  if (maxPoints && dates.length > maxPoints) {
    return dates.slice(0, maxPoints);
  }

  return dates;
}

