#!/usr/bin/env bash
#
# Crea (o actualiza) en GitHub los labels del catálogo .github/labels.yml.
#
# Idempotente: `gh label create --force` crea el label si no existe y actualiza
# color y descripción si ya existe. No borra labels que no estén en la lista.
#
# Uso local:
#     GH_TOKEN=$(gh auth token) .github/scripts/sync-labels.sh
#
# En CI lo ejecuta .github/workflows/sync-labels.yml con el GITHUB_TOKEN del job.
#
# Si añades o quitas entradas aquí, refleja el cambio en .github/labels.yml.

set -euo pipefail

# Formato de cada entrada: nombre|color|descripción
LABELS=(
  # Tipo
  "bug|d73a4a|Algo no funciona como debería"
  "enhancement|a2eeef|Nueva funcionalidad o mejora de una existente"
  "documentation|0075ca|Cambios en README.md, CLAUDE.md o comentarios"
  "refactor|c5def5|Reorganización del código sin cambiar el comportamiento"
  "question|d876e3|Duda o petición de aclaración"
  # Área
  "gameplay|5319e7|Mecánicas del juego (caída, rotación, colisiones, bloqueo de pieza)"
  "ui|1d76db|Maquetación y estilos (index.html, style.css, overlays)"
  "controls|0e8a16|Entrada de teclado y respuesta a las teclas"
  "scoring|fbca04|Puntuación, líneas, niveles y velocidad de caída"
  "rendering|e99695|Dibujado en canvas (draw, drawBlock, ghost, vista previa)"
  "performance|ff9f1c|Fluidez del bucle de juego, uso de CPU, frames"
  # Prioridad
  "prioridad-alta|b60205|Rompe el juego o bloquea el uso normal"
  "prioridad-media|fbca04|Molesto pero con solución alternativa"
  "prioridad-baja|0e8a16|Detalle menor o mejora opcional"
  # Meta
  "needs-info|bfd4f2|Falta información para reproducir o entender el problema"
  "good-first-issue|7057ff|Buen punto de entrada para alguien nuevo en el proyecto"
  "roadmap|006b75|Una de las mejoras planificadas en docs/upgrades/"
)

for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  echo "→ $name"
  gh label create "$name" --color "$color" --description "$description" --force
done

echo "Listo: ${#LABELS[@]} labels sincronizados."
