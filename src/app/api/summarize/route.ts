import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const prisma = new PrismaClient();
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token?.sub) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
  });

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
            "Tu es un assistant de réunion. Tu dois d'abord produire un résumé clair et entier (sous le titre 'Résumé :'), puis une liste de tâches (sous le titre 'Tâches :'), avec des puces '-'. Ne mélange jamais les deux blocs.",
        },
        {
          role: 'user',
          content: `Voici une transcription de réunion :\n\n${transcriptText}\n\nMerci de me fournir uniquement :\n1. Un bloc Résumé\n2. Un bloc Tâches avec des puces '-'`,
        },
      ],
    });

    const gptResponse = chat.choices[0]?.message?.content || '';
    const taskRegex = /Tâches\s*[:\-]?\s*\n?/i;
    const hasTasks = taskRegex.test(gptResponse);
    const [rawSummary, rawTasks] = hasTasks
      ? gptResponse.split(taskRegex)
      : [gptResponse, ''];

    const summary = rawSummary?.trim() || 'Résumé indisponible';
    const tasks = rawTasks
      ? rawTasks
          .split(/\n|[-•]\s+/)
          .map((t) => t.trim())
          .filter((t) => t.length > 5)
      : [];

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

    return NextResponse.json({
      summary,
      tasks,
      transcript: transcriptText,
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error('Erreur OpenAI ou serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur ou appel API.' },
      { status: 500 }
    );
  }
}
