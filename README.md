# Mi Control Financiero

App personal de finanzas (Android, v1 local) — **Expo + React Native + TypeScript**.

Principio central: **"Saldo bancario NO es igual a dinero libre"**.

```
dinero libre real =
  saldo disponible (débito + efectivo + ahorro)
  − total apartados
  − respaldo TDC (compras del ciclo sin pagar)
  − gastos esenciales pendientes (servicios con día de cobro próximo no cubiertos)
```

## Requisitos

- Node.js 20+ (probado con v24)
- Celular Android con **Expo Go** (Play Store)
- Sin necesidad de Java / Android Studio / Flutter

## Puesta en marcha

```bash
npm install
npm start          # aparece un QR
```

En el celular: abrir **Expo Go** → **Scan QR code** (Android escanea desde la app; si estás en otra red, usa `npx expo start --tunnel`).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Levanta Metro (QR para Expo Go) |
| `npm run typecheck` | TypeScript estricto (`tsc --noEmit`) |
| `npm test` | Tests de la lógica financiera (Node nativo, sin RN) |

## Estructura

```
src/
  components/     UI reutilizable (KpiCard, ProgressBar, BarChart, ModalInput…)
  screens/        Dashboard, Movimientos, Nuevo/Editar, Tarjeta, Apartados,
                  Servicios, Metas, Presupuesto, Patrimonio, Reportes, Config
  navigation/     Tabs + stack "Más" + modal de nuevo movimiento
  models/         Interfaces de dominio (Account, Transaction, Fund, CreditCard…)
  repositories/   Única puerta de escritura sobre los datos
  services/       financeService (lógica pura, testeada) y seedService
  database/       storage.ts (AsyncStorage aislado tras el repositorio)
  hooks/          useAppData (contexto de datos + acciones) y useTheme
  utils/          format.ts (moneda MXN, fechas es-MX)
  constants/      categorías, grupos, métodos de pago
  theme/          colores claro/oscuro, tipografía, espaciado
  seed/           datos iniciales reales (25-ago-2026)
tests/            node --test (lógica financiera + datos del seed)
```

## Decisiones importantes

1. **AsyncStorage en v1, no expo-sqlite.** El repositorio (`src/repositories/`) y el storage están aislados: migrar a SQLite/Firebase es reemplazar `database/storage.ts` + el repositorio sin tocar pantallas.
2. **Saldos de cuentas como verdad contable.** El seed se inserta ya conciliado (el saldo de la nómina y la tarjeta YA incluyen los movimientos sembrados). Los movimientos NUEVOS que registres sí ajustan saldos automáticamente: gasto con débito baja la cuenta, compra TDC sube el saldo de la tarjeta, pago TDC baja ambos.
3. **Respaldo TDC = compras del ciclo actual posteriores al último pago.** Con el seed: 3,177.45. Pago proyectado = respaldo + MSI del mes = **3,177.45 + 1,482 = 4,659.45** (dinámico).
4. **MSI**: solo se exige respaldar la mensualidad mensual, no el monto total. Se muestra mensualidad, número de MSI, saldo pendiente y % del ingreso (si defines ingreso mensual en Configuración).
5. **El saldo total de la tarjeta (20,000.50) no es el pago requerido**: parte es MSI futuro. La app lo separa explícitamente.
6. **Fondo de emergencia**: no cuenta como dinero libre, meta configurable, cobertura en meses = fondo / gastos esenciales mensuales (suma de servicios activos).
7. **Gráficas simples propias** (BarChart) en lugar de una librería externa: cero riesgo de romper el arranque en Expo Go.
8. **Transferencias**: el modelo `Transaction` usa `toAccountId` opcional (extensión mínima del modelo pedido).
9. **Modo oscuro** automático (sigue al sistema), moneda MXN, fechas es-MX.
10. **Seguridad**: sin contraseñas/NIP/CVV/tokens; solo se muestran los últimos 4 dígitos del nombre de la tarjeta; todo local.

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

> Nota: el "dinero libre" sale negativo con los datos iniciales porque los apartados (16,401) superan el saldo (12,074.73). Es la consecuencia honesta de la fórmula; se normaliza al registrar ingresos o ajustar saldos reales.

## Pendientes v2

- Migrar storage a **expo-sqlite** (repositorio ya listo) y después Cloud/Firebase con autenticación.
- Importar/exportar **CSV** (el respaldo JSON ya funciona) y respaldo automático.
- Gráficas avanzadas (librería tipo victory-native/react-native-chart-kit) y comparativas.
- Sección **Vehículos** dedicada (KTM RC 200) con historial de servicio/valor.
- Recordatorios/notificaciones de corte, fecha límite y servicios.
- Presupuestos recurrentes automáticos mes a mes.
- Edición de categorías (agregar/renombrar) dentro de Configuración.
- Sincronización entre celular y otros dispositivos (fuera del alcance de v1).
