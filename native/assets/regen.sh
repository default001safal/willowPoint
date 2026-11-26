#!/usr/bin/env bash
# Regenerate the derived binary artifacts the React Native app needs at bundle
# time. The PNGs and package-lock.json are not pushed as text: render/copy
# them here instead. Run from the repository root:
#
#     bash native/assets/regen.sh
#
# Requires: ImageMagick (with the rsvg delegate, e.g. imagemagick + librsvg2-bin
# on Debian/Ubuntu) and Node.js with npm.
set -euo pipefail

cd "$(dirname "$0")/../.."

mkdir -p native/assets/flags
for svg in public/flags/*.svg; do
  name="$(basename "$svg" .svg)"
  convert -background none -density 300 -resize 96x96 "$svg" "native/assets/flags/$name.png"
done

cp public/logo-light.png native/assets/logo-light.png

(cd native && npm install --package-lock-only --no-audit --no-fund)

echo "Regenerated: native/assets/flags/*.png, native/assets/logo-light.png, native/package-lock.json"
