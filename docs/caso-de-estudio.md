# Caso de estudio: gestionar un producto construido con IA, del prototipo a la v1.0 en cuatro días

**Llevé un juego hecho a mano para el examen de mi hijo hasta una v1.0 pública y de código abierto en cuatro días (del 2 al 5 de octubre de 2026). Lo gestioné como un proyecto real con el método de Google Project Management y con un asistente de IA como equipo de desarrollo.** Plan: 14 días y unas 112 horas. Real: 4 días, unas 38 horas y 0 €. *English version: [case study](case-study.md).*

| | |
| --- | --- |
| **Mi rol** | Sponsor, project manager y product owner: objetivos, alcance, prioridades, riesgos y aceptación de cada entrega |
| **Equipo** | Claude (Anthropic) como desarrollador, a través de Claude Code; 3 familias de prueba; mi hijo como usuario de referencia |
| **Método** | Híbrido: cascada para el marco (charter, puertas por fase, registro de cambios y cierre) y Scrum con sprints de un día en Jira |
| **Herramientas** | Jira (backlog, sprints y puntos de historia) · GitHub, GitHub Actions y Pages · Google Forms (encuesta a las familias) · Obsidian (base de conocimiento y traspaso entre sesiones) |
| **Alcance entregado** | 30 historias de usuario, 91 puntos, 6 fases y 10 cambios aprobados |
| **Resultado** | [*Release* v1.0.0](https://github.com/marcelopereagarcia-sys/Quizasaurus/releases/tag/v1.0.0), [demo en vivo](https://marcelopereagarcia-sys.github.io/Quizasaurus/), los cinco objetivos cumplidos · [publicación de cierre en LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7512840964365922305/) |

## El problema y el producto

Repasar para un examen aburre a un niño, y las familias no tienen tiempo de preparar actividades a mano. Un prototipo hecho en un fin de semana para el examen de Medi de mi hijo funcionó. La pregunta era si cualquier familia podría hacer lo mismo con su propio libro.

**Quizasaurus** convierte un tema del colegio (un PDF, fotos o el texto pegado) en juegos y un reto final. Un adulto revisa cada pregunta y el niño juega sin conexión en la tablet o el móvil. Es gratuito y de código abierto, no un producto comercial.

## Cómo se gestionó

Cada fase terminaba en una puerta con un criterio medible, que el sponsor aprobaba antes de empezar la siguiente.

| Fase | Fechas | Puerta | Evidencia |
| --- | --- | --- | --- |
| Iniciación | 2–3 oct | Charter aprobado | [Project charter](gestion/project-charter.md) (objetivos SMART, RACI, registro de riesgos y de cambios) |
| F0 · Generador | 3 oct | ≥ 90 % de preguntas correctas (O1) | [Comparativa de modelos](gestion/informe-modelos.md): 98,9 % con Gemini |
| F1 · MVP | 3–4 oct | Se juega sin conexión, 5 plantillas de juego (O2) | [Auditoría automática](gestion/auditoria-o2.md): 108 de 108 niveles, 0 errores |
| F2 · Prueba con familias | 4 oct | 2 familias completan el ciclo sin ayuda (O3); satisfacción ≥ 4/5 (O4) | [Informe de la prueba](gestion/informe-prueba-familias.md): 4,67/5 |
| Lanzamiento | 5 oct | Repositorio MIT público (O5) | [*Release* v1.0.0](https://github.com/marcelopereagarcia-sys/Quizasaurus/releases/tag/v1.0.0) |
| Cierre | 5 oct | Informe de cierre aprobado | [Informe de cierre e impacto](gestion/informe-cierre.md) · [Retrospectiva](gestion/retrospectiva.md) |

Los informes de estado diarios, con semáforo, puntos y horas, están en [`gestion/estado`](gestion/estado/). Cada commit cita su historia de Jira (QZS-xx).

## Cinco decisiones que lo marcaron

1. **Código abierto en lugar de una app de pago.** Una app de 1 € perdería dinero con cada usuario intensivo (la IA cuesta por pack) y exigía una estructura comercial que no tenía; la IA dentro del dispositivo no funcionaba en la tablet de referencia. Decisión: código abierto, y cada familia usa su propia IA ([ADR-0001](adr/0001-codigo-abierto-packs-pwa.md)).
2. **Medir antes de construir.** Antes de que existiera la app, se probaron cuatro modelos de IA con tres temas reales del colegio y una rúbrica acordada de antemano. Los modelos locales se quedaron entre el 0 y el 58 %; Gemini llegó al 98,9 %, a 0 € por pack. La puerta se pasó con datos, no con opiniones.
3. **Proteger la fecha moviendo el alcance, no las fechas.** Diez cambios en cuatro días, cada uno registrado en el charter. Algunos recortaron alcance (los varios mundos por unidad pasaron a la comunidad, la prueba con familias dejó de ser guiada); otros lo ampliaron cuando la evidencia lo justificaba (compartir unidades entre aparatos, y la edad en lugar del curso español para que sirva en cualquier país).
4. **Corregir lo que encontraron los usuarios antes de avanzar.** Una de las tres familias necesitó ayuda para conseguir la clave de la IA, y un niño no terminó todos los niveles. Las tres incidencias se corrigieron el mismo día, antes de la puerta de fase, y al hacerlo apareció un defecto de diseño: «Jugar» empezaba siempre por el nivel 1.
5. **Tratar la privacidad como un riesgo real.** Una revisión hecha con IA encontró el nombre de mi hijo en el historial público de commits. El historial se reescribió el mismo día, con mi aprobación, y desde entonces cada commit pasa una comprobación de nombres, claves y enlaces privados.

## Cómo se dirigió a la IA

La IA escribía el código, pero no tomaba las decisiones. Las reglas estaban por escrito y se comprobaban de forma automática.

| Práctica | Cómo funcionó |
| --- | --- |
| **Roles claros (RACI)** | La IA es *responsable* del desarrollo, las pruebas, las auditorías y los borradores de documentación. Yo *apruebo* cada decisión, entrega y puerta de fase. La IA nunca pasa una historia a «Listo» |
| **Acuerdo de trabajo por escrito** | [`CLAUDE.md`](../CLAUDE.md) recoge las reglas que la IA carga en cada sesión: el método, los roles y las reglas que no se rompen (nada de material con derechos, ningún dato de menores, ninguna clave, ninguna marca registrada, tocar en vez de escribir) |
| **Evidencia, no promesas** | Cada historia se cerraba con un comentario en Jira con la evidencia de cada criterio de aceptación (tests, medidas, capturas), así que podía aceptarse rápido sin revisar cada línea de código |
| **Puertas de calidad automáticas** | 166 tests unitarios y una auditoría que juega los 108 niveles a tamaño de móvil, tablet y portátil antes de cada despliegue. Si la auditoría falla, no se publica |
| **Commits solo con permiso** | Cada commit y cada push necesitaban mi aprobación expresa, después de una comprobación de privacidad y de claves |
| **Continuidad entre sesiones** | Un traspaso escrito (estado, siguientes pasos, decisiones y lecciones) en la base de conocimiento permitía retomar cada sesión sin perder el contexto |

## Resultados frente a los objetivos

| # | Objetivo | Meta | Resultado |
| --- | --- | --- | --- |
| O1 | Pack válido a partir de un tema escaneado | ≥ 90 % correctas, < 3 min | ✅ 98,9 %, 38–72 s |
| O2 | Reproductor sin conexión | 5 plantillas, en catalán y castellano | ✅ 5 plantillas, 3 idiomas, 0 errores en la auditoría |
| O3 | Ciclo completo sin ayuda técnica | 2 de 2 familias | ✅ 2 de 3 familias; la tercera necesitó ayuda con la clave de la IA, corregido el mismo día |
| O4 | Satisfacción | ≥ 4 / 5 | ✅ 4,67 / 5; las 3 lo volverían a usar |
| O5 | Código abierto y caso de portfolio | Repo público, documentación y 1 publicación en LinkedIn | ✅ Repositorio, *release*, [guía de contribución](../CONTRIBUTING.md) y [formato del pack](pack-format.md); [publicación en LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7512840964365922305/) |

| | Plan inicial | Real |
| --- | --- | --- |
| Duración | 14 días (5–18 oct) | 4 días (2–5 oct) |
| Esfuerzo | ~112 h | ~38 h |
| Presupuesto | 50 € | 0 € |
| Backlog | 12 historias | 30 historias, 91 puntos |

**Impacto, con sus límites:** mi hijo aprobó el examen para el que se hizo el prototipo, y las tres familias de prueba lo volverían a usar. Es una evidencia cualitativa y de un entorno cercano (un alumno y tres familias conocidas): suficiente para un MVP de código abierto, no para afirmar una mejora del aprendizaje.

## Lecciones

- **La IA acelera la construcción, no las decisiones.** El cuello de botella pasó a lo que solo puede hacer el PM: priorizar, aceptar y decir «eso, para la versión 2».
- **Los problemas difíciles fueron humanos:** que una familia sin perfil técnico consiguiera una clave de IA, y que ningún dato de un menor llegara a un repositorio público.
- **Las reglas necesitan comprobaciones automáticas.** Una regla escrita no evitó un descuido de privacidad; una comprobación automática en cada commit, sí.
- **Los números honestos llegan más lejos.** La muestra de la prueba fue pequeña y cercana, y los informes lo dicen.

Todo el detalle: [informe de cierre](gestion/informe-cierre.md) y [retrospectiva](gestion/retrospectiva.md).
