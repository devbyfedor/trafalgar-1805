#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480 BASE=http://127.0.0.1:4391
QUERY="?debug" WAIT=1000 node run.mjs runs/prod-debug-w1-b
QUERY="?debug" STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/prod-debug-fix-w1-b
NOCHART=1 WAIT=1000 node run.mjs runs/prod-nochart-w1-c
STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-fix-nochart-w1-c
WAIT=1000 node run.mjs runs/prod-w1-c
STYLE=fix-scene1.css WAIT=1000 node run.mjs runs/prod-fix-w1-c
