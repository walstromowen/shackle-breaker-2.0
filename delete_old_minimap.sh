#!/bin/sh
# The minimap renderer moved to frontend/src/ui/ (the world map screen shares it). Remove the old copy.
rm -f frontend/src/screens/overworld/minimapRenderer.js
echo "removed frontend/src/screens/overworld/minimapRenderer.js"
