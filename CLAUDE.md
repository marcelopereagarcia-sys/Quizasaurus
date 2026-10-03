# Quizasaurus — contexto para agentes de IA

Este archivo se carga automáticamente cuando un agente (Claude Code u otro) trabaja en este repositorio. Idioma de trabajo: **español** (el README va en inglés).

## Qué es

Herramienta de código abierto (MIT) que convierte una unidad escolar (PDF o fotos) en un pack de 5 juegos y un jefe final que el niño juega sin conexión. Además es un **caso público de gestión de proyectos con IA**: el proceso de gestión forma parte del producto.

## Reparto de roles (RACI)

- **Marcelo Perea**: sponsor, project manager y product owner. **Aprueba (A)** todo: decisiones, entregables y el paso a "Listo".
- **El agente de IA**: **ejecuta (R)** desarrollo, pruebas, auditorías y borradores de documentación.
- El agente **nunca** marca una incidencia como "Listo" ni aprueba una puerta de fase: deja la evidencia y la pasa a "En curso" para que el PM la acepte.

## Método

Híbrido según el certificado Google Project Management:
- **Cascada** para el marco: charter, ADR, registro de riesgos, hitos con puertas de aprobación, informe de cierre e impacto.
- **Scrum** para construir: sprints de un día en Jira (proyecto **QZS**), historias INVEST con criterios de aceptación y puntos de historia.
- Plan: 2 semanas, del 5 al 18 de octubre de 2026. Fases y puertas en [`docs/gestion/README.md`](docs/gestion/README.md).

### Al trabajar una incidencia de Jira
1. Leer la historia y sus criterios de aceptación antes de empezar.
2. Comentar con el prefijo **"Hecho por Claude (IA)."** y la evidencia de cada criterio (el conector firma con la cuenta del PM).
3. Pasar a "En curso" y dejar la aceptación al PM.

## Arquitectura (ver [`docs/adr`](docs/adr/))

1. Plantillas de juego fijas; **la IA solo genera contenido** (pack JSON validado con Zod), nunca código de juego.
2. Formato de pack abierto y versionado: preguntas, tipo de juego, frase de origen, tema, idioma y curso.
3. Proveedores de IA intercambiables (Ollama, Claude, OpenAI, Gemini), configurados solo por `.env`.
4. Reproductor PWA offline. Revisión adulta obligatoria antes de jugar.

## Reglas que no se rompen

- **Nada de material con derechos** en el repositorio: escaneos de libros y packs generados a partir de ellos van en `private/` (ignorado por git).
- **Ningún dato de menores** (nombres, fotos, respuestas) en código, ejemplos, demo ni commits.
- **Ninguna clave** en el código: solo `.env.example`.
- **Ninguna marca registrada** (Minecraft, Roblox…) en skins ni nombres.
- Para niños de primaria: tocar y arrastrar, no escribir; la respuesta correcta nunca fija en la misma posición.
- Antes de cada entrega, **auditoría automática**: partida completa acertando y fallando, 375 px y 768 px, 0 errores de JavaScript.

## Git

- Commits solo cuando el PM lo pide.
- Antes de un push, comprobar que no se suben secretos, PDF ni datos personales.
