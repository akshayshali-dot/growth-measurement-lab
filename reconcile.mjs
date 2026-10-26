/** Local, dependency-free reconciliation. Use opaque IDs, never raw email addresses. */
export function reconcile(attempts, contacts) {
  if (!Array.isArray(attempts) || !Array.isArray(contacts)) throw new TypeError('Expected two arrays');
  const validId = value => typeof value === 'string' && value.trim().length > 0;
  const byAttempt = new Map();
  let duplicateExportRows = 0;
  for (const row of attempts) {
    if (!row || !validId(row.attemptId) || !validId(row.submissionId) || !Number.isInteger(row.status) || row.status < 200 || row.status > 599) throw new TypeError('Invalid attempt');
    const prior = byAttempt.get(row.attemptId);
    if (prior) {
      if (prior.submissionId !== row.submissionId || prior.status !== row.status) throw new Error('Conflicting attempt ID: ' + row.attemptId);
      duplicateExportRows++;
    } else byAttempt.set(row.attemptId, row);
  }
  const unique = [...byAttempt.values()];
  const successes = unique.filter(row => row.status < 300);
  const successfulIds = new Set(successes.map(row => row.submissionId));
  const allIds = new Set(unique.map(row => row.submissionId));
  const contactMap = new Map();
  for (const contact of contacts) {
    if (!contact || !validId(contact.contactId) || !Array.isArray(contact.submissionIds) || !contact.submissionIds.length || !contact.submissionIds.every(validId)) throw new TypeError('Invalid contact mapping');
    const ids = contactMap.get(contact.contactId) ?? new Set();
    contact.submissionIds.forEach(id => ids.add(id));
    contactMap.set(contact.contactId, ids);
  }
  const matchedContactIds = [];
  const unmatchedContactIds = [];
  const covered = new Set();
  const unknownMappingIds = new Set();
  for (const [id, submissions] of contactMap) {
    let matched = false;
    for (const submission of submissions) {
      if (successfulIds.has(submission)) { covered.add(submission); matched = true; }
      else unknownMappingIds.add(submission);
    }
    (matched ? matchedContactIds : unmatchedContactIds).push(id);
  }
  return {
    exportRows: attempts.length,
    duplicateExportRows,
    uniqueAttempts: unique.length,
    successfulAttempts: successes.length,
    distinctSuccessfulSubmissions: successfulIds.size,
    repeatedSuccessfulAttempts: successes.length - successfulIds.size,
    submissionsWithoutObservedSuccess: [...allIds].filter(id => !successfulIds.has(id)).sort(),
    uniqueNewContactsInExport: contactMap.size,
    matchedNewContacts: matchedContactIds.length,
    successfulSubmissionsWithNewContact: covered.size,
    successfulSubmissionsWithoutNewContact: [...successfulIds].filter(id => !covered.has(id)).sort(),
    unmatchedContactIds: unmatchedContactIds.sort(),
    mappingIdsWithoutObservedSuccess: [...unknownMappingIds].sort(),
    newContactCoverage: successfulIds.size ? covered.size / successfulIds.size : null,
  };
}
