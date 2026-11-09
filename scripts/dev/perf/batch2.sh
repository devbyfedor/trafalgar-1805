#!/bin/bash
cd "$(dirname "$0")"
export STEP=150 DIST=6480
TRACE=1 NOSCROLL=1 WAIT=4000 AFTER=500 node run.mjs runs/t-noscroll-a
TRACE=1 WAIT=1000 node run.mjs runs/t-w1-b
TRACE=1 NOCHART=1 WAIT=1000 node run.mjs runs/t-nochart-a
TRACE=1 WAIT=1000 node run.mjs runs/t-w1-c
