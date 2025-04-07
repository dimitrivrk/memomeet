'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Summary = {
  id: string;
  content: string;
  source: string;
  createdAt: string;
  tasks: string[]; // ✅ Nouveau champ pour les tâches
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    const fetchSummaries = async () => {
      const res = await fetch('/api/summarize');
      const data = await res.json();
      setSummaries(data.summaries || []);
      setLoading(false);
    };

    if (status === 'authenticated') {
      fetchSummaries();
    }
  }, [status, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce résumé ?")) return;

    const res = await fetch(`/api/summarize/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setSummaries(prev => prev.filter(s => s.id !== id));
    } else {
      alert("Erreur lors de la suppression.");
    }
  };

  if (loading || status === 'loading') {
    return <p className="text-center mt-10 text-gray-700 dark:text-gray-300">Chargement de vos résumés...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-neutral-800 rounded-xl shadow dark:shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">📂 Mes résumés</h1>

        {summaries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Aucun résumé généré pour l’instant.</p>
        ) : (
          <ul className="space-y-4">
            {summaries.map((summary) => (
              <li
                key={summary.id}
                onClick={() => router.push(`/history/${summary.id}`)}
                className="border border-gray-200 dark:border-gray-700 rounded p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 transition relative"
              >
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  🗓 {new Date(summary.createdAt).toLocaleString()} — 📁 {summary.source}
                </div>

                <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-line line-clamp-4 mb-2">
                  {summary.content}
                </p>

                {summary.tasks?.length > 0 && (
                  <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1">
                    {summary.tasks.slice(0, 3).map((task, i) => (
                      <li key={i}>✅ {task}</li>
                    ))}
                    {summary.tasks.length > 3 && <li>…</li>}
                  </ul>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(summary.id);
                  }}
                  className="absolute top-2 right-2 text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
