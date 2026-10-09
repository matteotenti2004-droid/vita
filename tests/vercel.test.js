import test from 'node:test';
import assert from 'node:assert/strict';
import { adapt } from '../netlify/lib/vercel-adapter.js';
import config from '../api/config.js';
import {requestBody} from '../netlify/lib/http.js';
const response = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(body){this.body=body;}});
test('Vercel adapter preserves origin/auth/body checks and response headers', async () => {
  const res = response();
  await adapt(async event => {
    assert.equal(event.headers.authorization, 'Bearer token');
    assert.equal(event.headers['x-nf-client-connection-ip'], '203.0.113.10');
    assert.equal(requestBody(event).question, 'Ciao');
    return {statusCode:200,headers:{'Cache-Control':'no-store'},body:'ok'};
  })({method:'POST',headers:{Host:'vita.vercel.app',Origin:'https://vita.vercel.app',Authorization:'Bearer token','x-forwarded-for':'203.0.113.10','x-nf-client-connection-ip':'spoof'},body:{question:'Ciao'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.equal(res.body,'ok');
  await assert.rejects(adapt(async event => {requestBody(event);})({method:'POST',headers:{host:'vita.vercel.app',origin:'https://evil.example'},body:{}},response()), e => e.status === 403);
});
test('Vercel config route executes shared handler and rejects POST', async () => {
  const res=response();
  await config({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,200);
  assert.ok('aiProvider' in JSON.parse(res.body));
  const wrong=response();
  await config({method:'POST',headers:{},body:{}},wrong);
  assert.equal(wrong.statusCode,405);
});
