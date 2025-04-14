'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface Summary {
  id: string;
  content: string;
  source: string;
  createdAt: string;
  tasks: string[];
}

export default function SummaryDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedContent, setEditedContent] = useState('');
  const [editedTasks, setEditedTasks] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await fetch(`/api/summarize/${id}`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setEditedContent(data.summary.content);
        setEditedTasks(data.summary.tasks || []);
      }
      setLoading(false);
    };
    fetchSummary();
  }, [id]);

  const handleSave = async () => {
    const res = await fetch(`/api/summarize/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editedContent, tasks: editedTasks }),
    });

    if (res.ok) {
      alert('✅ Modifications enregistrées');
    } else {
      alert('❌ Erreur de sauvegarde');
    }
  };

  const handleBlur = () => {
    if (editableRef.current) {
      setEditedContent(editableRef.current.innerText);
      setEditing(false);
    }
  };

  const exportToWord = () => {
    if (!summary) return;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Résumé', bold: true, size: 32 })],
            }),
            new Paragraph(editedContent),
            new Paragraph({ text: 'Tâches :', spacing: { before: 200 } }),
            ...editedTasks.map(task => new Paragraph(`• ${task}`)),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `resume-${id}.docx`);
    });
  };

  const exportToGoogleDocs = async () => {
    const res = await fetch('/api/google/create-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryId: id, content: editedContent, tasks: editedTasks }),
    });

    const data = await res.json();
    if (res.ok && data.url) {
      window.open(data.url, '_blank');
    } else {
      alert("❌ Erreur lors de l'export Google Docs");
    }
  };

  if (loading) return <p className="text-center mt-10">Chargement...</p>;
  if (!summary) return <p className="text-center mt-10">Résumé introuvable.</p>;

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-900 px-6 py-10 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2">📝 Résumé</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🗓 {new Date(summary.createdAt).toLocaleString()} — 📁 {summary.source}
          </p>
        </div>

        <div
          ref={editableRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onClick={() => setEditing(true)}
          className={`min-h-[100px] text-lg leading-relaxed whitespace-pre-wrap outline-none rounded transition-all ${
            editing
              ? 'bg-gray-100 dark:bg-neutral-700 p-3 border border-gray-300 dark:border-neutral-600'
              : 'hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-text'
          }`}
        >
          {editedContent}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-medium mb-4">📋 Tâches</h2>
          <div className="space-y-3">
            {editedTasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <div className="pt-1">✅</div>
                <input
                  type="text"
                  value={task}
                  onChange={e =>
                    setEditedTasks(prev => prev.map((t, idx) => (i === idx ? e.target.value : t)))
                  }
                  className="w-full text-base bg-transparent outline-none"
                  placeholder="Nouvelle tâche"
                />
                <button
                  onClick={() => setEditedTasks(prev => prev.filter((_, idx) => idx !== i))}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button
              onClick={() => setEditedTasks(prev => [...prev, ''])}
              className="text-blue-600 dark:text-blue-400 text-sm mt-2 hover:underline"
            >
              ➕ Ajouter une tâche
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 max-w-4xl mx-auto">
        <div className="flex gap-3">
          <button
            onClick={exportToGoogleDocs}
            className="bg-blue-100 dark:bg-blue-800 text-sm px-4 py-2 rounded hover:opacity-80"
          >
            Exporter vers Google Docs
          </button>
          <button
            onClick={exportToWord}
            className="bg-gray-200 dark:bg-neutral-700 text-sm px-4 py-2 rounded hover:opacity-80"
          >
            Exporter en Word
          </button>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 dark:text-gray-400 text-sm hover:underline"
          >
            ← Retour à l’historique
          </button>
          <button
            onClick={handleSave}
            className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-lg text-sm font-medium hover:opacity-80"
          >
            💾 Enregistrer
          </button>
        </div>
      </div>
    </main>
  );
}