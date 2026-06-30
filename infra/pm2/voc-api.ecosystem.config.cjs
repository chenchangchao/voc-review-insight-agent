module.exports = {
  apps: [
    {
      name: "voc-api",
      cwd: "/opt/apps/agent-infra/voc-api",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "8088"
      }
    }
  ]
};
