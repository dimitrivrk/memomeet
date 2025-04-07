/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];

  const summary = await prisma.summary.findUnique({
    where: { id },
  });

  if (!summary || summary.userId !== session.user.id) {
    return NextResponse.json({ error: 'Résumé introuvable' }, { status: 404 });
  }

  return NextResponse.json({ summary });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];

  const summary = await prisma.summary.findUnique({
    where: { id },
  });

  if (!summary || summary.userId !== session.user.id) {
    return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });
  }

  await prisma.summary.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

// ✅ PATCH: Modifier un résumé + tâches
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];

  const existing = await prisma.summary.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Introuvable ou non autorisé' }, { status: 404 });
  }

  const body = await req.json();
  const { content, tasks } = body;

  const updated = await prisma.summary.update({
    where: { id },
    data: {
      content: content ?? existing.content,
      tasks: Array.isArray(tasks) ? (tasks as any[]) : existing.tasks,
    },
  });

  return NextResponse.json({ summary: updated });
}
