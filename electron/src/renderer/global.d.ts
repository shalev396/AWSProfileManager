declare global {
  interface Window {
    electron: {
      accounts: {
        list: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getActive: () => Promise<{
          success: boolean;
          data?: string | null;
          error?: string;
        }>;
        getAccessKey: (
          profileName: string,
        ) => Promise<{
          success: boolean;
          data?: { accessKeyId: string } | null;
          error?: string;
        }>;
        add: (data: any) => Promise<{ success: boolean; error?: string }>;
        edit: (data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (
          profileName: string,
        ) => Promise<{ success: boolean; error?: string }>;
        setActive: (profileName: string) => Promise<{
          success: boolean;
          error?: string;
          verified?: boolean;
          identity?: { account: string; arn: string; userId?: string };
        }>;
        verify: (profileName: string) => Promise<{
          success: boolean;
          error?: string;
          identity?: { account: string; arn: string; userId: string };
        }>;
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
      };
    };
  }
}

export {};
