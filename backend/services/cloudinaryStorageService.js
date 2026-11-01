
'use strict';

// ============================================================
// ZENIMONIES BANKING
// CLOUDINARY KYC STORAGE SERVICE
//
// Private authenticated document storage.
// Allowed: PDF, JPEG, PNG and WEBP.
// Maximum file size: 10 MB.
// ============================================================

const crypto = require('crypto');
const { Readable } = require('stream');

const {
  cloudinary,
  configureCloudinary,
} = require('../config/cloudinary');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STORAGE_ROOT = 'zenimonies-kyc';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_DOCUMENT_KINDS = new Set([
  'tier_2_document_front',
  'tier_2_document_back',
  'tier_2_selfie',
  'proof_of_address',
  'selfie',
]);

const MIME_FORMATS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// ------------------------------------------------------------
// Validate actual file content, not just browser MIME type.
// ------------------------------------------------------------

const detectFileFormat = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  // PDF
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  ) {
    return 'pdf';
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }

  // PNG
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature)
  ) {
    return 'png';
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
};

// ------------------------------------------------------------
// Validate user ID used in the private storage path.
// ------------------------------------------------------------

const getSafeUserId = (userId) => {
  if (
    typeof userId !== 'string' &&
    typeof userId !== 'number'
  ) {
    throw new Error('Invalid KYC storage user reference.');
  }

  const safeUserId = String(userId).trim();

  if (
    !safeUserId ||
    safeUserId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(safeUserId)
  ) {
    throw new Error('Invalid KYC storage user reference.');
  }

  return safeUserId;
};

// ------------------------------------------------------------
// Restrict document deletion to the ZENIMONIES KYC folder.
// ------------------------------------------------------------

const isAllowedKycPublicId = (publicId) => {
  if (
    typeof publicId !== 'string' ||
    !publicId.trim() ||
    publicId.length > 512
  ) {
    return false;
  }

  const value = publicId.trim();

  if (
    !value.startsWith(`${STORAGE_ROOT}/`) ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return false;
  }

  const parts = value.split('/');

  return (
    parts.length === 3 &&
    parts[0] === STORAGE_ROOT &&
    /^[a-zA-Z0-9_-]+$/.test(parts[1]) &&
    /^[a-zA-Z0-9_-]+$/.test(parts[2])
  );
};

// ------------------------------------------------------------
// Upload buffer to Cloudinary as an authenticated asset.
// ------------------------------------------------------------

const uploadBuffer = ({
  buffer,
  publicId,
  resourceType,
}) => {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;

      settled = true;

      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,

        // Private authenticated delivery.
        type: 'authenticated',

        overwrite: false,
        unique_filename: false,
        use_filename: false,

        tags: [
          'zenimonies',
          'kyc',
          'private',
        ],
      },
      (error, result) => {
        finish(error, result);
      }
    );

    const source = Readable.from([buffer]);

    source.on('error', (error) => {
      finish(error);
    });

    uploadStream.on('error', (error) => {
      finish(error);
    });

    source.pipe(uploadStream);
  });
};

// ------------------------------------------------------------
// Clean up an incomplete or invalid upload.
// Never log customer document information or identifiers.
// ------------------------------------------------------------

const cleanupUploadedAsset = async ({
  publicId,
  resourceType,
  deliveryType = 'authenticated',
}) => {
  if (
    !publicId ||
    !isAllowedKycPublicId(publicId) ||
    !['image', 'raw'].includes(resourceType) ||
    !['authenticated', 'upload', 'private'].includes(deliveryType)
  ) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        type: deliveryType,
        invalidate: false,
      }
    );
  } catch (_) {
    console.error(
      'KYC storage cleanup failed. Manual review may be required.'
    );
  }
};

// ------------------------------------------------------------
// UPLOAD KYC FILE
// ------------------------------------------------------------

const uploadKycFile = async ({
  file,
  userId,
  documentKind,
}) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('A valid KYC document is required.');
  }

  if (!ALLOWED_DOCUMENT_KINDS.has(documentKind)) {
    throw new Error('Invalid KYC document category.');
  }

  const safeUserId = getSafeUserId(userId);

  const mimeType = String(file.mimetype || '')
    .toLowerCase()
    .trim();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Unsupported document format. Upload PDF, JPEG, PNG or WEBP.'
    );
  }

  const actualSize = file.buffer.length;

  if (
    actualSize <= 0 ||
    actualSize > MAX_FILE_SIZE
  ) {
    throw new Error(
      'KYC documents must not exceed 10 MB.'
    );
  }

  const expectedFormat = MIME_FORMATS[mimeType];
  const actualFormat = detectFileFormat(file.buffer);

  if (
    !actualFormat ||
    actualFormat !== expectedFormat
  ) {
    throw new Error(
      'The uploaded document content does not match its file type.'
    );
  }

  configureCloudinary();

  const resourceType =
    actualFormat === 'pdf' ? 'raw' : 'image';

  const publicId =
    `${STORAGE_ROOT}/${safeUserId}/` +
    `${documentKind}-${crypto.randomUUID()}`;

  let result = null;

  try {
    result = await uploadBuffer({
      buffer: file.buffer,
      publicId,
      resourceType,
    });

    const returnedFormat = String(
      result?.format || ''
    ).toLowerCase();

    const normalizedReturnedFormat =
      returnedFormat === 'jpeg'
        ? 'jpg'
        : returnedFormat;

    const validResult =
      result &&
      result.asset_id &&
      result.public_id === publicId &&
      result.resource_type === resourceType &&
      result.type === 'authenticated' &&
      normalizedReturnedFormat === expectedFormat;

    if (!validResult) {
      await cleanupUploadedAsset({
        publicId: result?.public_id || publicId,
        resourceType:
          result?.resource_type || resourceType,
        deliveryType:
          result?.type || 'authenticated',
      });

      throw new Error(
        'Cloudinary did not confirm a valid private KYC upload.'
      );
    }

    return {
      assetId: result.asset_id,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: normalizedReturnedFormat,
      bytes: result.bytes,
      storageProvider: 'cloudinary',
    };
  } catch (error) {
    if (result?.public_id) {
      await cleanupUploadedAsset({
        publicId: result.public_id,
        resourceType:
          result.resource_type || resourceType,
        deliveryType:
          result.type || 'authenticated',
      });
    }

    console.error(
      'Private KYC document upload failed.'
    );

    throw new Error(
      error?.message ===
        'The uploaded document content does not match its file type.'
        ? error.message
        : 'KYC document upload failed. Please try again.'
    );
  }
};

// ------------------------------------------------------------
// DELETE KYC FILE
//
// Existing controller interface is preserved.
// Deletion is restricted to the KYC storage folder.
// ------------------------------------------------------------

const deleteKycFile = async ({
  publicId,
  resourceType,
}) => {
  if (!isAllowedKycPublicId(publicId)) {
    throw new Error(
      'Invalid KYC storage reference.'
    );
  }

  if (!['image', 'raw'].includes(resourceType)) {
    throw new Error(
      'Invalid KYC storage resource type.'
    );
  }

  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        type: 'authenticated',
        invalidate: false,
      }
    );

    return {
      success:
        result?.result === 'ok' ||
        result?.result === 'not found',
    };
  } catch (_) {
    console.error(
      'Private KYC document deletion failed.'
    );

    throw new Error(
      'KYC document deletion failed. Please try again.'
    );
  }
};

module.exports = {
  uploadKycFile,
  deleteKycFile,
};
