'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Summary = {
  id: string;
  content: string;
  source: string;
  createdAt: string;
  tasks: string[];
};

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
    if (res.ok) alert('✅ Modifications enregistrées');
    else alert('Erreur de sauvegarde');
  };

  const addTask = () => setEditedTasks((prev) => [...prev, '']);
  const updateTask = (i: number, val: string) =>
    setEditedTasks((prev) => prev.map((t, idx) => (i === idx ? val : t)));
  const removeTask = (i: number) =>
    setEditedTasks((prev) => prev.filter((_, idx) => idx !== i));

  const handleBlur = () => {
    if (editableRef.current) {
      const text = editableRef.current.innerText;
      setEditedContent(text);
      setEditing(false);
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

        {/* Affichage du résumé en mode Notion */}
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

        {/* Tâches */}
        <div className="mt-10">
          <h2 className="text-xl font-medium mb-4">📋 Tâches</h2>
          <div className="space-y-3">
            {editedTasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <div className="pt-1">✅</div>
                <input
                  type="text"
                  value={task}
                  onChange={(e) => updateTask(i, e.target.value)}
                  className="w-full text-base bg-transparent outline-none border-0 focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Nouvelle tâche"
                />
                <button
                  onClick={() => removeTask(i)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button
              onClick={addTask}
              className="text-blue-600 dark:text-blue-400 text-sm mt-2 hover:underline"
            >
              ➕ Ajouter une tâche
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-10">
          <button
            onClick={() => router.back()}
            className="text-gray-500 dark:text-gray-400 text-sm hover:underline"
          >
            ← Retour à l’historique
          </button>
          <button
            onClick={handleSave}
            className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition"
          >
            💾 Enregistrer
          </button>
        </div>
      </div>
    </main>
  );
}
