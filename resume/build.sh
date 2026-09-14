#!/bin/sh
# Prints resume.html to PDF with headless Chrome (run from Git Bash).
#
#   sh resume/build.sh                          public copy, no phone: resume/Simon-Dumas-Resume.pdf
#   sh resume/build.sh "<phone>" <out.pdf>      copy to send, with the phone; write it OUTSIDE this repo
#
# The repo is public and GitHub Pages serves it, so the phone number never goes in a committed file.

here="$(cd "$(dirname "$0")" && pwd)"
chrome="/c/Program Files/Google/Chrome/Application/chrome.exe"
url="file:///$(cygpath -m "$here/resume.html")"
out="$here/Simon-Dumas-Resume.pdf"

if [ -n "$1" ]; then
  [ -n "$2" ] || { echo "usage: build.sh \"<phone>\" <out.pdf>" >&2; exit 1; }
  # URLSearchParams reads "+" as a space, so encode it along with spaces
  url="$url?phone=$(printf %s "$1" | sed 's/+/%2B/g; s/ /%20/g')"
  out="$2"
fi

"$chrome" --headless=new --disable-gpu --no-pdf-header-footer \
  --user-data-dir="$(cygpath -w "${TEMP:-/tmp}/resume-chrome")" \
  --print-to-pdf="$(cygpath -w "$out")" "$url" 2>/dev/null

[ -s "$out" ] || { echo "no PDF written" >&2; exit 1; }
echo "$out: $(grep -ao '/Count [0-9]*' "$out" | head -1 | cut -d' ' -f2) page(s)"
