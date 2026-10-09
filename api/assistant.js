import { adapt } from '../netlify/lib/vercel-adapter.js';
import { handler } from '../netlify/functions/assistant.js';
export default adapt(handler);
