/* eslint-disable @typescript-eslint/no-var-requires */
const { Builder, until, logging } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const TIMEOUT = 10_000; // Test timeout in milliseconds.

(async function runBrowserTest() {
  const count = parseInt(process.argv[2]) || 1;

  // Build web driver.
  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  const opts = new chrome.Options();
  opts.setLoggingPrefs(logPrefs);
  opts.addArguments('--headless=new');
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();

  const fail = async (reason) => {
    console.log(await driver.manage().logs().get(logging.Type.BROWSER));
    console.log(`Test failed: ${reason}`);
    process.exit(1);
  };

  for (let i = 0; i < count; i++) {
    console.log(`Running test ${i + 1} of ${count}`);
    await driver.get("http://localhost:8080");
    try {
      await driver.wait(until.titleMatches(/Test (succeeded|failed)/), TIMEOUT);
    } catch (err) {
      await fail("timeout");
    }
    const title = await driver.getTitle();
    const expectedTitle = "Test succeeded";
    const success = title === expectedTitle;
    if (!success) {
      await fail(`expected "${expectedTitle}", got "${title}"`);
    }
    console.log("Test succeeded");
  }
  await driver.quit();
})();
