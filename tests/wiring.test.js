// Verifica que cada botón con data-action="..." de las pantallas tenga su
// `case` correspondiente en app.js. Así un botón nuevo nunca queda muerto
// (visible en la UI pero sin efecto) sin que los tests fallen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');
const appSource = readFileSync(path.join(SRC, 'app.js'), 'utf8');

function screenSources() {
  const screens = readdirSync(path.join(SRC, 'screens')).map((f) => path.join(SRC, 'screens', f));
  return [path.join(SRC, 'ui.js'), ...screens].map((file) => ({
    file: path.relative(SRC, file),
    source: readFileSync(file, 'utf8'),
  }));
}

test('todos los data-action de las pantallas tienen su case en app.js', () => {
  const missing = [];
  for (const { file, source } of screenSources()) {
    const matches = source.matchAll(/data-action="([a-z][a-z-]*)"/g);
    for (const [, action] of matches) {
      if (!appSource.includes(`case '${action}':`)) missing.push(`${file}: ${action}`);
    }
  }
  assert.deepEqual(missing, [], `acciones sin case en app.js: ${missing.join(', ')}`);
});

test('apartados: la pantalla y sus modales exponen las acciones esperadas', () => {
  const funds = readFileSync(path.join(SRC, 'screens', 'funds.js'), 'utf8');
  const modals = readFileSync(path.join(SRC, 'screens', 'modals.js'), 'utf8');
  for (const action of ['fund-add', 'fund-move', 'fund-edit']) {
    assert.ok(funds.includes(`data-action="${action}"`), `funds.js debe ofrecer ${action}`);
  }
  // Los chips de "protegido" pasan la acción como argumento (chip({ action })).
  for (const action of ['fund-save', 'fund-protected', 'fund-edit-save', 'fund-delete']) {
    assert.ok(modals.includes(action), `modals.js debe ofrecer ${action}`);
  }
});
