// Dev-only: print computed styles of input wrappers on /signup
import {chromium} from 'playwright-core';

const browser = await chromium.launch({channel: 'chrome'});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
await page.goto('http://localhost:3001/signup', {waitUntil: 'networkidle'});
const info = await page.evaluate(() => {
  return [...document.querySelectorAll('.astryx-text-input')].map((el) => {
    const cs = getComputedStyle(el);
    return {
      cls: el.className.slice(0, 80),
      borderWidth: cs.borderTopWidth,
      borderStyle: cs.borderTopStyle,
      borderColor: cs.borderTopColor,
      background: cs.backgroundColor,
      radius: cs.borderTopLeftRadius,
    };
  });
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
