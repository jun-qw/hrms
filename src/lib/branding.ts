/**
 * Branding constants and shapes.
 *
 * Kept out of `branding-actions.ts` because a `'use server'` module may only
 * export async functions — these are imported by both client and server code.
 */

export const BRANDING_KINDS = ['logo', 'favicon'] as const;
export type BrandingKind = (typeof BRANDING_KINDS)[number];

/** Keeps a single asset comfortably inside a request body and a settings row. */
export const MAX_ASSET_BYTES = 512 * 1024;

export const ALLOWED_ASSET_MIME: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export interface BrandingAssetMeta {
  kind: BrandingKind;
  mimeType: string;
  fileName: string | null;
  byteSize: number;
  updatedAt: string | null;
}

export interface UploadResult {
  ok: boolean;
  error?: 'forbidden' | 'too_large' | 'unsupported_type' | 'server_error';
  asset?: BrandingAssetMeta;
}

/** Cosmetic settings readable before sign-in (login screen, tab title). */
export interface PublicBranding {
  appName: string;
  primaryColor: string;
  loginTagline: string;
  logoVersion: string;
  faviconVersion: string;
  useLogoInPrint: boolean;
}

export const DEFAULT_BRANDING: PublicBranding = {
  appName: '대한오토텍 인사시스템',
  primaryColor: '#1f6feb',
  loginTagline: '대한오토텍(주) 인사·급여 관리',
  logoVersion: '',
  faviconVersion: '',
  useLogoInPrint: true,
};
