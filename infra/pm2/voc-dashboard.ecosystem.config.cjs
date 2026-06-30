module.exports = {
  apps: [
    {
      name: "voc-dashboard",
      cwd: "/home/ubuntu/apps/voc-dashboard",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NEXT_PUBLIC_VOC_API_BASE_URL: "https://api-voc.chenchangchao.com"
      }
    }
  ]
};
