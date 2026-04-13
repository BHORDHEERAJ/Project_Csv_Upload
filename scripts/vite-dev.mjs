import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(process.execPath, [viteBin, '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: projectRoot,
    stdio: 'inherit',
});

child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
});

