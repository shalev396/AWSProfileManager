import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as ini from 'ini';

export interface AwsPaths {
  credentials: string;
  config: string;
  dir: string;
}

export function getAwsPaths(): AwsPaths {
  const homeDir = os.homedir();
  const awsDir = path.join(homeDir, '.aws');
  return {
    dir: awsDir,
    credentials: path.join(awsDir, 'credentials'),
    config: path.join(awsDir, 'config')
  };
}

export async function ensureAwsDir(): Promise<void> {
  const { dir } = getAwsPaths();
  try {
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  } catch (error) {
    // Directory might already exist
    console.error('Error creating AWS directory:', error);
  }
}

export async function readIni(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return ini.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function writeIniAtomic(filePath: string, data: any): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  
  try {
    // Create backup if file exists
    try {
      await fs.access(filePath);
      await fs.copyFile(filePath, backupPath);
    } catch {
      // File doesn't exist, no backup needed
    }
    
    // Write to temp file
    const content = ini.stringify(data);
    await fs.writeFile(tempPath, content, { mode: 0o600 });
    
    // Atomic rename
    await fs.rename(tempPath, filePath);
    
    // Set permissions on Unix-like systems
    if (os.platform() !== 'win32') {
      await fs.chmod(filePath, 0o600);
    }
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export async function upsertProfileCredentials(
  profileName: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<void> {
  const { credentials } = getAwsPaths();
  const data = await readIni(credentials);
  
  data[profileName] = {
    aws_access_key_id: accessKeyId,
    aws_secret_access_key: secretAccessKey
  };
  
  await writeIniAtomic(credentials, data);
}

export async function upsertProfileConfig(
  profileName: string,
  region: string,
  output: string
): Promise<void> {
  const { config } = getAwsPaths();
  const data = await readIni(config);
  
  // Config uses "profile profileName" for non-default profiles
  const sectionName = profileName === 'default' ? 'default' : `profile ${profileName}`;
  
  data[sectionName] = {
    region,
    output
  };
  
  await writeIniAtomic(config, data);
}

export interface SsoProfileParams {
  profileName: string;
  ssoSessionName: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoStartUrl: string;
  ssoRegion: string;
  region: string;
  output: string;
}

export async function upsertSsoProfileConfig(params: SsoProfileParams): Promise<void> {
  const { config } = getAwsPaths();
  const data = await readIni(config);

  const sectionName = params.profileName === 'default' ? 'default' : `profile ${params.profileName}`;

  data[sectionName] = {
    sso_session: params.ssoSessionName,
    sso_account_id: params.ssoAccountId,
    sso_role_name: params.ssoRoleName,
    region: params.region,
    output: params.output
  };

  const ssoSessionSection = `sso-session ${params.ssoSessionName}`;
  data[ssoSessionSection] = {
    sso_start_url: params.ssoStartUrl,
    sso_region: params.ssoRegion,
    sso_registration_scopes: 'sso:account:access'
  };

  await writeIniAtomic(config, data);
}

export async function getProfileAuthType(profileName: string): Promise<'access-key' | 'sso'> {
  const { config } = getAwsPaths();
  const configData = await readIni(config);
  const sectionName = `profile ${profileName}`;
  const section = configData[sectionName] || configData[profileName];
  if (section && section.sso_session) {
    return 'sso';
  }
  return 'access-key';
}

export interface SsoConfigResult {
  ssoSessionName: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoStartUrl: string;
  ssoRegion: string;
  region: string;
  output: string;
}

export async function getSsoProfileConfig(profileName: string): Promise<SsoConfigResult | null> {
  const { config } = getAwsPaths();
  const configData = await readIni(config);
  const sectionName = `profile ${profileName}`;
  const section = configData[sectionName] || configData[profileName];
  if (!section || !section.sso_session) {
    return null;
  }

  const ssoSessionSection = `sso-session ${section.sso_session}`;
  const ssoSession = configData[ssoSessionSection] || {};

  return {
    ssoSessionName: section.sso_session,
    ssoAccountId: section.sso_account_id || '',
    ssoRoleName: section.sso_role_name || '',
    ssoStartUrl: ssoSession.sso_start_url || '',
    ssoRegion: ssoSession.sso_region || '',
    region: section.region || '',
    output: section.output || 'json'
  };
}

export async function setDefaultFromProfile(profileName: string): Promise<void> {
  const { credentials, config } = getAwsPaths();
  const authType = await getProfileAuthType(profileName);

  if (authType === 'sso') {
    // SSO: copy config with SSO fields to [default], remove stale credentials
    const configData = await readIni(config);
    const configSectionName = `profile ${profileName}`;
    const section = configData[configSectionName] || configData[profileName];
    if (section) {
      configData['default'] = { ...section };
    }
    await writeIniAtomic(config, configData);

    // Remove [default] from credentials so stale access keys don't take precedence
    const credData = await readIni(credentials);
    if (credData['default']) {
      delete credData['default'];
      await writeIniAtomic(credentials, credData);
    }
  } else {
    // Access Key: existing behavior
    const credData = await readIni(credentials);
    if (!credData[profileName]) {
      throw new Error(`Profile "${profileName}" not found in credentials file`);
    }

    credData['default'] = { ...credData[profileName] };
    await writeIniAtomic(credentials, credData);

    const configData = await readIni(config);
    const configSectionName = `profile ${profileName}`;

    if (configData[configSectionName]) {
      configData['default'] = { ...configData[configSectionName] };
    } else if (configData[profileName]) {
      configData['default'] = { ...configData[profileName] };
    }

    await writeIniAtomic(config, configData);
  }
}

export async function listProfiles(): Promise<string[]> {
  const { credentials, config } = getAwsPaths();
  const credData = await readIni(credentials);
  const configData = await readIni(config);

  const profiles = new Set<string>();

  // Profiles from credentials file
  for (const key of Object.keys(credData)) {
    if (key !== 'default') profiles.add(key);
  }

  // SSO profiles from config file (sections starting with "profile ")
  for (const key of Object.keys(configData)) {
    if (key.startsWith('profile ')) {
      const name = key.slice('profile '.length);
      if (configData[key].sso_session) {
        profiles.add(name);
      }
    }
  }

  return Array.from(profiles);
}

export async function deleteProfile(profileName: string): Promise<void> {
  const { credentials, config } = getAwsPaths();
  const configData = await readIni(config);
  const profileSection = `profile ${profileName}`;
  const section = configData[profileSection] || configData[profileName];

  // If SSO, clean up the sso-session block (only if no other profile references it)
  if (section && section.sso_session) {
    const ssoSessionName = section.sso_session;
    const otherReferences = Object.keys(configData).filter(key => {
      if (key === profileSection || key === profileName) return false;
      return configData[key].sso_session === ssoSessionName;
    });
    if (otherReferences.length === 0) {
      delete configData[`sso-session ${ssoSessionName}`];
    }
  }

  delete configData[profileSection];
  delete configData[profileName];
  await writeIniAtomic(config, configData);

  // Remove from credentials (may not exist for SSO profiles)
  const credData = await readIni(credentials);
  if (credData[profileName]) {
    delete credData[profileName];
    await writeIniAtomic(credentials, credData);
  }
}

export async function getProfileCredentials(profileName: string): Promise<{ accessKeyId: string; secretAccessKey: string } | null> {
  const { credentials } = getAwsPaths();
  const data = await readIni(credentials);
  
  if (!data[profileName]) {
    return null;
  }
  
  return {
    accessKeyId: data[profileName].aws_access_key_id || '',
    secretAccessKey: data[profileName].aws_secret_access_key || ''
  };
}
