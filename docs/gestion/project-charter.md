# Project Charter — Quizasaurus

Versión 1.3 · aprobada el 3 de octubre de 2026 · Marcelo Perea García

> Copia exportada del charter aprobado. El original vive en Claude Docs; cualquier cambio de alcance, fechas o presupuesto pasa por el registro de cambios del final.

## Resumen del proyecto

Quizasaurus es una herramienta de código abierto (licencia MIT) que convierte el material de una unidad escolar, en PDF o fotos, en un pack de 5 juegos y un examen final que el niño juega sin conexión. El objetivo es entregarla en 2 semanas, funcionando, probada por 2 familias y documentada como caso de gestión de proyectos con IA.

**Origen.** En octubre de 2026 un alumno de 3º de primaria prepara su examen de Coneixement del Medi (Unitat 1, «Les persones») con un prototipo construido en un fin de semana. El examen es el 5 de octubre; su resultado será el primer dato del informe de impacto. Ese prototipo es el MVP de referencia de este proyecto.

**Problema.** Repasar para un examen suele ser aburrido y las familias no tienen tiempo de preparar actividades. Las herramientas existentes obligan a crear los juegos a mano o dependen de servicios de pago en la nube.

**Solución.** Tres piezas independientes:

1. **Formato de pack abierto** (JSON con esquema): preguntas, tipo de juego, frase de origen, idioma y curso.
2. **Generador**: PDF o fotos → texto (OCR) → pack, con proveedores de IA intercambiables: Ollama en local, Claude, OpenAI o Gemini.
3. **Reproductor**: web instalable (PWA) que funciona sin conexión, con skins temáticas y varios idiomas.

**Por qué código abierto.** No se lanzará al mercado: no hay estructura comercial y el objetivo es portfolio y comunidad. Cada usuario aporta su propio proveedor de IA, así que el proyecto no tiene coste por uso. Los packs se pueden compartir entre familias y docentes.

## Objetivos SMART y métricas de éxito

El proyecto tiene éxito si cumple los 5 objetivos antes del cierre previsto, el 18 de octubre de 2026.

| # | Objetivo SMART | Métrica (KPI) | Meta | Fecha |
| --- | --- | --- | --- | --- |
| O1 | Generar un pack válido a partir de una unidad escaneada de primaria | % de preguntas correctas tras revisión adulta, sobre 3 unidades de prueba | ≥ 90 %, en < 3 min por unidad | 07-oct-2026 |
| O2 | Entregar un reproductor PWA que funcione sin conexión | Plantillas de juego jugables offline en Xiaomi Pad 7 y navegador de escritorio | 5 plantillas, en catalán y castellano | 11-oct-2026 |
| O3 | Probar el ciclo completo con familias reales | Familias que generan, revisan y juegan un pack sin ayuda técnica | 2 de 2 familias | 15-oct-2026 |
| O4 | Medir la satisfacción de la prueba | Valoración media en una encuesta de 5 preguntas | ≥ 4 sobre 5 | 15-oct-2026 |
| O5 | Publicar el proyecto como código abierto y caso de portfolio | Repositorio público MIT con README, guía de contribución y documentación de gestión; caso publicado en LinkedIn | Repo publicado + 3 publicaciones | 18-oct-2026 |

Indicadores secundarios, sin meta fija: estrellas y contribuciones externas en GitHub, packs compartidos por la comunidad y alcance de las publicaciones.

## Alcance

La versión 1.0 cubre el ciclo completo de una familia: subir una unidad, revisar el pack generado y jugarlo sin conexión.

**Dentro del alcance**

- Esquema JSON del pack, versionado y documentado.
- Generador con OCR y al menos 2 proveedores de IA: Ollama (local) y uno en la nube.
- Pantalla de revisión del pack para el adulto, con la frase del libro de la que sale cada pregunta.
- Reproductor PWA offline con 5 plantillas: clasificar, ordenar, situación con opciones, deslizar sí/no y jefe final.
- Identidad visual del prototipo (mundo de bloques con dinos) con 2 skins de color, y 3 idiomas de interfaz (catalán, castellano e inglés; cambio v1.2). Dentro de una unidad, la interfaz va en el idioma del pack (cambio v1.3).
- Progreso guardado en el dispositivo y panel para la familia con los temas a repasar.
- Prueba informal con 2 familias amigas y documentación de gestión del proyecto en el repositorio.

