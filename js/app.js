const authModal = document.querySelector('#auth-modal');
const app = document.querySelector('#app');
const state = {
  result: null,
  plan: {},
  checks: new Set(),
  library: JSON.parse(localStorage.getItem('haug-lift-library') || '[]'),
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

function formatValue(value, decimals = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : 'N/D';
}

function formulaTable(result) {
  const rows = [
    ['Carga total', 'Carga neta + aparejos + dispositivo bajo gancho', `${result.payload} + ${result.rigging} + ${result.belowHook}`, `${formatValue(result.load)} t`, 'Datos ingresados en la calculadora'],
    ['Carga de diseño', 'Carga total × factor dinámico', `${formatValue(result.load)} × ${result.dynamic}`, `${formatValue(result.designLoad)} t`, 'Factor del plan / criterio de ingeniería'],
    ['Utilización', 'Carga de diseño ÷ capacidad de tabla × 100', `${formatValue(result.designLoad)} ÷ ${result.capacity} × 100`, `${formatValue(result.utilization * 100, 1)} %`, 'Tabla de carga seleccionada'],
    ['Tensión por ramal', 'Carga de diseño ÷ (ramales × sen(ángulo))', `${formatValue(result.designLoad)} ÷ (${result.legs} × sen(${result.angle}°))`, `${formatValue(result.slingTension)} t`, 'Geometría ingresada; ASME B30.9 como referencia de uso seguro'],
    ['Fuerza de viento', '0.5 × ρ × Cd × área × velocidad² ÷ g', `0.5 × 1.225 × 0.9 × ${result.projectedArea} × (${result.wind} ÷ 3.6)² ÷ 9.80665`, `${formatValue(result.windForce)} kN`, 'Estimación; prevalece límite del fabricante'],
    ['Carga por punto', 'Carga de diseño ÷ puntos efectivos', `${formatValue(result.designLoad)} ÷ ${result.liftPoints}`, `${formatValue(result.loadPerPoint)} t`, 'Plano/certificado de orejas y puntos de izaje'],
    ['Presión de apoyo', 'Carga de diseño ÷ área efectiva', `${formatValue(result.designLoad)} ÷ ${result.supportArea}`, `${formatValue(result.groundPressure)} t/m²`, 'Estudio de suelo y apoyos'],
    ['Reparto tándem', '(1 ÷ n) ajustado por desfase del CG / separación', `${result.craneCount} grúas; CG ${result.centerOffset} m; separación ${result.craneSpacing} m`, result.craneLoads.map((load, index) => `G${index + 1}: ${formatValue(load)} t`).join(' · '), 'Centro de gravedad y secuencia aprobada'],
  ];
  return `<div class="formula-section"><h3>Memoria de fórmulas y trazabilidad</h3><p class="muted">Cada valor se muestra con su sustitución. Los límites del fabricante y la revisión de una persona competente prevalecen.</p><div class="formula-table-wrap"><table class="verification-table formula-table"><thead><tr><th>Concepto</th><th>Fórmula</th><th>Sustitución</th><th>Resultado</th><th>Fuente / restricción</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
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

function equipmentOptions() {
  return `<option value="">Seleccionar registro técnico</option>${state.library.map((record) => `<option value="${record.id}">${record.manufacturer || 'Sin fabricante'} · ${record.recordName} · ${record.recordType}</option>`).join('')}`;
}

function equipmentRow(index = 0) {
  return `<tr data-equipment-row>
    <td><select name="equipmentRole">${['Grúa principal', 'Grúa auxiliar', 'Camión grúa', 'Grúa torre', 'Puente grúa', 'Tecle / polipasto', 'Tirfor / winche', 'Viga separadora / balancín', 'Aparejo / conector', 'Otro'].map((role) => `<option>${role}</option>`).join('')}</select></td>
    <td><select name="equipmentRecord">${equipmentOptions()}</select></td>
    <td><input name="equipmentQuantity" type="number" min="1" step="1" value="1"></td>
    <td><input name="equipmentAssignedLoad" type="number" min="0" step="0.01" value="${index ? 0 : 5}"><span> t</span></td>
    <td><input name="equipmentCapacity" type="number" min="0" step="0.01" value=""><span> t</span></td>
    <td><select name="equipmentVerified"><option value="yes">Acreditado</option><option value="no">Pendiente</option></select></td>
    <td><button class="secondary remove-equipment" type="button">Quitar</button></td>
  </tr>`;
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
      <button class="tab" data-tab="library">Biblioteca técnica</button>
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
            <section class="panel" data-context="capacity"><h2>2. Capacidad documentada</h2>
              <label>Registro de tabla / equipo<select name="equipmentRecord" id="equipment-record"><option value="">Seleccione un registro documentado</option></select></label>
              <label>Número de grúas<select name="craneCount" id="crane-count"><option value="1">1 grúa</option><option value="2">2 grúas</option><option value="3">3 grúas</option></select></label>
              <label>Registro grúa 2<select name="equipmentRecord2" id="equipment-record-2"><option value="">Seleccione si aplica</option></select></label>
              <label>Registro grúa 3<select name="equipmentRecord3" id="equipment-record-3"><option value="">Seleccione si aplica</option></select></label>
              ${field('capacity', 'Capacidad de tabla a esta configuración', '', 't', '0.01')}
              ${field('chartRadius', 'Radio correspondiente de la tabla', '', 'm', '0.1')}
              ${field('capacity2', 'Capacidad grúa 2 (tándem)', 8, 't', '0.01')}
              ${field('capacity3', 'Capacidad grúa 3 (tándem)', 8, 't', '0.01')}
              ${field('radius2', 'Radio grúa 2 (tándem)', 10, 'm', '0.1')}
              ${field('radius3', 'Radio grúa 3 (tándem)', 10, 'm', '0.1')}
              ${field('wind', 'Viento previsto', 20, 'km/h', '0.1')}
              ${field('windLimit', 'Límite del fabricante / plan', 30, 'km/h', '0.1')}
              ${field('groundBearing', 'Capacidad admisible del terreno', 20, 't/m²', '0.1')}
            </section>
            <section class="panel" data-context="rigging"><h2>3. Aparejos y geometría</h2>
              ${field('legs', 'Ramales efectivos', 2, 'ramales', '1')}
              ${field('angle', 'Ángulo del ramal respecto a horizontal', 60, '°', '0.1')}
              ${field('slingWll', 'WLL por ramal', 4, 't', '0.01')}
              ${field('hookWll', 'WLL de grilletes / ganchos', 8, 't', '0.01')}
              <label>Tipo de accesorio<select name="accessoryType"><option>Eslinga sintética</option><option>Eslinga de cable</option><option>Eslinga de cadena</option><option>Viga separadora</option><option>Balancín</option><option>Grilletes y herrajes</option></select></label>
              <label>Acreditación de equipos<select name="accreditation"><option value="yes">Vigente y disponible</option><option value="no">No disponible</option></select></label>
              ${field('projectedArea', 'Área proyectada al viento', 4, 'm²', '0.1')}
            </section>
            <section class="panel" data-context="tandem,hoist,other"><h2>4. Equipos adicionales y reparto</h2>
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
          <section class="panel equipment-matrix"><div class="module-title"><h2>9. Matriz de equipos y funciones</h2><span>COMPONENTES DEL SISTEMA</span></div>
            <p class="muted">Agregue cada grúa, camión grúa, tecle, tirfor, balancín, aparejo o conector. La carga asignada y la capacidad se validan por fila.</p>
            <div class="table-scroll"><table class="equipment-table"><thead><tr><th>Función</th><th>Registro técnico</th><th>Cant.</th><th>Carga asignada</th><th>Capacidad/WLL</th><th>Estado</th><th></th></tr></thead><tbody id="equipment-rows">${equipmentRow()}</tbody></table></div>
            <button class="secondary" id="add-equipment" type="button">+ Agregar equipo o accesorio</button>
          </section>
          <div class="actions"><button class="primary" type="submit">Calcular y validar</button><button class="secondary" id="reset-form" type="button">Restablecer</button></div>
        </form>
        <div id="result" class="result-area" aria-live="polite"></div>
      </section>
      <section class="view" id="plan-view"><div id="plan-content"></div></section>
      <section class="view" id="checklist-view"><div id="checklist-content"></div></section>
      <section class="view" id="library-view"><div id="library-content"></div></section>
      <section class="view" id="references-view"><div id="references-content"></div></section>
    </main>`;
  bindNavigation();
  bindCalculator();
  renderPlan();
  renderChecklist();
  renderLibrary();
  bindEquipmentRecords();
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
    const activeContexts = new Set(['capacity', 'rigging', configuration.value]);
    if (tandemActive) activeContexts.add('tandem');
    if (configuration.value === 'hoist') activeContexts.add('hoist');
    if (configuration.value === 'other') activeContexts.add('other');
    document.querySelectorAll('[data-context]').forEach((panel) => {
      const contexts = panel.dataset.context.split(',');
      panel.style.display = contexts.some((context) => activeContexts.has(context)) ? 'block' : 'none';
    });
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
  const equipmentRows = document.querySelector('#equipment-rows');
  document.querySelector('#add-equipment').addEventListener('click', () => {
    equipmentRows.insertAdjacentHTML('beforeend', equipmentRow(equipmentRows.children.length));
    bindEquipmentRow(equipmentRows.lastElementChild);
  });
  bindEquipmentRow(equipmentRows.firstElementChild);
  const recordSelect = document.querySelector('#equipment-record');
  const applyRecord = (select, capacityField, radiusField) => {
    const record = state.library.find((item) => item.id === select.value);
    if (!record) return;
    form.elements[capacityField].value = record.capacity || '';
    form.elements[radiusField].value = record.radius || '';
    form.elements.windLimit.value = record.windLimit || '';
    form.elements.slingWll.value = record.slingWll || '';
    form.elements.hookWll.value = record.hardwareWll || '';
    form.elements.accreditation.value = record.verified === 'yes' ? 'yes' : 'no';
    if (record.recordConfiguration && capacityField === 'capacity') {
      configuration.value = record.recordConfiguration;
      configuration.dispatchEvent(new Event('change'));
    }
  };
  if (recordSelect) recordSelect.addEventListener('change', () => applyRecord(recordSelect, 'capacity', 'chartRadius'));
  document.querySelector('#equipment-record-2').addEventListener('change', (event) => applyRecord(event.target, 'capacity2', 'radius2'));
  document.querySelector('#equipment-record-3').addEventListener('change', (event) => applyRecord(event.target, 'capacity3', 'radius3'));
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
    const equipmentRecords = ['equipmentRecord', 'equipmentRecord2', 'equipmentRecord3']
      .slice(0, craneCountValue)
      .map((name) => state.library.find((record) => record.id === data.get(name)))
      .filter(Boolean);
    const equipmentData = [...document.querySelectorAll('[data-equipment-row]')].map((row) => {
      const values = new FormData();
      row.querySelectorAll('input, select').forEach((input) => values.set(input.name, input.value));
      const record = state.library.find((item) => item.id === values.get('equipmentRecord'));
      return { ...Object.fromEntries(values), record };
    }).filter((item) => Number(item.equipmentAssignedLoad) > 0 || item.equipmentRecord);
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
    if (!data.get('equipmentRecord')) warnings.push('Seleccione una tabla de carga o registro documentado y vigente desde la biblioteca técnica.');
    if (craneCountValue >= 2 && !data.get('equipmentRecord2')) warnings.push('Seleccione el registro documentado de la grúa 2.');
    if (craneCountValue >= 3 && !data.get('equipmentRecord3')) warnings.push('Seleccione el registro documentado de la grúa 3.');
    if (equipmentRecords.some((record) => record.recordConfiguration !== data.get('configuration'))) warnings.push('La configuración seleccionada no coincide con una o más tablas documentadas.');
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
    equipmentData.forEach((item) => {
        const assigned = Number(item.equipmentAssignedLoad) || 0;
      if (!item.record) {
        warnings.push(`${item.equipmentRole}: seleccione un registro técnico documentado.`);
        return;
      }
      const equipmentCapacity = Number(item.equipmentCapacity || item.record.capacity || item.record.slingWll || item.record.hardwareWll || 0);
      if (!equipmentCapacity || assigned > equipmentCapacity * Number(item.equipmentQuantity || 1)) warnings.push(`${item.equipmentRole}: la carga asignada supera su capacidad/WLL documentada.`);
      if (item.equipmentVerified !== 'yes' || item.record.verified !== 'yes') warnings.push(`${item.equipmentRole}: equipo o documento sin acreditación vigente.`);
    });
    if (equipmentData.length && equipmentData.reduce((total, item) => total + Number(item.equipmentAssignedLoad || 0), 0) < designLoad) warnings.push('La suma de cargas asignadas a los equipos es menor que la carga de diseño.');
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
    state.result = { ...Object.fromEntries(data), load, designLoad, utilization, slingTension, windForce, craneLoads, capacities, craneRadii, equipmentRecords, equipmentData, liftPoints, loadPerPoint, groundPressure, shareDeviation, warnings, safe: warnings.length === 0 };
    renderResult();
    renderPlan();
  });
  document.querySelector('#reset-form').addEventListener('click', () => {
    form.reset();
    document.querySelector('#result').innerHTML = '';
  });
}

