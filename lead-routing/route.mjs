import { nextHandoffAction } from '../agent-handoff.mjs';
const fields = ['eventId','replyBasis','identity','writeState','humanRequested','ownerId','routeOwnerId','ownerAcknowledged','source'];
const optionalId = x => x === null || (typeof x === 'string' && /^[a-z0-9_-]{1,80}$/i.test(x));
// Pure decisions over a frozen synthetic snapshot. No network, retries or writes.
export function planHandoffs(records) {
  if (!Array.isArray(records) || records.length > 10000) throw new TypeError('Provide at most 10000 records');
  const seen = new Map(); const decisions = []; let duplicateRows = 0;
  for (const row of records) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== fields.length || fields.some(key => !Object.hasOwn(row,key)) || !optionalId(row.ownerId) || !optionalId(row.routeOwnerId) || typeof row.ownerAcknowledged !== 'boolean' || !['direct','organic','paid','referral','unknown'].includes(row.source) || (row.ownerAcknowledged && (!row.ownerId || row.writeState !== 'confirmed'))) throw new TypeError('Invalid routing record');
    const action = nextHandoffAction(row);
    const signature = JSON.stringify(fields.map(key => row[key]));
    if (seen.has(row.eventId)) {
      if (seen.get(row.eventId) !== signature) throw new Error(`Conflicting snapshot for ${row.eventId}`);
      duplicateRows++; continue;
    }
    seen.set(row.eventId, signature);
    const base = { eventId: row.eventId, source: row.source };
    if (action.action === 'verify_owner') {
      decisions.push({...base, action: row.ownerAcknowledged ? 'acknowledged' : 'verify_owner', reason: row.ownerAcknowledged ? 'confirmed_and_acknowledged' : row.ownerId ? 'acknowledgement_missing' : 'owner_missing', ownerId: row.ownerId});
    } else if (action.action === 'eligible_for_controlled_write') {
      const ownerId = row.ownerId ?? row.routeOwnerId;
      decisions.push({...base, action: ownerId ? 'ready_for_adapter' : 'review', reason: ownerId ? (row.ownerId ? 'preserve_existing_owner' : 'approved_route_owner') : 'no_owner_available', ownerId});
    } else decisions.push({...base, ...action, ownerId: row.ownerId});
  }
  const counts = Object.fromEntries(['ready_for_adapter','hold','review','reconcile','verify_owner','acknowledged'].map(key => [key, decisions.filter(x => x.action === key).length]));
  return { inputRows:records.length, uniqueEvents:decisions.length, duplicateRows, counts, decisions };
}
