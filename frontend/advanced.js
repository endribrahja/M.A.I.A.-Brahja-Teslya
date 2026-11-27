import {esc,num,day} from './api.js';
import {icon} from './icons.js';
const money=value=>value==null?'—':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(value);
const quantity=value=>value==null?'—':num(value)+' m³';
function forecast(v,k,n=30){const rows=v.forecast.slice(0,n);if(!rows.length)return '<p class="muted">Storico insufficiente: servono almeno 7 giorni completi.</p>';const mx=Math.max(...rows.map(x=>x.high),.001),w=600,h=150;const x=i=>20+i*(w-40)/Math.max(1,rows.length-1),y=v=>h-12-v/mx*(h-24);const pts=rows.map((r,i)=>`${x(i)},${y(r.value)}`).join(' ');const band=rows.map((r,i)=>`${x(i)},${y(r.high)}`).concat(rows.map((r,i)=>`${x(i)},${y(r.low)}`).reverse()).join(' ');return `<div class="forecast-total">${quantity(rows.reduce((s,r)=>s+r.value,0))} <small>nei prossimi ${n} giorni</small></div><svg class="forecast ${k}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Previsione con fascia di variabilità"><path d="M20 12H580M20 75H580M20 138H580" stroke="currentColor" opacity=".15" fill="none"/><polygon points="${band}" fill="currentColor" opacity=".15"/><polyline points="${pts}" stroke="currentColor" stroke-width="3" stroke-dasharray="6 4" fill="none"/>${rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.value)}" r="3" fill="currentColor"><title>${day(r.date)}: ${quantity(r.value)}</title></circle>`).join('')}</svg><div class="goal-line muted"><span>${day(rows[0].date)}</span><span>${day(rows.at(-1).date)}</span></div><details><summary>Valori della previsione</summary><div class="table-wrap forecast-table"><table><thead><tr><th>Giorno</th><th>Stima m³</th><th>Fascia indicativa m³</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${day(r.date)}</td><td>${num(r.value)}</td><td>${num(r.low)}–${num(r.high)}</td></tr>`).join('')}</tbody></table></div></details>`}

export function utilityInsights(analytics,kind,total){
  const row=analytics.utilities[kind];
  if(!row) return '';
  return `<div class="sp-utility-insights"><article class="card"><h2>Stima economica</h2>
      <div class="metric-value">${money(total==null?null:total*row.rate)}</div><p class="muted">Periodo selezionato · ${num(row.rate)} €/m³</p>
      <div class="metric-detail"><span>Mese corrente</span><strong>${money(row.cost)}</strong></div></article>
      <article class="card"><h2>Previsione a 7 giorni</h2>${forecast(row,kind,7)}</article>
      <article class="card"><h2>MAIA AI</h2><p>${kind==='water'?'Confronta giornate con abitudini simili per capire la variazione del consumo.':'Confronta periodi con condizioni stagionali simili per interpretare il consumo.'}</p>
      <button class="secondary" data-page="assistant">Chiedi a MAIA</button></article></div>`;
}
export function assistantPage(data){
  const ai=data.assistant||{};
  return `<section class="card chat-card" data-model-configured="${!!ai.configured}">
    <header class="assistant-intro"><div class="assistant-ident"><h1>Assistente dei consumi</h1>
    <p class="muted" data-model-status>${ai.configured?'Modello configurato · '+esc(ai.model):'Analisi statistica locale · Modello generativo non configurato'}</p></div>
    <button class="secondary small" type="button" data-chat-clear>Nuova chat</button></header>
    ${ai.external?'<p class="chat-disclosure">Domande, cronologia e dati sintetici di consumo vengono inviati al provider configurato. Evita di inserire informazioni personali.</p>':''}
    <div class="chat-workspace"><div class="chat-thread">
      <div id="chat-log" class="chat-log" role="log" aria-live="polite"></div>
      <template id="chat-welcome"><div class="chat-welcome"><span class="sp-ai-mark" aria-hidden="true">${icon('assistant')}</span><h2>Come posso aiutarti oggi?</h2><p>La tua casa, spiegata in modo intelligente.</p></div></template>
      <div class="suggestions" aria-label="Domande suggerite"></div>
      <div class="composer">
        <form id="assistant-form" class="chat-form">
          <label class="sr-only" for="question">Domanda</label>
          <textarea id="question" name="question" rows="1" maxlength="2000" required placeholder="Scrivi la tua domanda…"></textarea>
          <div class="composer-tools">
            <button type="button" class="secondary small" data-question-catalog aria-expanded="false">Esplora le domande</button>
            <button type="button" class="secondary small" data-chat="stop" hidden>Interrompi</button>
            <button type="submit" class="primary small" aria-label="Invia messaggio">↑</button>
          </div>
        </form>
        <p class="chat-footer" data-chat-status role="status"></p>
      </div>
    </div></div></section>`;}


export function securityPanel(enabled,push={}){return `<section class="card spaced"><h2>Sicurezza dell'account</h2><p class="muted">Autenticazione TOTP con un'app Authenticator. Conserva il segreto al sicuro; non esiste recupero automatico nella demo.</p><p><b>Stato:</b> ${enabled?'Attiva':'Non attiva'}</p><form id="factor-form" class="advanced-form"><label class="field">Password<input type="password" name="password" required autocomplete="current-password"></label>${enabled?'<label class="field">Codice a 6 cifre<input name="code" inputmode="numeric" pattern="[0-9]{6}" required></label>':'<div id="factor-secret"></div>'}<button type="submit" class="primary" data-factor-stage="${enabled?'disable':'setup'}">${enabled?'Disattiva 2FA':'Configura 2FA'}</button></form><div class="section-title spaced"><h2>Notifiche sul dispositivo</h2></div><button class="secondary" data-browser-notices>Abilita notifiche durante la sessione</button><p class="muted">Richiede il permesso del browser. La sessione deve essere aperta.</p>${push.configured?'<div class="spaced"><button class="secondary" data-push-enable>Attiva notifiche push in background</button> <button class="secondary" data-push-disable>Disattiva push</button><p class="muted">La sottoscrizione è associata alla sessione corrente.</p></div>':'<p class="muted spaced">Push in background: non configurato sul server (VAPID opzionale).</p>'}<button class="secondary spaced" data-install>Installa MAIA come app</button><p class="muted">Se il browser non mostra la richiesta, usa il suo menu “Installa app” o “Aggiungi alla schermata Home”.</p></section>`}
