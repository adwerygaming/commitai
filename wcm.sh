#!/bin/bash

ORIGINAL_CALL_DIR="$PWD"
cd /home/masdepan/programming/commitai || exit 1

# add args passthough
CALL_FROM="$ORIGINAL_CALL_DIR" npm run start -- "$@"