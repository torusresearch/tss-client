/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { Builder, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');

const TIMEOUT = 10_000; // Test timeout in milliseconds.

(async function example() {
  var count = parseInt(process.argv.slice(2));

  if (isNaN(count)) {
    count = 1;
  }

  for (let i = 0; i < count; i++) {
  console.log(`Running test ${i+1} of ${count}`);
  await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(new Options().headless())
  .build()
  .then(
    async function(driver) {
      await driver.get('http://localhost:8080').then(
        async function() {
          await driver.wait(until.titleMatches(/Test (succeeded|failed)/), TIMEOUT).then(
            async function() {
            const success = await driver.getTitle() == "Test succeeded";
            if (!success) {
              console.log(`Test failed`);
            }
  
            console.log('Test succeeded');
            }, 
            async function (error) {
              console.log(`Test failed: ${error}`);
            }
      );
    }, 
    function (error) {
      console.log(`Test failed: ${error}`);
    });
    await driver.quit();
  },
  function (error) {
    console.log(`Failed to build driver: ${error}`);
  });
  }
})();
