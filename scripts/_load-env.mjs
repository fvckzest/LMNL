import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }

      return [key, value];
    });
}

export function loadLocalEnvFiles(rootDir = process.cwd()) {
  const envFiles = ['.env', '.env.local'];

  for (const filename of envFiles) {
    const absolutePath = path.join(rootDir, filename);
    if (!fs.existsSync(absolutePath)) continue;

    const entries = parseEnvFile(fs.readFileSync(absolutePath, 'utf8'));
    for (const [key, value] of entries) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
