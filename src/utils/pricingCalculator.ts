// @ts-nocheck
export function calculateEquipmentPrice(
  basePrice: number | string,
  discount: number = 0,
  discountType: string = "%",
  compoundingDiscount: number = 0,
  compoundingDiscountType: string = "%"
): number {
  let price = parseFloat(String(basePrice)) || 0;
  if (discountType === "%") {
    price = price * (1 - discount / 100);
  } else {
    price = price - discount;
  }
  if (compoundingDiscount > 0) {
    if (compoundingDiscountType === "%") {
      price = price * (1 - compoundingDiscount / 100);
    } else {
      price = price - compoundingDiscount;
    }
  }
  return Math.max(0, price);
}

export function calculateMonthlyPrices(equipment: any[]): any[] {
  return (equipment || []).map((eq) => ({
    ...eq,
    monthly_price: calculateEquipmentPrice(
      eq.base_price || eq.custom_base_price || 0,
      eq.discount || 0,
      eq.discount_type || "%",
      eq.compounding_discount || 0,
      eq.compounding_discount_type || "%"
    ),
  }));
}

export function formatPrice(price: number | string): string {
  const n = parseFloat(String(price)) || 0;
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDiscount(value: number, type: string): string {
  if (!value) return "No discount";
  return type === "%" ? `${value}%` : `$${value}`;
}

export function validateDiscount(value: number, type: string): { valid: boolean; error?: string } {
  if (type === "%" && (value < 0 || value > 100)) {
    return { valid: false, error: "Percentage discount must be between 0 and 100" };
  }
  if (value < 0) {
    return { valid: false, error: "Discount cannot be negative" };
  }
  return { valid: true };
}
