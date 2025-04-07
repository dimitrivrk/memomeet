import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { fileId, filename, userId } = await req.json();

  if (!fileId || !filename || !userId) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  try {
    const filePath = path.join(tmpdir(), `${fileId}-${filename}`);
    const buffer = await readFile(filePath);
    const blob = new Blob([buffer]);

    const transcription = await openai.audio.transcriptions.create({
      file: new File([blob], filename, { type: 'audio/mpeg' }),
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
    const [rawSummary, rawTasks = ''] = gptResponse.split(/Tâches\s*[:\-]?\s*\n?/i);
    const summary = rawSummary?.trim() || 'Résumé indisponible';
    const tasks = rawTasks
      .split(/\n|[-•]\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 5);

    await prisma.summary.create({
      data: {
        userId,
        content: summary,
        source: filename,
        tasks,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });

    return NextResponse.json({ status: 'ok', summary, tasks });
  } catch (err) {
    console.error('Erreur traitement:', err);
    return NextResponse.json({ error: 'Erreur traitement.' }, { status: 500 });
  }
}
