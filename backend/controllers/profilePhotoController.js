const multer = require('multer');
const pool = require('../config/database');

// ============================================================
// PROFILE PHOTO UPLOAD
// ============================================================
//
// Profile photos:
// - JPG
// - PNG
// - WEBP
// - Maximum 2 MB
// - Stored in the database
// - Remain editable even after account verification
//
// ============================================================


// ============================================================
// MULTER STORAGE
// ============================================================

const storage =
  multer.memoryStorage();


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage,

  limits: {
    fileSize:
      2 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.mimetype
      )
    ) {
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
// UPLOAD PROFILE PHOTO
// POST /api/profile/photo
// ============================================================

const uploadProfilePhoto = async (
  req,
  res
) => {

  try {

    // ========================================================
    // GET AUTHENTICATED USER ID
    // ========================================================
    //
    // The authentication middleware provides:
    //
    // req.user.id
    // req.userId
    //
    // We support all known forms safely.
    //
    // ========================================================

    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;


    // ========================================================
    // AUTHENTICATION CHECK
    // ========================================================

    if (!userId) {

      return res.status(401).json({
        success: false,
        message:
          'Unable to identify authenticated user.',
      });

    }


    // ========================================================
    // FILE CHECK
    // ========================================================

    if (!req.file) {

      return res.status(400).json({
        success: false,
        message:
          'Please select a profile photo.',
      });

    }


    // ========================================================
    // CONVERT IMAGE TO BASE64
    // ========================================================

    const base64Image =
      req.file.buffer.toString(
        'base64'
      );


    // ========================================================
    // CREATE DATA URL
    // ========================================================

    const profilePhoto =
      `data:${req.file.mimetype};base64,${base64Image}`;


    // ========================================================
    // SAVE PHOTO
    // ========================================================

    const result =
      await pool.query(
        `
        UPDATE users

        SET
          profile_photo = $1,
          updated_at =
            CURRENT_TIMESTAMP

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


    // ========================================================
    // USER NOT FOUND
    // ========================================================

    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({
        success: false,
        message:
          'User profile not found.',
      });

    }


    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,

      message:
        'Profile photo updated successfully.',

      profile_photo:
        result.rows[0]
          .profile_photo,

      updated_at:
        result.rows[0]
          .updated_at,
    });

  } catch (error) {

    // ========================================================
    // LOG ERROR
    // ========================================================

    console.error(
      'Upload profile photo error:',
      error
    );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(500).json({
      success: false,
      message:
        'Unable to update profile photo.',
    });

  }

};


// ============================================================
// HANDLE PHOTO UPLOAD
// ============================================================

const handlePhotoUpload = (
  req,
  res,
  next
) => {

  upload.single(
    'profile_photo'
  )(
    req,
    res,
    (error) => {

      // ======================================================
      // NO ERROR
      // ======================================================

      if (!error) {
        return next();
      }


      // ======================================================
      // MULTER ERROR
      // ======================================================

      if (
        error instanceof
        multer.MulterError
      ) {

        // ----------------------------------------------------
        // FILE TOO LARGE
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // OTHER MULTER ERROR
        // ----------------------------------------------------

        return res.status(400).json({
          success: false,
          message:
            'Unable to upload profile photo.',
        });

      }


      // ======================================================
      // FILE TYPE / OTHER ERROR
      // ======================================================

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
