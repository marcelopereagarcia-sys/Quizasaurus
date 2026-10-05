# Gestión del proyecto

Quizasaurus se gestiona con el método del certificado Google Project Management, en modo híbrido: cascada para el marco (charter, hitos y puertas de aprobación) y Scrum para construir (sprints de un día en Jira). Todo lo que se produce queda aquí.

## Plan: del 2 al 8 de octubre de 2026 · real: del 2 al 5

El plan inicial era de 2 semanas (5–18 oct). Como las fases avanzaron más rápido, en la v1.6 del charter se adelantaron las fechas al 2–8 de octubre, y en la v1.10 el Cierre al 5. Resultado: [informe de cierre](informe-cierre.md).

| Fase | Fechas | Puerta de aprobación | Estado |
| --- | --- | --- | --- |
| Iniciación | vie 2 – sáb 3 oct | Charter aprobado | ✅ 3 oct |
| F0 · Generador | sáb 3 oct | ≥ 90 % de preguntas correctas (O1) y coste por pack medido | ✅ 3 oct (98,9 %) |
| F1 · MVP | sáb 3 – dom 4 oct | Se juega offline en una tablet Android de gama media (O2) | ✅ 4 oct |
| F2 · Prueba con familias | dom 4 oct | 2 de 2 familias completan el ciclo (O3); satisfacción ≥ 4 de 5 (O4) | ✅ 4 oct, con una incidencia (O4: 4,67; O3: 2 de 3) |
| Lanzamiento | lun 5 oct | Repositorio MIT publicado (O5) | ✅ 5 oct (*release* v1.0) |
| Cierre | lun 5 oct (v1.10) | Informe de cierre e impacto aprobados; publicación final en LinkedIn | Pendiente del sponsor |

## Artefactos

| Artefacto | Estado | Archivo |
| --- | --- | --- |
| Project Charter (objetivos SMART, alcance, RACI, riesgos) | Aprobado (v1.10, 5 oct) | [`project-charter.md`](project-charter.md) |
| Decisiones de arquitectura (ADR) | 3 aceptadas | [`../adr`](../adr/) |
| Informes de estado diarios (semáforo) | Al día (2–5 oct) | [`estado/`](estado/) |
| Rúbrica de «pregunta correcta» | Aprobada (3 oct) | [`rubrica-pregunta-correcta.md`](rubrica-pregunta-correcta.md) |
| Informe comparativo de modelos de IA (puerta O1) | Puerta O1 aprobada (3 oct) | [`informe-modelos.md`](informe-modelos.md) |
| Auditoría automática del reproductor (puerta O2), con `npm run audit` | Superada; puerta O2 aprobada (4 oct) | [`auditoria-o2.md`](auditoria-o2.md) |
| Kit de la prueba con familias: mensaje, encuesta y registro | Usado (4 oct) | [`prueba-familias.md`](prueba-familias.md) |
| Informe de la prueba con familias (puerta F2) | Puerta F2 aprobada con una incidencia (4 oct) | [`informe-prueba-familias.md`](informe-prueba-familias.md) |
| Formato del pack y guía de contribución | Publicados (5 oct) | [`../pack-format.md`](../pack-format.md) · [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) |
| Informe de cierre e impacto | Pendiente de aprobación | [`informe-cierre.md`](informe-cierre.md) |
| Retrospectiva y lecciones aprendidas | Pendiente de aprobación | [`retrospectiva.md`](retrospectiva.md) |
