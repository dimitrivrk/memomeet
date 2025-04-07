import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const summaries = await prisma.summary.findMany({
    where: { userId: token.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ summaries });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: token.sub } });

  if (!user || user.credits <= 0) {
    return NextResponse.json({ error: 'Plus de crédits.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant ou invalide.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 413 });
  }

  const mimeType = file.type;
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json({ error: 'Format de fichier non supporté.' }, { status: 415 });
  }

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const tempPath = path.join(tmpdir(), `${uuidv4()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    const blob = new Blob([buffer], { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: new File([blob], safeName, { type: mimeType }),
      model: 'whisper-1',
      language: 'fr',
    });

    const transcriptText = transcription.text || '';

    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            "Tu es un assistant de réunion. Tu dois produire un résumé clair (sous 'Résumé :'), puis une liste de tâches (sous 'Tâches :') avec des puces '-'.",
        },
        {
          role: 'user',
          content: `Voici une transcription de réunion :\n\n${transcriptText}`,
        },
      ],
    });

    const gptResponse = chat.choices[0]?.message?.content || '';
    const [rawSummary, rawTasks = ''] = gptResponse.split(/Tâches\s*[:\-]?\s*\n?/i);
    const summary = rawSummary.trim();
    const tasks = rawTasks
      .split(/\n|[-•]\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 5);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    });

    await prisma.summary.create({
      data: {
        userId: user.id,
        content: summary,
        source: safeName,
        tasks,
      },
    });

    return NextResponse.json({ summary, tasks, transcript: transcriptText, credits: updatedUser.credits });
  } catch (error) {
    console.error('Erreur OpenAI ou serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur ou appel API.' }, { status: 500 });
  }
}
