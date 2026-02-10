import { Storage } from '@google-cloud/storage';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

const keyFilePath = path.join(process.cwd(), 'onyx-oxygen-375710-3cde9656bda0.json');
const storage = new Storage({
    keyFilename: keyFilePath,
});
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

// Build base path prefix according to environment
const getEnvPrefix = () => {
    const appEnv = process.env.APP_ENV;
    const envSegment = appEnv === 'development' ? 'dev' : 'prod';
    const rootFolder = process.env.GCS_FOLDER || '';
    return path.posix.join(envSegment, rootFolder);
};

// Initialization debug info
try {
    const keyExists = fs.existsSync(keyFilePath);
    console.log('[GCS Init] Bucket:', process.env.GOOGLE_CLOUD_BUCKET);
    console.log('[GCS Init] APP_ENV:', process.env.APP_ENV);
    console.log('[GCS Init] GCS_FOLDER:', process.env.GCS_FOLDER);
    console.log('[GCS Init] Key file path:', keyFilePath, 'exists?', keyExists);
    console.log('[GCS Init] Prefix:', getEnvPrefix());
} catch (e) {
    console.error('[GCS Init] Error checking key file:', e?.message);
}

export const uploadGCS = (file, directory, isPublic = true) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided'));
        }

        const extWithDot = path.extname(file.originalname || '');
        const uuid = randomUUID();
        const prefix = getEnvPrefix();
        const gcsFileName = path.posix.join(prefix, directory, `${uuid}${extWithDot}`);
        const gcsFile = bucket.file(gcsFileName);

        const hasBuffer = !!file.buffer && file.buffer.length > 0;
        const hasPath = !!file.path && fs.existsSync(file.path);

        console.log('[GCS Upload] Starting upload', {
            bucket: bucket?.name,
            directory,
            targetPath: gcsFileName,
            isPublic,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: (file.size ?? file.buffer?.length ?? null),
            hasBuffer,
            hasPath,
            appEnv: process.env.APP_ENV,
        });

        const finalize = async () => {
            try {
                if (!isPublic) {
                    const [url] = await gcsFile.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 1000 * 60 * 60, // 1 hour
                    });
                    console.log('[GCS Upload] Signed URL generated:', url);
                    return resolve(url);
                }
                try {
                    await gcsFile.makePublic();
                    console.log('[GCS Upload] Object made public:', gcsFileName);
                } catch (aclErr) {
                    console.warn('[GCS Upload] makePublic failed (continuing):', aclErr?.message);
                }
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
                console.log('[GCS Upload] Public URL:', publicUrl);
                resolve(publicUrl);
            } catch (err) {
                console.error('[GCS Upload] Finalize error:', err?.code, err?.message);
                console.error('[GCS Upload] Stack:', err?.stack);
                reject(err);
            }
        };

        // Prefer buffer; fallback to disk path
        if (hasBuffer) {
            gcsFile.save(file.buffer, {
                resumable: false,
                contentType: file.mimetype,
                metadata: { cacheControl: 'public, max-age=31536000' },
            })
                .then(() => finalize())
                .catch((err) => {
                    console.error('[GCS Upload] save() error:', err?.code, err?.message);
                    console.error('[GCS Upload] Stack:', err?.stack);
                    reject(err);
                });
        } else if (hasPath) {
            const read = fs.createReadStream(file.path);
            const write = gcsFile.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: file.mimetype,
                    cacheControl: 'public, max-age=31536000',
                },
            });
            read.on('error', (err) => {
                console.error('[GCS Upload] Read stream error:', err?.code, err?.message);
                console.error('[GCS Upload] Stack:', err?.stack);
                reject(err);
            });
            write.on('error', (err) => {
                console.error('[GCS Upload] Write stream error:', err?.code, err?.message);
                console.error('[GCS Upload] Stack:', err?.stack);
                reject(err);
            });
            write.on('finish', async () => {
                await finalize();
                // Cleanup temp file
                fs.unlink(file.path, (e) => {
                    if (e) console.warn('[GCS Upload] Temp file cleanup failed:', e?.message);
                });
            });
            read.pipe(write);
        } else {
            console.error('[GCS Upload] No buffer or path on uploaded file');
            reject(new Error('No buffer or path on uploaded file'));
        }
    });
}

export const deleteGCS = (directory, filename) => {
    return new Promise((resolve, reject) => {
        if (!directory || !filename) {
            return reject(new Error('Directory and filename are required'));
        }

        const prefix = getEnvPrefix();
        const gcsFileName = path.posix.join(prefix, directory, filename);
        const gcsFile = bucket.file(gcsFileName);

        console.log(`[GCS Delete] Attempting to delete: ${gcsFileName} (bucket: ${bucket?.name})`);

        gcsFile.delete()
            .then(() => {
                console.log(`[GCS Delete] Successfully deleted: ${gcsFileName}`);
                resolve(true);
            })
            .catch((err) => {
                console.error(`[GCS Delete] Error deleting ${gcsFileName}:`, err?.code, err?.message);
                console.error('[GCS Delete] Stack:', err?.stack);
                reject(err);
            });
    });
};

export const getGCSUrl = (directory, filename, isPublic = true) => {
    return new Promise(async (resolve, reject) => {
        if (!directory || !filename) {
            return reject(new Error('Directory and filename are required'));
        }

        const prefix = getEnvPrefix();
        const gcsFileName = path.posix.join(prefix, directory, filename);
        const gcsFile = bucket.file(gcsFileName);

        try {
            if (!isPublic) {
                const [url] = await gcsFile.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 60, // 1 hour
                });
                console.log('[GCS URL] Signed URL:', url);
                resolve(url);
            } else {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
                console.log('[GCS URL] Public URL:', publicUrl);
                resolve(publicUrl);
            }
        } catch (err) {
            console.error('[GCS URL] Error generating URL:', err?.code, err?.message);
            console.error('[GCS URL] Stack:', err?.stack);
            reject(err);
        }
    });
};