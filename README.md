# Mi Control Financiero

App personal de finanzas (v2, web estática) — **HTML + Tailwind CSS + JavaScript vanilla**.
Sin backend: se sube tal cual a **Netlify** (PWA instalable) y además se empaqueta como
**APK de Android** con Capacitor para instalar la app directamente en el celular.

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

## APK de Android (instalar en el celular)

La app también se empaqueta como **APK** con [Capacitor](https://capacitorjs.com): es la misma
app web (los mismos HTML/CSS/JS) dentro de un contenedor nativo de Android. No hay dos
códigos: se edita `src/` y se vuelve a compilar.

```
npm run android:apk      # genera www/ → copia a android/ → compila
# APK resultante: android/app/build/outputs/apk/debug/app-debug.apk
```

**Instalar en el celular**: pasa ese `app-debug.apk` al teléfono (USB, Drive, Telegram…) y
ábrelo. Android pedirá permitir "instalar apps de origen desconocido" para esa app; acepta
y queda instalada con su icono. Es un APK **debug** (firmado con la llave de depuración):
sirve perfecto para uso personal; si algún día quieres publicarlo en Play Store hay que
firmarlo con una llave propia (`assembleRelease` + keystore).

### Actualizar el APK por WiFi (sin perder datos)

El celular y la computadora en la misma red; no hace falta cable:

```
npm run android:apk
mkdir -p /tmp/mcf-wifi && cp android/app/build/outputs/apk/debug/app-debug.apk \
  /tmp/mcf-wifi/mi-control-financiero-1.1.apk
python3 -m http.server 8000 --directory /tmp/mcf-wifi   # queda sirviendo en la LAN
```

Abre en el navegador del celular `http://<IP-de-tu-PC>:8000/` (la IP sale con
`ip -4 addr show scope global`), descarga el APK y tócalo. Al instalar **encima** de la app
existente (misma `applicationId` y misma firma) Android la actualiza y **conserva el
`localStorage`**: movimientos, saldos y apartados siguen intactos. Reglas:

- **No desinstales** la app antes de actualizar (desinstalar sí borra los datos).
- Sube `versionCode` en `android/app/build.gradle` en cada entrega (hoy va en 2 / 1.1) para
  que el instalador la trate como actualización.
- Si algún día cambia la llave de firma, Android rechaza la actualización; habría que
  exportar el respaldo JSON e importarlo en la instalación nueva.


Requisitos para compilar (una sola vez): **JDK 21** y **Android SDK** (platform 36 y
build-tools 36). El proyecto `android/` ya está en el repo; `android/local.properties`
apunta al SDK de tu máquina y no se versiona.

> **Datos**: el APK guarda tus finanzas en el `localStorage` de SU WebView, que es un almacén
> distinto al de Chrome. Lo que captures en Chrome/Netlify no aparece en el APK y viceversa.
> Para mover datos: Configuración → **Exportar respaldo JSON** → en el otro lado **Importar**.

Dentro del APK la app se comporta distinto en dos detalles (automático, por `isNativeShell`):
no muestra el aviso de "instala la app" (ya está instalada) y no registra el service worker
(los archivos ya viven en el dispositivo).

### Apartados

Pestaña **Apartados**: botón **+ Nuevo** para crear un apartado con nombre, monto inicial
opcional, meta y propósito; los chips **Protegido / No protegido** deciden si cuenta como
dinero intocable. Cada apartado permite **Ingresar**, **Retirar** y **Editar** (nombre, meta,
propósito, protegido y **borrar**). Crear con monto inicial o borrar con dinero deja su
movimiento en el historial, para que nunca se pierda el rastro del dinero.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Sirve la app con `npx serve` en http://localhost:8080 |
| `npm test` | 62 tests: lógica financiera, formato, contabilidad, smoke de pantallas y cableado de botones |
| `npm run css` | Recompila Tailwind v4 → `css/tailwind.css` (tras cambiar clases) |
| `npm run www` | Copia la app web a `www/` (lo que se empaqueta en el APK) |
| `npm run android:apk` | Genera `www/`, sincroniza Capacitor y compila el APK debug |
| `npm run android:open` | Abre el proyecto Android en Android Studio |
| `npm run icons` / `npm run icons:android` | Regenera iconos de la PWA / del APK (sin dependencias) |

## Estructura

```
index.html
manifest.json             PWA: nombre, iconos, standalone
sw.js                     Service worker: offline + cache (solo web, no en el APK)
netlify.toml              publish = "." (sin build) + headers para sw.js
icons/                    icon-192.png, icon-512.png, apple-touch-icon.png
capacitor.config.json     APK: appId, nombre, webDir=www, UA propio
android/                  Proyecto Android (Capacitor) del APK
www/                      App copiada para el APK (generada, no se versiona)
css/tailwind.css          Tailwind COMPILADO (sin CDN, funciona offline)
scripts/
  gen-icons.js            genera los iconos PNG de la PWA
  gen-android-icons.js    genera iconos y splash del APK
  icon-art.js             arte compartido (encoder PNG propio, sin dependencias)
  build-www.js            copia index/css/src/icons a www/
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
tests/                    node --test (finance, format, smoke, wiring)
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
- APK firmado con llave propia (release) si algún día va a Play Store
