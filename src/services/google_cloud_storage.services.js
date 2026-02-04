import { Storage } from '@google-cloud/storage';
import path from 'path';
import { randomUUID } from 'crypto';

const storage = new Storage({
    keyFilename: path.join(process.cwd(), 'onyx-oxygen-375710-3cde9656bda0.json'),
});
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

export const uploadGCS = (file, directory, isPublic = true) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided'));
        }

        const ext = path.extname(file.originalname).slice(1);
        const uuid = randomUUID();
        const gcsFileName = `${directory}/${uuid}.${ext}`;
        const gcsFile = bucket.file(gcsFileName);

        const stream = gcsFile.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        stream.on('error', (err) => {
            reject(err);
        });

        stream.on('finish', async () => {
            try {
                if (!isPublic) {
                    const [url] = await gcsFile.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 1000 * 60 * 60, // 1 hour
                    });
                    return resolve(url);
                } else {
                    await gcsFile.makePublic();
                }

                resolve(`https://storage.googleapis.com/${bucket.name}/${gcsFileName}`);
            } catch (err) {
                reject(err);
            }
        });

        stream.end(file.buffer);
    });
}

export const deleteGCS = (directory, filename) => {
    return new Promise((resolve, reject) => {
        if (!directory || !filename) {
            return reject(new Error('Directory and filename are required'));
        }

        const gcsFileName = `${directory}/${filename}`;
        const gcsFile = bucket.file(gcsFileName);

        console.log(`[GCS Delete] Attempting to delete: ${gcsFileName}`);

        gcsFile.delete()
            .then(() => {
                console.log(`[GCS Delete] Successfully deleted: ${gcsFileName}`);
                resolve(true);
            })
            .catch((err) => {
                console.error(`[GCS Delete] Error deleting ${gcsFileName}:`, err.message);
                reject(err);
            });
    });
};

export const getGCSUrl = (directory, filename, isPublic = true) => {
    return new Promise(async (resolve, reject) => {
        if (!directory || !filename) {
            return reject(new Error('Directory and filename are required'));
        }

        const gcsFileName = `${directory}/${filename}`;
        const gcsFile = bucket.file(gcsFileName);

        try {
            if (!isPublic) {
                const [url] = await gcsFile.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 60, // 1 hour
                });
                resolve(url);
            } else {
                resolve(`https://storage.googleapis.com/${bucket.name}/${gcsFileName}`);
            }
        } catch (err) {
            reject(err);
        }
    });
};