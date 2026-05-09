const { client } = require('../config/database');
const { calculateTimeDifference, splitToken } = require('../utils/helpers');

async function getDepartmentByKioskAndKey(kioskId, key) {
  const result = await client.query(
    'SELECT * FROM departments WHERE kiosk_id = $1 AND kiosk_key = $2',
    [kioskId, key]
  );
  return result.rows[0];
}

async function getDailyTokenCount(kioskId, department, date) {
  const result = await client.query(
    'SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3',
    [kioskId, department, date]
  );
  return result.rows[0];
}

async function getTokenReport() {
  const result = await client.query('SELECT * FROM tokenreport');
  return result.rows[0];
}

async function updateDailyTokenCount(kioskId, department, date, newCount) {
  await client.query(
    `UPDATE dailytokencount SET date = $1, token_total_count = $2, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $3 AND dep = $4 AND date = $5`,
    [date, newCount, kioskId, department, date]
  );
}

async function insertDailyTokenCount(kioskId, department, date) {
  await client.query(
    `INSERT INTO dailytokencount (kiosk_id, dep, date, token_current_count, token_total_count, token_skip_count, updated_at, recallstatus, recallno, reassign_token) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)`,
    [kioskId, department, date, 0, 1, 0, 0, 0, 0]
  );
}

async function insertTokenLog(data) {
  await client.query(
    `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance, generated_time, priority, info) VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13) RETURNING *`,
    [
      data.userId,
      data.tokenId,
      null,
      null,
      null,
      true,
      null,
      data.dep,
      data.kioskId,
      0,
      null,
      data.priority,
      data.info,
    ]
  );
}

async function getTotalTokenCount(date) {
  const result = await client.query(
    'SELECT token_total_count FROM dailytokencount WHERE date = $1',
    [date]
  );
  return result.rows.length > 0 ? result.rows[0].token_total_count : 0;
}

