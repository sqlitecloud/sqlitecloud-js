#!/bin/bash
# gateway-build.sh - build gateway as self contained executable for linux and macos
# If you get an error executing this script run:
# chmod u+x ./scripts/build.sh

# navigate to the script's directory
#cd "$(dirname "$0")"

# build bun's one file binary
mkdir -p ./lib/gateway/public
bun build ./src/gateway/gateway.ts --compile --outfile ./lib/gateway/gateway.out

# copy the public folder to the build folder
cp -r ./public/* ./lib/gateway/public/
cp ./package.json ./lib/gateway/
