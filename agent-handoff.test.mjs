import test from 'node:test';
import assert from 'node:assert/strict';
import { nextHandoffAction as decide } from './agent-handoff.mjs';

const base = { eventId: 'syn_001', replyBasis: 'approved', identity: 'matched', writeState: 'not_started', humanRequested: false };

test('valid matched and new synthetic records may proceed to a controlled writer', () => {
  for (const identity of ['matched', 'new']) assert.deepEqual(decide({ ...base, identity }), { action: 'eligible_for_controlled_write', reason: 'checks_passed' });
});
test('unknown write outcomes are reconciled rather than retried, regardless of other fields', () => {
  for (const replyBasis of ['approved', 'denied', 'unknown']) assert.equal(decide({ ...base, replyBasis, writeState: 'unknown' }).action, 'reconcile');
});
test('a confirmed write still requires owner verification', () => {
  assert.deepEqual(decide({ ...base, writeState: 'confirmed' }), { action: 'verify_owner', reason: 'write_confirmed' });
});
test('denied or unknown permission cannot trigger an automated write', () => {
  assert.equal(decide({ ...base, replyBasis: 'denied' }).action, 'hold');
  assert.equal(decide({ ...base, replyBasis: 'unknown' }).action, 'review');
});
test('failed writes, human requests and unresolved identity go to review', () => {
  assert.equal(decide({ ...base, writeState: 'failed' }).reason, 'write_failed');
  assert.equal(decide({ ...base, humanRequested: true }).reason, 'human_requested');
  for (const identity of ['ambiguous', 'unknown']) assert.equal(decide({ ...base, identity }).reason, 'identity_unresolved');
});
test('invalid or non-opaque inputs fail closed', () => {
  for (const record of [null, [], {}, { ...base, eventId: '' }, { ...base, eventId: 'name@example.com' }, { ...base, eventId: 'x'.repeat(81) }, { ...base, replyBasis: 'yes' }, { ...base, identity: 'merged' }, { ...base, writeState: 'timeout' }, { ...base, humanRequested: 'false' }]) assert.throws(() => decide(record), TypeError);
});
