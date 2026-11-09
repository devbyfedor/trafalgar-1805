#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480 BASE=http://127.0.0.1:4391
WAIT=1000 node run.mjs runs/prod-w1-a
STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/prod-fix-w1-a
NOCHART=1 WAIT=1000 node run.mjs runs/prod-nochart-w1-a
STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fix-nochart-w1-a
WAIT=1000 node run.mjs runs/prod-w1-b
STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/prod-fix-w1-b
STYLE=fix-scene1.css NOSCROLL=1 WAIT=5000 node run.mjs runs/prod-fix-noscroll-a
TRACE=1 STYLE=fix-scene1.css NOSCROLL=1 WAIT=4000 AFTER=500 node run.mjs runs/t-prod-fix-noscroll-a
TRACE=1 WAIT=1000 node run.mjs runs/t-prod-w1-a
