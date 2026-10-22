// All records are fictional. These transparent heuristics power the prototype;
// no trained XGBoost model or real-time data feed is connected.
export const SNAPSHOT = '2026-10-20';
export const WEIGHTS = [0.40, 0.25, 0.15, 0.12, 0.08];
export const clamp = (v, min=0, max=100) => Math.min(max, Math.max(min, v));
export function riskFactors(s) {
  return [
    {name:'Delivery reliability', value:clamp((100-s.on_time_rate)*1.45), weight:WEIGHTS[0], detail:`${s.on_time_rate}% on-time delivery`},
    {name:'Historical delays', value:clamp(s.avg_delay_days*8.5), weight:WEIGHTS[1], detail:`${s.avg_delay_days} days average delay`},
    {name:'Quality issues', value:clamp(s.defect_rate*18), weight:WEIGHTS[2], detail:`${s.defect_rate}% defect rate`},
    {name:'Supplier dependency', value:s.dependency, weight:WEIGHTS[3], detail:`${s.dependency}% category dependency`},
    {name:'Lead-time volatility', value:s.volatility, weight:WEIGHTS[4], detail:`${s.volatility}/100 variability index`}
  ].map(f=>({...f,contribution:f.value*f.weight}));
}
export const riskScore = s => Math.round(riskFactors(s).reduce((n,f)=>n+f.contribution,0));
export const riskLevel = score => score>=65?'high':score>=35?'medium':'low';
export function estimatedDelay(s) {
  return Math.round((s.avg_delay_days*0.8 + (100-s.on_time_rate)*0.045 + s.volatility*0.018 + s.defect_rate*0.15)*10)/10;
}
export function simulate(s, params) {
  const scenario = {...s,
    on_time_rate:clamp(s.on_time_rate+Number(params.reliability)),
    avg_delay_days:Math.max(0,s.avg_delay_days+Number(params.disruption)-Number(params.buffer)),
    dependency:clamp(s.dependency-Number(params.diversification)),
    volatility:clamp(s.volatility+Number(params.disruption)*3)
  };
  return {...scenario,score:riskScore(scenario),delay:estimatedDelay(scenario)};
}
export const DEMO_SUPPLIERS = [
  {id:'SUP-001',name:'Shenzhen Precision',initials:'SP',country:'China',city:'Shenzhen',region:'Asia Pacific',category:'Electronics',spend:2480000,on_time_rate:62,avg_delay_days:13,defect_rate:4.1,dependency:85,volatility:78,lat:22.5,lon:114.1,trend:9},
  {id:'SUP-002',name:'Mekong Components',initials:'MC',country:'Vietnam',city:'Hai Phong',region:'Asia Pacific',category:'Electronics',spend:1840000,on_time_rate:67,avg_delay_days:12,defect_rate:3.9,dependency:72,volatility:76,lat:20.8,lon:106.7,trend:6},
  {id:'SUP-003',name:'Deccan Industrial',initials:'DI',country:'India',city:'Pune',region:'Asia Pacific',category:'Raw materials',spend:1260000,on_time_rate:69,avg_delay_days:11,defect_rate:4.2,dependency:78,volatility:80,lat:18.5,lon:73.9,trend:4},
  {id:'SUP-004',name:'Formosa Circuits',initials:'FC',country:'Taiwan',city:'Kaohsiung',region:'Asia Pacific',category:'Electronics',spend:2120000,on_time_rate:82,avg_delay_days:6.2,defect_rate:2.4,dependency:68,volatility:56,lat:22.6,lon:120.3,trend:3},
  {id:'SUP-005',name:'Hanul Materials',initials:'HM',country:'South Korea',city:'Incheon',region:'Asia Pacific',category:'Raw materials',spend:1680000,on_time_rate:91,avg_delay_days:2.4,defect_rate:0.7,dependency:38,volatility:28,lat:37.5,lon:126.7,trend:-4},
  {id:'SUP-006',name:'Straits Packaging',initials:'ST',country:'Malaysia',city:'Penang',region:'Asia Pacific',category:'Packaging',spend:560000,on_time_rate:86,avg_delay_days:4.8,defect_rate:2.5,dependency:55,volatility:42,lat:5.4,lon:100.3,trend:2},
  {id:'SUP-007',name:'Aichi Motion',initials:'AM',country:'Japan',city:'Nagoya',region:'Asia Pacific',category:'Mechanical parts',spend:2300000,on_time_rate:97,avg_delay_days:0.8,defect_rate:0.3,dependency:42,volatility:18,lat:35.2,lon:136.9,trend:-2},
  {id:'SUP-008',name:'Nordwerk Engineering',initials:'NE',country:'Germany',city:'Stuttgart',region:'Europe',category:'Mechanical parts',spend:1950000,on_time_rate:94,avg_delay_days:1.6,defect_rate:0.5,dependency:34,volatility:24,lat:48.8,lon:9.2,trend:-3},
  {id:'SUP-009',name:'Sierra Metals',initials:'SM',country:'Mexico',city:'Monterrey',region:'Americas',category:'Raw materials',spend:1540000,on_time_rate:80,avg_delay_days:5.6,defect_rate:1.8,dependency:64,volatility:60,lat:25.7,lon:-100.3,trend:5},
  {id:'SUP-010',name:'Baltic Logistics',initials:'BL',country:'Poland',city:'Gdańsk',region:'Europe',category:'Packaging',spend:740000,on_time_rate:84,avg_delay_days:5.2,defect_rate:2.1,dependency:52,volatility:48,lat:54.4,lon:18.6,trend:1},
  {id:'SUP-011',name:'Great Lakes Assembly',initials:'GL',country:'United States',city:'Chicago',region:'Americas',category:'Mechanical parts',spend:1780000,on_time_rate:98,avg_delay_days:0.5,defect_rate:0.2,dependency:26,volatility:14,lat:41.9,lon:-87.6,trend:-1},
  {id:'SUP-012',name:'Meridian Polymers',initials:'MP',country:'Malaysia',city:'Johor Bahru',region:'Asia Pacific',category:'Packaging',spend:920000,on_time_rate:88,avg_delay_days:3.7,defect_rate:1.7,dependency:49,volatility:38,lat:1.5,lon:103.8,trend:-2}
];
export function makeShipments(suppliers=DEMO_SUPPLIERS) {
  return suppliers.flatMap((s,i)=>Array.from({length:3},(_,j)=>{
    const score=riskScore(s);
    const days=j===0&&score>=65?i%3-4:j*4+i%4+1;
    const due=new Date(`${SNAPSHOT}T12:00:00Z`); due.setUTCDate(due.getUTCDate()+days);
    const status=j===0&&score>=65?'Delayed':score>=35&&j!==2?'At risk':'On track';
    const delay=status==='On track'?0:Math.round(estimatedDelay(s)*10)/10;
    return {id:`SHP-${2401+i*3+j}`,supplierId:s.id,destination:'Indianapolis, US',mode:s.region==='Americas'?'Road':j===2?'Air':'Ocean',value:Math.round(s.spend/26*(0.7+j*0.2)),due:due.toISOString().slice(0,10),status,delay,score,progress:Math.min(94,32+i*3+j*14)};
  }));
}
export function summarize(suppliers) {
  const spend=suppliers.reduce((n,s)=>n+s.spend,0);
  const high=suppliers.filter(s=>riskLevel(riskScore(s))==='high');
  return {total:suppliers.length,high:high.length,spend,atRisk:high.reduce((n,s)=>n+s.spend,0),onTime:spend?suppliers.reduce((n,s)=>n+s.on_time_rate*s.spend,0)/spend:0,score:spend?Math.round(suppliers.reduce((n,s)=>n+riskScore(s)*s.spend,0)/spend):0};
}
export const CSV_FIELDS=['id','name','country','region','category','spend','on_time_rate','avg_delay_days','defect_rate','dependency','volatility'];
export function parseCSV(text) {
  text=text.replace(/^\uFEFF/,'');
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"') { if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted||field===''){quoted=!quoted;}else throw new Error('Unexpected quote in CSV. Quote fields that contain commas.'); }
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('A quoted CSV field is missing its closing quote.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function importSuppliers(text,existingIds=[]) {
  const rows=parseCSV(text);if(rows.length<2)throw new Error('The CSV needs a header and at least one supplier.');
  const headers=rows.shift().map(v=>v.trim().toLowerCase());
  const missing=CSV_FIELDS.filter(f=>!headers.includes(f));
  if(missing.length)throw new Error(`Missing columns: ${missing.join(', ')}`);
  if(new Set(headers).size!==headers.length)throw new Error('CSV headers must be unique.');
  if(rows.length>500)throw new Error('Please import up to 500 suppliers at a time.');
  const seen=new Set(existingIds);
  return rows.map((row,i)=>{
    if(row.length!==headers.length)throw new Error(`Row ${i+2}: column count does not match the header.`);
    const s=Object.fromEntries(headers.map((h,j)=>[h,row[j].trim()]));
    for(const f of CSV_FIELDS.slice(0,5))if(!s[f])throw new Error(`Row ${i+2}: ${f} cannot be empty.`);
    if(seen.has(s.id))throw new Error(`Row ${i+2}: duplicate supplier ID ${s.id}.`);seen.add(s.id);
    for(const f of CSV_FIELDS.slice(5)){
      if(s[f]===''||!Number.isFinite(Number(s[f]))||Number(s[f])<0)throw new Error(`Row ${i+2}: ${f} must be a non-negative number.`);
      s[f]=Number(s[f]);
    }
    for(const f of ['on_time_rate','defect_rate','dependency','volatility'])if(s[f]>100)throw new Error(`Row ${i+2}: ${f} must be between 0 and 100.`);
    if(!['Americas','Europe','Asia Pacific','Middle East & Africa'].includes(s.region))throw new Error(`Row ${i+2}: use Americas, Europe, Asia Pacific, or Middle East & Africa for region.`);
    s.initials=s.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();s.city=s.country;s.trend=0;s.imported=true;
    return s;
  });
}
export function toCSV(rows,fields) {
  // Prefix spreadsheet formulas to keep exported user-entered text inert.
  const cell=x=>{let v=String(x??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
  return [fields.map(cell).join(','),...rows.map(r=>fields.map(f=>cell(r[f])).join(','))].join('\r\n');
}
