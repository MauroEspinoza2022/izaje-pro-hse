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

function engineeringFields() {
  return `
    <section class="panel" data-model-panel="all"><h2>5. Geometría, centro de gravedad y estabilidad</h2>
      ${field('cgX', 'Centro de gravedad longitudinal', 0, 'm', '0.01')}
      ${field('cgY', 'Centro de gravedad transversal', 0, 'm', '0.01')}
      ${field('cgZ', 'Altura del centro de gravedad', 2, 'm', '0.01')}
      ${field('supportArea', 'Área efectiva de apoyo', 4, 'm²', '0.01')}
      ${field('maxGroundPressure', 'Presión admisible del terreno', 20, 't/m²', '0.1')}
      <label>Estabilidad / cálculo estructural<select name="stabilityVerified"><option value="yes">Verificada por persona competente</option><option value="no">Pendiente de verificar</option></select></label>
    </section>
    <section class="panel" data-model-panel="lifting-points"><h2>6. Orejas, puntos de izaje y conectores</h2>
      ${field('liftPoints', 'Puntos de izaje efectivos', 2, 'puntos', '1')}
      ${field('lugWll', 'Capacidad admisible de cada oreja', 8, 't', '0.01')}
      ${field('connectorWll', 'Capacidad del conector crítico', 8, 't', '0.01')}
      <label>Inspección de orejas y soldaduras<select name="lugInspection"><option value="yes">Inspeccionadas / certificadas</option><option value="no">Pendientes</option></select></label>
      <label>Orientación de conectores<select name="connectorOrientation"><option>En línea con la carga</option><option>Con componente lateral</option></select></label>
    </section>
    <section class="panel" data-model-panel="movement"><h2>7. Movimiento, trayectoria y control</h2>
      <label>Tipo de maniobra<select name="movementMode"><option value="lift">Elevación vertical</option><option value="travel">Traslado con carga suspendida</option><option value="rotate">Giro / reorientación</option><option value="place">Posicionamiento de precisión</option></select></label>
      ${field('routeLength', 'Longitud de trayectoria', 10, 'm', '0.1')}
      ${field('travelSpeed', 'Velocidad máxima prevista', 0.5, 'km/h', '0.1')}
      ${field('minClearance', 'Separación libre mínima', 2, 'm', '0.1')}
      ${field('requiredClearance', 'Separación requerida por plan', 1, 'm', '0.1')}
      <label>Ruta, interferencias y líneas eléctricas<select name="routeVerified"><option value="yes">Verificadas en campo</option><option value="no">Pendientes</option></select></label>
      <label>Control de carga / vientos guía<select name="loadControl"><option value="yes">Definido y disponible</option><option value="no">Pendiente</option></select></label>
    </section>
    <section class="panel" data-model-panel="tandem"><h2>8. Coordinación tándem</h2>
      <label>Sincronización de operadores<select name="tandemSync"><option value="yes">Procedimiento y comunicación probados</option><option value="no">Pendientes</option></select></label>
      <label>Secuencia de toma y transferencia<select name="tandemSequence"><option value="yes">Definida paso a paso</option><option value="no">Pendiente</option></select></label>
      ${field('maxShareDeviation', 'Desviación máxima permitida de reparto', 10, '%', '0.1')}
    </section>`;
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
              <label>Número de grúas<select name="craneCount" id="crane-count"><option value="1">1 grúa</option><option value="2">2 grúas</option><option value="3">3 grúas</option></select></label>
              ${field('capacity', 'Capacidad de tabla a esta configuración', 8, 't', '0.01')}
              ${field('chartRadius', 'Radio correspondiente de la tabla', 10, 'm', '0.1')}
              ${field('capacity2', 'Capacidad grúa 2 (tándem)', 8, 't', '0.01')}
              ${field('capacity3', 'Capacidad grúa 3 (tándem)', 8, 't', '0.01')}
              ${field('radius2', 'Radio grúa 2 (tándem)', 10, 'm', '0.1')}
              ${field('radius3', 'Radio grúa 3 (tándem)', 10, 'm', '0.1')}
              ${field('wind', 'Viento previsto', 20, 'km/h', '0.1')}
              ${field('windLimit', 'Límite del fabricante / plan', 30, 'km/h', '0.1')}
              ${field('groundBearing', 'Capacidad admisible del terreno', 20, 't/m²', '0.1')}
            </section>
            <section class="panel"><h2>3. Aparejos y geometría</h2>
              ${field('legs', 'Ramales efectivos', 2, 'ramales', '1')}
              ${field('angle', 'Ángulo del ramal respecto a horizontal', 60, '°', '0.1')}
              ${field('slingWll', 'WLL por ramal', 4, 't', '0.01')}
              ${field('hookWll', 'WLL de grilletes / ganchos', 8, 't', '0.01')}
              <label>Tipo de accesorio<select name="accessoryType"><option>Eslinga sintética</option><option>Eslinga de cable</option><option>Eslinga de cadena</option><option>Viga separadora</option><option>Balancín</option><option>Grilletes y herrajes</option></select></label>
              <label>Acreditación de equipos<select name="accreditation"><option value="yes">Vigente y disponible</option><option value="no">No disponible</option></select></label>
              ${field('projectedArea', 'Área proyectada al viento', 4, 'm²', '0.1')}
            </section>
            <section class="panel"><h2>4. Equipos adicionales y reparto</h2>
              ${field('centerOffset', 'Desfase del centro de gravedad', 0, 'm', '0.1')}
              ${field('craneSpacing', 'Distancia entre grúas', 10, 'm', '0.1')}
              ${field('boomLength', 'Longitud de pluma / recorrido', 20, 'm', '0.1')}
              ${field('liftHeight', 'Altura de elevación', 5, 'm', '0.1')}
              ${field('auxWll', 'WLL equipo auxiliar / balancín', 10, 't', '0.01')}
              <label>Memoria y certificado del equipo auxiliar<select name="auxAccreditation"><option value="yes">Verificados</option><option value="no">Pendientes</option></select></label>
              <p class="muted">En tándem, ingrese la capacidad de cada grúa en su radio real y documente el reparto aprobado.</p>
            </section>
          </div>
          <div class="form-grid engineering-grid">${engineeringFields()}</div>
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
  const craneCount = document.querySelector('#crane-count');
  const configuration = document.querySelector('#configuration');
  const updateModelPanels = () => {
    const tandemActive = configuration.value === 'tandem' || Number(craneCount.value) > 1;
    document.querySelectorAll('[data-model-panel="tandem"]').forEach((panel) => {
      panel.style.display = tandemActive ? 'block' : 'none';
    });
  };
  craneCount.addEventListener('change', () => {
    const count = Number(craneCount.value);
    document.querySelector('[name=capacity2]').closest('label').style.display = count >= 2 ? 'grid' : 'none';
    document.querySelector('[name=capacity3]').closest('label').style.display = count >= 3 ? 'grid' : 'none';
    document.querySelector('[name=radius2]').closest('label').style.display = count >= 2 ? 'grid' : 'none';
    document.querySelector('[name=radius3]').closest('label').style.display = count >= 3 ? 'grid' : 'none';
    updateModelPanels();
  });
  configuration.addEventListener('change', updateModelPanels);
  craneCount.dispatchEvent(new Event('change'));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const load = number(data, 'payload') + number(data, 'rigging') + number(data, 'belowHook');
    const designLoad = load * number(data, 'dynamic', 1);
    const capacity = number(data, 'capacity');
    const craneCountValue = Math.min(3, Math.max(1, number(data, 'craneCount', 1)));
    const capacities = [capacity, number(data, 'capacity2'), number(data, 'capacity3')].slice(0, craneCountValue);
    const craneRadii = [number(data, 'chartRadius'), number(data, 'radius2'), number(data, 'radius3')].slice(0, craneCountValue);
    const centerOffset = number(data, 'centerOffset');
    const craneSpacing = Math.max(0.1, number(data, 'craneSpacing'));
    const shareFactor = craneCountValue === 1 ? [1] : capacities.map((_, index) => {
      const position = index - (craneCountValue - 1) / 2;
      return Math.max(0.05, 1 / craneCountValue + (centerOffset / craneSpacing) * position);
    });
    const craneLoads = shareFactor.map((share) => designLoad * share);
    const utilization = capacity ? designLoad / capacity : Infinity;
    const angle = Math.min(89.9, Math.max(0.1, number(data, 'angle')));
    const legs = Math.max(1, number(data, 'legs', 1));
    const slingTension = designLoad / (legs * Math.sin(angle * Math.PI / 180));
    const windForce = 0.5 * 1.225 * 0.9 * number(data, 'projectedArea') * (number(data, 'wind') / 3.6) ** 2 / 9.80665;
    const liftPoints = Math.max(1, number(data, 'liftPoints', 1));
    const loadPerPoint = designLoad / liftPoints;
    const groundPressure = designLoad / Math.max(0.01, number(data, 'supportArea'));
    const maxShare = Math.max(...shareFactor);
    const minShare = Math.min(...shareFactor);
    const shareDeviation = minShare ? ((maxShare - minShare) / minShare) * 100 : Infinity;
    const warnings = [];
    if (capacities.some((value) => !value) || craneRadii.some((value) => value < number(data, 'radius'))) warnings.push('Falta la capacidad de tabla de una grúa o el radio real supera el radio documentado.');
    craneLoads.forEach((loadForCrane, index) => {
      const craneUtilization = capacities[index] ? loadForCrane / capacities[index] : Infinity;
      if (craneUtilization > 1) warnings.push(`Sobrecarga en grúa ${index + 1}: utilización ${(craneUtilization * 100).toFixed(1)}%.`);
    });
    if (utilization > 1 && craneCountValue === 1) warnings.push(`Sobrecarga: utilización ${(utilization * 100).toFixed(1)}%.`);
    if (number(data, 'wind') > number(data, 'windLimit')) warnings.push('Viento superior al límite establecido por fabricante o plan.');
    if (slingTension > number(data, 'slingWll')) warnings.push('La tensión calculada supera la WLL de un ramal.');
    if (slingTension * legs > number(data, 'hookWll')) warnings.push('La conexión o grilletes no soportan la carga calculada.');
    if (data.get('accreditation') !== 'yes') warnings.push('Los aparejos o accesorios no tienen acreditación vigente.');
    if (data.get('auxAccreditation') !== 'yes') warnings.push('El equipo auxiliar requiere memoria de cálculo y acreditación antes del izaje.');
    if (loadPerPoint > number(data, 'lugWll')) warnings.push(`La carga por punto (${loadPerPoint.toFixed(2)} t) supera la capacidad de una oreja.`);
    if (loadPerPoint > number(data, 'connectorWll')) warnings.push(`La carga por punto (${loadPerPoint.toFixed(2)} t) supera la capacidad del conector crítico.`);
    if (data.get('lugInspection') !== 'yes') warnings.push('Orejas, soldaduras o puntos de izaje pendientes de inspección/certificación.');
    if (data.get('connectorOrientation') === 'Con componente lateral') warnings.push('El componente lateral del conector requiere verificación estructural específica.');
    if (groundPressure > number(data, 'maxGroundPressure')) warnings.push(`Presión estimada de apoyo (${groundPressure.toFixed(2)} t/m²) supera la admisible.`);
    if (data.get('stabilityVerified') !== 'yes') warnings.push('La estabilidad global y el centro de gravedad no han sido verificados por persona competente.');
    if (number(data, 'minClearance') < number(data, 'requiredClearance')) warnings.push('La trayectoria no cumple la separación libre mínima requerida.');
    if (data.get('routeVerified') !== 'yes') warnings.push('Ruta, interferencias y líneas eléctricas pendientes de verificación en campo.');
    if (data.get('loadControl') !== 'yes') warnings.push('Falta definir control de carga, vientos guía o método de retención.');
    if (craneCountValue > 1 && data.get('tandemSync') !== 'yes') warnings.push('El tándem requiere comunicación y sincronización probadas.');
    if (craneCountValue > 1 && data.get('tandemSequence') !== 'yes') warnings.push('El tándem requiere secuencia de toma, elevación, traslado y entrega aprobada.');
    if (craneCountValue > 1 && shareDeviation > number(data, 'maxShareDeviation', 10)) warnings.push(`El reparto tándem excede la desviación permitida (${shareDeviation.toFixed(1)}%).`);
    state.result = { ...Object.fromEntries(data), load, designLoad, utilization, slingTension, windForce, craneLoads, capacities, craneRadii, liftPoints, loadPerPoint, groundPressure, shareDeviation, warnings, safe: warnings.length === 0 };
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
    <p><strong>Reparto tándem:</strong> ${result.craneLoads.map((load, index) => `Grúa ${index + 1}: ${load.toFixed(2)} t / capacidad ${result.capacities[index].toFixed(2)} t`).join(' · ')}</p>
    <table class="verification-table"><tbody><tr><th>Verificación</th><th>Resultado</th><th>Criterio</th></tr><tr><td>Carga por punto de izaje</td><td>${result.loadPerPoint.toFixed(2)} t</td><td>WLL oreja ${result.lugWll} t / conector ${result.connectorWll} t</td></tr><tr><td>Presión de apoyo</td><td>${result.groundPressure.toFixed(2)} t/m²</td><td>Admisible ${result.maxGroundPressure} t/m²</td></tr><tr><td>Desviación de reparto</td><td>${result.shareDeviation.toFixed(1)}%</td><td>Máxima ${result.maxShareDeviation}%</td></tr><tr><td>Centro de gravedad</td><td>${result.cgX} m, ${result.cgY} m, ${result.cgZ} m</td><td>Verificación: ${result.stabilityVerified === 'yes' ? 'documentada' : 'pendiente'}</td></tr></tbody></table>
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
      ${r ? `<table><tbody><tr><th>Configuración</th><td>${configNames[r.configuration]}</td></tr><tr><th>Carga total / diseño</th><td>${r.load.toFixed(2)} t / ${r.designLoad.toFixed(2)} t</td></tr><tr><th>Reparto por grúa</th><td>${r.craneLoads.map((load, index) => `G${index + 1}: ${load.toFixed(2)} t de ${r.capacities[index].toFixed(2)} t`).join(' · ')}</td></tr><tr><th>Radio / capacidad</th><td>${r.radius} m / ${r.capacity} t</td></tr><tr><th>Utilización máxima</th><td>${Math.max(...r.craneLoads.map((load, index) => load / r.capacities[index] * 100)).toFixed(1)}%</td></tr><tr><th>Carga por punto / apoyo</th><td>${r.loadPerPoint.toFixed(2)} t / ${r.groundPressure.toFixed(2)} t/m²</td></tr><tr><th>Trayectoria</th><td>${r.movementMode}; despeje ${r.minClearance} m de ${r.requiredClearance} m requerido</td></tr><tr><th>Dictamen</th><td>${r.safe ? 'APTO CONDICIONADO' : 'NO APTO / REVISAR'}</td></tr></tbody></table>` : '<p class="notice">Ejecute la calculadora para incorporar la memoria.</p>'}
      <h3>Controles obligatorios antes de iniciar</h3><ol class="plan-list"><li>Tabla de carga, manual, inspecciones y certificados disponibles.</li><li>Terreno, nivelación, estabilizadores y capacidad de apoyo verificados.</li><li>Rigging identificado, inspeccionado y con WLL legible.</li><li>Señalero designado, comunicación probada y zona de exclusión delimitada.</li><li>Ruta, interferencias, líneas eléctricas, clima y emergencia revisados.</li></ol>
      <h3>Controles según el modelo</h3><ol class="plan-list"><li>Centro de gravedad: (${r ? `${r.cgX}, ${r.cgY}, ${r.cgZ} m` : 'pendiente'}); validar estabilidad y evitar inclinación o giro no controlado.</li><li>Orejas, soldaduras, conectores y puntos de izaje: verificar diseño, inspección, orientación de carga y capacidad admisible.</li><li>Movimiento: documentar secuencia, velocidad, radios, despejes, obstáculos, líneas eléctricas, vientos guía y comunicación.</li><li>Tándem: validar reparto por grúa, sincronización, transferencia de carga, radios independientes y criterio de parada.</li></ol>
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
