import { planHandoffs } from './route.mjs';
import { fixtures } from './fixtures.mjs';
console.log(JSON.stringify(planHandoffs(fixtures), null, 2));
