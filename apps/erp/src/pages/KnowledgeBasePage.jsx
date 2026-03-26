import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Search, Plus, Loader2 } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn, formatDateTime } from '../lib/utils';

const MANAGE_ROLES = new Set(['OWNER', 'ADMIN', 'HR']);

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = MANAGE_ROLES.has(user?.role);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [articleForm, setArticleForm] = useState({ title: '', categoryId: '', excerpt: '', body: '', status: 'PUBLISHED' });
  const [error, setError] = useState('');

  const { data: categoriesData } = useQuery({
    queryKey: ['kb', 'categories'],
    queryFn: () => api.get('/knowledge-base/categories').then((r) => r.data.data),
  });
  const categories = categoriesData || [];

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['kb', 'articles', q, categoryId, canManage],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoryId) params.set('categoryId', categoryId);
      if (canManage) params.set('includeDraft', 'true');
      return api.get(`/knowledge-base/articles?${params.toString()}`).then((r) => r.data.data);
    },
  });
  const articles = articlesData || [];

  const createCategoryMut = useMutation({
    mutationFn: (payload) => api.post('/knowledge-base/categories', payload),
    onSuccess: () => {
      setCategoryForm({ name: '', description: '' });
      qc.invalidateQueries({ queryKey: ['kb', 'categories'] });
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create category'),
  });

  const createArticleMut = useMutation({
    mutationFn: (payload) => api.post('/knowledge-base/articles', payload),
    onSuccess: () => {
      setArticleForm({ title: '', categoryId: '', excerpt: '', body: '', status: 'PUBLISHED' });
      qc.invalidateQueries({ queryKey: ['kb', 'articles'] });
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create article'),
  });

  const grouped = useMemo(() => {
    const by = new Map();
    for (const a of articles) {
      const key = a.category?.name || 'Uncategorized';
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(a);
    }
    return Array.from(by.entries());
  }, [articles]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Knowledge base
          </h1>
          <p className="page-subtitle">Search policies, SOPs, and internal guides.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowManage((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" /> {showManage ? 'Hide manager' : 'Manage content'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find articles by title, summary, or content"
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showManage && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="font-semibold text-slate-900">New category</div>
            <input value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button
              type="button"
              onClick={() => createCategoryMut.mutate(categoryForm)}
              disabled={createCategoryMut.isPending || !categoryForm.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {createCategoryMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add category
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="font-semibold text-slate-900">New article</div>
            <input value={articleForm.title} onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))} placeholder="Article title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <select value={articleForm.categoryId} onChange={(e) => setArticleForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={articleForm.excerpt} onChange={(e) => setArticleForm((f) => ({ ...f, excerpt: e.target.value }))} placeholder="Summary / excerpt" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={articleForm.body} onChange={(e) => setArticleForm((f) => ({ ...f, body: e.target.value }))} rows={5} placeholder="Article body" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <select value={articleForm.status} onChange={(e) => setArticleForm((f) => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {['PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="button"
              onClick={() => createArticleMut.mutate({ ...articleForm, categoryId: articleForm.categoryId || null })}
              disabled={createArticleMut.isPending || !articleForm.title.trim() || !articleForm.body.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {createArticleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add article
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading articles...
          </div>
        )}
        {!isLoading && grouped.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
            No articles found.
          </div>
        )}
        {!isLoading && grouped.map(([catName, items]) => (
          <div key={catName} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="font-semibold text-slate-900 mb-3">{catName}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((a) => (
                <div key={a.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', a.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>
                      {a.status}
                    </span>
                  </div>
                  {a.excerpt && <p className="text-sm text-slate-600">{a.excerpt}</p>}
                  <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">{a.body.slice(0, 280)}{a.body.length > 280 ? '...' : ''}</p>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {a.publishedAt ? `Published ${formatDateTime(a.publishedAt)}` : `Updated ${formatDateTime(a.updatedAt)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
