const { spawnSync } = require('node:child_process');

const candidates = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python', 'py'];

const args = process.argv.slice(2);

for (const cmd of candidates) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (!result.error) {
    process.exit(result.status ?? 0);
  }

  if (result.error.code !== 'ENOENT') {
    console.error(`Failed to execute ${cmd}: ${result.error.message}`);
    process.exit(1);
  }
}

console.error('No Python launcher found. Tried: ' + candidates.join(', '));
process.exit(1);
