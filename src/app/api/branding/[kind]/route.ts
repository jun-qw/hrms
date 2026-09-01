import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { BRANDING_KINDS, type BrandingKind } from '@/lib/branding';

/**
 * Serves the customer logo / favicon straight from the database.
 *
 * Callers append `?v=<updatedAt>` so the response can be cached hard while a
 * new upload still shows up immediately.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!(BRANDING_KINDS as readonly string[]).includes(kind)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const [row] = await db
      .select()
      .from(schema.brandingAssets)
      .where(eq(schema.brandingAssets.kind, kind as BrandingKind));

    if (!row) return new NextResponse('Not found', { status: 404 });

    const body = Buffer.from(row.data, 'base64');
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': row.mimeType,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Uploaded SVGs are rendered in <img>, but deny sub-resources anyway.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error(`branding asset '${kind}' failed:`, err);
    return new NextResponse('Server error', { status: 500 });
  }
}
