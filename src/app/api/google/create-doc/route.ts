import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { summaryId, content, tasks } = await req.json();

  if (!summaryId || !content) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: {
      provider: 'google',
      user: { email: session.user.email },
    },
  });

  if (!account?.access_token) {
    console.error('❌ Aucun access_token Google trouvé');
    return NextResponse.json({ error: 'Token Google manquant' }, { status: 403 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: account.access_token });

    const docs = google.docs({ version: 'v1', auth });

    // 1. Crée un nouveau Google Doc
    const doc = await docs.documents.create({
      requestBody: {
        title: `Résumé MemoMeet - ${new Date().toLocaleDateString()}`,
      },
    });

    const docId = doc.data.documentId;

    // 2. Insère le contenu
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: `📝 Résumé\n\n${content}\n\n📋 Tâches :\n${tasks.map((t: string) => `• ${t}`).join('\n')}`,
            },
          },
        ],
      },
    });

    const url = `https://docs.google.com/document/d/${docId}/edit`;
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('❌ Erreur lors de l’export Google Docs:', err);
    return NextResponse.json({ error: 'Erreur Google Docs' }, { status: 500 });
  }
}
