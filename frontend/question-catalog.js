const catalog = [
  ['Panoramica','Consumi registrati e confronto',[
    'Come stanno andando i miei consumi?','Fammi un riepilogo della giornata.',
    'Come si confrontano i miei consumi con il periodo precedente?'],[
    'Analizza la mia abitazione.','Quali sono le informazioni più importanti di oggi?']],
  ['Acqua','Dati e ipotesi sul consumo idrico',[
    'Quanta acqua ho consumato oggi?','Quanta acqua ho consumato questo mese?',
    'Qual è il mio consumo medio giornaliero di acqua?',
    'Come posso ridurre il consumo di acqua?','Ho registrato consumi di acqua insoliti?','Confronta gli ultimi due mesi per l’acqua?'],
    ['Qual è il giorno in cui ho consumato più acqua?','Quali sono gli orari con più consumi di acqua, se sono disponibili dati orari?']],
  ['Gas','Volumi, tendenze e segnalazioni',[
    'Quanto gas ho consumato oggi?','Quanto gas ho consumato questo mese?',
    'Qual è il mio consumo medio di gas?','Come posso ridurre il consumo di gas?',
    'Quali variazioni anomale di gas sono state registrate?'],[
    'Come cambia il consumo di gas durante l’inverno?','Qual è stato il giorno con il consumo di gas maggiore?']],
  ['Costi e budget','Stime basate su volumi e tariffe',[
    'Quanto sto spendendo questo mese?','Quanto spenderò presumibilmente a fine mese?',
    'Sto rispettando il mio budget?','Come posso migliorare il mio budget?'],
    ['Quanto costa il mio consumo medio giornaliero?','Quanto risparmierei riducendo i consumi del 10%?','Confronta le spese degli ultimi tre mesi.']],
  ['Previsioni','Proiezioni e ipotesi',[
    'Prevedi i consumi dei prossimi sette giorni.','Prevedi la spesa dei prossimi 30 giorni.'],
    ['Prevedi la spesa del prossimo mese.','Come stanno cambiando i miei consumi?','Qual è la tendenza degli ultimi mesi?','Cosa succederebbe aumentando il numero degli abitanti?']],
  ['Casa virtuale','Viste del modellino ed eventi simulati',[],[
    'Mostrami la cucina.','Mostrami il bagno.','Mostrami il contatore dell’acqua.',
    'Mostrami il contatore del gas.','Mostrami l’impianto idrico.','Mostrami l’impianto del gas.',
    'Quale stanza registra più consumi simulati?','Mostrami le anomalie nella casa.','Riporta la casa alla visuale iniziale.']],
  ['Simulazioni','Scenari ipotetici da discutere in chat',[],[
    'Descrivi una giornata ipotetica con cinque abitanti.','Quanto risparmierei riducendo le docce di tre minuti?',
    'Cosa succede se utilizzo meno il riscaldamento?','Descrivi uno scenario di consumo idrico elevato.',
    'Confronta due scenari domestici ipotetici.','Stima un mese con consumi inferiori.']],
  ['Anomalie','Letture da approfondire',[
    'Quali anomalie sono state registrate?','Quali contatori presentano dati insoliti?'],[
    'Spiegami l’ultima anomalia.','Perché questo consumo è stato segnalato?',
    'Mostrami lo storico delle anomalie.','Quali controlli sarebbe opportuno effettuare?']],
  ['Risparmio e sostenibilità','Obiettivi e abitudini domestiche',[
    'Come posso ridurre i consumi domestici?','Quali obiettivi sto raggiungendo?',
    'Come posso risparmiare acqua?','Come posso ridurre i consumi di gas?'],[
    'Suggeriscimi tre modi per risparmiare acqua.','Suggeriscimi tre modi per ridurre i consumi di gas.','Crea un piano di risparmio personalizzato.','Come posso migliorare le mie abitudini?']],
  ['Report e analisi','Sintesi e serie storiche',[
    'Analizza i consumi idrici degli ultimi 365 giorni.'],[
    'Analizza gli ultimi dodici mesi.',
    'Genera un report del mese.','Riassumi i miei consumi in una tabella.',
    'Come posso confrontare i dati delle mie abitazioni?',
    'Mostrami un grafico dei consumi settimanali.','Genera un riepilogo per la presentazione scolastica.']],
  ['Domande generali','Concetti e spiegazioni',[],[
    'Come funziona un contatore dell’acqua?','Come funziona un contatore del gas?',
    'Che cosa significa metro cubo?','Come funziona il machine learning?','Che cos’è MQTT?',
    'Che cos’è un Digital Twin?','Come funziona M.A.I.A.?','Come mi spiegheresti un argomento a mia scelta?']]
];

const normalize = text => text.toLocaleLowerCase('it').normalize('NFD').replace(/\p{M}/gu,'').trim();

export function mountQuestionCatalog(trigger, textarea, configured) {
  const dialog=document.createElement('dialog');
  dialog.className='question-catalog';
  dialog.setAttribute('aria-labelledby','question-catalog-title');
  dialog.innerHTML=`<form method="dialog" class="catalog-heading"><h2 id="question-catalog-title">Esplora le domande</h2><button class="secondary small" aria-label="Chiudi catalogo">Chiudi</button></form>
    <label class="sr-only" for="catalog-search">Cerca nel catalogo</label>
    <input id="catalog-search" type="search" placeholder="Cerca per parola o argomento">
    <div class="catalog-results"></div>`;
  trigger.closest('form').after(dialog);
  const search=dialog.querySelector('input'), results=dialog.querySelector('.catalog-results');
  function filter() {
    const query=normalize(search.value);
    results.replaceChildren();
    for(const [name,description,local,model=[]] of catalog) {
      const matches=[...local,...model].filter(question=>normalize(name+' '+question).includes(query));
      if(!matches.length) continue;
      const group=document.createElement('details');
      const summary=document.createElement('summary');
      summary.textContent=name;
      group.open=Boolean(query)||results.childElementCount===0;
      group.append(summary);
      const note=document.createElement('p');
      note.textContent=description+(!configured&&matches.some(question=>model.includes(question))?' · Alcune domande richiedono un modello linguistico.':'');
      group.append(note);
      for(const question of matches) {
        const option=document.createElement('button');
        option.type='button';
        option.className='catalog-question';
        option.textContent=question;
        if(!configured&&model.includes(question)) {
          option.disabled=true;
          option.title='Richiede un modello linguistico attivo';
        }
        option.onclick=()=>{
          textarea.value=question;
          textarea.dispatchEvent(new window.Event('input'));
          dialog.close('insert');
        };
        group.append(option);
      }
      results.append(group);
    }
    if(!results.children.length) results.textContent='Nessuna domanda corrisponde alla ricerca.';
  }
  search.addEventListener('input',filter);
  dialog.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp'].includes(event.key)) return;
    const buttons=[search,...results.querySelectorAll('summary,details[open] button:not(:disabled)')];
    const next=buttons.indexOf(document.activeElement)+(event.key==='ArrowDown'?1:-1);
    if(buttons[next]) {event.preventDefault();buttons[next].focus();}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog) dialog.close();});
  dialog.addEventListener('close',()=>{
    trigger.setAttribute('aria-expanded','false');
    (dialog.returnValue==='insert'?textarea:trigger).focus();
  });
  trigger.onclick=()=>{
    dialog.returnValue='';
    search.value='';
    filter();
    dialog.showModal();
    trigger.setAttribute('aria-expanded','true');
    search.focus();
  };
}
