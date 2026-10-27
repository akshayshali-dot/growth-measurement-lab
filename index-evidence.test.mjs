import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeIndexEvidence as summarize} from './index-evidence.mjs';

test('reconciles a frozen intended inventory and separates variants',()=>{
  const inventory=Array.from({length:100},(_,i)=>({key:`p_${i}`,kind:'intended'})).concat(Array.from({length:30},(_,i)=>({key:`v_${i}`,kind:'variant'})));
  const observations=inventory.slice(0,85).map((row,i)=>({key:row.key,status:i<65?'indexed':'not_indexed'}));
  assert.deepEqual(summarize(inventory,observations),{intended:100,indexed:65,notIndexed:20,unknown:15,variants:30,confirmedPct:65,observedPct:85,possibleUpperPct:80});
});
test('empty denominator and explicitly unknown status remain unknown',()=>{
  assert.equal(summarize([{key:'v',kind:'variant'}],[]).confirmedPct,null);
  assert.equal(summarize([{key:'a',kind:'intended'}],[{key:'a',status:'unknown'}]).unknown,1);
});
test('rejects duplicates, conflicting observations and unmatched keys',()=>{
  assert.throws(()=>summarize([{key:'a',kind:'intended'},{key:'a',kind:'variant'}],[]));
  const inventory=[{key:'a',kind:'intended'}];
  assert.throws(()=>summarize(inventory,[{key:'a',status:'indexed'},{key:'a',status:'not_indexed'}]));
  assert.throws(()=>summarize(inventory,[{key:'b',status:'indexed'}]));
  assert.throws(()=>summarize([{key:'v',kind:'variant'}],[{key:'v',status:'indexed'}]));
});
test('rejects malformed data and raw URL keys',()=>{
  for(const key of ['',null,'https://example.com/private','a b']) assert.throws(()=>summarize([{key,kind:'intended'}],[]));
  assert.throws(()=>summarize([{key:'a',kind:'canonical'}],[]));
  assert.throws(()=>summarize([{key:'a',kind:'intended'}],[{key:'a',status:'maybe'}]));
  assert.throws(()=>summarize(null,[]));
});
test('resolving missing status as indexed raises lower bound, preserves upper bound',()=>{
  const inv=[{key:'a',kind:'intended'},{key:'b',kind:'intended'}];
  const before=summarize(inv,[{key:'a',status:'indexed'}]);
  const after=summarize(inv,[{key:'a',status:'indexed'},{key:'b',status:'indexed'}]);
  assert.equal(before.confirmedPct,50); assert.equal(after.confirmedPct,100); assert.equal(after.possibleUpperPct,before.possibleUpperPct);
});
