module.exports = {
  apps: [
    {
      name: "connect-t-backend",
      cwd: __dirname,
      script: "server.js",
      node_args: "--require ./jobPortalProfilePatch.js",
      instances: 1,
      exec_mode: "fork",
      watch: false
    }
  ]
};
