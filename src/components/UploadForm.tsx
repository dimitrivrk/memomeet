'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useCredits } from '@/context/CreditContext';

type ResultType = {
  summary: string;
  tasks: string[];
  transcript?: string;
  credits?: number;
};

type UploadFormProps = {
  onCreditUsed?: (credits: number) => void;
};

export default function UploadForm({ onCreditUsed }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();
  const { setCredits } = useCredits(); // mise à jour globale des crédits si aucune prop fournie

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      const data: ResultType & { error?: string } = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.error === 'Plus de crédits.') {
          setError("❌ Vous n'avez plus de crédits !");
        } else if (res.status === 401) {
          setError("❌ Vous devez être connecté.");
        } else {
          setError(data.error || 'Une erreur est survenue.');
        }
        return;
      }

      setResult(data);
      setShowTranscript(false);

      // Mettre à jour les crédits si fournis et si abonnement ≠ pro
      if (session?.user?.subscription !== 'pro' && typeof data.credits === 'number') {
        if (onCreditUsed) {
          onCreditUsed(data.credits); // callback du parent
        } else {
          setCredits(data.credits); // fallback global
        }
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-md relative">
      <h2 className="text-xl font-bold mb-4">Upload your audio file</h2>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4 block w-full text-sm text-gray-800 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-zinc-700 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-zinc-600"
      />

      <button
        onClick={handleUpload}
        disabled={!file || isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Uploading...' : 'Summarize'}
      </button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 dark:bg-red-500 dark:text-white px-4 py-2 rounded shadow mt-4 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <div className="mt-6">
          <h3 className="font-semibold">Summary:</h3>
          <p className="mb-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {result.summary}
          </p>

          <h3 className="font-semibold mt-4">Tasks:</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
            {result.tasks?.map((task, i) => (
              <li key={i}>{task}</li>
            ))}
          </ul>

          {result.transcript && (
            <div className="mt-6">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showTranscript ? 'Masquer la transcription' : 'Afficher la transcription'}
              </button>

              <AnimatePresence>
                {showTranscript && (
                  <motion.pre
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 p-3 bg-gray-100 dark:bg-zinc-700 rounded text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-100"
                  >
                    {result.transcript}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
