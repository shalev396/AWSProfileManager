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

export async function setDefaultFromProfile(profileName: string): Promise<void> {
  const { credentials, config } = getAwsPaths();
  
  // Read source profile credentials
  const credData = await readIni(credentials);
  if (!credData[profileName]) {
    throw new Error(`Profile "${profileName}" not found in credentials file`);
  }
  
  // Copy to [default]
  credData['default'] = { ...credData[profileName] };
  await writeIniAtomic(credentials, credData);
  
  // Read source profile config
  const configData = await readIni(config);
  const configSectionName = `profile ${profileName}`;
  
  if (configData[configSectionName]) {
    configData['default'] = { ...configData[configSectionName] };
  } else if (configData[profileName]) {
    // Fallback: some configs might use profileName directly
    configData['default'] = { ...configData[profileName] };
  }
  
  await writeIniAtomic(config, configData);
}

export async function listProfiles(): Promise<string[]> {
  const { credentials } = getAwsPaths();
  const data = await readIni(credentials);
  
  return Object.keys(data).filter(key => key !== 'default');
}

export async function deleteProfile(profileName: string): Promise<void> {
  const { credentials, config } = getAwsPaths();
  
  // Remove from credentials
  const credData = await readIni(credentials);
  delete credData[profileName];
  await writeIniAtomic(credentials, credData);
  
  // Remove from config
  const configData = await readIni(config);
  delete configData[`profile ${profileName}`];
  delete configData[profileName]; // Also try without prefix
  await writeIniAtomic(config, configData);
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
