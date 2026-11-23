import { randomBytes, createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const lifetime = 5 * 60 * 1000;

export function googleConfig(env = process.env) {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REDIRECT_URI: redirectUri } = env;
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const url = new URL(redirectUri);
    const local = env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.pathname !== "/auth/google/callback" || url.search || url.hash ||
      url.username || url.password) return null;
    return { clientId, clientSecret, redirectUri };
  } catch {
    return null;
  }
}

// El cliente se puede sustituir en pruebas; producción usa la biblioteca de Google.
export async function registerGoogleAuth(app, { db, createSession,
  env = process.env, makeClient = (config) => new OAuth2Client(config) }) {
  const config = googleConfig(env);
  const oauth = config && makeClient(config);
  const users = db.collection("users");
  const states = db.collection("oauthStates");
  await users.createIndex({ googleSub: 1 }, { unique: true, sparse: true });
  await states.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
  const cookieOptions = {
    httpOnly: true, sameSite: "lax", path: "/auth/google",
    secure: env.NODE_ENV === "production" || env.COOKIE_SECURE === "true",
  };
  app.get("/api/auth/config", (req, res) => res.json({ google: Boolean(config) }));
  app.use("/auth/google", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    next();
  });
  app.get("/auth/google", async (req, res) => {
    if (!oauth) return res.redirect("/?authError=google_unavailable");
    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(32).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    await states.insertOne({ _id: digest(state), nonce, verifier,
      expires: new Date(Date.now() + lifetime) });
    res.cookie("google_oauth", state, { ...cookieOptions, maxAge: lifetime });
    res.redirect(oauth.generateAuthUrl({
      scope: ["openid", "email", "profile"], state, nonce,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256", prompt: "select_account",
    }));
  });
  app.get("/auth/google/callback", async (req, res) => {
    res.clearCookie("google_oauth", cookieOptions);
    const reject = (code) => res.redirect("/?authError=" + code);
    if (!oauth) return reject("google_unavailable");
    const state = req.query.state;
    const boundState = /(?:^|;\s*)google_oauth=([a-f0-9]{64})(?:;|$)/
      .exec(req.headers.cookie || "")?.[1];
    if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state) ||
      state !== boundState) return reject("google_state");
    const pending = await states.findOneAndDelete({
      _id: digest(state), expires: { $gt: new Date() },
    });
    if (!pending) return reject("google_state");
    if (req.query.error) return reject("google_cancelled");
    if (typeof req.query.code !== "string" || req.query.code.length > 4096 ||
      !req.query.code) return reject("google_failed");
    try {
      const { tokens } = await oauth.getToken({ code: req.query.code,
        codeVerifier: pending.verifier, redirect_uri: config.redirectUri });
      if (!tokens.id_token) return reject("google_failed");
      // Valida firma, emisor, audiencia y caducidad antes de usar la identidad.
      const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token,
        audience: config.clientId });
      const identity = ticket.getPayload();
      if (!identity || identity.nonce !== pending.nonce ||
        identity.email_verified !== true || typeof identity.sub !== "string" ||
        !identity.sub || identity.sub.length > 255 ||
        typeof identity.email !== "string" || identity.email.length > 200 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email))
        return reject("google_failed");
      let user = await users.findOne({ googleSub: identity.sub });
      if (!user) {
        const email = identity.email.toLowerCase();
        // No vincular por correo: una cuenta local necesita vinculación explícita.
        if (await users.findOne({ email })) return reject("google_existing");
        user = { id: "google-" + randomBytes(16).toString("hex"), email,
          googleSub: identity.sub, role: "Trabajador",
          name: (typeof identity.name === "string" && identity.name.trim()
            ? identity.name.trim() : email.split("@")[0]).slice(0, 200),
          createdAt: new Date().toISOString() };
        try {
          await users.insertOne(user);
        } catch (error) {
          if (error.code !== 11000) throw error;
          user = await users.findOne({ googleSub: identity.sub });
          if (!user) return reject("google_existing");
        }
      }
      await createSession(user, res);
      return res.redirect("/");
    } catch {
      // No enviar códigos, tokens ni detalles privados del proveedor al navegador.
      return reject("google_failed");
    }
  });
}
