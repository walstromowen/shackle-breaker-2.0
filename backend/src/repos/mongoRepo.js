// backend/src/repos/mongoRepo.js
// Accounts and saves in MongoDB (Atlas or any server) through Mongoose. Same interface as memoryRepo.js.
//
// A save is stored as ONE JSON string (`payload`) instead of a nested document: MongoDB field names have rules (no '.' or leading '$' in
// many versions) and the world data has thousands of coordinate-style keys. The server never queries inside a save, so a string is the
// simplest thing that cannot go wrong. `summary` and `savedAt` stay real fields so slot lists are cheap.
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    usernameLower: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null }
});

const saveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: String, required: true },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    savedAt: { type: Date, required: true },
    payload: { type: String, required: true }
}, { timestamps: true });
saveSchema.index({ userId: 1, slot: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Save = mongoose.models.Save || mongoose.model('Save', saveSchema);

const toUser = (doc) => doc && ({
    id: String(doc._id), username: doc.username, usernameLower: doc.usernameLower,
    passwordHash: doc.passwordHash, createdAt: doc.createdAt, lastLoginAt: doc.lastLoginAt
});

export function createMongoRepo(uri) {
    return {
        kind: 'mongo',

        async connect() {
            if (!uri) throw new Error('MONGODB_URI is not set.');
            mongoose.set('strictQuery', true);
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
            await Promise.all([User.init(), Save.init()]);   // make sure the unique indexes exist
        },
        async close() { await mongoose.disconnect(); },

        users: {
            async create({ username, usernameLower, passwordHash }) {
                try {
                    return toUser(await User.create({ username, usernameLower, passwordHash }));
                } catch (e) {
                    if (e && e.code === 11000) { const err = new Error('duplicate'); err.code = 'DUPLICATE'; throw err; }
                    throw e;
                }
            },
            async findByUsernameLower(usernameLower) { return toUser(await User.findOne({ usernameLower }).lean()); },
            async findById(id) {
                if (!mongoose.isValidObjectId(id)) return null;
                return toUser(await User.findById(id).lean());
            },
            async touchLogin(id) { await User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }); }
        },

        saves: {
            async list(userId) {
                const docs = await Save.find({ userId }, { slot: 1, summary: 1, savedAt: 1 }).sort({ savedAt: -1 }).lean();
                return docs.map(d => ({ slot: d.slot, summary: d.summary, savedAt: d.savedAt }));
            },
            async get(userId, slot) {
                const d = await Save.findOne({ userId, slot }).lean();
                return d ? { slot: d.slot, summary: d.summary, savedAt: d.savedAt, payload: d.payload } : null;
            },
            async put(userId, slot, { summary, savedAt, payload }) {
                await Save.updateOne({ userId, slot }, { $set: { summary, savedAt, payload } }, { upsert: true });
            },
            async remove(userId, slot) {
                const r = await Save.deleteOne({ userId, slot });
                return r.deletedCount > 0;
            },
            async count(userId) { return Save.countDocuments({ userId }); }
        }
    };
}
