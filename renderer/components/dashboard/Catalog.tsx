import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Download, Link2 } from "lucide-react";
import type { LibraryApi, SourcesApi } from "../../hooks/useApi";
import { FEATURED_GAMES, GENRE_FILTERS, HERO_GAMES, coverOf, featuredFor, heroOf, logoOf, type FeaturedGame, type Genre } from "../../lib/featured-games";
import { GameArt, accentButton, iconButton, type GamesTab } from "./gameUi";

interface Props {
  sources: SourcesApi;
  library: LibraryApi;
  onTab: (tab: GamesTab) => void;
  /** Opens the search modal for a game. */
  onFind: (query: string) => void;
}

const ROTATE_MS = 8000;

export function Catalog({ sources, library, onTab, onFind }: Props) {
  const [genre, setGenre] = useState<Genre | null>(null);
  const games = genre ? FEATURED_GAMES.filter(g => g.genres.includes(genre)) : FEATURED_GAMES;
  const noSources = !sources.loading && sources.sources.length === 0;

  return (
    <div className="space-y-9">
      <Hero onFind={onFind} />

      {/* {noSources && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-accent/25 bg-accent/5 px-5 py-4">
          <Link2 size={18} className="shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-sm text-zinc-300">Adicione uma fonte de jogos para buscar e baixar os títulos do catálogo.</p>
          <button onClick={() => onTab("fonte")} className={accentButton}>Configurar fontes<ArrowRight size={15} /></button>
        </div>
      )} */}

      <Row
        title="Explore o catálogo"
        filters={
          <div role="group" aria-label="Filtrar por gênero" className="flex flex-wrap gap-2">
            {[null, ...GENRE_FILTERS].map(value => {
              const active = genre === value;
              return (
                <button key={value ?? "all"} aria-pressed={active} onClick={() => setGenre(value)}
                  className={`rounded-full border px-3.5 py-1 text-xs font-medium transition ${active ? "border-accent bg-accent text-accent-ink" : "border-line text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"}`}>
                  {value ?? "Todos"}
                </button>
              );
            })}
          </div>
        }
        resetKey={genre ?? "all"}
      >
        {games.map(game => <GameCard key={game.slug} game={game} onFind={onFind} />)}
      </Row>

      {library.games.length > 0 && (
        <section aria-label="Na sua biblioteca">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-zinc-50">Na sua biblioteca</h2>
            <button onClick={() => onTab("library")} className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong">Ver biblioteca<ArrowRight size={14} /></button>
          </div>
          <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {library.games.slice(0, 3).map((item, i) => {
              const featured = featuredFor(item.title);
              return (
                <button key={item.id} onClick={() => onTab("library")} className={`group flex min-w-0 items-center gap-3 rounded-lg border border-line bg-raised p-2.5 text-left transition hover:border-zinc-700 ${i === 2 ? "@2xl:@max-5xl:hidden" : ""}`}>
                  <GameArt title={item.title} size="sm" className="h-14 w-24 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-zinc-100" title={item.title}>{featured?.title ?? item.title}</span>
                    <span className="block truncate text-xs text-zinc-500">{featured ? featured.genres.slice(0, 2).join(" · ") : `${item.sourceName}${item.fileSize ? ` · ${item.fileSize}` : ""}`}</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-zinc-300 transition group-hover:border-zinc-500 group-hover:text-zinc-50"><ArrowRight size={15} /></span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Rotating banner of the biggest titles. Pauses while hovered or focused. */
function Hero({ onFind }: { onFind: (query: string) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const game = HERO_GAMES[index];
  const go = (step: number) => setIndex(i => (i + step + HERO_GAMES.length) % HERO_GAMES.length);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => go(1), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [index, paused]);

  return (
    <section
      aria-label="Em destaque" aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="group relative h-[300px] overflow-hidden rounded-lg border border-line bg-raised xl:h-[330px] short:h-[240px] short:xl:h-[240px]"
    >
      {HERO_GAMES.map((g, i) => (
        <img key={g.slug} src={heroOf(g)} alt="" aria-hidden draggable={false}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

      <div key={game.slug} className="relative flex h-full max-w-lg flex-col justify-center px-8 xl:px-10" aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Em destaque</p>
        <img src={logoOf(game)} alt={game.title} draggable={false} className="mt-4 max-h-24 w-auto max-w-[360px] object-contain object-left drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)]" />
        <p className="mt-4 text-[13px] text-zinc-300">{game.genres.join("  ·  ")}</p>
        {game.tagline && <p className="mt-2 max-w-md text-[15px] leading-6 text-zinc-100">{game.tagline}</p>}
        <div className="mt-6"><button onClick={() => onFind(game.query)} className={accentButton}>Ver jogo<ArrowRight size={15} /></button></div>
      </div>

      <button onClick={() => go(-1)} aria-label="Destaque anterior" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-zinc-200 opacity-0 transition hover:bg-black/70 focus:opacity-100 group-hover:opacity-100"><ChevronLeft size={18} /></button>
      <button onClick={() => go(1)} aria-label="Próximo destaque" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-zinc-200 opacity-0 transition hover:bg-black/70 focus:opacity-100 group-hover:opacity-100"><ChevronRight size={18} /></button>

      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {HERO_GAMES.map((g, i) => (
          <button key={g.slug} onClick={() => setIndex(i)} aria-label={`Mostrar ${g.title}`} aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
        ))}
      </div>
    </section>
  );
}

/** Horizontal, scroll-snapping row with arrow controls; four cards fit on a typical window. */
function Row({ title, filters, resetKey, children }: { title: string; filters?: React.ReactNode; resetKey: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const measure = () => {
    const el = ref.current; if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    ref.current?.scrollTo({ left: 0 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [resetKey]);
  const scroll = (direction: number) => { const el = ref.current; if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" }); };

  return (
    <section aria-label={title}>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2 className="text-lg font-bold tracking-tight text-zinc-50">{title}</h2>
        {filters}
        <div className="ml-auto flex gap-2">
          <button aria-label="Rolar para a esquerda" onClick={() => scroll(-1)} disabled={edges.start} className={iconButton}><ChevronLeft size={15} /></button>
          <button aria-label="Rolar para a direita" onClick={() => scroll(1)} disabled={edges.end} className={iconButton}><ChevronRight size={15} /></button>
        </div>
      </div>
      <div ref={ref} onScroll={measure} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

function GameCard({ game, onFind }: { game: FeaturedGame; onFind: (query: string) => void }) {
  return (
    <article className="group relative flex w-[calc((100%-1rem)/2)] @2xl:w-[calc((100%-2rem)/3)] @5xl:w-[calc((100%-3rem)/4)] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-line bg-raised transition hover:border-zinc-600">
      <button onClick={() => onFind(game.query)} aria-label={`Ver ${game.title}`} className="absolute inset-0 z-10" />
      <div className="overflow-hidden">
        <img src={coverOf(game)} alt="" loading="lazy" draggable={false} className="aspect-[616/353] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="flex items-center gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-zinc-100" title={game.title}>{game.title}</h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{game.genres.join(" · ")}</p>
        </div>
        <span aria-hidden className={`${iconButton} relative z-0 group-hover:border-zinc-500 group-hover:text-zinc-100`}><Download size={15} /></span>
      </div>
    </article>
  );
}
