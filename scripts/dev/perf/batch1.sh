#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480
NOCHART=1 WAIT=1000 node run.mjs runs/nochart-w1-a
WAIT=8000 node run.mjs runs/w8-a
WAIT=1000 node run.mjs runs/w1-b
NOCHART=1 WAIT=1000 node run.mjs runs/nochart-w1-b
WAIT=8000 node run.mjs runs/w8-b
WAIT=1000 node run.mjs runs/w1-c
NOSCROLL=1 WAIT=6000 node run.mjs runs/noscroll-a
WAIT=3000 node run.mjs runs/w3-a
