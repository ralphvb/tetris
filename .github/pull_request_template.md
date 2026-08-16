<!--
  ¿Es un PR de una mejora del roadmap?
  → La base debe ser `feature/upgrades`, NUNCA `main`. Compruébalo arriba.
-->

## Qué hace

<!-- Una o dos frases. -->

## Mejora del roadmap

- Spec: `docs/upgrades/XX-….md`
- Subrama: `upgrade/XX-…`
- Issue: closes #

## Cómo se enganchó al motor

<!--
  Eventos, teclas, painters, modificadores… y por qué ahí.
  Si tocaste algo fuera de src/features/, explica por qué no bastaba un gancho.
-->

## Cómo probarlo

```bash
python3 -m http.server 8000   # http://localhost:8000
```

<!-- Pasos concretos para reproducir la mejora en el juego. -->

## Definition of Done

- [ ] Implementada en `src/features/` y registrada en `src/features/index.js`
- [ ] El estado nuevo se reinicia (probado con dos partidas seguidas)
- [ ] Funciona con pausa (`P`) y tras Game Over → Reiniciar
- [ ] Correcta en tema claro y oscuro
- [ ] No rompe mover / rotar / soft y hard drop / ghost / NEXT / puntuación / niveles
- [ ] Sin errores en la consola del navegador
- [ ] `README.md` actualizado (controles y mecánicas)
- [ ] El spec de `docs/upgrades/` refleja lo implementado
