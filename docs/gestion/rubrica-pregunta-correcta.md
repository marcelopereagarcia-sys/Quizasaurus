# Rúbrica: qué es una «pregunta correcta»

- **Para:** QZS-15, comparativa de modelos y puerta O1 (≥ 90 % de preguntas correctas con al menos un proveedor)
- **Fecha:** 3 de octubre de 2026, escrita antes de medir
- **Estado:** aprobada por el PM (3 de octubre de 2026), antes de medir

## Qué se puntúa

Cada elemento que el niño responde cuenta como una pregunta:

| Juego | Unidad puntuable |
| --- | --- |
| Clasificar | cada elemento (y su categoría) |
| Ordenar | cada ronda (el orden completo) |
| Situación con opciones | cada pregunta |
| Sí o no | cada afirmación |
| Jefe final | cada pregunta |

## Criterios

Una pregunta es **correcta** solo si cumple los cinco:

1. **Respuesta correcta según el libro.** La respuesta marcada (la opción, la categoría, el orden o el sí/no) es la que dice el texto de la unidad.
2. **Sin ambigüedad.** Solo hay una respuesta defendible con el texto. Ninguna opción incorrecta es también verdadera.
3. **Fuente que la demuestra.** La frase de origen está en el libro (se comprueba de forma automática) y además sostiene la respuesta.
4. **Idioma correcto.** Está en la lengua de la unidad, sin faltas ni mezcla de idiomas.
5. **Adecuada al curso.** Un niño de 3.º de primaria la entiende y puede responderla solo con lo que dice la unidad.

**No restan:** que una pregunta sea fácil, un estilo mejorable o un emoji poco acertado. Se anotan como observaciones.

## Cómo se calcula

- **% de preguntas correctas** = correctas ÷ preguntas puntuables, por pack y por modelo (suma de las 3 unidades).
- Si un modelo no consigue un pack válido tras 3 intentos (QZS-14), esa unidad cuenta como **0 preguntas correctas**: la familia se quedaría sin pack.
- Además se registran el **tiempo de generación** y el **coste por pack** (tokens y euros).

## Quién evalúa

1. Claude evalúa todas las preguntas contra el texto de la unidad, criterio a criterio, y anota el motivo de cada fallo.
2. El PM revisa una **muestra aleatoria de 10 preguntas por modelo**. Si discrepa en más de 1 de cada 10, se revisa todo ese modelo a mano.

## Unidades de prueba

Las mismas 3 unidades reales de 3.º de primaria (en `private/`, fuera del repositorio): Medi «Les plantes», Teoria de Llengua Catalana y fichas de Ortografia.
