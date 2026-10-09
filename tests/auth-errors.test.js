import test from "node:test";
import assert from "node:assert/strict";
import { authError } from "../src/auth-errors.js";
test("Signup explains email sender restrictions, confirmation and rate limits separately", () => {
  assert.match(authError({ code: "email_address_not_authorized" }), /SMTP/);
  assert.match(
    authError({ code: "over_email_send_rate_limit" }),
    /limite di invio email/,
  );
  assert.match(authError({ code: "email_not_confirmed" }), /Conferma prima/);
  assert.match(
    authError({ code: "signup_disabled" }),
    /registrazioni sono disabilitate/,
  );
});
test("Authentication errors distinguish mismatched key and network failure without printing raw upstream values", () => {
  assert.match(
    authError({ message: "Invalid API key: sb_secret_private" }),
    /chiave Supabase non è accettata/,
  );
  assert.equal(
    authError({ message: "Invalid API key: sb_secret_private" }).includes(
      "sb_secret_private",
    ),
    false,
  );
  assert.match(
    authError({ name: "AuthRetryableFetchError", message: "Failed to fetch" }),
    /non riesce a contattare/,
  );
  assert.match(authError({ code: "invalid_credentials" }), /Email o password/);
});
test("Unknown account failures preserve a safe error code/status while hiding arbitrary messages and values", () => {
  assert.match(
    authError({
      code: "unexpected_failure",
      status: 500,
      message: "Secret upstream data",
    }),
    /unexpected_failure · HTTP 500/,
  );
  assert.equal(
    authError({
      code: "unexpected_failure",
      status: 500,
      message: "Secret upstream data",
    }).includes("Secret upstream data"),
    false,
  );
  assert.equal(
    authError({ code: "token=private", message: "private" }).includes(
      "private",
    ),
    false,
  );
  assert.match(authError({ code: "__proto__" }), /servizio account/);
});
