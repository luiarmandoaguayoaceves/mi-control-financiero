# Mi Control Financiero

App personal de finanzas (v2, web estática) — **HTML + Tailwind CSS + JavaScript vanilla**.
Cero backend, cero dependencias en runtime: los datos viven en el dispositivo como JSON (`localStorage`).

Principio central: **"Saldo bancario NO es igual a dinero libre"**.

```
dinero libre real =
  saldo disponible (débito + efectivo + ahorro)
  − total apartados
  − respaldo TDC (compras del ciclo sin pagar)
  − gastos esenciales pendientes (servicios con día de cobro próximo no cubiertos)
```

## Correr

```bash
python3 -m http.server 8080      # o cualquier servidor estático
# abrir http://localhost:8080  (desde el celular: http://<IP-de-tu-PC>:8080)
```

No hace falta Node para ejecutarla: la carpeta es 100% estática.

## Comandos (solo para desarrollo)

| Comando | Qué hace |
| --- | --- |
| `npm run css` | Recompila Tailwind v4 → `css/tailwind.css` |
| `npm test` | 37 tests: lógica financiera, seed y smoke de todas las pantallas |
| `npm start` | Servidor estático (python3) en el puerto 8080 |

## Estructura

```
index.html
css/tailwind.css          Tailwind COMPILADO (sin CDN, funciona offline)
src/
  input.css               fuente Tailwind (@import + @custom-variant dark)
  models.js               modelos y constantes
  format.js               dinero MXN, fechas es-MX (puro)
  finance.js              lógica financiera PURA (testeada con node --test)
  seed.js                 datos iniciales reales (25-ago-2026)
  store.js                repositorio localStorage + efecto contable
  ui.js                   helpers de render (KPI, progress, chips, barras…)
  app.js                  arranque, router de hash, acciones, tema oscuro
  screens/                dashboard, movements, card, funds, services, goals,
                          budget, assets, reports, settings, more, modals
tests/                    node --test (finance, seed, smoke)
```

## Decisiones importantes

1. **localStorage (JSON) en v1** detrás de `store.js`: única puerta de escritura; migrar a IndexedDB/SQLite/Cloud es reemplazar ese módulo sin tocar pantallas.
2. **Saldos como verdad contable**: el seed se inserta ya conciliado; los movimientos NUEVOS ajustan saldos (gasto débito baja la cuenta, compra TDC sube la tarjeta, pago TDC baja ambas, ingreso a apartado sube el fondo).
3. **Respaldo TDC = compras del ciclo posteriores al último pago**: con el seed, 3,177.45. Pago proyectado = respaldo + MSI del mes = **4,659.45** (dinámico).
4. **MSI**: solo se respalda la mensualidad mensual, no el total. El saldo de la tarjeta (20,000.50) se muestra separado del pago requerido (parte es MSI futuro).
5. **Tailwind compilado** (no CDN): la app funciona sin internet y queda lista para el APK.
6. **Modo oscuro** por clase `.dark` en `<html>`: sigue al sistema por defecto, con toggle manual (persistido).
7. **Gráficas CSS puras** (sin librerías): cero fricción en el wrap a APK.
8. **ES Modules**: requiere servirlo por HTTP (no `file://`).

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

## APK (siguiente paso)

La carpeta ya es estática y apta para envolverse con **Capacitor** (HTML/JS → APK) sin backend:

```bash
npm i -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Mi Control Financiero" com.luisarmando.micontrolfinanciero --web-dir .
npx cap add android
npx cap sync
npx cap open android   # requiere Android Studio (o `gradle assembleDebug` con el SDK)
```

Los datos siguen viviendo en el dispositivo (WebView → localStorage). Para "Instalar en mi celular sin PC", la opción sin SDK local es compilar el APK en la nube (EAS Build) tras el wrap.

## Pendientes v2

- Wrap APK con Capacitor (o PWA con service worker para instalar desde Chrome sin APK)
- Migrar a IndexedDB (mejor rendimiento con muchos movimientos)
- Importar/exportar CSV (JSON ya funciona)
- Notificaciones de corte/límite/servicios
- Presupuestos recurrentes automáticos mes a mes
- Sección Vehículos dedicada (KTM RC 200) con historial
