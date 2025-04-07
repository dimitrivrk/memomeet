export const config = {
  runtime: 'nodejs',
};

import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

// ✅ POST : Générer un résumé depuis un fichier audio
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.credits <= 0) {
    return NextResponse.json({ error: 'Plus de crédits.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  try {
    // 📁 Sauvegarde temporaire
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(tmpdir(), file.name);
    await writeFile(tempPath, buffer);

    // 🔊 Transcription Whisper
    const blob = new Blob([buffer], { type: file.type });
    const transcription = await openai.audio.transcriptions.create({
      file: new File([blob], file.name, { type: file.type }),
      model: 'whisper-1',
    });

    const transcriptText = transcription.text;

    // 🤖 Résumé + tâches avec GPT
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            "Tu es un assistant de réunion. Tu dois d'abord produire un résumé clair et entier et le plus long possible (sous le titre 'Résumé :'), puis une liste de tâches (sous le titre 'Tâches :'), en utilisant des puces '-'. Ne mélange jamais les deux blocs.",
        },
        {
          role: 'user',
          content: `Voici une transcription de réunion :\n\n${transcriptText}\n\nMerci de me fournir uniquement :\n1. Un bloc Résumé\n2. Un bloc Tâches avec des puces '-'`,
        },
      ],
    });

    const gptResponse = chat.choices[0].message.content || '';

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

    // 💳 Décrémentation d’1 crédit
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    });

    // 💾 Sauvegarde en base
    await prisma.summary.create({
      data: {
        userId: user.id,
        content: summary,
        source: file.name,
        tasks: tasks, // ✅ Ajout des tâches
      },
    });

    return NextResponse.json({
      summary,
      tasks,
      transcript: transcriptText,
      credits: updatedUser.credits,
    });
  } catch (error: any) {
    console.error('Erreur OpenAI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la transcription ou du résumé.' },
      { status: 500 }
    );
  }
}

// ✅ GET : Récupérer l'historique des résumés
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ summaries: [] });
  }

  const summaries = await prisma.summary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      source: true,
      createdAt: true,
      tasks: true, // ✅ Ajout des tâches dans la réponse
    },
  });

  return NextResponse.json({ summaries });
}
