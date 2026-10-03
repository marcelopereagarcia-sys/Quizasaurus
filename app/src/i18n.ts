/**
 * Interface texts (QZS-20), same pattern as SpeakiKids: `es` defines the keys
 * and the other languages are declared as `Dict`, so the compiler reports any
 * missing translation. Texts with variables are functions, because each
 * language orders the sentence its own way.
 *
 * The interface language is independent of the pack's language.
 */

const es = {
  appTagline: "Juegos para repasar tu unidad",
  myPacks: "Mis unidades",
  noPacks: "Todavía no hay ninguna unidad. Carga un pack para empezar.",
  loadPack: "📂 Cargar un pack (.json)",
  loadError: (count: number) => `Este archivo no es un pack válido (${count} ${count === 1 ? "problema" : "problemas"}).`,
  loaded: (title: string) => `«${title}» está lista.`,
  notSaved: "No se ha podido guardar en este dispositivo: se perderá al cerrar.",
  draft: "Pendiente de revisión",
  approved: "Revisada",
  needsReview: "Una persona adulta tiene que revisar las preguntas antes de jugar.",
  games: (count: number) => `${count} juegos`,
  back: "← Volver",
  play: "▶ Jugar",
  remove: "🗑 Quitar",
  removeConfirm: (title: string) => `¿Quitar «${title}» de este dispositivo?`,
  gameNames: {
    classify: "Clasificar",
    order: "Ordenar",
    choice: "¿Qué pasa aquí?",
    yesno: "¿Sí o no?",
    boss: "Jefe final",
  },
  language: "Idioma",
  offlineReady: "Lista para jugar sin conexión.",
  questionOf: (n: number, total: number) => `${n} de ${total}`,
  whereDoesItGo: "¿Dónde va?",
  tapInOrder: "Toca en orden",
  check: "Comprobar",
  undo: "↩ Deshacer",
  yes: "Sí",
  no: "No",
  swipeHint: "Desliza a la derecha si es verdad, a la izquierda si no",
  right: ["¡Muy bien! 🎉", "¡Correcto! ⭐", "¡Genial! 🦖", "¡Lo sabías! 💎"],
  wrong: "¡Casi! Mira:",
  rightAnswer: "La respuesta es",
  bookSays: "📖 El libro dice",
  quote: (text: string) => `«${text}»`,
  next: "Seguir ➡️",
  results: "¡Juego terminado!",
  score: (correct: number, total: number) => `Has acertado ${correct} de ${total}`,
  starsLabel: (count: number) => `${count} de 3 estrellas`,
  bossLife: "Vida del jefe",
  bossWin: "¡Has vencido al jefe! 🏆",
  bossLose: (needed: number) => `El jefe ha ganado esta vez. Necesitas ${needed} aciertos. ¡Inténtalo otra vez!`,
  playAgain: "🔄 Otra vez",
  nextGame: "▶ Siguiente juego",
  finish: "🏠 Terminar",
  exitGame: "✕ Salir",
};

export type Dict = typeof es;

