import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from './reconcile.mjs';
const attempt = (attemptId, submissionId='s1', status=200) => ({attemptId,submissionId,status});
test('synthetic 100 / 82 / 75 / 69 example reconciles',()=>{
  const rows=Array.from({length:75},(_,i)=>attempt(`a${i}`,`s${i}`));
  for(let i=0;i<7;i++) rows.push(attempt(`r${i}`,`s${i}`));
  for(let i=0;i<18;i++) rows.push(attempt(`f${i}`,`f${i}`,503));
  const result=reconcile(rows,Array.from({length:69},(_,i)=>({contactId:`c${i}`,submissionIds:[`s${i}`]})));
  assert.equal(result.uniqueAttempts,100); assert.equal(result.successfulAttempts,82);
  assert.equal(result.distinctSuccessfulSubmissions,75); assert.equal(result.matchedNewContacts,69);
  assert.equal(result.newContactCoverage,0.92); assert.equal(result.repeatedSuccessfulAttempts,7);
  assert.equal(result.successfulSubmissionsWithoutNewContact.length,6);
});
test('empty denominator is unknown, not zero conversion',()=>assert.equal(reconcile([],[]).newContactCoverage,null));
test('duplicate export rows are separate from network retries',()=>{
  const r=reconcile([attempt('a'),attempt('a'),attempt('b')],[]);
  assert.equal(r.duplicateExportRows,1); assert.equal(r.uniqueAttempts,2); assert.equal(r.repeatedSuccessfulAttempts,1);
});
test('failure followed by success is one successful submission',()=>{
  const r=reconcile([attempt('a','s',503),attempt('b','s',201)],[]);
  assert.equal(r.distinctSuccessfulSubmissions,1); assert.deepEqual(r.submissionsWithoutObservedSuccess,[]);
});
test('conflicting IDs fail loudly',()=>assert.throws(()=>reconcile([attempt('a'),attempt('a','different')],[]),/Conflicting/));
test('one contact can map to several successful submissions without inflated coverage',()=>{
  const c={contactId:'c',submissionIds:['s1','s2']};
  const r=reconcile([attempt('a','s1'),attempt('b','s2')],[c,c]);
  assert.equal(r.uniqueNewContactsInExport,1); assert.equal(r.newContactCoverage,1);
});
test('unmatched contact mappings remain visible and do not boost coverage',()=>{
  const r=reconcile([attempt('a')],[{contactId:'x',submissionIds:['missing']}]);
  assert.deepEqual(r.unmatchedContactIds,['x']); assert.equal(r.newContactCoverage,0);
});
test('invalid input rejected; redirects are not success',()=>{
  assert.throws(()=>reconcile([attempt('', 's', 200)],[]),/Invalid/);
  assert.throws(()=>reconcile([attempt('a','s',NaN)],[]),/Invalid/);
  assert.throws(()=>reconcile([],[{contactId:'c',submissionIds:[]}]),/Invalid/);
  assert.equal(reconcile([attempt('a','s',302)],[]).successfulAttempts,0);
});
