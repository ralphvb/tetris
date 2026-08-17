# Roadmap de mejoras — coordinación de subramas

Esta rama (`feature/upgrades`) es la **rama padre** del roadmap. No se desarrolla
directamente sobre ella: cada mejora del [gist de sugerencias][gist] se
implementa en su propia **subrama**, que nace de `feature/upgrades` y vuelve a
`feature/upgrades` por Pull Request. Cuando las seis estén integradas y probadas,
`feature/upgrades` se mergea a `main` de una vez.

```
main
 └── feature/upgrades          ← rama padre (motor modular + esta documentación)
      ├── upgrade/01-powerups
      ├── upgrade/02-piezas-nuevas
      ├── upgrade/03-combos
      ├── upgrade/04-desafios
      ├── upgrade/05-habilidades
      └── upgrade/06-hold
```

[gist]: https://gist.github.com/Klerith/6c8d499ee157a6b5844466d73daa47d7/

---

## Las seis mejoras

| # | Mejora | Subrama | Spec | Depende de |
| - | ------ | ------- | ---- | ---------- |
| 1 | Power-ups aleatorios | `upgrade/01-powerups` | [01-powerups.md](01-powerups.md) | 03 (puntuación de combos ya estable) |
| 2 | Piezas nuevas no estándar | `upgrade/02-piezas-nuevas` | [02-piezas-nuevas.md](02-piezas-nuevas.md) | — |
| 3 | Modo combo y multiplicadores | `upgrade/03-combos` | [03-combos.md](03-combos.md) | — |
| 4 | Modo desafío con objetivos | `upgrade/04-desafios` | [04-desafios.md](04-desafios.md) | 01, 02, 03 (los desafíos los reutilizan) |
| 5 | Sistema de habilidades cargables | `upgrade/05-habilidades` | [05-habilidades.md](05-habilidades.md) | 06 (la habilidad «reservar pieza» **es** el hold) |
| 6 | Sistema de Hold | `upgrade/06-hold` | [06-hold.md](06-hold.md) | — |

### Orden de merge recomendado

```
06-hold → 02-piezas-nuevas → 03-combos → 01-powerups → 05-habilidades → 04-desafios
```

El razonamiento:

- **06 primero** porque es la mejora más pequeña y la que fija el patrón: panel
  lateral nuevo + tecla nueva + estado nuevo. Además la mejora 05 la reutiliza en
  vez de reimplementarla.
- **02 pronto** porque toca `config.js` (listas `PIECES`/`COLORS`), y cuanto
  antes se estabilicen esas listas, menos rebases para el resto.
- **03 antes que 01** porque los power-ups conceden puntos y necesitan que el
  cálculo con multiplicadores ya exista (`addScoreModifier`).
- **04 al final** porque un desafío se define en términos de las mecánicas
  anteriores.

Las mejoras sin dependencia entre sí (02, 03, 06) pueden desarrollarse en
paralelo desde el primer día. Si tu rama se queda atrás, **rebase sobre
`feature/upgrades`**, no merge de vuelta.

---

## Flujo de trabajo por subrama

```bash
git checkout feature/upgrades
git pull
git checkout -b upgrade/06-hold

# …desarrollo…

git push -u origin upgrade/06-hold
gh pr create --base feature/upgrades --title "feat(hold): sistema de reserva de pieza"
```

Reglas:

1. **La base del PR es `feature/upgrades`, nunca `main`.** Es el error más fácil
   de cometer; revísalo antes de crear el PR.
2. **Una mejora por rama.** Si de camino encuentras un bug del motor, arréglalo
   en un PR aparte contra `feature/upgrades`.
3. **Rebase, no merge**, para ponerte al día con la rama padre:
   `git fetch && git rebase origin/feature/upgrades`.
4. El PR lo revisa `claude-code-review.yml` automáticamente.

### Convención de commits

`tipo(ámbito): descripción en español`, ámbito = nombre corto de la mejora:

```
feat(hold): reservar la pieza actual con C
fix(hold): impedir dos reservas seguidas con la misma pieza
docs(hold): documentar la tecla en README
```

---

## Cómo adaptar el código: los puntos de extensión

El motor se reorganizó en módulos ES (`src/`) **precisamente** para que seis
ramas puedan trabajar en paralelo sin pelearse por `game.js`. Lee
[ARQUITECTURA.md](ARQUITECTURA.md) antes de escribir una línea.

La regla de oro:

> **Tu mejora vive en `src/features/<tu-mejora>.js` y se engancha al motor desde
> ahí. Si te ves editando `main.js`, `actions.js` o `loop()`, párate y busca el
> punto de extensión que te falta.**

