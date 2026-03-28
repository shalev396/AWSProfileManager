import { app, dialog, BrowserWindow } from 'electron';
import {
  loadAppPreferences,
  saveAppPreferences,
  setOpenAtLogin,
  canApplyOpenAtLoginToOs,
} from './settings/appPreferences';

/**
 * First packaged launch: ask whether to register start-at-login.
 * Skipped in development (wrong executable path for OS integration).
 */
export async function offerOpenAtLoginOnFirstRun(parent: BrowserWindow | null): Promise<void> {
  const prefs = loadAppPreferences();
  if (prefs.openAtLoginPromptCompleted) {return;}

  if (!canApplyOpenAtLoginToOs()) {
    saveAppPreferences({ openAtLoginPromptCompleted: true });
    return;
  }

  const win =
    parent && !parent.isDestroyed()
      ? parent
      : BrowserWindow.getFocusedWindow() ?? undefined;
  const opts = {
    type: 'question' as const,
    buttons: ['Yes', 'No'],
    defaultId: 0,
    cancelId: 1,
    title: app.getName(),
    message: 'Start AWS Profile Manager when you sign in to this computer?',
    detail:
      'The app stays in the system tray; the window stays hidden until you open it. You can change this anytime in the app.',
  };
  const { response } = win
    ? await dialog.showMessageBox(win, opts)
    : await dialog.showMessageBox(opts);

  const enabled = response === 0;
  saveAppPreferences({ openAtLoginPromptCompleted: true });
  setOpenAtLogin(enabled);
}
