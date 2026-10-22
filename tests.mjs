import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './dist/model.js';
import {icon} from './dist/icons.js';
import {DEMO_SUPPLIERS,CSV_FIELDS,SNAPSHOT,riskScore,riskLevel,simulate,estimatedDelay,makeShipments,summarize,importSuppliers,parseCSV,toCSV} from './dist/model.js';

test('risk index stays bounded at ideal and worst-case inputs',()=>{
  const ideal={on_time_rate:100,avg_delay_days:0,defect_rate:0,dependency:0,volatility:0};
  assert.equal(riskScore(ideal),0);
  assert.equal(riskScore({...ideal,on_time_rate:0,avg_delay_days:40,defect_rate:50,dependency:100,volatility:100}),100);
  assert.equal(riskLevel(34),'low');assert.equal(riskLevel(35),'medium');assert.equal(riskLevel(65),'high');
});
test('scenario starts at baseline, mitigation cannot worsen it, disruption cannot improve it',()=>{
  for(const s of DEMO_SUPPLIERS){
    const base={reliability:0,disruption:0,buffer:0,diversification:0};
    assert.equal(simulate(s,base).score,riskScore(s));
    assert.equal(simulate(s,base).delay,estimatedDelay(s));
    const better=simulate(s,{...base,reliability:25,buffer:14,diversification:60});
    assert.ok(better.score<=riskScore(s));assert.ok(better.delay<=estimatedDelay(s));
    assert.ok(better.on_time_rate<=100);assert.ok(better.dependency>=0);
    const worse=simulate(s,{...base,disruption:14});
    assert.ok(worse.score>=riskScore(s));assert.ok(worse.delay>=estimatedDelay(s));
  }
});
test('portfolio spend and status aggregates reconcile with demo records',()=>{
  const summary=summarize(DEMO_SUPPLIERS);assert.equal(summary.total,12);assert.equal(summary.high,3);
  assert.equal(summary.atRisk,5580000);assert.ok(summary.onTime>0&&summary.onTime<100);
  const shipments=makeShipments();assert.equal(shipments.length,36);assert.equal(new Set(shipments.map(s=>s.id)).size,36);
  for(const sh of shipments){assert.ok(DEMO_SUPPLIERS.some(s=>s.id===sh.supplierId));assert.ok(sh.value>0);if(sh.status==='Delayed')assert.ok(sh.due<SNAPSHOT);else assert.ok(sh.due>SNAPSHOT);}
});
test('CSV import handles BOM, CRLF, embedded quotes and multiline names',()=>{
  const sample={...DEMO_SUPPLIERS[0],id:'IMPORTED-01',name:'Example, "Precision"\nInc.'};
  const csv='\uFEFF'+toCSV([sample],CSV_FIELDS);
  const result=importSuppliers(csv,DEMO_SUPPLIERS.map(s=>s.id));
  assert.equal(result.length,1);assert.equal(result[0].name,sample.name);assert.equal(result[0].spend,sample.spend);assert.equal(result[0].imported,true);
});
test('invalid CSV cannot silently replace IDs or accept missing and out-of-range inputs',()=>{
  const sample={...DEMO_SUPPLIERS[0],id:'NEW'};
  assert.throws(()=>importSuppliers(toCSV([sample,sample],CSV_FIELDS)),/duplicate/);
  assert.throws(()=>importSuppliers(toCSV([DEMO_SUPPLIERS[0]],CSV_FIELDS),[DEMO_SUPPLIERS[0].id]),/duplicate/);
  assert.throws(()=>importSuppliers(toCSV([{...sample,on_time_rate:101}],CSV_FIELDS)),/between 0 and 100/);
  assert.throws(()=>importSuppliers(toCSV([{...sample,spend:''}],CSV_FIELDS)),/non-negative/);
  assert.throws(()=>importSuppliers(toCSV([{...sample,spend:-1}],CSV_FIELDS)),/non-negative/);
  assert.throws(()=>parseCSV('a,b\n"unclosed'),/closing quote/);
  assert.throws(()=>importSuppliers('name,country\nA,US'),/Missing columns/);
});
test('CSV exports neutralize spreadsheet formulas in imported text',()=>{
  const rows=parseCSV(toCSV([{name:'=HYPERLINK("example")'}],['name']));
  assert.ok(rows[1][0].startsWith("'="));
});

test('all five application views render against the complete demo dataset',()=>{
  const nodes=new Map();
  const document={title:'',body:{style:{}},activeElement:null,addEventListener(){},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',children:[],style:{},classList:{add(){},remove(){}},focus(){}});return nodes.get(selector);}};
  const context=vm.createContext({...model,icon,document,localStorage:{getItem:()=>null,setItem(){}},location:{hash:''},window:{addEventListener(){},scrollTo(){}},console,Intl,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()});
  const script=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(script,context);
  for(const page of ['overview','suppliers','shipments','scenarios','actions']){
    vm.runInContext(`state.page='${page}';render();`,context);
    const html=nodes.get('#app').innerHTML;
    assert.ok(html.includes('id="main"'),`${page} contains a main landmark`);
    assert.ok(html.includes('About the model'),`${page} exposes methodology`);
    assert.ok(!html.includes('NaN'),`${page} has finite calculated output`);
  }
  vm.runInContext("state.page='scenarios';state.params={reliability:10,disruption:0,buffer:5,diversification:25};saveScenario();",context);
  assert.equal(vm.runInContext('state.scenarios.length',context),1);
  assert.equal(vm.runInContext('state.tasks.length',context),3);
  vm.runInContext("openSupplier('SUP-001')",context);
  assert.ok(nodes.get('#overlay-root').innerHTML.includes('What is driving the index?'));
});
