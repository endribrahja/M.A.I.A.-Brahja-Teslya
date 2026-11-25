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
    for(const token of content.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
      if(token.startsWith('**')&&token.endsWith('**')) {
        const strong=document.createElement('strong');
        strong.textContent=token.slice(2,-2);
        block.append(strong);
      } else if(token.startsWith('`')&&token.endsWith('`')) {
        const code=document.createElement('code');
        code.textContent=token.slice(1,-1);
        block.append(code);
      } else block.append(token);
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

export function mountConversation(home, openScene) {
  const root=document.querySelector('.chat-card');
  const log=root.querySelector('#chat-log'), form=root.querySelector('#assistant-form');
  const url='/homes/'+home+'/conversations';
  const lifecycle=new AbortController();
  const panel=document.createElement('div');
  panel.className='chat-controls';
  panel.innerHTML='<input type="search" aria-label="Cerca conversazioni" placeholder="Cerca conversazioni"><select aria-label="Conversazioni salvate"></select><button class="secondary small" data-chat="rename">Rinomina</button><button class="secondary small" data-chat="delete">Elimina</button><button class="secondary small" data-chat="regenerate">Rigenera</button><button class="secondary small" data-chat="stop" disabled>Interrompi</button><span role="status" data-chat-status></span>';
  log.before(panel);
  const select=panel.querySelector('select'), search=panel.querySelector('input');
  const status=panel.querySelector('[data-chat-status]');
  const stop=panel.querySelector('[data-chat=stop]');
  let list=[], activeId=null, generation, revision=0;
  function options() {
    const query=search.value.trim().toLowerCase();
    select.innerHTML='<option value="">Nuova conversazione</option>'+list.filter(item=>item.id===activeId||item.title.toLowerCase().includes(query)).map(item=>'<option value="'+item.id+'">'+esc(item.title)+'</option>').join('');
    select.value=activeId??'';
    panel.querySelectorAll('[data-chat]:not([data-chat=stop])').forEach(b=>b.disabled=!activeId||!!generation);
  }
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
    log.replaceChildren();
    options();
    if(!id) return;
    const result=await api(url+'/'+id);
    if(version!==revision||lifecycle.signal.aborted) return;
    for(const item of result.messages) bubble(item.role,item.content);
  }
  function error(err) {status.textContent=err.message??'Operazione non riuscita.';}
  async function ask(question, regenerate=false) {
    if(generation||(!question&&!regenerate)) return;
    const controller=generation=new AbortController();
    select.disabled=true;
    stop.disabled=false;
    options();
    status.textContent='Elaborazione…';
    let view, report;
    const series=[];
    try {
      if(!activeId) {
        const created=await api(url,'POST');
        activeId=created.id;
      }
      if(lifecycle.signal.aborted) return;
      const response=await fetch('/api'+url+'/'+activeId+'/generate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(regenerate?{regenerate:true}:{question}),signal:controller.signal
      });
      if(!response.ok) throw new Error((await response.json()).detail??'Generazione non riuscita.');
      if(question) bubble('user',question);
      else {
        const last=log.lastElementChild;
        if(last&&!last.classList.contains('from-user')) last.remove();
      }
      const target=bubble('assistant','');
      let text='', buffer='', done=false;
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
            if(message.type==='text') {text+=message.value;markdown(target,text);log.scrollTop=log.scrollHeight;}
            if(message.type==='mode') status.textContent=({model:'Modello linguistico',local:'Analisi statistica',fallback:'Fallback statistico'})[message.value];
            if(message.type==='error') throw new Error(message.value);
            if(message.type==='view') view=message.value;
            if(message.type==='report') report=message.value;
            if(message.type==='series') series.push(message.value);
            if(message.type==='done') done=true;
          }
        }
      } finally {await reader.cancel().catch(()=>{});}
      if(!done) throw new Error('Generazione interrotta. Puoi rigenerare la risposta.');
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
        button.textContent='Apri vista nella casa';
        button.onclick=()=>openScene(view);
        target.after(button);
      }
    } catch(err) {
      if(err.name==='AbortError') status.textContent='Generazione interrotta.';
      else error(err);
    } finally {
      generation=null;
      select.disabled=false;
      stop.disabled=true;
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
    if(question&&!generation) {form.reset();ask(question);}
  },{signal:lifecycle.signal});
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button||!button.matches('[data-chat-clear],[data-question],[data-chat]')) return;
    event.stopPropagation();
    if(button.dataset.chat==='stop') {generation?.abort();return;}
    if(generation) return;
    try {
      if(button.hasAttribute('data-chat-clear')) await load(null);
      if(button.dataset.question) await ask(button.dataset.question);
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
  refresh().catch(error);
  return ()=>{lifecycle.abort();generation?.abort();};
}
