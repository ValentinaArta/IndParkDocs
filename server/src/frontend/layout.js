module.exports = `</head>
<body>

<div id="loginScreen" style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg)">
  <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);width:340px;max-width:90vw">
    <h2 style="margin-bottom:4px">IndParkDocs</h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:24px">Документы и связи</p>
    <div class="form-group"><label>Логин</label><input id="loginUser" placeholder="username" onkeydown="if(event.key==='Enter')document.getElementById('loginPass').focus()"></div>
    <div class="form-group"><label>Пароль</label><input id="loginPass" type="password" placeholder="••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div id="totpGroup" class="form-group" style="display:none"><label>Код 2FA</label><input id="loginTotp" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div id="loginError" style="color:var(--red);font-size:12px;margin-bottom:8px"></div>
    <button class="btn btn-primary" style="width:100%" onclick="doLogin()">Войти</button>
  </div>
</div>

<div class="app" style="display:none">
  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>IndParkDocs</h1>
      <p>Документы и связи</p>
    </div>
    <div class="sidebar-nav" id="sidebarNav">
      <div class="nav-item active" onclick="showMapPage()">
        <i data-lucide="map" class="lucide"></i> Карта
      </div>
      <div id="typeNav"></div>
      <div class="nav-section" style="margin-top:12px">Аналитика</div>
      <div class="nav-item" onclick="showReports()">
        <i data-lucide="bar-chart-2" class="lucide"></i> Отчёты
      </div>
      <div class="nav-item" onclick="showBIPage()">
        <i data-lucide="pie-chart" class="lucide"></i> BI-дашборды
      </div>
      <div class="nav-item" onclick="showFinancePage()">
        <i data-lucide="landmark" class="lucide"></i> Расходы
      </div>
      <div class="nav-item" onclick="window.open('/finance','_blank')">
        <i data-lucide="banknote" class="lucide"></i> Должники
      </div>
      <div class="nav-item" onclick="showBudgetPage()">
        <i data-lucide="trending-up" class="lucide"></i> Бюджеты
      </div>
      <div class="nav-item" onclick="showCubePage()">
        <i data-lucide="box" class="lucide"></i> Куб
      </div>
      <div class="nav-section" style="margin-top:12px">Суды и пр.</div>
      <div class="nav-item" onclick="showLegalZachety()">
        <i data-lucide="scale" class="lucide"></i> Зачёты с ПАО
      </div>
      <div class="nav-section" style="margin-top:12px">Настройки</div>
      <div class="nav-item" onclick="showSettings()">
        <i data-lucide="settings" class="lucide"></i> Типы и поля
      </div>
      <div class="nav-item" onclick="showTotpSetup()" style="margin-top:auto;color:rgba(255,255,255,0.6)">
        <i data-lucide="shield" class="lucide"></i> 2FA
      </div>
      <div class="nav-item" onclick="logout()" style="color:rgba(255,255,255,0.4)">
        <i data-lucide="log-out" class="lucide"></i> Выход
      </div>
    </div>
  </div>

  <div id="sidebarOverlay" class="sidebar-overlay" onclick="toggleSidebar()"></div>
  <div class="main">
    <div class="topbar" id="topbar">
      <button class="btn btn-sm" onclick="toggleSidebar()" id="menuBtn">☰</button>
      <h2 id="pageTitle">Карта</h2>
      <div class="breadcrumb" id="breadcrumb"></div>
      <div class="actions" id="topActions"></div>
    </div>
    <div class="content" id="content"></div>
  </div>
</div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal" id="modal"></div>
</div>
`;
