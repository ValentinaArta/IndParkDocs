#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Pre-deploy check — запускать перед каждым деплоем
#  Usage: bash scripts/pre-deploy.sh
# ═══════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════"
echo "  🔍  Pre-deploy checks — IndParkDocs"
echo "═══════════════════════════════════════════════"
echo ""

FAIL=0

# ─── 1. Синтаксис серверного кода ──────────────────────────────
echo -n "1. Node.js синтаксис серверных файлов... "
if node --check server/src/index.js 2>/dev/null \
  && node --check server/src/routes/*.js 2>/dev/null \
  && node --check server/src/middleware/*.js 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Синтаксическая ошибка в серверных файлах${NC}"
  FAIL=1
fi

# ─── 2. Синтаксис frontend JS (inline <script>) ───────────────
echo -n "2. Frontend JS синтаксис (inline scripts)... "
RESULT=$(node -e "
const html = require('./server/src/frontend.js');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
let ok = true;
scripts.forEach((s, i) => {
  const body = s.replace(/<\/?script>/g, '');
  try { new Function(body); } catch(e) { console.error('Block '+i+':',e.message); ok = false; }
});
if (ok) process.exit(0); else process.exit(1);
" 2>&1)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Ошибка в frontend JS:${NC}"
  echo "$RESULT"
  FAIL=1
fi

# ─── 3. Jest тесты ─────────────────────────────────────────────
echo -n "3. Jest тесты (94 тестов)... "
TEST_OUT=$(cd server && npm test -- --silent 2>&1)
if echo "$TEST_OUT" | grep -q "Tests:.*failed"; then
  FAILED_COUNT=$(echo "$TEST_OUT" | grep "Tests:" | grep -oP '\d+ failed')
  echo -e "${RED}✗ $FAILED_COUNT${NC}"
  echo "$TEST_OUT" | grep "●" | head -10
  FAIL=1
else
  PASSED=$(echo "$TEST_OUT" | grep "Tests:" | grep -oP '\d+ passed')
  echo -e "${GREEN}✓ ($PASSED)${NC}"
fi

# ─── 4. npm audit (critical/high) ──────────────────────────────
echo -n "4. npm audit (critical/high)... "
AUDIT_OUT=$(cd server && npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_OUT" | grep -q "found 0 vulnerabilities"; then
  echo -e "${GREEN}✓ нет уязвимостей${NC}"
elif echo "$AUDIT_OUT" | grep -qE "high|critical"; then
  VULNS=$(echo "$AUDIT_OUT" | grep -oP '\d+ (high|critical)' | head -3)
  echo -e "${RED}✗ $VULNS${NC}"
  FAIL=1
else
  echo -e "${GREEN}✓${NC}"
fi

# ─── 5. Проверка .env ──────────────────────────────────────────
echo -n "5. .env файл на месте и не в git... "
if [ -f server/.env ]; then
  if git ls-files --error-unmatch server/.env >/dev/null 2>&1; then
    echo -e "${RED}✗ .env ОТСЛЕЖИВАЕТСЯ GIT! Убрать из индекса!${NC}"
    FAIL=1
  else
    echo -e "${GREEN}✓${NC}"
  fi
else
  echo -e "${YELLOW}⚠ .env не найден${NC}"
fi

# ─── 6. Нет секретов в коде ────────────────────────────────────
echo -n "6. Нет захардкоженных секретов... "
SECRETS=$(grep -rn "gjdbh2642\|Val2026secure\|indpark-jwt-secret" server/src/ --include="*.js" | grep -v node_modules || true)
if [ -n "$SECRETS" ]; then
  echo -e "${RED}✗ Найдены захардкоженные секреты!${NC}"
  echo "$SECRETS"
  FAIL=1
else
  echo -e "${GREEN}✓${NC}"
fi

# ─── 7. Git — нет незакоммиченных изменений ────────────────────
echo -n "7. Git — чистый working tree... "
if git diff --quiet server/src/ server/tests/ 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  CHANGED=$(git diff --name-only server/src/ server/tests/ 2>/dev/null | wc -l)
  echo -e "${YELLOW}⚠ $CHANGED файл(ов) не закоммичены${NC}"
fi

# ─── Итого ──────────────────────────────────────────────────────
echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅  Все проверки пройдены — можно деплоить!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════${NC}"
  echo -e "${RED}  ❌  Есть ошибки — деплой ЗАБЛОКИРОВАН${NC}"
  echo -e "${RED}═══════════════════════════════════════════════${NC}"
  exit 1
fi
