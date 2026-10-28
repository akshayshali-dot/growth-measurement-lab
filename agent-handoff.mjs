// A deterministic teaching example. It performs no network or CRM writes.
// Policy inputs must be set by the organisation; the model does not decide them.
const opaqueId = value => typeof value === 'string' && /^[a-z0-9_-]{1,80}$/i.test(value);
const values = {
  replyBasis: new Set(['approved', 'denied', 'unknown']),
  identity: new Set(['matched', 'new', 'ambiguous', 'unknown']),
  writeState: new Set(['not_started', 'unknown', 'confirmed', 'failed']),
};

export function nextHandoffAction(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      !opaqueId(record.eventId) || !values.replyBasis.has(record.replyBasis) ||
      !values.identity.has(record.identity) || !values.writeState.has(record.writeState) ||
      typeof record.humanRequested !== 'boolean') {
    throw new TypeError('Invalid handoff record');
  }

  // An uncertain outcome must be checked before another write is considered.
  if (record.writeState === 'unknown') return { action: 'reconcile', reason: 'write_outcome_unknown' };
  // A confirmed CRM write does not mean an owner has acknowledged or replied.
  if (record.writeState === 'confirmed') return { action: 'verify_owner', reason: 'write_confirmed' };
  if (record.replyBasis === 'denied') return { action: 'hold', reason: 'reply_not_approved' };
  if (record.replyBasis === 'unknown') return { action: 'review', reason: 'reply_basis_unknown' };
  if (record.writeState === 'failed') return { action: 'review', reason: 'write_failed' };
  if (record.humanRequested) return { action: 'review', reason: 'human_requested' };
  if (record.identity === 'ambiguous' || record.identity === 'unknown') {
    return { action: 'review', reason: 'identity_unresolved' };
  }
  return { action: 'eligible_for_controlled_write', reason: 'checks_passed' };
}
