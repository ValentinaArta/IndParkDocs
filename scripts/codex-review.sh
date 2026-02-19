#!/bin/bash
# Codex Code Review Script
set -e

OPENAI_KEY=$(grep OPENAI_API_KEY ~/.openclaw/.env.local | cut -d= -f2)
TARGET=${1:-"server/src"}

echo "🔍 Collecting code for review..."

# Collect all JS files into one temp file
TMPFILE=$(mktemp)
find "$TARGET" -name "*.js" -not -path "*/node_modules/*" | sort | while read f; do
  echo "=== FILE: $f ===" >> "$TMPFILE"
  cat "$f" >> "$TMPFILE"
  echo "" >> "$TMPFILE"
done

echo "📡 Sending to Codex for review..."

# Build JSON payload safely with Python
python3 -c "
import json, sys

with open('$TMPFILE') as f:
    code = f.read()

payload = {
    'model': 'gpt-5-mini',
    'input': 'You are a senior security engineer and code reviewer. Review this Node.js code for:\n1. Security vulnerabilities (SQL injection, XSS, auth bypass, data leaks)\n2. Architecture problems\n3. Performance issues\n4. Best practice violations\n\nBe specific: file name, line description, severity (CRITICAL/HIGH/MEDIUM/LOW), and fix suggestion.\nRespond in Russian.\n\nCode:\n' + code
}

json.dump(payload, sys.stdout)
" | curl -s https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -d @- | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'output' in data:
        for item in data['output']:
            if item.get('type') == 'message':
                for c in item.get('content', []):
                    if c.get('type') == 'output_text':
                        print(c['text'])
    elif 'error' in data:
        print('ERROR:', data['error'].get('message', data['error']))
    else:
        print(json.dumps(data, indent=2))
except Exception as e:
    print('Parse error:', e)
"

rm -f "$TMPFILE"
