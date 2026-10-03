# ADR-0003: App web con Vite + Preact y generador dentro del navegador

- **Estado:** aceptada
- **Fecha:** 2026-10-03
- **Decide:** Marcelo Perea (sponsor y product owner)
- **Historias:** F1 (QZS-16 a QZS-22)

## Contexto

La fase F1 construye la app que usan las familias. Tiene cuatro partes: el reproductor de los 5 juegos, la revisión adulta, el panel familiar y la pantalla para generar packs. Según el ADR-0001, es una PWA offline publicada en GitHub Pages, sin cuentas ni servidor. El dispositivo de referencia es una tablet Android de gama media (Xiaomi Pad 7).

Había que decidir dos cosas:

1. **Con qué se construye la interfaz.** El prototipo es un único HTML con JavaScript puro y no escala a cuatro pantallas con estado compartido.
2. **Dónde se ejecuta el generador web (QZS-21).** El de F0 es una herramienta de terminal que lee las claves de `.env`.

## Decisión

1. **Vite + Preact + TypeScript**, con `vite-plugin-pwa` para que funcione sin conexión y se pueda instalar. Preact pesa unos 3 KB y usa componentes, como React. La app reutiliza el código de F0 (esquema del pack, generador y proveedores).
2. **El generador se ejecuta en el navegador, sin servidor.**
   - La familia escribe su clave del proveedor en la app. **Se guarda solo en su dispositivo** y solo se envía a ese proveedor.
   - **Lectura de fotos:** si hay Ollama en el equipo, en local (ADR-0002). Si no, con el proveedor en la nube, **mostrando antes un aviso** de que la imagen sale del dispositivo y la recomendación de fotografiar páginas sin escribir. La limpieza de nombre y fecha se aplica igual.
3. **Textos de la interfaz con diccionario tipado**, el mismo patrón que SpeakiKids: un idioma define las claves y el compilador avisa si falta una traducción.
4. **Todo el progreso se guarda en el dispositivo.** Si el almacenamiento falla, se sigue jugando con lo que hay en memoria.

## Alternativas descartadas

- **JavaScript puro, como el prototipo:** no hace falta compilar, pero las pantallas con estado compartido acabarían siendo difíciles de mantener y de ampliar por la comunidad.
- **React:** más conocido, pero más pesado para la tablet de referencia sin aportar nada que aquí haga falta.
- **Servidor local (`npm run app`) con las claves en `.env`:** más privado, pero obliga a instalar Node y usar la terminal. Choca con el objetivo de que una familia sin conocimientos técnicos genere un pack.

## Consecuencias

- **Positivas:**
  - Sin infraestructura ni coste, publicable en GitHub Pages.
  - La familia hace todo el ciclo desde la tablet o el ordenador.
  - El código de F0 se reutiliza tal cual.
- **Compromisos:**
  - La clave queda guardada en el navegador del dispositivo. Es aceptable porque cada familia usa la suya en su propio equipo, pero hay que poder borrarla fácilmente.
  - Sin Ollama, las fotos se leen en la nube, lo que es menos privado (riesgo R4): por eso el aviso y la recomendación.
  - Usar Ollama desde una web exige un ajuste de configuración (`OLLAMA_ORIGINS`), que se documentará.
- **Trabajo derivado:** adaptar el código de F0 para que funcione también en el navegador (base64 y renderizado de páginas sin dependencias de Node).
