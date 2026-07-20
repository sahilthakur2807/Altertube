const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

const LISTS = [
  'https://raw.githubusercontent.com/r00tee/Proxy-List/main/Socks5.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=3000&country=US&ssl=all&anonymity=all'
];

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 5500 }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function getProxies() {
  const all = new Set();
  for (const url of LISTS) {
    try {
      const { stdout } = await execPromise(`curl -s "${url}"`);
      const proxies = stdout.trim().split('\n').filter(Boolean);
      for (const p of proxies) {
        const cleaned = p.trim();
        if (cleaned) all.add(cleaned);
      }
    } catch (e) {
      console.error(`Failed to fetch from ${url}:`, e.message);
    }
  }
  return Array.from(all);
}

async function testProxy(proxy) {
  const [ip, port] = proxy.split(':');
  if (!ip || !port) return null;

  // Test YouTube connection using local DNS resolution (socks5:// instead of socks5h://)
  // with a 5 second timeout.
  const cmdYoutube = `curl -x socks5://${proxy} -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 5 "https://www.youtube.com"`;
  const ytRes = await execPromise(cmdYoutube);
  if (ytRes.error) return null;
  const parts = ytRes.stdout.trim().split(' ');
  const httpCode = parseInt(parts[0]);
  const timeTotal = parseFloat(parts[1]) * 1000; // ms

  if (httpCode !== 200) {
    return null;
  }

  // Test GeoIP to confirm US
  const cmdGeo = `curl -x socks5://${proxy} -s --max-time 4 "http://ip-api.com/json"`;
  const geoRes = await execPromise(cmdGeo);
  if (geoRes.error) return null;
  try {
    const geo = JSON.parse(geoRes.stdout);
    if (geo.status === 'success' && geo.countryCode === 'US') {
      return {
        proxy,
        ip,
        port,
        latency: timeTotal,
        city: geo.city,
        region: geo.regionName
      };
    }
  } catch (e) {
    // ignore json parse errors
  }
  return null;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function main() {
  console.log('Fetching proxies...');
  let proxies = await getProxies();
  console.log(`Found ${proxies.length} unique proxies in total.`);
  
  // Shuffle to get a good random sample of the 6000+ proxies
  proxies = shuffle(proxies);

  console.log('Testing proxies (up to 1000 proxies max)...');
  const maxToTest = Math.min(proxies.length, 1000);
  const toTest = proxies.slice(0, maxToTest);
  
  const results = [];
  const concurrency = 50;
  
  for (let i = 0; i < toTest.length; i += concurrency) {
    const chunk = toTest.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(testProxy));
    for (const res of chunkResults) {
      if (res) {
        console.log(`Working US Proxy: ${res.proxy} - Latency: ${res.latency.toFixed(0)}ms (${res.city}, ${res.region})`);
        results.push(res);
      }
    }
    // If we already have 10+ good proxies, we can stop early to save time!
    if (results.length >= 10) {
      break;
    }
  }

  if (results.length === 0) {
    console.error('No working US SOCKS5 proxies found in this batch.');
    process.exit(1);
  }

  results.sort((a, b) => a.latency - b.latency);
  const best = results[0];
  console.log('\n--- Best US SOCKS5 Proxy ---');
  console.log(`Proxy: ${best.proxy}`);
  console.log(`Latency: ${best.latency.toFixed(0)}ms`);
  console.log(`Location: ${best.city}, ${best.region}`);

  // Update Settings DB
  const dbPath = path.join('/Users/sahil/Library/Application Support/Electron/settings.db');
  console.log(`Updating database at: ${dbPath}`);
  
  const db = new Datastore({ filename: dbPath, autoload: true });
  
  await db.updateAsync({ _id: 'useProxy' }, { _id: 'useProxy', value: true }, { upsert: true });
  await db.updateAsync({ _id: 'proxyProtocol' }, { _id: 'proxyProtocol', value: 'socks5' }, { upsert: true });
  await db.updateAsync({ _id: 'proxyHostname' }, { _id: 'proxyHostname', value: best.ip }, { upsert: true });
  await db.updateAsync({ _id: 'proxyPort' }, { _id: 'proxyPort', value: best.port }, { upsert: true });
  
  console.log('Database updated successfully! Please restart FreeTube.');
}

main().catch(console.error);
