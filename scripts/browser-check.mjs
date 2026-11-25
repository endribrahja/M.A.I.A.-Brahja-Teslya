import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const base=process.env.MAIA_TEST_URL ?? 'http://127.0.0.1:8054';
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const failures=[];
const timings={};
page.on('pageerror',error=>failures.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!(message.location().url.endsWith('/api/me')&&message.text().includes('401'))) failures.push(message.text());});
const shots='docs/screenshots/';
async function route(name,heading) {
  await page.evaluate(value=>{location.hash=value;},name);
  await page.getByRole('heading',{name:heading,level:1}).waitFor();
}
try {
  await page.goto(base);
  await page.getByRole('button',{name:'Esplora la demo'}).waitFor();
  await page.screenshot({path:shots+'accesso.png'});
  const demoStarted=performance.now();
  await page.getByRole('button',{name:'Esplora la demo'}).click();
  await page.getByRole('heading',{name:/Ciao,/}).waitFor();
  await page.locator('#house-preview canvas').waitFor();
  timings.demoTo3dMs=Math.round(performance.now()-demoStarted);
  await page.screenshot({path:shots+'dashboard.png'});
  await route('analysis','Analisi e previsioni');
  await page.getByRole('button',{name:'Esplora in 3D'}).click();
  await page.locator('#spatial-chart canvas').waitFor();
  await page.screenshot({path:shots+'analisi.png'});
  await page.locator('[data-chart-style]').selectOption('surface');
  await page.locator('#spatial-value').filter({hasText:'Superfici per utenza'}).waitFor();
  await page.getByRole('button',{name:'7 giorni',exact:true}).click();
  await page.locator('#spatial-chart canvas').waitFor();
  await page.getByRole('button',{name:'Torna al 2D'}).click();
  await page.locator('#spatial-chart').waitFor({state:'detached'});
  await route('house','Abitazione virtuale');
  const canvas=page.locator('#twin-canvas canvas');
  await canvas.waitFor();
  await page.locator('[data-twin-room=bathroom]').click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();
  await page.getByRole('button',{name:'Doccia',exact:true}).click();
  await page.locator('[data-room-panel] li').filter({hasText:'Doccia'}).waitFor();
  await page.locator('[data-twin-room=water]').click();
  await page.getByRole('heading',{name:'Contatore acqua',exact:true}).waitFor();
  await page.locator('[data-pipe=water]').check();
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
  await page.screenshot({path:shots+'casa.png',fullPage:true});
  await page.locator('[data-quality]').selectOption('2d');
  await page.locator('.floor-plan').waitFor();
  await page.locator('[data-plan-room=kitchen]').click();
  await page.getByRole('heading',{name:'Cucina',exact:true}).waitFor();
  await route('assistant','Assistente dei consumi');
  await page.locator('#question').fill('Quanto ho consumato di acqua?');
  await page.locator('#question').press('Enter');
  await page.locator('.chat-bubble:not(.from-user)').filter({hasText:'Dati simulati'}).waitFor();
  await page.screenshot({path:shots+'assistente.png'});
  await page.route('**/conversations/*/generate',route=>route.fulfill({contentType:'application/x-ndjson',body:
    '{"type":"mode","value":"model"}\n{"type":"text","value":"Apri la vista richiesta."}\n{"type":"view","value":"bathroom"}\n{"type":"done","value":true}\n'
  }),{times:1});
  await page.locator('#question').fill('Mostra il bagno');
  await page.getByRole('button',{name:'Invia messaggio'}).click();
  await page.getByRole('button',{name:'Apri vista nella casa'}).click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();
  for(const [name,heading] of Object.entries({water:'Consumi acqua',gas:'Consumi gas',history:'Storico letture',meters:'I miei contatori',bell:'Notifiche',budget:'Budget e traguardi',user:'Il mio profilo',settings:'Simulatore demo'})) {
    await route(name,heading);
  }
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox',{name:'Filtra le pagine'}).fill('panoramica');
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:/Ciao,/}).waitFor();
  const theme=await page.locator('html').getAttribute('data-theme-choice');
  await page.getByRole('button',{name:'Cambia tema'}).click();
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
  await page.screenshot({path:shots+'mobile.png',fullPage:true});
  assert.deepEqual(failures,[]);
  console.log('Misure della sessione Chromium con SwiftShader:',timings);
  console.log('Browser: 12 pagine, WebGL, 2D, simulazione, chat locale, ricerca, tema e layout a 5 larghezze.');
} finally {
  await browser.close();
}
