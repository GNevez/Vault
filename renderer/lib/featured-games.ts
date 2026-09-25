/**
 * Curated highlights for Discover. Sources only give repack titles without artwork,
 * so the storefront is a hand-picked list of major games with official art bundled in
 * public/images/games/featured (Steam library assets). Each game links to the sources
 * through `query`, which also lets library and download rows reuse the cover.
 */
export type Genre = 'RPG' | 'Ação' | 'Aventura' | 'Cooperativo' | 'Indie' | 'Mundo aberto' | 'Soulslike' | 'Corrida' | 'Simulação' | 'Roguelike' | 'Terror' | 'Metroidvania';

export interface FeaturedGame {
  slug: string;
  title: string;
  /** Search term sent to the sources. */
  query: string;
  /** Matches repack titles like "ELDEN RING: Shadow of the Erdtree Edition – v1.16". */
  match: RegExp;
  genres: Genre[];
  tagline?: string;
  /** Games with hero art rotate in the top banner. */
  hero?: boolean;
}

export const FEATURED_GAMES: FeaturedGame[] = [
  { slug: 'elden-ring', title: 'Elden Ring', query: 'Elden Ring', match: /elden\s*ring/i, genres: ['RPG', 'Mundo aberto', 'Soulslike'], tagline: 'Um mundo inteiro para explorar. Levante-se, Maculado.', hero: true },
  { slug: 'red-dead-redemption-2', title: 'Red Dead Redemption 2', query: 'Red Dead Redemption 2', match: /red\s*dead\s*redemption\s*(2|ii)\b/i, genres: ['Ação', 'Aventura', 'Mundo aberto'], tagline: 'A história épica de Arthur Morgan no fim da era do Velho Oeste.', hero: true },
  { slug: 'cyberpunk-2077', title: 'Cyberpunk 2077', query: 'Cyberpunk 2077', match: /cyberpunk\s*2077/i, genres: ['RPG', 'Ação', 'Mundo aberto'], tagline: 'Night City espera por você. Torne-se uma lenda.', hero: true },
  { slug: 'god-of-war', title: 'God of War', query: 'God of War', match: /god\s*of\s*war(?!.*ragnar)/i, genres: ['Ação', 'Aventura'], tagline: 'Kratos e Atreus em uma jornada pelos reinos nórdicos.', hero: true },
  { slug: 'baldurs-gate-3', title: "Baldur's Gate 3", query: "Baldur's Gate 3", match: /baldur'?s\s*gate\s*(3|iii)\b/i, genres: ['RPG', 'Cooperativo', 'Aventura'], tagline: 'Reúna seu grupo e volte aos Reinos Esquecidos.', hero: true },
  { slug: 'black-myth-wukong', title: 'Black Myth: Wukong', query: 'Black Myth Wukong', match: /black\s*myth.*wukong/i, genres: ['Ação', 'RPG', 'Soulslike'], tagline: 'Siga o caminho do Destinado pela mitologia chinesa.', hero: true },
  { slug: 'hollow-knight', title: 'Hollow Knight', query: 'Hollow Knight', match: /hollow\s*knight(?!.*silksong)/i, genres: ['Metroidvania', 'Ação', 'Indie'] },
  { slug: 'forza-horizon-5', title: 'Forza Horizon 5', query: 'Forza Horizon 5', match: /forza\s*horizon\s*5/i, genres: ['Corrida', 'Mundo aberto', 'Cooperativo'] },
  { slug: 'the-witcher-3', title: 'The Witcher 3: Wild Hunt', query: 'Witcher 3', match: /witcher\s*3|wild\s*hunt/i, genres: ['RPG', 'Mundo aberto', 'Aventura'] },
  { slug: 'sekiro', title: 'Sekiro: Shadows Die Twice', query: 'Sekiro', match: /sekiro/i, genres: ['Ação', 'Soulslike'] },
  { slug: 'resident-evil-4', title: 'Resident Evil 4', query: 'Resident Evil 4 2023', match: /resident\s*evil\s*4\s*\(?2023/i, genres: ['Terror', 'Ação'] },
  { slug: 'it-takes-two', title: 'It Takes Two', query: 'It Takes Two', match: /it\s*takes\s*two/i, genres: ['Cooperativo', 'Aventura'] },
  { slug: 'monster-hunter-world', title: 'Monster Hunter: World', query: 'Monster Hunter World', match: /monster\s*hunter.*world/i, genres: ['Ação', 'Cooperativo', 'RPG'] },
  { slug: 'dark-souls-3', title: 'Dark Souls III', query: 'Dark Souls 3', match: /dark\s*souls\s*(3|iii)\b/i, genres: ['RPG', 'Soulslike', 'Ação'] },
  { slug: 'hades', title: 'Hades', query: 'Hades', match: /\bhades\b(?!\s*(2|ii)\b)/i, genres: ['Roguelike', 'Ação', 'Indie'] },
  { slug: 'stardew-valley', title: 'Stardew Valley', query: 'Stardew Valley', match: /stardew\s*valley/i, genres: ['Simulação', 'Cooperativo', 'Indie'] },
  { slug: 'terraria', title: 'Terraria', query: 'Terraria', match: /terraria/i, genres: ['Aventura', 'Cooperativo', 'Indie'] },
];

export const HERO_GAMES = FEATURED_GAMES.filter(g => g.hero);
/** Genre chips shown above the catalog row, in this order. */
export const GENRE_FILTERS: Genre[] = ['RPG', 'Ação', 'Aventura', 'Cooperativo', 'Indie'];

const base = '/images/games/featured';
export const coverOf = (game: FeaturedGame) => `${base}/${game.slug}-capsule.jpg`;
export const heroOf = (game: FeaturedGame) => `${base}/${game.slug}-hero.jpg`;
export const logoOf = (game: FeaturedGame) => `${base}/${game.slug}-logo.png`;

/** Finds curated art for a repack or library title, if it is one of the featured games. */
export function featuredFor(title: string) {
  return FEATURED_GAMES.find(game => game.match.test(title));
}
