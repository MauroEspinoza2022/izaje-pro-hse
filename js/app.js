const authModal = document.querySelector('#auth-modal');
const app = document.querySelector('#app');
const state = {
  result: null,
  plan: {},
  checks: new Set(),
};

const configNames = {
  mobile: 'Grúa móvil / camión grúa',
  tower: 'Grúa torre',
  overhead: 'Puente grúa / grúa pórtico',
  tandem: 'Izaje tándem o múltiple',
  rigging: 'Aparejos y accesorios',
  hoist: 'Tecles, winches, tirfor y gatas',
  other: 'Otro equipo de izaje',
};

function renderLogin() {
  authModal.innerHTML = `
    <form class="auth-card" id="login-form">
      <div class="brand"><img src="assets/haug-logo.svg" alt="HAUG"><div>
        <div class="eyebrow">Portal SSOMA</div><strong>HAUG S.A.</strong>
      </div></div>
      <h1>Ingresar al portal</h1>
      <p class="muted">Calculadora y plan profesional de izaje.</p>
      <label>Usuario o DNI<input name="dni" autocomplete="username" required></label>
      <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="error" id="login-error" role="alert"></p>
      <button class="primary" type="submit">Ingresar</button>
    </form>`;
  authModal.classList.remove('is-hidden');
  document.querySelector('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('dni') !== 'admin' || form.get('password') !== 'admin') {
      document.querySelector('#login-error').textContent = 'Credenciales inválidas. Use admin / admin.';
      return;
    }
    renderDashboard();
  });
}

function number(form, name, fallback = 0) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function field(name, label, value, unit, step = 'any') {
  const isText = unit === 'texto' || unit === 'nombre' || unit === 'ID';
  return `<label>${label}<div class="input-unit"><input name="${name}" value="${value}" type="${isText ? 'text' : 'number'}" ${isText ? '' : 'min="0"'} step="${step}" ${isText ? '' : 'required'}><span>${unit}</span></div></label>`;
}

function renderDashboard() {
  authModal.classList.add('is-hidden');
  app.style.display = 'block';
  app.innerHTML = `
    <header class="topbar">
      <div class="brand"><img src="assets/haug-logo.svg" alt="HAUG"><div><div class="eyebrow">HAUG SSOMA</div><strong>Portal profesional de izaje</strong></div></div>
      <button class="secondary" id="logout" type="button">Cerrar sesión</button>
    </header>
    <nav class="tabs" aria-label="Secciones">
      <button class="tab active" data-tab="calculator">Calculadora</button>
      <button class="tab" data-tab="plan">Plan de izaje</button>
      <button class="tab" data-tab="checklist">Checklist</button>
      <button class="tab" data-tab="references">Normativa</button>
    </nav>
    <main>
      <section class="view active" id="calculator-view">
        <div class="section-heading"><div><div class="eyebrow">Evaluación verificable</div><h1>Calculadora de izaje</h1><p class="muted">Ingrese la tabla vigente del fabricante. Sin capacidad documentada, el resultado queda bloqueado.</p></div><div class="status">● Modo mixto: t · kN · m · km/h</div></div>
        <form id="calculation-form">
          <div class="form-grid">
            <section class="panel"><h2>1. Configuración y carga</h2>
              <label>Configuración<select name="configuration" id="configuration">
                ${Object.entries(configNames).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}
              </select></label>
              ${field('payload', 'Carga neta', 5, 't', '0.01')}
              ${field('rigging', 'Aparejos y accesorios', 0.2, 't', '0.01')}
              ${field('belowHook', 'Dispositivo bajo gancho', 0, 't', '0.01')}
              ${field('dynamic', 'Factor dinámico de diseño', 1.1, 'x', '0.01')}
              ${field('radius', 'Radio de operación', 10, 'm', '0.1')}
            </section>
            <section class="panel"><h2>2. Capacidad documentada</h2>
              ${field('capacity', 'Capacidad de tabla a esta configuración', 8, 't', '0.01')}
              ${field('chartRadius', 'Radio correspondiente de la tabla', 10, 'm', '0.1')}
              ${field('wind', 'Viento previsto', 20, 'km/h', '0.1')}
              ${field('windLimit', 'Límite del fabricante / plan', 30, 'km/h', '0.1')}
              ${field('groundBearing', 'Capacidad admisible del terreno', 20, 't/m²', '0.1')}
            </section>
            <section class="panel"><h2>3. Aparejos y geometría</h2>
              ${field('legs', 'Ramales efectivos', 2, 'ramales', '1')}
              ${field('angle', 'Ángulo del ramal respecto a horizontal', 60, '°', '0.1')}
              ${field('slingWll', 'WLL por ramal', 4, 't', '0.01')}
              ${field('hookWll', 'WLL de grilletes / ganchos', 8, 't', '0.01')}
              ${field('projectedArea', 'Área proyectada al viento', 4, 'm²', '0.1')}
            </section>
          </div>
          <div class="actions"><button class="primary" type="submit">Calcular y validar</button><button class="secondary" id="reset-form" type="button">Restablecer</button></div>
        </form>
        <div id="result" class="result-area" aria-live="polite"></div>
      </section>
      <section class="view" id="plan-view"><div id="plan-content"></div></section>
      <section class="view" id="checklist-view"><div id="checklist-content"></div></section>
      <section class="view" id="references-view"><div id="references-content"></div></section>
    </main>`;
  bindNavigation();
  bindCalculator();
  renderPlan();
  renderChecklist();
  renderReferences();
}

