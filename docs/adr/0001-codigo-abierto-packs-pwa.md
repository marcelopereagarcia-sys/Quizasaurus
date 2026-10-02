# ADR-0001: Código abierto, formato de pack abierto, PWA y proveedores de IA intercambiables

- **Estado:** aceptada
- **Fecha:** 2026-10-02
- **Decide:** Marcelo Perea (sponsor y product owner)

## Contexto

Tras validar un prototipo (un juego de estudio para una unidad de Coneixement del Medi de 3º de primaria), se evaluó convertirlo en una herramienta que genere juegos a partir de cualquier PDF. Se consideraron tres caminos:

1. **App nativa de pago (~1 €) con IA en la nube.** Cada pack tiene un coste de API; con un pago único, los usuarios intensivos generan pérdidas. Además exige alta como autónomo, cuentas de desarrollador, normas de apps infantiles y figurar como comerciante en las tiendas. No hay estructura comercial.
2. **IA dentro del dispositivo** (Apple Intelligence, Gemini Nano). Coste por uso cero, pero solo en dispositivos recientes de gama alta: la tablet de referencia (Xiaomi Pad 7) no es compatible con Gemini Nano.
3. **Código abierto (MIT) como PWA, con el proveedor de IA elegido por el usuario.**

## Decisión

Se adopta la opción 3:

1. **Plantillas de juego fijas; la IA solo genera contenido.** La IA devuelve un pack JSON validado contra un esquema; nunca genera código de juego.
2. **Formato de pack abierto y versionado:** preguntas, tipo de juego, frase de origen, idioma y curso.
3. **Proveedores de IA intercambiables:** Ollama (local), Claude, OpenAI y Gemini. Cada usuario aporta el suyo. Ninguna clave en el código: solo `.env.example`.
4. **Reproductor como PWA offline**, publicado en GitHub Pages. Sin tiendas de apps.
5. **Revisión adulta obligatoria** antes de jugar, mostrando la frase del libro de la que sale cada pregunta.
6. **Licencia MIT** para el código y el esquema del pack.

## Consecuencias

- **Positivas:** coste e infraestructura casi nulos; sin trámites fiscales; funciona offline en cualquier tablet con navegador; la comunidad puede aportar skins, idiomas, plantillas y packs.
- **Compromisos:** sin ingresos; configurar un proveedor de IA añade fricción para familias no técnicas; la calidad depende del modelo y se mide en la fase F0; con MIT, terceros pueden comercializar el proyecto.
- **Reglas derivadas:** no publicar escaneos ni packs de libros con derechos; ningún dato de menores en la demo; ninguna marca registrada en skins ni nombres.
- **Reversible:** una app nativa o una versión alojada pueden construirse después sobre el mismo formato de pack.
