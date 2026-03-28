/**
 * OIDC *access token* expiry (CreateToken / refresh), from `expiresAt` on the account.
 * This is not the same as how long the AWS access portal browser session feels “logged in”,
 * and the TTL (often a few hours) is controlled by IAM Identity Center, not this app.
 */

export type SsoUrgency = "missing" | "expired" | "soon" | "ok";

const SOON_SEC = 2 * 60 * 60;

export function getSsoUrgency(
  expiresAt: string | null | undefined,
  nowMs: number,
): SsoUrgency {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") {
    return "missing";
  }
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) {return "missing";}
  if (nowMs >= t) {return "expired";}
  const sec = Math.round((t - nowMs) / 1000);
  if (sec <= 0) {return "expired";}
  if (sec <= SOON_SEC) {return "soon";}
  return "ok";
}

export interface SsoSessionStatus {
  primary: string;
  hint?: string;
}

function formatRelativeSeconds(secTotal: number): string {
  if (secTotal < 60) {return "expires in under a minute";}
  const m = Math.floor(secTotal / 60);
  if (m < 60) {return `expires in ~${m} min`;}
  const h = Math.floor(m / 60);
  if (h < 48) {return `expires in ~${h} h`;}
  const d = Math.floor(h / 24);
  return `expires in ~${d} d`;
}

export function getSsoSessionStatus(
  expiresAt: string | null | undefined,
  nowMs: number,
): SsoSessionStatus {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") {
    return {
      primary: "SSO: not signed in",
      hint: "Use SSO Login to authenticate this profile.",
    };
  }
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) {
    return { primary: "SSO: session time unknown" };
  }
  if (nowMs >= t) {
    return {
      primary: "SSO access token expired",
      hint: "Set Active may refresh it automatically; if that fails, use SSO Login.",
    };
  }
  const sec = Math.round((t - nowMs) / 1000);
  if (sec <= 0) {
    return {
      primary: "SSO access token expired",
      hint: "Set Active may refresh it automatically; if that fails, use SSO Login.",
    };
  }
  return {
    primary: `SSO token ${formatRelativeSeconds(sec)}`,
    hint: `Until ${new Date(expiresAt).toLocaleString()}`,
  };
}
