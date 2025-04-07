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
    const filePath = path.join(tmpdir(), filename);
    const buffer = await readFile(filePath);
    const blob = new Blob([buffer], { type: 'audio/mpeg' });

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
            "Tu es un assistant de réunion. Tu dois produire un résumé clair (sous 'Résumé :') puis une liste de tâches (sous 'Tâches :') avec des puces '-'.",
        },
        {
          role: 'user',
          content: `Voici la transcription :\n\n${transcriptText}`,
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

    return NextResponse.json({ summary, tasks });
  } catch (err) {
    console.error('Erreur process :', err);
    return NextResponse.json({ error: 'Erreur process.' }, { status: 500 });
  }
}
