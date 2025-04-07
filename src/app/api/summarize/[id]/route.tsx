import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractIdFromUrl(req: NextRequest): string | null {
  const urlParts = req.nextUrl.pathname.split('/');
  return urlParts[urlParts.length - 1] || null;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const id = extractIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: 'ID manquant dans l’URL.' }, { status: 400 });
  }

  try {
    const summary = await prisma.summary.findUnique({
      where: {
        id,
        userId: token.sub,
      },
    });

    if (!summary) {
      return NextResponse.json({ error: 'Résumé introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Erreur GET /api/summarize/[id] :', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const id = extractIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: 'ID manquant dans l’URL.' }, { status: 400 });
  }

  try {
    await prisma.summary.delete({
      where: {
        id,
        userId: token.sub,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE /api/summarize/[id] :', err);
    return NextResponse.json({ error: 'Résumé introuvable ou déjà supprimé.' }, { status: 404 });
  }
}
