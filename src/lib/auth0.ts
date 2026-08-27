import { Auth0Client } from "@auth0/nextjs-auth0/server";

const fallbackSecret = "0000000000000000000000000000000000000000000000000000000000000000";

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN ?? "example.eu.auth0.com",
  clientId: process.env.AUTH0_CLIENT_ID ?? "local-dev-client",
  clientSecret: process.env.AUTH0_CLIENT_SECRET ?? fallbackSecret,
  secret: process.env.AUTH0_SECRET ?? fallbackSecret,
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
});

export function isAuthConfigured() {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET,
  );
}

export async function getSessionUser() {
  if (!isAuthConfigured()) {
    return null;
  }

  try {
    const session = await auth0.getSession();
    return session?.user ?? null;
  } catch {
    return null;
  }
}
