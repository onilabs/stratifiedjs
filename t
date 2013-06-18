#!/bin/bash
# shortcut script for running the SJS test suite
set -eu
here="$(dirname "$(readlink -f "$0")")"
"$here/sjs" "$here/test/run.html" "$@"
