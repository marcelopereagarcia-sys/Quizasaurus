# Case study: managing an AI-built product, from prototype to v1.0 in four days

**I took a hand-made study game for my son's exam to a public, open-source v1.0 in four days (2–5 October 2026), running it as a real project with the Google Project Management method and directing an AI assistant as the development team.** Planned: 14 days and ~112 hours. Actual: 4 days, ~38 hours and €0. *Versión completa en castellano: [caso de estudio](caso-de-estudio.md).*

| | |
| --- | --- |
| **My role** | Sponsor, project manager and product owner: goals, scope, priorities, risk, acceptance of every deliverable |
| **Team** | Claude (Anthropic) as the AI developer, through Claude Code; 3 test families; my son as the reference user |
| **Method** | Hybrid: a waterfall frame (charter, phase gates, change log, closure) with one-day Scrum sprints in Jira |
| **Tools** | Jira (backlog, sprints, story points) · GitHub, GitHub Actions and Pages · Google Forms (family survey) · Obsidian (knowledge base and session handover) |
| **Scope delivered** | 30 user stories, 91 story points, 6 phases, 10 approved change requests |
| **Outcome** | [v1.0.0 released](https://github.com/marcelopereagarcia-sys/Quizasaurus/releases/tag/v1.0.0), [live demo](https://marcelopereagarcia-sys.github.io/Quizasaurus/), all five objectives met · [closing post on LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7512840964365922305/) |

## The problem and the product

Revising for an exam is boring for a child, and families have no time to build activities by hand. A weekend prototype for my son's science exam worked. The question was whether any family could do the same with their own textbook.

**Quizasaurus** turns a school unit (a PDF, photos or pasted text) into learning games and a final boss quiz. An adult reviews every question, and the child plays offline on a tablet or phone. It is free and open source, not a commercial product.

## How the project was run

Every phase ended at a gate with a measurable criterion, approved by the sponsor before the next phase started.

| Phase | Dates | Gate | Evidence |
| --- | --- | --- | --- |
| Initiation | 2–3 Oct | Charter approved | [Project charter](gestion/project-charter.md) (SMART objectives, RACI, risk register, change log) |
| F0 · Generator | 3 Oct | ≥ 90 % correct questions (O1) | [Model comparison](gestion/informe-modelos.md): 98.9 % with Gemini |
| F1 · MVP | 3–4 Oct | Plays offline, 5 game templates (O2) | [Automated audit](gestion/auditoria-o2.md): 108 of 108 levels, 0 errors |
| F2 · Family test | 4 Oct | 2 families complete the cycle unaided (O3); satisfaction ≥ 4/5 (O4) | [Family test report](gestion/informe-prueba-familias.md): 4.67/5 |
| Launch | 5 Oct | Public MIT repository (O5) | [Release v1.0.0](https://github.com/marcelopereagarcia-sys/Quizasaurus/releases/tag/v1.0.0) |
| Closure | 5 Oct | Closure report approved | [Closure and impact report](gestion/informe-cierre.md) · [Retrospective](gestion/retrospectiva.md) |

Daily status reports with a RAG status, points and hours are in [`gestion/estado`](gestion/estado/). Each commit names its Jira story (QZS-xx).

## Five decisions that shaped it

1. **Open source instead of a paid app.** A €1 app would lose money on every heavy user (AI costs per pack) and needed a business structure I did not have; on-device AI did not run on the target tablet. Decision: open source, and each family brings its own AI ([ADR-0001](adr/0001-codigo-abierto-packs-pwa.md)).
2. **Measure before building.** Before any app existed, four AI models were tested on three real school units against a rubric agreed in advance. Local models reached 0–58 %; Gemini reached 98.9 % at €0 per pack. The gate was passed with data, not opinion.
3. **Protect the deadline by moving scope, not dates.** Ten change requests in four days, each logged in the charter. Some cut scope (several worlds per unit went to the community, the family test became unguided); some added it when the evidence justified it (sharing units between devices, age instead of the Spanish school year so it works in any country).
4. **Fix what users hit before moving on.** One of three families needed help getting an AI key, and a child did not finish every level. All three issues were fixed the same day, before the phase gate, which also revealed a design flaw: "Play" always restarted at level 1.
5. **Treat privacy as a real risk.** An AI-run review found my son's name in the public commit history. History was rewritten the same day with my approval, and a pre-commit check for names, keys and private links has run on every commit since.

## How the AI was directed

The AI wrote the code; it did not make the decisions. The rules were written down and checked automatically.

| Practice | How it worked |
| --- | --- |
| **Clear roles (RACI)** | The AI is *responsible* for development, tests, audits and documentation drafts. I *approve* every decision, deliverable and phase gate. The AI never moves a story to Done |
| **Written working agreement** | [`CLAUDE.md`](../CLAUDE.md) holds the rules the AI loads in every session: method, roles, the rules that never break (no copyrighted material, no data about children, no keys, no trademarks, tap instead of type) |
| **Evidence, not promises** | Each story was closed with a Jira comment giving the evidence for every acceptance criterion (tests, measurements, screenshots), so it could be accepted quickly without reading every line of code |
| **Automatic quality gates** | 166 unit tests, plus an audit that plays all 108 levels at phone, tablet and laptop sizes before every deploy. A failed audit blocks publishing |
| **Commit only with permission** | Every commit and push needed my explicit approval, after a privacy and secrets check |
| **Continuity between sessions** | A written handover (state, next steps, decisions, lessons) in the knowledge base let each session pick up without losing context |

## Results against objectives

| # | Objective | Target | Result |
| --- | --- | --- | --- |
| O1 | Valid pack from a scanned unit | ≥ 90 % correct, < 3 min | ✅ 98.9 %, 38–72 s |
| O2 | Offline player | 5 templates, Catalan and Spanish | ✅ 5 templates, 3 languages, 0 audit errors |
| O3 | Full cycle without technical help | 2 of 2 families | ✅ 2 of 3 families; the third needed help with the AI key, fixed the same day |
| O4 | Satisfaction | ≥ 4 / 5 | ✅ 4.67 / 5; 3 of 3 would use it again |
| O5 | Open source and portfolio case | Public repo, docs, 1 LinkedIn post | ✅ Repository, release, [contribution guide](../CONTRIBUTING.md) and [pack format](pack-format.md); [LinkedIn post](https://www.linkedin.com/feed/update/urn:li:activity:7512840964365922305/) |

| | Initial plan | Actual |
| --- | --- | --- |
| Duration | 14 days (5–18 Oct) | 4 days (2–5 Oct) |
| Effort | ~112 h | ~38 h |
| Budget | €50 | €0 |
| Backlog | 12 stories | 30 stories, 91 points |

**Impact, with its limits:** my son passed the exam the prototype was built for, and the three test families would use it again. That is qualitative evidence from a close circle (one pupil, three related families), enough for an open-source MVP and not a claim about learning outcomes.

## Lessons

- **AI speeds up building, not deciding.** The bottleneck moved to what only the PM can do: prioritise, accept and say "that goes to version 2".
- **The hard problems were human:** getting a non-technical family through an AI key, and keeping a child's data out of a public repository.
- **Rules need automatic checks.** A written rule did not stop one privacy slip; an automatic check on every commit did.
- **Honest numbers travel further.** The test sample was small and friendly, and the reports say so.

Full detail, in Spanish: [closure report](gestion/informe-cierre.md) and [retrospective](gestion/retrospectiva.md).

---

## Resumen en castellano

Llevé un juego hecho a mano para el examen de mi hijo hasta una v1.0 pública y de código abierto en cuatro días (del 2 al 5 de octubre de 2026). Lo gestioné como un proyecto real con el método de Google Project Management (charter, puertas por fase, registro de cambios y sprints de un día en Jira), con un asistente de IA (Claude) como equipo de desarrollo. Plan: 14 días y unas 112 horas. Real: 4 días, unas 38 horas y 0 €. Yo decidía y aceptaba cada entrega; la IA programaba y dejaba la evidencia de cada criterio, con comprobaciones automáticas de calidad y privacidad en cada commit. Toda la documentación de gestión está en [`gestion`](gestion/). **Versión completa en castellano: [caso de estudio](caso-de-estudio.md).**