function bindNavigation() {
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab, .view').forEach((element) => element.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#${tab.dataset.tab}-view`).classList.add('active');
  }));
  document.querySelector('#logout').addEventListener('click', () => {
    app.style.display = 'none';
    renderLogin();
  });
}

function bindCalculator() {
  const form = document.querySelector('#calculation-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const load = number(data, 'payload') + number(data, 'rigging') + number(data, 'belowHook');
    const designLoad = load * number(data, 'dynamic', 1);
    const capacity = number(data, 'capacity');
    const utilization = capacity ? designLoad / capacity : Infinity;
    const angle = Math.min(89.9, Math.max(0.1, number(data, 'angle')));
    const legs = Math.max(1, number(data, 'legs', 1));
    const slingTension = designLoad / (legs * Math.sin(angle * Math.PI / 180));
    const windForce = 0.5 * 1.225 * 0.9 * number(data, 'projectedArea') * (number(data, 'wind') / 3.6) ** 2 / 9.80665;
    const warnings = [];
    if (!capacity || number(data, 'chartRadius') < number(data, 'radius')) warnings.push('La capacidad documentada no corresponde al radio ingresado o está vacía.');
    if (utilization > 1) warnings.push(`Sobrecarga: utilización ${(utilization * 100).toFixed(1)}%.`);
    if (number(data, 'wind') > number(data, 'windLimit')) warnings.push('Viento superior al límite establecido por fabricante o plan.');
    if (slingTension > number(data, 'slingWll')) warnings.push('La tensión calculada supera la WLL de un ramal.');
    if (slingTension * legs > number(data, 'hookWll')) warnings.push('La conexión o grilletes no soportan la carga calculada.');
    state.result = { ...Object.fromEntries(data), load, designLoad, utilization, slingTension, windForce, warnings, safe: warnings.length === 0 };
    renderResult();
    renderPlan();
  });
  document.querySelector('#reset-form').addEventListener('click', () => {
    form.reset();
    document.querySelector('#result').innerHTML = '';
  });
}

function renderResult() {
  const result = state.result;
  const status = result.safe ? 'APTO CONDICIONADO' : 'NO APTO / REVISAR';
  document.querySelector('#result').innerHTML = `
    <section class="panel result-card ${result.safe ? 'pass' : 'fail'}"><div class="result-header"><div><div class="eyebrow">Dictamen preliminar</div><h2>${status}</h2></div><strong>${(result.utilization * 100).toFixed(1)}% utilización</strong></div>
    <div class="metrics"><div><span>Carga de diseño</span><strong>${result.designLoad.toFixed(2)} t</strong></div><div><span>Tensión por ramal</span><strong>${result.slingTension.toFixed(2)} t</strong></div><div><span>Fuerza de viento estimada</span><strong>${result.windForce.toFixed(2)} kN</strong></div></div>
    <ul class="warnings">${(result.warnings.length ? result.warnings : ['Verifique físicamente el equipo, terreno, accesorios, señalero y zona de exclusión antes de autorizar.']).map((item) => `<li>${item}</li>`).join('')}</ul>
    <p class="notice">Este resultado es una verificación preliminar y no sustituye la tabla de carga, manual del fabricante ni la aprobación de una persona competente.</p></section>`;
}

