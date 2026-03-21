'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: '☀️' },
    { value: 'dark', label: '🌙' },
    { value: 'system', label: '💻' },
  ];

  return (
    <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`px-2 py-1 text-xs cursor-pointer transition-colors ${
            theme === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