// THE MASSIVE LEGACY LOGIC EXACTLY AS BEFORE
async function processStoreTokenLogic(data) {
  const {
    tokenNumber,
    callTime,
    endTime,
    ackTime,
    acknowledged,
    userId,
    department,
    kioskId,
    counter,
    currDt,
    prefix,
  } = data;
  let returnLog = null;
  let finalAckTime = ackTime;
  let occurance;

  const result7 = await client.query(
    `SELECT * FROM departments WHERE department= $1`,
    [department]
  );
  const data2 = result7.rows[0];

  if (prefix !== data2.dep) {
    const result9 = await client.query(
      `SELECT * FROM token_logs WHERE token_id = $1 AND reassign_dep= $2 AND DATE(call_time) = $3`,
      [tokenNumber, department, currDt]
    );
    const data3_M = result9.rows[0];

    if (data3_M && data3_M.log_id) {
      const Previous_time = data3_M.time_interval;

      const updateToken2 = `
      UPDATE token_logs SET call_time = $1, end_time = $2, ack_time = $3, ack_status = $4,
      time_interval = CASE WHEN $4 = true THEN CASE WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp) ELSE (time_interval::interval + ($2::timestamp - $3::timestamp)) END ELSE CASE WHEN time_interval IS NOT NULL THEN time_interval ELSE NULL END END,
      occurance = CASE WHEN $4 = true THEN COALESCE(occurance, 0) + 1 ELSE occurance END, reassign_active = false
      WHERE log_id = $5 RETURNING *;`;

      await client.query(updateToken2, [
        new Date(callTime),
        new Date(endTime),
        finalAckTime ? new Date(finalAckTime) : null,
        acknowledged,
        data3_M.log_id,
      ]);

      const result10 = await client.query(
        `SELECT * FROM token_logs WHERE token_id = $1 AND reassign_dep= $2 AND DATE(call_time) = $3`,
        [tokenNumber, department, currDt]
      );
      const data3_N = result10.rows[0];
      const Curr_time = data3_N.time_interval;

      const timeDifference = calculateTimeDifference(
        Previous_time || { seconds: 0 },
        Curr_time || { seconds: 0 }
      );
      const intervalString = `${timeDifference.seconds} seconds ${timeDifference.milliseconds} milliseconds`;

      await client.query(
        `UPDATE reassignedTokenData SET time_taken = $1, occurance_index = $2 WHERE token_id = $3 AND dep_origin = $4 AND dep_to = $5 RETURNING *;`,
        [
          intervalString,
          data3_N.occurance,
          data3_N.token_id,
          data3_N.dep,
          department,
        ]
      );
    }
  } else {
    const result = await client.query(
      `SELECT * FROM token_logs WHERE token_id = $1 AND user_id = $2 AND dep = $3 AND DATE(call_time) = $4`,
      [tokenNumber, userId, department, currDt]
    );
    const data_token = result.rows[0];

    const result3 = await client.query(
      `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2 AND dep = $3`,
      [kioskId, currDt, department]
    );
    const data_daily = result3.rows[0];

    if (result.rows && result.rows.length > 0) {
      const skipIncrementNeeded =
        !acknowledged && data_token.ack_status && data_token.occurance === 0;
      const skipDecrementNeeded = acknowledged && !data_token.ack_status;
      let skip_int = false;
      let new_skip;

      if (skipIncrementNeeded) {
        new_skip = data_daily.token_skip_count + 1;
      } else if (skipDecrementNeeded) {
        new_skip = data_daily.token_skip_count - 1;
      } else if (
        acknowledged &&
        data_token.ack_status &&
        data_token.occurance > 0
      ) {
        new_skip = data_daily.token_skip_count;
      } else if (
        acknowledged &&
        data_token.ack_status &&
        data_token.occurance === 0
      ) {
        new_skip = data_daily.token_skip_count;
      } else {
        new_skip = data_daily.token_skip_count;
        skip_int = true;
      }

      if (!skip_int) {
        await client.query(
          `UPDATE dailytokencount SET recallstatus = $1, token_skip_count = $2, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $3 AND dep = $4 AND date = $5;`,
          ['0', new_skip, kioskId, department, currDt]
        );

        const updateToken = `
        UPDATE token_logs SET call_time = $1, end_time = $2, ack_time = $3, ack_status = $4,
        time_interval = CASE WHEN $4 = true THEN CASE WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp) ELSE (time_interval::interval + ($2::timestamp - $3::timestamp)) END ELSE CASE WHEN time_interval IS NOT NULL THEN time_interval ELSE NULL END END,
        occurance = CASE WHEN $4 = true THEN COALESCE(occurance, 0) + 1 ELSE occurance END
        WHERE kiosk_id = $5 AND dep = $6 AND token_id = $7 AND user_id = $8 AND DATE(call_time) = $9 RETURNING *;`;

        const resToken = await client.query(updateToken, [
          new Date(callTime),
          new Date(endTime),
          finalAckTime ? new Date(finalAckTime) : null,
          acknowledged,
          kioskId,
          department,
          tokenNumber,
          userId,
          currDt,
        ]);
        returnLog = resToken.rows[0];
      }
    } else {
      if (!acknowledged) {
        finalAckTime = null;
        occurance = 0;
      } else {
        occurance = 1;
      }

      const timeInterval = finalAckTime
        ? `age(timestamp '${endTime}', timestamp '${finalAckTime}')`
        : null;
      const resToken = await client.query(
        `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance) VALUES ($1, $2, $3, $4, $5, $6, ${timeInterval}, $7, $8, $9) RETURNING *`,
        [
          userId,
          tokenNumber,
          new Date(callTime),
          new Date(endTime),
          finalAckTime ? new Date(finalAckTime) : null,
          acknowledged,
          department,
          kioskId,
          occurance,
        ]
      );
      returnLog = resToken.rows[0];

      let new_skip = !acknowledged
        ? data_daily.token_skip_count + 1
        : data_daily.token_skip_count;
      await client.query(
        `UPDATE dailytokencount SET token_current_count = $1, token_skip_count = $2, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $3 AND dep = $4 AND date = $5;`,
        [tokenNumber, new_skip, kioskId, department, currDt]
      );
    }
  }
  return returnLog;
}

// Display & Reassign Helpers
async function getCounterDisplay(counter) {
  const result = await client.query(
    'SELECT * FROM counterdisplay WHERE counter = $1',
    [counter]
  );
  return result.rows[0];
}

async function getTokenLogById(tokenId, department, date) {
  const result = await client.query(
    'SELECT * FROM token_logs WHERE token_id = $1 AND dep = $2 AND DATE(call_time) = $3',
    [tokenId, department, date]
  );
  return result.rows[0];
}

