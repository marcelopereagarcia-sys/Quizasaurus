# Quizasaurus pack format (version 1)

A **pack** is one school unit turned into games: a few games and a final boss quiz, in one JSON file. The AI only ever writes packs; the games themselves are fixed templates in the player ([ADR-0001](adr/)). Anyone can write, fix or share a pack by hand, without touching the code.

The source of truth is [`src/pack/schema.ts`](../src/pack/schema.ts) (a [Zod](https://zod.dev) schema). This page describes the same rules in plain words, and a test (`test/pack-format-doc.test.ts`) fails if a limit here stops matching the schema.

- [A minimal pack](#a-minimal-pack)
- [Fields](#fields)
- [The five games](#the-five-games)
- [Rules across fields](#rules-across-fields)
- [Checking a pack](#checking-a-pack)
- [Sharing a pack](#sharing-a-pack)
- [Versions](#versions)

## A minimal pack

The smallest valid pack: one topic, a yes/no game and the boss. A real one, with all five games, is [`examples/ciclo-del-agua.pack.json`](../examples/ciclo-del-agua.pack.json).

```json
{
  "schemaVersion": 1,
  "id": "water-cycle",
  "title": "The water cycle",
  "subject": "Science",
  "language": "en",
  "age": 8,
  "topics": [{ "id": "states", "name": "States of water" }],
  "games": [
    {
      "type": "yesno",
      "title": "True or false?",
      "questions": [
        { "statement": "Ice is water in solid state.", "answer": true, "topic": "states", "source": "Ice is water in solid state.", "explanation": "When water freezes it becomes ice, a solid." },
        { "statement": "Steam is water in liquid state.", "answer": false, "topic": "states", "source": "Steam is water in gas state.", "explanation": "Steam is a gas, not a liquid." },
        { "statement": "Water can be solid, liquid or gas.", "answer": true, "topic": "states", "source": "Water can be found in three states: solid, liquid and gas.", "explanation": "Those are the three states of water." },
        { "statement": "Ice melts when it gets colder.", "answer": false, "topic": "states", "source": "Ice melts when it gets warmer.", "explanation": "Heat melts ice; cold freezes water." }
      ]
    },
    {
      "type": "boss",
      "title": "Final challenge",
      "questions": [
        { "prompt": "What is ice?", "options": ["Solid water", "Liquid water", "Water vapour"], "answer": "Solid water", "topic": "states", "source": "Ice is water in solid state.", "explanation": "Ice is the solid state of water." },
        { "prompt": "What is steam?", "options": ["A solid", "A gas"], "answer": "A gas", "topic": "states", "source": "Steam is water in gas state.", "explanation": "Steam is water as a gas." },
        { "prompt": "How many states can water be in?", "options": ["Two", "Three", "Four"], "answer": "Three", "topic": "states", "source": "Water can be found in three states: solid, liquid and gas.", "explanation": "Solid, liquid and gas." },
        { "prompt": "What makes ice melt?", "options": ["Heat", "Cold"], "answer": "Heat", "topic": "states", "source": "Ice melts when it gets warmer.", "explanation": "Ice melts when it warms up." },
        { "prompt": "Rain is water in which state?", "options": ["Solid", "Liquid", "Gas"], "answer": "Liquid", "topic": "states", "source": "Rain is liquid water falling from the clouds.", "explanation": "Rain drops are liquid water." }
      ]
    }
  ],
  "review": { "status": "draft" }
}
```

## Fields

**Conventions used in the tables:**

- **Text** is trimmed and cannot be empty; *Limits* gives its length in characters.
- **List** gives the number of elements allowed.
- **Id** is 1 to 40 lowercase letters, digits or hyphens, starting with a letter or digit (e.g. `water-cycle`, `states`).
- **Emoji** is a short text (one emoji, or a few characters) shown next to the text. It is always optional.
- No other fields are allowed: a misspelt or unknown field makes the pack invalid.

### Pack

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `schemaVersion` | number | yes | always `1` |
| `id` | id | yes | |
| `title` | text | yes | 1–80 |
| `subject` | text | yes | 1–60 |
| `language` | two-letter code (ISO 639-1), e.g. `ca`, `es`, `en` | yes | |
| `age` | whole number: age of the children the pack is for, in years | no (see below) | 3–18 |
| `grade` | Grade (older packs only) | no | |
| `topics` | list of Topic | yes | 1–12 |
| `games` | list of games (see below) | yes | 2–8 |
| `review` | Review | yes | |
| `generator` | Generator | no | |

`language` and `age` apply to the whole pack. When the language is `ca`, `es` or `en`, the player speaks that language inside the unit.

`age` is required in practice: a pack must give either `age` or, if it was made before ages were added, `grade`. New packs use `age`, because ages mean the same in every country and school years do not. The app's generator offers ages 5 to 15.

### Grade

A school year in the Spanish system (primary 1–6, secondary 1–4). Packs made before `age` existed give this instead; they stay valid. Do not use it in new packs.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `stage` | `primary` or `secondary` | yes | |
| `year` | whole number | yes | 1–6 |

### Topic

The parts of the unit. Every question names one, so an adult can see what each game covers.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `id` | id | yes | |
| `name` | text | yes | 1–60 |

### Review

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `status` | `draft` or `approved` | yes | |
| `approvedAt` | date and time (ISO 8601, e.g. `2026-10-03T12:00:00Z`) | no | |

Packs start as drafts. The player only lets a child play an **approved** pack: an adult has to review the questions first.

### Generator

Filled in by the app when an AI writes the pack; leave it out in packs written by hand.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `provider` | text | yes | 1–40 |
| `model` | text | yes | 1–80 |
| `createdAt` | date and time (ISO 8601) | yes | |

### Question fields

Every question, item or round also carries these three fields, so an adult can check it against the book:

| Field | What it holds |
| --- | --- |
| `topic` | The id of one of the pack's topics. |
| `source` | The sentence of the book the question comes from (1–500 characters). |
| `explanation` | Why the answer is right, shown to the child after answering (1–300 characters). |

They appear again in each table below, with their limits.

## The five games

Each game has a `type` and a `title`, and may have `instructions` (kept in the pack; the player does not show them yet). Answers are stored as values, never as positions: the player shuffles options and items, so the right answer never sits in a fixed place.

### Classify game

`"type": "classify"`: drag each item into its category (e.g. which vital function each organ serves).

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `type` | `classify` | yes | |
| `title` | text | yes | 1–60 |
| `instructions` | text | no | 1–200 |
| `categories` | list of Category | yes | 2–4 |
| `items` | list of Classify item | yes | 4–20 |

### Category

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `id` | id | yes | |
| `label` | text | yes | 1–40 |
| `emoji` | emoji | no | 1–16 |

### Classify item

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `label` | text | yes | 1–60 |
| `emoji` | emoji | no | 1–16 |
| `category` | id of one of the game's categories | yes | |
| `topic` | id of one of the pack's topics | yes | |
| `source` | text | yes | 1–500 |
| `explanation` | text | yes | 1–300 |

### Order game

`"type": "order"`: put the items of each round in the right order (e.g. the stages of life).

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `type` | `order` | yes | |
| `title` | text | yes | 1–60 |
| `instructions` | text | no | 1–200 |
| `rounds` | list of Order round | yes | 1–10 |

### Order round

The items are written **in the correct order**; the player shuffles them.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `prompt` | text | yes | 1–200 |
| `items` | list of Order item | yes | 3–6 |
| `topic` | id of one of the pack's topics | yes | |
| `source` | text | yes | 1–500 |
| `explanation` | text | yes | 1–300 |

### Order item

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `label` | text | yes | 1–60 |
| `emoji` | emoji | no | 1–16 |

### Choice game

`"type": "choice"`: a situation or question with 2 to 4 options.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `type` | `choice` | yes | |
| `title` | text | yes | 1–60 |
| `instructions` | text | no | 1–200 |
| `questions` | list of Choice question | yes | 3–20 |

### Choice question

Used by the choice game and by the boss.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `prompt` | text | yes | 1–200 |
| `emoji` | emoji | no | 1–16 |
| `options` | list of text (each 1–120 characters) | yes | 2–4 |
| `answer` | text, exactly one of the options | yes | 1–120 |
| `alsoAccepted` | list of text: other options that are also right | no | |
| `topic` | id of one of the pack's topics | yes | |
| `source` | text | yes | 1–500 |
| `explanation` | text | yes | 1–300 |

### Yes/no game

`"type": "yesno"`: swipe yes or no on short statements.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `type` | `yesno` | yes | |
| `title` | text | yes | 1–60 |
| `instructions` | text | no | 1–200 |
| `questions` | list of Yes/no statement | yes | 4–20 |

### Yes/no statement

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `statement` | text | yes | 1–200 |
| `emoji` | emoji | no | 1–16 |
| `answer` | `true` (yes) or `false` (no) | yes | |
| `topic` | id of one of the pack's topics | yes | |
| `source` | text | yes | 1–500 |
| `explanation` | text | yes | 1–300 |

### Boss game

`"type": "boss"`: the final quiz over the whole unit, with Choice questions.

| Field | Type | Required | Limits |
| --- | --- | --- | --- |
| `type` | `boss` | yes | |
| `title` | text | yes | 1–60 |
| `instructions` | text | no | 1–200 |
| `questions` | list of Choice question | yes | 5–30 |

## Rules across fields

Besides the limits above, a pack is only valid if:

1. **It says who it is for:** it has `age` (or `grade`, in older packs).
2. **Exactly one boss, and it is the last game.**
3. **The boss covers the whole unit:** at least one boss question for every topic.
4. **Every topic is used** by at least one question, and every question's `topic` is one of the pack's topics. Topic ids are unique.
5. **Choice questions:** the options are all different, the `answer` is one of them, and each `alsoAccepted` value is one of the options and not the answer.
6. **Classify games:** category ids are unique, every item's `category` is one of them, and every category has at least one item.
7. **Order rounds:** item labels are unique within the round.
8. **Yes/no games mix yes and no**, so the game cannot be won by always swiping the same way.
9. **An approved pack has `approvedAt`.**

Each problem comes with the path of the wrong field, e.g. `games[2].questions[0].answer: The answer must be one of the options` (see [Checking a pack](#checking-a-pack)).

## Checking a pack

From a copy of the repository (Node.js 22 or later, `npm install` first):

```bash
npm run validate -- path/to/my.pack.json
```

It prints `✔ … valid` or one line per problem, with the path of the field. The app runs the same check when it loads a pack or opens a shared link (it rejects an invalid pack and says how many problems it has), and when the AI writes a pack (the AI gets the problems back and tries again).

## Sharing a pack

- **As a file:** in the app, open the unit, choose **Share** and save `<id>.quizasaurus.json`; on the other device, use **Load a pack**. Any file that follows this format works.
- **As a link:** **Share** also makes a link with the pack inside it, after the `#` (`#pack=z.` plus the pack compressed with deflate-raw in base64url). Browsers never send that part to the server, so the pack travels only inside the link.
- Do not share packs made from copyrighted books outside your family or class, and never put children's names or photos in a pack.

## Versions

- `schemaVersion` is the version of this format. The current one is **1**, and the player only opens packs of version 1.
- Changes that keep old packs valid (a new optional field, a higher limit) keep the version. Changes that would make existing packs invalid, or change what a field means, need a new version number and a way to update old packs.
- Any change to the format starts in `src/pack/schema.ts`, with tests, and updates this page in the same change: `test/pack-format-doc.test.ts` checks that every table here matches the schema and that the minimal pack above is valid.
