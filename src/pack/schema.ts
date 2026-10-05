/**
 * Quizasaurus pack format, version 1.
 *
 * A pack is everything a child needs to study one school unit: a few games
 * and a final boss quiz. The AI only ever produces this content; the games
 * themselves are fixed templates in the player (ADR-0001).
 *
 * Rules that the format enforces:
 * - Every question is traceable: it names its topic, quotes the sentence of
 *   the book it comes from (`source`) and explains the answer (`explanation`).
 * - Answers are stored as values, never as positions, so the player can
 *   shuffle options and the right answer never sits in a fixed place.
 * - Language and age are set once per pack and apply to every question.
 */
import { z } from "zod";

export const PACK_SCHEMA_VERSION = 1;

const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Use 1-40 lowercase letters, digits or hyphens");

const text = (max: number) =>
  z.string().trim().min(1, "Cannot be empty").max(max, `At most ${max} characters`);

const emoji = text(16).optional();

/** ISO 639-1 code of the language the content is written in, e.g. "ca" or "es". */
export const Language = z.string().regex(/^[a-z]{2}$/, 'Use a two-letter language code, e.g. "ca" or "es"');

/**
 * Age of the children the pack is written for, in years (QZS-37). An age means
 * the same in every country; a school year does not.
 */
export const Age = z.int().min(3).max(18);

/** A school year (Spanish system). Packs made before QZS-37 give this instead of an age. */
export const Grade = z.strictObject({
  stage: z.enum(["primary", "secondary"]),
  year: z.int().min(1).max(6),
});

/** Fields every question carries so an adult can check it against the book. */
const traceable = {
  topic: slug,
  source: text(500),
  explanation: text(300),
};

/** A multiple-choice question; used by the "choice" game and by the boss. */
export const ChoiceQuestion = z
  .strictObject({
    prompt: text(200),
    emoji,
    options: z.array(text(120)).min(2).max(4),
    answer: text(120),
    /** Other options that are also right (e.g. a situation that can cause two emotions). */
    alsoAccepted: z.array(text(120)).optional(),
    ...traceable,
  })
  .superRefine((q, ctx) => {
    if (new Set(q.options).size !== q.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Options must be different from each other" });
    }
    if (!q.options.includes(q.answer)) {
      ctx.addIssue({ code: "custom", path: ["answer"], message: "The answer must be one of the options" });
    }
    q.alsoAccepted?.forEach((alt, i) => {
      if (!q.options.includes(alt) || alt === q.answer) {
        ctx.addIssue({
          code: "custom",
          path: ["alsoAccepted", i],
          message: "Must be one of the options and different from the answer",
        });
      }
    });
  });

const gameBase = {
  title: text(60),
  instructions: text(200).optional(),
};

/** Sort items into 2-4 categories (e.g. which vital function does each organ serve). */
export const ClassifyGame = z
  .strictObject({
    type: z.literal("classify"),
    ...gameBase,
    categories: z
      .array(z.strictObject({ id: slug, label: text(40), emoji }))
      .min(2)
      .max(4),
    items: z
      .array(z.strictObject({ label: text(60), emoji, category: slug, ...traceable }))
      .min(4)
      .max(20),
  })
  .superRefine((g, ctx) => {
    const ids = g.categories.map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["categories"], message: "Category ids must be unique" });
    }
    g.items.forEach((item, i) => {
      if (!ids.includes(item.category)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "category"],
          message: `Unknown category "${item.category}"; expected one of: ${ids.join(", ")}`,
        });
      }
    });
    g.categories.forEach((c, i) => {
      if (!g.items.some((item) => item.category === c.id)) {
        ctx.addIssue({ code: "custom", path: ["categories", i], message: `No item belongs to category "${c.id}"` });
      }
    });
  });

/** Put 3-6 items in the right order (e.g. the stages of life). Items are stored in the correct order. */
export const OrderGame = z
  .strictObject({
    type: z.literal("order"),
    ...gameBase,
    rounds: z
      .array(
        z.strictObject({
          prompt: text(200),
          items: z.array(z.strictObject({ label: text(60), emoji })).min(3).max(6),
          ...traceable,
        }),
      )
      .min(1)
      .max(10),
  })
  .superRefine((g, ctx) => {
    g.rounds.forEach((round, i) => {
      const labels = round.items.map((item) => item.label);
      if (new Set(labels).size !== labels.length) {
        ctx.addIssue({ code: "custom", path: ["rounds", i, "items"], message: "Item labels must be unique" });
      }
    });
  });

/** A situation or question with 2-4 options. */
export const ChoiceGame = z.strictObject({
  type: z.literal("choice"),
  ...gameBase,
  questions: z.array(ChoiceQuestion).min(3).max(20),
});

