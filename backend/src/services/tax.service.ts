export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
}

export const calculateTax = (
  amount: number,
  gstRate: number,
  isIntraState = true
): TaxBreakdown => {
  const totalGst = Math.round((amount * gstRate) / 100);
  if (isIntraState) {
    const half = Math.round(totalGst / 2);
    return { cgst: half, sgst: totalGst - half, igst: 0, totalGst };
  }
  return { cgst: 0, sgst: 0, igst: totalGst, totalGst };
};

export const calculateOrderTax = (
  items: { lineTotal: number; gstRate: number }[],
  isIntraState = true
) => {
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGst = 0;

  for (const item of items) {
    const tax = calculateTax(item.lineTotal, item.gstRate, isIntraState);
    totalCgst += tax.cgst;
    totalSgst += tax.sgst;
    totalIgst += tax.igst;
    totalGst += tax.totalGst;
  }

  return { cgst: totalCgst, sgst: totalSgst, igst: totalIgst, totalGst };
};

export const GST_RATES = {
  FOOD_PRODUCTS: 5,
  GRAINS: 5,
  DRY_FRUITS: 5,
  FLOUR: 5,
  JUICES: 12,
  READY_TO_EAT: 12,
  POOJA_ITEMS: 5,
  ORGANIC_PRODUCTS: 5,
  DEFAULT: 5,
};

export const getGstRateForCategory = (categorySlug: string): number => {
  const rates: Record<string, number> = {
    'dry-fruits': GST_RATES.DRY_FRUITS,
    grains: GST_RATES.GRAINS,
    flour: GST_RATES.FLOUR,
    'ready-to-eat': GST_RATES.READY_TO_EAT,
    juices: GST_RATES.JUICES,
    'pooja-items': GST_RATES.POOJA_ITEMS,
    'organic-products': GST_RATES.ORGANIC_PRODUCTS,
  };
  return rates[categorySlug] || GST_RATES.DEFAULT;
};
