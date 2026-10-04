# Gestión del proyecto

Quizasaurus se gestiona con el método del certificado Google Project Management, en modo híbrido: cascada para el marco (charter, hitos y puertas de aprobación) y Scrum para construir (sprints de un día en Jira). Todo lo que se produce queda aquí.

## Plan: del 2 al 8 de octubre de 2026

El plan inicial era de 2 semanas (5–18 oct). Como las fases avanzaron más rápido, en la v1.6 del charter se adelantaron las fechas.

| Fase | Fechas | Puerta de aprobación | Estado |
| --- | --- | --- | --- |
| Iniciación | vie 2 – sáb 3 oct | Charter aprobado | ✅ 3 oct |
| F0 · Generador | sáb 3 oct | ≥ 90 % de preguntas correctas (O1) y coste por pack medido | ✅ 3 oct (98,9 %) |
| F1 · MVP | sáb 3 – dom 4 oct | Se juega offline en una tablet Android de gama media (O2) | ✅ 4 oct |
| F2 · Prueba con familias | dom 4 oct | 2 de 2 familias completan el ciclo (O3); satisfacción ≥ 4 de 5 (O4) | ✅ 4 oct, con una incidencia (O4: 4,67; O3: 2 de 3) |
| Lanzamiento | lun 5 – mar 6 oct | Repositorio MIT publicado (O5) | — |
| Cierre | mié 7 – jue 8 oct | Informe de cierre e impacto aprobados; publicación final en LinkedIn | — |

## Artefactos

| Artefacto | Estado | Archivo |
| --- | --- | --- |
| Project Charter (objetivos SMART, alcance, RACI, riesgos) | Aprobado (v1.7, 4 oct) | [`project-charter.md`](project-charter.md) |
| Decisiones de arquitectura (ADR) | 1 aceptada | [`../adr`](../adr/) |
| Informes de estado diarios (semáforo) | Al día (2–4 oct) | [`estado/`](estado/) |
| Rúbrica de «pregunta correcta» | Aprobada (3 oct) | [`rubrica-pregunta-correcta.md`](rubrica-pregunta-correcta.md) |
| Informe comparativo de modelos de IA (puerta O1) | Puerta O1 aprobada (3 oct) | [`informe-modelos.md`](informe-modelos.md) |
| Auditoría automática del reproductor (puerta O2), con `npm run audit` | Superada; puerta O2 aprobada (4 oct) | [`auditoria-o2.md`](auditoria-o2.md) |
| Kit de la prueba con familias: mensaje, encuesta y registro | Usado (4 oct) | [`prueba-familias.md`](prueba-familias.md) |
| Informe de la prueba con familias (puerta F2) | Puerta F2 aprobada con una incidencia (4 oct) | [`informe-prueba-familias.md`](informe-prueba-familias.md) |
| Informe de cierre e informe de impacto | Cierre | Pendiente |