/** Swipe yes or no on short statements. */
export const YesNoGame = z
  .strictObject({
    type: z.literal("yesno"),
    ...gameBase,
    questions: z
      .array(z.strictObject({ statement: text(200), emoji, answer: z.boolean(), ...traceable }))
      .min(4)
      .max(20),
  })
  .superRefine((g, ctx) => {
    const yes = g.questions.filter((q) => q.answer).length;
    if (yes === 0 || yes === g.questions.length) {
      ctx.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Mix yes and no answers, so the game cannot be won by always swiping the same way",
      });
    }
  });

/** Final quiz over the whole unit. */
export const BossGame = z.strictObject({
  type: z.literal("boss"),
  ...gameBase,
  questions: z.array(ChoiceQuestion).min(5).max(30),
});

export const Game = z.discriminatedUnion("type", [ClassifyGame, OrderGame, ChoiceGame, YesNoGame, BossGame]);

export const GAME_TYPES = ["classify", "order", "choice", "yesno", "boss"] as const;

export const Pack = z
  .strictObject({
    schemaVersion: z.literal(PACK_SCHEMA_VERSION),
    id: slug,
    title: text(80),
    subject: text(60),
    language: Language,
    age: Age.optional(),
    grade: Grade.optional(),
    topics: z
      .array(z.strictObject({ id: slug, name: text(60) }))
      .min(1)
      .max(12),
    games: z.array(Game).min(2).max(8),
    /** Packs start as drafts; the player only offers approved packs to the child. */
    review: z.strictObject({
      status: z.enum(["draft", "approved"]),
      approvedAt: z.iso.datetime().optional(),
    }),
    generator: z
      .strictObject({
        provider: text(40),
        model: text(80),
        createdAt: z.iso.datetime(),
      })
      .optional(),
  })
  .superRefine((pack, ctx) => {
    if (pack.age === undefined && pack.grade === undefined) {
      ctx.addIssue({ code: "custom", path: ["age"], message: "Give the age of the children the pack is for (3-18)" });
    }

    const topicIds = pack.topics.map((t) => t.id);
    if (new Set(topicIds).size !== topicIds.length) {
      ctx.addIssue({ code: "custom", path: ["topics"], message: "Topic ids must be unique" });
    }

    const used = new Set<string>();
    for (const { topic, path } of questionTopics(pack.games)) {
      used.add(topic);
      if (!topicIds.includes(topic)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "topic"],
          message: `Unknown topic "${topic}"; expected one of: ${topicIds.join(", ")}`,
        });
      }
    }
    pack.topics.forEach((t, i) => {
      if (!used.has(t.id)) {
        ctx.addIssue({ code: "custom", path: ["topics", i], message: `No question uses topic "${t.id}"` });
      }
    });

    const bossIndexes = pack.games.flatMap((g, i) => (g.type === "boss" ? [i] : []));
    if (bossIndexes.length !== 1 || bossIndexes[0] !== pack.games.length - 1) {
      ctx.addIssue({ code: "custom", path: ["games"], message: "A pack has exactly one boss game, and it is the last one" });
    } else {
      const boss = pack.games[bossIndexes[0]] as z.infer<typeof BossGame>;
      const covered = new Set(boss.questions.map((q) => q.topic));
      const missing = topicIds.filter((t) => !covered.has(t));
      if (missing.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["games", bossIndexes[0], "questions"],
          message: `The boss must cover the whole unit; missing topics: ${missing.join(", ")}`,
        });
      }
    }

    if (pack.review.status === "approved" && !pack.review.approvedAt) {
      ctx.addIssue({ code: "custom", path: ["review", "approvedAt"], message: "An approved pack needs its approval date" });
    }
  });

export type Pack = z.infer<typeof Pack>;
export type Game = z.infer<typeof Game>;
export type ChoiceQuestion = z.infer<typeof ChoiceQuestion>;

type Path = (string | number)[];

/** Every question in the pack with its topic and its path inside the pack. */
function* questionTopics(games: Game[]): Generator<{ topic: string; path: Path }> {
  for (const [g, game] of games.entries()) {
    switch (game.type) {
      case "classify":
        for (const [i, item] of game.items.entries()) yield { topic: item.topic, path: ["games", g, "items", i] };
        break;
      case "order":
        for (const [i, round] of game.rounds.entries()) yield { topic: round.topic, path: ["games", g, "rounds", i] };
        break;
      case "choice":
      case "yesno":
      case "boss":
        for (const [i, q] of game.questions.entries()) yield { topic: q.topic, path: ["games", g, "questions", i] };
        break;
    }
  }
}
