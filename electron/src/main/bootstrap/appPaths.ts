import { app } from 'electron';
import * as path from 'path';

export function getUserDataRoot(): string {
  return app.getPath('userData');
}

export function getSqlitePath(): string {
  return path.join(getUserDataRoot(), 'app-data.sqlite');
}

export function getLogosDir(): string {
  return path.join(getUserDataRoot(), 'logos');
}
