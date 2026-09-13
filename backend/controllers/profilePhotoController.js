const multer = require('multer');
const pool = require('../config/database');

// ============================================================
// PROFILE PHOTO UPLOAD
// ============================================================
//
// Photos are kept in memory and stored as a data URL in the
// PostgreSQL users.profile_photo column.
//
// This avoids relying on Render's temporary filesystem.
//

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Only JPG, PNG, and WEBP images are allowed.'
        )
      );
    }

    cb(null, true);
  },
});


// ============================================================
// SAVE PROFILE PHOTO
// POST /api/profile/photo
// ============================================================

const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a profile photo.',
      });
    }

    // Convert uploaded image to a database-safe data URL.
    const base64Image =
      req.file.buffer.toString('base64');

    const profilePhoto =
      `data:${req.file.mimetype};base64,${base64Image}`;

    const result = await pool.query(
      `
      UPDATE users

      SET
        profile_photo = $1,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $2

      RETURNING
        id,
        profile_photo,
        updated_at
      `,
      [
        profilePhoto,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Profile photo updated successfully.',

      profile_photo:
        result.rows[0].profile_photo,

      updated_at:
        result.rows[0].updated_at,
    });

  } catch (error) {
    console.error(
      'Upload profile photo error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to update profile photo.',
    });
  }
};


// ============================================================
// MULTER ERROR HANDLER
// ============================================================

const handlePhotoUpload = (req, res, next) => {
  upload.single('profile_photo')(
    req,
    res,
    (error) => {

      if (!error) {
        return next();
      }


      // --------------------------------------------------------
      // MULTER ERRORS
      // --------------------------------------------------------

      if (error instanceof multer.MulterError) {

        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Profile photo must not exceed 2 MB.',
          });
        }

        return res.status(400).json({
          success: false,
          message:
            'Unable to upload profile photo.',
        });
      }


      // --------------------------------------------------------
      // FILE TYPE / OTHER ERRORS
      // --------------------------------------------------------

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          'Invalid profile photo.',
      });
    }
  );
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  uploadProfilePhoto,
  handlePhotoUpload,
};
