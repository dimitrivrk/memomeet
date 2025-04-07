import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier invalide.' }, { status: 400 });
  }

  const id = uuidv4();
  const filename = `${id}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempPath = path.join(tmpdir(), filename);

  await writeFile(tempPath, buffer);

  return NextResponse.json({ fileId: id, filename });
}