async function updateDisplayTokensDaily(
  tokenNumber2,
  userId,
  department,
  kioskId,
  currDt,
  final_new_count
) {
  const resultcheck = await client.query(
    `SELECT * FROM token_logs WHERE token_id = $1 AND ((user_id = $2 AND dep = $3) OR reassign_dep = $3) AND DATE(call_time) = $4`,
    [tokenNumber2, userId, department, currDt]
  );
  const result3 = await client.query(
    `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2 AND dep = $3`,
    [kioskId, currDt, department]
  );
  const data_daily = result3.rows[0];

  if (resultcheck.rows && resultcheck.rows.length > 0) {
    const result7 = await client.query(
      `SELECT * FROM departments WHERE department= $1`,
      [department]
    );
    const data2 = result7.rows[0];
    const { prefix } = splitToken(final_new_count);

    if (
      prefix !== data2.dep ||
      (prefix === data2.dep && data_daily.reassign_token > 0)
    ) {
      const reassign_val = parseInt(data_daily.reassign_token) - 1;
      if (reassign_val > -1) {
        await client.query(
          `UPDATE dailytokencount SET reassign_token = $1 WHERE kiosk_id = $2 AND date = $3 AND dep = $4`,
          [reassign_val, kioskId, currDt, department]
        );
      }
    } else {
      await client.query(
        `UPDATE dailytokencount SET token_current_count = $1, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $2 AND dep = $3 AND date = $4 AND ABS(token_current_count - $1) = 1;`,
        [tokenNumber2, kioskId, department, currDt]
      );
    }
  } else {
    const selectResult = await client.query(
      `SELECT * FROM token_logs WHERE token_id = $1 AND dep = $2 AND DATE(call_time) = $3`,
      [tokenNumber2, department, currDt]
    );
    if (selectResult.rows.length > 0) {
      await client.query(
        `UPDATE token_logs SET user_id = $1, call_time = CURRENT_TIMESTAMP WHERE token_id = $2 AND dep = $3 AND DATE(call_time) = $4`,
        [userId, tokenNumber2, department, currDt]
      );
    } else {
      await client.query(
        `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance) VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10) RETURNING *`,
        [
          userId,
          tokenNumber2,
          null,
          null,
          null,
          true,
          null,
          department,
          kioskId,
          0,
        ]
      );
    }
    await client.query(
      `UPDATE dailytokencount SET token_current_count = $1, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $2 AND dep = $3 AND date = $4 AND ABS(token_current_count - $1) = 1;`,
      [tokenNumber2, kioskId, department, currDt]
    );
  }
}

async function updateRecallStatus(kioskId, department, date, tokenNumber) {
  await client.query(
    `UPDATE dailytokencount SET recallstatus = $1, recallno = $2, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $3 AND dep = $4 AND date = $5`,
    ['1', tokenNumber, kioskId, department, date]
  );
}

async function processReassignToken(data) {
  const {
    tokenId,
    logId,
    departmentTo,
    departmentFrom,
    userId,
    kioskId,
    currDt,
  } = data;

  const result6 = await client.query(
    `SELECT * FROM token_logs WHERE log_id = $1`,
    [logId]
  );
  const check_data = result6.rows[0];

  const resultCheck = await client.query(
    `SELECT * FROM reassignedTokenData WHERE dep_origin = $1 AND date = $2 AND occurance_index =$3 AND token_id= $4`,
    [check_data.dep, currDt, 1, tokenId]
  );

  if (resultCheck.rows.length === 0) {
    await client.query(
      `INSERT INTO reassignedTokenData (log_id, token_id, user_id, dep_origin, dep_from, dep_to, date, occurance_index, time_taken) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        logId,
        tokenId,
        userId,
        check_data.dep,
        departmentFrom,
        check_data.dep,
        currDt,
        1,
        check_data.time_interval,
      ]
    );
  }

  await client.query(
    `INSERT INTO reassignedTokenData (log_id, token_id, user_id, dep_origin, dep_from, dep_to, date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      logId,
      tokenId,
      userId,
      check_data.dep,
      departmentFrom,
      departmentTo,
      currDt,
    ]
  );

  await client.query(
    'UPDATE token_logs SET reassign_active = $1, reassign_dep = $2 WHERE log_id = $3 AND token_id = $4',
    [true, departmentTo, logId, tokenId]
  );

  const result2 = await client.query(
    `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3;`,
    [kioskId, departmentTo, currDt]
  );
  let reassign_val = 1;
  if (result2.rows.length > 0) {
    const check = result2.rows[0];
    if (
      check.reassign_token !== null &&
      !isNaN(check.reassign_token) &&
      check.reassign_token >= 1
    ) {
      reassign_val = parseInt(check.reassign_token) + 1;
    }
  }

  await client.query(
    `UPDATE dailytokencount SET reassign_token = $1, updated_at = CURRENT_TIMESTAMP WHERE kiosk_id = $2 AND dep = $3 AND date = $4;`,
    [reassign_val, kioskId, departmentTo, currDt]
  );
}

module.exports = {
  getDepartmentByKioskAndKey,
  getDailyTokenCount,
  getTokenReport,
  updateDailyTokenCount,
  insertDailyTokenCount,
  insertTokenLog,
  getTotalTokenCount,
  processStoreTokenLogic,
  getCounterDisplay,
  getTokenLogById,
  updateDisplayTokensDaily,
  updateRecallStatus,
  processReassignToken,
};
