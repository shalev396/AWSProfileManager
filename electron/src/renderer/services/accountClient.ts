import type { AccountFormData, SsoDeviceAuthorizationEvent } from "../types";

/** Typed facade over `window.electron.accounts` */
export const accountClient = {
  list: () => window.electron.accounts.list(),
  getActive: () => window.electron.accounts.getActive(),
  getForEdit: (accountId: string) => window.electron.accounts.getForEdit(accountId),
  delete: (accountId: string) => window.electron.accounts.delete(accountId),
  switch: (accountId: string) => window.electron.accounts.switch(accountId),
  verify: (accountId: string) => window.electron.accounts.verify(accountId),
  ssoLogin: (accountId: string) => window.electron.accounts.ssoLogin(accountId),
  onSsoDeviceAuthorization: (
    callback: (payload: SsoDeviceAuthorizationEvent) => void,
  ) => window.electron.accounts.onSsoDeviceAuthorization(callback),

  async create(data: AccountFormData) {
    if (data.authType === "sso") {
      const { ssoStartUrl, ssoAccountId, ssoRoleName } = data;
      if (
        ssoStartUrl === undefined ||
        ssoAccountId === undefined ||
        ssoRoleName === undefined
      ) {
        return Promise.resolve({
          success: false as const,
          error: "Missing SSO fields",
        });
      }
      return window.electron.accounts.createSso({
        profileName: data.profileName,
        ssoStartUrl,
        ssoAccountId,
        ssoRoleName,
        region: data.region,
        output: data.output,
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.ssoRegion !== undefined ? { ssoRegion: data.ssoRegion } : {}),
        ...(data.ssoSessionName !== undefined
          ? { ssoSessionName: data.ssoSessionName }
          : {}),
        ...(data.logoPath !== undefined ? { logoPath: data.logoPath } : {}),
      });
    }
    return window.electron.accounts.createIam({
      profileName: data.profileName,
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      region: data.region,
      output: data.output,
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.logoPath !== undefined ? { logoPath: data.logoPath } : {}),
    });
  },

  async update(data: AccountFormData) {
    if (!data.id) {
      return { success: false as const, error: "Missing account id" };
    }
    if (data.authType === "sso") {
      const { ssoStartUrl, ssoAccountId, ssoRoleName } = data;
      if (
        ssoStartUrl === undefined ||
        ssoAccountId === undefined ||
        ssoRoleName === undefined
      ) {
        return Promise.resolve({
          success: false as const,
          error: "Missing SSO fields",
        });
      }
      return window.electron.accounts.updateSso({
        id: data.id,
        ssoStartUrl,
        ssoAccountId,
        ssoRoleName,
        region: data.region,
        output: data.output,
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.ssoRegion !== undefined ? { ssoRegion: data.ssoRegion } : {}),
        ...(data.ssoSessionName !== undefined
          ? { ssoSessionName: data.ssoSessionName }
          : {}),
        ...(data.logoPath !== undefined ? { logoPath: data.logoPath } : {}),
      });
    }
    return window.electron.accounts.updateIam({
      id: data.id,
      region: data.region,
      output: data.output,
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.accessKeyId ? { accessKeyId: data.accessKeyId } : {}),
      ...(data.secretAccessKey ? { secretAccessKey: data.secretAccessKey } : {}),
      ...(data.logoPath !== undefined ? { logoPath: data.logoPath } : {}),
    });
  },
};
