
const crypto = require('crypto');
const { Readable } = require('stream');

const {
  cloudinary,
  configureCloudinary,
} = require('../config/cloudinary');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MIME_TO_FORMAT = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Keep existing Tier 3 names for compatibility.
// Tier 2 uses separate names to prevent document collisions.
const ALLOWED_DOCUMENT_KINDS = new Set([
  'tier_2_document_front',
  'tier_2_document_back',
  'tier_2_selfie',
  'proof_of_address',
  'selfie',
]);

const normalizeFormat = (value) => {
  const format = String(value || '').trim().toLowerCase();
  return format === 'jpeg' ? 'jpg' : format;
};

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(
            new Error('Cloudinary returned no upload result.')
          );
          return;
        }

        resolve(result);
      }
    );

    Readable.from([buffer]).pipe(stream);
  });

const cleanupUploadedAsset = async ({
  publicId,
  resourceType,
}) => {
  if (!publicId || !['image', 'raw'].includes(resourceType)) {
    return;
  }

  try {
    configureCloudinary();

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: 'authenticated',
      invalidate: true,
    });
  } catch {
    // Do not log private Cloudinary identifiers.
    console.error('KYC upload cleanup failed.');
  }
};

const uploadKycFile = async ({
  file,
  userId,
  documentKind,
}) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('A valid KYC file is required.');
  }

  if (!userId || !documentKind) {
    throw new Error('KYC user and document type are required.');
  }

  if (!ALLOWED_DOCUMENT_KINDS.has(documentKind)) {
    throw new Error('Unsupported KYC document category.');
  }

  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE ||
    file.buffer.length !== file.size
  ) {
    throw new Error(
      'KYC files must be non-empty and must not exceed 10 MB.'
    );
  }

  const mimeType = String(file.mimetype || '')
    .trim()
    .toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported KYC file format.');
  }

  const expectedFormat = MIME_TO_FORMAT[mimeType];

  const resourceType =
    mimeType === 'application/pdf' ? 'raw' : 'image';

  const safeUserId = String(userId).replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  );

  if (!safeUserId) {
    throw new Error('Invalid KYC user identifier.');
  }

  configureCloudinary();

  const publicId =
    `zenimonies-kyc/${safeUserId}/${documentKind}-${crypto.randomUUID()}` +
    (resourceType === 'raw' ? '.pdf' : '');

  const result = await uploadBuffer(file.buffer, {
    public_id: publicId,
    resource_type: resourceType,
    type: 'authenticated',
    overwrite: false,
    unique_filename: false,
    discard_original_filename: true,
    use_filename: false,
    tags: ['zenimonies-kyc'],
  });

  // If Cloudinary returned an incomplete result, remove the
  // uploaded asset where possible before reporting the error.
  if (
    !result.asset_id ||
    !result.public_id ||
    result.resource_type !== resourceType
  ) {
    await cleanupUploadedAsset({
      publicId: result.public_id,
      resourceType,
    });

    throw new Error(
      'Cloudinary returned incomplete KYC storage metadata.'
    );
  }

  const returnedFormat = normalizeFormat(result.format);

  const actualFormat =
    resourceType === 'raw' && !returnedFormat
      ? 'pdf'
      : returnedFormat;

  if (actualFormat !== expectedFormat) {
    await cleanupUploadedAsset({
      publicId: result.public_id,
      resourceType,
    });

    throw new Error(
      'Cloudinary upload format did not match the validated file type.'
    );
  }

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    resourceType,
    format: actualFormat,
    bytes: result.bytes,
    storageProvider: 'cloudinary',
  };
};

const deleteKycFile = async ({
  publicId,
  resourceType,
}) => {
  if (
    typeof publicId !== 'string' ||
    !publicId.trim() ||
    !['image', 'raw'].includes(resourceType)
  ) {
    throw new Error('Valid KYC storage references are required.');
  }

  configureCloudinary();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    invalidate: true,
  });
};

module.exports = {
  uploadKycFile,
  deleteKycFile,
};
