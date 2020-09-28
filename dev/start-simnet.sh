#!/usr/bin/env bash

# Run this script from the "dev" folder to:
#  1. Start parallel simnet nodes and wallets
#  2. Initialize a postgresql database for this simnet session.
#  3. Start hdfdata in simnet mode connected to the alpha node.
#
# When done testing, stop hdfdata with CTRL+C or SIGING, then use stop-simnet.sh
# to stop all simnet nodes and wallets.

set -e

echo "Starting simnet nodes and wallets..."
rm -rf ~/dcrdsimnet
./parallel-nodes.tmux
# tmux a -t hdfd-parallel-nodes

echo "Use stop-simnet.sh to stop nodes and wallets."

sleep 5

echo "Preparing PostgreSQL for simnet hdfdata..."
PSQL="sudo -u postgres -H psql"
$PSQL < ./simnet.sql

rm -rf ~/.hdfdata/data/simnet
rm -rf datadir
pushd .. > /dev/null
./hdfdata -C ./dev/hdfdata-simnet.conf --datadir ./dev/datadir -g
popd > /dev/null

echo " ***
Don't forget to run ./stop-simnet.sh!
 ***"
