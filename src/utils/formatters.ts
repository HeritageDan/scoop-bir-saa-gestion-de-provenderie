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
  if (clean === 'gramme' || clean === 'grammes' || clean === 'g') return 'g';
  if (clean === 'litre' || clean === 'litres' || clean === 'l') return 'L';
  if (clean === 'tonne' || clean === 'tonnes') return 't';
  if (clean === 'sac' || clean === 'sacs') return 'sac';
  if (clean === 'boite' || clean === 'boîte' || clean === 'boites' || clean === 'boîtes') return 'boîte';
  if (clean === 'bidon' || clean === 'bidons') return 'bidon';
  if (clean === 'gallon' || clean === 'gallons') return 'gal';
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

export const formatProductVolumeSold = (
  qtyGros: number,
  saleUnit: string | undefined | null,
  qtyDetail: number,
  baseUnit: string | undefined | null,
  totalBaseUnit?: number,
  conversionFactor?: number
): string => {
  const cleanSale = saleUnit ? saleUnit.trim() : 'sac';
  const cleanBase = baseUnit ? baseUnit.trim() : 'kg';

  const formatWithUnit = (qty: number, unit: string) => {
    const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');
    const u = unit.trim().toLowerCase();
    if (u === 'kg' || u === 'kilogramme' || u === 'kilogrammes') return `${qtyStr} kg`;
    if (u === 'g' || u === 'gramme' || u === 'grammes') return `${qtyStr} g`;
    if (u === 'l' || u === 'litre' || u === 'litres') return `${qtyStr} L`;
    if (u === 't' || u === 'tonne' || u === 'tonnes') return `${qtyStr} t`;
    if (u === 'sac' || u === 'sacs') return `${qtyStr} ${qty > 1 ? 'sacs' : 'sac'}`;
    if (u === 'carton' || u === 'cartons') return `${qtyStr} ${qty > 1 ? 'cartons' : 'carton'}`;
    if (u === 'boite' || u === 'boîte' || u === 'boites' || u === 'boîtes') return `${qtyStr} ${qty > 1 ? 'boîtes' : 'boîte'}`;
    if (u === 'bidon' || u === 'bidons') return `${qtyStr} ${qty > 1 ? 'bidons' : 'bidon'}`;
    if (u === 'gallon' || u === 'gallons') return `${qtyStr} ${qty > 1 ? 'gallons' : 'gallon'}`;
    if (u === 'unite' || u === 'unité' || u === 'unites' || u === 'unités') return `${qtyStr} ${qty > 1 ? 'unités' : 'unité'}`;
    return `${qtyStr} ${unit}${qty > 1 && !unit.endsWith('s') ? 's' : ''}`;
  };

  const hasGros = qtyGros > 0;
  const hasDetail = qtyDetail > 0;

  if (hasGros && hasDetail) {
    const grosPart = formatWithUnit(qtyGros, cleanSale);
    const detailPart = formatWithUnit(qtyDetail, cleanBase);
    if (conversionFactor && conversionFactor > 1 && totalBaseUnit !== undefined && totalBaseUnit > 0) {
      const basePart = formatWithUnit(totalBaseUnit, cleanBase);
      return `${grosPart} + ${detailPart} (${basePart})`;
    }
    return `${grosPart} + ${detailPart}`;
  }

  if (hasGros) {
    return formatWithUnit(qtyGros, cleanSale);
  }

  if (hasDetail) {
    return formatWithUnit(qtyDetail, cleanBase);
  }

  return `0 ${cleanSale}`;
};
