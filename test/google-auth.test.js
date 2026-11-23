import { test, after } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { OAuth2Client } from "google-auth-library";
import { registerGoogleAuth, googleConfig } from "../lib/google-auth.js";

const mongo = await MongoMemoryServer.create();
const client = new MongoClient(mongo.getUri());
await client.connect();
const db = client.db("google_auth_test");
const env = { GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret-only-for-tests",
  GOOGLE_REDIRECT_URI: "http://localhost:3021/auth/google/callback" };
const config = googleConfig(env);
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const verifier = new OAuth2Client(config);
let nonce, lastExchange, exchanges = 0;
const sessionUsers = [];
function idToken(override = {}, invalidSignature = false) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "https://accounts.google.com",
    aud: config.clientId, sub: "google-user-001", email: "nuevo@example.com",
    email_verified: true, name: "Nueva Trabajadora", nonce,
    iat: now, exp: now + 3600, ...override })).toString("base64url");
  const input = header + "." + payload;
  let signature = sign("RSA-SHA256", Buffer.from(input), privateKey);
  if (invalidSignature) signature[0] ^= 1;
  return input + "." + signature.toString("base64url");
}
const oauth = new OAuth2Client(config);
oauth.getToken = async (options) => {
  exchanges++;
  lastExchange = options;
  if (options.code === "provider-error") throw Error("private-provider-details");
  if (options.code === "missing-token") return { tokens: {} };
  const claims = {
    "bad-nonce": { nonce: "wrong" },
    "unverified": { email_verified: false },
    "bad-audience": { aud: "another-client" },
    "bad-issuer": { iss: "https://attacker.example" },
    "expired": { iat: 1, exp: 2 },
    "existing-email": { sub: "another-google-user", email: "admin@example.com" },
    "no-sub": { sub: "" },
    "invalid-email": { email: "invalid" },
  }[options.code] || {};
  return { tokens: { id_token: idToken(claims, options.code === "bad-signature") } };
};
// La verificación criptográfica es real; solo se sustituye la red de Google.
oauth.verifyIdToken = ({ idToken: token, audience }) =>
  verifier.verifySignedJwtWithCertsAsync(token,
    { "test-key": publicKey.export({ type: "spki", format: "pem" }) },
    audience, ["https://accounts.google.com", "accounts.google.com"]);
const app = express();
await registerGoogleAuth(app, { db, env, makeClient: () => oauth,
  createSession: async (user, res) => {
    sessionUsers.push(user);
    res.cookie("session", "test-session", { httpOnly: true, sameSite: "lax" });
  } });
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (path, cookie) => fetch(base + path, { redirect: "manual",
  headers: cookie ? { Cookie: cookie } : {} });
async function start() {
  const response = await get("/auth/google");
  assert.equal(response.status, 302);
  const url = new URL(response.headers.get("location"));
  nonce = url.searchParams.get("nonce");
  return { url, cookie: response.headers.get("set-cookie").split(";")[0],
    state: url.searchParams.get("state"), response };
}
const callback = (flow, code = "ok", cookie = flow.cookie) =>
  get("/auth/google/callback?state=" + flow.state + "&code=" + code, cookie);
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await client.close();
  await mongo.stop();
});

