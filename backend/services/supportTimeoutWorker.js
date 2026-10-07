const pool = require('../config/database');

const {
  sendCustomerResponseReminder,
  autoCloseInactiveTicket,
} = require('./supportService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE TIMEOUT WORKER
// ============================================================
//
// PURPOSE:
//
// Automatically manages cases that are waiting for a customer.
//
// Workflow:
//
// Agent asks customer for information
//          ↓
// Ticket = pending
//          ↓
// 12 hours
//          ↓
// Automatic reminder
//          ↓
// 24 hours
//          ↓
// Automatic closure
//
// IMPORTANT:
//
// This worker does NOT close cases simply because an agent
// has not replied.
//
// It only processes cases where:
//
//     status = pending
//
// AND:
//
//     waiting_since IS NOT NULL
//
// AND:
//
//     customer_response_due_at IS NOT NULL
//
// Customer replies reset the waiting timers.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const WORKER_INTERVAL_MS = Number(
  process.env.SUPPORT_TIMEOUT_WORKER_INTERVAL_MS ||
    5 * 60 * 1000
);


// ============================================================
// WORKER STATE
// ============================================================

let workerTimer = null;

let workerRunning = false;


// ============================================================
// FIND CASES REQUIRING REMINDER
// ============================================================

async function findTicketsForReminder() {
  const result = await pool.query(`
    SELECT
      id

    FROM support_tickets

    WHERE
      status = 'pending'

      AND waiting_since IS NOT NULL

      AND customer_response_due_at IS NOT NULL

      AND reminder_sent_at IS NULL

      AND waiting_since <=
        CURRENT_TIMESTAMP
        - INTERVAL '12 hours'

      AND customer_response_due_at >
        CURRENT_TIMESTAMP

    ORDER BY waiting_since ASC

    LIMIT 100
  `);

  return result.rows;
}


// ============================================================
// FIND CASES READY FOR AUTO-CLOSURE
// ============================================================

async function findTicketsForAutoClose() {
  const result = await pool.query(`
    SELECT
      id

    FROM support_tickets

    WHERE
      status = 'pending'

      AND waiting_since IS NOT NULL

      AND customer_response_due_at IS NOT NULL

      AND customer_response_due_at <=
        CURRENT_TIMESTAMP

    ORDER BY customer_response_due_at ASC

    LIMIT 100
  `);

  return result.rows;
}


// ============================================================
// PROCESS REMINDERS
// ============================================================

async function processReminders() {
  const tickets =
    await findTicketsForReminder();

  let processed = 0;

  for (const ticket of tickets) {
    try {
      const result =
        await sendCustomerResponseReminder(
          ticket.id
        );

      if (result?.sent) {
        processed += 1;

        console.log(
          `[Customer Care Worker] Reminder sent for ticket ${ticket.id}`
        );
      }
    } catch (error) {
      console.error(
        `[Customer Care Worker] Reminder failed for ticket ${ticket.id}:`,
        error
      );
    }
  }

  return processed;
}


// ============================================================
// PROCESS AUTOMATIC CLOSURES
// ============================================================

async function processAutoClosures() {
  const tickets =
    await findTicketsForAutoClose();

  let processed = 0;

  for (const ticket of tickets) {
    try {
      const result =
        await autoCloseInactiveTicket(
          ticket.id
        );

      if (result?.closed) {
        processed += 1;

        console.log(
          `[Customer Care Worker] Automatically closed ticket ${ticket.id}`
        );
      }
    } catch (error) {
      console.error(
        `[Customer Care Worker] Auto-close failed for ticket ${ticket.id}:`,
        error
      );
    }
  }

  return processed;
}


// ============================================================
// RUN ONE WORKER CYCLE
// ============================================================

async function runSupportTimeoutWorker() {
  if (workerRunning) {
    console.log(
      '[Customer Care Worker] Previous cycle is still running. Skipping.'
    );

    return;
  }

  workerRunning = true;

  try {
    const reminderCount =
      await processReminders();

    const autoClosedCount =
      await processAutoClosures();

    if (
      reminderCount > 0 ||
      autoClosedCount > 0
    ) {
      console.log(
        `[Customer Care Worker] Cycle complete. Reminders: ${reminderCount}. Auto-closed: ${autoClosedCount}.`
      );
    }
  } catch (error) {
    console.error(
      '[Customer Care Worker] Worker cycle error:',
      error
    );
  } finally {
    workerRunning = false;
  }
}


// ============================================================
// START WORKER
// ============================================================

function startSupportTimeoutWorker() {
  if (workerTimer) {
    console.log(
      '[Customer Care Worker] Worker is already running.'
    );

    return;
  }

  console.log(
    `[Customer Care Worker] Starting timeout worker. Interval: ${WORKER_INTERVAL_MS}ms`
  );

  // Run once shortly after the server starts.
  setTimeout(() => {
    runSupportTimeoutWorker().catch(
      (error) => {
        console.error(
          '[Customer Care Worker] Initial cycle error:',
          error
        );
      }
    );
  }, 5000);

  // Continue running periodically.
  workerTimer = setInterval(() => {
    runSupportTimeoutWorker().catch(
      (error) => {
        console.error(
          '[Customer Care Worker] Scheduled cycle error:',
          error
        );
      }
    );
  }, WORKER_INTERVAL_MS);
}


// ============================================================
// STOP WORKER
// ============================================================

function stopSupportTimeoutWorker() {
  if (!workerTimer) {
    return;
  }

  clearInterval(workerTimer);

  workerTimer = null;

  console.log(
    '[Customer Care Worker] Timeout worker stopped.'
  );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  startSupportTimeoutWorker,
  stopSupportTimeoutWorker,
  runSupportTimeoutWorker,
};
