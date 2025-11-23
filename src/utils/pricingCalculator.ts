/**
 * V2 Pricing Calculator Utility
 * Matches backend pricing calculation logic
 * Reference: backend/utils/pricingCalculator.js
 */

export interface DiscountValidation {
  valid: boolean;
  error: string | null;
}

export interface PriceBreakdown {
  basePrice: number;
  priceAfterPrimaryDiscount: number;
  priceAfterCompoundingDiscount: number;
  finalPrice: number;
  totalSavings: number;
  primaryDiscountAmount: number;
  compoundingDiscountAmount: number;
}

/**
 * Calculate final equipment price with discounts
 * @param basePrice - Base price of equipment
 * @param discount - Primary discount value
 * @param discountType - Primary discount type: '%' or '$'
 * @param compoundingDiscount - Compounding discount value
 * @param compoundingDiscountType - Compounding discount type: '%' or '$'
 * @returns Final price after all discounts
 */
export function calculateEquipmentPrice(
  basePrice: number,
  discount: number = 0,
  discountType: string = '%',
  compoundingDiscount: number = 0,
  compoundingDiscountType: string = '%'
): number {
  // Validate inputs
  basePrice = parseFloat(basePrice as any) || 0;
  discount = parseFloat(discount as any) || 0;
  compoundingDiscount = parseFloat(compoundingDiscount as any) || 0;

  // Step 1: Apply primary discount
  let discountedPrice = basePrice;

  if (discount > 0) {
    if (discountType === '%') {
      // Percentage discount: ensure it's between 0-100
      const discountPercent = Math.min(Math.max(discount, 0), 100);
      discountedPrice = basePrice * (1 - discountPercent / 100);
    } else if (discountType === '$') {
      // Fixed discount
      discountedPrice = basePrice - discount;
    }
  }

  // Step 2: Apply compounding discount to already-discounted price
  let finalPrice = discountedPrice;

  if (compoundingDiscount > 0) {
    if (compoundingDiscountType === '%') {
      const compoundingPercent = Math.min(Math.max(compoundingDiscount, 0), 100);
      finalPrice = discountedPrice * (1 - compoundingPercent / 100);
    } else if (compoundingDiscountType === '$') {
      finalPrice = discountedPrice - compoundingDiscount;
    }
  }

  // Ensure price never goes negative
  finalPrice = Math.max(0, finalPrice);

  // Round to 2 decimal places
  return Math.round(finalPrice * 100) / 100;
}

/**
 * Validate discount value and type
 */
export function validateDiscount(
  discount: number,
  discountType: string
): DiscountValidation {
  const numValue = parseFloat(discount as any);

  if (isNaN(numValue) || numValue < 0) {
    return { valid: false, error: 'Discount must be a positive number' };
  }

  if (discountType === '%' && numValue > 100) {
    return { valid: false, error: 'Percentage discount cannot exceed 100%' };
  }

  return { valid: true, error: null };
}

/**
 * Get detailed price breakdown for display
 */
export function getPriceBreakdown(
  basePrice: number,
  discount: number = 0,
  discountType: string = '%',
  compoundingDiscount: number = 0,
  compoundingDiscountType: string = '%'
): PriceBreakdown {
  // Validate inputs
  basePrice = parseFloat(basePrice as any) || 0;
  discount = parseFloat(discount as any) || 0;
  compoundingDiscount = parseFloat(compoundingDiscount as any) || 0;

  // Step 1: Apply primary discount
  let priceAfterPrimary = basePrice;
  let primaryAmount = 0;

  if (discount > 0) {
    if (discountType === '%') {
      const discountPercent = Math.min(Math.max(discount, 0), 100);
      primaryAmount = basePrice * (discountPercent / 100);
      priceAfterPrimary = basePrice - primaryAmount;
    } else if (discountType === '$') {
      primaryAmount = discount;
      priceAfterPrimary = basePrice - discount;
    }
  }

  // Step 2: Apply compounding discount
  let priceAfterCompounding = priceAfterPrimary;
  let compoundingAmount = 0;

  if (compoundingDiscount > 0) {
    if (compoundingDiscountType === '%') {
      const compoundingPercent = Math.min(Math.max(compoundingDiscount, 0), 100);
      compoundingAmount = priceAfterPrimary * (compoundingPercent / 100);
      priceAfterCompounding = priceAfterPrimary - compoundingAmount;
    } else if (compoundingDiscountType === '$') {
      compoundingAmount = compoundingDiscount;
      priceAfterCompounding = priceAfterPrimary - compoundingDiscount;
    }
  }

  // Ensure price never goes negative
  const finalPrice = Math.max(0, priceAfterCompounding);
  const totalSavings = basePrice - finalPrice;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    priceAfterPrimaryDiscount: Math.round(priceAfterPrimary * 100) / 100,
    priceAfterCompoundingDiscount: Math.round(priceAfterCompounding * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    primaryDiscountAmount: Math.round(primaryAmount * 100) / 100,
    compoundingDiscountAmount: Math.round(compoundingAmount * 100) / 100,
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Format discount for display
 */
export function formatDiscount(discount: number, discountType: string): string {
  if (discount === 0) return 'No discount';
  if (discountType === '%') return `${discount}% off`;
  return `$${discount.toFixed(2)} off`;
}