const ca: Dict = {
  appTagline: "Jocs per repassar la teva unitat",
  myPacks: "Les meves unitats",
  noPacks: "Encara no hi ha cap unitat. Carrega un pack per començar.",
  loadPack: "📂 Carregar un pack (.json)",
  loadError: (count) => `Aquest fitxer no és un pack vàlid (${count} ${count === 1 ? "problema" : "problemes"}).`,
  loaded: (title) => `«${title}» ja està a punt.`,
  notSaved: "No s'ha pogut desar en aquest dispositiu: es perdrà en tancar.",
  draft: "Pendent de revisió",
  approved: "Revisada",
  needsReview: "Una persona adulta ha de revisar les preguntes abans de jugar.",
  games: (count) => `${count} jocs`,
  back: "← Tornar",
  play: "▶ Jugar",
  remove: "🗑 Treure",
  removeConfirm: (title) => `Vols treure «${title}» d'aquest dispositiu?`,
  gameNames: {
    classify: "Classificar",
    order: "Ordenar",
    choice: "Què passa aquí?",
    yesno: "Sí o no?",
    boss: "Repte final",
  },
  language: "Idioma",
  offlineReady: "A punt per jugar sense connexió.",
  questionOf: (n, total) => `${n} de ${total}`,
  whereDoesItGo: "On va?",
  tapInOrder: "Toca en ordre",
  check: "Comprovar",
  undo: "↩ Desfer",
  yes: "Sí",
  no: "No",
  swipeHint: "Llisca a la dreta si és veritat, a l'esquerra si no",
  right: ["Molt bé! 🎉", "Correcte! ⭐", "Genial! 🦖", "Ho sabies! 💎"],
  wrong: "Gairebé! Mira:",
  rightAnswer: "La resposta és",
  bookSays: "📖 El llibre diu",
  quote: (text) => `«${text}»`,
  next: "Seguir ➡️",
  results: "Joc acabat!",
  score: (correct, total) => `Has encertat ${correct} de ${total}`,
  starsLabel: (count) => `${count} de 3 estrelles`,
  bossLife: "Vida del repte",
  bossWin: "Has superat el repte! 🏆",
  bossLose: (needed) => `Aquesta vegada no has superat el repte. Necessites ${needed} encerts. Torna-ho a provar!`,
  playAgain: "🔄 Una altra vegada",
  nextGame: "▶ Següent joc",
  finish: "🏠 Acabar",
  exitGame: "✕ Sortir",
};

const en: Dict = {
  appTagline: "Games to review your school unit",
  myPacks: "My units",
  noPacks: "There are no units yet. Load a pack to start.",
  loadPack: "📂 Load a pack (.json)",
  loadError: (count) => `This file is not a valid pack (${count} ${count === 1 ? "problem" : "problems"}).`,
  loaded: (title) => `“${title}” is ready.`,
  notSaved: "It could not be saved on this device: it will be lost when you close the app.",
  draft: "Waiting for review",
  approved: "Reviewed",
  needsReview: "An adult has to review the questions before playing.",
  games: (count) => `${count} games`,
  back: "← Back",
  play: "▶ Play",
  remove: "🗑 Remove",
  removeConfirm: (title) => `Remove “${title}” from this device?`,
  gameNames: {
    classify: "Sort it out",
    order: "Put in order",
    choice: "What happens here?",
    yesno: "Yes or no?",
    boss: "Final boss",
  },
  language: "Language",
  offlineReady: "Ready to play offline.",
  questionOf: (n, total) => `${n} of ${total}`,
  whereDoesItGo: "Where does it go?",
  tapInOrder: "Tap them in order",
  check: "Check",
  undo: "↩ Undo",
  yes: "Yes",
  no: "No",
  swipeHint: "Swipe right if it is true, left if it is not",
  right: ["Well done! 🎉", "Correct! ⭐", "Great! 🦖", "You knew it! 💎"],
  wrong: "Almost! Look:",
  rightAnswer: "The answer is",
  bookSays: "📖 The book says",
  quote: (text) => `“${text}”`,
  next: "Next ➡️",
  results: "All done!",
  score: (correct, total) => `You got ${correct} out of ${total}`,
  starsLabel: (count) => `${count} out of 3 stars`,
  bossLife: "Boss health",
  bossWin: "You beat the boss! 🏆",
  bossLose: (needed) => `The boss won this time. You need ${needed} right answers. Try again!`,
  playAgain: "🔄 Play again",
  nextGame: "▶ Next game",
  finish: "🏠 Finish",
  exitGame: "✕ Exit",
};

export const UI_LANGS = { ca, es, en } as const;
export type UiLang = keyof typeof UI_LANGS;
export const UI_LANG_NAMES: Record<UiLang, string> = { ca: "Català", es: "Castellano", en: "English" };

/**
 * The first browser language the app speaks; English if none.
 * Only these three: more languages are welcome as contributions.
 */
export function defaultUiLang(browserLangs: readonly string[]): UiLang {
  for (const lang of browserLangs) {
    const code = lang.toLowerCase().slice(0, 2);
    if (code in UI_LANGS) return code as UiLang;
  }
  return "en";
}

export function isUiLang(value: unknown): value is UiLang {
  return typeof value === "string" && value in UI_LANGS;
}
