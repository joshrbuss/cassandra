import { SignJWT, jwtVerify } from "jose";

function secret() {
  const key = process.env.SUBSCRIBE_SECRET;
  if (!key) throw new Error("SUBSCRIBE_SECRET env var is not set");
  return new TextEncoder().encode(key);
}

export async function signConfirmToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("72h")
    .sign(secret());
}

export async function verifyConfirmToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = payload.email;
    if (typeof email !== "string") return null;
    return email;
  } catch {
    return null;
  }
}
