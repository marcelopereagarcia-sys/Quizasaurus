# 🦖 Quizasaurus

**Turn any lesson into games, with the AI you choose.**

Quizasaurus turns a school unit (a PDF or photos of the textbook) into a pack of 5 learning games and a final "boss" quiz that kids play offline on a tablet. Open source, no accounts, no ads.

> 🚧 **Status: in development.** Two-week build, 5–18 October 2026. Follow the plan in [`docs/gestion`](docs/gestion/).

---

## Why

It started as a weekend prototype to help my son, in 3rd grade, prepare a science exam: three play sessions, six levels, a dinosaur collection and a T-Rex boss. Quizasaurus turns that one-off into a tool any family or teacher can use with their own material.

## How it works

```text
PDF / photos ──> OCR ──> Generator ──> Pack (JSON) ──> Adult review ──> Offline player (PWA)
                          your AI: Ollama · Claude · OpenAI · Gemini
```

1. **The AI only writes content, never game code.** Games are fixed, tested templates; the AI fills them with questions validated against a schema.
2. **Open pack format.** A pack holds the questions, the game type, the source sentence from the book, language and grade. Packs can be shared.
3. **Bring your own AI.** Run a local model with Ollama for free, or use your own API key. The project has no servers and no per-use cost.
4. **An adult reviews every pack** before a child plays it, with the source sentence shown next to each question.
5. **Offline player.** Installs from the browser on any tablet and works without internet.

## A public case study in AI-assisted project management

This repository is also a portfolio piece. It is run with the Google Project Management method (hybrid: a waterfall frame and daily Scrum sprints in Jira), and every artifact is public:

| Artifact | Where |
| --- | --- |
| Project charter, risk register, status reports | [`docs/gestion`](docs/gestion/) |
| Architecture decision records | [`docs/adr`](docs/adr/) |

**How it is built:** Marcelo Perea is the project manager and product owner: he sets the goals, makes the decisions and accepts the work. Development, testing and documentation drafts are done with [Claude](https://claude.com/claude-code) as an AI assistant. That split is intentional, and documented.

## Privacy and content rules

- No accounts, no tracking, no data about children leaves the device.
- Textbook scans and packs made from copyrighted books are never committed to this repository.
- No trademarks in themes or names.

---

## En español

**Quizasaurus convierte una unidad escolar (PDF o fotos) en 5 juegos y un examen final que el niño juega sin conexión.** Es código abierto (MIT), funciona con la IA que elijas (Ollama en local, Claude, OpenAI o Gemini) y no tiene cuentas ni anuncios. Nació de un prototipo hecho en un fin de semana para el examen de Medi de mi hijo, en 3º de primaria. La documentación de gestión del proyecto está en [`docs/gestion`](docs/gestion/).

## License

[MIT](LICENSE) © 2026 Marcelo Perea García
