module.exports = {
  apps: [
    {
      name: 'byteready-server',
      cwd: './apps/server',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--disable-warning=ExperimentalWarning',
      max_memory_restart: '512M',
      time: true,
    },
  ],
}
