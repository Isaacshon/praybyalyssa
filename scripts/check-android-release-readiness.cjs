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
