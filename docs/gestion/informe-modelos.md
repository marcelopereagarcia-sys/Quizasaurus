# Informe comparativo de modelos de IA (QZS-15)

- **Fecha:** 3 de octubre de 2026
- **Puerta O1:** ≥ 90 % de preguntas correctas con al menos un proveedor
- **Resultado:** **superada con Gemini `gemini-3.5-flash` (98,9 %)**; puerta aprobada por el PM el 3 de octubre de 2026
- **Rúbrica:** [rubrica-pregunta-correcta.md](rubrica-pregunta-correcta.md), aprobada por el PM antes de medir

## Recomendación

**Proveedor recomendado: Gemini `gemini-3.5-flash` en su nivel gratuito**, para generar los packs. Los escaneos y las fotos se siguen leyendo en local (`qwen2.5vl:7b`, ADR-0002).

Por qué:

1. **Calidad.** Es el único proveedor que supera la puerta O1: 86 de 87 preguntas correctas en 3 unidades reales.
2. **Tiempo.** Tarda entre 38 y 72 s por unidad, dentro del objetivo de menos de 3 minutos.
3. **Coste.** Es gratuito: 0 € por pack.
4. **Los modelos locales no son una alternativa en un equipo doméstico** (tarjeta gráfica de 8 GB): no consiguen packs válidos o los consiguen con muchos errores, y tardan más de 10 minutos por unidad.

## Resultados

Las 3 unidades reales de 3.º de primaria son Medi «Les plantes», Teoria de Llengua Catalana y fichas de Ortografia. Están en `private/`, fuera del repositorio.

| Modelo | Dónde | Packs válidos | Preguntas correctas | Tiempo por unidad | Coste por pack |
| --- | --- | --- | --- | --- | --- |
| **Gemini `gemini-3.5-flash`** | Nube (gratis) | **3 / 3** | **86 / 87 (98,9 %)** | **38–72 s** | **0 €** |
| `gpt-oss:20b` | Local (Ollama) | 1 / 3 \* | 15 / 26 (58 %) en el único pack | ≈ 12 min \*\* | 0 € |
| `gemma4:e4b-it-qat` | Local (Ollama) | 0 / 3 | 0 % | 4–13 min | 0 € |
| `qwen2.5vl:7b` | Local (Ollama) | 0 / 1 \* | 0 % | más de 11 min | 0 € |

\* Medición cancelada por el PM cuando el resultado ya estaba claro.
\*\* Medido mientras otro modelo usaba la tarjeta gráfica: el tiempo real es algo menor.

### Detalle de Gemini por unidad

| Unidad | Correctas | Intentos | Tiempo | Tokens (entrada / salida) |
| --- | --- | --- | --- | --- |
| Les plantes | 29 / 30 | 2 | 72 s | 17 775 / 7 492 |
| Teoria de Llengua Catalana | 28 / 28 | 1 | 41 s | 5 251 / 4 344 |
| Ortografia (fichas resueltas por el alumno) | 29 / 29 | 1 | 38 s | 5 776 / 4 508 |

- **Único fallo:** una errata en una pregunta («quan fax la fotosíntesi», por «fan»).
- **Revisión del PM:** una muestra aleatoria de 10 preguntas, con la que coincidió en las 10.
- **Coste si fuera de pago:** con el mismo número de tokens, Claude Sonnet 5.5 (2 $ / 10 $ por millón de tokens) costaría entre 0,05 y 0,11 $ por pack. Es una estimación, no una medición.

### Por qué fallan los modelos locales

- **No copian las frases del libro literalmente.** Las resumen, las unen o cambian letras («Troncs curt» por «Tronc curt»), y la comprobación de QZS-14 las rechaza con razón.
- **Errores de contenido** en el único pack local válido:
  - Rondas de ordenar sin sentido.
  - Respuestas incorrectas: marca «l'» como el artículo que se apostrofa, cuando son «el» y «la».
  - Preguntas con dos respuestas válidas y erratas.
- **No caben en la memoria de la tarjeta gráfica.** Con las instrucciones y la unidad hace falta un contexto de unos 20 000–30 000 tokens, y una parte del modelo pasa al procesador (entre el 32 % y el 60 %), lo que lo ralentiza mucho.

## Riesgos y decisiones abiertas

- **Privacidad (R4).** En el nivel gratuito de Gemini, Google puede usar lo que se envía para mejorar sus productos. Solo sale el texto del libro: las fotos de las fichas del niño se leen en local y la limpieza elimina el nombre y la fecha. Las familias de la prueba F2 deben saberlo antes de usarlo.
- **Disponibilidad.** `gemini-3.8-flash` respondió dos veces «503: saturado». El proveedor reintenta automáticamente, pero conviene usar una versión fija y menos demandada.
- **Mejora abierta a la comunidad:** encontrar un modelo local que funcione en equipos domésticos, por ejemplo uno más grande en una tarjeta de 16 GB o más.
- **No medido:** Claude y OpenAI en la vida real. Los adaptadores existen (QZS-13), pero no se usaron claves de pago.
