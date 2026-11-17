// Real HTTP operations through the Vite proxy. Creates a new 50-in / 10-out demo each run.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.API_BASE||'http://127.0.0.1:5173/api';
const snapshotFile=new URL('../.runtime/smoke-state.json',import.meta.url);
async function api(path,body,status=200){const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(value)}`);return value;}
async function state(){const rows=await api('/inventory');return {quantity:rows.reduce((n,i)=>n+i.quantity,0),reserved:rows.reduce((n,i)=>n+i.reserved,0),ledger:(await api('/transactions')).length};}
assert.equal((await api('/health')).status,'ok');
if(process.argv.includes('--verify-persistence')){const old=JSON.parse(await readFile(snapshotFile,'utf8'));assert.deepEqual(await state(),old.state);const order=(await api('/sales-orders')).find(o=>o.id===old.orderId);assert.equal(order.status,'SHIPPED');console.log('PASS: stock, reservations, ledger, and shipped order survived restart.');process.exit(0);}
await api('/demo/seed',{});
const product=(await api('/products')).find(p=>p.barcode==='WM101');
const before=await state(),suffix=Date.now().toString();
const body=(reference,quantity)=>({reference,partner:'Jury demo',lines:[{productId:product.id,quantity}]});
const po=await api('/mock-erp/purchase-orders',body('PO-DEMO-'+suffix,50));
const receipt={barcode:'WM101',locationCode:'RECV-01',quantity:50,operationKey:randomUUID()};
await api(`/purchase-orders/${po.id}/receive`,{...receipt,barcode:'BAD',operationKey:randomUUID()},404);
assert.deepEqual(await state(),before);
await api(`/purchase-orders/${po.id}/receive`,receipt);await api(`/purchase-orders/${po.id}/receive`,receipt);
assert.equal((await state()).quantity,before.quantity+50);console.log('PASS: receive 50, reject wrong scan, and deduplicate receipt.');
await api('/putaway',{barcode:'WM101',sourceCode:'RECV-01',destinationCode:'A-01',quantity:50,operationKey:randomUUID()});
const so=await api('/mock-erp/sales-orders',body('SO-DEMO-'+suffix,10));
await api(`/sales-orders/${so.id}/allocate`,{});
assert.equal((await state()).reserved,before.reserved+10);
for(const t of await api(`/sales-orders/${so.id}/tasks`)){await api(`/pick-tasks/${t.id}/confirm`,{barcode:'WM101',sourceCode:t.inventory.location.code,packingCode:'PACK-01',quantity:t.quantity});}
assert.equal((await state()).quantity,before.quantity+50);console.log('PASS: allocate and pick 10; physical on hand unchanged.');
const cartonBarcode='CARTON-'+suffix;
await api(`/sales-orders/${so.id}/pack`,{cartonBarcode,scans:[{barcode:'WM101',quantity:10}]});
await api(`/sales-orders/${so.id}/dispatch`,{cartonBarcode});const shipped=await state();
await api(`/sales-orders/${so.id}/dispatch`,{cartonBarcode});assert.deepEqual(await state(),shipped);
assert.equal(shipped.quantity,before.quantity+40);assert.equal(shipped.reserved,before.reserved);
console.log('PASS: dispatch once; duplicate dispatch changes nothing.');
const message=(await api('/erp-messages')).find(m=>m.type==='DISPATCH'&&m.reference===so.reference);
assert.ok(message);await api(`/erp-messages/${message.id}/acknowledge`,{fail:true});assert.deepEqual(await state(),shipped);await api(`/erp-messages/${message.id}/acknowledge`,{fail:false});
await mkdir(new URL('../.runtime/',import.meta.url),{recursive:true});await writeFile(snapshotFile,JSON.stringify({state:shipped,orderId:so.id},null,2));
console.log(`PASS: ERP failure and retry. Final on hand: ${shipped.quantity}. Saved persistence checkpoint.`);
