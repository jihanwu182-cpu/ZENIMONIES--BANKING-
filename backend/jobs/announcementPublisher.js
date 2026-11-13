
const cron = require('node-cron');
const pool = require('../config/database');

let scheduledTask = null;
let isRunning = false;

const publishDueAnnouncements = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock due announcements so multiple server instances
    // cannot publish the same announcement simultaneously.
    const due = await client.query(`
      SELECT
        id,
        title,
        audience_type
      FROM announcements
      WHERE status = 'scheduled'
        AND scheduled_at <= CURRENT_TIMESTAMP
      ORDER BY scheduled_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `);

    for (const announcement of due.rows) {
      const result = await client.query(
        `
        UPDATE announcements
        SET
          status = 'published',
          published_at = CURRENT_TIMESTAMP,
          scheduled_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'scheduled'
        RETURNING id, title
        `,
        [announcement.id]
      );

      if (!result.rows.length) {
        continue;
      }

      // System-generated publication audit record.
      // user_id is NULL because no administrator performed
      // this automatic scheduled publication.
      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          description
        )
        VALUES ($1, $2, $3)
        `,
        [
          null,
          'ANNOUNCEMENT_AUTO_PUBLISHED',
          `Automatically published scheduled announcement ${announcement.id}: ${announcement.title}.`,
        ]
      );
    }

    await client.query('COMMIT');

    if (due.rows.length > 0) {
      console.log(
        `Announcement publisher processed ${due.rows.length} due announcement(s).`
      );
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(
      'Scheduled announcement publisher error:',
      error
    );
  } finally {
    client.release();
    isRunning = false;
  }
};

const startAnnouncementPublisher = () => {
  if (scheduledTask) {
    console.log(
      'Announcement publisher is already running.'
    );
    return;
  }

  // Run once every minute.
  scheduledTask = cron.schedule(
    '* * * * *',
    () => {
      publishDueAnnouncements();
    },
    {
      name: 'zenimonies-announcement-publisher',
      noOverlap: true,
    }
  );

  console.log(
    'ZENIMONIES scheduled announcement publisher started.'
  );

  // Process announcements that became due while the
  // server was offline, without waiting for the next minute.
  publishDueAnnouncements();
};

module.exports = {
  startAnnouncementPublisher,
  publishDueAnnouncements,
};
