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

### Diseño para celular (áreas seguras)

Android 15+ obliga a dibujar de borde a borde, así que la app queda **debajo** de la barra de
estado y de la barra de gestos. Se resuelve en tres capas:

- `index.html` lleva `viewport-fit=cover`; el plugin **SystemBars** de Capacitor
  (`capacitor.config.json` → `plugins.SystemBars.insetsHandling: "css"`) inyecta
  `--safe-area-inset-*` en píxeles reales (incluye muesca).
- `src/input.css` expone `--safe-top/-bottom/-left/-right` (con `env()` de respaldo) y las
  aplica: `#app-topbar` (barra de estado), `#app-navbar` (barra de gestos), `#app-toast` y
  `#modal-sheet` (hoja inferior que nunca queda tapada).
- `src/app.js` → `syncSystemBars()` elige iconos claros u oscuros según el tema de la app
  (no el del sistema) y actualiza `theme-color`; la actividad usa `adjustResize` para que el
  teclado no tape los campos del modal.

Regla al tocar la UI: **ningún** elemento fijo debe usar `env()` directo; usa las variables
`--safe-*` para que funcione igual en el APK, en Chrome y en la PWA instalada.

### Actualizar el APK por WiFi (sin perder datos)

El celular y la computadora en la misma red; no hace falta cable:

```
npm run android:apk
mkdir -p /tmp/mcf-wifi && cp android/app/build/outputs/apk/debug/app-debug.apk \
  /tmp/mcf-wifi/mi-control-financiero-1.3.apk
python3 -m http.server 8000 --directory /tmp/mcf-wifi   # queda sirviendo en la LAN
```

Abre en el navegador del celular `http://<IP-de-tu-PC>:8000/` (la IP sale con
`ip -4 addr show scope global`), descarga el APK y tócalo. Al instalar **encima** de la app
existente (misma `applicationId` y misma firma) Android la actualiza y **conserva el
`localStorage`**: movimientos, saldos y apartados siguen intactos. Reglas:

- **No desinstales** la app antes de actualizar (desinstalar sí borra los datos).
- Sube `versionCode` en `android/app/build.gradle` en cada entrega (hoy va en 4 / 1.3) para
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

### Tarjetas de crédito (varias)

La app maneja **una tarjeta por cuenta de crédito**: BBVA Azul, **Nu** y **Mercado Pago**
vienen de fábrica con sus fechas de corte reales (**BBVA día 12, Nu día 6, Mercado Pago día
21**) y se pueden agregar más desde **Más → Tarjetas de crédito → + Nueva** (o desde la
pestaña Tarjeta). Ahí mismo se editan y se borran (solo si están en $0 y sin movimientos).
Cada tarjeta guarda:

- **día de corte** (`cutDay`) y **día límite de pago** (`paymentDueDay`), ambos 1–28;
- línea de crédito y saldo (el saldo lo mueven los movimientos, no se teclea);
- su cuenta de crédito asociada (`accountId` ↔ `cardId`).

El día de corte de Nu (6) y Mercado Pago (21) se rellena en la migración **solo si la tarjeta
no tiene uno puesto por ti**: si algún día lo cambias a mano, la migración no lo pisa. El
**día límite de pago** sí queda vacío hasta que lo pongas (mientras no exista, se usa el día
1 del mes siguiente al corte). La migración (`normalizeData` en `store.js`) enlaza tarjeta↔cuenta y agrega
Nu/Mercado Pago **sin tocar saldos ni movimientos** (es idempotente y también corre al
importar un respaldo). Borrar una tarjeta solo se permite si está en $0 y sin movimientos.

Cada tarjeta tiene su propio pago del corte: compras de contado del ciclo + sus MSI. La
pestaña Tarjeta muestra un selector cuando hay más de una.

### Registrar movimientos

- **Categorías con buscador**: el formulario usa un selector filtrable (estilo select2) que
  filtra en el DOM sin re-renderizar, para no perder el foco del teclado.
- **Compra con tarjeta de crédito**: se elige directamente en **“¿Con qué pagaste?”**, donde
  aparecen las cuentas de débito/efectivo y las TDC (BBVA, Nu, Mercado Pago, las que agregues)
  con 💳. Al tocar una tarjeta el gasto se marca como compra a crédito, pega en el saldo de
  esa tarjeta (no en la cuenta) y muestra a qué corte entra. Ya no hay interruptor aparte.
- **Es a meses (MSI)**: pide mensualidad y plazo, registra la compra en *Compras a MSI* y el
  gasto **no** se cuenta completo en el corte: solo su mensualidad. Ya no existen los
  interruptores “Pendiente” ni el texto de “respaldo TDC / debe cubrirse con efectivo”.
- **Pago TDC**: ahora pregunta **qué tarjeta** pagas (antes asumía la primera).

### Suscripciones y pagos recurrentes

**Más → Suscripciones** maneja cobros que se registran solos: nombre, monto, **día de cobro
(1–28)**, categoría (con buscador) y de dónde se cobra (cuenta de débito/efectivo o una TDC).
Se pueden crear, editar, pausar y borrar.

El motor vive en `store.js`:

- `nextChargeFor(day)` calcula el primer cobro (estrictamente futuro, para no cobrar al crear).
- `chargeRecurring(data, today)` registra un gasto por cada cobro vencido y avanza
  `nextChargeDate` un mes; si la app estuvo cerrada varios meses, recupera los pendientes
  (máximo 36). El id del movimiento es `tx-sub-<id>-<fecha>`, así que **es idempotente**:
  reabrir la app no duplica cargos.
- `runRecurringCharges()` lo aplica al almacén; se llama al arrancar y en el cambio de día en
  vivo (la app abierta a medianoche también cobra).
- Cobrar con TDC sube la deuda de esa tarjeta (y entra al ciclo de su corte); cobrar con
  cuenta descuenta el saldo disponible.

### Recordatorios de corte y pago (APK)

Dentro del APK se agendan notificaciones locales (plugin `LocalNotifications`) para cada
tarjeta con corte configurado, a las **9:00**: aviso **3 días antes** y **el mismo día** del
límite de pago, y **2 días antes** y **el mismo día** del corte. Se reprograman los próximos
3 meses cada vez que abres la app (ids 1–399, se cancelan antes de reagendar para no
duplicar). Se activan/desactivan en Configuración → Recordatorios; Android pide el permiso de
notificaciones la primera vez. En el navegador no hay notificaciones del sistema.

### Widget de pantalla de inicio (APK)

Widget nativo (`HomeWidgetProvider`) con el resumen de 4 líneas: saldo, dinero libre, próximo
corte y próximo pago + MSI. La app web arma el texto (`src/widget.js` → `widgetSnapshot`) y lo
manda por el plugin propio `HomeWidget` (`HomeWidgetPlugin.java`), que lo guarda en
SharedPreferences (`mcf_widget`) y refresca el widget al instante. Se coloca con una pulsación
larga en la pantalla de inicio → Widgets → **Mi Control Financiero**. Sin la app abierta se
refresca cada ~30 min (límite del sistema) y al tocar el widget abre la app.

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
  native.js               puente a plugins nativos (LocalNotifications, HomeWidget, SystemBars)
  reminders.js            plan y programación de avisos de corte / límite de pago
  widget.js               resumen de 4 líneas para el widget de inicio
  vendor/capacitor-core.js  runtime de Capacitor copiado (la app no usa bundler)
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
