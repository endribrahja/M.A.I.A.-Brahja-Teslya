import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const base=process.env.MAIA_TEST_URL??'http://127.0.0.1:8054';
const shots=process.env.MAIA_SCREENSHOTS??'docs/screenshots/spatial';
await mkdir(shots,{recursive:true});
const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const failures=[];
page.on('response',response=>{
  if(response.status()>=400&&!(response.url().endsWith('/api/me')&&response.status()===401)) {
    failures.push(response.status()+' '+new URL(response.url()).pathname);
  }
});
page.on('pageerror',error=>failures.push(error.message));
page.on('console',message=>{
  if(message.type()==='error'&&!(message.location().url.endsWith('/api/me')&&message.text().includes('401'))) failures.push(message.text());
});
async function route(name,title){
  await page.evaluate(value=>{location.hash=value;},name);
  await page.getByRole('heading',{name:title,level:1,exact:true}).waitFor();
}
async function screenshot(filename){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:join(shots,filename+'.png'),style:'*{animation:none!important;transition:none!important} #toast{visibility:hidden!important}'});
}
async function fit(label){
  const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
  assert.ok(widths[0]<=widths[1],label+' overflow '+widths);
}
const home='La tua casa, sotto controllo.';
try{
  page.setDefaultTimeout(18_000);
  await page.goto(base);
  await page.locator('.auth-model canvas').waitFor();
  await screenshot('accesso');
  await page.getByRole('button',{name:'Esplora la demo'}).click();
  await page.getByRole('heading',{name:home}).waitFor();
  await page.locator('#house-preview canvas').waitFor();
  assert.equal(await page.locator('.sidebar').count(),0);
  assert.deepEqual(await page.locator('#sp-nav a').allTextContents(),
    ['Panoramica','Casa virtuale','Acqua','Gas','Contatori','Storico','MAIA AI']);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.locator('[data-sp-connection]').filter({hasText:'Connessa'}).waitFor();
  const homeId=await page.locator('#active-home').inputValue();
  const cycle=async action=>{
    const response=await page.request.post(base+'/api/homes/'+homeId+'/twin',{data:{action}});
    assert.ok(response.ok(),action+': '+response.status());
  };
  await page.waitForTimeout(1100);
  await cycle('shower');
  await cycle('heating');
  await page.waitForTimeout(1100);
  await cycle('washer');
  await page.locator('[data-room-series=water] .sp-room-row').filter({hasText:'Lavanderia'}).filter({hasText:'0,048 m³'}).waitFor();

  for(const [width,height] of [[1440,900],[2560,1440],[1920,1080],[1366,768],[1024,768],[768,1024],[390,844]]){
    await page.setViewportSize({width,height});
    await fit('dashboard '+width);
    if(width===390) {
      await page.locator('#house-preview [data-hotspot=gas]').waitFor();
      await page.locator('#house-preview [data-hotspot=water]').waitFor();
    }
    if([1440,1920,390].includes(width)) await screenshot('dashboard-'+width);
    if(width===390){
      await page.getByRole('button',{name:'Menu principale'}).click();
      await page.locator('#sp-nav').waitFor();
      await fit('menu mobile');
      await page.getByRole('button',{name:'Menu principale'}).click();
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-preview-action=water]').click();
  assert.equal(await page.locator('.sp-model').getAttribute('data-view'),'water');
  await page.locator('[data-preview-action=meters]').click();
  await page.locator('#house-preview [data-hotspot=water]:visible').click();
  await page.getByRole('heading',{name:'Contatore acqua',exact:true}).waitFor();
  await page.getByRole('button',{name:'Chiudi dettagli'}).click();
  await page.locator('[data-preview-action=reset]').click();
  await page.locator('[data-overview-kind=gas]').click();
  await page.locator('[data-overview-series=gas].sp-consumption-total').waitFor();
  await page.locator('[data-room-utility]').selectOption('gas');
  await page.locator('[data-room-series=gas]').waitFor();
  const noticeButton=page.locator('.sp-notices');
  const previousCount=await noticeButton.getAttribute('aria-label');
  await page.locator('#house-preview canvas').evaluate(canvas=>canvas.dataset.testIdentity='original');
  const update=await page.request.post(base+'/api/simulate',{data:{scenario:'missing'}});
  assert.ok(update.ok());
  await page.waitForFunction(previous=>document.querySelector('.sp-notices').getAttribute('aria-label')!==previous,previousCount);
  assert.equal(await page.locator('#house-preview canvas').getAttribute('data-test-identity'),'original');
  assert.equal(await page.locator('[data-room-utility]').inputValue(),'gas');


  await route('house','Abitazione virtuale');
  await page.locator('#twin-canvas canvas').waitFor();
  await screenshot('casa-1440');
  await page.getByRole('button',{name:'Ingrandisci la casa'}).press('Enter');
  await page.getByRole('button',{name:'Ripristina visuale',exact:true}).click();
  await page.getByRole('button',{name:'Impianto acqua',exact:true}).click();
  assert.equal(await page.locator('[data-scene-mode=water]').getAttribute('aria-pressed'),'true');
  await screenshot('impianto-acqua-1440');
  await page.getByRole('button',{name:'Impianto gas',exact:true}).click();
  await screenshot('impianto-gas-1440');
  await page.getByRole('button',{name:'Ripristina visuale',exact:true}).click();
  await page.locator('.twin-selector summary').click();
  await page.locator('[data-twin-room=bathroom]').click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();
  await page.locator('[data-room-panel] [data-appliance=shower]').click();
  await page.locator('[data-room-panel] li').filter({hasText:'Doccia'}).waitFor();
  await page.locator('.twin-options summary').click();
  await page.locator('[data-quality]').selectOption('2d');
  await page.locator('[data-plan-room=kitchen]').click();
  await page.getByRole('heading',{name:'Cucina',exact:true}).waitFor();
  await page.locator('[data-quality]').selectOption('medium');

  await route('water','Acqua');
  await screenshot('acqua-1440');
  const chart=page.locator('.consumption-chart').first();
  await chart.locator('.line-chart').focus();
  await page.keyboard.press('ArrowLeft');
  await chart.locator('output').filter({hasText:'Contatore simulato'}).waitFor();
  const download=page.waitForEvent('download');
  await chart.getByRole('button',{name:'CSV',exact:true}).click();
  assert.match((await download).suggestedFilename(),/^maia-consumi/);
  await page.getByRole('button',{name:'Ultime 24 ore',exact:true}).click();
  await page.getByRole('button',{name:'Ultime 24 ore',exact:true,pressed:true}).waitFor();
  await route('gas','Gas');
  await page.getByRole('button',{name:'30 giorni',exact:true}).click();
  await page.getByRole('button',{name:'30 giorni',exact:true,pressed:true}).waitFor();
  await screenshot('gas-1440');
  await route('meters','I miei contatori');
  await page.locator('[data-meter-model=water] canvas').waitFor();
  await page.locator('[data-meter-model=gas] canvas').waitFor();
  await screenshot('contatori-1440');
  await page.getByRole('button',{name:'Visualizza nella casa',exact:true}).first().click();
  await page.getByRole('heading',{name:'Contatore acqua',exact:true}).waitFor();
  await route('history','Storico letture');
  await screenshot('storico-1440');
  await page.locator('[data-history-sort]').click();
  await page.locator('th[aria-sort=ascending]').waitFor();
  await route('bell','Notifiche');
  await route('settings','Impostazioni');
  await screenshot('impostazioni-1440');
  await route('user','Il mio profilo');
  await route('analysis',home);
  assert.equal(await page.evaluate(()=>location.hash),'#home');

  await route('assistant','Assistente dei consumi');
  await page.getByRole('button',{name:'Esplora le domande'}).click();
  await screenshot('catalogo-1440');
  const search=page.getByRole('searchbox',{name:'Cerca nel catalogo'});
  await search.fill('quanto gas ho consumato oggi');
  await search.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#question').inputValue(),'Quanto gas ho consumato oggi?');
  await page.locator('#question').press('Enter');
  await page.locator('.chat-bubble:not(.from-user)').filter({hasText:'Dati simulati'}).waitFor();
  await page.locator('[data-chat=stop]').waitFor({state:'hidden'});
  await page.route('**/conversations/*/generate',route=>route.fulfill({contentType:'application/x-ndjson',body:
    '{"type":"mode","value":"model"}\n{"type":"text","value":"Vista richiesta."}\n{"type":"view","value":"bathroom"}\n{"type":"done","value":true}\n'
  }),{times:1});
  await page.locator('#question').fill('Mostra il bagno');
  await page.locator('#question').press('Enter');
  await page.getByRole('button',{name:'Visualizza nella casa 3D'}).click();
  await page.getByRole('heading',{name:'Bagno',exact:true}).waitFor();

  for(const width of [1024,768,390]){
    await page.setViewportSize({width,height:768});
    for(const [name,title] of [['house','Abitazione virtuale'],['water','Acqua'],['assistant','Assistente dei consumi'],['history','Storico letture']]){
      await route(name,title);
      await fit(name+' '+width);
    }
  }
  await route('assistant','Assistente dei consumi');
  await screenshot('maia-ai-390');
  await page.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      return type==='webgl2'?null:getContext.call(this,type,...args);
    };
  });
  await page.reload();
  await route('home',home);
  await page.locator('#house-preview .floor-plan').waitFor();
  await page.locator('[data-preview-room=water]').click();
  await page.getByRole('heading',{name:'Contatore acqua',exact:true}).waitFor();
  await screenshot('fallback-390');
  assert.deepEqual(failures,[]);
  console.log('Architectural Intelligence: 10 aree, 7 viewport, WebGL e fallback, telemetria, chat locale, navigazione e catalogo verificati.');
}finally{
  await browser.close();
}
