import {mountQuestionCatalog} from './question-catalog.js';
import {api,esc,num} from './api.js';

function markdown(target, text) {
  target.replaceChildren();
  let block, fenced=false;
  for(const line of text.split('\n')) {
    if(line.startsWith('```')) {fenced=!fenced;block=null;continue;}
    if(fenced) {
      if(!block) {block=document.createElement('pre');target.append(block);}
      block.append(line+'\n');
      continue;
    }
    if(!line.trim()) {block=null;continue;}
    if(line.startsWith('|')&&line.trimEnd().endsWith('|')) {
      const cells=line.trim().slice(1,-1).split('|');
      if(cells.every(cell=>/^\s*:?-+:?\s*$/.test(cell))) continue;
      if(block?.tagName!=='TABLE') {block=document.createElement('table');target.append(block);}
      const header=!block.rows.length;
      const row=block.insertRow();
      for(const cell of cells) {
        const element=document.createElement(header?'th':'td');
        element.textContent=cell.trim();
        if(header) element.scope='col';
        row.append(element);
      }
      continue;
    }
    const heading=line.match(/^#{1,4}\s+(.*)$/);
    block=document.createElement(heading?'h3':'p');
    const content=heading?heading[1]:line;
    for(const token of content.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/#)[^\s)]+\))/)) {
      if(token.startsWith('**')&&token.endsWith('**')) {
        const strong=document.createElement('strong');
        strong.textContent=token.slice(2,-2);
        block.append(strong);
      } else if(token.startsWith('`')&&token.endsWith('`')) {
        const code=document.createElement('code');
        code.textContent=token.slice(1,-1);
        block.append(code);
      } else {
        const link=token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/#)[^\s)]+)\)$/);
        if(link) {
          const anchor=document.createElement('a');
          anchor.href=link[2];
          anchor.textContent=link[1];
          if(!link[2].startsWith('/#')) {anchor.target='_blank';anchor.rel='noopener noreferrer';}
          block.append(anchor);
        } else block.append(token);
      }
    }
    target.append(block);
  }
}

function toolChart(series) {
  if(!['water','gas'].includes(series.utility)||!Array.isArray(series.rows)) return null;
  const node=document.createElement('details');
  node.className='chat-chart';
  node.open=true;
  const title=document.createElement('summary');
  title.textContent=series.title+' · '+(series.utility==='water'?'Acqua':'Gas')+' (m³)';
  node.append(title);
  const graph=document.createElement('div');
  graph.className='chat-series '+series.utility;
  graph.setAttribute('aria-hidden','true');
  const values=document.createElement('ul');
  const max=Math.max(.001,...series.rows.map(row=>row.value??0));
  for(const row of series.rows) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    const value=Number.isFinite(row.value)?row.value:null;
    const bar=document.createElement('i');
    const item=document.createElement('li');
    const label=row.date+' · '+(value==null?'N/D':num(value)+' m³');
    item.textContent=label;
    bar.title=label;
    bar.style.height=Math.max(1,(value??0)/max*100)+'%';
    if(value==null) bar.className='missing';
    graph.append(bar);
    values.append(item);
  }
  const numbers=document.createElement('details');
  const label=document.createElement('summary');
  label.textContent='Valori e periodi';
  numbers.append(label,values);
  node.append(graph,numbers);
  return node;
}