test("Google: configuración, registro, identidad y protección de sesión", async (t) => {
  await t.test("deshabilitado sin credenciales y rechaza redirección insegura o inesperada", () => {
    assert.equal(googleConfig({}), null);
    assert.equal(googleConfig({ ...env, GOOGLE_CLIENT_SECRET: "" }), null);
    assert.equal(googleConfig({ ...env, NODE_ENV: "production" }), null);
    assert.equal(googleConfig({ ...env, GOOGLE_REDIRECT_URI: "https://app.example/other" }), null);
    assert.equal(googleConfig({ ...env, GOOGLE_REDIRECT_URI: "https://app.example/auth/google/callback?next=evil" }), null);
    assert.ok(googleConfig({ ...env, NODE_ENV: "production",
      GOOGLE_REDIRECT_URI: "https://app.example/auth/google/callback" }));
  });
  await t.test("configuración pública no revela secretos", async () => {
    const response = await get("/api/auth/config");
    assert.deepEqual(await response.json(), { google: true });
  });
  await t.test("inicio solicita solo identidad y usa PKCE, nonce y cookie HttpOnly", async () => {
    const flow = await start();
    assert.equal(flow.url.origin, "https://accounts.google.com");
    assert.equal(flow.url.searchParams.get("redirect_uri"), env.GOOGLE_REDIRECT_URI);
    assert.equal(flow.url.searchParams.get("scope"), "openid email profile");
    assert.equal(flow.url.searchParams.get("code_challenge_method"), "S256");
    assert.match(flow.response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
    const pending = await db.collection("oauthStates").findOne({
      _id: createHash("sha256").update(flow.state).digest("hex") });
    assert.equal(pending.nonce, nonce);
    assert.equal(flow.url.searchParams.get("code_challenge"),
      createHash("sha256").update(pending.verifier).digest("base64url"));
    assert.equal(pending.state, undefined);
  });
  await t.test("rechaza callback sin cookie, estado distinto o vencido", async () => {
    const flow = await start();
    const before = exchanges;
    assert.equal((await callback(flow, "ok", "")).headers.get("location"), "/?authError=google_state");
    assert.equal((await callback({ ...flow, state: "a".repeat(64) })).headers.get("location"), "/?authError=google_state");
    await db.collection("oauthStates").updateOne({
      _id: createHash("sha256").update(flow.state).digest("hex") },
      { $set: { expires: new Date(0) } });
    assert.equal((await callback(flow)).headers.get("location"), "/?authError=google_state");
    assert.equal(exchanges, before);
  });
  await t.test("cancelación no crea usuario ni sesión", async () => {
    const flow = await start();
    const before = sessionUsers.length;
    const response = await get("/auth/google/callback?state=" + flow.state + "&error=access_denied", flow.cookie);
    assert.equal(response.headers.get("location"), "/?authError=google_cancelled");
    assert.equal(sessionUsers.length, before);
  });
  for (const code of ["bad-nonce", "unverified", "bad-audience", "bad-issuer",
    "expired", "bad-signature", "no-sub", "invalid-email", "missing-token", "provider-error"]) {
    await t.test("rechaza identidad inválida: " + code, async () => {
      const flow = await start();
      const before = sessionUsers.length;
      const response = await callback(flow, code);
      assert.equal(response.headers.get("location"), "/?authError=google_failed");
      assert.equal(sessionUsers.length, before);
      assert.equal(await db.collection("users").countDocuments({}), 0);
    });
  }
  await t.test("crea trabajador, inicia sesión, consume estado y no duplica al volver", async () => {
    const flow = await start();
    const response = await callback(flow);
    assert.equal(response.headers.get("location"), "/");
    assert.match(response.headers.get("set-cookie"), /session=test-session/);
    assert.equal(lastExchange.redirect_uri, env.GOOGLE_REDIRECT_URI);
    assert.ok(lastExchange.codeVerifier);
    const user = await db.collection("users").findOne({ googleSub: "google-user-001" });
    assert.equal(user.role, "Trabajador");
    assert.equal(user.name, "Nueva Trabajadora");
    assert.equal(user.password, undefined);
    assert.equal(user.access_token, undefined);
    assert.equal(sessionUsers.at(-1).id, user.id);
    const before = exchanges;
    assert.equal((await callback(flow)).headers.get("location"), "/?authError=google_state");
    assert.equal(exchanges, before);
    assert.equal((await callback(await start())).headers.get("location"), "/");
    assert.equal(await db.collection("users").countDocuments({ googleSub: user.googleSub }), 1);
    assert.equal(sessionUsers.at(-1).id, user.id);
  });
  await t.test("mantiene el rol guardado y no lo acepta desde la URL", async () => {
    await db.collection("users").updateOne({ googleSub: "google-user-001" },
      { $set: { role: "Profesional SST" } });
    const flow = await start();
    await get("/auth/google/callback?state=" + flow.state + "&code=ok&role=Administrador", flow.cookie);
    assert.equal(sessionUsers.at(-1).role, "Profesional SST");
  });
  await t.test("no vincula ni reemplaza una cuenta local por coincidencia de correo", async () => {
    await db.collection("users").insertOne({ id: "local-admin", email: "admin@example.com",
      password: "hash-local", role: "Administrador", name: "Admin" });
    const before = sessionUsers.length;
    assert.equal((await callback(await start(), "existing-email")).headers.get("location"), "/?authError=google_existing");
    assert.equal(sessionUsers.length, before);
    const user = await db.collection("users").findOne({ id: "local-admin" });
    assert.equal(user.password, "hash-local");
    assert.equal(user.googleSub, undefined);
    assert.equal(await db.collection("users").countDocuments({}), 2);
  });
});
