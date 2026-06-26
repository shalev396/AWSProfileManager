/** AWS Smithy / SSO-OIDC errors often use message "UnknownError"; detail is in error_description. */
export function formatAwsSdkError(e: unknown): string {
  if (e == null) {
    return 'Unknown error';
  }
  if (typeof e !== 'object') {
    return String(e);
  }
  const o = e as {
    name?: string;
    message?: string;
    error?: string;
    error_description?: string;
  };
  const name = o.name?.trim() || 'Error';
  const description = o.error_description?.trim();
  const message = o.message?.trim();

  if (description && (!message || message === 'UnknownError')) {
    return `${name}: ${description}`;
  }
  if (message && message !== 'UnknownError') {
    return message;
  }
  if (description) {
    return `${name}: ${description}`;
  }
  if (o.error?.trim()) {
    return `${name} (${o.error.trim()})`;
  }
  return name;
}

export function isInvalidClientError(e: unknown): boolean {
  return (e as { name?: string }).name === 'InvalidClientException';
}

/** OIDC client registrations expire (~90 days). Refresh one day early. */
export function isOidcRegistrationExpired(registrationExpiresAt?: string): boolean {
  if (!registrationExpiresAt?.trim()) {
    return false;
  }
  const expMs = Date.parse(registrationExpiresAt);
  if (Number.isNaN(expMs)) {
    return false;
  }
  return Date.now() >= expMs - 86_400_000;
}
