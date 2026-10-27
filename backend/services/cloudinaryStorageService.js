// ============================================================
// ZENIMONIES BANKING
// SECURE CLOUDINARY KYC STORAGE SERVICE
// ============================================================

const { Readable } = require('stream');
const {
  cloudinary,
  configureCloudinary,
} = require('../config/cloudinary');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        if (!result) {
          return reject(new Error('Cloudinary returned no upload result.'));
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });

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

  if (!['proof_of_address', 'selfie'].includes(documentKind)) {
    throw new Error('Unsupported KYC document category.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('KYC files must not exceed 10 MB.');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Unsupported KYC file format.');
  }

  // PDF documents use Cloudinary's raw resource type.
  // Image documents and selfies use the image resource type.
  const resourceType =
    file.mimetype === 'application/pdf' ? 'raw' : 'image';

  configureCloudinary();

  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!safeUserId) {
    throw new Error('Invalid KYC user identifier.');
  }

  const publicId =
    `zenimonies-kyc/${safeUserId}/${documentKind}-${require('crypto').randomUUID()}`;

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

  // Save references, not public delivery URLs.
  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || null,
    bytes: result.bytes,
    storageProvider: 'cloudinary',
  };
};

const deleteKycFile = async ({
  publicId,
  resourceType,
}) => {
  if (!publicId || !['image', 'raw'].includes(resourceType)) {
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
