# Mi Control Financiero

App personal de finanzas (v2, web estática) — **HTML + Tailwind CSS + JavaScript vanilla**.
Sin backend: se sube tal cual a **Netlify** y los datos se guardan como **JSON en el mismo proyecto**.

Principio central: **"Saldo bancario NO es igual a dinero libre"**.

```
dinero libre real =
  saldo disponible (débito + efectivo + ahorro)
  − total apartados
  − respaldo TDC (compras del ciclo sin pagar)
  − gastos esenciales pendientes (servicios con día de cobro próximo no cubiertos)
```

## Correr (local)

```bash
npm start                  # usa npx serve -l 8080 .  (npx se descarga solo)
# abrir http://localhost:8080  (desde el celular: http://<IP-de-tu-PC>:8080)
```

## Subir a Netlify

1. Sube el proyecto a un repo de GitHub o arrastra la carpeta en https://app.netlify.com/drop
2. Netlify detecta `netlify.toml` (publica la raíz, sin build). Listo.
3. `node_modules/` no se publica (lo ignora Netlify); si arrastras la carpeta, puedes borrarla antes.

> Nota: los sitios subidos por **arrastrar la carpeta (Netlify Drop)** muestran un aviso promocional de Netlify flotando abajo. No es publicidad del sitio y no se puede quitar desde el código: desaparece al conectar el repo de GitHub (Deploy → repos de Git → elegir repo) y desplegar por Git. La navegación inferior y los modales ya están diseñados para no quedar tapados.

## Cómo se guardan los datos (sin backend)

| Capa | Qué es | Cuándo se usa |
| --- | --- | --- |
| `localStorage` | TUS datos (por navegador/dispositivo) | ÚNICA fuente de verdad en runtime |
| arranque vacío | Sin datos semilla | Un navegador que nunca ha guardado nada inicia VACÍO: solo categorías por defecto y cuentas/tarjeta en $0 |

REGLAS (para que nunca pierdas tus actualizaciones):
- **Un despliegue NUNCA toca tus datos**: el código que subes a Netlify solo se sirve; no escribe nada en tu almacenamiento. Puedes redesplegar mil veces y tus finanzas siguen igual.
- **localStorage es por navegador**: lo que capturas en tu PC no aparece automáticamente en tu celular ni en otro navegador (son almacenes separados). Para mover datos: Configuración → **Exportar respaldo JSON** → en el otro dispositivo Configuración → **Importar respaldo JSON**.
- **localhost y tu URL de Netlify son orígenes distintos**: cada uno tiene su propio localStorage.
- Si alguna vez quieres volver a empezar: Configuración → "Borrar todos mis datos" (deja la app en vacío; exporta un respaldo antes).

## PWA (instalable, offline)

La app es una PWA: tiene `manifest.json` + `sw.js` (service worker) + iconos generados (`scripts/gen-icons.js`, sin dependencias).

- **Instalar en Android**: al abrir la app verás un banner "Instala Mi Control Financiero" con botón **Instalar** (usa `beforeinstallprompt`); también puedes desde Chrome → menú ⋮ → "Instalar aplicación". Si lo descartas con ×, ya no vuelve a aparecer; si lo instalas, desaparece para siempre.
- **En iOS Safari**: el banner muestra la instrucción Compartir → "Agregar a pantalla de inicio" (iOS no permite instalación automática).
- **Navegación por carrusel**: desliza a la izquierda o derecha sobre el contenido para cambiar entre Inicio → Movimientos → Tarjeta → Apartados → Más (también funciona con el mouse arrastrando). El menú está ARRIBA (nada de publicidad/avisos inferiores tapa las acciones); las pestañas del menú y el botón "atrás" de Android siguen funcionando; el scroll vertical de cada vista se conserva al cambiar de pestaña.
- **Offline**: el service worker cachea toda la app (CSS, JS e iconos). Sin red funciona igual; tus datos viven en localStorage.
- **Estrategia de caché**: páginas son network-first (los deploys llegan); el resto es cache-first con actualización en segundo plano. Tus datos (localStorage) nunca pasan por el service worker.
- **Actualizar la app**: Netlify tiene `Cache-Control: no-cache` para `/sw.js` y `/src/*` (ver `netlify.toml`); al publicar cambios, sube `CACHE_VERSION` en `sw.js` si cambiaste la lista de archivos precacheados.
- **Requisito**: HTTPS (Netlify lo da gratis). En local, `localhost` también cuenta como contexto seguro.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Sirve la app con `npx serve` en http://localhost:8080 |
| `npm test` | 39 tests: lógica financiera, formato, contabilidad y smoke de pantallas |
| `npm run css` | Recompila Tailwind v4 → `css/tailwind.css` (tras cambiar clases) |

