import * as fs from 'fs/promises';
import * as path from 'path';
import { getLogosDir } from '../bootstrap/appPaths';

async function ensureLogosDir(): Promise<void> {
  await fs.mkdir(getLogosDir(), { recursive: true });
}

export async function copyLogoToStore(sourcePath: string, profileName: string): Promise<string> {
  const logosDir = getLogosDir();
  const normalizedSource = path.normalize(sourcePath);
  const normalizedLogos = path.normalize(logosDir);
  if (normalizedSource.startsWith(normalizedLogos)) {
    return sourcePath;
  }
  await ensureLogosDir();
  const ext = path.extname(sourcePath) || '.png';
  const safeName = profileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
  const destPath = path.join(logosDir, `${safeName}${ext}`);
  await fs.copyFile(sourcePath, destPath);
  return destPath;
}

export async function removeStoredLogo(profileName: string): Promise<void> {
  const logosDir = getLogosDir();
  const safeName = profileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
  try {
    const entries = await fs.readdir(logosDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.startsWith(safeName + '.')) {
        await fs.unlink(path.join(logosDir, e.name));
      }
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {throw err;}
  }
}
