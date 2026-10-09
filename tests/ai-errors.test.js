import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiError} from '../netlify/lib/ai-errors.js';
test('Gemini errors distinguish key, permissions, model, request and quota without exposing upstream content', () => {
  assert.match(geminiError(400, {error:{details:[{reason:'API_KEY_INVALID'}]}}), /Ricopia/);
  assert.match(geminiError(403, {error:{details:[{reason:'API_KEY_HTTP_REFERRER_BLOCKED'}]}}), /restrizioni/);
  assert.match(geminiError(403, {error:{details:[{reason:'SERVICE_DISABLED'}]}}), /non è abilitata/);
  assert.match(geminiError(404), /modello/);
  assert.match(geminiError(400), /formato/);
  assert.match(geminiError(429), /non viene usato OpenAI/);
  assert.ok(!geminiError(400, {error:{message:'secret-key user-private-text'}}).includes('secret-key'));
});
