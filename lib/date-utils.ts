/**
 * Returns the date in Europe/Paris timezone as YYYY-MM-DD.
 * Use for grouping by "day" so that one column = one day in French time.
 */
export function getParisDateString(isoDate: string): string {
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // YYYY-MM-DD with en-CA
}