function bindEquipmentRow(row) {
  const recordSelect = row.querySelector('[name=equipmentRecord]');
  const capacityInput = row.querySelector('[name=equipmentCapacity]');
  const roleSelect = row.querySelector('[name=equipmentRole]');
  recordSelect.addEventListener('change', () => {
    const record = state.library.find((item) => item.id === recordSelect.value);
    if (!record) return;
    capacityInput.value = record.capacity || record.slingWll || record.hardwareWll || '';
    row.querySelector('[name=equipmentVerified]').value = record.verified === 'yes' ? 'yes' : 'no';
    if (record.recordType === 'Tabla de carga') roleSelect.value = record.recordConfiguration === 'mobile' ? 'Grúa principal' : roleSelect.value;
  });
  row.querySelector('.remove-equipment').addEventListener('click', () => {
    if (document.querySelectorAll('[data-equipment-row]').length > 1) row.remove();
  });
}

function renderResult() {
  const result = state.result;
  const status = result.safe ? 'APTO CONDICIONADO' : 'NO APTO / REVISAR';
  document.querySelector('#result').innerHTML = `
    <section class="panel result-card ${result.safe ? 'pass' : 'fail'}"><div class="result-header"><div><div class="eyebrow">Dictamen preliminar</div><h2>${status}</h2></div><strong>${(result.utilization * 100).toFixed(1)}% utilización</strong></div>
    <div class="metrics"><div><span>Carga de diseño</span><strong>${result.designLoad.toFixed(2)} t</strong></div><div><span>Tensión por ramal</span><strong>${result.slingTension.toFixed(2)} t</strong></div><div><span>Fuerza de viento estimada</span><strong>${result.windForce.toFixed(2)} kN</strong></div></div>
    <p><strong>Reparto tándem:</strong> ${result.craneLoads.map((load, index) => `Grúa ${index + 1}: ${load.toFixed(2)} t / capacidad ${result.capacities[index].toFixed(2)} t`).join(' · ')}</p>
    <p><strong>Documentación aplicada:</strong> ${result.equipmentRecords.length ? result.equipmentRecords.map((record) => `${record.manufacturer} ${record.recordName} (${record.revision || 'sin revisión'})`).join(' · ') : 'ninguna'}</p>
    <table class="verification-table"><thead><tr><th>Equipo / función</th><th>Registro</th><th>Carga asignada</th><th>Capacidad/WLL</th><th>Estado</th></tr></thead><tbody>${result.equipmentData.map((item) => `<tr><td>${item.equipmentRole}</td><td>${item.record ? `${item.record.manufacturer} ${item.record.recordName}` : 'Sin registro'}</td><td>${item.equipmentAssignedLoad} t</td><td>${item.equipmentCapacity || (item.record && (item.record.capacity || item.record.slingWll || item.record.hardwareWll)) || 'N/D'} t</td><td>${item.equipmentVerified === 'yes' && item.record && item.record.verified === 'yes' ? 'Acreditado' : 'Pendiente'}</td></tr>`).join('')}</tbody></table>
    <table class="verification-table"><tbody><tr><th>Verificación</th><th>Resultado</th><th>Criterio</th></tr><tr><td>Carga por punto de izaje</td><td>${result.loadPerPoint.toFixed(2)} t</td><td>WLL oreja ${result.lugWll} t / conector ${result.connectorWll} t</td></tr><tr><td>Presión de apoyo</td><td>${result.groundPressure.toFixed(2)} t/m²</td><td>Admisible ${result.maxGroundPressure} t/m²</td></tr><tr><td>Desviación de reparto</td><td>${result.shareDeviation.toFixed(1)}%</td><td>Máxima ${result.maxShareDeviation}%</td></tr><tr><td>Centro de gravedad</td><td>${result.cgX} m, ${result.cgY} m, ${result.cgZ} m</td><td>Verificación: ${result.stabilityVerified === 'yes' ? 'documentada' : 'pendiente'}</td></tr></tbody></table>
    ${formulaTable(result)}
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
      ${r ? `<h3>Equipos y funciones involucrados</h3><table><thead><tr><th>Función</th><th>Registro</th><th>Carga</th><th>Capacidad/WLL</th><th>Estado</th></tr></thead><tbody>${r.equipmentData.map((item) => `<tr><td>${item.equipmentRole}</td><td>${item.record ? `${item.record.manufacturer} ${item.record.recordName}` : 'Sin registro'}</td><td>${item.equipmentAssignedLoad} t</td><td>${item.equipmentCapacity || (item.record && (item.record.capacity || item.record.slingWll || item.record.hardwareWll)) || 'N/D'} t</td><td>${item.equipmentVerified === 'yes' && item.record && item.record.verified === 'yes' ? 'Acreditado' : 'Pendiente'}</td></tr>`).join('')}</tbody></table>` : ''}
      ${r ? formulaTable(r) : ''}
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

function persistLibrary() {
  localStorage.setItem('haug-lift-library', JSON.stringify(state.library));
}

function renderLibrary() {
  const records = state.library;
  document.querySelector('#library-content').innerHTML = `
    <div class="section-heading"><div><div class="eyebrow">Datos controlados</div><h1>Biblioteca técnica</h1><p class="muted">Registre tablas del fabricante, manuales, certificados y documentos normativos. Los datos se guardan en este navegador.</p></div></div>
    <section class="panel">
      <h2>Agregar equipo o documento</h2>
      <form id="library-form" class="form-grid compact">
        ${field('recordName', 'Nombre / modelo', '', 'texto')}
        ${field('manufacturer', 'Fabricante', '', 'texto')}
        <label>Tipo<select name="recordType" id="record-type"><option>Tabla de carga</option><option>Manual del fabricante</option><option>Certificado / inspección</option><option>Accesorio / aparejo</option><option>Norma / procedimiento</option></select></label>
        <label>Configuración<select name="recordConfiguration">${Object.entries(configNames).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label>
        <div class="library-fields" data-library-group="load-chart">${field('capacity', 'Capacidad documentada', '', 't', '0.01')}${field('radius', 'Radio o condición de tabla', '', 'm', '0.1')}${field('windLimit', 'Límite de viento', '', 'km/h', '0.1')}</div>
        <div class="library-fields" data-library-group="accessory">${field('slingWll', 'WLL de eslinga / accesorio', '', 't', '0.01')}${field('hardwareWll', 'WLL de herraje / conector', '', 't', '0.01')}</div>
        <div class="library-fields" data-library-group="document">${field('revision', 'Edición / revisión', '', 'texto')}${field('validUntil', 'Vigente hasta', '', 'texto')}${field('source', 'Archivo o URL de origen', '', 'texto')}${field('documentRef', 'Código / páginas / ubicación', '', 'texto')}</div>
        <label>Verificación documental<select name="verified"><option value="yes">Revisado y vigente</option><option value="no">Pendiente</option></select></label>
        <label class="wide-field">Observaciones<textarea name="notes" rows="3" placeholder="Equipo, rango de radios, restricciones, páginas o condiciones de uso"></textarea></label>
        <button class="primary" type="submit">Guardar registro</button>
      </form>
    </section>
    <section class="panel"><div class="module-title"><h2>Registros guardados</h2><span>${records.length} REGISTROS</span></div>
      <div class="library-list">${records.length ? records.map((record) => `<article class="library-item"><div><strong>${record.recordName}</strong><p class="muted">${record.manufacturer} · ${record.recordType} · ${configNames[record.recordConfiguration] || 'General'}</p><small>${record.source || 'Origen no indicado'} · ${record.verified === 'yes' ? 'Verificado' : 'Pendiente'}</small></div><button class="secondary" data-delete-record="${record.id}" type="button">Eliminar</button></article>`).join('') : '<p class="notice">Aún no hay registros. Agregue la primera tabla o manual aprobado.</p>'}</div>
    </section>`;
  const updateLibraryFields = () => {
    const type = document.querySelector('#record-type').value;
    const groups = {
      'Tabla de carga': ['load-chart', 'document'],
      'Accesorio / aparejo': ['accessory', 'document'],
      'Manual del fabricante': ['document'],
      'Certificado / inspección': ['document'],
      'Norma / procedimiento': ['document'],
    };
    document.querySelectorAll('[data-library-group]').forEach((group) => {
      group.style.display = groups[type].includes(group.dataset.libraryGroup) ? 'grid' : 'none';
    });
  };
  document.querySelector('#record-type').addEventListener('change', updateLibraryFields);
  updateLibraryFields();
  document.querySelector('#library-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.library.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    persistLibrary();
    renderLibrary();
    bindEquipmentRecords();
  });
  document.querySelectorAll('[data-delete-record]').forEach((button) => button.addEventListener('click', () => {
    state.library = state.library.filter((record) => record.id !== button.dataset.deleteRecord);
    persistLibrary();
    renderLibrary();
    bindEquipmentRecords();
  }));
}

function bindEquipmentRecords() {
  const selectors = [document.querySelector('#equipment-record'), document.querySelector('#equipment-record-2'), document.querySelector('#equipment-record-3')];
  const options = state.library.filter((record) => record.recordType === 'Tabla de carga' && record.verified === 'yes').map((record) => `<option value="${record.id}">${record.manufacturer} · ${record.recordName}</option>`).join('');
  selectors.forEach((selector, index) => {
    if (selector) selector.innerHTML = `<option value="">${index === 0 ? 'Seleccione un registro documentado' : 'Seleccione si aplica'}</option>${options}`;
  });
}

function renderReferences() {
  document.querySelector('#references-content').innerHTML = `<div class="section-heading"><div><div class="eyebrow">Base técnica</div><h1>Normativa y límites de uso</h1><p class="muted">La aplicación apoya la planificación; la edición vigente y los requisitos locales prevalecen.</p></div></div><div class="reference-grid">
    <section class="panel"><h2>OSHA</h2><ul class="result-list"><li>29 CFR 1926 Subpart CC: grúas y torres, operación, inspección, señales, zonas de trabajo y condiciones del terreno.</li><li>29 CFR 1926.251: equipos y materiales de izaje, inspección y retiro de elementos defectuosos.</li><li>29 CFR 1910.184: eslingas.</li></ul></section>
    <section class="panel"><h2>ANSI / ASME B30</h2><ul class="result-list"><li>B30.5: grúas móviles y locomotoras.</li><li>B30.3: grúas torre; B30.2: puente grúa y pórtico; B30.16: tecles.</li><li>B30.9: eslingas; B30.10: ganchos; B30.20: dispositivos bajo gancho; B30.26: herrajes.</li></ul></section>
    <section class="panel"><h2>NIOSH y gestión HSE</h2><ul class="result-list"><li>Aplicar jerarquía de controles, evaluación de peligros, capacitación, comunicación y control de líneas eléctricas.</li><li>Incorporar requisitos del fabricante, autoridad local, ambiente de trabajo y procedimiento del empleador.</li><li>Fuentes recomendadas: NIOSH Fatality Assessment and Control Evaluation (FACE), NIOSH crane stability toolbox talk y OSHA OSHA 29 CFR 1926 Subpart CC.</li></ul></section>
    <section class="panel"><h2>Documentos recomendados para cargar</h2><ul class="result-list"><li>Tabla de carga vigente por modelo, configuración, contrapeso, pluma, radio y estabilizadores.</li><li>Manual de operación, inspección y mantenimiento del fabricante.</li><li>Certificados de inspección, calibración, competencia del operador/señalero y aparejos.</li><li>Planos y memoria de orejas, soldaduras, vigas separadoras, balancines y conectores.</li><li>Procedimiento corporativo, IPERC/JSA, permiso de izaje, plano de ruta y estudio de suelo.</li></ul></section>
    <section class="panel"><h2>Limitación profesional</h2><p class="muted">No se reproducen tablas propietarias. La capacidad debe provenir del fabricante. La utilización, tensión, viento y advertencias son cálculos de apoyo; no certifican estabilidad, estructura, suelo ni aptitud del equipo.</p></section>
  </div>`;
}

renderLogin();
