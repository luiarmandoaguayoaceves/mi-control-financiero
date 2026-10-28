// ============================================================
// Genera www/: los archivos de la app web que se empaquetan en el APK.
// El APK NO es otra app: es esta misma (HTML + Tailwind + JS vanilla)
// copiada dentro de un contenedor Capacitor, con sus datos en localStorage
// del WebView (independientes de los del navegador).
// sw.js se omite a propósito: dentro del APK no hay red que cachear y un
// service worker viejo podría servir archivos de una versión anterior.
// ============================================================
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'www');
const ENTRIES = ['index.html', 'manifest.json', 'css', 'src', 'icons'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const entry of ENTRIES) {
  await cp(path.join(ROOT, entry), path.join(OUT, entry), { recursive: true });
}

console.log(`www/ listo: ${ENTRIES.join(', ')}`);
