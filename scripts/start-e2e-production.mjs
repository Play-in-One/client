import { cpSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Match the Docker image: standalone server plus public and compiled assets.
// Next may trace from a parent workspace, so use its recorded application path.
const manifest = JSON.parse(readFileSync('.next/required-server-files.json', 'utf8'));
const directory = resolve('.next/standalone', manifest.relativeAppDir);
cpSync('public', resolve(directory, 'public'), { recursive: true });
cpSync('.next/static', resolve(directory, '.next/static'), { recursive: true });
process.env.PORT = process.env.FRONTEND_PORT ?? '3001';
process.env.HOSTNAME = '127.0.0.1';
await import(pathToFileURL(resolve(directory, 'server.js')).href);
