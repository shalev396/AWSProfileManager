import { contextBridge, ipcRenderer } from "electron";
import type { SsoDeviceAuthorizationEvent } from "../renderer/types";

export interface AccountFormPayload {
  profileName: string;
  authType: "iam" | "sso";
  accessKeyId: string;
  secretAccessKey: string;
  ssoStartUrl?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoRegion?: string;
  ssoSessionName?: string;
  region: string;
  output: string;
  logoPath?: string;
  displayName?: string;
}

export interface ElectronAPI {
  accounts: {
    list: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
    getActive: () => Promise<{
      success: boolean;
      data?: string | null;
      error?: string;
    }>;
    getForEdit: (accountId: string) => Promise<{
      success: boolean;
      data?: { summary: unknown; accessKeyId?: string };
      error?: string;
    }>;
    createIam: (
      data: Omit<
        AccountFormPayload,
        | "authType"
        | "ssoStartUrl"
        | "ssoAccountId"
        | "ssoRoleName"
        | "ssoRegion"
        | "ssoSessionName"
      > & {
        profileName: string;
        displayName?: string;
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        output: string;
        logoPath?: string;
      },
    ) => Promise<{ success: boolean; data?: { id: string }; error?: string }>;
    createSso: (data: {
      profileName: string;
      displayName?: string;
      ssoStartUrl: string;
      ssoAccountId: string;
      ssoRoleName: string;
      ssoRegion?: string;
      ssoSessionName?: string;
      region: string;
      output: string;
      logoPath?: string;
    }) => Promise<{ success: boolean; data?: { id: string }; error?: string }>;
    updateIam: (data: {
      id: string;
      displayName?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      region: string;
      output: string;
      logoPath?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    updateSso: (data: {
      id: string;
      displayName?: string;
      ssoStartUrl: string;
      ssoAccountId: string;
      ssoRoleName: string;
      ssoRegion?: string;
      ssoSessionName?: string;
      region: string;
      output: string;
      logoPath?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    delete: (
      accountId: string,
    ) => Promise<{ success: boolean; error?: string }>;
    switch: (accountId: string) => Promise<{
      success: boolean;
      error?: string;
      requiresSsoLogin?: boolean;
      verified?: boolean;
      identity?: { account: string; arn: string; userId?: string };
    }>;
    verify: (accountId: string) => Promise<{
      success: boolean;
      error?: string;
      identity?: { account: string; arn: string; userId: string };
    }>;
    ssoLogin: (accountId: string) => Promise<{
      success: boolean;
      error?: string;
      accessExpiryUnchanged?: boolean;
    }>;
    onSsoDeviceAuthorization: (
      callback: (payload: SsoDeviceAuthorizationEvent) => void,
    ) => () => void;
  };
  profiles: {
    listFromAws: () => Promise<{
      success: boolean;
      data?: string[];
      error?: string;
    }>;
  };
  dialog: {
    selectImageFile: () => Promise<{ canceled: boolean; filePath?: string }>;
  };
  app: {
    getDataPaths: () => Promise<{
      appDataDir: string;
      logosDir: string;
      awsCredentials: string;
      awsConfig: string;
    }>;
    openDataFolder: () => Promise<void>;
    openLogFolder: () => Promise<void>;
    getLogoDataUrl: (logoPath: string) => Promise<string | null>;
    getEncryptionStatus: () => Promise<{ available: boolean; debug: string }>;
    onStateChanged: (callback: () => void) => () => void;
    getLaunchAtLogin: () => Promise<{
      openAtLogin: boolean;
      osControlsApply: boolean;
    }>;
    setLaunchAtLogin: (enabled: boolean) => Promise<{ success: true }>;
    getAppVersion: () => Promise<{ version: string }>;
    getAppIconDataUrl: () => Promise<string | null>;
  };
}

const api: ElectronAPI = {
  accounts: {
    list: () => ipcRenderer.invoke("accounts:list"),
    getActive: () => ipcRenderer.invoke("accounts:getActive"),
    getForEdit: (accountId) =>
      ipcRenderer.invoke("accounts:getForEdit", accountId),
    createIam: (data) => ipcRenderer.invoke("accounts:createIam", data),
    createSso: (data) => ipcRenderer.invoke("accounts:createSso", data),
    updateIam: (data) => ipcRenderer.invoke("accounts:updateIam", data),
    updateSso: (data) => ipcRenderer.invoke("accounts:updateSso", data),
    delete: (accountId) => ipcRenderer.invoke("accounts:delete", accountId),
    switch: (accountId) => ipcRenderer.invoke("accounts:switch", accountId),
    verify: (accountId) => ipcRenderer.invoke("accounts:verify", accountId),
    ssoLogin: (accountId) => ipcRenderer.invoke("accounts:ssoLogin", accountId),
    onSsoDeviceAuthorization: (callback) => {
      const handler = (
        _event: unknown,
        payload: SsoDeviceAuthorizationEvent,
      ) => {
        callback(payload);
      };
      ipcRenderer.on("accounts:ssoDeviceAuthorization", handler);
      return () =>
        ipcRenderer.removeListener("accounts:ssoDeviceAuthorization", handler);
    },
  },
  profiles: {
    listFromAws: () => ipcRenderer.invoke("profiles:listFromAws"),
  },
  dialog: {
    selectImageFile: () => ipcRenderer.invoke("dialog:selectImage"),
  },
  app: {
    getDataPaths: () => ipcRenderer.invoke("app:getDataPaths"),
    openDataFolder: () => ipcRenderer.invoke("app:openDataFolder"),
    openLogFolder: () => ipcRenderer.invoke("app:openLogFolder"),
    getLogoDataUrl: (logoPath) =>
      ipcRenderer.invoke("app:getLogoDataUrl", logoPath),
    getEncryptionStatus: () => ipcRenderer.invoke("app:getEncryptionStatus"),
    onStateChanged: (callback: () => void) => {
      const handler = () => {
        callback();
      };
      ipcRenderer.on("app:stateChanged", handler);
      return () => ipcRenderer.removeListener("app:stateChanged", handler);
    },
    getLaunchAtLogin: () => ipcRenderer.invoke("app:getLaunchAtLogin"),
    setLaunchAtLogin: (enabled: boolean) =>
      ipcRenderer.invoke("app:setLaunchAtLogin", enabled),
    getAppVersion: () => ipcRenderer.invoke("app:getAppVersion"),
    getAppIconDataUrl: () => ipcRenderer.invoke("app:getAppIconDataUrl"),
  },
};

contextBridge.exposeInMainWorld("electron", api);
