// ============================================================
// VERIFY ELECTRICITY METER WITH SOGO
// ============================================================

const verifyElectricityMeter = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // AUTHENTICATED USER
    // ----------------------------------------------------------

    const userId =
      req.user?.id ||
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ----------------------------------------------------------
    // REQUEST DATA
    // ----------------------------------------------------------

    const {
      provider,
      meter_number,
      meter_type,
    } = req.body;

    // ----------------------------------------------------------
    // REQUIRED FIELDS
    // ----------------------------------------------------------

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Electricity provider is required.',
      });
    }

    if (!meter_number) {
      return res.status(400).json({
        success: false,
        message: 'Meter number is required.',
      });
    }

    if (!meter_type) {
      return res.status(400).json({
        success: false,
        message: 'Meter type is required.',
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE
    // ----------------------------------------------------------

    const normalizedProvider =
      String(provider)
        .trim()
        .toUpperCase();

    const normalizedMeterNumber =
      String(meter_number)
        .trim();

    const normalizedMeterType =
      String(meter_type)
        .trim()
        .toLowerCase();

    // ----------------------------------------------------------
    // VALIDATE PROVIDER
    // ----------------------------------------------------------

    if (
      !ELECTRICITY_PROVIDERS.includes(
        normalizedProvider
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported electricity provider.',
      });
    }

    // ----------------------------------------------------------
    // VALIDATE METER TYPE
    // ----------------------------------------------------------

    if (
      ![
        'prepaid',
        'postpaid',
      ].includes(
        normalizedMeterType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Meter type must be prepaid or postpaid.',
      });
    }

    // ----------------------------------------------------------
    // VALIDATE METER NUMBER
    // ----------------------------------------------------------

    if (
      !isValidCustomerNumber(
        normalizedMeterNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid meter number.',
      });
    }

    // ----------------------------------------------------------
    // SOGO CONFIGURATION
    // ----------------------------------------------------------

    const sogoApiKey =
      process.env.SOGO_API_KEY;

    const sogoBaseUrl =
      process.env.SOGO_API_BASE_URL ||
      'https://sandbox.sogo.africa/v1';

    if (!sogoApiKey) {
      console.error(
        'SOGO_API_KEY is not configured.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Electricity verification service is not configured.',
      });
    }

    // ----------------------------------------------------------
    // MAP ZENIMONIES PROVIDER CODE TO SOGO DISCO SLUG
    // ----------------------------------------------------------

    const SOGO_DISCO_SLUGS = {
      APLE: 'aple',
      AEDC: 'aedc',
      BEDC: 'bedc',
      EKEDC: 'ekedc',
      EEDC: 'eedc',
      IBEDC: 'ibedc',
      IKEDC: 'ikedc',
      JED: 'jed',
      KAEDCO: 'kaedco',
      KEDCO: 'kedco',
      PHEDC: 'phed',
      YEDC: 'yedc',
    };

    const discoSlug =
      SOGO_DISCO_SLUGS[
        normalizedProvider
      ];

    if (!discoSlug) {
      return res.status(400).json({
        success: false,
        message:
          'Electricity provider mapping is not configured.',
      });
    }

    // ----------------------------------------------------------
    // CALL SOGO SANDBOX
    // ----------------------------------------------------------

    const response =
      await fetch(
        `${sogoBaseUrl}/bills/electricity/verify-meter`,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${sogoApiKey}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            disco_slug:
              discoSlug,

            meter_number:
              normalizedMeterNumber,

            meter_type:
              normalizedMeterType,
          }),
        }
      );

    // ----------------------------------------------------------
    // READ SOGO RESPONSE
    // ----------------------------------------------------------

    let sogoResult = null;

    try {
      sogoResult =
        await response.json();
    } catch (jsonError) {
      sogoResult = null;
    }

    // ----------------------------------------------------------
    // SOGO ERROR
    // ----------------------------------------------------------

    if (!response.ok) {
      console.error(
        'Sogo meter verification failed:',
        {
          status:
            response.status,

          response:
            sogoResult,
        }
      );

      const sogoMessage =
        sogoResult?.error?.message ||
        sogoResult?.message ||
        'Meter verification failed.';
      
      return res.status(
        response.status >= 400 &&
        response.status < 500
          ? response.status
          : 502
      ).json({
        success: false,

        message:
          sogoMessage,

        verification_status:
          'failed',
      });
    }

    // ----------------------------------------------------------
    // EXTRACT VERIFICATION
    // ----------------------------------------------------------

    const verification =
      sogoResult?.verification ||
      sogoResult?.data?.verification ||
      sogoResult?.data;

    if (!verification) {
      console.error(
        'Unexpected Sogo verification response:',
        sogoResult
      );

      return res.status(502).json({
        success: false,
        message:
          'Electricity provider returned an invalid verification response.',
      });
    }

    // ----------------------------------------------------------
    // SUCCESS
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      test_mode:
        sogoBaseUrl.includes(
          'sandbox'
        ),

      message:
        'Electricity meter verified successfully.',

      verification_status:
        'verified',

      data: {
        provider:
          normalizedProvider,

        disco_slug:
          discoSlug,

        customer_name:
          verification.customer_name ||
          null,

        address:
          verification.address ||
          null,

        meter_number:
          verification.meter_number ||
          normalizedMeterNumber,

        meter_type:
          verification.meter_type ||
          normalizedMeterType,
      },
    });
  } catch (error) {
    console.error(
      'Electricity meter verification error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to verify electricity meter at this time.',
    });
  }
};
