'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface HumorFlavor {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
}

export default function FlavorsPage() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const fetchFlavors = async () => {
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('*')
      .order('created_datetime_utc', { ascending: false });
    if (error) setError(error.message);
    else setFlavors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFlavors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error } = await supabase.from('humor_flavors').insert({
      slug: newSlug,
      description: newDesc || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setNewSlug('');
      setNewDesc('');
      setShowCreate(false);
      fetchFlavors();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this humor flavor? This will also affect its steps.')) return;
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchFlavors();
  };

  if (loading) return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Humor Flavors</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage humor flavors and their prompt chain steps.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition cursor-pointer"
        >
          {showCreate ? 'Cancel' : '+ New Flavor'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="e.g. dry-humor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="Optional description"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Creating...' : 'Create Flavor'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flavors.map((flavor) => (
          <div
            key={flavor.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <Link
                href={`/app/flavors/${flavor.id}`}
                className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {flavor.slug}
              </Link>
              <button
                onClick={() => handleDelete(flavor.id)}
                className="text-xs text-red-500 hover:text-red-400 cursor-pointer"
              >
                Delete
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {flavor.description || 'No description'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {new Date(flavor.created_datetime_utc).toLocaleDateString()}
              </span>
              <Link
                href={`/app/flavors/${flavor.id}`}
                className="text-xs text-indigo-500 hover:text-indigo-400"
              >
                Manage Steps →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {flavors.length === 0 && !showCreate && (
        <div className="text-center py-12 text-slate-400">
          No humor flavors yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
