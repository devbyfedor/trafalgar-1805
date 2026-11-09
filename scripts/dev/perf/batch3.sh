#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480
STYLE=fix-scene1.css WAIT=8000 node --max-old-space-size=8192 layers.mjs runs/layers-fix.json > runs/layers-fix.txt 2>&1
STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/fix-nochart-w1-a
STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/fix-w1-a
STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/fix-nochart-w1-b
STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/fix-w1-b
STYLE=fix-scene1.css,fix-scene1-text.css NOCHART=1 WAIT=1000 node run.mjs runs/fixtext-nochart-w1-a
STYLE=fix-scene1.css WAIT=8000 node run.mjs runs/fix-w8-a
