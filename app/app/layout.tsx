import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppNav from '@/app/components/AppNav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav email={user.email || ''} />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
