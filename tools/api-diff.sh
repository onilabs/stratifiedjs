#!/bin/bash
set -eu
set -o pipefail

if [ "$#" -lt 2 ]; then
	echo "Usage: $0 old-commit new-commit" >&2
	exit 1
fi

git rev-parse "$1" "$2"
jspp="0install run http://gfxmonk.net/dist/0install/python-js-beautify.xml -i -"
getApi () {
	git rev-parse "$1"
	git show "$1:modules/sjs-lib-index.json" | $jspp
}

# differ="$((which gvim  || echo "diff --side-by-side") 2>/dev/null)"
gvim -d <(getApi "$1") <(getApi "$2")
