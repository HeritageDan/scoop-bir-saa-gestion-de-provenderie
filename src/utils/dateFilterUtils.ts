export type DateFilterPreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Returns date strings in local timezone YYYY-MM-DD
 */
export function formatToDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves start and end dates based on filter preset
 */
export function getDateRangeFromPreset(preset: DateFilterPreset, customRange?: DateRange): DateRange {
  const now = new Date();

  if (preset === 'today') {
    const dStr = formatToDateInput(now);
    return { startDate: dStr, endDate: dStr };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dStr = formatToDateInput(yesterday);
    return { startDate: dStr, endDate: dStr };
  }

  if (preset === 'this_week') {
    // Start of current week (Monday)
    const current = new Date(now);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));
    return {
      startDate: formatToDateInput(monday),
      endDate: formatToDateInput(now),
    };
  }

  if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatToDateInput(firstDay),
      endDate: formatToDateInput(now),
    };
  }

  if (preset === 'custom' && customRange) {
    return {
      startDate: customRange.startDate || formatToDateInput(now),
      endDate: customRange.endDate || formatToDateInput(now),
    };
  }

  const dStr = formatToDateInput(now);
  return { startDate: dStr, endDate: dStr };
}

/**
 * Checks if a target date string (YYYY-MM-DD or full ISO string) falls within [startDate, endDate] inclusive
 */
export function isDateInRange(targetDateStr: string, startDate: string, endDate: string): boolean {
  if (!targetDateStr) return false;
  // Normalize target date to YYYY-MM-DD
  const cleanTarget = targetDateStr.slice(0, 10);
  return cleanTarget >= startDate && cleanTarget <= endDate;
}

/**
 * Human readable representation of date range
 */
export function formatHumanDateRange(startDate: string, endDate: string, language: 'fr' | 'en' = 'fr'): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const dStart = new Date(startDate + 'T00:00:00');
  const dEnd = new Date(endDate + 'T00:00:00');
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  if (startDate === endDate) {
    return dStart.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const strStart = dStart.toLocaleDateString(locale, opts);
  const strEnd = dEnd.toLocaleDateString(locale, opts);
  return language === 'fr' ? `Du ${strStart} au ${strEnd}` : `From ${strStart} to ${strEnd}`;
}
