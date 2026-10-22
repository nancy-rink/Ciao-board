// Runs the board in Chromium against a local copy of the site and a local stand-in for the ntfy.sh relay,
// so tests never touch the real relay (or its daily limits).
const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'tests',
  timeout:120e3,
  expect:{timeout:20e3},
  retries:process.env.CI?1:0,
  workers:process.env.CI?2:3,
  reporter:process.env.CI?[['list'],['html',{open:'never'}]]:'list',
  use:{baseURL:'http://127.0.0.1:8765/',trace:'retain-on-failure'},
  webServer:[
    {command:'node tests/serve.js',url:'http://127.0.0.1:8765/index.html',reuseExistingServer:!process.env.CI},
    {command:'node tests/relay.js',url:'http://127.0.0.1:8790/health',reuseExistingServer:!process.env.CI}
  ]
});
