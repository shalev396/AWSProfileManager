import type { SsoDeviceAuthorizationEvent } from "./types";

declare global {
  interface Window {
    electron: {
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
        createIam: (data: {
          profileName: string;
          displayName?: string;
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
          output: string;
          logoPath?: string;
        }) => Promise<{ success: boolean; data?: { id: string }; error?: string }>;
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
        delete: (accountId: string) => Promise<{ success: boolean; error?: string }>;
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
        selectImageFile: () => Promise<{
          canceled: boolean;
          filePath?: string;
        }>;
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
    };
  }
}

export {};
