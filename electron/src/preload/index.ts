import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  accounts: {
    list: () => Promise<any>;
    getActive: () => Promise<any>;
    getAccessKey: (
      profileName: string,
    ) => Promise<{
      success: boolean;
      data?: { accessKeyId: string } | null;
      error?: string;
    }>;
    add: (data: any) => Promise<any>;
    edit: (data: any) => Promise<any>;
    delete: (profileName: string) => Promise<any>;
    setActive: (profileName: string) => Promise<any>;
    verify: (profileName: string) => Promise<any>;
  };
  profiles: {
    listFromAws: () => Promise<any>;
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
    getLogoDataUrl: (logoPath: string) => Promise<string | null>;
  };
}

const api: ElectronAPI = {
  accounts: {
    list: () => ipcRenderer.invoke("accounts:list"),
    getActive: () => ipcRenderer.invoke("accounts:getActive"),
    getAccessKey: (profileName) =>
      ipcRenderer.invoke("accounts:getAccessKey", profileName),
    add: (data) => ipcRenderer.invoke("accounts:add", data),
    edit: (data) => ipcRenderer.invoke("accounts:edit", data),
    delete: (profileName) => ipcRenderer.invoke("accounts:delete", profileName),
    setActive: (profileName) =>
      ipcRenderer.invoke("accounts:setActive", profileName),
    verify: (profileName) => ipcRenderer.invoke("accounts:verify", profileName),
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
    getLogoDataUrl: (logoPath) =>
      ipcRenderer.invoke("app:getLogoDataUrl", logoPath),
  },
};

contextBridge.exposeInMainWorld("electron", api);
