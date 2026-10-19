// backend/scripts/checkDb.js: `npm run check:db --workspace @shackle-breaker/backend`  (or `npm run check:db` inside backend/)
// Connects to MONGODB_URI and runs the real account + save operations against it, then cleans up after itself.
// Run it once after setting up MongoDB, to find a wrong connection string or a blocked IP address BEFORE testers do.
import 'dotenv/config';
import { createMongoRepo } from '../src/repos/mongoRepo.js';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set (backend/.env or the environment).'); process.exit(1); }

const repo = createMongoRepo(uri);
const name = `dbcheck_${Date.now().toString(36)}`;
let user;
try {
    await repo.connect();
    console.log('1. connected');

    user = await repo.users.create({ username: name, usernameLower: name, passwordHash: 'x' });
    console.log('2. created a user', user.id);

    try { await repo.users.create({ username: name, usernameLower: name, passwordHash: 'x' }); console.error('   FAIL: a duplicate username was accepted'); process.exitCode = 1; }
    catch (e) { console.log('3. duplicate usernames are refused:', e.code === 'DUPLICATE'); }

    console.log('4. found by name:', (await repo.users.findByUsernameLower(name))?.id === user.id, '| by id:', (await repo.users.findById(user.id))?.username === name);

    // keys with dots and dollars are exactly what the world data looks like: they must survive because the save is stored as a string
    const payload = JSON.stringify({ format: 'x', data: { 'a.b': 1, '$c': 2, changes: { '10_12': null } } });
    await repo.saves.put(user.id, 'check', { summary: { name: 'T' }, savedAt: new Date(), payload });
    await repo.saves.put(user.id, 'check', { summary: { name: 'T2' }, savedAt: new Date(), payload });   // upsert, not a duplicate
    const back = await repo.saves.get(user.id, 'check');
    console.log('5. save round trip:', back && back.payload === payload, '| one slot after two writes:', (await repo.saves.count(user.id)) === 1);
    console.log('6. listed:', JSON.stringify(await repo.saves.list(user.id)));
    console.log('7. removed:', await repo.saves.remove(user.id, 'check'));
    console.log('\nThe database works.');
} catch (e) {
    console.error('\nFAILED:', e.message);
    process.exitCode = 1;
} finally {
    try { if (user) { const mongoose = (await import('mongoose')).default; await mongoose.connection.collection('users').deleteOne({ usernameLower: name }); } } catch {}
    await repo.close().catch(() => {});
}
