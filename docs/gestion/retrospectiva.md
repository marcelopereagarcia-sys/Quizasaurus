# Retrospectiva y lecciones aprendidas

**La combinación que funcionó: el PM decide y acepta, un asistente de IA construye, y cada entrega pasa una comprobación automática antes de que nadie la vea.** Lo que más costó no fue el código, sino lo que toca a personas: la clave de la IA para una familia no técnica, la privacidad de un menor en un repositorio público y saber cuándo parar de añadir alcance.

- **Fecha:** 5 de octubre de 2026, al cerrar el proyecto (2–5 oct)
- **Participantes:** Marcelo Perea (sponsor, PM y product owner) y Claude (asistente de IA, desarrollo)
- Datos del proyecto: [informe de cierre](informe-cierre.md)

## Qué funcionó

| Qué | Ejemplo en el proyecto |
| --- | --- |
| **Un prototipo real antes del plan** | El juego hecho a mano para un examen de verdad fijó el producto, el aspecto y las lecciones de uso (tocar en vez de escribir, la respuesta nunca en el mismo sitio) antes de escribir el charter |
| **Puertas con un número, medido antes de construir** | F0 midió 4 modelos con una rúbrica aprobada de antemano. Los modelos locales se descartaron con datos (0–58 %) en lugar de descubrirlo con las familias |
| **Roles claros con la IA (RACI)** | El asistente ejecuta y deja la evidencia de cada criterio en Jira; solo el PM pasa una historia a «Listo» y aprueba fases. Nunca hubo dudas sobre quién decidía |
| **Calidad automática en cada despliegue** | La auditoría juega 108 niveles a 3 tamaños en cada push. Encontró defectos reales (una página que se ensanchaba en el móvil, palabras que se salían) que una revisión a ojo no vio |
| **Registro de cambios disciplinado** | 10 cambios de alcance y plazo en 4 días, cada uno con su fila en el charter y su historia en Jira. El proyecto cambió mucho sin perder la trazabilidad |
| **Corregir las incidencias de la prueba antes de cambiar de fase** | Las 3 incidencias de F2 se corrigieron el mismo día; al revisar una apareció un defecto de diseño («Jugar» empezaba siempre por el nivel 1) |
| **Informe de estado diario** | Obligó a mirar puntos, horas y riesgos cada día, y dejó el material para este cierre |

## Qué no funcionó

| Qué | Ejemplo | Consecuencia |
| --- | --- | --- |
| **Un dato de un menor llegó al historial público** | El nombre del alumno de referencia quedó en un commit de F0 | Hubo que reescribir el historial publicado. Desde entonces, cada commit pasa una búsqueda de nombres, claves y enlaces privados |
| **Las instrucciones de terceros envejecen rápido** | Conseguir la clave de Gemini fue lo más difícil para una familia. Al revisarlo, la documentación oficial mostró que las claves nuevas empiezan por «AQ.» y no por «AIza», como se daba por hecho | Una familia necesitó ayuda. Hay que comprobar en la documentación oficial, no de memoria, y no validar una sola forma |
| **Algunas cosas se colocaron donde el usuario no mira** | «Compartir» estaba dentro de un panel plegado y el sponsor no lo encontró | Se movió a la vista. Si el usuario no lo encuentra, está mal colocado |
| **Afirmaciones que no se comprobaron** | El README prometía «5 juegos» y la IA prepara 4 más el reto final | Corregido en la v1.0; cada afirmación pública se contrasta con el código |
| **Alcance que crece cada día** | 5 de los 10 cambios añadieron alcance, y 3 de ellos en los dos últimos días | Funcionó porque había margen, pero en un plan ajustado habría retrasado la entrega |
| **Muestra de prueba pequeña y cercana** | 3 familias, todas familiares del PM, en una sola tarde | Sirve para encontrar problemas, no para medir el impacto |

## Qué cambiar en el próximo proyecto

| Empezar a | Dejar de | Seguir |
| --- | --- | --- |
| Pasar la búsqueda de datos privados desde el primer commit, no después del primer susto | Dar instrucciones de servicios de terceros sin comprobarlas ese mismo día | Prototipo real → charter → puertas con un número |
| Incluir en la prueba con usuarios a alguien fuera del entorno cercano | Aceptar cambios de alcance sin preguntar qué se deja fuera a cambio | El asistente de IA ejecuta y deja la evidencia; el PM acepta |
| Probar en el aparato real del usuario (móvil del padre, tablet del niño) dentro de la puerta, con registro escrito | Esconder funciones en paneles plegados | Auditoría automática que bloquea el despliegue si algo falla |
| Medir el impacto con más de un dato (varios exámenes, varias familias) | | Informe de estado diario y registro de cambios del charter |

## Lecciones sobre gestionar con un asistente de IA

1. **La IA acelera la construcción, no las decisiones.** El cuello de botella pasó a ser lo que solo el PM puede hacer: aceptar, priorizar y decidir el alcance. Las puertas y la aceptación por historia mantuvieron el control.
2. **Pedir evidencia, no promesas.** Cada historia se cerraba con la evidencia de cada criterio (tests, capturas, medidas). Eso hizo posible aceptar rápido sin revisar cada línea de código.
3. **Las reglas que no se rompen van por escrito y se comprueban solas.** Privacidad, claves y marcas registradas estaban en `CLAUDE.md` y en la comprobación previa al commit. Aun así, una se coló una vez: la regla sola no basta, hace falta la comprobación automática.
4. **El asistente necesita el contexto de la sesión anterior.** Un traspaso escrito (estado, siguiente paso, decisiones y lecciones) permitió retomar cada día sin perder el hilo.
5. **Diseñar para el usuario no técnico es lo más difícil, y no lo resuelve la IA.** Los problemas reales de la prueba estuvieron en conseguir una clave y en encontrar un botón, no en la calidad de las preguntas.

## Lecciones técnicas reutilizables

- Generar contenido con IA dentro de plantillas fijas y validarlo con un esquema (Zod), reintentando con los errores, es más fiable que pedirle a la IA que programe.
- Comprobar que cada pregunta cita literalmente una frase del texto de origen elimina buena parte de las invenciones.
- En una PWA, un elemento arrastrado fuera de la pantalla ensancha la página en el móvil: `overflow-x: clip` en `html` y `body`.
- Compartir datos sin servidor: comprimidos dentro del `#` del enlace, que el navegador nunca envía al servidor; y como archivo para los iPad, que no comparten almacenamiento entre Safari y la app instalada.
- Un test que compara la documentación con el esquema impide que la documentación se quede atrás.

Las lecciones reutilizables entre proyectos quedan también en el vault de conocimiento del PM.