Los ganchos disponibles, todos ya en el código:

| Necesitas… | Usa | Dónde está |
| ---------- | --- | ---------- |
| Reaccionar a que se fija una pieza, se limpian líneas, sube el nivel, se pausa o se reinicia | `on(EVENTS.LOCK \| LINES_CLEAR \| LEVEL_UP \| PAUSE \| RESUME \| RESET \| GAME_OVER \| SPAWN, fn)` | `src/events.js` |
| Una tecla nueva | `bindKey('KeyC', fn, { preventDefault })` | `src/input.js` |
| Pintar encima del tablero | `registerPainter((ctx, state) => …)` | `src/render.js` |
| Un marcador nuevo en el panel | `registerHudUpdater(state => …)` | `src/hud.js` |
| Cambiar los puntos de una limpieza | `addScoreModifier((pts, ctx) => pts * n)` | `src/scoring.js` |
| Cambiar de qué bolsa salen las piezas | `setPieceSelector(fn)` | `src/pieces.js` |
| Guardar algo entre frames | añade el campo a `state` **y reinícialo en `resetState()`** | `src/state.js` |

Activar la mejora son dos líneas en `src/features/index.js` (el import y la
entrada del array). Es el único archivo compartido que tocan todas las ramas, y
por eso el conflicto, si aparece, se resuelve en diez segundos.

### Lo que sí puedes tocar sin miedo

- `src/features/<tu-mejora>.js` — tuyo, nadie más lo toca.
- `index.html` y `style.css` — si necesitas panel o marcador nuevo. Añade tu
  bloque **al final** de la sección correspondiente para minimizar conflictos, y
  usa variables CSS existentes (`--label-color`, `--value-color`…) para que el
  tema claro/oscuro siga funcionando.
- `README.md` — sección de controles y de mecánicas.

### Lo que hay que pactar antes de tocar

- `src/config.js` — solo la mejora 02 añade piezas. Si necesitas una constante,
  añádela al final del archivo.
- `src/main.js`, `src/actions.js`, `src/board.js` — si de verdad necesitas un
  gancho nuevo, ábrelo como PR independiente contra `feature/upgrades`
  («añadir evento X»), mergéalo, y luego rebasa tu rama. Así el gancho está
  disponible para todos y no se duplica.

---

## Definition of Done (aplica a las seis)

Un PR de mejora no se mergea hasta que:

- [ ] La mejora está implementada como módulo en `src/features/` y registrada en
      `src/features/index.js`.
- [ ] El estado nuevo se reinicia en `resetState()` (o vía `EVENTS.RESET`) y se
      ha comprobado jugando **dos partidas seguidas** sin que se filtre nada.
- [ ] Funciona con **pausa** (`P`) y tras **Game Over → Reiniciar**.
- [ ] Se ve bien en **tema claro y oscuro** (probar el switch).
- [ ] No rompe nada de lo anterior: mover, rotar, soft/hard drop, ghost, NEXT,
      puntuación, niveles.
- [ ] Sin errores en la consola del navegador.
- [ ] `README.md` actualizado: controles nuevos y mención de la mecánica.
- [ ] El spec correspondiente en `docs/upgrades/` refleja lo que se implementó
      de verdad (si te desviaste, actualiza el documento en el mismo PR).

### Cómo probar

No hay tests: la verificación es jugar. Y desde el refactor a módulos ES **hace
falta servidor** (abrir `index.html` con doble clic ya no funciona: el navegador
bloquea los módulos con `file://`).

```bash
python3 -m http.server 8000   # luego http://localhost:8000
```

---

## Estado del roadmap

| # | Mejora | Estado |
| - | ------ | ------ |
| — | Motor modular (`src/`) + documentación | ✅ en `feature/upgrades` |
| 1 | Power-ups | ✅ implementada en `upgrade/01-powerups` (PR abierto contra `feature/upgrades`) |
| 2 | Piezas nuevas | ✅ implementada en `upgrade/02-piezas-nuevas` (PR abierto contra `feature/upgrades`) |
| 3 | Combos | ✅ implementada en `upgrade/03-combos` (PR abierto contra `feature/upgrades`) |
| 4 | Desafíos | ✅ implementada en `upgrade/04-desafios` (PR pendiente de abrir contra `feature/upgrades`) |
| 5 | Habilidades | ✅ implementada en `upgrade/05-habilidades` (PR pendiente de abrir contra `feature/upgrades`) |
| 6 | Hold | ✅ implementada en `upgrade/06-hold` (PR abierto contra `feature/upgrades`) |

Mantén esta tabla al día: cada PR que se mergea actualiza su fila.
