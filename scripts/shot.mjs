// Dev-only helper: capture page screenshots via installed Chrome.
// Usage: node scripts/shot.mjs <url> <outfile> [heightLimit]
import {chromium} from 'playwright-core';

const [url, out, heightLimit] = process.argv.slice(2);
const browser = await chromium.launch({channel: 'chrome'});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
await page.goto(url, {waitUntil: 'networkidle', timeout: 30000});
await page.waitForTimeout(600);
if (heightLimit === 'full') {
  await page.screenshot({path: out, fullPage: true});
} else {
  await page.screenshot({path: out});
}
await browser.close();
console.log('saved', out);
