// ============================================================
// ZENIMONIES BANKING
// CLOUDINARY CONFIGURATION
// Private KYC document storage
// ============================================================

const cloudinary = require('cloudinary').v2;

const isConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

const configureCloudinary = () => {
  if (!isConfigured()) {
    throw new Error(
      'Cloudinary credentials are missing from backend environment variables.'
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
};

module.exports = {
  cloudinary,
  configureCloudinary,
  isConfigured,
};
