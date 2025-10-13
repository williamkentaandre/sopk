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
 * Formats timestamp for column headers (YYYY-MM-DD HH:mm in Europe/Paris timezone)
 */
export function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  
  // Format in Europe/Paris timezone
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * Generates CSV content from export data
 */
export function generateCSV(data: ExportData): string {
  const lines: string[] = [];

  // Header row - add "Dernière Position" and "URL Trouvée" columns
  const headers = ['Mot-clé', 'URL', 'Dernière Position', 'URL Trouvée', ...data.timestamps.map(formatTimestamp)];
  lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const { pair, history } of data.pairs) {
    const row: string[] = [];
    
    // Keyword and URL
    row.push(`"${pair.keyword.replace(/"/g, '""')}"`);
    row.push(`"${(pair.raw_url || pair.url).replace(/"/g, '""')}"`);
    
    // Last position (from pair.last_position)
    const lastPos = pair.last_position;
    row.push(lastPos !== null && lastPos !== undefined ? String(lastPos) : '-');
    
    // Last matched URL (from pair.last_matched_url)
    const lastMatchedUrl = (pair as any).last_matched_url;
    row.push(lastMatchedUrl ? `"${lastMatchedUrl.replace(/"/g, '""')}"` : '-');

    // Position for each timestamp (from history)
    for (const timestamp of data.timestamps) {
      const entry = history.find(h => h.checked_at === timestamp);
      const position = entry?.position;
      row.push(position !== null && position !== undefined ? String(position) : '-');
    }

    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Generates XLSX workbook from export data
 */
export async function generateXLSX(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SEO Rankings');

  // Header row - add "Dernière Position" and "URL Trouvée" columns
  const headers = ['Mot-clé', 'URL', 'Dernière Position', 'URL Trouvée', ...data.timestamps.map(formatTimestamp)];
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Data rows
  for (const { pair, history } of data.pairs) {
    const row: (string | number)[] = [];
    
    row.push(pair.keyword);
    row.push(pair.raw_url || pair.url);
    
    // Last position (from pair.last_position)
    const lastPos = pair.last_position;
    row.push(lastPos !== null && lastPos !== undefined ? lastPos : '-');
    
    // Last matched URL (from pair.last_matched_url)
    const lastMatchedUrl = (pair as any).last_matched_url;
    row.push(lastMatchedUrl || '-');

    // Position for each timestamp (from history)
    for (const timestamp of data.timestamps) {
      const entry = history.find(h => h.checked_at === timestamp);
      const position = entry?.position;
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
 * Collects all unique timestamps from history entries, sorted descending (most recent first)
 */
export function collectTimestamps(
  data: Array<{ history: HistoryEntry[] }>,
  maxPoints?: number
): string[] {
  const timestampSet = new Set<string>();

  for (const { history } of data) {
    for (const entry of history) {
      timestampSet.add(entry.checked_at);
    }
  }

  const timestamps = Array.from(timestampSet).sort((a, b) => b.localeCompare(a));

  if (maxPoints && timestamps.length > maxPoints) {
    return timestamps.slice(0, maxPoints);
  }

  return timestamps;
}

