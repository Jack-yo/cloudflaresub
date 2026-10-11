import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const base = {
  type: 'vmess',
  port: 443,
  uuid: '00000000-0000-4000-8000-000000000001',
  cipher: 'auto',
  network: 'ws',
  tls: true,
  host: 'www.nicecc.ccwu.cc',
  path: '/asdsdds',
  sni: 'www.nicecc.ccwu.cc',
};
const nodes = [
  { ...base, name: 'cloudflare', server: '104.16.1.2' },
  { ...base, name: 'origin', server: '107.174.250.250' },
  { ...base, name: 'other-domain', server: '104.16.1.3', host: 'example.org', sni: 'example.org' },
];
const env = {
  SUB_ACCESS_TOKEN: 'test-token',
  SUB_STORE: { get: async () => JSON.stringify({ nodes }) },
};
const response = await worker.fetch(
  new Request('https://example.workers.dev/sub/test?target=clash&token=test-token'),
  env,
);
assert.equal(response.status, 200);
const yaml = await response.text();
const blocks = yaml.split(/(?=  - name: ")/);
const cloudflare = blocks.find((block) => block.startsWith('  - name: "cloudflare"'));
const origin = blocks.find((block) => block.startsWith('  - name: "origin"'));
const other = blocks.find((block) => block.startsWith('  - name: "other-domain"'));

assert.match(cloudflare, /servername: "www\.nicecc\.ccwu\.cc"/);
assert.match(cloudflare, /client-fingerprint: chrome/);
assert.match(cloudflare, /ech-opts:\n      enable: true/);
assert.match(yaml, /dns:\n  enable: true\n  nameserver:\n    - https:\/\/dns\.alidns\.com\/dns-query/);
assert.doesNotMatch(origin, /ech-opts:/);
assert.doesNotMatch(other, /ech-opts:/);

console.log('Worker ECH subscription test passed');
