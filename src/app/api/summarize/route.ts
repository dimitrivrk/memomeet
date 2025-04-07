// app/api/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export async function POST(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier invalide.' }, { status: 400 });
  }

  try {
    const id = uuidv4();
    const safeName = `${id}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = path.join(tmpdir(), safeName);
    await writeFile(tempPath, buffer);

    // Appelle l’API /process avec le bon payload
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: id,
        safename: file.name,
        userId: token.sub,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erreur summarize route:', err);
    return NextResponse.json({ error: 'Erreur serveur summarize.' }, { status: 500 });
  }
}
