const { JSDOM } = require('jsdom');
const fs = require('fs');

async function test() {
  const html = fs.readFileSync('index.html', 'utf8');
  // We need to provide the files so JSDOM can load them
  // JSDOM can load local files if url is set to a file URL.
  const url = "file:///" + __dirname.replace(/\\/g, '/') + "/index.html";
  
  const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    url: url
  });

  dom.window.addEventListener('error', (event) => {
    console.error('JSDOM ERROR:', event.error);
  });
  
  dom.window.addEventListener('unhandledrejection', (event) => {
    console.error('JSDOM UNHANDLED REJECTION:', event.reason);
  });

  dom.window.addEventListener('load', () => {
    console.log("ON LOAD!");
    console.log("Equipment HTML length:", dom.window.document.getElementById('equipment-options')?.innerHTML?.length);
    console.log("Calculator Grid HTML length:", dom.window.document.getElementById('calculator-grid')?.innerHTML?.length);
  });
}

test();
