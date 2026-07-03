const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'a');
const child = spawn('bun', ['run', 'dev'], {
  cwd: '/home/z/my-project',
  stdio: ['ignore', log, log],
  detached: true,
});
child.unref();
// Write PID for tracking
fs.writeFileSync('/home/z/my-project/.server-pid', String(child.pid));
process.exit(0);