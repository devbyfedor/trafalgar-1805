#!/usr/bin/env bash
# Several measured runs of the home page right after load, on the production
# preview (npm run preview), each scrolling from 1 s after load and from load.
#   bash batch.sh <label> [runs]       (env: LIGHT=1 frames only; PROFILE=dir a warm profile)
# Writes runs/<label>-w1-N.json and runs/<label>-w0-N.json and prints metrics.mjs.
cd "$(dirname "$0")"
mkdir -p runs
label="$1"; runs="${2:-3}"
export BASE="${BASE:-http://127.0.0.1:4173}"
for i in $(seq 1 "$runs"); do
  WAIT=1000 node run.mjs "runs/$label-w1-$i" > /dev/null 2>&1
  WAIT=0 node run.mjs "runs/$label-w0-$i" > /dev/null 2>&1
done
node metrics.mjs runs/$label-*.json
node late.mjs runs/$label-*.json
