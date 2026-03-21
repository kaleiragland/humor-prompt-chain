'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface HumorFlavor {
  id: number;
  slug: string;
}

interface ImageRow {
  id: string;
  url: string;
  image_description: string | null;
}

interface CaptionResult {
  id?: string;
  content?: string;
  caption?: string;
  [key: string]: unknown;
}

export default function TestCaptionsPage() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [selectedFlavor, setSelectedFlavor] = useState<number | ''>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [captions, setCaptions] = useState<CaptionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [flavorsRes, imagesRes] = await Promise.all([
        supabase.from('humor_flavors').select('id, slug').order('slug'),
        supabase
          .from('images')
          .select('id, url, image_description')
          .eq('is_public', true)
          .order('created_datetime_utc', { ascending: false })
          .limit(50),
      ]);
      setFlavors(flavorsRes.data || []);
      setImages(imagesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError('Please select an image.');
      return;
    }
    setGenerating(true);
    setError('');
    setCaptions([]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated.');
        setGenerating(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.almostcrackd.ai';
      const res = await fetch(`${apiUrl}/pipeline/generate-captions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: selectedImage,
          ...(selectedFlavor ? { humorFlavorId: selectedFlavor } : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`API error: ${res.status} — ${text}`);
        setGenerating(false);
        return;
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data : data.captions || [data];
      setCaptions(results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setGenerating(false);
  };

  const selectedImageData = images.find((img) => img.id === selectedImage);

  if (loading) return <div className="text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Test Caption Generation</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Select an image and optionally a humor flavor to generate captions via the API.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Config Panel */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Humor Flavor (optional)</label>
              <select
                value={selectedFlavor}
                onChange={(e) => setSelectedFlavor(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Default (no specific flavor)</option>
                {flavors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.slug}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <select
                value={selectedImage}
                onChange={(e) => setSelectedImage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Choose an image...</option>
                {images.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.image_description
                      ? `${img.image_description.slice(0, 60)}...`
                      : img.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedImage}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
            >
              {generating ? 'Generating Captions...' : 'Generate Captions'}
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold mb-4">Image Preview</h2>
          {selectedImageData ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImageData.url}
                alt={selectedImageData.image_description || 'Selected image'}
                className="w-full rounded-lg object-contain max-h-64"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {selectedImageData.image_description || 'No description'}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
              Select an image to preview
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {captions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Generated Captions ({captions.length})</h2>
          <div className="space-y-3">
            {captions.map((caption, idx) => (
              <div
                key={caption.id || idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <p className="text-sm">{caption.content || caption.caption || JSON.stringify(caption)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {generating && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Generating captions...</p>
        </div>
      )}
    </div>
  );
}