**Fuera del alcance (v1.0)**

- Lanzamiento comercial, piloto formal o app nativa en App Store o Google Play.
- Cuentas de usuario, servidor propio o sincronización entre dispositivos.
- Cobros, suscripciones o cualquier monetización.
- IA en el propio dispositivo (Gemini Nano, Apple Intelligence): queda como línea futura.
- Plantillas con dibujos a medida, como el cuerpo etiquetable del prototipo.
- Idiomas adicionales y skins más allá de las 2 iniciales: abiertos a contribuciones.

## Entregables

Cada entregable se da por cerrado cuando cumple su criterio de aceptación, no cuando se termina de construir.

| Entregable | Criterio de aceptación | Fase |
| --- | --- | --- |
| Project Charter, ADR de arquitectura y registro de riesgos | Aprobados por el sponsor y publicados en `docs/gestion` | Iniciación |
| Esquema del pack v1 | Valida con Zod los packs de las 3 unidades de prueba | F0 |
| Informe comparativo de modelos de IA | Tabla de calidad, tiempo y coste por modelo sobre la misma unidad | F0 |
| Generador (CLI y pantalla web) | Cumple O1 con al menos un proveedor | F1 |
| Reproductor PWA | Cumple O2; pasa la auditoría automática de todas las plantillas sin errores | F1 |
| Informe de la prueba con familias | Observaciones de las 2 sesiones y encuesta de 5 preguntas | F2 |
| Repositorio público v1.0 | README, licencia MIT, guía de contribución y demo en GitHub Pages | Lanzamiento |
| Informe de cierre e informe de impacto | Planificado frente a real, lecciones aprendidas y KPIs O1–O5 | Cierre |

## Partes interesadas y RACI

El sponsor, el project manager y el product owner son la misma persona. El desarrollo lo ejecuta un asistente de IA bajo su dirección, y eso se muestra abiertamente.

| Parte interesada | Rol | Poder | Interés | Estrategia |
| --- | --- | --- | --- | --- |
| Marcelo Perea | Sponsor, PM y product owner | Alto | Alto | Gestionar de cerca |
| Claude (asistente de IA) | Desarrollo, auditoría técnica y redacción de documentación | Bajo | — | Dirigir con ADR, backlog y criterios de aceptación |
| Alumno de referencia (3º de primaria) | Usuario final y probador principal | Bajo | Alto | Mantener informado; sesiones de prueba |
| Familias de prueba (2, amigos) | Prueban el ciclo completo con una unidad propia | Medio | Medio | Sesión guiada de 30 minutos y encuesta corta |
| Docentes del centro | Posibles prescriptores | Bajo | Bajo | Sin acción en v1.0 |
| Reclutadores y empleadores | Destinatarios del caso de portfolio | Alto | Bajo | Mantener satisfechos con resultados claros |
| Editoriales de libros de texto | Titulares de los derechos del material escaneado | Alto | Bajo | Mantener satisfechas: no publicar su contenido |
| Comunidad open source | Futuros contribuidores | Bajo | Medio | Mantener informada tras el lanzamiento |

**RACI** (R = responsable de hacerlo, A = aprueba, C = consultado, I = informado)

| Actividad | Marcelo | Claude (IA) | Familias de prueba | Alumno | Comunidad |
| --- | --- | --- | --- | --- | --- |
| Charter, plan y riesgos | A, R | C | I | — | — |
| Diseño del formato de pack | A | R | — | — | C |
| Desarrollo del generador y el reproductor | A | R | — | — | — |
| Revisión de calidad del contenido generado | A, R | C | R | — | — |
| Pruebas de aceptación (UAT) | A | I | R | R | — |
| Publicación del repositorio y comunicación | A, R | C | I | — | I |
| Informe de cierre e impacto | A, R | C | I | — | I |

## Hitos y calendario

El proyecto dura 2 semanas, del 5 al 18 de octubre de 2026, con sprints de un día y una puerta de aprobación al final de cada fase.

