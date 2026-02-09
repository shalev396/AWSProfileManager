// Download configuration – no versioning; single file per platform
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost ? 'http://localhost:5173' : window.location.origin;

export interface DownloadLink {
  platform: 'mac' | 'windows' | 'linux';
  url: string;
  filename: string;
}

// Fixed paths: downloads/mac/, downloads/win/, downloads/linux/ with one file each
export const downloads: DownloadLink[] = [
  {
    platform: 'mac',
    url: `${BASE_URL}/downloads/mac/AWS-Profile-Manager.dmg`,
    filename: 'AWS-Profile-Manager.dmg',
  },
  {
    platform: 'windows',
    url: `${BASE_URL}/downloads/win/AWS-Profile-Manager-Setup.exe`,
    filename: 'AWS-Profile-Manager-Setup.exe',
  },
  {
    platform: 'linux',
    url: `${BASE_URL}/downloads/linux/AWS-Profile-Manager.AppImage`,
    filename: 'AWS-Profile-Manager.AppImage',
  },
];
