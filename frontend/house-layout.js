// All positions are in metres. X runs across the footprint, Z runs from rear to front.
export const roomLayout = [
  {id:'entry',label:'Ingresso',center:[-.5,5.26],size:[2.1,.68],surface:'terrace',plan:[4,4,2]},
  {id:'hall',label:'Corridoio',center:[0,0],size:[15.5,1.15],surface:'oak',plan:[2,1,10]},
  {id:'living',label:'Soggiorno',center:[-5.1,2.8],size:[5.3,4.4],surface:'oak',plan:[3,1,3]},
  {id:'kitchen',label:'Cucina',center:[-5.63,-2.8],size:[4.24,4.4],surface:'stone',plan:[1,1,3]},
  {id:'dining',label:'Sala da pranzo',center:[-.5,2.8],size:[3.8,4.4],surface:'oak',plan:[3,4,2]},
  {id:'bathroom',label:'Bagno',center:[1.27,-2.8],size:[2.5,4.4],surface:'stone',plan:[1,6,2]},
  {id:'primary',label:'Camera matrimoniale',center:[3.22,2.8],size:[3.6,4.4],surface:'oak',plan:[3,6,3]},
  {id:'bedroom',label:'Seconda camera',center:[-1.74,-2.8],size:[3.46,4.4],surface:'oak',plan:[1,4,2]},
  {id:'laundry',label:'Lavanderia',center:[3.49,-2.8],size:[1.9,4.4],surface:'stone',plan:[1,8,1]},
  {id:'utility',label:'Locale tecnico',center:[6.1,-2.8],size:[3.15,4.4],surface:'stone',plan:[1,9,2]},
  {id:'garage',label:'Garage',center:[6.4,2.8],size:[2.66,4.4],surface:'terrace',plan:[3,9,2]},
  {id:'garden',label:'Giardino',center:[-3.4,6.2],size:[7.5,1.6],surface:'grass',plan:[4,1,3]}
];

export const meterLayout = [
  {id:'water',label:'Contatore acqua',center:[5.75,-3.45],plan:[4,6,2]},
  {id:'gas',label:'Contatore gas',center:[8.15,-2.75],plan:[4,8,3]}
];

export const deviceLayout = [
  {id:'tap',room:'kitchen',kind:'water',label:'Lavandino',position:[.76,1.18,-1.37]},
  {id:'dishwasher',room:'kitchen',kind:'water',label:'Lavastoviglie',position:[-.8,.70,-.88]},
  {id:'stove',room:'kitchen',kind:'gas',label:'Piano cottura',position:[-.8,1.04,-1.42]},
  {id:'shower',room:'bathroom',kind:'water',label:'Doccia',position:[-.75,.95,-.65]},
  {id:'washer',room:'laundry',kind:'water',label:'Lavatrice',position:[-.58,.85,.2]},
  {id:'heating',room:'utility',kind:'gas',label:'Caldaia',position:[-.85,1.45,-.64]}
];
