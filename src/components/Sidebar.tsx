'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCredits } from '@/context/CreditContext';

type SidebarProps = {
  credits?: number;
};

export default function Sidebar({ credits: propCredits }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status, update } = useSession();
  const { credits: contextCredits, setCredits } = useCredits();

  const credits = propCredits ?? contextCredits;

  const hasFetched = useRef(false); // ✅ anti boucle inf

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
      setDarkMode(isDark);
    }
  }, []);

  useEffect(() => {
    const refreshCredits = async () => {
      try {
        if (status === 'authenticated' && contextCredits == null && !hasFetched.current) {
          hasFetched.current = true;
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data?.user?.credits !== undefined) {
            setCredits(data.user.credits);
          }
        }
      } catch (e) {
        console.error('🔁 Sidebar fetch credit fail', e);
      }
    };

    refreshCredits();
  }, [status, contextCredits, update, setCredits]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const isActive = (path: string) => pathname === path;

  const email = session?.user?.email ?? '';
  const subscription = session?.user?.subscription ?? 'none';

  const subscriptionLabel =
    subscription === 'pro'
      ? 'Pro (illimité)'
      : subscription === 'standard'
      ? 'Standard'
      : 'Aucun';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 cursor-pointer bg-white dark:bg-zinc-800 text-black dark:text-white shadow p-2 rounded-full"
      >
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              key="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-zinc-900 text-black dark:text-white shadow-lg z-50 flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold">Mon espace</h2>
                <button onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {status === 'authenticated' && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>{email}</p>
                  <p>{credits ?? 0} crédits</p>
                  <p>{subscriptionLabel}</p>
                </div>
              )}

              <nav className="flex flex-col p-4 gap-3 text-sm flex-1">
                {[ 
                  { path: '/', label: 'Accueil' },
                  { path: '/history', label: 'Historique' },
                  { path: '/account', label: 'Mon compte' },
                  { path: '/buy', label: 'Crédits / Abonnement' },
                ].map(({ path, label }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`text-left p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                      isActive(path) ? 'bg-gray-200 dark:bg-zinc-700 font-semibold' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-gray-200 dark:border-zinc-700 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Apparence</p>
                  <div
                    onClick={toggleTheme}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {status === 'authenticated' && (
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-sm text-red-600 dark:text-red-400 underline"
                  >
                    Se déconnecter
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
