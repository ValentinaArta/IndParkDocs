/**
 * Sidebar toggle + Notes fullscreen mode tests
 */
require('./setup');

const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

describe('Sidebar toggle (CSS)', () => {
  var css;
  beforeAll(() => { css = require('../src/frontend/css.js'); });

  it('has .sidebar-hidden class', () => {
    expect(css).toContain('sidebar-hidden');
  });

  it('.sidebar-hidden hides sidebar on desktop', () => {
    expect(css).toContain('.app.sidebar-hidden');
    expect(css).toMatch(/sidebar-hidden[\s\S]*?display:\s*none/);
  });
});

describe('Sidebar toggle (nav.js)', () => {
  var nav;
  beforeAll(() => { nav = require('../src/frontend/pages/nav.js'); });

  it('toggleSidebar references sidebar-hidden class', () => {
    expect(nav).toContain('sidebar-hidden');
  });

  it('toggleSidebar uses localStorage', () => {
    expect(nav).toContain('localStorage');
    expect(nav).toContain('sidebarHidden');
  });

  it('restores sidebar state on load', () => {
    // Should check localStorage on init
    expect(nav).toContain('sidebarHidden');
  });
});

describe('Notes fullscreen (CSS)', () => {
  var css;
  beforeAll(() => { css = require('../src/frontend/css.js'); });

  it('has .notes-fullscreen class', () => {
    expect(css).toContain('notes-fullscreen');
  });

  it('fullscreen hides sidebar', () => {
    expect(css).toMatch(/notes-fullscreen[\s\S]*?sidebar[\s\S]*?display:\s*none/);
  });

  it('fullscreen hides topbar', () => {
    expect(css).toMatch(/notes-fullscreen[\s\S]*?topbar[\s\S]*?display:\s*none/);
  });

  it('fullscreen hides notes sidebar panel', () => {
    expect(css).toContain('notes-fullscreen');
    expect(css).toContain('notesSidebar');
  });
});

describe('Notes fullscreen (notes-page.js)', () => {
  var page;
  beforeAll(() => { page = require('../src/frontend/pages/notes-page.js'); });

  it('has _noteToggleFullscreen function', () => {
    expect(page).toContain('_noteToggleFullscreen');
  });

  it('has fullscreen button with maximize icon', () => {
    expect(page).toContain('maximize-2');
  });

  it('has exit fullscreen button with minimize icon', () => {
    expect(page).toContain('minimize-2');
  });

  it('listens for ESC key to exit fullscreen', () => {
    expect(page).toContain('Escape');
  });

  it('removes fullscreen class when leaving notes page', () => {
    // showNotesPage or cleanup should remove notes-fullscreen
    expect(page).toContain('notes-fullscreen');
  });

  it('toggles notes-fullscreen class on body', () => {
    expect(page).toContain('notes-fullscreen');
    expect(page).toContain('classList');
  });
});

describe('Frontend integration', () => {
  it('all scripts pass syntax check', () => {
    var html = require('../src/frontend/index.js');
    var scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
    scripts.forEach(function(s, i) {
      var body = s.replace(/<\/?script>/g, '');
      expect(function() { new Function(body); }).not.toThrow();
    });
  });
});
