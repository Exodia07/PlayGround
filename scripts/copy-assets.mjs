import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('public/assets', { recursive: true });
cpSync('assets/barakel', 'public/assets/barakel', { recursive: true, force: true });
