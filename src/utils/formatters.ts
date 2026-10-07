export const formatFCFA = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
};

export const formatNumber = (num: number | undefined | null, decimals = 1): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (Number.isInteger(num)) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  const parts = Number(num.toFixed(decimals)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
};

export const formatUnit = (unit: string | undefined | null): string => {
  if (!unit) return '';
  const clean = unit.trim().toLowerCase();
  if (clean === 'kilogramme' || clean === 'kilogrammes' || clean === 'kg') return 'kg';
  if (clean === 'litre' || clean === 'litres' || clean === 'l') return 'L';
  if (clean === 'tonne' || clean === 'tonnes') return 't';
  if (clean === 'sac' || clean === 'sacs') return 'sac';
  if (clean === 'unite' || clean === 'unité' || clean === 'unites' || clean === 'unités') return 'u';
  return unit;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    // If it's YYYY-MM-DD or ISO
    const parts = dateStr.split(/[- :T]/);
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split(/[- :T]/);
    if (parts.length >= 5) {
      return `${parts[2]}/${parts[1]}/${parts[0]} à ${parts[3]}:${parts[4]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};
