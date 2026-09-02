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

1. `npm run data` si cambiaste el seed (regenera `data/app-data.json`)
2. Sube el proyecto a un repo de GitHub o arrastra la carpeta en https://app.netlify.com/drop
3. Netlify detecta `netlify.toml` (publica la raíz, sin build). Listo.
4. `node_modules/` no se publica (lo ignora Netlify); si arrastras la carpeta, puedes borrarla antes.

## Cómo se guardan los datos (JSON en el proyecto, sin backend)

| Capa | Qué es | Cuándo se usa |
| --- | --- | --- |
| `data/app-data.json` | JSON base versionado EN EL PROYECTO | Se lee en el primer arranque (fetch) y es la base que sube a Netlify |
| `localStorage` | Tus cambios en el navegador | Persistencia real día a día (por eso funciona en Netlify: es 100% del lado del cliente) |
| `src/seed.js` | Respaldo | Si no existe el archivo JSON |

Flujo para "alimentar" el proyecto con tus datos:
1. Usa la app normalmente (todo se guarda en tu navegador).
2. Configuración → **Exportar respaldo JSON** → guarda el archivo como `data/app-data.json` (reemplazando el actual).
3. `git commit` y Netlify se redespliega (o vuelve a arrastrar la carpeta).

También puedes **editar `data/app-data.json` a mano** (es JSON legible) y recargar la app con datos locales borrados — al primer arranque tomará ese archivo como base. Si quieres regresar a la base del proyecto, Configuración → Restablecer y borra los datos del sitio en el navegador.

## PWA (instalable, offline)

La app es una PWA: tiene `manifest.json` + `sw.js` (service worker) + iconos generados (`scripts/gen-icons.js`, sin dependencias).

- **Instalar en Android**: al abrir la app verás un banner "Instala Mi Control Financiero" con botón **Instalar** (usa `beforeinstallprompt`); también puedes desde Chrome → menú ⋮ → "Instalar aplicación". Si lo descartas con ×, ya no vuelve a aparecer; si lo instalas, desaparece para siempre.
- **En iOS Safari**: el banner muestra la instrucción Compartir → "Agregar a pantalla de inicio" (iOS no permite instalación automática).
- **Offline**: el service worker cachea toda la app (CSS, JS, iconos y el JSON base). Sin red funciona igual; tus datos viven en localStorage.
- **Estrategia de caché**: páginas y `data/app-data.json` son network-first (los deploys y el JSON actualizado llegan); el resto es cache-first con actualización en segundo plano.
- **Actualizar la app**: Netlify tiene `Cache-Control: no-cache` para `/sw.js` y `/src/*` (ver `netlify.toml`); al publicar cambios, sube `CACHE_VERSION` en `sw.js` si cambiaste la lista de archivos precacheados.
- **Requisito**: HTTPS (Netlify lo da gratis). En local, `localhost` también cuenta como contexto seguro.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Sirve la app con `npx serve` en http://localhost:8080 |
| `npm test` | 38 tests: lógica financiera, seed, contabilidad y smoke de pantallas |
| `npm run css` | Recompila Tailwind v4 → `css/tailwind.css` (tras cambiar clases) |
| `npm run data` | Regenera `data/app-data.json` desde el seed |

## Estructura

```
index.html
manifest.json             PWA: nombre, iconos, standalone
sw.js                     Service worker: offline + cache
netlify.toml              publish = "." (sin build) + headers para sw.js
data/app-data.json        JSON base de datos del proyecto (versionado)
icons/                    icon-192.png, icon-512.png, apple-touch-icon.png
scripts/gen-icons.js      genera los iconos PNG (sin dependencias)
css/tailwind.css          Tailwind COMPILADO (sin CDN, funciona offline)
src/
  input.css               fuente Tailwind (@import + @custom-variant dark)
  models.js               modelos y constantes
  format.js               dinero MXN, fechas es-MX (puro)
  finance.js              lógica financiera PURA (testeada con node --test)
  seed.js                 datos iniciales reales (25-ago-2026)
  store.js                repositorio: app-data.json → localStorage → seed
  ui.js                   helpers de render (KPI, progress, chips, barras…)
  app.js                  arranque, router de hash, acciones, tema oscuro
  screens/                dashboard, movements, card, funds, services, goals,
                          budget, assets, reports, settings, more, modals
tests/                    node --test (finance, seed, smoke)
```

## Decisiones importantes

1. **JSON en el proyecto como base + localStorage como runtime**: única forma de que funcione en Netlify sin backend. `store.js` es la única puerta de escritura; migrar a IndexedDB o a un backend después no toca pantallas.
2. **Saldos como verdad contable**: el seed se inserta ya conciliado; los movimientos NUEVOS ajustan saldos (gasto débito baja la cuenta, compra TDC sube la tarjeta, pago TDC baja ambas, ingreso a apartado sube el fondo).
3. **Respaldo TDC = compras del ciclo posteriores al último pago**: con el seed, 3,177.45. Pago proyectado = respaldo + MSI del mes = **4,659.45** (dinámico).
4. **MSI**: solo se respalda la mensualidad mensual, no el total. El saldo de la tarjeta (20,000.50) se muestra separado del pago requerido (parte es MSI futuro).
5. **Tailwind compilado** (no CDN): funciona offline y en Netlify sin pasos extra.
6. **Modo oscuro** por clase `.dark` en `<html>`: sigue al sistema por defecto, con toggle manual (persistido).
7. **Gráficas CSS puras** (sin librerías).
8. **ES Modules**: requiere servirlo por HTTP (`npm start`), no `file://`.

## Números del seed (25-ago-2026)

| Concepto | Valor |
| --- | --- |
| Nómina BBVA | 12,074.73 |
| Apartados | 16,401 (10,000 protegidos) |
| Fondo emergencia | 4,000 / meta 39,000 |
| TDC BBVA Azul | 20,000.50 usados · línea 111,700 · corte día 12 · 268 pts |
| MSI activos | Emma 336 + Refri 628 + Lavasecadora 518 = 1,482/mes |
| Compras del ciclo (sin respaldar) | 3,177.45 |
| Pago proyectado próximo corte | 4,659.45 |
| Patrimonio neto | 5,925.50 (incluye moto estimada 45,000) |

> El "dinero libre" sale negativo con los datos iniciales porque los apartados (16,401) superan el saldo (12,074.73): es la consecuencia honesta de la fórmula; se normaliza al registrar ingresos o ajustar saldos.

## Pendientes v2

- Migrar a IndexedDB (mejor rendimiento con muchos movimientos)
- Importar/exportar CSV (JSON ya funciona)
- Notificaciones de corte/límite/servicios
- Presupuestos recurrentes automáticos mes a mes
- Sección Vehículos dedicada (KTM RC 200) con historial
- PWA ya está: instalable desde Chrome/Netlify sin APK
