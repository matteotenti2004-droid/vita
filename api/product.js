import { adapt } from '../netlify/lib/vercel-adapter.js';
import { handler } from '../netlify/functions/product.js';
export default adapt(handler);
