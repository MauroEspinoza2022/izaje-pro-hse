const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://127.0.0.1:8000/', {waitUntil: 'networkidle0', timeout: 15000});
  
  await page.waitForSelector('#login-form [name=dni]');
  await page.type('#login-form [name=dni]', 'admin');
  await page.type('#login-form [name=password]', 'admin');
  await page.click('#login-form [type=submit]');
  await new Promise(r => setTimeout(r, 1500));
  
  // Test 1: initial state (mobile, simple)
  const t1 = await page.evaluate(() => {
    const grid = document.getElementById('calculator-grid');
    const cat = document.getElementById('category-options');
    const equip = document.getElementById('equipment-options');
    return {
      catVal: cat ? cat.value : null,
      equipCount: equip ? equip.options.length : 0,
      equipFirst: equip && equip.options[0] ? equip.options[0].text : null,
      hasModuleBadge: grid ? grid.innerHTML.includes('GRÚAS MÓVILES') : false,
      hasMobileForm: grid ? grid.innerHTML.includes('data-calculator="mobile"') : false,
      hasFixedForm: grid ? grid.innerHTML.includes('data-calculator="fixed"') : false,
      hasRiggingForm: grid ? grid.innerHTML.includes('data-calculator="rigging"') : false,
    };
  });
  console.log('T1 - Initial (mobile/simple):', JSON.stringify(t1, null, 2));
  
  // Test 2: switch to fixed crane (Puente grúa)
  await page.select('#category-options', 'fixed');
  await new Promise(r => setTimeout(r, 500));
  
  const t2 = await page.evaluate(() => {
    const grid = document.getElementById('calculator-grid');
    const equip = document.getElementById('equipment-options');
    return {
      catVal: document.getElementById('category-options').value,
      equipCount: equip ? equip.options.length : 0,
      equipFirst: equip && equip.options[0] ? equip.options[0].text : null,
      hasFixedForm: grid ? grid.innerHTML.includes('data-calculator="fixed"') : false,
      hasFixedBadge: grid ? grid.innerHTML.includes('PUENTE GRÚA') : false,
      hasMobileForm: grid ? grid.innerHTML.includes('data-calculator="mobile"') : false,
    };
  });
  console.log('T2 - After select fixed (Puente grúa):', JSON.stringify(t2, null, 2));

  // Test 3: switch angle to 0 degrees in Rigging (vertical hitch)
  const t3 = await page.evaluate(() => {
    const thetaInput = document.querySelector('[name=thetaDeg]');
    if (thetaInput) thetaInput.value = '0';
    const totalWeight = document.querySelector('[name=totalWeight]');
    if (totalWeight) totalWeight.value = '10';
    const accessoryFs = document.querySelector('[name=accessoryFs]');
    if (accessoryFs) accessoryFs.value = '4';
    const elements = document.querySelector('[name=elements]');
    if (elements) elements.value = '5';
    
    // Click Evaluate
    const runBtn = document.querySelector('[data-run="rigging"]');
    if (runBtn) runBtn.click();
    
    const panel = document.querySelector('[data-result-panel="rigging"]');
    return {
      chipText: panel ? panel.querySelector('.result-chip').textContent : 'null',
      listHTML: panel ? panel.querySelector('.result-list').innerHTML : 'null',
    };
  });
  console.log('T3 - Rigging evaluation with angle = 0° (vertical):', JSON.stringify(t3, null, 2));

  if (errors.length) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log('ERROR:', e));
  } else {
    console.log('\n✅ NO JS ERRORS');
  }
  
  await browser.close();
})();
