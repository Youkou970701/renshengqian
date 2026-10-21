import{readFileSync}from'node:fs';import{engineHash}from'./engine-hash.mjs';
const data=JSON.parse(readFileSync(new URL('../src/content/achievements-rarity.json',import.meta.url),'utf8'));if(data.n!==100000||data.engineHash!==engineHash())throw Error('图鉴模拟频率与当前引擎版本不一致，请运行 npm run rarity。');console.log('Rarity engine hash PASS');
