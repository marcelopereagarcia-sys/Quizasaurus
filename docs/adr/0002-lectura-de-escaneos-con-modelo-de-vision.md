# ADR-0002: Leer escaneos y fotos con un modelo de visión local, no con OCR clásico

- **Estado:** aceptada (2026-10-03)
- **Fecha:** 2026-10-03
- **Decide:** Marcelo Perea (sponsor y product owner)
- **Historia:** QZS-12

## Contexto

El generador necesita el texto de la unidad. Los PDF con capa de texto se leen directamente, pero lo habitual en casa son **fotos de móvil o escaneos** de fichas ya trabajadas: páginas algo torcidas, de baja resolución (750 × 1000 px) y con la letra del niño y las correcciones del docente encima del texto impreso.

Se probó con una unidad real de ortografía catalana de 3º de primaria (10 páginas, guardada en `private/`, fuera del repositorio). Es a propósito **el peor caso**: fotos de fichas ya resueltas por el niño. El caso previsto es una foto o un PDF de páginas sin escribir, así que estas cifras son un suelo, no la media esperada. Se transcribió a mano el texto impreso de 2 páginas como referencia y se midió:

- **Recall:** % de palabras de la referencia que aparecen en la salida.
- **Precisión:** % de palabras de la salida que son de la referencia (el resto es ruido).

| Método | Recall p. 1 | Recall p. 5 | Precisión p. 1 | Precisión p. 5 | Tiempo por página |
| --- | --- | --- | --- | --- | --- |
| Tesseract.js, catalán | 71 % | 56 % | 36 % | 40 % | < 1 s |
| Tesseract.js con preproceso (sin tinta roja, ×2) | 79 % | 65 % | 32 % | 29 % | ~1 s |
| Modelo de visión local `qwen2.5vl:7b` (Ollama) | 84 % | 93 % | 57 % | 83 % | 5–8 s (41 s la primera, al cargar el modelo) |

Equipo de prueba: portátil con RTX 5070 de 8 GB. El modelo ocupa 6 GB.

Segunda prueba, **caso previsto**: unidad de Medi en catalán (14 fotos de páginas del libro sin escribir, con el texto de la cara de atrás transparentándose). Referencia transcrita a mano de 2 páginas (396 palabras):

| Método | Recall p. 3 | Recall p. 7 | Precisión p. 3 | Precisión p. 7 | Tiempo por página |
| --- | --- | --- | --- | --- | --- |
| Tesseract.js, catalán | 78,9 % | 81,1 % | 58,0 % | 66,2 % | < 1 s |
| Modelo de visión local `qwen2.5vl:7b` (Ollama) | 100 % | 99,6 % | 100 % | 99,6 % | 4–11 s (media ~7,6 s; la unidad entera en 1 min 47 s) |

El único fallo del modelo en 396 palabras fue un acento («Romani» por «Romaní»).

Observaciones:

- Tesseract destroza justo las listas de palabras, que son el contenido de los juegos ("centòfietre" por "centímetre").
- El modelo de visión transcribe casi perfecta la teoría de los recuadros, que es lo que más importa al generador.
- Aun con la instrucción de ignorarla, el modelo **copia a veces la letra del niño**, incluido su nombre en el campo «Nom».

## Decisión

1. **PDF con capa de texto:** extracción directa, sin OCR.
2. **Escaneos y fotos:** transcripción con un **modelo de visión a través de la capa de proveedores** (ADR-0001). Por defecto, **local con Ollama**, para que las fichas del niño no salgan del equipo. Los proveedores en la nube quedan como opción, con aviso de privacidad (riesgo R4).
3. **Limpieza obligatoria tras la transcripción:** se eliminan los campos de identificación de las fichas («Nom:», «Cognoms:», «Data:», «Curs:»…), que es donde aparecen nombre y apellidos, antes de que el texto llegue al generador. Los nombres de pila sueltos dentro del contenido (por ejemplo, como ejemplo de nombre propio) no se anonimizan: son genéricos y no identifican a nadie (decisión del PM).
4. **Tesseract.js** queda descartado como vía principal; puede volver como respaldo sin conexión si una prueba con escaneos limpios lo justifica.
5. La **revisión adulta** sigue siendo la red de seguridad para el ruido que quede (palabras escritas a mano por el niño).

## Consecuencias

- **Positivas:** calidad suficiente para intentar la puerta O1; privacidad por defecto; reutiliza la capa de proveedores en lugar de añadir otra dependencia.
- **Compromisos:** exige Ollama y un modelo de 6 GB (o una clave en la nube): más fricción para familias no técnicas. Más lento que el OCR clásico (5–8 s por página). La transcripción no es determinista.
- **Recomendación a las familias:** fotografiar las páginas de teoría o las fichas en blanco da mejor resultado que las fichas ya hechas.
- **Supuesto sin medir con un libro real:** el castellano funcionará igual o mejor que el catalán, porque los modelos se entrenan con mucho más castellano. Se comprobará con material propio en QZS-12.
- **Pendiente de medir en QZS-15:** otros modelos de visión, más ligeros y en la nube.

## Mejoras abiertas a la comunidad

El PM acepta esta decisión con el alcance probado: Quizasaurus es un MVP de código abierto y estas mejoras quedan abiertas a contribuciones.

- **Fotos directas de la cámara:** reducir las fotos grandes (12 MP o más) antes de enviarlas al modelo y respetar la orientación EXIF. Probado solo con imágenes de 750 × 1000 px dentro de PDF.
- **Equipos sin GPU:** modelos de visión más ligeros o un proveedor en la nube para familias sin tarjeta gráfica de 8 GB.
- **Castellano con un libro real:** medir con una unidad escaneada en castellano.
- **Páginas con muchas líneas vacías:** detectar el bucle de repetición mientras se genera, en lugar de esperar al límite de tokens (~40 s).
