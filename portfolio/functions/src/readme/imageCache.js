const crypto = require('node:crypto');
const { randomUUID } = require('node:crypto');
const sizeOf = require('image-size');
const admin = require('firebase-admin');

const MAX_IMAGE_COUNT = 50;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 30 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 100 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function getDownloadUrl(bucketName, storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function getFileExtension(contentType, originalUrl) {
  const byContentType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/json': 'json',
  };
  if (byContentType[contentType]) {
    return byContentType[contentType];
  }

  const match = String(originalUrl || '').match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return match ? match[1].toLowerCase() : 'bin';
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseDataUrl(url) {
  const match = String(url || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;
  const contentType = match[1] || 'text/plain';
  const payload = match[3] || '';
  const buffer = match[2] ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8');
  return { buffer, contentType };
}

async function fetchAssetBuffer(url) {
  if (url.startsWith('data:')) {
    const parsed = parseDataUrl(url);
    if (!parsed) {
      throw new Error('Unsupported data URL.');
    }
    if (parsed.buffer.byteLength > MAX_DATA_URL_BYTES) {
      throw new Error('Data URL exceeds 100 KB limit.');
    }
    return parsed;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed with ${response.status}.`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  return { buffer, contentType };
}

function resolveReadmeAssetUrl(originalUrl, context) {
  if (!originalUrl) return null;
  if (originalUrl.startsWith('data:')) return originalUrl;
  if (/^https?:\/\//i.test(originalUrl)) return originalUrl;

  const basePath = context.readmePath.includes('/') ? context.readmePath.slice(0, context.readmePath.lastIndexOf('/') + 1) : '';
  const normalizedPath = originalUrl.startsWith('/') ? originalUrl.slice(1) : `${basePath}${originalUrl}`;
  return `https://raw.githubusercontent.com/${context.owner}/${context.repo}/${context.commitSha}/${normalizedPath}`;
}

async function ensureStorageObject({
  bucket,
  storagePath,
  buffer,
  contentType,
  cacheControl = 'public,max-age=31536000,immutable',
  overwrite = false,
}) {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  let metadata;

  if (!exists || overwrite) {
    const token = randomUUID();
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });
    [metadata] = await file.getMetadata();
  } else {
    [metadata] = await file.getMetadata();
    const token = metadata.metadata?.firebaseStorageDownloadTokens;
    if (!token) {
      const nextToken = randomUUID();
      await file.setMetadata({
        metadata: {
          ...(metadata.metadata || {}),
          firebaseStorageDownloadTokens: nextToken,
        },
      });
      [metadata] = await file.getMetadata();
    }
  }

  const token = metadata.metadata?.firebaseStorageDownloadTokens;
  return {
    storagePath,
    downloadUrl: getDownloadUrl(bucket.name, storagePath, token),
    metadata,
  };
}

async function cacheReadmeAssets({ projectId, imageRefs, context, warnings }) {
  const bucket = admin.storage().bucket();
  const assets = [];
  const assetMap = new Map();
  let totalBytes = 0;

  for (const ref of imageRefs.slice(0, MAX_IMAGE_COUNT)) {
    const resolvedUrl = resolveReadmeAssetUrl(ref.originalUrl, context);
    if (!resolvedUrl) {
      warnings.push(`Skipped unsupported image URL: ${ref.originalUrl}`);
      continue;
    }

    try {
      const { buffer, contentType } = await fetchAssetBuffer(resolvedUrl);
      const normalizedType = contentType.toLowerCase();
      if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
        warnings.push(`Skipped unsupported image type: ${contentType || 'unknown'}`);
        continue;
      }
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        warnings.push(`Skipped oversized image: ${ref.originalUrl}`);
        continue;
      }
      if ((totalBytes + buffer.byteLength) > MAX_TOTAL_ASSET_BYTES) {
        warnings.push('Stopped caching images after hitting the 30 MB asset cap.');
        break;
      }

      const contentHash = sha256(buffer);
      const assetId = contentHash.slice(0, 12);
      if (assetMap.has(ref.originalUrl)) {
        continue;
      }

      const ext = getFileExtension(normalizedType, ref.originalUrl);
      const storagePath = `projects/${projectId}/readme/assets/${contentHash}.${ext}`;
      const uploaded = await ensureStorageObject({
        bucket,
        storagePath,
        buffer,
        contentType: normalizedType,
      });

      let width = null;
      let height = null;
      try {
        const dimensions = sizeOf(buffer);
        width = dimensions.width || null;
        height = dimensions.height || null;
      } catch {
        width = null;
        height = null;
      }

      const asset = {
        assetId,
        contentHash,
        storagePath,
        downloadUrl: uploaded.downloadUrl,
        originalUrl: ref.originalUrl,
        contentType: normalizedType,
        byteSize: buffer.byteLength,
        width,
        height,
      };

      totalBytes += buffer.byteLength;
      assets.push(asset);
      assetMap.set(ref.originalUrl, asset);
    } catch {
      warnings.push(`Failed to cache image: ${ref.originalUrl}`);
    }
  }

  if (imageRefs.length > MAX_IMAGE_COUNT) {
    warnings.push('Stopped caching images after hitting the 50 image cap.');
  }

  return {
    assets,
    assetMap,
  };
}

module.exports = {
  cacheReadmeAssets,
  ensureStorageObject,
  resolveReadmeAssetUrl,
};
