#!/usr/bin/env bash
# Regenerate the derived binary artifacts the React Native app needs at bundle
# time. All of these are reproducible from sources already tracked in the repo,
# which keeps binary blobs out of git. Run from the repository root:
#
#   bash native/assets/regen.sh
#
# Requirements: ImageMagick (with the rsvg or inkscape delegate for SVG rendering).
set -euo pipefail
cd "$(dirname "$0")/../.."

# Country flag PNGs are rendered from the SVG sources in public/flags.
mkdir -p native/assets/flags
for svg in public/flags/*.svg; do
  name="$(basename "$svg" .svg)"
  convert -background none -density 300 -resize 96x96 "$svg" "native/assets/flags/$name.png"
done

# App logo is copied verbatim from the web app's light logo.
cp public/logo-light.png native/assets/logo-light.png

# Lockfile is derived from native/package.json. Pin npm to the version EAS
# builders run (10.8.x) so the lockfile stays ci-compatible with cloud builds;
# newer npm resolves optional peers differently and breaks `npm ci` on EAS.
(cd native && npx npm@10.8.2 install --package-lock-only --no-audit --no-fund)

echo "Regenerated: native/assets/flags/*.png, native/assets/logo-light.png, native/package-lock.json"
