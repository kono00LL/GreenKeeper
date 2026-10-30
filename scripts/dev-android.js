const { spawn } = require('node:child_process');
const process = require('node:process');

const path = require('node:path');

const frontendDirectory = path.resolve(__dirname, '..');
const backendDirectory = path.resolve(frontendDirectory, '..', 'GreenKeeper-backend');
const backendPort = Number(process.env.BACKEND_PORT || 8080);
const backendUrl = `http://127.0.0.1:${backendPort}/health`;

let backendProcess;
let frontendProcess;
let shuttingDown = false;

function commandFor(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.on('error', (error) => {
    console.error(`Failed to start ${command}: ${error.message}`);
  });

  return child;
}

function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
}

async function waitForBackend(timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(backendUrl);
      if (response.ok) return;
    } catch {
      // The backend is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Backend did not become ready at ${backendUrl}`);
}

async function main() {
  console.log(`Starting backend in ${backendDirectory}...`);
  backendProcess = commandFor('npm', ['run', 'dev'], { cwd: backendDirectory });

  await waitForBackend();

  console.log('Backend is ready. Setting up ADB reverse port...');
  const adbResult = await new Promise((resolve) => {
    const adbProcess = commandFor('adb', ['reverse', `tcp:${backendPort}`, `tcp:${backendPort}`]);
    adbProcess.on('close', (code) => resolve(code ?? 1));
  });

  if (adbResult !== 0) {
    throw new Error('adb reverse failed. Check that an Android device is connected and USB debugging is enabled.');
  }

  console.log('ADB reverse is ready. Starting Android app...');
  frontendProcess = commandFor('pnpm', ['run', 'android'], { cwd: frontendDirectory });
  frontendProcess.on('close', (code, signal) => shutdown(code === 0 ? 0 : 1, signal));
}

function shutdown(code = 0, signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  stopProcess(frontendProcess);
  stopProcess(backendProcess);

  if (signal) console.log(`Stopped by ${signal}.`);
  process.exitCode = code;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0, signal));
}

main().catch((error) => {
  console.error(error.message);
  shutdown(1);
});
