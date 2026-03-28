import * as fs from 'fs';
import * as path from 'path';
import { app, nativeImage } from 'electron';

/**
 * Shared assets root for `electron/assets` (icons, etc.).
 *
 * In dev, `app.getAppPath()` can point at `out/` or another folder without `assets/`, and
 * bundled main code may live under `out/main/chunks/` so `__dirname/../../assets` is wrong.
 * We fall back to `process.cwd()/assets` when unpackaged (run `npm run dev` from `electron/`).
 */
export function getAssetsDir(): string {
  const appPath = app.getAppPath();
  const underApp = path.join(appPath, 'assets');
  if (fs.existsSync(underApp)) {return underApp;}

  if (!app.isPackaged) {
    const devCandidates = [
      path.join(process.cwd(), 'assets'),
      path.join(process.cwd(), 'electron', 'assets'),
    ];
    for (const p of devCandidates) {
      if (fs.existsSync(p)) {return p;}
    }
  }

  return path.join(__dirname, '../../assets');
}

/**
 * Best icon for BrowserWindow / taskbar / dock: prefer .ico (Windows) or .png, then SVG via data URL.
 * SVG→nativeImage works in many Electron builds; for installers still prefer shipping icon.png.
 */
export function loadAppNativeImage(): Electron.NativeImage | null {
  const dir = getAssetsDir();
  for (const name of ['icon.ico', 'icon.png'] as const) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) {
      const img = nativeImage.createFromPath(full);
      if (!img.isEmpty()) {return img;}
    }
  }
  const svgPath = path.join(dir, 'icon.svg');
  // Windows: nativeImage from SVG data URLs has been flaky/slow; tray/window use PNG/ICO there.
  if (fs.existsSync(svgPath) && process.platform !== 'win32') {
    try {
      const raw = fs.readFileSync(svgPath, 'utf8');
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
      const img = nativeImage.createFromDataURL(dataUrl);
      if (!img.isEmpty()) {return img;}
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** File path for APIs that want a path (e.g. some builders); only .ico / .png. */
export function resolveRasterIconPath(): string | undefined {
  const dir = getAssetsDir();
  for (const name of ['icon.ico', 'icon.png'] as const) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) {return full;}
  }
  return undefined;
}
