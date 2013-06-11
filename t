#!/bin/bash
set -eu
here="$(dirname "$(readlink -f "$0")")"
"$here/sjs" "$here/test/run.html" "$@"
