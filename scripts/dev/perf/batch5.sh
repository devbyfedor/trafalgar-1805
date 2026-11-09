#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480 BASE=http://127.0.0.1:4391
QUERY="?debug" WAIT=1000 node run.mjs runs/prod-debug-w1-a
QUERY="?debug" STYLE=fix-scene1.css NOCHART=1 WAIT=1000 node run.mjs runs/prod-debug-fix-nochart-w1-a
QUERY="?debug" STYLE=fix-scene1.css WAIT=8000 node run.mjs runs/prod-debug-fix-w8-a
