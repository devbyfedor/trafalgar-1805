#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480 BASE=http://127.0.0.1:4391
STYLE=fix-strips.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fixstrips-nochart-a
STYLE=fix-nohero.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fixnohero-nochart-a
NOCHART=1 WAIT=1000 node run.mjs runs/prod-nochart-w1-d
STYLE=fix-strips.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fixstrips-nochart-b
STYLE=fix-nohero.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fixnohero-nochart-b
STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fix-nochart-w1-d
