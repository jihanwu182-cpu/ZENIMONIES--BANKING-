
const pool = require('../../config/database');

const runAnnouncementMigration = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,

        priority VARCHAR(20) NOT NULL DEFAULT 'normal'
          CHECK (priority IN ('normal', 'important', 'urgent')),

        audience_type VARCHAR(30) NOT NULL DEFAULT 'all'
          CHECK (
            audience_type IN (
              'all',
              'personal',
              'business',
              'verification_tier'
            )
          ),

        audience_value VARCHAR(50),

        status VARCHAR(20) NOT NULL DEFAULT 'draft'
          CHECK (
            status IN (
              'draft',
              'scheduled',
              'published',
              'archived'
            )
          ),

        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,

        created_by UUID REFERENCES users(id)
          ON DELETE SET NULL,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS announcement_reads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        announcement_id UUID NOT NULL
          REFERENCES announcements(id)
          ON DELETE CASCADE,

        user_id UUID NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (announcement_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_announcements_status
        ON announcements(status, published_at DESC);

      CREATE INDEX IF NOT EXISTS idx_announcements_schedule
        ON announcements(status, scheduled_at);

      CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
        ON announcement_reads(user_id);

      CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
        ON announcement_reads(announcement_id);
    `);

    await client.query('COMMIT');

    console.log(
      'ZENIMONIES announcement migration completed.'
    );
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Announcement migration failed:',
      error
    );

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  runAnnouncementMigration,
};