**Hoja de ruta: 6 fases, cada una cerrada por una puerta de aprobación**

| Fase | Fechas | Qué se entrega | Puerta de aprobación |
| --- | --- | --- | --- |
| Iniciación | lun 5 oct | Charter, ADR y registro de riesgos; backlog inicial en Jira | Charter aprobado |
| F0 · Generador | mar 6 – mié 7 oct | Esquema del pack y generador CLI; comparativa de modelos | ≥ 90 % correctas (O1) y coste por pack medido |
| F1 · MVP | jue 8 – dom 11 oct | Reproductor PWA con 5 plantillas; generador con pantalla web | Juega offline en la Xiaomi Pad 7 (O2) |
| F2 · Prueba con familias | lun 12 – jue 15 oct | 2 familias amigas, sesión guiada; observaciones y encuesta corta | 2 de 2 familias (O3); satisfacción ≥ 4 de 5 (O4) |
| Lanzamiento | vie 16 oct | Repositorio público v1.0 y demo; publicación de lanzamiento en LinkedIn | Repo MIT publicado (O5) |
| Cierre | sáb 17 – dom 18 oct | Informe de cierre e impacto; retrospectiva y lecciones aprendidas | Cierre aprobado |

Ninguna fase empieza sin pasar la puerta de la anterior. Si F0 no alcanza el 90 %, se revisa el alcance antes de construir el MVP.

## Presupuesto, recursos y herramientas

El presupuesto monetario es de 50 € como máximo, destinado casi entero al uso de APIs de IA en las pruebas. El recurso principal es el tiempo: unas 8 horas al día durante 14 días, aproximadamente 112 horas.

| Partida | Coste previsto | Notas |
| --- | --- | --- |
| APIs de IA en la nube (pruebas F0 y F1) | 30 € | Tope de gasto configurado en cada proveedor |
| Reserva de contingencia | 20 € | Solo con aprobación del sponsor |
| Modelos locales (Ollama) | 0 € | PC propio con GPU NVIDIA |
| Repositorio, CI y demo (GitHub, GitHub Pages) | 0 € | Plan gratuito |
| Gestión del trabajo (Jira Free) | 0 € | Hasta 10 usuarios |
| Documentación y conocimiento (vault de Obsidian) | 0 € | Ya en uso |
| Dispositivo de pruebas (Xiaomi Pad 7) | 0 € | Ya disponible |

El coste real de generar cada pack se mide en F0 y se publica en el informe comparativo de modelos.

## Riesgos principales

El riesgo más serio es que un modelo pequeño no genere preguntas fiables en catalán; F0 existe para medirlo antes de construir nada más. El registro se revisa en cada sprint.

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- | --- |
| R1 | Los modelos pequeños o locales generan preguntas erróneas, sobre todo en catalán | Alta | Alto | Comparar modelos en F0; revisión adulta obligatoria; proveedor en la nube como alternativa |
| R2 | El OCR falla con escaneos de mala calidad o fotos torcidas | Media | Medio | Guía de captura; opción de pegar el texto; pruebas con 3 unidades reales |
| R3 | Uso indebido de material con derechos de las editoriales | Media | Alto | No publicar escaneos ni packs de libros; demo con contenido propio |
| R4 | Exposición de datos de menores | Baja | Alto | Sin cuentas ni servidor; ningún dato personal en la demo; aviso al usar IA en la nube |
| R5 | Menos tiempo disponible del PM por cambios laborales | Media | Alto | Recortar alcance (skins, idiomas) antes que mover fechas |
| R6 | Las familias de prueba no encuentran hueco esa semana | Media | Medio | Sesión guiada de 30 minutos a su horario; el alumno de referencia como respaldo |
| R7 | Fallos en tablets o navegadores concretos (offline, voz, emojis) | Media | Medio | Auditoría automática; pruebas en Xiaomi Pad 7 y un iPad; la voz es opcional |
| R8 | Cambios en las APIs o condiciones de los proveedores de IA | Baja | Medio | Capa de proveedores intercambiable; Ollama como opción local |
| R9 | El plan de 2 semanas deja poco margen para imprevistos | Alta | Medio | Revisión diaria del avance; el prototipo como base de las plantillas; recortar alcance antes que fechas |