## Estructura

```
index.html
manifest.json             PWA: nombre, iconos, standalone
sw.js                     Service worker: offline + cache
netlify.toml              publish = "." (sin build) + headers para sw.js
icons/                    icon-192.png, icon-512.png, apple-touch-icon.png
scripts/gen-icons.js      genera los iconos PNG (sin dependencias)
css/tailwind.css          Tailwind COMPILADO (sin CDN, funciona offline)
src/
  input.css               fuente Tailwind (@import + @custom-variant dark)
  models.js               modelos y constantes
  format.js               dinero MXN, fechas es-MX (puro)
  finance.js              lógica financiera PURA (testeada con node --test)
  store.js                repositorio: localStorage (única fuente) + arranque vacío
  ui.js                   helpers de render (KPI, progress, chips, barras…)
  app.js                  arranque, router de hash, acciones, tema oscuro
  screens/                dashboard, movements, card, funds, services, goals,
                          budget, assets, reports, settings, more, modals
tests/                    node --test (finance, seed, smoke)
```

## Decisiones importantes

1. **localStorage como única fuente** + arranque vacío (sin datos semilla): el código desplegado nunca escribe ni re-sembra datos; los deploys son inofensivos para tus finanzas. `store.js` es la única puerta de escritura; migrar a IndexedDB o a un backend después no toca pantallas.
2. **Saldos como verdad contable**: los movimientos ajustan saldos automáticamente (gasto débito baja la cuenta, compra TDC sube la tarjeta, pago TDC baja ambas, ingreso a apartado sube el fondo).
3. **Respaldo TDC = compras del ciclo posteriores al último pago**: pago proyectado = respaldo + MSI del mes (dinámico).
4. **MSI**: solo se respalda la mensualidad mensual, no el total. El saldo de la tarjeta se muestra separado del pago requerido (parte es MSI futuro).
5. **Tailwind compilado** (no CDN): funciona offline y en Netlify sin pasos extra.
6. **Modo oscuro** por clase `.dark` en `<html>`: sigue al sistema por defecto, con toggle manual (persistido).
7. **Gráficas CSS puras** (sin librerías).
8. **ES Modules**: requiere servirlo por HTTP (`npm start`), no `file://`.

## Arranque

La app inicia VACÍA (sin datos semilla): solo categorías por defecto y cuentas/tarjeta en $0. Tú capturas tus saldos, movimientos, apartados y metas desde cero (o importas un respaldo JSON). No hay datos de "origen" que puedan reaparecer.

> Referencia (datos reales al 25-ago-2026, ya no viven en la app): Nómina BBVA 12,074.73 · apartados 16,401 (10,000 protegidos) · TDC 20,000.50 de 111,700 (corte día 12) · MSI 1,482/mes · compras del ciclo 3,177.45 · pago proyectado 4,659.45 · patrimonio 5,925.50.

## Pendientes v2

- Migrar a IndexedDB (mejor rendimiento con muchos movimientos)
- Importar/exportar CSV (JSON ya funciona)
- Notificaciones de corte/límite/servicios
- Presupuestos recurrentes automáticos mes a mes
- Sección Vehículos dedicada (KTM RC 200) con historial
- PWA ya está: instalable desde Chrome/Netlify sin APK
