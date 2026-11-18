export const FILE_LIMITS = {
  maxFiles: 30,
  maxFileBytes: 50 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
  maxPages: 200,
} as const;

export const A4_PT = {
  width: 595.28,
  height: 841.89,
} as const;

export const A4_MM = {
  width: 210,
  height: 297,
} as const;

export const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'] as const;
export const ACCEPT_ATTRIBUTE = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';
