/** Typed facade over `window.electron.app` (non-account helpers). */
export const appClient = {
  getLaunchAtLogin: () => window.electron.app.getLaunchAtLogin(),
  setLaunchAtLogin: (enabled: boolean) =>
    window.electron.app.setLaunchAtLogin(enabled),
  getAppVersion: () => window.electron.app.getAppVersion(),
  getAppIconDataUrl: () => window.electron.app.getAppIconDataUrl(),
};
