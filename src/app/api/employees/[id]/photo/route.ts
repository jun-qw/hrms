import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Serves an employee's profile picture.
 *
 * Any signed-in user may fetch it — photos appear in employee lists, the org
 * chart and approval lines. Attached documents are handled separately and are
 * restricted far more tightly.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    if (process.env.AUTH_MODE === 'db') {
      const session = await getSession();
      if (!session) return new NextResponse('Unauthorized', { status: 401 });
    }

    const [row] = await db
      .select({
        data: schema.employeeDocuments.data,
        mimeType: schema.employeeDocuments.mimeType,
      })
      .from(schema.employeeDocuments)
      .where(
        and(eq(schema.employeeDocuments.employeeId, id), eq(schema.employeeDocuments.kind, 'photo')),
      );

    if (!row) return new NextResponse('Not found', { status: 404 });

    const body = Buffer.from(row.data);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': row.mimeType,
        'Content-Length': String(body.byteLength),
        // Personal data: cache in the browser only, and revalidate against the
        // versioned URL rather than letting proxies keep a copy.
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error(`employee photo '${id}' failed:`, err);
    return new NextResponse('Server error', { status: 500 });
  }
}
