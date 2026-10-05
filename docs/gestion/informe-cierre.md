# Informe de cierre e impacto

**Quizasaurus 1.0 se entregó el 5 de octubre de 2026, 3 días antes del plan revisado y 13 antes del inicial, con unas 38 horas de trabajo frente a las 112 previstas y 0 € de gasto.** Cumple 4 de los 5 objetivos y el quinto (O5) está a falta de la publicación en LinkedIn. El alumno de referencia aprobó el examen para el que nació el prototipo.

- **Fecha del informe:** 5 de octubre de 2026 (Cierre adelantado en la v1.10 del charter)
- **Versión publicada:** [v1.0.0](https://github.com/marcelopereagarcia-sys/Quizasaurus/releases/tag/v1.0.0) · demo: [marcelopereagarcia-sys.github.io/Quizasaurus](https://marcelopereagarcia-sys.github.io/Quizasaurus/)
- **Puerta de Cierre:** pendiente de la aprobación del sponsor
- Retrospectiva y lecciones aprendidas: [retrospectiva.md](retrospectiva.md)

## Objetivos O1–O5

| # | Objetivo | Meta | Resultado | Estado |
| --- | --- | --- | --- | --- |
| O1 | Generar un pack válido a partir de una unidad escaneada | ≥ 90 % de preguntas correctas, < 3 min por unidad | 98,9 % (86 de 87) con Gemini en 3 unidades reales; 38–72 s por unidad ([informe de modelos](informe-modelos.md)) | ✅ 3 oct |
| O2 | Reproductor PWA que funcione sin conexión | 5 plantillas jugables offline, en catalán y castellano | 5 plantillas en 3 idiomas; la auditoría juega 108 de 108 niveles a 375, 768 y 1440 px y sin conexión, con 0 errores ([auditoría](auditoria-o2.md)) | ✅ 4 oct |
| O3 | Ciclo completo con familias reales, sin ayuda técnica | 2 de 2 familias | Probaron 3 familias; 2 completaron el ciclo sin ayuda y la tercera necesitó ayuda con la clave de la IA ([informe de la prueba](informe-prueba-familias.md)) | ✅ con incidencia, corregida el 4 oct (QZS-27) |
| O4 | Satisfacción de la prueba | ≥ 4 sobre 5 | 4,67 sobre 5 | ✅ 4 oct |
| O5 | Código abierto y caso de portfolio | Repositorio MIT con README, guía de contribución y documentación de gestión + 1 publicación en LinkedIn | Repositorio, [README](../../README.md), [guía de contribución](../../CONTRIBUTING.md), [formato del pack](../pack-format.md), documentación de gestión y *release* v1.0 publicados | 🟡 Falta la publicación en LinkedIn (QZS-40), antes del 8 oct |

## Planificado frente a real

| Dimensión | Plan inicial (v1.0) | Plan revisado (v1.6) | Real |
| --- | --- | --- | --- |
| Fechas | 5–18 oct (14 días) | 2–8 oct (7 días) | 2–5 oct (4 días) |
| Horas del PM | ~112 h (8 h × 14 días) | ~56 h (7 días × 8 h) | ~38 h (10 + 10 + 10 + 8, estimación del PM) |
| Presupuesto | 50 € | 50 € | 0 €: Gemini en su nivel gratuito, modelos locales y herramientas en plan gratuito |
| Alcance | 5 objetivos, 6 fases | Igual | Igual, con 10 cambios aprobados (v1.1–v1.10) |
| Backlog | Historias de F0 y F1 | 25 historias y 84 puntos (v1.8) | 30 historias y 91 puntos (87 aceptados antes de Cierre) |

**Por qué fue más rápido.** El desarrollo lo ejecutó un asistente de IA bajo la dirección del PM, con sprints de un día y la puerta de cada fase aprobada en cuanto se cumplía su criterio. El prototipo hecho a mano sirvió de referencia visual y de prueba de que el producto tenía sentido, lo que evitó rediseños.

### Fases

| Fase | Plan inicial | Real | Puerta |
| --- | --- | --- | --- |
| Iniciación | 5 oct | 2–3 oct | ✅ 3 oct: charter aprobado |
| F0 · Generador | 6–7 oct | 3 oct | ✅ 3 oct: O1, 98,9 % |
| F1 · MVP | 8–11 oct | 3–4 oct | ✅ 4 oct: O2 |
| F2 · Prueba con familias | 12–15 oct | 4 oct | ✅ 4 oct, con una incidencia: O3 2 de 3, O4 4,67 |
| Lanzamiento | 16 oct | 5 oct | ✅ 5 oct: *release* v1.0 |
| Cierre | 17–18 oct | 5 oct | Pendiente del sponsor |

### Puntos aceptados por día

| Día | Puntos | Acumulado | Qué se cerró |
| --- | --- | --- | --- |
| 3 oct | 42 | 42 | F0 completa y la base de F1 (QZS-11 a 17 y 19) |
| 4 oct | 34 | 76 | Resto de F1, F2 y sus correcciones (QZS-18, 20 a 27, 32 a 35) |
| 5 oct | 11 | 87 | Lanzamiento (QZS-28 a 31, 36 y 37) |

Cierre suma 4 puntos más (QZS-38, 39 y 40). Fechas tomadas de Jira.

### Cambios de alcance

Diez cambios en cuatro días, todos aprobados por el sponsor y registrados en el [charter](project-charter.md). Ninguno movió la fecha de fin hacia atrás.

| Versión | Tipo | Cambio |
| --- | --- | --- |
| 1.1 | Alcance | 1 publicación en LinkedIn, en el cierre, en lugar de 3 |
| 1.2 | Alcance | 3 idiomas de interfaz (se añade el inglés) |
| 1.3 | Alcance | Identidad visual del prototipo; la unidad habla el idioma del pack |
| 1.4 | Alcance | Varios mundos por unidad, a la comunidad |
| 1.5 | Alcance | Prueba con familias sin sesión guiada, con encuesta |
| 1.6 | Plazo | Fin adelantado del 18 al 8 de octubre |
| 1.7 | Alcance | Lanzamiento con 3 mejoras: compartir packs, la clave de la IA y pegar el texto |
| 1.8 | Alcance | Las 3 incidencias de F2 se corrigen antes de cambiar de fase; portada y «Compartir» a la vista |
| 1.9 | Alcance | La portada explica la app; edad en lugar del curso español |
| 1.10 | Plazo | Cierre adelantado al 5 de octubre |

## Impacto

| Indicador | Resultado | Límites |
| --- | --- | --- |
| Examen del alumno de referencia (5 oct) | **Aprobado** («bien», según la familia) | Un solo alumno; no se puede separar el efecto del juego del resto del estudio |
| Las familias lo volverían a usar para un examen | 3 de 3 (5 sobre 5) | Familiares del PM; probablemente amables al puntuar |
| A los niños les gustó jugar | 3 de 3 (5 sobre 5) | Muestra pequeña: 3 familias |
| Preguntas correctas generadas por la IA | 98,9 % en 3 unidades reales | Revisado con una rúbrica por el PM, no por un docente |
| Calidad técnica | 166 tests; auditoría de 108 niveles con 0 problemas de diseño y 0 errores en cada despliegue | Navegador sin ventana; las tablets reales solo las probó el sponsor |
| Comunidad (indicadores sin meta) | 0 estrellas, 0 *forks* y 0 contribuciones el día del lanzamiento | Se publicó hoy: medir de nuevo en un mes |

**Lectura:** el producto resuelve el problema de partida (preparar un examen jugando, con el material propio y sin que la familia cree las actividades a mano) y las familias que lo probaron lo volverían a usar. La evidencia es cualitativa y de un entorno cercano: es suficiente para un MVP de código abierto, no para afirmar una mejora en el aprendizaje.

## Entregables

| Entregable | Criterio de aceptación | Estado |
| --- | --- | --- |
| Charter, ADR y registro de riesgos | Aprobados y publicados | ✅ Charter v1.10 · [3 ADR](../adr/) |
| Esquema del pack v1 | Valida los packs de las 3 unidades de prueba | ✅ Además, [documentado](../pack-format.md) con un test que lo compara con el esquema |
| Informe comparativo de modelos | Calidad, tiempo y coste por modelo | ✅ [informe-modelos.md](informe-modelos.md) |
| Generador (CLI y web) | Cumple O1 | ✅ Desde PDF, fotos o texto pegado; 4 proveedores |
| Reproductor PWA | Cumple O2 y pasa la auditoría | ✅ [auditoria-o2.md](auditoria-o2.md) |
| Informe de la prueba con familias | Observaciones y encuesta | ✅ [informe-prueba-familias.md](informe-prueba-familias.md) |
| Repositorio público v1.0 | README, MIT, guía de contribución y demo | ✅ *Release* v1.0.0 |
| Informe de cierre e impacto | Plan frente a real, lecciones y KPIs | ✅ Este documento y la [retrospectiva](retrospectiva.md), pendientes de aprobación |

## Riesgos: qué pasó

| ID | Riesgo | ¿Se dio? | Cómo se trató |
| --- | --- | --- | --- |
| R1 | La IA genera preguntas erróneas | Sí, con modelos locales (0–58 %) | Gemini en la nube (98,9 %) y revisión adulta obligatoria |
| R2 | El OCR falla con escaneos malos | No en las pruebas | Lectura con un modelo de visión local y opción de pegar el texto (QZS-28) |
| R3 | Material con derechos | No | Escaneos y packs reales solo en `private/`; demo con un tema propio |
| R4 | Datos de menores | **Sí:** un nombre quedó en el historial público (3 oct) | Detectado por la auditoría de QZS-17; historial reescrito el mismo día con permiso del sponsor; comprobación previa en cada commit desde entonces |
| R5 | Menos tiempo del PM | No | — |
| R6 | Las familias no encuentran hueco | No | Prueba sin cita, en casa |
| R7 | Fallos en tablets o navegadores | Parcial: deslizar ensanchaba la página en el móvil | Encontrado y corregido por la auditoría automática |
| R8 | Cambios en los proveedores de IA | **Sí:** las claves nuevas de Gemini empiezan por «AQ.» y el nivel gratuito se satura a ratos | Aviso de formato que acepta las dos formas; reintentos de hasta ~90 s |
| R9 | Plan comprimido sin margen | No | Revisión diaria; el trabajo se adelantó en lugar de retrasarse |

## Lo que queda abierto

- **Publicación en LinkedIn (QZS-40):** el PM la revisa y la publica desde su cuenta; su enlace se añadirá aquí.
- **Mejoras para la comunidad:** las 6 de la [guía de contribución](../../CONTRIBUTING.md), entre ellas varios mundos por unidad y una revisión todavía más corta.
- **Medir la comunidad en un mes** (estrellas, *forks*, packs compartidos) y, si se usa en más exámenes, recoger más resultados.
- **Higiene del repositorio:** pedir a GitHub que purgue de su caché los commits anteriores a la reescritura del historial.
