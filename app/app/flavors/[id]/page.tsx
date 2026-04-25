'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface HumorFlavor {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
}

interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  llm_temperature: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
  humor_flavor_step_type_id: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
  created_datetime_utc: string;
}

export default function FlavorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flavorId = Number(params.id);

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingFlavor, setEditingFlavor] = useState(false);
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Step form state
  const [stepForm, setStepForm] = useState({
    llm_system_prompt: '',
    llm_user_prompt: '',
    llm_temperature: '',
    llm_model_id: '',
    llm_input_type_id: '',
    llm_output_type_id: '',
    humor_flavor_step_type_id: '',
    description: '',
  });

  const supabase = createClient();

  const stepFieldLabels: Record<string, string> = {
    llm_input_type_id: 'Input Type ID',
    llm_output_type_id: 'Output Type ID',
    llm_model_id: 'Model ID',
    llm_temperature: 'Temperature',
    humor_flavor_step_type_id: 'Step Type ID',
    llm_system_prompt: 'System Prompt',
    llm_user_prompt: 'User Prompt',
    description: 'Description',
    slug: 'Slug',
  };

  const friendlyDbError = (message: string): string => {
    const nullMatch = message.match(/null value in column "([^"]+)"/i);
    if (nullMatch) {
      const label = stepFieldLabels[nullMatch[1]] || nullMatch[1];
      return `${label} is required. Please fill it in and try again.`;
    }
    if (/duplicate key|unique constraint/i.test(message)) {
      return 'That value is already in use. Please choose a different one.';
    }
    return message;
  };

  const fetchData = useCallback(async () => {
    const [flavorRes, stepsRes] = await Promise.all([
      supabase.from('humor_flavors').select('*').eq('id', flavorId).single(),
      supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('humor_flavor_id', flavorId)
        .order('order_by', { ascending: true }),
    ]);

    if (flavorRes.error) {
      setError(flavorRes.error.message);
    } else {
      setFlavor(flavorRes.data);
      setEditSlug(flavorRes.data.slug);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSaving(false); return; }
    const userId = user.id;
    const { error } = await supabase
      .from('humor_flavors')
      .update({ slug: editSlug, description: editDesc || null, modified_by_user_id: userId })
      .eq('id', flavorId);
    if (error) setError(friendlyDbError(error.message));
    else {
      setEditingFlavor(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteFlavor = async () => {
    if (!confirm('Delete this flavor and all its steps?')) return;
    await supabase.from('humor_flavor_steps').delete().eq('humor_flavor_id', flavorId);
    const { error } = await supabase.from('humor_flavors').delete().eq('id', flavorId);
    if (error) setError(friendlyDbError(error.message));
    else router.push('/app');
  };

  const resetStepForm = () => {
    setStepForm({
      llm_system_prompt: '',
      llm_user_prompt: '',
      llm_temperature: '',
      llm_model_id: '',
      llm_input_type_id: '',
      llm_output_type_id: '',
      humor_flavor_step_type_id: '',
      description: '',
    });
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSaving(false); return; }
    const userId = user.id;
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order_by)) + 1 : 1;
    const { error } = await supabase.from('humor_flavor_steps').insert({
      humor_flavor_id: flavorId,
      order_by: nextOrder,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: stepForm.llm_temperature ? Number(stepForm.llm_temperature) : null,
      llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
      llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : null,
      llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : null,
      humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : null,
      description: stepForm.description || null,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    });
    if (error) setError(friendlyDbError(error.message));
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
      llm_system_prompt: step.llm_system_prompt || '',
      llm_user_prompt: step.llm_user_prompt || '',
      llm_temperature: step.llm_temperature?.toString() || '',
      llm_model_id: step.llm_model_id?.toString() || '',
      llm_input_type_id: step.llm_input_type_id?.toString() || '',
      llm_output_type_id: step.llm_output_type_id?.toString() || '',
      humor_flavor_step_type_id: step.humor_flavor_step_type_id?.toString() || '',
      description: step.description || '',
    });
  };

  const handleUpdateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStepId) return;
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSaving(false); return; }
    const userId = user.id;
    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({
        llm_system_prompt: stepForm.llm_system_prompt || null,
        llm_user_prompt: stepForm.llm_user_prompt || null,
        llm_temperature: stepForm.llm_temperature ? Number(stepForm.llm_temperature) : null,
        llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
        llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : null,
        llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : null,
        humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : null,
        description: stepForm.description || null,
        modified_by_user_id: userId,
      })
      .eq('id', editingStepId);
    if (error) setError(friendlyDbError(error.message));
    else {
      setEditingStepId(null);
      resetStepForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteStep = async (id: number) => {
    if (!confirm('Delete this step?')) return;
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', id);
    if (error) setError(friendlyDbError(error.message));
    else fetchData();
  };

  const handleMoveStep = async (stepId: number, direction: 'up' | 'down') => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); return; }
    const userId = user.id;

    const currentOrder = steps[idx].order_by;
    const swapOrder = steps[swapIdx].order_by;

    await Promise.all([
      supabase.from('humor_flavor_steps').update({ order_by: swapOrder, modified_by_user_id: userId }).eq('id', steps[idx].id),
      supabase.from('humor_flavor_steps').update({ order_by: currentOrder, modified_by_user_id: userId }).eq('id', steps[swapIdx].id),
    ]);
    fetchData();
  };

  if (loading) return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;
  if (!flavor) return <div className="text-red-500">Flavor not found.</div>;

  const renderStepForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={stepForm.description}
            onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={stepForm.llm_model_id}
              onChange={(e) => setStepForm({ ...stepForm, llm_model_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Temperature <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              step="0.1"
              value={stepForm.llm_temperature}
              onChange={(e) => setStepForm({ ...stepForm, llm_temperature: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">System Prompt</label>
          <textarea
            value={stepForm.llm_system_prompt}
            onChange={(e) => setStepForm({ ...stepForm, llm_system_prompt: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">User Prompt</label>
          <textarea
            value={stepForm.llm_user_prompt}
            onChange={(e) => setStepForm({ ...stepForm, llm_user_prompt: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-4 sm:col-span-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              Input Type ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={stepForm.llm_input_type_id}
              onChange={(e) => setStepForm({ ...stepForm, llm_input_type_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Output Type ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={stepForm.llm_output_type_id}
              onChange={(e) => setStepForm({ ...stepForm, llm_output_type_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Step Type ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={stepForm.humor_flavor_step_type_id}
              onChange={(e) => setStepForm({ ...stepForm, humor_flavor_step_type_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>
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
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
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
              <h1 className="text-2xl font-bold mb-1">{flavor.slug}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {flavor.description || 'No description'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Created {new Date(flavor.created_datetime_utc).toLocaleDateString()}
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
                      {step.description || `Step ${idx + 1}`}
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
                <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {step.llm_system_prompt && (
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">System: </span>
                      <span className="whitespace-pre-wrap">{step.llm_system_prompt}</span>
                    </div>
                  )}
                  {step.llm_user_prompt && (
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">User: </span>
                      <span className="whitespace-pre-wrap">{step.llm_user_prompt}</span>
                    </div>
                  )}
                  <div className="flex gap-4 text-xs">
                    {step.llm_model_id && <span>Model: {step.llm_model_id}</span>}
                    {step.llm_temperature !== null && <span>Temp: {step.llm_temperature}</span>}
                    {step.llm_input_type_id && <span>Input Type: {step.llm_input_type_id}</span>}
                    {step.llm_output_type_id && <span>Output Type: {step.llm_output_type_id}</span>}
                  </div>
                </div>
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
      <CaptionsList flavorId={flavorId} />
    </div>
  );
}

function CaptionsList({ flavorId }: { flavorId: number }) {
  const [captions, setCaptions] = useState<Array<{ id: string; content: string; created_datetime_utc: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchCaptions = async () => {
      const supabase = createClient();
      // Get captions that were produced via this flavor's prompt chain
      const { data: responses } = await supabase
        .from('llm_model_responses')
        .select('caption_request_id')
        .eq('humor_flavor_id', flavorId);

      if (responses && responses.length > 0) {
        const requestIds = [...new Set(responses.map((r) => r.caption_request_id))];
        const { data: captionData } = await supabase
          .from('captions')
          .select('id, content, created_datetime_utc')
          .in('caption_request_id', requestIds)
          .order('created_datetime_utc', { ascending: false })
          .limit(20);
        setCaptions(captionData || []);
      }
      setLoading(false);
    };
    fetchCaptions();
  }, [flavorId]);

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-bold mb-4 cursor-pointer"
      >
        Captions ({loading ? '...' : captions.length})
        <span className="text-sm text-slate-400">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        captions.length > 0 ? (
          <div className="space-y-2">
            {captions.map((caption) => (
              <div
                key={caption.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              >
                <p>{caption.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(caption.created_datetime_utc).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm">
            No captions have been generated for this flavor yet.
          </div>
        )
      )}
    </div>
  );
}
