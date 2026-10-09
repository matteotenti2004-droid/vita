import { adapt } from '../netlify/lib/vercel-adapter.js';
import { handler } from '../netlify/functions/config.js';
export default adapt(handler);
