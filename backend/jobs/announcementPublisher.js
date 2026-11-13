
const cron = require('node-cron');
const pool = require('../config/database');

let scheduledTask = null;
let isRunning = false;

const publishDueAnnouncements = async () => {
  if (isRunning) return;

  isRunning = true;

  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    const due = await client.query(`
      SELECT
        id,
        title
      FROM announcements
      WHERE status = 'scheduled'
        AND scheduled_at <= CURRENT_TIMESTAMP
      ORDER BY scheduled_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `);

    let publishedCount = 0;

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

      if (!result.rows.length) continue;

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

      publishedCount += 1;
    }

    await client.query('COMMIT');

    if (publishedCount > 0) {
      console.log(
        `Announcement publisher published ${publishedCount} announcement(s).`
      );
    }
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error(
      'Scheduled announcement publisher error:',
      error
    );
  } finally {
    if (client) client.release();
    isRunning = false;
  }
};

const startAnnouncementPublisher = () => {
  if (scheduledTask) return;

  scheduledTask = cron.schedule(
    '* * * * *',
    publishDueAnnouncements,
    {
      name: 'zenimonies-announcement-publisher',
      noOverlap: true,
    }
  );

  console.log(
    'ZENIMONIES scheduled announcement publisher started.'
  );

  publishDueAnnouncements();
};

module.exports = {
  startAnnouncementPublisher,
  publishDueAnnouncements,
};
