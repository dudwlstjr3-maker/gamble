const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', fullyParallel: true, workers: 2,
  timeout: 30000, expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', locale: 'ko-KR', timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) } },
  projects: [320, 360, 390, 430].flatMap(width => ['light','dark'].map(colorScheme => ({ name: `${width}-${colorScheme}`, use: { viewport: { width, height: 844 }, colorScheme } }))),
  webServer: { command: 'node tests/server.cjs', url: 'http://127.0.0.1:4173/tests/sandbox.html', reuseExistingServer: !process.env.CI }
});
