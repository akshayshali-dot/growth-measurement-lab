import { reconcile } from './reconcile.mjs';
// Entirely synthetic: no production/customer data or network connections.
const attempts = Array.from({length:75}, (_,i) => ({attemptId:`a${i+1}`,submissionId:`s${i+1}`,status:200}));
for(let i=0;i<7;i++) attempts.push({attemptId:`retry${i+1}`,submissionId:`s${i+1}`,status:200});
for(let i=0;i<18;i++) attempts.push({attemptId:`failed${i+1}`,submissionId:`s${76+i}`,status:503});
const contacts = Array.from({length:69},(_,i)=>({contactId:`c${i+1}`,submissionIds:[`s${i+1}`]}));
console.log(JSON.stringify(reconcile(attempts,contacts),null,2));
