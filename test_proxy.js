const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let targetCountryCode = 'ALL';

// Add countries you want to exclude here (e.g. ['CN', 'RU', 'IR'])
const EXCLUDED_COUNTRIES = ['IN'];

// --- Custom configuration for private/authenticated proxies (e.g. Webshare) ---
// Note: If you paste your proxies in proxies.txt in IP:PORT:USER:PASS format, 
// the script will parse the credentials automatically for each proxy!
const PROXY_PROTOCOL = 'socks5h'; // Default fallback protocol: 'http' or 'socks5h'
const PROXY_USER = null; // Default fallback username (set to string if needed)
const PROXY_PASS = null; // Default fallback password (set to string if needed)

const LISTS = [
  // --- Updated ProxyScrape APIs (v4 / Current format) ---
  'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&protocol=socks5',
  'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&protocol=socks5&country=US',
  'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&protocol=socks5&country=IN',

  // --- Active Monosans Repositories ---
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies_anonymous/socks5.txt',

  // --- TheSpeedX Active Repos ---
  // 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  // 'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt',

  // --- Top Daily Auto-Validated GitHub Repositories ---
  'https://raw.githubusercontent.com/VPSLabCloud/VPSLab-Free-Proxy-List/main/socks5_all.txt',
  // 'https://raw.githubusercontent.com/proxygenerator1/ProxyGenerator/main/MostStable/socks5.txt',
  // 'https://raw.githubusercontent.com/Thordata/awesome-free-proxy-list/main/proxies/socks5.txt',
  // 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
  // 'https://raw.githubusercontent.com/ProxyScraper/ProxyScraper/main/socks5.txt',
  // 'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/generated/socks5_proxies.txt',
  // 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_HTTPS.txt',
  // 'https://raw.githubusercontent.com/rdavydov/refreshed-socks5-paths/main/socks5.txt',

  // --- GeoNode API (JSON payload) ---
  'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5'
];

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 6000 }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function getProxies() {
  const localFile = path.join(__dirname, 'proxies.txt');
  if (fs.existsSync(localFile)) {
    console.log(`Loading proxies from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, 'utf8');
    const all = new Set();
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      all.add(line);
    }
    return Array.from(all);
  }

  const all = new Set();
  for (const url of LISTS) {
    try {
      const { stdout } = await execPromise(`curl -s "${url}"`);
      const trimmed = stdout.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.data && Array.isArray(parsed.data)) {
            for (const item of parsed.data) {
              if (item.ip && item.port) {
                all.add(`${item.ip}:${item.port}`);
              }
            }
          }
        } catch (err) {
          // ignore json parse error
        }
      } else {
        const proxies = trimmed.split('\n').filter(Boolean);
        for (const p of proxies) {
          const cleaned = p.trim();
          if (cleaned && !cleaned.startsWith('{')) all.add(cleaned);
        }
      }
    } catch (e) {
      console.error(`Failed to fetch from ${url}:`, e.message);
    }
  }
  return Array.from(all);
}

async function testProxy(proxyStr) {
  let ip, port;
  let user = PROXY_USER;
  let pass = PROXY_PASS;
  let proto = PROXY_PROTOCOL;

  let cleaned = proxyStr.trim();

  // Parse scheme if present (e.g. socks5:// or http://)
  if (cleaned.includes('://')) {
    const urlParts = cleaned.split('://');
    const scheme = urlParts[0].toLowerCase();
    proto = scheme === 'socks5' ? 'socks5h' : scheme;
    cleaned = urlParts[1];
  }

  // Parse credentials if inline (e.g. user:pass@ip:port)
  if (cleaned.includes('@')) {
    const parts = cleaned.split('@');
    const credentials = parts[0].split(':');
    if (credentials.length === 2) {
      user = credentials[0];
      pass = credentials[1];
    }
    cleaned = parts[1];
  }

  const parts = cleaned.split(':');
  if (parts.length === 4) {
    // format is ip:port:user:pass
    ip = parts[0];
    port = parts[1];
    user = parts[2];
    pass = parts[3];
  } else if (parts.length === 2) {
    ip = parts[0];
    port = parts[1];
  } else {
    return null;
  }

  if (!ip || !port) return null;

  const authPart = (user && pass) ? `${user}:${pass}@` : '';
  const proxyUrl = `${proto}://${authPart}${ip}:${port}`;

  // 1. Test Google Video connection
  const cmdVideo = `curl -x "${proxyUrl}" -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 5 "https://redirector.googlevideo.com/report_mapping"`;
  const videoRes = await execPromise(cmdVideo);
  if (videoRes.error) return null;
  const parts1 = videoRes.stdout.trim().split(' ');
  const code1 = parseInt(parts1[0]);
  const latency1 = parseFloat(parts1[1]) * 1000;

  if (code1 !== 200) return null;

  // 2. Test YouTube homepage connection (for PO token / general API access)
  const cmdYt = `curl -x "${proxyUrl}" -s -o /dev/null -w "%{http_code}" --max-time 5 "https://www.youtube.com"`;
  const ytRes = await execPromise(cmdYt);
  if (ytRes.error) return null;
  const code2 = parseInt(ytRes.stdout.trim());

  if (code2 !== 200) return null;

  // Test GeoIP to confirm country
  const cmdGeo = `curl -x "${proxyUrl}" -s --max-time 5 "http://ip-api.com/json"`;
  const geoRes = await execPromise(cmdGeo);
  if (geoRes.error) return null;
  try {
    const geo = JSON.parse(geoRes.stdout);
    if (geo.status === 'success' &&
      (geo.countryCode === targetCountryCode || targetCountryCode === 'ALL') &&
      !EXCLUDED_COUNTRIES.includes(geo.countryCode)) {
      return {
        proxy: `${ip}:${port}`,
        ip,
        port,
        user,
        pass,
        proto,
        latency: latency1,
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
  targetCountryCode = process.argv[2] ? process.argv[2].toUpperCase() : 'ALL';
  const countryCode = targetCountryCode;
  console.log(`Setting target country to: ${countryCode}`);
  console.log('Fetching proxies...');
  let proxies = await getProxies();
  console.log(`Found ${proxies.length} unique proxies in total.`);

  // Only shuffle if not loading from a local proxies file
  if (!fs.existsSync(path.join(__dirname, 'proxies.txt'))) {
    proxies = shuffle(proxies);
  }

  console.log('Testing proxies...');
  const maxToTest = Math.min(proxies.length, 1000);
  const toTest = proxies.slice(0, maxToTest);

  const isLocal = fs.existsSync(path.join(__dirname, 'proxies.txt'));
  const concurrency = isLocal ? 20 : 100; // lower concurrency to avoid rate limits on private proxies
  const results = [];

  for (let i = 0; i < toTest.length; i += concurrency) {
    const chunk = toTest.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(testProxy));
    for (const res of chunkResults) {
      if (res) {
        console.log(`Working ${countryCode} Proxy: ${res.proxy} - Latency: ${res.latency.toFixed(0)}ms (${res.city}, ${res.region})`);
        results.push(res);
      }
    }
    if (results.length >= 10) {
      break;
    }
  }

  if (results.length === 0) {
    console.error(`No working ${countryCode} proxies found in this batch.`);
    process.exit(1);
  }

  results.sort((a, b) => a.latency - b.latency);
  const best = results[0];
  console.log(`\n--- Best ${countryCode} Proxy ---`);
  console.log(`Proxy: ${best.proxy}`);
  console.log(`Latency: ${best.latency.toFixed(0)}ms`);
  console.log(`Location: ${best.city}, ${best.region}`);
  console.log(`IP: ${best.ip}`);
  console.log(`Port: ${best.port}`);

  // Write to working_proxy.json to notify the running FreeTube app
  const proxyUpdate = {
    useProxy: true,
    proxyProtocol: best.proto === 'socks5h' ? 'socks5' : best.proto,
    proxyHostname: best.ip,
    proxyPort: String(best.port),
    proxyUsername: best.user || '',
    proxyPassword: best.pass || ''
  };
  const updateFilePath = '/Users/sahil/Library/Application Support/Electron/working_proxy.json';
  try {
    fs.writeFileSync(updateFilePath, JSON.stringify(proxyUpdate, null, 2));
    console.log(`\nWritten working proxy to: ${updateFilePath}`);
  } catch (err) {
    console.error('Failed to write working_proxy.json:', err.message);
  }
  console.log('The proxy settings should update automatically in the running FreeTube app.');
}

main().catch(console.error);
