const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const appConfig = JSON.parse(readText('app.json'));
const androidConfig = appConfig.expo?.android ?? {};
const blockedPermissions = androidConfig.blockedPermissions ?? [];

record(
  'Android package is com.blessie.myapp',
  androidConfig.package === 'com.blessie.myapp',
  `found ${androidConfig.package ?? 'missing'}`
);

record(
  'Predictive back is enabled',
  androidConfig.predictiveBackGestureEnabled === true,
  `found ${String(androidConfig.predictiveBackGestureEnabled)}`
);

record(
  'Overlay permission is blocked',
  blockedPermissions.includes('android.permission.SYSTEM_ALERT_WINDOW'),
  'Google Play treats SYSTEM_ALERT_WINDOW as a restricted special permission'
);

record(
  'Digital Asset Links file exists',
  exists('public/.well-known/assetlinks.json'),
  'public/.well-known/assetlinks.json'
);

if (exists('public/.well-known/assetlinks.json')) {
  const assetLinks = JSON.parse(readText('public/.well-known/assetlinks.json'));
  const linkedAndroidApp = Array.isArray(assetLinks)
    ? assetLinks.find((entry) => entry?.target?.namespace === 'android_app')
    : null;
  const certFingerprints = linkedAndroidApp?.target?.sha256_cert_fingerprints ?? [];

  record(
    'Digital Asset Links targets com.blessie.myapp',
    linkedAndroidApp?.target?.package_name === 'com.blessie.myapp',
    `found ${linkedAndroidApp?.target?.package_name ?? 'missing'}`
  );
  record(
    'Digital Asset Links includes release certificate SHA256',
    certFingerprints.includes('86:E8:E5:95:E0:29:B6:48:7D:98:95:78:6F:1D:0E:A7:D8:A3:F4:4A:4F:E8:94:C8:4E:F2:72:1E:19:D9:FD:33'),
    'required for Android App Links verification'
  );
}

record(
  'Privacy page file exists',
  exists('public/privacy/index.html'),
  'public/privacy/index.html'
);

record(
  'Account deletion page file exists',
  exists('public/delete-account/index.html'),
  'public/delete-account/index.html'
);

record(
  'Child safety standards page file exists',
  exists('public/child-safety/index.html'),
  'public/child-safety/index.html'
);

if (exists('public/privacy/index.html')) {
  const privacyPage = readText('public/privacy/index.html');
  record(
    'Privacy page names Blessie',
    /Blessie/i.test(privacyPage),
    'must identify the app/developer for Play review'
  );
}

if (exists('public/delete-account/index.html')) {
  const deletePage = readText('public/delete-account/index.html');
  record(
    'Account deletion page explains deletion',
    /delete|deletion|삭제/i.test(deletePage),
    'must describe account deletion steps or request path'
  );
  record(
    'Account deletion page mentions retained data',
    /retain|retention|keep|보관|유지/i.test(deletePage),
    'must explain deleted/retained data for Play review'
  );
}

if (exists('public/child-safety/index.html')) {
  const childSafetyPage = readText('public/child-safety/index.html');
  record(
    'Child safety page explicitly prohibits CSAE',
    /child sexual abuse and exploitation|CSAE/i.test(childSafetyPage),
    'must publish CSAE standards for Play review'
  );
  record(
    'Child safety page includes Google Play contact email',
    /thswndrnr80@gmail\.com/i.test(childSafetyPage),
    'must identify the child safety point of contact'
  );
}

record(
  'AppSystemBars component exists',
  exists('src/components/app-system-bars.tsx'),
  'src/components/app-system-bars.tsx'
);

if (exists('src/app/_layout.tsx')) {
  const rootLayout = readText('src/app/_layout.tsx');
  record(
    'Root layout mounts AppSystemBars',
    /<AppSystemBars\s*\/>/.test(rootLayout),
    'src/app/_layout.tsx'
  );
}

for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}: ${check.detail}`);
}

const failedChecks = checks.filter((check) => !check.ok);

if (failedChecks.length > 0) {
  console.error(`\n${failedChecks.length} Android release readiness check(s) failed.`);
  process.exit(1);
}

console.log('\nAndroid release readiness checks passed.');
