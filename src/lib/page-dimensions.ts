export const PAGE_DIMENSION_LIMITS = {
  minMm: 20,
  maxMm: 1000,
} as const;

export interface PageDimensionValidation {
  valid: boolean;
  value: number | null;
  error: string | null;
}

export function validatePageDimension(
  input: string | number,
  label: string,
): PageDimensionValidation {
  const trimmed = String(input).trim();
  if (!trimmed) {
    return { valid: false, value: null, error: `请输入${label}。` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { valid: false, value: null, error: `${label}需为有效数字。` };
  }

  if (value < PAGE_DIMENSION_LIMITS.minMm || value > PAGE_DIMENSION_LIMITS.maxMm) {
    return {
      valid: false,
      value: null,
      error: `${label}需在 ${PAGE_DIMENSION_LIMITS.minMm}-${PAGE_DIMENSION_LIMITS.maxMm} mm 之间。`,
    };
  }

  return { valid: true, value, error: null };
}
