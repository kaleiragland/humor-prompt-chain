'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface HumorFlavor {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface HumorFlavorStep {
  id: string;
  flavor_id: string;
  position: number;
  title: string | null;
  prompt: string | null;
  created_at: string;
}

export default function FlavorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flavorId = params.id as string;

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingFlavor, setEditingFlavor] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step form state
  const [stepForm, setStepForm] = useState({
    title: '',
    prompt: '',
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [flavorRes, stepsRes] = await Promise.all([
      supabase.from('humor_flavors').select('*').eq('id', flavorId).single(),
      supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('flavor_id', flavorId)
        .order('position', { ascending: true }),
    ]);

    if (flavorRes.error) {
      setError(flavorRes.error.message);
    } else {
      setFlavor(flavorRes.data);
      setEditName(flavorRes.data.name);
      setEditDesc(flavorRes.data.description || '');
    }

    if (stepsRes.error) setError(stepsRes.error.message);
    else setSteps(stepsRes.data || []);

    setLoading(false);
  }, [flavorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateFlavor = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('humor_flavors')
      .update({ name: editName, description: editDesc || null })
      .eq('id', flavorId);
    if (error) setError(error.message);
    else {
      setEditingFlavor(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteFlavor = async () => {
    if (!confirm('Delete this flavor and all its steps?')) return;
    await supabase.from('humor_flavor_steps').delete().eq('flavor_id', flavorId);
    const { error } = await supabase.from('humor_flavors').delete().eq('id', flavorId);
    if (error) setError(error.message);
    else router.push('/app');
  };

  const resetStepForm = () => {
    setStepForm({
      title: '',
      prompt: '',
    });
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const nextPosition = steps.length > 0 ? Math.max(...steps.map((s) => s.position)) + 1 : 1;
    const { error } = await supabase.from('humor_flavor_steps').insert({
      flavor_id: flavorId,
      position: nextPosition,
      title: stepForm.title || null,
      prompt: stepForm.prompt || null,
    });
    if (error) setError(error.message);
    else {
      resetStepForm();
      setShowAddStep(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleEditStep = (step: HumorFlavorStep) => {
    setEditingStepId(step.id);
    setStepForm({
      title: step.title || '',
      prompt: step.prompt || '',
    });
  };

  const handleUpdateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStepId) return;
    setSaving(true);
    setError('');
    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({
        title: stepForm.title || null,
        prompt: stepForm.prompt || null,
      })
      .eq('id', editingStepId);
    if (error) setError(error.message);
    else {
      setEditingStepId(null);
      resetStepForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteStep = async (id: string) => {
    if (!confirm('Delete this step?')) return;
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchData();
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    const currentPosition = steps[idx].position;
    const swapPosition = steps[swapIdx].position;

    // Delete both steps and re-insert with swapped positions to avoid unique constraint
    const stepA = steps[idx];
    const stepB = steps[swapIdx];
    await supabase.from('humor_flavor_steps').delete().in('id', [stepA.id, stepB.id]);
    await supabase.from('humor_flavor_steps').insert([
      { flavor_id: flavorId, position: swapPosition, title: stepA.title, prompt: stepA.prompt },
      { flavor_id: flavorId, position: currentPosition, title: stepB.title, prompt: stepB.prompt },
    ]);
    fetchData();
  };

  if (loading) return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;
  if (!flavor) return <div className="text-red-500">Flavor not found.</div>;

  const renderStepForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-4">
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={stepForm.title}
            onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            placeholder="e.g. Celebrity Recognition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prompt</label>
          <textarea
            value={stepForm.prompt}
            onChange={(e) => setStepForm({ ...stepForm, prompt: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            placeholder="Enter the prompt for this step..."
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAddStep(false);
            setEditingStepId(null);
            resetStepForm();
          }}
          className="px-4 py-2 text-slate-500 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <Link href="/app" className="text-sm text-indigo-500 hover:text-indigo-400 mb-4 inline-block">
        ← Back to Flavors
      </Link>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Flavor Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        {editingFlavor ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold"
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Description"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdateFlavor}
                disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setEditingFlavor(false)}
                className="px-3 py-1.5 text-slate-500 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{flavor.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {flavor.description || 'No description'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Created {new Date(flavor.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingFlavor(true)}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteFlavor}
                className="px-3 py-1.5 text-sm text-red-500 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Steps ({steps.length})</h2>
        <button
          onClick={() => {
            setShowAddStep(!showAddStep);
            setEditingStepId(null);
            resetStepForm();
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer"
        >
          {showAddStep ? 'Cancel' : '+ Add Step'}
        </button>
      </div>

      {showAddStep && renderStepForm(handleAddStep, 'Add Step')}

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {editingStepId === step.id ? (
              renderStepForm(handleUpdateStep, 'Update Step')
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">
                      {step.title || `Step ${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveStep(step.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-sm"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveStep(step.id, 'down')}
                      disabled={idx === steps.length - 1}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-sm"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleEditStep(step)}
                      className="px-2 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {step.prompt && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Prompt: </span>
                    <span className="whitespace-pre-wrap">{step.prompt}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {steps.length === 0 && !showAddStep && (
        <div className="text-center py-8 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
          No steps yet. Add your first step to build the prompt chain.
        </div>
      )}

      {/* Captions produced by this flavor */}
      <CaptionsList />
    </div>
  );
}

function CaptionsList() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-bold mb-4 cursor-pointer"
      >
        Captions
        <span className="text-sm text-slate-400">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="text-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm">
          Captions will appear here once the generate-captions API is available.
        </div>
      )}
    </div>
  );
}
