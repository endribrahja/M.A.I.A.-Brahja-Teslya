export async function api(path,method='GET',body){
  const res=await fetch('/api'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body??{})});
  const data=await res.json(); if(!res.ok){const e=new Error(typeof data.detail==='string'?data.detail:'Richiesta non riuscita.');e.status=res.status;throw e}return data;
}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num=n=>n==null?'—':new Intl.NumberFormat('it-IT',{maximumFractionDigits:3}).format(n);
export const dateTime=t=>t==null?'Non disponibile':new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(t*1000));
export const day=d=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function shift(d,n){const a=new Date(d+'T12:00:00Z');a.setUTCDate(a.getUTCDate()+n);return a.toISOString().slice(0,10)}