export function mountConversation(home, openScene, context={}) {
  const root=document.querySelector('.chat-card');
  const log=root.querySelector('#chat-log'), form=root.querySelector('#assistant-form');
  const url='/homes/'+home+'/conversations';
  const lifecycle=new AbortController();
  const panel=document.createElement('details');
  panel.className='chat-controls';
  panel.open=matchMedia('(min-width: 1024px)').matches;
  panel.innerHTML='<summary>Cronologia</summary><div class="chat-history"><input type="search" aria-label="Cerca conversazioni" placeholder="Cerca conversazioni"><select aria-label="Conversazioni salvate"></select><div class="chat-history-actions"><button class="secondary small" data-chat="rename">Rinomina</button><button class="secondary small" data-chat="delete">Elimina</button><button class="secondary small" data-chat="regenerate">Rigenera</button></div></div>';
  root.querySelector('.chat-workspace').prepend(panel);
  const select=panel.querySelector('select'), search=panel.querySelector('input');
  const status=root.querySelector('[data-chat-status]'), modelStatus=root.querySelector('[data-model-status]');
  const stop=root.querySelector('[data-chat=stop]'), textarea=form.querySelector('textarea');
  const submit=form.querySelector('[type=submit]'), suggestions=root.querySelector('.suggestions');
  const configured=root.dataset.modelConfigured==='true';
  const configuredLabel=modelStatus.textContent.replace('Modello configurato','Modello attivo');
  const memoryKey='maia-conversation-'+home;
  mountQuestionCatalog(form.querySelector('[data-question-catalog]'),textarea,configured);
  let list=[], activeId=null, generation, revision=0, hasMessages=false;
  function options() {
    const query=search.value.trim().toLocaleLowerCase('it');
    const days=new Map();
    for(const item of list) {
      if(item.id!==activeId&&!item.title.toLocaleLowerCase('it').includes(query)) continue;
      const label=new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeZone:'Europe/Rome'}).format(item.updated*1000);
      if(!days.has(label)) days.set(label,[]);
      days.get(label).push(`<option value="${item.id}">${esc(item.title)}</option>`);
    }
    select.innerHTML='<option value="">Nuova conversazione</option>'+[...days].map(([label,items])=>`<optgroup label="${esc(label)}">${items.join('')}</optgroup>`).join('');
    select.value=activeId??'';
    panel.querySelectorAll('[data-chat]').forEach(b=>b.disabled=!activeId||!!generation||(b.dataset.chat==='regenerate'&&!hasMessages));
  }
  function showSuggestions(last='') {
    const query=last.toLocaleLowerCase('it');
    const items=query.includes('gas')?['Quanto gas ho consumato questo mese?','Come posso ridurre il consumo di gas?']:
      query.includes('acqua')?['Quanta acqua ho consumato oggi?','Come posso ridurre il consumo di acqua?']:
      [context.hasAnomaly?(configured?'Spiegami l’ultima anomalia.':'Ho registrato consumi insoliti?'):'Come stanno andando i miei consumi?',
        context.nearGoal?'Come posso evitare di superare il mio obiettivo?':'Come si confrontano i miei consumi con il periodo precedente?',
        context.multipleHomes&&configured?'Come posso confrontare i dati delle mie abitazioni?':'Quanto sto spendendo questo mese?'];
    suggestions.replaceChildren();
    for(const question of items.filter(question=>question.toLocaleLowerCase('it')!==query).slice(0,3)) {
      const button=document.createElement('button');
      button.className='secondary small';
      button.textContent=question;
      button.dataset.question=question;
      suggestions.append(button);
    }
  }
  function welcome() {
    log.replaceChildren(root.querySelector('#chat-welcome').content.cloneNode(true));
    showSuggestions();
  }
  function resizeComposer() {
    textarea.style.height='auto';
    textarea.style.height=Math.min(150,textarea.scrollHeight)+'px';
  }
  textarea.addEventListener('input',resizeComposer,{signal:lifecycle.signal});
  function bubble(role,text) {
    const shell=document.createElement('article'), content=document.createElement('div');
    shell.className='chat-bubble '+(role==='user'?'from-user':'');
    shell.append(content);
    if(role==='assistant') {
      markdown(content,text);
      const copy=document.createElement('button');
      copy.className='secondary small';
      copy.textContent='Copia';
      copy.onclick=()=>navigator.clipboard.writeText(content.innerText).then(()=>status.textContent='Risposta copiata.').catch(()=>status.textContent='Copia non disponibile.');
      shell.append(copy);
    } else content.textContent=text;
    log.append(shell);
    log.scrollTop=log.scrollHeight;
    return content;
  }
  async function refresh() {
    list=await api(url);
    if(!lifecycle.signal.aborted) options();
  }
  async function load(id) {
    const version=++revision;
    activeId=id;
    hasMessages=false;
    if(id) window.sessionStorage.setItem(memoryKey,String(id));
    else window.sessionStorage.removeItem(memoryKey);
    log.replaceChildren();
    options();
    if(!id) {welcome();return;}
    const result=await api(url+'/'+id);
    if(version!==revision||lifecycle.signal.aborted) return;
    hasMessages=result.messages.length>0;
    if(!hasMessages) welcome();
    else for(const item of result.messages) bubble(item.role,item.content);
    showSuggestions(result.messages.findLast(item=>item.role==='user')?.content);
    options();
  }
  function error(err) {status.textContent=err.message??'Operazione non riuscita.';}
  async function ask(question, regenerate=false) {
    if(generation||(!question&&!regenerate)) return;
    const controller=generation=new AbortController();
    select.disabled=true;
    stop.hidden=false;
    submit.disabled=true;
    suggestions.replaceChildren();
    options();
    status.textContent='Elaborazione…';
    let view, report;
    const series=[];
    try {
      if(!activeId) {
        const created=await api(url,'POST');
        activeId=created.id;
        window.sessionStorage.setItem(memoryKey,String(activeId));
      }
      if(lifecycle.signal.aborted) return;
      const response=await fetch('/api'+url+'/'+activeId+'/generate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(regenerate?{regenerate:true}:{question}),signal:controller.signal
      });
      if(!response.ok) throw new Error((await response.json()).detail??'Generazione non riuscita.');
      log.querySelector('.chat-welcome')?.remove();
      if(question) bubble('user',question);
      hasMessages=true;
      if(!question) {
        const last=log.lastElementChild;
        if(last&&!last.classList.contains('from-user')) last.remove();
      }
      const target=bubble('assistant','');
      let text='', buffer='', done=false, responseMode;
      const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while(true) {
          const {value,done:ended}=await reader.read();
          if(ended) break;
          buffer+=value;
          const lines=buffer.split('\n');
          buffer=lines.pop();
          for(const line of lines) {
            const message=JSON.parse(line);
            if(message.type==='text') {
              if(!text&&responseMode==='model') modelStatus.textContent=configuredLabel;
              text+=message.value;markdown(target,text);log.scrollTop=log.scrollHeight;
            }
            if(message.type==='mode') {
              responseMode=message.value;
              if(message.value==='fallback') modelStatus.textContent='Modello indisponibile · Analisi statistica locale';
              if(message.value==='local') modelStatus.textContent='Analisi statistica locale · Capacità limitate';
            }
            if(message.type==='error') throw new Error(message.value);
            if(message.type==='view') view=message.value;
            if(message.type==='report') report=message.value;
            if(message.type==='series') series.push(message.value);
            if(message.type==='done') done=true;
          }
        }
      } finally {await reader.cancel().catch(()=>{});}
      if(!done) throw new Error('Generazione interrotta. Puoi rigenerare la risposta.');
      status.textContent='';
      showSuggestions(question);
      for(const payload of series) {
        const chart=toolChart(payload);
        if(chart) target.after(chart);
      }
      if(Array.isArray(report)&&report.length===2&&report.every(day=>/^\d{4}-\d{2}-\d{2}$/.test(day))) {
        const link=document.createElement('a');
        link.className='secondary small report-link';
        link.textContent='Scarica PDF del periodo';
        link.href='/api/homes/'+home+'/report.pdf?'+new URLSearchParams({start:report[0],end:report[1]});
        target.after(link);
      }
      if(view) {
        const button=document.createElement('button');
        button.className='secondary small';
        button.textContent='Visualizza nella casa 3D';
        button.onclick=()=>openScene(view);
        target.after(button);
      }
    } catch(err) {
      if(err.name==='AbortError') status.textContent='Generazione interrotta.';
      else error(err);
    } finally {
      generation=null;
      select.disabled=false;
      stop.hidden=true;
      submit.disabled=false;
      if(!lifecycle.signal.aborted) refresh().catch(error);
    }
  }
  form.querySelector('textarea').addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  },{signal:lifecycle.signal});
  select.onchange=()=>load(Number(select.value)||null).catch(error);
  search.oninput=options;
  root.addEventListener('submit',event=>{
    if(event.target!==form)return;
    event.preventDefault();
    event.stopPropagation();
    const question=new FormData(form).get('question').trim();
    if(question&&!generation) {form.reset();resizeComposer();ask(question);}
  },{signal:lifecycle.signal});
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button||!button.matches('[data-chat-clear],[data-question],[data-chat]')) return;
    event.stopPropagation();
    if(button.dataset.chat==='stop') {generation?.abort();return;}
    if(generation) return;
    try {
      if(button.hasAttribute('data-chat-clear')) await load(null);
      if(button.dataset.question) {textarea.value=button.dataset.question;resizeComposer();textarea.focus();}
      if(button.dataset.chat==='regenerate') await ask('',true);
      if(button.dataset.chat==='rename') {
        const title=prompt('Titolo della conversazione',list.find(item=>item.id===activeId)?.title??'');
        if(title?.trim()) {await api(url+'/'+activeId,'PATCH',{title:title.trim()});await refresh();}
      }
      if(button.dataset.chat==='delete'&&confirm('Eliminare questa conversazione?')) {
        await api(url+'/'+activeId,'DELETE');
        await load(null);
        await refresh();
      }
    } catch(err) {error(err);}
  },{signal:lifecycle.signal});
  welcome();
  refresh().then(()=>{
    if(lifecycle.signal.aborted||revision||generation||activeId) return;
    const saved=Number(window.sessionStorage.getItem(memoryKey));
    if(list.some(item=>item.id===saved)) return load(saved);
  }).catch(error);
  return ()=>{lifecycle.abort();generation?.abort();};
}
