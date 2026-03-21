'use client';

import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white/10 p-10 text-center shadow-2xl backdrop-blur-lg border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-2">Prompt Chain Tool</h1>
        <p className="text-sm text-indigo-200 mb-8">Humor Flavor Management</p>

        {error === 'not_admin' && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/50 p-4 text-sm text-red-200">
            Access denied. You must be a superadmin or matrix admin.
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-indigo-100 transition shadow-lg cursor-pointer"
        >
          Sign in with Google
        </button>

        <p className="mt-6 text-xs text-indigo-300">
          Only authorized administrators can access this tool.
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
          <div className="text-white">Loading...</div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
