import React, { useState } from 'react'
import { Link, Trash2, Plus, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useSources } from '../../hooks/useApi'
import { toast } from 'sonner'

export function Fonte() {
  const { sources, loading: fetching, add, remove } = useSources()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      await add(url.trim())
      setUrl('')
      toast.success('Source added successfully', {
        icon: <Plus className="w-4 h-4 text-black" />,
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to add source', {
        icon: <AlertCircle className="w-4 h-4 text-black" />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      toast.success('Source removed', {
        icon: <Trash2 className="w-4 h-4 text-black" />,
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove source', {
        icon: <AlertCircle className="w-4 h-4 text-black" />,
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-4 px-6 h-16 border-b border-border-dark shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-zinc-50 tracking-tight">Sources</h1>
          <p className="text-[10px] text-zinc-500">{sources.length} source{sources.length !== 1 ? 's' : ''} configured</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Add source input */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Paste JSON source URL..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={loading || !url.trim()}
            className="h-9 px-4 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            Add
          </button>
        </div>

        {/* Sources list */}
        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Link className="w-8 h-8 text-zinc-700 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-zinc-500 mb-1">No sources configured</p>
            <p className="text-xs text-zinc-600">Paste a JSON URL above to start adding games to your catalog</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-zinc-400" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{source.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{source.url}</p>
                </div>
                <p className="text-[10px] text-zinc-600 shrink-0">
                  {new Date(source.createdAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
