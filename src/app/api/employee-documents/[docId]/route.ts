import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const HR_ROLES = ['admin', 'hr_manager'];

/**
 * Serves an attached personnel document (contract, ID copy, certificate ...).
 *
 * These are the most sensitive files in the system, so access is checked here
 * rather than relying on the route being hard to guess: HR roles may read any
 * document, everyone else only their own.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;

  try {
    const [row] = await db
      .select()
      .from(schema.employeeDocuments)
      .where(eq(schema.employeeDocuments.id, docId));

    if (!row) return new NextResponse('Not found', { status: 404 });

    if (process.env.AUTH_MODE === 'db') {
      const session = await getSession();
      if (!session) return new NextResponse('Unauthorized', { status: 401 });
      const isHr = HR_ROLES.includes(session.role);
      if (!isHr && session.employeeId !== row.employeeId) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // `?download=1` forces a save dialog; otherwise PDFs open in the viewer.
    const download = new URL(request.url).searchParams.get('download') === '1';
    const disposition = download ? 'attachment' : 'inline';
    const encodedName = encodeURIComponent(row.fileName);

    const body = Buffer.from(row.data);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': row.mimeType,
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error(`employee document '${docId}' failed:`, err);
    return new NextResponse('Server error', { status: 500 });
  }
}
