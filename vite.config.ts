import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"], // optional: if you want global test setup
    globals: true, // optional: allows using describe, it, expect globally
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/leaderboard": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leaderboard/, "/leaderboard"),
      },
      "/claim": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
      },
      "/execute": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
      },
      "/result": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
      },
      "/health": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
      },
      "/api/challenge": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/challenge/, "/challenge"),
      },
      "/user": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
      },
      "/api/problems": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/problems/, "/problems"),
      },
      "/api/rewards": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rewards/, "/rewards"),
      },
      "api/challenge": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/challenge/, "/challenge"),
      },
      "/api/badges": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/badges/, "/badges"),
      },
      "/api/admin/users": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin\/users/, "/admin/users"),
      },
      "/api/getLeaderboardProblem": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/getLeaderboardProblem/,
            "/getLeaderboardProblem"
          ),
      },
      "/api/admin/users/:id": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/admin\/users\/(.*)/, "/admin/updateUser/$1"),
      },
      "/admin/user/:id/badges": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/admin\/user\/(.*)\/badges/, "/admin/user/$1/badges"),
      },
      "/admin/user/:id/updateBadges": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/admin\/user\/(.*)\/badges/,
            "/admin/user/$1/updateBadges"
          ),
      },
      "/api/admin/claims": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin/, "/admin"),
      },
      "/api/myRewards": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/myRewards/, "/myRewards"),
      },
      "api/admin/editProblemStatement": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin/, "/admin"),
      },

      "/api/admin/stats": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin\/stats/, "/admin/stats"),
      },

      "/api": {
        target: "http://142.93.10.227:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\//, ""),
      },
    },
  },
});