## Supuestos y restricciones

**Supuestos**

- El PM dedica unas 8 horas al día durante las 2 semanas.
- Un modelo de IA, local o en la nube, alcanza el 90 % de preguntas correctas en catalán y castellano.
- Dos familias amigas prueban la herramienta entre el 12 y el 15 de octubre.
- Una PWA cubre la necesidad offline sin publicar en tiendas de apps.

**Restricciones**

- Presupuesto máximo de 50 € y sin ingresos: el proyecto no factura.
- Una sola persona en gestión y producto; el desarrollo depende del asistente de IA.
- Nada de material con derechos de terceros ni datos de menores en el repositorio público.
- Ninguna clave ni credencial en el código: solo un `.env.example`.
- Licencia MIT para todo el código y el esquema del pack.

## Enfoque de gestión y comunicación

El proyecto es híbrido: cascada para el marco y los hitos, Scrum para construir. Es la combinación que recomienda el programa de Google cuando hay requisitos fijos (privacidad, derechos, presupuesto) junto a partes de alta incertidumbre (calidad de la IA, experiencia del niño).

**Cascada (marco)**: charter, ADR, registro de riesgos y plan de comunicación al inicio. Hitos con puerta de aprobación al final de cada fase. Informe de cierre e informe de impacto al final.

**Scrum (construcción)**, en Jira:

- Sprints de un día: objetivo por la mañana, demo y revisión al final del día.
- Backlog de historias de usuario con criterios INVEST y criterios de aceptación.
- Planificación al inicio de cada sprint, revisión con demo y retrospectiva escrita al final.
- Burndown de las 2 semanas e informe de estado diario con semáforo (verde, ámbar o rojo).

**Plan de comunicación**

| Qué | Para quién | Frecuencia | Canal | Dónde queda |
| --- | --- | --- | --- | --- |
| Informe de estado (semáforo) | Sponsor | Diario | Jira + nota en el vault | `docs/gestion/estado` |
| Demo del día | Sponsor y alumno de referencia | Diario en F1 | Sesión en la tablet | Notas de la revisión |
| Seguimiento de la prueba | Familias de prueba | Diario del 12 al 15 de octubre | Grupo de mensajería | Informe de la prueba |
| Decisiones de arquitectura | Comunidad y reclutadores | Cuando se toma una | ADR en el repositorio | `docs/adr` |
| Serie «construyendo en público» | Red profesional | 3 publicaciones: arranque, lanzamiento y cierre | LinkedIn | Enlaces en el README |

## Aprobaciones y control de versiones

El charter entra en vigor cuando el sponsor lo aprueba; desde ese momento, cualquier cambio de alcance, fechas o presupuesto pasa por el registro de cambios.

| Rol | Persona | Estado |
| --- | --- | --- |
| Sponsor y project manager | Marcelo Perea | Aprobado |

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.3 | 03-oct-2026 | Cambio de alcance aprobado por el sponsor tras probar la app: (1) dentro de una unidad y sus juegos, la interfaz va en el idioma del pack, para no mezclar idiomas en pantalla; el selector de idioma solo afecta a la pantalla de inicio; (2) el reproductor recupera la identidad visual del prototipo (bloques y dinos, letra pixelada y Lexend) y las 2 skins pasan a ser variaciones de color de esa identidad |
| 1.2 | 03-oct-2026 | Cambio de alcance aprobado por el sponsor: la interfaz pasa de 2 a 3 idiomas (catalán, castellano e inglés), porque el repositorio está en inglés. Más idiomas, solo como contribuciones |
| 1.1 | 03-oct-2026 | Cambio de alcance aprobado por el sponsor: O5 pasa de 3 publicaciones en LinkedIn a 1 publicación final, en el cierre. Se descarta la de arranque (QZS-10) |
| 1.0 | 03-oct-2026 | Aprobado por el sponsor; dedicación fijada en ~8 h/día (112 h en total). Sprint 1 iniciado |
| 0.2 | 02-oct-2026 | Plan comprimido a 2 semanas; prueba informal con 2 familias en lugar de piloto; sin lanzamiento al mercado |
| 0.1 | 02-oct-2026 | Primer borrador del charter |
