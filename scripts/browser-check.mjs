import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const base=process.env.MAIA_TEST_URL ?? 'http://127.0.0.1:8054';
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const failures=[];
const timings={};
page.on('pageerror',error=>failures.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!(message.location().url.endsWith('/api/me')&&message.text().includes('401'))) failures.push(message.text());});
const shots=process.env.MAIA_SCREENSHOTS ?? 'docs/screenshots/premium/';
await mkdir(shots,{recursive:true});
page.setDefaultTimeout(20_000);
async function screenshot(name) {
  const path=shots+name+'.png';
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path,timeout:20_000,style:'*{animation:none!important;transition:none!important} #toast{visibility:hidden!important}'});
}
async function route(name,heading) {
  await page.evaluate(value=>{location.hash=value;},name);
  await page.getByRole('heading',{name:heading,level:1}).waitFor();
}
try {
  await page.goto(base);
  await page.getByRole('button',{name:'Esplora la demo'}).waitFor();
  await screenshot('accesso');
  const demoStarted=performance.now();
  await page.getByRole('button',{name:'Esplora la demo'}).click();
  await page.getByRole('heading',{name:/Ciao,/}).waitFor();
  await page.locator('#house-preview canvas').waitFor();
  timings.demoTo3dMs=Math.round(performance.now()-demoStarted);
  await screenshot('dashboard');
  await page.getByRole('button',{name:'Ultime 24 ore',exact:true}).click();
  await page.getByRole('button',{name:'Ultime 24 ore',exact:true,pressed:true}).waitFor();
  await page.getByRole('button',{name:'30 giorni',exact:true}).click();
  await page.getByRole('button',{name:'30 giorni',exact:true,pressed:true}).waitFor();
  await route('analysis','Analisi e previsioni');
  const chart=page.locator('.consumption-chart').first();
  await chart.locator('.line-chart').focus();
  await page.keyboard.press('ArrowLeft');
  await chart.locator('output').filter({hasText:'Contatore simulato'}).waitFor();
  await chart.locator('[data-chart-window]').selectOption('7');
  await screenshot('grafici-2d');
  const download=page.waitForEvent('download');
  await chart.getByRole('button',{name:'CSV',exact:true}).click();
  assert.match((await download).suggestedFilename(),/^maia-consumi-/);
  await page.getByRole('button',{name:'Esplora in 3D'}).click();
  await page.locator('#spatial-chart canvas').waitFor();
  await screenshot('grafici-3d');
  await page.locator('[data-chart-series=gas]').uncheck();
  await page.getByRole('button',{name:'Ripristina visuale'}).click();
  await page.locator('[data-chart-series=gas]').check();
  await page.locator('[data-chart-style]').selectOption('surface');
  await page.locator('#spatial-value').filter({hasText:'Superfici per utenza'}).waitFor();
  await page.getByRole('button',{name:'7 giorni',exact:true}).click();
  await page.locator('#spatial-chart canvas').waitFor();
  await page.getByRole('button',{name:'Torna al 2D'}).click();
  await page.locator('#spatial-chart').waitFor({state:'detached'});
  await route('house','Abitazione virtuale');
  const canvas=page.locator('#twin-canvas canvas');
  await canvas.waitFor();
  await screenshot('casa');
  await page.locator('[data-mode]').selectOption('roofless');
  await screenshot('casa-senza-tetto');
  await page.locator('[data-mode]').selectOption('section');
  await page.getByRole('button',{name:'Dall’alto'}).click();
  await page.waitForTimeout(580);
  const overhead=await canvas.boundingBox();
  await page.mouse.click(overhead.x+overhead.width/2,overhead.y+overhead.height/2);
  await page.locator('[data-twin-room=hall][aria-pressed=true]').waitFor();
  await page.locator('[data-twin-room=bathroom]').click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();
  await page.waitForTimeout(580);
  await screenshot('stanza');
  await page.getByRole('button',{name:'Doccia',exact:true}).click();
  await page.locator('[data-room-panel] li').filter({hasText:'Doccia'}).waitFor();
  await page.locator('[data-twin-room=water]').click();
  await page.getByRole('heading',{name:'Contatore acqua',exact:true}).waitFor();
  await page.waitForTimeout(580);
  await screenshot('contatore');
  await page.getByRole('button',{name:'Isometrica'}).click();
  await page.locator('[data-mode]').selectOption('water');
  await page.waitForTimeout(580);
  await screenshot('impianto-acqua');
  await page.locator('[data-mode]').selectOption('gas');
  await screenshot('impianto-gas');
  await page.getByRole('button',{name:'Isometrica'}).click();
  await canvas.scrollIntoViewIfNeeded();
  const bounds=await canvas.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.wheel(0,-120);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+120,bounds.y+bounds.height/2+30,{steps:9});
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('.twin-options summary').click();
  await page.locator('[data-quality]').selectOption('2d');
  await page.locator('.floor-plan').waitFor();
  await page.locator('[data-plan-room=kitchen]').click();
  await page.getByRole('heading',{name:'Cucina',exact:true}).waitFor();
  await route('assistant','Assistente dei consumi');
  await screenshot('assistente-vuoto');
  await page.getByRole('button',{name:'Esplora le domande'}).click();
  const catalogSearch=page.getByRole('searchbox',{name:'Cerca nel catalogo'});
  await catalogSearch.fill('gas');
  await screenshot('catalogo');
  assert.equal(await page.getByRole('button',{name:'Mostrami l’impianto del gas.'}).isDisabled(),true);
  await catalogSearch.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#question').inputValue(),'Quanto gas ho consumato oggi?');
  assert.equal(await page.locator('.chat-bubble').count(),0);
  await page.getByRole('button',{name:'Esplora le domande'}).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.question-catalog').isVisible(),false);
  await page.locator('#question').fill('Quanto ho consumato di acqua?');
  await page.locator('#question').press('Enter');
  await page.locator('.chat-bubble:not(.from-user)').filter({hasText:'Dati simulati'}).waitFor();
  await screenshot('assistente');
  await page.locator('[data-chat=stop]').waitFor({state:'hidden'});
  await page.locator('#question').fill('E il gas invece?');
  await page.locator('#question').press('Enter');
  await page.locator('.chat-bubble.from-user').filter({hasText:'E il gas invece?'}).waitFor();
  await page.locator('[data-chat=stop]').waitFor({state:'hidden'});
  await page.route('**/conversations/*/generate',route=>route.fulfill({contentType:'application/x-ndjson',body:
    '{"type":"mode","value":"model"}\n{"type":"text","value":"Apri la vista richiesta."}\n{"type":"view","value":"bathroom"}\n{"type":"done","value":true}\n'
  }),{times:1});
  await page.locator('#question').fill('Mostra il bagno');
  await page.getByRole('button',{name:'Invia messaggio'}).click();
  await page.getByRole('button',{name:'Visualizza nella casa 3D'}).click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();
  await route('assistant','Assistente dei consumi');
  await page.locator('.chat-bubble.from-user').filter({hasText:'Quanto ho consumato di acqua?'}).waitFor();
  for(const [name,heading] of Object.entries({water:'Consumi acqua',gas:'Consumi gas',history:'Storico letture',meters:'I miei contatori',bell:'Notifiche',budget:'Budget e traguardi',user:'Il mio profilo',settings:'Simulatore demo'})) {
    await route(name,heading);
  }
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox',{name:'Filtra le pagine'}).fill('panoramica');
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:/Ciao,/}).waitFor();
  await screenshot('tema-chiaro');
  const theme=await page.locator('html').getAttribute('data-theme-choice');
  await page.getByRole('button',{name:'Cambia tema'}).click();
  await page.getByRole('button',{name:'Cambia tema'}).click();
  await screenshot('tema-scuro');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.notEqual(await page.locator('html').getAttribute('data-theme-choice'),theme);
  for(const width of [375,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for(const [name,heading] of [['home',/Ciao,/],['house','Abitazione virtuale'],['assistant','Assistente dei consumi']]) {
      await route(name,heading);
      const dimensions=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
      if(dimensions[0]>dimensions[1]) {
        const oversize=await page.evaluate(()=>[...document.querySelectorAll('main *,header *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>e.tagName+'.'+e.className));
        assert.fail(name+' overflow @ '+width+' '+dimensions+' '+oversize);
      }
    }
  }
  await page.setViewportSize({width:375,height:900});
  await route('home',/Ciao,/);
  await page.locator('#house-preview canvas').waitFor();
  await screenshot('mobile');
  await page.getByRole('button',{name:'Menu principale'}).click();
  await page.getByRole('button',{name:'Casa virtuale',exact:true}).click();
  await page.getByRole('heading',{name:'Abitazione virtuale',exact:true}).waitFor();
  await page.locator('.twin-options summary').click();
  await page.locator('[data-quality]').selectOption('medium');
  await page.locator('#twin-canvas canvas').waitFor();
  await page.locator('.twin-options summary').click();
  await screenshot('mobile-casa');
  await route('assistant','Assistente dei consumi');
  await page.getByRole('button',{name:'Esplora le domande'}).click();
  await page.getByRole('searchbox',{name:'Cerca nel catalogo'}).fill('acqua');
  await screenshot('mobile-catalogo');
  assert.deepEqual(failures,[]);
  console.log('Misure della sessione Chromium con SwiftShader:',timings);
  console.log('Browser: 12 pagine, WebGL, 2D, simulazione, chat locale, ricerca, tema e layout a 5 larghezze.');
} finally {
  await browser.close();
}
