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
// PURPOSE
//
// Automatically manages Customer Care cases that are waiting
// for a customer response.
//
// WORKFLOW
//
// Agent asks customer for information
//              ↓
//       Waiting for Customer
//              ↓
//          12 hours
//              ↓
//       Automatic Reminder
//              ↓
//          24 hours
//              ↓
//       Automatic Closure
//
// IMPORTANT
//
// This worker does NOT close cases simply because an agent
// has not responded.
//
// It only processes tickets that are explicitly waiting for
// a customer response.
//
// Customer replies reset the waiting timers through the
// support service.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

// How often the worker checks the database.
//
// Default:
// 5 minutes = 300000 milliseconds
//
const WORKER_INTERVAL_MS = Number(
  process.env.SUPPORT_TIMEOUT_WORKER_INTERVAL_MS ||
    5 * 60 * 1000
);


// How many hours before the customer receives an automatic
// reminder.
//
// Default:
// 12 hours
//
const REMINDER_HOURS = Number(
  process.env.SUPPORT_CUSTOMER_REMINDER_HOURS ||
    12
);


// ============================================================
// WORKER STATE
// ============================================================

let workerTimer = null;

let workerRunning = false;


// ============================================================
// FIND TICKETS THAT NEED A REMINDER
// ============================================================
//
// A ticket qualifies when:
//
// - status is pending
// - waiting_since exists
// - customer_response_due_at exists
// - reminder has not already been sent
// - reminder time has passed
// - final response deadline has not yet passed
//
// We intentionally do NOT select tickets that are already
// past the final response deadline here.
//
// Those are handled by the auto-close process.
// ============================================================

async function findTicketsForReminder() {
  const result = await pool.query(
    `
    SELECT
      id,
      waiting_since,
      reminder_sent_at,
      customer_response_due_at

    FROM support_tickets

    WHERE
      status = 'pending'

      AND waiting_since IS NOT NULL

      AND customer_response_due_at IS NOT NULL

      AND reminder_sent_at IS NULL

      AND waiting_since <=
        CURRENT_TIMESTAMP
        - ($1 * INTERVAL '1 hour')

      AND customer_response_due_at >
        CURRENT_TIMESTAMP

    ORDER BY waiting_since ASC

    LIMIT 100
    `,
    [REMINDER_HOURS]
  );

  return result.rows;
}


// ============================================================
// FIND TICKETS THAT ARE READY FOR AUTOMATIC CLOSURE
// ============================================================
//
// A ticket qualifies when:
//
// - status is pending
// - waiting_since exists
// - response deadline exists
// - response deadline has passed
//
// The autoCloseInactiveTicket service performs the final
// safety checks before closing the case.
// ============================================================

async function findTicketsForAutoClose() {
  const result = await pool.query(
    `
    SELECT
      id,
      waiting_since,
      reminder_sent_at,
      customer_response_due_at

    FROM support_tickets

    WHERE
      status = 'pending'

      AND waiting_since IS NOT NULL

      AND customer_response_due_at IS NOT NULL

      AND customer_response_due_at <=
        CURRENT_TIMESTAMP

    ORDER BY customer_response_due_at ASC

    LIMIT 100
    `
  );

  return result.rows;
}


// ============================================================
// PROCESS CUSTOMER REMINDERS
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
      // ------------------------------------------------------
      // SAFETY CHECK
      // ------------------------------------------------------
      //
      // If the customer has not received the reminder yet,
      // do NOT immediately close the ticket.
      //
      // Send the reminder first.
      //
      // This protects the customer if the worker was offline
      // during the reminder window.
      // ------------------------------------------------------

      if (!ticket.reminder_sent_at) {
        try {
          const reminderResult =
            await sendCustomerResponseReminder(
              ticket.id
            );

          if (reminderResult?.sent) {
            console.log(
              `[Customer Care Worker] Late reminder sent before closure for ticket ${ticket.id}`
            );
          }
        } catch (reminderError) {
          console.error(
            `[Customer Care Worker] Unable to send late reminder for ticket ${ticket.id}:`,
            reminderError
          );
        }

        // ----------------------------------------------------
        // Do not close during this same cycle.
        //
        // The customer must receive the reminder first.
        // ----------------------------------------------------

        continue;
      }


      // ------------------------------------------------------
      // FINAL AUTO-CLOSE
      // ------------------------------------------------------

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
  // ----------------------------------------------------------
  // PREVENT OVERLAPPING WORKER RUNS
  // ----------------------------------------------------------

  if (workerRunning) {
    console.log(
      '[Customer Care Worker] Previous cycle is still running. Skipping this cycle.'
    );

    return;
  }

  workerRunning = true;

  try {
    // --------------------------------------------------------
    // PROCESS REMINDERS FIRST
    // --------------------------------------------------------

    const reminderCount =
      await processReminders();


    // --------------------------------------------------------
    // PROCESS AUTOMATIC CLOSURES
    // --------------------------------------------------------

    const autoClosedCount =
      await processAutoClosures();


    // --------------------------------------------------------
    // LOG ONLY WHEN SOMETHING HAPPENED
    // --------------------------------------------------------

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
// START CUSTOMER CARE TIMEOUT WORKER
// ============================================================

function startSupportTimeoutWorker() {
  // ----------------------------------------------------------
  // PREVENT DUPLICATE WORKERS
  // ----------------------------------------------------------

  if (workerTimer) {
    console.log(
      '[Customer Care Worker] Worker is already running.'
    );

    return;
  }


  console.log(
    `[Customer Care Worker] Starting timeout worker. Interval: ${WORKER_INTERVAL_MS}ms`
  );


  // ----------------------------------------------------------
  // INITIAL CHECK
  // ----------------------------------------------------------
  //
  // Wait a few seconds after the server starts so that the
  // database and application are fully ready.
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // REPEATED CHECK
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // ALLOW NODE TO EXIT CLEANLY
  // ----------------------------------------------------------

  if (
    workerTimer &&
    typeof workerTimer.unref === 'function'
  ) {
    workerTimer.unref();
  }


  console.log(
    '[Customer Care Worker] Timeout worker is active.'
  );
}


// ============================================================
// STOP CUSTOMER CARE TIMEOUT WORKER
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
