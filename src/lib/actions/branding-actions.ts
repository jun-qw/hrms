'use server';

/**
 * Branding (white-labelling) server actions.
 *
 * The logo and favicon live in the database rather than on disk so that an
 * installation stays self-contained — no upload volume to mount, and the
 * branding is included in a normal database backup. Assets are read back
 * through the /api/branding/[kind] route, not through these actions.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  ALLOWED_ASSET_MIME,
  DEFAULT_BRANDING,
  MAX_ASSET_BYTES,
  type BrandingAssetMeta,
  type BrandingKind,
  type PublicBranding,
  type UploadResult,
} from '@/lib/branding';

async function assertAdmin(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('forbidden');
}

export async function listBrandingAssets(): Promise<BrandingAssetMeta[]> {
  try {
    const rows = await db
      .select({
        kind: schema.brandingAssets.kind,
        mimeType: schema.brandingAssets.mimeType,
        fileName: schema.brandingAssets.fileName,
        byteSize: schema.brandingAssets.byteSize,
        updatedAt: schema.brandingAssets.updatedAt,
      })
      .from(schema.brandingAssets);
    return rows.map((r) => ({
      kind: r.kind as BrandingKind,
      mimeType: r.mimeType,
      fileName: r.fileName,
      byteSize: r.byteSize,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    }));
  } catch (err) {
    console.error('listBrandingAssets failed:', err);
    return [];
  }
}

export async function uploadBrandingAsset(
  kind: BrandingKind,
  base64: string,
  mimeType: string,
  fileName: string,
): Promise<UploadResult> {
  try {
    await assertAdmin();
    if (!ALLOWED_ASSET_MIME.has(mimeType)) return { ok: false, error: 'unsupported_type' };

    // base64 inflates by 4/3; measure the decoded size the browser will fetch.
    const byteSize = Math.floor((base64.length * 3) / 4);
    if (byteSize > MAX_ASSET_BYTES) return { ok: false, error: 'too_large' };

    const [row] = await db
      .insert(schema.brandingAssets)
      .values({ kind, mimeType, data: base64, fileName, byteSize })
      .onConflictDoUpdate({
        target: schema.brandingAssets.kind,
        set: { mimeType, data: base64, fileName, byteSize, updatedAt: sql`now()` },
      })
      .returning();

    return {
      ok: true,
      asset: {
        kind,
        mimeType: row.mimeType,
        fileName: row.fileName,
        byteSize: row.byteSize,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      },
    };
  } catch (err) {
    console.error('uploadBrandingAsset failed:', err);
    if (err instanceof Error && err.message === 'forbidden') return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'server_error' };
  }
}

export async function deleteBrandingAsset(kind: BrandingKind): Promise<boolean> {
  try {
    await assertAdmin();
    await db.delete(schema.brandingAssets).where(eq(schema.brandingAssets.kind, kind));
    return true;
  } catch (err) {
    console.error('deleteBrandingAsset failed:', err);
    return false;
  }
}

/**
 * Branding needed before a user signs in (the login screen and the tab title),
 * so this deliberately performs no authorisation check. It exposes only the
 * cosmetic settings — never company or employee data.
 */
export async function getPublicBranding(): Promise<PublicBranding> {
  // `next build` runs with no customer database attached — the image is
  // built once and pointed at a database at run time — so skip the query
  // and let the client pick the real branding up after hydration.
  if (process.env.NEXT_PHASE === 'phase-production-build') return DEFAULT_BRANDING;
  try {
    const [row] = await db
      .select()
      .from(schema.companySettings)
      .where(
        and(
          eq(schema.companySettings.category, 'branding'),
          eq(schema.companySettings.key, '__section__'),
        ),
      );
    if (!row?.value) return DEFAULT_BRANDING;
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    return {
      appName:
        typeof parsed.app_name === 'string' && parsed.app_name
          ? parsed.app_name
          : DEFAULT_BRANDING.appName,
      primaryColor:
        typeof parsed.primary_color === 'string' && parsed.primary_color
          ? parsed.primary_color
          : DEFAULT_BRANDING.primaryColor,
      loginTagline: typeof parsed.login_tagline === 'string' ? parsed.login_tagline : '',
      logoVersion: typeof parsed.logo_version === 'string' ? parsed.logo_version : '',
      faviconVersion: typeof parsed.favicon_version === 'string' ? parsed.favicon_version : '',
      useLogoInPrint: parsed.use_logo_in_print !== false,
    };
  } catch (err) {
    console.error('getPublicBranding failed:', err);
    return DEFAULT_BRANDING;
  }
}
