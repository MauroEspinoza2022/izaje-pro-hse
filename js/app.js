const authModal = document.querySelector('#auth-modal');
const app = document.querySelector('#app');

function renderLogin() {
  authModal.innerHTML = `
    <form class="auth-card" id="login-form">
      <div class="brand"><img src="assets/haug-logo.svg" alt="HAUG"><div>
        <div class="eyebrow">Portal SSOMA</div><strong>HAUG S.A.</strong>
      </div></div>
      <h1>Ingresar al portal</h1>
      <p class="muted">Matriz de Izaje Crítico y supervisión HSE.</p>
      <label>Usuario o DNI<input name="dni" autocomplete="username" required></label>
      <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="error" id="login-error" role="alert"></p>
      <button class="primary" type="submit">Ingresar</button>
    </form>`;
  authModal.classList.remove('is-hidden');
  document.querySelector('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('dni') || !form.get('password')) {
      document.querySelector('#login-error').textContent = 'Ingrese usuario y contraseña.';
      return;
    }
    renderDashboard();
  });
}

function renderDashboard() {
  authModal.classList.add('is-hidden');
  app.style.display = 'block';
  app.innerHTML = `
    <header class="topbar">
      <div class="brand"><img src="assets/haug-logo.svg" alt="HAUG"><div><div class="eyebrow">HAUG SSOMA</div><strong>Portal de Izaje Crítico</strong></div></div>
      <button class="primary" id="logout" type="button">Cerrar sesión</button>
    </header>
    <main class="grid">
      <section class="panel hero"><div><div class="eyebrow">Panel de control</div><h1>Supervisión segura de maniobras</h1><p class="muted">Evalúe capacidad, aparejos y equipos auxiliares antes de iniciar el izaje.</p></div><div class="status">● Sistema operativo</div></section>
      <section class="panel"><div class="module-title"><h2>Evaluación rápida</h2><span>GRÚAS MÓVILES</span></div>
        <label>Categoría<select id="category-options"><option value="mobile">Grúa móvil</option><option value="fixed">Puente grúa</option><option value="rigging">Aparejos</option></select></label>
        <label>Equipo<select id="equipment-options"><option>Grúa móvil</option><option>Camión grúa</option></select></label>
        <button class="primary" data-run="mobile" type="button">Evaluar escenario</button>
        <div data-result-panel="mobile"><p class="result-chip">LISTO PARA EVALUAR</p><ul class="result-list"><li>Verifique viento, carga y radio de trabajo.</li><li>Registre el permiso de izaje.</li></ul></div>
      </section>
      <section class="panel"><div class="module-title"><h2>Indicadores HSE</h2><span>EN TIEMPO REAL</span></div><p class="muted">Escenarios evaluados</p><h2>0</h2><p class="muted">Alertas preventivas</p><h2>0</h2></section>
      <section class="panel"><div class="module-title"><h2>Documentación</h2><span>REFERENCIA</span></div><p class="muted">Consulte procedimientos, tablas de carga y criterios de seguridad antes de aprobar una maniobra.</p><button class="primary" type="button">Abrir biblioteca</button></section>
    </main>`;
  document.querySelector('#logout').addEventListener('click', () => { app.style.display = 'none'; renderLogin(); });
  document.querySelector('#category-options').addEventListener('change', (event) => {
    const options = { mobile: ['Grúa móvil', 'Camión grúa'], fixed: ['Puente grúa', 'Pórtico'], rigging: ['Eslingas', 'Grilletes'] };
    document.querySelector('#equipment-options').innerHTML = options[event.target.value].map((item) => `<option>${item}</option>`).join('');
  });
}

renderLogin();
