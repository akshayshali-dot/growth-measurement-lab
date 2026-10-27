/** Reconcile an anonymised, frozen inventory to one engine's status snapshot. */
export function summarizeIndexEvidence(inventory, observations) {
  if (!Array.isArray(inventory) || !Array.isArray(observations)) throw new TypeError('Expected inventory and observations arrays');
  const validKey = key => typeof key === 'string' && /^[a-z0-9_-]{1,80}$/i.test(key);
  const items = new Map();
  for (const row of inventory) {
    if (!row || !validKey(row.key) || !['intended','variant'].includes(row.kind)) throw new Error('Invalid inventory row');
    if (items.has(row.key)) throw new Error(`Duplicate inventory key: ${row.key}`);
    items.set(row.key, row.kind);
  }
  const statuses = new Map();
  for (const row of observations) {
    if (!row || !validKey(row.key) || !['indexed','not_indexed','unknown'].includes(row.status)) throw new Error('Invalid observation');
    if (!items.has(row.key)) throw new Error(`Observation has no inventory match: ${row.key}`);
    if (items.get(row.key) !== 'intended') throw new Error(`Variant status must be reviewed separately: ${row.key}`);
    if (statuses.has(row.key)) throw new Error(`Duplicate or conflicting observation: ${row.key}`);
    statuses.set(row.key, row.status);
  }
  let intended=0,indexed=0,notIndexed=0,unknown=0,variants=0;
  for (const [key,kind] of items) {
    if (kind === 'variant') { variants++; continue; }
    intended++;
    const state=statuses.get(key) ?? 'unknown';
    if (state === 'indexed') indexed++;
    else if (state === 'not_indexed') notIndexed++;
    else unknown++;
  }
  const pct = value => intended === 0 ? null : 100*value/intended;
  return {intended,indexed,notIndexed,unknown,variants,confirmedPct:pct(indexed),observedPct:pct(indexed+notIndexed),possibleUpperPct:pct(indexed+unknown)};
}
