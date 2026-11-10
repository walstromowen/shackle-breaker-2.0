// backend/test/etag.test.js: `npm test`. Game files are tagged by their contents, so a deploy (which gives every file a new
// modified time) does not make players download the whole game again: an unchanged file still answers 304.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp, contentEtag } from '../src/app.js';
import { createMemoryRepo } from '../src/repos/memoryRepo.js';
import { loadConfig } from '../src/config.js';

/* node's fetch adds "Cache-Control: no-cache" to a conditional request (which always gets a full answer); a browser revalidating
   a no-cache file sends only If-None-Match, so the test asks the way a browser does */
function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        http.get(url, { headers }, (res) => { res.resume(); res.on('end', () => resolve(res)); }).on('error', reject);
    });
}

async function withServer(fn) {
    const config = { ...loadConfig({}), serveFrontend: true };
    const app = createApp({ repo: createMemoryRepo(), config });
    const server = app.listen(0);
    await new Promise(r => server.once('listening', r));
    try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}

test('a game file keeps its ETag when only its modified time changes, and answers 304 to that tag', async () => {
    await withServer(async (base) => {
        const url = `${base}/shared/core/eventBus.js`;
        const first = await get(url);
        assert.equal(first.statusCode, 200);
        assert.equal(first.headers['cache-control'], 'no-cache');
        assert.equal(first.headers['last-modified'], undefined, 'no date to go stale on a deploy');
        const etag = first.headers.etag;
        assert.match(etag, /^"[0-9a-f]+-[A-Za-z0-9_-]+"$/);
        const again = await get(url, { 'If-None-Match': etag });
        assert.equal(again.statusCode, 304);
    });
});

test('the tag follows the bytes: same contents, same tag at any time; new contents, new tag', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etag-'));
    const a = path.join(dir, 'a.bin'), b = path.join(dir, 'b.bin');
    fs.writeFileSync(a, 'same bytes'); fs.writeFileSync(b, 'same bytes');
    fs.utimesSync(b, new Date(2001, 1, 1), new Date(2001, 1, 1));
    assert.equal(contentEtag(a, fs.statSync(a)), contentEtag(b, fs.statSync(b)));
    fs.writeFileSync(b, 'other byte');
    assert.notEqual(contentEtag(a, fs.statSync(a)), contentEtag(b, fs.statSync(b)), 'a replaced file is hashed again');
    fs.rmSync(dir, { recursive: true });
});
