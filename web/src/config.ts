const GITHUB_RELEASE_BASE =
  'https://github.com/shalev396/AWSProfileManager/releases/latest/download';

export interface DownloadLink {
  platform: 'mac' | 'windows' | 'linux';
  url: string;
  filename: string;
}

export const downloads: DownloadLink[] = [
  {
    platform: 'mac',
    url: `${GITHUB_RELEASE_BASE}/AWS-Profile-Manager.dmg`,
    filename: 'AWS-Profile-Manager.dmg',
  },
  {
    platform: 'windows',
    url: `${GITHUB_RELEASE_BASE}/AWS-Profile-Manager-Setup.exe`,
    filename: 'AWS-Profile-Manager-Setup.exe',
  },
  {
    platform: 'linux',
    url: `${GITHUB_RELEASE_BASE}/AWS-Profile-Manager.AppImage`,
    filename: 'AWS-Profile-Manager.AppImage',
  },
];
