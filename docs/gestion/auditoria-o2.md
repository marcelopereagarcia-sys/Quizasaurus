# Auditoría automática del reproductor (puerta O2)

> Generado por `npm run audit` el 4 de octubre de 2026 a las 19:12 sobre el commit `23673bb` con cambios locales sin subir. No editar a mano: se rehace en cada ejecución.

**Resultado: ✅ superada** · 6 partidas completas · 108 niveles jugados · 510 respuestas · 130 s

## Criterios de aceptación (QZS-22)

| Criterio | Resultado |
| --- | --- |
| Juega todos los niveles en modo perfecto y en modo aleatorio | ✅ 108 de 108 niveles; 0 respuestas mal juzgadas |
| 375 px (móvil), 768 px (tablet) y 1440 px (ordenador) sin desbordes ni texto cortado | ✅ 0 problemas de diseño |
| 0 errores de JavaScript | ✅ 0 errores · 0 peticiones fallidas |
| Informe enlazado desde `docs/gestion` | ✅ este archivo, enlazado en [README](README.md) |

## Qué se ha jugado

Cada partida empieza en un navegador limpio (Chromium sin ventana), como la primera visita de una familia.

- **Modo perfecto:** responde siempre lo que dice el pack (la respuesta se lee del pack, nunca de la pantalla). Todas deben contar como acierto.
- **Modo aleatorio:** toca cualquier opción; en «sí o no», la mitad de las veces desliza la tarjeta con el dedo. El juego debe dar por buenas justo las que coinciden con el pack.
- En cada pregunta, en cada explicación de un fallo y en cada pantalla (portada en los 3 idiomas, mundos y unidades, unidad, rincón de las familias, control parental, revisión adulta leyendo y corrigiendo, generador y resultados) se busca: página que se desplaza de lado, elementos fuera de la pantalla, texto cortado y texto que se sale de su caja.
- Se cuenta cualquier error de JavaScript o de consola y cualquier petición que falle.

| Pack | Idioma | Niveles | Para qué |
| --- | --- | --- | --- |
| `ciclo-del-agua` | es | classify, order, choice, yesno, boss + infinito | Pack de ejemplo incluido en la app |
| `audit-stress-ca` | ca | classify, order, choice, yesno, boss + infinito | Sintético, con los textos más largos que admite el formato |
| `audit-stress-en` | en | classify, order, choice, yesno, boss + infinito | Sintético, con los textos más largos que admite el formato |

| Pantalla | Modo | Skin | Niveles | Respuestas (✔ / ✘) | Mal juzgadas | Problemas de diseño | Errores JS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375 px (móvil) | perfecto | blocks | 18 | 85 (85 / 0) | 0 | 0 | 0 |
| 375 px (móvil) | aleatorio | dinos | 18 | 85 (24 / 61) | 0 | 0 | 0 |
| 768 px (tablet) | perfecto | blocks | 18 | 85 (85 / 0) | 0 | 0 | 0 |
| 768 px (tablet) | aleatorio | dinos | 18 | 85 (35 / 50) | 0 | 0 | 0 |
| 1440 px (ordenador) | perfecto | blocks | 18 | 85 (85 / 0) | 0 | 0 | 0 |
| 1440 px (ordenador) | aleatorio | dinos | 18 | 85 (25 / 60) | 0 | 0 | 0 |

## Comprobaciones extra

| Comprobación | Resultado |
| --- | --- |
| Recargar a mitad de partida sigue en la misma pregunta (375 px (móvil)) | ✅ |
| Recargar a mitad de partida sigue en la misma pregunta (768 px (tablet)) | ✅ |
| Recargar a mitad de partida sigue en la misma pregunta (1440 px (ordenador)) | ✅ |
| Sin conexión: tras la primera visita se abre y se juega en modo avión | ✅ |

## Cómo repetirla

```bash
npx playwright install chromium --only-shell   # solo la primera vez
npm run audit
```
