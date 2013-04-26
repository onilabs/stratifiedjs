#!/bin/bash
set -eu
here="$(dirname "$(readlink -f "$0")")"
"$here/apollo" "$here/test/run.html" "$@"
