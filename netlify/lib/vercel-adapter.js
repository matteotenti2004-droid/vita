// Keep server handlers shared between Netlify and Vercel.
export function adapt(handler) {
  return async (req, res) => {
    const headers = Object.fromEntries(Object.entries(req.headers || {}).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value]));
    // Vercel supplies the trusted client address; never trust a client-supplied Netlify header.
    headers['x-nf-client-connection-ip'] = (headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const event = {
      httpMethod: req.method,
      headers,
      body: typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {}),
      isBase64Encoded: false,
    };
    const result = await handler(event);
    for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value);
    res.status(result.statusCode).send(result.body);
  };
}
