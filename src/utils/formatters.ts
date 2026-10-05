export const formatFCFA = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  return Math.round(amount).toLocaleString('fr-FR') + ' FCFA';
};

export const formatNumber = (num: number | undefined | null, decimals = 1): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (Number.isInteger(num)) return num.toLocaleString('fr-FR');
  return Number(num.toFixed(decimals)).toLocaleString('fr-FR');
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
