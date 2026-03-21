'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/app', label: 'Flavors' },
  { href: '/app/test', label: 'Test Captions' },
];

export default function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/app" className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Prompt Chain Tool
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/app'
                  ? pathname === '/app' || pathname.startsWith('/app/flavors')
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-xs text-slate-500 dark:text-slate-400">{email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-red-500 hover:text-red-400 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
