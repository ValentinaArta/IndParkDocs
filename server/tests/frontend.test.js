/**
 * Frontend JS syntax & structure tests
 * Проверяет что весь клиентский JavaScript валиден и содержит нужные функции.
 * Самая важная проверка перед деплоем — ловит все синтаксические ошибки.
 */

// frontend.js не требует DB или других модулей, мокать ничего не нужно
const FRONTEND_HTML = require('../src/frontend.js');

describe('Frontend HTML export', () => {
  it('экспортирует строку с HTML', () => {
    expect(typeof FRONTEND_HTML).toBe('string');
    expect(FRONTEND_HTML).toContain('<!DOCTYPE html>');
    expect(FRONTEND_HTML).toContain('</html>');
  });

  it('содержит обязательные meta-теги', () => {
    expect(FRONTEND_HTML).toContain('charset="UTF-8"');
    expect(FRONTEND_HTML).toContain('viewport');
  });
});

describe('Frontend JS — синтаксис', () => {
  let scripts;

  beforeAll(() => {
    scripts = FRONTEND_HTML.match(/<script>([\s\S]*?)<\/script>/g) || [];
  });

  it('содержит хотя бы один <script> блок', () => {
    expect(scripts.length).toBeGreaterThan(0);
  });

  it('все <script> блоки — валидный JavaScript', () => {
    const errors = [];
    scripts.forEach((s, i) => {
      const body = s.replace(/<\/?script>/g, '');
      try {
        new Function(body); // eslint-disable-line no-new-func
      } catch (e) {
        errors.push(`Блок ${i}: ${e.message}`);
      }
    });
    if (errors.length > 0) {
      throw new Error('Синтаксические ошибки в JS:\n' + errors.join('\n'));
    }
  });
});

describe('Frontend JS — обязательные функции', () => {
  // Используем regex: матчит и `function fn(` и `async function fn(`
  const required = [
    'showEntity',
    'showFinancePage',
    'showBudgetPage',
    'openCreateModal',
    'openEditModal',
    'toggleExpense',
    'sendAIMessage',
    'escapeHtml',
    'api',
  ];

  required.forEach(fn => {
    it(`содержит функцию ${fn}`, () => {
      expect(FRONTEND_HTML).toMatch(new RegExp('function\\s+' + fn + '[\\s(]'));
    });
  });
});

describe('Frontend JS — нет запрещённых паттернов', () => {
  it('нет незакрытых template literals с backtick в onclick', () => {
    // Проверяем что нет `\'` внутри onclick (классическая ошибка)
    // Признак проблемы: toggleExpense('') с пустой строкой в onclick
    expect(FRONTEND_HTML).not.toMatch(/onclick="toggleExpense\(''\)/);
    expect(FRONTEND_HTML).not.toMatch(/onclick="toggleDebtor\(''\)/);
  });
});