function renderPlan() {
  const r = state.result;
  document.querySelector('#plan-content').innerHTML = `
    <div class="section-heading"><div><div class="eyebrow">Documento controlado</div><h1>Plan de izaje</h1><p class="muted">Complete los datos del proyecto y use Imprimir / Guardar PDF.</p></div><button class="primary print-button" type="button" onclick="window.print()">Imprimir / PDF</button></div>
    <section class="panel plan-sheet">
      <div class="plan-title"><img src="assets/haug-logo.svg" alt="HAUG"><div><h2>PLAN DE IZAJE Y EVALUACIÓN DE RIESGOS</h2><p>Portal SSOMA · Versión 1.0 · Fecha: ${new Date().toLocaleDateString('es-PE')}</p></div></div>
      <div class="form-grid compact">${field('project', 'Proyecto / frente', '', 'texto')} ${field('location', 'Ubicación', '', 'texto')} ${field('supervisor', 'Persona competente', '', 'nombre')} ${field('equipmentId', 'Equipo / código', '', 'ID')}</div>
      <h3>Resultado de la memoria de cálculo</h3>
      ${r ? `<table><tbody><tr><th>Configuración</th><td>${configNames[r.configuration]}</td></tr><tr><th>Carga total / diseño</th><td>${r.load.toFixed(2)} t / ${r.designLoad.toFixed(2)} t</td></tr><tr><th>Radio / capacidad</th><td>${r.radius} m / ${r.capacity} t</td></tr><tr><th>Utilización</th><td>${(r.utilization * 100).toFixed(1)}%</td></tr><tr><th>Dictamen</th><td>${r.safe ? 'APTO CONDICIONADO' : 'NO APTO / REVISAR'}</td></tr></tbody></table>` : '<p class="notice">Ejecute la calculadora para incorporar la memoria.</p>'}
      <h3>Controles obligatorios antes de iniciar</h3><ol class="plan-list"><li>Tabla de carga, manual, inspecciones y certificados disponibles.</li><li>Terreno, nivelación, estabilizadores y capacidad de apoyo verificados.</li><li>Rigging identificado, inspeccionado y con WLL legible.</li><li>Señalero designado, comunicación probada y zona de exclusión delimitada.</li><li>Ruta, interferencias, líneas eléctricas, clima y emergencia revisados.</li></ol>
      <div class="signatures"><span>Elaboró / fecha</span><span>Revisó / fecha</span><span>Aprobó / fecha</span></div>
    </section>`;
}

function renderChecklist() {
  const items = ['Plan, permiso y análisis de riesgos aprobados', 'Persona competente y señalero designados', 'Tabla de carga vigente y radio medido', 'Inspección pre-uso de grúa / polipasto completada', 'Eslingas, grilletes, ganchos y accesorios identificados', 'Carga asegurada y centro de gravedad controlado', 'Terreno, apoyos y estabilizadores verificados', 'Viento y clima dentro de límites documentados', 'Zona de exclusión y ruta de carga despejadas', 'Comunicación y plan de emergencia probados'];
  document.querySelector('#checklist-content').innerHTML = `<div class="section-heading"><div><div class="eyebrow">Control operativo</div><h1>Checklist previo al izaje</h1><p class="muted">Marque cada punto y conserve el registro junto al plan.</p></div><button class="primary print-button" type="button" onclick="window.print()">Imprimir / PDF</button></div><section class="panel checklist">${items.map((item, index) => `<label><input type="checkbox" data-check="${index}">${item}</label>`).join('')}<div class="notice">No iniciar si algún control crítico no está verificado o si cambian las condiciones del plan.</div></section>`;
  document.querySelectorAll('[data-check]').forEach((input) => input.addEventListener('change', (event) => {
    if (event.target.checked) state.checks.add(event.target.dataset.check);
    else state.checks.delete(event.target.dataset.check);
  }));
}

function renderReferences() {
  document.querySelector('#references-content').innerHTML = `<div class="section-heading"><div><div class="eyebrow">Base técnica</div><h1>Normativa y límites de uso</h1><p class="muted">La aplicación apoya la planificación; la edición vigente y los requisitos locales prevalecen.</p></div></div><div class="reference-grid">
    <section class="panel"><h2>OSHA</h2><ul class="result-list"><li>29 CFR 1926 Subpart CC: grúas y torres, operación, inspección, señales, zonas de trabajo y condiciones del terreno.</li><li>29 CFR 1926.251: equipos y materiales de izaje, inspección y retiro de elementos defectuosos.</li><li>29 CFR 1910.184: eslingas.</li></ul></section>
    <section class="panel"><h2>ANSI / ASME B30</h2><ul class="result-list"><li>B30.5: grúas móviles y locomotoras.</li><li>B30.3: grúas torre; B30.2: puente grúa y pórtico; B30.16: tecles.</li><li>B30.9: eslingas; B30.10: ganchos; B30.20: dispositivos bajo gancho; B30.26: herrajes.</li></ul></section>
    <section class="panel"><h2>NIOSH y gestión HSE</h2><ul class="result-list"><li>Aplicar jerarquía de controles, evaluación de peligros, capacitación, comunicación y control de líneas eléctricas.</li><li>Incorporar requisitos del fabricante, autoridad local, ambiente de trabajo y procedimiento del empleador.</li></ul></section>
    <section class="panel"><h2>Limitación profesional</h2><p class="muted">No se reproducen tablas propietarias. La capacidad debe provenir del fabricante. La utilización, tensión, viento y advertencias son cálculos de apoyo; no certifican estabilidad, estructura, suelo ni aptitud del equipo.</p></section>
  </div>`;
}

renderLogin();
