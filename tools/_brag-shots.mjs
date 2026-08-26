import { chromium } from 'playwright';
const OUT = process.argv[2];
const b = await chromium.launch();

async function shot({ url, needle, file, w = 1440, h = 900, pad = 240, zoom = 1 }) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (zoom !== 1) await p.evaluate((z) => { document.body.style.zoom = String(z); }, zoom);
  await p.waitForTimeout(1800);
  try {
    const loc = p.locator(`text=${needle}`).first();
    await loc.scrollIntoViewIfNeeded({ timeout: 10000 });
    await p.waitForTimeout(700);
    const box = await loc.boundingBox();
    if (box) {
      const y = Math.max(0, box.y - pad);
      await p.screenshot({ path: `${OUT}/${file}`, clip: { x: 0, y, width: w, height: h } });
      console.log('✅', file);
      await ctx.close(); return;
    }
  } catch (e) { console.log('⚠️', file, e.message.slice(0, 50)); }
  await p.screenshot({ path: `${OUT}/${file}` });
  console.log('✅', file, '(뷰포트 전체)');
  await ctx.close();
}

// 코드블록이 안 잘리도록 넓은 뷰포트 + 축소
await shot({ url: 'https://nextjs.org/docs/app/api-reference/adapters/output-types',
  needle: 'assetsHashes', file: '1-nextjs-docs-assetsHashes.png', w: 1920, h: 1000, pad: 300, zoom: 0.85 });
await shot({ url: 'https://nextjs.org/docs/app/api-reference/adapters/routing-information',
  needle: 'middlewareMatchers', file: '2-nextjs-docs-middlewareMatchers.png', w: 1440, h: 900, pad: 260 });
await shot({ url: 'https://github.com/vercel/next.js/pull/96536',
  needle: 'Merged', file: '3-merged-pr.png', w: 1440, h: 820, pad: 120 });
await shot({ url: 'https://github.com/vercel/next.js/commit/24f975677e',
  needle: 'assetsHashes', file: '4-merge-commit.png', w: 1440, h: 900, pad: 300 });
await b.close();
