#!/bin/bash
# shortcut script for running the SJS test suite
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
"$here/sjs" "$here/test/run.html" "$@"
