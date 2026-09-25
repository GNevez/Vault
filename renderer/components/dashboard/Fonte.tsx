import React, { useState } from 'react'
import { ExternalLink, Link, Loader2, Plus, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SourcesApi } from '../../hooks/useApi'
import { EmptyState, accentButton, formatDate, iconButton } from './gameUi'

export function Fonte({ query, sources: api }: { query: string; sources: SourcesApi }) {
  const { sources, loading: fetching, add, remove } = api
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || loading) return
    setLoading(true)
    try {
      await add(url.trim())
      setUrl('')
      toast.success('Fonte adicionada')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível adicionar a fonte')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setRemoving(id)
    try {
      await remove(id)
      toast.success('Fonte removida')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível remover a fonte')
    } finally {
      setRemoving(null)
    }
  }

  const term = query.trim().toLocaleLowerCase()
  const visible = term ? sources.filter(s => s.name.toLocaleLowerCase().includes(term) || s.url.toLocaleLowerCase().includes(term)) : sources

  return (
    <div className="max-w-4xl">
      <section className="rounded-lg border border-line bg-raised p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Adicionar fonte</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Cole a URL de um arquivo JSON de fonte. Os jogos dela passam a aparecer em Descobrir.</p>
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://exemplo.com/fonte.json"
              aria-label="URL da fonte"
              className="h-9 w-full rounded-md border border-line bg-panel pl-9 pr-3 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-accent/60 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading || !url.trim()} className={accentButton}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.2} />}
            Adicionar
          </button>
        </form>
      </section>

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-zinc-50">Fontes configuradas</h2>
        <span className="text-xs text-zinc-500">{sources.length} {sources.length === 1 ? 'fonte' : 'fontes'}</span>
      </div>

      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
      ) : sources.length === 0 ? (
        <EmptyState icon={Link} title="Nenhuma fonte configurada" description="Adicione uma URL acima para começar a montar seu catálogo." />
      ) : !visible.length ? (
        <EmptyState icon={SearchX} title="Nenhuma fonte corresponde à busca" description="Tente outro termo." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
          {visible.map(source => (
            <li key={source.id} className="flex items-center gap-4 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-panel text-zinc-500"><ExternalLink size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{source.name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500" title={source.url}>{source.url}</p>
              </div>
              <p className="hidden shrink-0 text-xs text-zinc-600 sm:block">Desde {formatDate(source.createdAt)}</p>
              <button onClick={() => void handleDelete(source.id)} disabled={removing === source.id} aria-label={`Remover fonte ${source.name}`} title="Remover fonte" className={`${iconButton} hover:text-red-400`}>
                {removing === source.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
