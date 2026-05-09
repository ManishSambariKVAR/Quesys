const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { client, connectDatabase } = require('./database');
const bodyParser = require('body-parser');
const { log, Console } = require('console');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const notifier = require('node-notifier');
const https = require('https');
const cors = require('cors');
const app = express();

const DEFAULT_USER_ID = 'kvar';
const DEFAULT_PASSWORD = 'kvar';

// Initialize stacks as a Map
const stacks = new Map();

const CounterCurrentstacks = new Map();

const VoiceStacks = [];
// Declare balanceTokens as a global variable
let balanceTokens = 0;

function pushToVoiceStack(token) {
  // Add the token directly to the VoiceStacks array
  VoiceStacks.push(token);
}

function pushToStackCounter(grievance, token) {
  // Check if the stack for the grievance already exists
  if (!CounterCurrentstacks.has(grievance)) {
    CounterCurrentstacks.set(grievance, []); // Create a new stack if it doesn't exist
  } else {
    CounterCurrentstacks.set(grievance, []); // Clear the existing stack
  }

  // Add the token to the (now empty or newly created) stack
  CounterCurrentstacks.get(grievance).push(token);
}

function getAllCounterStack() {
  const allStacks = {};
  CounterCurrentstacks.forEach((value, key) => {
    allStacks[key] = value; // Add the grievance and its stack to the result
  });
  return allStacks;
}

function pushToStack(grievance, token) {
  if (!stacks.has(grievance)) {
    stacks.set(grievance, []); // Create a new stack if it doesn't exist
  }
  stacks.get(grievance).push(token); // Add the token to the stack
}

function popFromAnyStack(value) {
  // Normalize the input value by removing the asterisk (*) if present
  const normalizedValue = value.replace('*', '');

  // Iterate through each grievance and its stack in the Map
  for (const [grievance, stack] of stacks.entries()) {
    // Find the index of the token that matches the given value
    const index = stack.findIndex((token) => {
      // Ensure the token has a hyphen and a suffix
      if (typeof token === 'string' && token.includes('-')) {
        // Extract the part after the hyphen (e.g., "c001*" from "1-c001*")
        const [, suffix] = token.split('-');
        if (suffix) {
          return suffix.replace('*', '') === normalizedValue; // Compare ignoring the asterisk
        }
      }
      return false; // Return false if no suffix is present
    });

    if (index !== -1) {
      return stack.splice(index, 1)[0];
    }
  }
  return null;
}

function getAllStacks() {
  const allStacks = {};
  stacks.forEach((value, key) => {
    allStacks[key] = value;
  });
  return allStacks;
}

function getAllVoiceStacks() {
  return VoiceStacks; // Return the entire array of tokens
}

function checkAndPop() {
  const checkInterval = setInterval(() => {
    if (VoiceStacks.length > 0) {
      clearInterval(checkInterval); // Stop checking once an element is found
      console.log('Value found, starting the timer to pop.');

      // Start a 10-second timer to pop the first element
      setTimeout(() => {
        const poppedElement = VoiceStacks.shift(); // Pop and remove the first element
        console.log('Popped Element:', poppedElement);
        // After popping, continue checking again
        checkAndPop();
      }, 10000); // 10-second delay before popping
    } else {
      //console.log("No value in the array, checking again in 1 second.");
    }
  }, 1000); // Check every second
}
checkAndPop();

// Enable CORS for any origin: For Software KIOSK
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.endsWith(':7000') ||
        origin.endsWith(':4004') ||
        origin.endsWith(':5005') ||
        origin.endsWith(':2000') ||
        origin.endsWith(':2001') ||
        origin.endsWith(':5004')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// Middleware to prevent page caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const options = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem'),
};

const server = https.createServer(options, app);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'templates'));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'KVAR', resave: false, saveUninitialized: false }));

app.use(express.json());
app.use(bodyParser.json());

app.set('view engine', 'ejs');

connectDatabase().catch((err) => {
  console.error('Exiting application due to database connection error');
  process.exit(1);
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/uploads/');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname
    );
  },
});

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/otaForTV/');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname
    );
  },
});

const upload = multer({ storage: storage });
const upload2 = multer({ storage2: storage2 });

function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

function generateSerialNumber() {
  // Generate a random 4-digit number
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  // Concatenate the prefix "KVAR" with the random number
  const serialNumber = `KVAR${randomNumber}`;
  return serialNumber;
}

function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');

  // Format: YYYY-MM-DD
  const formattedDate = `${year}-${month}-${day}`;

  return formattedDate;
}

function calculateTimeDifference(prevInterval, currentInterval) {
  // Convert intervals to milliseconds
  const prevMilliseconds =
    prevInterval.seconds * 1000 + (prevInterval.milliseconds || 0);
  const currentMilliseconds =
    currentInterval.seconds * 1000 + (currentInterval.milliseconds || 0);

  // Calculate the difference in milliseconds
  const diffMilliseconds = currentMilliseconds - prevMilliseconds;

  // Convert the difference back to seconds and milliseconds
  const diffSeconds = Math.floor(diffMilliseconds / 1000);
  const remainingMilliseconds = diffMilliseconds % 1000;

  return {
    seconds: diffSeconds,
    milliseconds: remainingMilliseconds,
  };
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function ensureDirectoryExistence(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function getFileContentsSync(filename, main) {
  try {
    const directoryPath = path.join(__dirname, main);
    const fullPath = path.join(directoryPath, filename);
    // Synchronously read the file contents
    let fileContents = fs.readFileSync(fullPath, 'utf8');
    // Remove newline characters
    fileContents = fileContents.replace(/\n/g, '');
    return fileContents;
  } catch (err) {
    // If an error occurs, throw the error
    throw err;
  }
}

function replaceSpecialForDate(inputString) {
  // Regular expression to find all occurrences of {{ ... }}
  const regex = /\{\{([^}]+)\}\}/g;
  // Replace all occurrences of {{ ... }}
  const replacedString = inputString.replace(regex, (match, value) => {
    // Check if the value is a hexadecimal code
    if (value.match(/^[0-9A-Fa-f]+$/)) {
      // Convert hexadecimal code to ASCII character
      const asciiChar = String.fromCharCode(parseInt(value, 16));
      return asciiChar;
    }
    // Switch case for other special values
    switch (value) {
      case 'DD/MM/YYYY':
        // Replace {{DD/MM/YYYY}} with current date formatted as DD/MM/YYYY
        const currentDateYYYY = new Date()
          .toISOString()
          .slice(0, 10)
          .split('-')
          .reverse()
          .join('/');
        return currentDateYYYY;
      case 'DD/MM/YY':
        // Replace {{DD/MM/YY}} with current date formatted as DD/MM/YY
        const currentDateYY = new Date()
          .toLocaleDateString('en-GB')
          .slice(0, 8)
          .split('/')
          .reverse()
          .join('/');
        return currentDateYY;
      case 'YYYY/MM/DD':
        // Replace {{YYYY/MM/DD}} with current date formatted as YYYY/MM/DD
        const currentDateYYYYMMDD = new Date().toISOString().slice(0, 10);
        return currentDateYYYYMMDD;
      case 'YY/MM/DD':
        // Replace {{YY/MM/DD}} with current date formatted as YY/MM/DD
        const currentDateYYMMDD = new Date().toISOString().slice(2, 10);
        return currentDateYYMMDD;
      case 'HH:MM':
        // Replace {{HH:MM}} with current time formatted as HH:MM
        const currentTimeHHMM = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return currentTimeHHMM;
      case 'HH:MM:SS':
        // Replace {{HH:MM:SS}} with current time formatted as HH:MM:SS
        const currentTimeHHMMSS = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return currentTimeHHMMSS;
      default:
        return '{{' + value + '}}';
    }
  });
  return replacedString;
}

function replaceSpecialForToken(inputString, tokenNo) {
  // Regular expression to find all occurrences of {{ ... }}
  const regex = /\{\{([^}]+)\}\}/g;
  // Replace all occurrences of {{ ... }}
  const replacedString = inputString.replace(regex, (match, value) => {
    console.log('Token: in functb :');
    // Switch case for special values
    console.log(value);
    switch (value) {
      case 'TOKEN':
        // Replace {{HH:MM:SS}} with current time formatted as HH:MM:SS
        return tokenNo;
      default:
        return '{{' + value + '}}';
    }
  });
  return replacedString;
}

function replaceSpecialForSummary(inputString, data) {
  // Regular expression to find all occurrences of {{ ... }}
  const regex = /\{\{([^}]+)\}\}/g;
  // Replace all occurrences of {{ ... }}
  const replacedString = inputString.replace(regex, (match, value) => {
    // If placeholder is TotalAll, calculate total token_total_count
    if (value === 'TotalAll') {
      const total = data.reduce((sum, item) => sum + item.token_total_count, 0);
      console.log('Total Token:');
      console.log(total);
      return total;
    }
    // Split the value by comma to get department and field
    const [findDep, replaceValue] = value.split(',').map((v) => v.trim());
    // Find the department in the data array
    const foundData = data.find((item) => item.dep === findDep);
    // If department not found, return the original match
    if (!foundData) return match;
    // If replaceValue is 'Name', replace with department name
    if (replaceValue === 'Name') {
      return foundData.dep;
    }
    // If replaceValue is 'total', replace with token_total_count
    if (replaceValue === 'total') {
      return foundData.token_total_count;
    }
    // Add more cases as needed for other fields
    // If field not recognized, return the original match
    return match;
  });
  return replacedString;
}

function addLinefeed(inputString) {
  return inputString.replace(/\n/g, '<LF>');
}

function findAvailableCounters(allCounters, allUsers) {
  const usedCounters = allUsers.map((user) => user.counter);
  console.log('Used counters', usedCounters);

  // Check if 'undefined' exists in usedCounters
  if (usedCounters.includes('undefined')) {
    console.error(
      'Error: Some users have an undefined counter. Please check the data.'
    );
    return {
      availableCounters: [],
      error: 'Some users have an undefined counter. Please check the data.',
    };
  }

  const availableCounters = allCounters.filter(
    (counter) => !usedCounters.includes(counter.counter.toString())
  );
  return { availableCounters, error: '' };
}

function padNumberWithZeros(num, size) {
  let numStr = num.toString();
  while (numStr.length < size) {
    numStr = '0' + numStr;
  }
  return numStr;
}

// Example usage

app.get('/', async (req, res) => {
  const check = false;

  const currDt = getCurrentDate();
  const updateQuery = `
    SELECT * FROM userlogs WHERE datetime = $1 AND log = 1;
  `;

  const values = [currDt];
  const data_user_counter = await client.query(updateQuery, values);

  const update = `
    SELECT * FROM counterdisplay;
  `;
  const data_all_counter = await client.query(update);

  console.log('Used counters:', data_user_counter.rows);
  console.log('All counters:', data_all_counter.rows);

  const { availableCounters, error } = findAvailableCounters(
    data_all_counter.rows,
    data_user_counter.rows
  );

  res.render('login', { datas: availableCounters, error, check });
});

app.post('/login', async (req, res) => {
  console.log('====================================');
  console.log('🔐 LOGIN REQUEST RECEIVED');
  console.log('Time:', new Date().toISOString());

  try {
    const { userId, password, counter } = req.body;

    console.log('📥 BODY :', req.body);
    console.log('👤 UserID :', userId);
    console.log('🖥️ Counter :', counter);

    // Load counters list
    console.log('📡 Fetching counterdisplay list...');
    const queryText = 'SELECT * FROM counterdisplay';
    const data_temp = await client.query(queryText);
    const datas = data_temp.rows;
    console.log('✅ Counter list count:', datas.length);

    // Root admin check
    console.log('🛂 Checking root admin credentials...');
    if (userId === DEFAULT_USER_ID && password === DEFAULT_PASSWORD) {
      console.log('👑 ROOT ADMIN LOGIN SUCCESS');

      req.session.user = {
        id: '000',
        name: 'kvar',
        userId: '000',
        adminLevel: 'Admin',
        department: '',
        counter: '',
      };

      console.log('➡️ Redirecting to /admin');
      return res.redirect(
        `/admin?userId=000&userName=kvar&userDepartment=kvar`
      );
    }

    // Fetch user
    console.log('🔍 Searching user in DB...');
    const userRes = await client.query(
      'SELECT * FROM users WHERE userId = $1',
      [userId]
    );

    console.log('📦 User rows found:', userRes.rows.length);

    if (userRes.rows.length !== 1) {
      console.log('❌ User not found');
      throw new Error('User not found');
    }

    const user = userRes.rows[0];
    console.log('✅ User record:', user);

    // Compare password
    console.log('🔐 Comparing password...');
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match result:', isPasswordMatch);

    if (!isPasswordMatch) {
      console.log('❌ Password incorrect');
      throw new Error('Invalid password');
    }

    // Admin user
    if (user.adminlevel === 'Admin') {
      console.log('🛠️ Admin login detected');

      req.session.user = {
        id: userId,
        name: user.name,
        userId: userId,
        adminLevel: user.adminlevel,
        department: user.userdept,
        counter: '',
      };

      console.log('➡️ Redirecting admin to /admin');
      return res.redirect(
        `/admin?userId=${userId}&userName=${user.name}&userDepartment=${user.userdept}`
      );
    }

    // Normal user
    console.log('👨‍💼 Normal user login flow');

    console.log('🏢 Fetching department:', user.userdept);
    const depRes = await client.query(
      'SELECT * FROM departments WHERE department = $1',
      [user.userdept]
    );

    console.log('📦 Department rows:', depRes.rows.length);

    const kioskID_2 = depRes.rows[0];
    console.log('🖥️ Kiosk data:', kioskID_2);

    if (!kioskID_2) {
      console.log('❌ No kiosk mapped to department');

      return res.render('login', {
        datas,
        error: 'Wrong Counter',
        check: true,
      });
    }

    if (!counter) {
      console.log('❌ Counter not selected');

      return res.render('login', {
        datas,
        error: 'Counter is undefined. Please select a valid counter.',
        check: true,
      });
    }

    // Create session
    req.session.user = {
      id: userId,
      name: user.name,
      userId: userId,
      adminLevel: user.adminlevel,
      department: user.userdept,
      counter: counter,
      kioskId: kioskID_2.kiosk_id,
    };

    console.log('✅ Session created:', req.session.user);

    console.log('➡️ Redirecting to dashboard...');
    return res.redirect(
      `/dashboard?userId=${userId}&userName=${user.name}&userDepartment=${user.userdept}&counter=${counter}&kioskId=${kioskID_2.kiosk_id}`
    );
  } catch (err) {
    console.error('🔥 LOGIN ERROR:', err.message);
    console.error(err.stack);

    const queryText = 'SELECT * FROM counterdisplay';
    const data_temp = await client.query(queryText);
    const datas = data_temp.rows;

    return res.render('login', {
      datas,
      error: 'Invalid credentials. Please try again.',
      check: true,
    });
  }
});

app.get('/kioskSummary', async (req, res) => {
  try {
    const KioskId = req.query.kioskId;
    console.log(KioskId);
    const currDt = getCurrentDate();
    const queryText2 =
      'SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2';

    const result2 = await client.query(queryText2, [KioskId, currDt]);

    const data = result2.rows;

    const check1 = 'SELECT * FROM summaryreport';
    const checkR1 = await client.query(check1);

    const data_got = checkR1.rows[0];
    const main = '/src/uploads/printerReport/';

    var file_got = getFileContentsSync(data_got.uploadlink, main);

    var file_got1 = replaceSpecialForDate(file_got);

    const replacedString = replaceSpecialForSummary(file_got1, data);

    res.set('Content-Type', 'text/plain').send(`Print:${replacedString}`);
  } catch (error) {
    console.error('Error occurred while processing kioskSummary:', error);
    res.status(500).send('Internal Server Error');
  }
});

var TokenType = 0;
//   console.log("Keypad Request Received");
//   const key = req.query.key;
//   console.log("Received key:", key);

//   const recdCounter = req.query.counter;
//   console.log("Recieved Counter :" , recdCounter);

//   const KioskId = req.query.kioskId;
//   console.log("Received KioskId:", KioskId);

//   const Priority = req.query.priority;
//   console.log("Received Priority:", Priority);

//   const Grevience = req.query.grevience;
//   console.log("Received Grevience:", Grevience);

//   const Temp_tokentype = req.query.tokenType;
//   console.log("Received Temp_tokentype:", Temp_tokentype);

//   var receivedString = req.query.info ?? null;
//   console.log("Initial receivedString:", receivedString);

//   if (receivedString !== null) {
//     receivedString = receivedString.replace(/'/g, '"');
//     console.log(
//       "Transformed receivedString (single quotes replaced):",
//       receivedString
//     );
//   }

//   const Info = JSON.parse(receivedString);
//   TokenType = Temp_tokentype;
//   console.log("Type of Token:", TokenType);

//   console.log("KIOSK Data IN:", key, KioskId, Priority, Grevience, Info);

//   const queryText =
//     "SELECT * FROM departments WHERE kiosk_id = $1 AND kiosk_key = $2";
//   const result = await client.query(queryText, [KioskId, key]);

//   const extracted = result.rows[0];
//   if (result.rows && result.rows.length > 0) {
//     console.log("Key Department relation found");
//     const currDt = getCurrentDate();
//     const queryText2 =
//       "SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3";

//     const result2 = await client.query(queryText2, [
//       KioskId,
//       extracted.department,
//       currDt,
//     ]);

//     console.log("Daily Token Count:");
//     console.log(result2.rows);
//     const extracted2 = result2.rows[0];

//     const check1 = "SELECT * FROM tokenreport";
//     const checkR1 = await client.query(check1);

//     const data_got = checkR1.rows[0];
//     const main = "/src/uploads/printerReport/";

//     var file_got = getFileContentsSync(data_got.uploadlink, main);

//     //Add token

//     if (result2.rows && result2.rows.length > 0) {
//       console.log("Update Query");
//       const newCount = extracted2.token_total_count + 1;
//       console.log("Value:", newCount);

//       console.log("Add to token logs");
//       const result = await client.query(
//         `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance,generated_time,priority,info)
//         VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13) RETURNING *`,
//         [
//           0,
//           newCount,
//           null,
//           null,
//           null,
//           true,
//           null,
//           extracted.department,
//           KioskId,
//           0,
//           null,
//           Priority,
//           Info,
//         ]
//       );

//       const updateQuery = `
//           UPDATE dailytokencount
//           SET
//               date = $1,
//               token_total_count = $2,
//               updated_at = CURRENT_TIMESTAMP
//           WHERE
//               kiosk_id = $3 AND dep = $4 AND date = $5;`;

//       try {
//         await client.query(updateQuery, [
//           currDt,
//           newCount,
//           KioskId,
//           extracted.department,
//           currDt,
//         ]);
//         console.log("Values updated successfully in dailytokencount table.");

//         // Send a Windows notification
//         // notifier.notify({
//         //   title: 'Token Count Updated',
//         //   message: `New token count for ${extracted.department}: ${newCount}`
//         // });

//         const file_got1 = replaceSpecialForDate(file_got);
//         const final_new_count = padNumberWithZeros(newCount, 3); // initial number of 0
//         const replacedString = replaceSpecialForToken(
//           file_got1,
//           extracted.dep + final_new_count
//         );

//         console.log("Priority:", Priority);

//         if (Priority === "True") {
//           pushToStack(
//             extracted.department + "-"+ recdCounter,
//             TokenType + "-" + extracted.dep + final_new_count +"*"  // +recdCounter
//           );
//           // pushToVoiceStack(extracted.department,
//           //   TokenType + "-" + extracted.dep + final_new_count + "*");
//         } else {
//           pushToStack(
//             extracted.department +"-"+ recdCounter,
//             TokenType + "-" + extracted.dep + final_new_count // +recdCounter
//           );
//           // pushToVoiceStack(extracted.department,
//           //   TokenType + "-" + extracted.dep + final_new_count);
//         }

//         res
//           .set("Content-Type", "text/plain")
//           .send(
//             `DEP: ${extracted.department} , CurrToken:${extracted.dep}${final_new_count} , Print:${replacedString}`
//           );
//       } catch (error) {
//         console.error("Error updating values in dailytokencount table:", error);
//       }
//     } else {
//       console.log("Add Query");
//       // Empty both maps
//       stacks.clear();
//       CounterCurrentstacks.clear();
//       console.log("Add to token logs");

//       const result = await client.query(
//         `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance,generated_time,priority,info)
//       VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13) RETURNING *`,
//         [
//           0,
//           1,
//           null, // call_time
//           null, // end_time
//           null, // ack_time
//           true,
//           null, // time_interval
//           extracted.department,
//           KioskId,
//           0, // occurance
//           null,
//           Priority,
//           Info,
//         ]
//       );
//       //For Priority
//       const newCount = 1;
//       const file_got1 = replaceSpecialForDate(file_got);
//       const final_new_count = padNumberWithZeros(newCount, 3); // initial number of 0
//       if (Priority === "True") {
//         pushToStack(
//           extracted.department,
//           TokenType + "-" + extracted.dep + final_new_count + "*"
//         );
//       } else {
//         pushToStack(
//           extracted.department,
//           TokenType + "-" + extracted.dep + final_new_count
//         );
//       }

//       const insertQuery =
//         "INSERT INTO dailytokencount (kiosk_id, dep, date, token_current_count, token_total_count, token_skip_count, updated_at, recallstatus, recallno, reassign_token) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)";
//       try {
//         await client.query(insertQuery, [
//           KioskId,
//           extracted.department,
//           currDt,
//           0,
//           1,
//           0,
//           0,
//           0,
//           0,
//         ]);
//         console.log("Values inserted successfully into dailytokencount table.");
//         const final_new_count = padNumberWithZeros(1, 3); // initial number of 0

//         const file_got1 = replaceSpecialForDate(file_got);
//         const replacedString = replaceSpecialForToken(
//           file_got1,
//           extracted.dep + final_new_count
//         );
//         res
//           .set("Content-Type", "text/plain")
//           .send(
//             `DEP: ${extracted.department} , CurrToken: ${extracted.dep}${final_new_count} , Print:${replacedString}`
//           );
//       } catch (error) {
//         console.error(
//           "Error inserting values into dailytokencount table:",
//           error
//         );
//       }
//     }
//   } else {
//     res.send("ERR");
//   }
// });

app.get('/keypad', async (req, res) => {
  console.log('Keypad Request Received');
  const key = req.query.key;
  console.log('Received key:', key);

  const recdCounter = req.query.counter;
  console.log('Recieved Counter :', recdCounter);

  const KioskId = req.query.kioskId;
  console.log('Received KioskId:', KioskId);

  const Priority = req.query.priority;
  console.log('Received Priority:', Priority);

  const Grevience = req.query.grevience;
  console.log('Received Grevience:', Grevience);

  const Temp_tokentype = req.query.tokenType;
  console.log('Received Temp_tokentype:', Temp_tokentype);

  var receivedString = req.query.info ?? null;
  console.log('Initial receivedString:', receivedString);

  if (receivedString !== null) {
    receivedString = receivedString.replace(/'/g, '"');
    console.log(
      'Transformed receivedString (single quotes replaced):',
      receivedString
    );
  }

  const Info = JSON.parse(receivedString);
  TokenType = Temp_tokentype;
  console.log('Type of Token:', TokenType);

  console.log('KIOSK Data IN:', key, KioskId, Priority, Grevience, Info);

  const queryText =
    'SELECT * FROM departments WHERE kiosk_id = $1 AND kiosk_key = $2';
  const result = await client.query(queryText, [KioskId, key]);

  const extracted = result.rows[0];
  if (result.rows && result.rows.length > 0) {
    console.log('Key Department relation found');
    const currDt = getCurrentDate();
    const queryText2 =
      'SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3';

    const result2 = await client.query(queryText2, [
      KioskId,
      extracted.department,
      currDt,
    ]);

    console.log('Daily Token Count:');
    console.log(result2.rows);
    const extracted2 = result2.rows[0];

    const check1 = 'SELECT * FROM tokenreport';
    const checkR1 = await client.query(check1);

    const data_got = checkR1.rows[0];
    const main = '/src/uploads/printerReport/';

    var file_got = getFileContentsSync(data_got.uploadlink, main);

    //Add token

    if (result2.rows && result2.rows.length > 0) {
      console.log('Update Query');
      const newCount = extracted2.token_total_count + 1;
      console.log('Value:', newCount);

      console.log('Add to token logs');
      const result = await client.query(
        `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance,generated_time,priority,info) 
        VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13) RETURNING *`,
        [
          0,
          newCount,
          null,
          null,
          null,
          true,
          null,
          extracted.department,
          KioskId,
          0,
          null,
          Priority,
          Info,
        ]
      );

      const updateQuery = `
          UPDATE dailytokencount 
          SET 
              date = $1,
              token_total_count = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE 
              kiosk_id = $3 AND dep = $4 AND date = $5;`;

      try {
        await client.query(updateQuery, [
          currDt,
          newCount,
          KioskId,
          extracted.department,
          currDt,
        ]);
        console.log('Values updated successfully in dailytokencount table.');

        // Send a Windows notification
        // notifier.notify({
        //   title: 'Token Count Updated',
        //   message: `New token count for ${extracted.department}: ${newCount}`
        // });

        const file_got1 = replaceSpecialForDate(file_got);
        const final_new_count = padNumberWithZeros(newCount, 3); // initial number of 0
        const replacedString = replaceSpecialForToken(
          file_got1,
          extracted.dep + final_new_count
        );

        console.log('Priority:', Priority);

        if (Priority === 'True') {
          pushToStack(
            extracted.department + '-' + recdCounter,
            TokenType + '-' + extracted.dep + final_new_count + '*' // +recdCounter
          );
          // pushToVoiceStack(extracted.department,
          //   TokenType + "-" + extracted.dep + final_new_count + "*");
        } else {
          pushToStack(
            extracted.department + '-' + recdCounter,
            TokenType + '-' + extracted.dep + final_new_count // +recdCounter
          );
          // pushToVoiceStack(extracted.department,
          //   TokenType + "-" + extracted.dep + final_new_count);
        }

        res
          .set('Content-Type', 'text/plain')
          .send(
            `DEP: ${extracted.department} , CurrToken:${extracted.dep}${final_new_count} , Print:${replacedString}`
          );
      } catch (error) {
        console.error('Error updating values in dailytokencount table:', error);
      }
    } else {
      console.log('Add Query');
      // Empty both maps
      stacks.clear();
      CounterCurrentstacks.clear();
      console.log('Add to token logs');

      const result = await client.query(
        `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance,generated_time,priority,info) 
      VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, COALESCE($11, CURRENT_TIMESTAMP), $12, $13) RETURNING *`,
        [
          0,
          1,
          null, // call_time
          null, // end_time
          null, // ack_time
          true,
          null, // time_interval
          extracted.department,
          KioskId,
          0, // occurance
          null,
          Priority,
          Info,
        ]
      );
      //For Priority
      const newCount = 1;
      const file_got1 = replaceSpecialForDate(file_got);
      const final_new_count = padNumberWithZeros(newCount, 3); // initial number of 0
      if (Priority === 'True') {
        pushToStack(
          extracted.department,
          TokenType + '-' + extracted.dep + final_new_count + '*'
        );
      } else {
        pushToStack(
          extracted.department,
          TokenType + '-' + extracted.dep + final_new_count
        );
      }

      const insertQuery =
        'INSERT INTO dailytokencount (kiosk_id, dep, date, token_current_count, token_total_count, token_skip_count, updated_at, recallstatus, recallno, reassign_token) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)';
      try {
        await client.query(insertQuery, [
          KioskId,
          extracted.department,
          currDt,
          0,
          1,
          0,
          0,
          0,
          0,
        ]);
        console.log('Values inserted successfully into dailytokencount table.');
        const final_new_count = padNumberWithZeros(1, 3); // initial number of 0

        const file_got1 = replaceSpecialForDate(file_got);
        const replacedString = replaceSpecialForToken(
          file_got1,
          extracted.dep + final_new_count
        );
        res
          .set('Content-Type', 'text/plain')
          .send(
            `DEP: ${extracted.department} , CurrToken: ${extracted.dep}${final_new_count} , Print:${replacedString}`
          );
      } catch (error) {
        console.error(
          'Error inserting values into dailytokencount table:',
          error
        );
      }
    }
  } else {
    res.send('ERR');
  }
});

app.get('/checkStack', async (req, res) => {
  try {
    const currDt = getCurrentDate();
    const stackAll = getAllStacks(); // Get all stacks
    const counterStack = getAllCounterStack(); // Get all counter stacks
    const voice = getAllVoiceStacks();
    const queryText1 =
      'SELECT token_total_count FROM dailytokencount WHERE date = $1 ';
    const result1 = await client.query(queryText1, [currDt]);
    // console.log("DATA RESULT ",result1.rows);
    const totalTokenResult = result1.rows;
    // console.log("DATA RESULT", totalTokenResult);

    // Extract the value of `token_total_count`
    const totalToken =
      totalTokenResult.length > 0 ? totalTokenResult[0].token_total_count : 0;

    // console.log("Total Token Count:", totalToken);

    // console.log(voice);
    // Send both stacks as separate objects in the response
    res.status(200).send({
      allStacks: stackAll,
      counterStacks: counterStack,
      voiceStack: voice,
      totalToken: totalToken,
    });
  } catch (error) {
    console.error('Error retrieving stacks:', error);
    res.status(500).send({ error: 'Internal Server Error' }); // Handle errors gracefully
  }
});

app.get('/KioskRegistration', async (req, res) => {
  try {
    const serialNumber = generateSerialNumber();
    //console.log(userRes);
    res.status(200).send(`Regi=${serialNumber}`);
  } catch (error) {
    console.error('Error occurred during Kiosk registration:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/KioskRegConfirm', async (req, res) => {
  try {
    const serialNumber = req.query.KioskId;
    //console.log(serialNumber);
    const userRes = await client.query(
      'INSERT INTO kioskRegistration (kiosk_id) VALUES ($1)',
      [serialNumber]
    );
    console.log('Register Sucess');
    res.status(200).send(`OK`);
  } catch (error) {
    console.error('Error occurred during Kiosk registration:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/register', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    const result = await client.query('SELECT * FROM departments');
    const departments = result.rows;
    const queryText = 'SELECT * FROM kioskRegistration';

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    // Execute the query
    const kiosks = await client.query(queryText);
    const companies = result4.rows;
    const companyName = companies[0]?.company_name;
    //console.log(kiosks.rows);

    res.render('adminUserReg', {
      departments: departments,
      user: userDetails,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.post('/register', async (req, res) => {
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  const { name, userId, password, confirmPassword, userDept, adminlevel } =
    req.body;

  if (
    !name ||
    !userId ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword
  ) {
    return res
      .status(400)
      .send('All fields are required, and passwords must match.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const insertQuery = `INSERT INTO users (name, userId, password, userDept, adminLevel) VALUES ($1, $2, $3, $4, $5)`;
    const values = [name, userId, hashedPassword, userDept, adminlevel];
    await client.query(insertQuery, values);
    res.redirect(
      `/viewUser?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}`
    );
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).send('User ID already exists.');
    }
    res.status(500).send('Server error during registration.');
  }
});

app.post('/updateUser', async (req, res) => {
  const { userId, name, userid, userDept, adminLevel } = req.body;
  //console.log(req.body.userId);
  //console.log(req.body.name);

  if (!userId || !name || !userid || !userDept || !adminLevel) {
    return res.status(400).send('All fields are required for an update.');
  }

  try {
    const updateQuery = `UPDATE users SET name = $1, userId = $2, userDept = $3, adminLevel = $4 WHERE id = $5`;
    const values = [name, userid, userDept, adminLevel, userId];
    await client.query(updateQuery, values);
    res.send('User updated successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error during user update.');
  }
});

app.get('/CompanyReg', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const queryText = 'SELECT * FROM companies ORDER BY id ASC LIMIT 1';

  // Execute the query
  const res2 = await client.query(queryText);

  // Fetch company name and logo
  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  var CompanyDetails;
  if (res2.rows.length <= 0) {
    CompanyDetails = {
      companyName: 'KVAR TECH',
    };
  } else {
    CompanyDetails = {
      companyName: res2.rows[0].company_name,
    };
  }
  res.render('adminCompanyReg', {
    user: userDetails,
    comapnyDetails: CompanyDetails,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/CompanyReg', upload.single('fileToUpload'), async (req, res) => {
  const companyName = req.body.companyName; // Ensure this matches your form's input name for company name
  const companyLogoPath = req.file.path;

  try {
    const queryText = 'SELECT * FROM companies ORDER BY id ASC LIMIT 1';

    const res2 = await client.query(queryText);
    if (res2.rows.length > 0) {
      console.log('First company:', res2.rows[0]);

      const updateQuery =
        'UPDATE companies SET company_name = $1, logo_path = $2 WHERE id = $3';

      const updateRes = await client.query(updateQuery, [
        companyName,
        companyLogoPath,
        res2.rows[0].id,
      ]);

      const targetPath = path.join(__dirname, '/src/uploads/companyLogo.png');
      ensureDirectoryExistence(targetPath); // Ensure directory exists
      fs.renameSync(companyLogoPath, targetPath);

      res.redirect('/CompanyReg');
    } else {
      console.log('No companies found.');
      const insertQuery =
        'INSERT INTO companies (company_name, logo_path) VALUES ($1, $2)';
      await client.query(insertQuery, [companyName, companyLogoPath]);
      res.redirect('/CompanyReg');
      res.send('Company registered successfully.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/DepartmentReg', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  const queryText = 'SELECT * FROM kioskRegistration';

  // Fetch company name and logo
  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  // Execute the query
  const kiosks = await client.query(queryText);
  //console.log(kiosks.rows);

  res.render('adminDepartmentReg', {
    user: userDetails,
    kiosks: kiosks.rows,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/DepartmentReg', upload.none(), async (req, res) => {
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  const { department, kioskKey, departmentId, kiosk, departmentPrefix } =
    req.body;

  console.log(req.body);

  try {
    if (departmentId) {
      const updateQuery = `
              UPDATE departments
              SET department = $1,
                  kiosk_key = $2,
                  kiosk_id =$3,
                  dep =$4
              WHERE id = $5
          `;
      const values = [
        department,
        kioskKey,
        kiosk,
        departmentPrefix,
        departmentId,
      ];
      // console.log("Values" + values);
      await client.query(updateQuery, values);
    } else {
      const insertQuery = `
              INSERT INTO departments(department, kiosk_key, dep, kiosk_id)
              VALUES($1, $2, $3, $4)`;

      for (let i = 0; i < department.length; i++) {
        const values = [
          department[i],
          kioskKey[i],
          departmentPrefix[i],
          kiosk[i] || null,
        ];
        await client.query(insertQuery, values);
      }
    }
    res.redirect(
      `/viewDepartments?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}`
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to insert data or fetch departments');
  }
});

app.get('/get_data', async (req, res) => {
  res.send({
    errCode: -1,
    errMsg: 'Success',
    data: { NOISE: 90, PM10: 10.3, 'PM_2.5': 11.55 },
  });
});

app.get('/factorySettings', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  const queryText = 'SELECT * FROM factory_settings';

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  // Execute the query
  var call;
  var ack;
  var end;
  const kiosks = await client.query(queryText);
  const data = kiosks.rows[0];
  console.log(data);
  console.log(kiosks);
  if (!data || Object.keys(data).length === 0) {
    // If data is null or empty, set call, ack, and end to 90
    call = 90;
    ack = 90;
    end = 90;
  } else {
    // If data exists and is not empty, assign values accordingly
    call = data.calltoack || 90; // If calltoack is null or undefined, default to 90
    ack = data.acktoend || 90; // If acktoend is null or undefined, default to 90
    end = data.endtocall || 90; // If endtocall is null or undefined, default to 90
  }

  res.render('factorySettings', {
    user: userDetails,
    call: call,
    ack: ack,
    end: end,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/factorySettings', upload.none(), async (req, res) => {
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const { call, ack, end } = req.body;
  const queryText = 'SELECT * FROM factory_settings';
  const kiosks = await client.query(queryText);
  const id = kiosks.rows[0];
  console.log(id);
  if (!id || Object.keys(id).length === 0) {
    const insertQuery = `
    INSERT INTO factory_settings(calltoack, acktoend, endtocall)
    VALUES($1, $2, $3)`;

    await client.query(insertQuery, [call, ack, end]);
  } else {
    const updateQuery = `
    UPDATE factory_settings
    SET calltoack = $1,
        acktoend = $2,
        endtocall = $3
    WHERE id = $4`;

    await client.query(updateQuery, [call, ack, end, id.id]);
  }

  res.redirect(
    `/factorySettings?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}`
  );
});

app.get('/KioskReg', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  const queryText = 'SELECT * FROM kioskRegistration';

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  // Execute the query
  const kiosks = await client.query(queryText);
  //console.log(kiosks.rows);
  res.render('kioskReg', {
    user: userDetails,
    kiosks: kiosks.rows,
    companies: companies,
    companyName: companyName,
  });
});

app.get('/viewDept', (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  res.render('viewDept', { user: userDetails });
});

app.get('/logout', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
  };
  const currDt = getCurrentDate();

  const updateQuery = `
  UPDATE userlogs
  SET 
      counter = $1,
      updatedat = CURRENT_TIMESTAMP,
      log =0
  WHERE 
      datetime = $2 AND department = $3 AND userid = $4;`;

  const values = [
    userDetails.counter,
    currDt,
    userDetails.department,
    userDetails.id,
  ];
  // console.log("Values" + values);
  await client.query(updateQuery, values);
  console.log('Entry Updated: LOGOUT');
  console.log(userDetails);

  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Server error');
    }

    res.redirect('/');
  });
});

app.get('/autoLogoutSettings', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  res.render('autoLogout', {
    user: userDetails,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/autoLogoutSettings', async (req, res) => {
  const { userId, userName, userDepartment, autoLogoutTime } = req.body;
  console.log('BODY : ', req.body);

  try {
    const query = `
      INSERT INTO auto_logout_settings (user_id, user_name, user_department, auto_logout_time)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        user_name = EXCLUDED.user_name,
        user_department = EXCLUDED.user_department,
        auto_logout_time = EXCLUDED.auto_logout_time;
    `;

    const values = [userId, userName, userDepartment, autoLogoutTime];

    await client.query(query, values);

    res.redirect(
      `/autoLogoutSettings?userId=${userId}&userName=${userName}&userDepartment=${userDepartment}`
    );
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).send('An error occurred while saving settings.');
  }
});

app.get('/viewUser', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    const userID = req.query.userId;
    const result = await client.query('SELECT * FROM users');
    const users = result.rows;
    const queryText = 'SELECT * FROM kioskRegistration';

    const result2 = await client.query('SELECT * FROM departments');
    const departments = result2.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    // Execute the query
    const kiosks = await client.query(queryText);
    //console.log(kiosks.rows);

    res.render('viewUser', {
      users,
      user: userDetails,
      departments: departments,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching userss');
  }
});

app.post('/deleteKiosk', async (req, res) => {
  const userId = req.query.KioskId;
  console.log('Deleting Kiosk with ID:', userId);

  if (!userId) {
    return res.status(400).send('User ID is required.');
  }

  try {
    const deleteQuery = 'DELETE FROM kioskregistration WHERE id = $1';
    const result = await client.query(deleteQuery, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).send('User not found.');
    }

    res.redirect('/KioskReg');
  } catch (error) {
    console.error('Error deleting Kiosk:', error);
    res.status(500).send('Failed to delete Kisok.');
  }
});

app.get('/deleteUser', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    const result = await client.query('SELECT * FROM users');
    const users = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    res.render('deleteUser', {
      users,
      user: userDetails,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users');
  }
});

app.post('/deleteUser', async (req, res) => {
  const userId = req.query.userId;
  console.log('Deleting user with ID:', userId);

  if (!userId) {
    return res.status(400).send('User ID is required.');
  }

  try {
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    const result = await client.query(deleteQuery, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).send('User not found.');
    }

    res.redirect('/deleteUser');
  } catch (error) {
    console.error('Error deleting User:', error);
    res.status(500).send('Failed to delete User.');
  }
});

app.get('/viewDepartments', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    const result = await client.query('SELECT * FROM departments');
    const departments = result.rows;

    const queryText = 'SELECT * FROM kioskRegistration';
    const kiosks = await client.query(queryText);

    // Fetch company name and logo
    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    //console.log(kiosks.rows);
    //console.log(departments);
    res.render('viewDept', {
      departments,
      user: userDetails,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.get('/deleteDept', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    const result = await client.query('SELECT * FROM departments');
    const departments = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    res.render('deleteDept', {
      departments,
      user: userDetails,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.post('/deleteDept', async (req, res) => {
  const departmentId = req.query.departmentId;
  console.log('Deleting department with ID:', departmentId);

  if (!departmentId) {
    return res.status(400).send('Department ID is required.');
  }

  try {
    const deleteQuery = 'DELETE FROM departments WHERE id = $1';
    const result = await client.query(deleteQuery, [departmentId]);

    if (result.rowCount === 0) {
      return res.status(404).send('Department not found.');
    }

    res.redirect('/deleteDept');
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).send('Failed to delete department.');
  }
});

app.get('/admin', async (req, res) => {
  const currDt = getCurrentDate();
  const currTm = getCurrentTime();
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const queryText2 = 'SELECT * FROM dailytokencount WHERE date = $1 ';
  const result2 = await client.query(queryText2, [currDt]);

  const queryText3 = 'SELECT * FROM userlogs WHERE datetime = $1 ';
  const result3 = await client.query(queryText3, [currDt]);

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const data = result2.rows;
  const userlog = result3.rows;
  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  res.render('dist/admin', {
    user: userDetails,
    data: data,
    currDt: currDt,
    currTm: currTm,
    userLog: userlog,
    companies: companies,
    companyName: companyName,
  });
});

app.get('/viewCounter', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    const result = await client.query('SELECT * FROM counterdisplay');
    const departments = result.rows;

    const queryText = 'SELECT * FROM kioskRegistration';
    const kiosks = await client.query(queryText);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    //console.log(kiosks.rows);
    console.log(departments);
    res.render('viewCounter', {
      departments,
      user: userDetails,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.get('/addCOunter', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  res.render('adminCounterReg', {
    user: userDetails,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/addCOunter', upload.none(), async (req, res) => {
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  // console.log("ADD COUNTER" + req.body);
  console.log('COUNTER BODY:', req.body);

  const {
    counter,
    counterACT,
    display,
    buzzer,
    buzzerTime,
    flash,
    counterId,
    IP,
  } = req.body;

  console.log(req.body);

  try {
    if (counterId) {
      const updateQuery = `
              UPDATE counterdisplay
                SET counter = $1,
                active = $2,
                displayid =$3,
                buzzer_time =$4,
                buzzer_active =$5,
                blink =$6,
                ipaddress =$7
              WHERE id = $8
          `;
      const values = [
        counter,
        counterACT,
        display,
        buzzer,
        buzzerTime,
        flash,
        IP,
        counterId,
      ];
      // console.log("Values" + values);
      await client.query(updateQuery, values);
    } else {
      const insertQuery = `
              INSERT INTO counterdisplay(counter, active, displayid, buzzer_time, buzzer_active, blink,ipaddress)
              VALUES($1, $2, $3, $4, $5, $6,$7)`;

      for (let i = 0; i < counter.length; i++) {
        const values = [
          counter[i],
          counterACT[i],
          display[i],
          buzzer[i],
          buzzerTime[i],
          flash[i],
          IP[i] || null,
        ];
        await client.query(insertQuery, values);
      }
    }
    res.redirect(
      `/viewCounter?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}`
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to insert data or fetch departments');
  }
});

app.get('/deleteCounter', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    const result = await client.query('SELECT * FROM counterdisplay');
    const departments = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    console.log(departments);
    res.render('deleteCounter', {
      departments,
      user: userDetails,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.post('/deleteCounter', async (req, res) => {
  const counter = req.query.counter;
  console.log('Deleting countert with ID:', counter);

  if (!counter) {
    return res.status(400).send('counter ID is required.');
  }

  try {
    const deleteQuery = 'DELETE FROM counterdisplay WHERE id = $1';
    const result = await client.query(deleteQuery, [counter]);

    if (result.rowCount === 0) {
      return res.status(404).send('counter not found.');
    }

    res.redirect('/deleteCounter');
  } catch (error) {
    console.error('Error deleting counter:', error);
    res.status(500).send('Failed to delete counter.');
  }
});

app.get('/otaForTV', async (req, res) => {
  const currDt = getCurrentDate();
  const currTm = getCurrentTime();
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  // Queries to get data
  const queryText2 = 'SELECT * FROM dailytokencount WHERE date = $1 ';
  const result2 = await client.query(queryText2, [currDt]);

  const queryText3 = 'SELECT * FROM userlogs WHERE datetime = $1 ';
  const result3 = await client.query(queryText3, [currDt]);

  // Fetch company name and logo
  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const queryText = 'SELECT * FROM departments';
  const result = await client.query(queryText);

  const data = result2.rows;
  const userlog = result3.rows;
  const companies = result4.rows;
  const companyName = companies[0]?.company_name;
  const departments = result.rows;

  console.log('DEPARTMENTS:', departments);

  res.render('otaForTV', {
    user: userDetails,
    data: data,
    currDt: currDt,
    currTm: currTm,
    userLog: userlog,
    companies: companies,
    companyName: companyName,
    departments: departments,
  });
});

app.post('/otaForTV', async (req, res) => {
  try {
    const { content, filename } = req.body; // Extract content and filename from the request body

    if (!content || !filename) {
      return res.status(400).send('Content and filename are required.');
    }

    // Ensure the directory exists
    const directoryPath = path.join(__dirname, '/src/uploads/otaForTv/');
    ensureDirectoryExistence(directoryPath);

    // Define the file path with the provided filename
    const filePath = path.join(directoryPath, filename);

    // Write the content to the file
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Failed to save template.');
      } else {
        console.log('Template saved successfully:', filePath);
        res.status(200).send('Template saved successfully.');
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/addWaitingRoomDisplay', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  res.render('waitingRoomDisplay', {
    user: userDetails,
    companies: companies,
    companyName: companyName,
  });
});

app.post('/addWaitingRoomDisplay', upload.none(), async (req, res) => {
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    const { displayId, displayStatus, IP } = req.body;
    console.log('BODY:', req.body);

    for (let i = 0; i < displayId.length; i++) {
      if (!displayId[i] || !displayStatus[i] || !IP[i]) {
        console.log(
          `Skipping empty data at index ${i}: displayId: ${displayId[i]}, displayStatus: ${displayStatus[i]}, IP: ${IP[i]}`
        );
        continue;
      }

      await client.query(
        `INSERT INTO waiting_room_displays (display_id, display_status, ip_address) VALUES ($1, $2, $3)`,
        [displayId[i], displayStatus[i], IP[i]]
      );
    }

    res.redirect(
      `/viewWaitingRoomDisplay?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}`
    );
  } catch (error) {
    console.error('Error storing data:', error);
    res.status(500).send('Error storing data.');
  }
});

app.post('/addWaitingRoomDisplay/:id', upload.none(), async (req, res) => {
  try {
    const { displayId, displayStatus, IP } = req.body;
    const id = req.params.id;

    // Debug: Log the incoming request data
    console.log('Request Params ID:', id);
    console.log('Request Body:', req.body);

    // Check for required fields
    if (!displayId || !displayStatus || !IP) {
      console.warn('Missing required fields:', {
        displayId,
        displayStatus,
        IP,
      });
      return res.status(400).send('All fields are required.');
    }

    // Debug: Log the SQL query parameters before executing
    console.log('Updating record with values:', {
      display_id: displayId,
      display_status: displayStatus,
      ip_address: IP,
      where_display_id: id,
    });

    // Update the existing record in the database
    const updateQuery = `
      UPDATE waiting_room_displays 
      SET display_id = $1, display_status = $2, ip_address = $3
      WHERE display_id = $4
      RETURNING *;`;

    const { rows } = await client.query(updateQuery, [
      displayId,
      displayStatus,
      IP,
      id,
    ]);

    // Debug: Log the response from the database after the update
    console.log('Database Update Result:', rows);

    if (rows.length > 0) {
      // Debug: Log success and the data being sent back to the client
      console.log('Record updated successfully:', rows[0]);
      res.json({
        id: rows[0].display_id,
        display_id: rows[0].display_id,
        display_status: rows[0].display_status,
        ip_address: rows[0].ip_address,
      });
    } else {
      console.warn('No record found with the specified display_id:', id);
      res.status(404).send('Display not found.');
    }
  } catch (error) {
    // Debug: Log error details
    console.error('Error updating data:', error);
    res.status(500).send('Error updating data.');
  }
});

app.get('/viewWaitingRoomDisplay', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    // Query to get data from waiting_room_displays
    const result = await client.query('SELECT * FROM waiting_room_displays');
    const waitingRoomDisplays = result.rows;

    // You can also query other related data if needed
    const queryText = 'SELECT * FROM kioskRegistration';
    const kiosks = await client.query(queryText);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    // Render the view with waitingRoomDisplays and kiosks data
    res.render('viewWaitingRoomDisplay', {
      waitingRoomDisplays, // This contains the rows from waiting_room_displays
      user: userDetails,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching waiting room displays:', error);
    res.status(500).send('Error fetching waiting room displays');
  }
});

app.get('/softwareSettings', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    // Fetch user settings
    const queryText = `
      SELECT activate_recall, activate_reassign, activate_changedept
      FROM software_settings 
      WHERE user_id = $1
    `;
    const result = await client.query(queryText, [userDetails.id]);

    const userSettings = result.rows[0] || {
      activate_recall: false,
      activate_reassign: false,
      activate_changedept: false,
    };
    console.log('USER SETTINGS === ', userSettings);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    res.render('softwareSettings', {
      user: userDetails,
      companies: companies,
      companyName: companyName,
      settings: userSettings,
    });
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).send('Error loading settings.');
  }
});

app.post('/softwareSettings', async (req, res) => {
  const { userId, userName, userDepartment } = req.query;
  const { activateRecall, activateReassign, activateChangeDept } = req.body;

  console.log('BODY :', req.body);

  try {
    const queryText = `
      INSERT INTO software_settings (user_id, user_name, user_department, activate_recall, activate_reassign, activate_changeDept)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        activate_recall = EXCLUDED.activate_recall, 
        activate_reassign = EXCLUDED.activate_reassign,
        activate_changeDept = EXCLUDED.activate_changeDept
    `;

    const values = [
      userId,
      userName,
      userDepartment,
      activateRecall === 'true',
      activateReassign === 'true',
      activateChangeDept === 'true',
    ];

    await client.query(queryText, values);

    res.redirect(
      `/softwareSettings?userId=${userId}&userName=${userName}&userDepartment=${userDepartment}`
    );
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).send('Error saving settings.');
  }
});

app.get('/checkTvOTA', async (req, res) => {
  const { displayId } = req.query;
  console.log('OTA Check:', displayId);

  try {
    // Fetch the display info based on displayId
    const result = await client.query(
      'SELECT * FROM otadisplay WHERE display_id = $1',
      [displayId]
    );
    const waitingRoomDisplays = result.rows;

    if (waitingRoomDisplays.length === 0) {
      return res.status(404).send('Display not found.');
    }

    const display = waitingRoomDisplays[0];
    const { status, filename } = display;
    console.log('File name:', filename);
    console.log('File name:', display);

    if (status === '1') {
      // If status is '1', read the file and send it
      const filePath = path.join(__dirname, '/src/uploads/otaForTV/', filename); // Adjust the path to your file location'
      console.log('File path:', filePath);

      // Check if the file exists
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          return res.status(404).send('File not found.');
        }

        // Send the file as response
        res.sendFile(filePath, (err) => {
          if (err) {
            console.error('Error sending file:', err);
            return res.status(500).send('Error sending file.');
          }

          // Update the status to 0 after the file is sent
          client.query(
            "UPDATE otadisplay SET status = '0' WHERE display_id = $1",
            [displayId],
            (err) => {
              if (err) {
                console.error('Error updating status:', err);
              } else {
                console.log('File sent and status updated to 0.');
              }
            }
          );
        });
      });
    } else if (status === '0') {
      // If status is '0', send a response saying no need
      res.status(200).send('No need for update.');
    } else {
      res.status(400).send('Invalid status.');
    }
  } catch (error) {
    console.error('Error in /checkTvOTA:', error);
    res.status(500).send('Internal server error.');
  }
});

app.get('/viewOTA', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };

  try {
    // Query to get data from waiting_room_displays
    const result = await client.query('SELECT * FROM otadisplay');
    const waitingRoomDisplays = result.rows;

    // You can also query other related data if needed
    const queryText = 'SELECT * FROM kioskRegistration';
    const kiosks = await client.query(queryText);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    // Render the view with waitingRoomDisplays and kiosks data
    res.render('viewOTA', {
      waitingRoomDisplays, // This contains the rows from waiting_room_displays
      user: userDetails,
      kiosks: kiosks.rows,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching waiting room displays:', error);
    res.status(500).send('Error fetching waiting room displays');
  }
});

app.get('/deleteWaitingRoomDisplay', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
  };
  try {
    // Query to get data from waiting_room_displays
    const result = await client.query('SELECT * FROM waiting_room_displays');
    const waitingRoomDisplays = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    res.render('deleteWaitingRoomDisplay', {
      waitingRoomDisplays,
      user: userDetails,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.post('/deleteWaitingRoomDisplay', async (req, res) => {
  const { displayId } = req.query; // Get the displayId from the query parameters

  try {
    // Perform the deletion query
    await client.query('DELETE FROM waiting_room_displays WHERE id = $1', [
      displayId,
    ]);

    console.log(`Display with ID ${displayId} deleted.`);
    res.sendStatus(200); // Respond with status OK (200) on successful deletion
  } catch (error) {
    console.error('Error deleting display:', error);
    res.status(500).send('Error deleting display'); // Send error response if something goes wrong
  }
});

app.get('/changeDept', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
  };
  const currDt = getCurrentDate();
  const currTm = getCurrentTime();

  try {
    const result = await client.query('SELECT * FROM departments');
    const departments = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;
    //console.log(departments);
    res.render('changeDepartment', {
      departments,
      user: userDetails,
      currDt: currDt,
      currTm: currTm,
      companies: companies,
      companyName: companyName,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.post('/changeDept', upload.none(), async (req, res) => {
  console.log('Chnage');
  const user = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
  };
  const currDt = getCurrentDate();
  // console.log("ADD COUNTER" + req.body);
  console.log('Chnage DEp:', req.body);
  const updateQuery = 'UPDATE users SET userdept = $1 WHERE userid = $2';

  const updateRes = await client.query(updateQuery, [
    req.body.userDept,
    user.id,
  ]);
  // console.log("Values" + values);
  console.log('Entry Updated: LOG IN');

  res.redirect(
    `/logout?userId=${user.id}&userName=${user.name}&userDepartment=${user.department}&counter=${user.counter}`
  );
});

app.get('/dashboard', async (req, res) => {
  const userId = req.query.userId;
  const department = req.query.userDepartment;
  const counter = req.query.counter;
  const kioskId = req.query.kioskId;

  const currDt = getCurrentDate();
  const currTm = getCurrentTime();

  const currDatetime = `${currDt} ${currTm}`;

  const queryCheck = `SELECT * FROM userlogs WHERE datetime = $1 AND userid = $2 AND department = $3`;

  const result = await client.query(queryCheck, [currDt, userId, department]);

  if (result.rows && result.rows.length > 0) {
    console.log('Update');
    const updateQuery = `
    UPDATE userlogs
    SET 
        counter = $1,
        updatedat = CURRENT_TIMESTAMP,
        log =1
    WHERE 
        datetime = $2 AND department = $3 AND userid = $4;`;

    const values = [counter, currDt, department, userId];
    await client.query(updateQuery, values);
    console.log('Entry Updated: LOG IN');
  } else {
    console.log('Entry needed to be add');
    const insertQuery = `INSERT INTO userlogs (counter, department, userId, datetime,updatedat,log) VALUES ($1, $2, $3, $4,CURRENT_TIMESTAMP,1)`;
    const check1 = await client.query(insertQuery, [
      counter,
      department,
      userId,
      currDt,
    ]);
    if (check1.rows) {
      console.log(
        `User log added successfully for userId ${userId} at datetime ${currDt}.`
      );
    }
  }

  const queryText = 'SELECT * FROM factory_settings';
  const data_dem = await client.query(queryText);
  const data = data_dem.rows[0];
  var call;
  var ack;
  var end;
  if (data_dem.rows[0] <= 0) {
    call = 90;
    ack = 90;
    end = 90;
  } else {
    call = data.calltoack;
    ack = data.acktoend;
    end = data.endtocall;
  }

  try {
    const result = await client.query('SELECT * FROM departments');
    const departments = result.rows;

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    const queryText5 = 'SELECT * FROM auto_logout_settings';
    const result5 = await client.query(queryText5);

    const auto_logout_settings = result5.rows;
    const autoLogoutTime = auto_logout_settings[0]?.auto_logout_time;

    const queryText6 = 'SELECT * FROM userlogs';
    const result6 = await client.query(queryText6);

    const userlogs = result6.rows;
    const dateTime = userlogs[0]?.datetime;
    const updatedat = userlogs[0]?.updatedat;
    const log = userlogs[0]?.log;

    const queryText2 = 'SELECT * FROM software_settings';
    const result2 = await client.query(queryText2);

    const softwareSettings = result2.rows;
    const recallBtn = softwareSettings[0]?.activate_recall;
    const reassignBtn = softwareSettings[0]?.activate_reassign;
    const changeDept = softwareSettings[0]?.activate_changedept;

    res.render('index', {
      user: req.session.user,
      departments: departments,
      currDt: currDt,
      currTm: currTm,
      call: call,
      ack: ack,
      end: end,
      companies: companies,
      companyName: companyName,
      auto_logout_settings: auto_logout_settings,
      autoLogoutTime: autoLogoutTime,
      recallBtn: recallBtn,
      reassignBtn: reassignBtn,
      changeDept: changeDept,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).send('Error fetching departments');
  }
});

app.get('/storeToken', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
  };
  res.status(500).send('Error fetching departments');
});
//   console.log("=== STORE TOKEN ===");
//   const { tokenNumber, callTime, endTime, prefix } = req.body;

//   console.log("Token Number: " + prefix);
//   let { ackTime } = req.body;

//   var { acknowledged } = req.body;

//   var skip_token;
//   //const userId = req.session.user.id;

//   const userId = req.query.userId;
//   //console.log(req.query);
//   //console.log(req.body);
//   const department = req.query.userDepartment;
//   const kiosk = req.query.kioskId;
//   const counter = req.query.counter;
//   //Read the token logs
//   const currDt = getCurrentDate();
//   var occurance;

//   const queryCheck7 = `SELECT * FROM departments WHERE department= $1`;

//   const result7 = await client.query(queryCheck7, [department]);

//   const data2 = result7.rows[0];

//   if (prefix !== data2.dep) {
//     console.log("Reassign Found");
//     const queryCheck8 = `SELECT * FROM departments WHERE dep= $1`;
//     console.log("PREFIX =" + prefix);

//     const result8 = await client.query(queryCheck8, [prefix]);
//     const data2_M = result8.rows[0];

//     console.log("Data : " + JSON.stringify(data2_M));
//     const queryCheck9 = `SELECT * FROM token_logs WHERE token_id = $1 AND reassign_dep= $2 AND DATE(call_time) = $3`;

//     const result9 = await client.query(queryCheck9, [
//       tokenNumber,
//       department,
//       currDt,
//     ]);
//     const data3_M = result9.rows[0];
//     console.log("Data 2 check: " + JSON.stringify(data3_M));
//     if (data3_M && data3_M.log_id) {
//       const updateToken2 = `
//       UPDATE token_logs
//       SET
//           call_time = $1,
//           end_time = $2,
//           ack_time = $3,
//           ack_status = $4,
//           time_interval = CASE
//                               WHEN $4 = true THEN
//                                   CASE
//                                       WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp)
//                                       ELSE (time_interval::interval + ($2::timestamp - $3::timestamp))
//                                   END
//                               ELSE
//                                   CASE
//                                       WHEN time_interval IS NOT NULL THEN time_interval
//                                       ELSE NULL
//                                   END
//                           END,
//           occurance = CASE
//                           WHEN $4 = true THEN COALESCE(occurance, 0) + 1
//                           ELSE occurance
//                       END,
//           reassign_active = false
//       WHERE
//           log_id = $5;`;

//       const resultToken2 = await client.query(updateToken2, [
//         new Date(callTime),
//         new Date(endTime),
//         ackTime ? new Date(ackTime) : null,
//         acknowledged,
//         data3_M.log_id,
//       ]);

//       console.log("Update Result: " + JSON.stringify(resultToken2.rowCount));
//     }
//   } else {
//     console.log("Normal Update");
//     const queryCheck = `SELECT * FROM token_logs WHERE token_id = $1 AND user_id = $2 AND dep = $3 AND DATE(call_time) = $4`;
// console.log("queryCheck ="+queryCheck);
//     const result = await client.query(queryCheck, [
//       tokenNumber,
//       userId,
//       department,
//       currDt,
//     ]);
//     console.log("tokenNumber =" + tokenNumber);
//     console.log("userId =" + userId);
//     console.log("department =" + department);
//     console.log("currDt =" + currDt);
//     console.log("RESULT QUERY =" + JSON.stringify(result.rows));

//     const data_token = result.rows[0];
//     console.log("RESULT ROWS = " + data_token);

//     const queryCheck2 = `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2 AND dep = $3`;

//     const result3 = await client.query(queryCheck2, [
//       kiosk,
//       currDt,
//       department,
//     ]);
//     const data_daily = result3.rows[0];

//     //console.log("Daily token");
//     //console.log(data_daily);
//     console.log("RESULT : " + result.rows);
//     if (result.rows && result.rows.length > 0) {
//       console.log("FOUND: UPDATE LOG");
//       //chnage daily tokencount
//       //if skip the dont update skip else update the skip incremnet
//       //if not skip increment the occurence
//       //disable the recallstatus to 0

//       // Check if the previous and current ack statuses are both false
//       const skipIncrementNeeded =
//         !acknowledged && data_token.ack_status && data_token.occurance === 0;
//       const skipDecrementNeeded = acknowledged && !data_token.ack_status;
//       var skip_int = false;

//       // Calculate new_skip based on the conditions
//       let new_skip;
//       if (skipIncrementNeeded) {
//         console.log("Increment:");
//         new_skip = data_daily.token_skip_count + 1; // Decrease token_skip_count if previously not acknowledged and now acknowledged
//       } else if (skipDecrementNeeded) {
//         new_skip = data_daily.token_skip_count - 1; // Decrease token_skip_count if previously not acknowledged and now acknowledged
//       }
//       else if (
//         acknowledged &&
//         data_token.ack_status &&
//         data_token.occurance > 0
//       ) {
//         new_skip = data_daily.token_skip_count; // Keep token_skip_count unchanged if not needed to increment or decrement
//       } else if (
//         acknowledged &&
//         data_token.ack_status &&
//         data_token.occurance === 0
//       ) {
//         new_skip = data_daily.token_skip_count; // Keep token_skip_count unchanged if not needed to increment or decrement
//       }
//       else {
//         new_skip = data_daily.token_skip_count; // Keep token_skip_count unchanged if not needed to increment or decrement
//         //acknowledged = true;
//         skip_int = true;
//       }

//       if (!skip_int) {
//         const updateQuery = `
//         UPDATE dailytokencount
//         SET
//             recallstatus = $1,
//             token_skip_count = $2,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE
//             kiosk_id = $3 AND dep = $4 AND date = $5;`;

//         const result2 = await client.query(updateQuery, [
//           "0",
//           new_skip,
//           kiosk,
//           department,
//           currDt,
//         ]);

//         console.log("ACK : ");
//         console.log(acknowledged);

//         const updateToken = `
//       UPDATE token_logs
//       SET
//           call_time = $1,
//           end_time = $2,
//           ack_time = $3,
//           ack_status = $4,
//           time_interval = CASE
//                               WHEN $4 = true THEN
//                                   CASE
//                                       WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp)
//                                       ELSE (time_interval::interval + ($2::timestamp - $3::timestamp))
//                                   END
//                               ELSE
//                                   CASE
//                                       WHEN time_interval IS NOT NULL THEN time_interval
//                                       ELSE NULL
//                                   END
//                           END,
//           occurance = CASE
//                           WHEN $4 = true THEN COALESCE(occurance, 0) + 1
//                           ELSE occurance
//                       END
//       WHERE
//           kiosk_id = $5 AND dep = $6 AND token_id = $7 AND user_id = $8 AND DATE(call_time) = $9;`;

//         const resultToken = await client.query(updateToken, [
//           new Date(callTime),
//           new Date(endTime),
//           ackTime ? new Date(ackTime) : null,
//           acknowledged,
//           kiosk,
//           department,
//           tokenNumber,
//           userId,
//           currDt,
//         ]);
//       } else {
//         console.log("SKIPPED ");
//       }
//       res.json({
//         message: "Token log UPDATED successfully",
//         log: result.rows[0],
//       });
//     } else {
//       console.log("NOT FOUND: ADD LOG");
//       //var occurance = 0;
//       if (!acknowledged) {
//         ackTime = null;
//         occurance = 0;
//       } else {
//         occurance = 1;
//       }
//       try {
//         const timeInterval = ackTime
//           ? `age(timestamp '${endTime}', timestamp '${ackTime}')`
//           : null;

//         const result = await client.query(
//           `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance, generated_time) VALUES ($1, $2, $3, $4, $5, $6, ${timeInterval}, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
//           [
//             userId,
//             tokenNumber,
//             new Date(callTime),
//             new Date(endTime),
//             ackTime ? new Date(ackTime) : null,
//             acknowledged,
//             department,
//             kiosk,
//             occurance,
//             new Date(endTime),
//           ]
//         );
//         var new_skip;
//         if (!acknowledged) {
//           new_skip = data_daily.token_skip_count + 1;
//         } else {
//           new_skip = data_daily.token_skip_count;
//         }

//         //console.log(kiosk);
//         const updateQuery = `
//             UPDATE dailytokencount
//             SET
//                 token_current_count = $1,
//                 token_skip_count = $2,
//                 updated_at = CURRENT_TIMESTAMP
//             WHERE
//                 kiosk_id = $3 AND dep = $4 AND date = $5;`;

//         const result2 = await client.query(updateQuery, [
//           tokenNumber,
//           new_skip,
//           kiosk,
//           department,
//           currDt,
//         ]);

//         //console.log(result2);
//         res.json({
//           message: "Token log saved successfully",
//           log: result.rows[0],
//         });
//       } catch (err) {
//         console.error(err);
//         res.status(500).send("Server error");
//       }
//     }
//   }
// });

app.post('/storeToken', async (req, res) => {
  console.log('=== STORE TOKEN ===');
  const { tokenNumber, callTime, endTime, prefix } = req.body;
  console.log('BODY ===' + req.body);
  let { ackTime } = req.body;
  var { acknowledged } = req.body;

  const userId = req.query.userId;
  const department = req.query.userDepartment;
  const kiosk = req.query.kioskId;
  const counter = req.query.counter;
  const currDt = getCurrentDate();
  var occurance;
  const queryCheck7 = `SELECT * FROM departments WHERE department= $1`;
  const result7 = await client.query(queryCheck7, [department]);
  const data2 = result7.rows[0];

  if (prefix !== data2.dep) {
    console.log('Reassign Found');
    const queryCheck8 = `SELECT * FROM departments WHERE dep= $1`;
    const result8 = await client.query(queryCheck8, [prefix]);
    const data2_M = result8.rows[0];

    const queryCheck9 = `SELECT * FROM token_logs WHERE token_id = $1 AND reassign_dep= $2 AND DATE(call_time) = $3`;
    const result9 = await client.query(queryCheck9, [
      tokenNumber,
      department,
      currDt,
    ]);

    const data3_M = result9.rows[0];

    const Previous_time = data3_M.time_interval;
    console.log(
      'Time interval : Previous : ' + JSON.stringify(data3_M.time_interval)
    );

    if (data3_M && data3_M.log_id) {
      const updateToken2 = `
      UPDATE token_logs 
      SET 
          call_time = $1,
          end_time = $2,
          ack_time = $3,
          ack_status = $4,
          time_interval = CASE 
                              WHEN $4 = true THEN 
                                  CASE 
                                      WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp)
                                      ELSE (time_interval::interval + ($2::timestamp - $3::timestamp))
                                  END
                              ELSE 
                                  CASE 
                                      WHEN time_interval IS NOT NULL THEN time_interval
                                      ELSE NULL
                                  END
                          END,
          occurance = CASE 
                          WHEN $4 = true THEN COALESCE(occurance, 0) + 1 
                          ELSE occurance
                      END,
          reassign_active = false
      WHERE 
          log_id = $5;`;

      const resultToken2 = await client.query(updateToken2, [
        new Date(callTime),
        new Date(endTime),
        ackTime ? new Date(ackTime) : null,
        acknowledged,
        data3_M.log_id,
      ]);

      const queryCheck10 = `SELECT * FROM token_logs WHERE token_id = $1 AND reassign_dep= $2 AND DATE(call_time) = $3`;
      const result10 = await client.query(queryCheck10, [
        tokenNumber,
        department,
        currDt,
      ]);

      const data3_N = result10.rows[0];

      const Curr_time = data3_N.time_interval;
      const timeDifference = calculateTimeDifference(Previous_time, Curr_time);
      console.log('Time Difference:', timeDifference);
      console.log(
        'Time interval : Current Time : ' +
          JSON.stringify(data3_N.time_interval)
      );
      const intervalString = `${timeDifference.seconds} seconds ${timeDifference.milliseconds} milliseconds`;
      const updateQuery2 = `
      UPDATE reassignedTokenData
      SET time_taken = $1, occurance_index = $2
      WHERE token_id = $3 AND dep_origin = $4 AND dep_to = $5 RETURNING *;
    `;

      const ABC = [
        intervalString,
        data3_N.occurance,
        data3_N.token_id,
        data3_N.dep,
        department,
      ];

      // console.log("timeDifference = "+timeDifference);
      console.log('data3_N.occurance = ' + data3_N.occurance);
      console.log('data3_N.token_id = ' + data3_N.token_id);
      console.log('data3_N.dep = ' + data3_N.dep);
      console.log('department = ' + department);

      const updateResult = await client.query(updateQuery2, ABC);
      console.log('Update Result = ', updateResult);
    }
  } else {
    const queryCheck = `SELECT * FROM token_logs WHERE token_id = $1 AND user_id = $2 AND dep = $3 AND DATE(call_time) = $4`;
    const result = await client.query(queryCheck, [
      tokenNumber,
      userId,
      department,
      currDt,
    ]);

    const data_token = result.rows[0];
    const queryCheck2 = `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2 AND dep = $3`;
    const result3 = await client.query(queryCheck2, [
      kiosk,
      currDt,
      department,
    ]);
    const data_daily = result3.rows[0];

    if (result.rows && result.rows.length > 0) {
      const skipIncrementNeeded =
        !acknowledged && data_token.ack_status && data_token.occurance === 0;
      const skipDecrementNeeded = acknowledged && !data_token.ack_status;
      var skip_int = false;

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
        new_skip = data_daily.token_skip_count; // Keep token_skip_count unchanged if not needed to increment or decrement
      } else if (
        acknowledged &&
        data_token.ack_status &&
        data_token.occurance === 0
      ) {
        new_skip = data_daily.token_skip_count; // Keep token_skip_count unchanged if not needed to increment or decrement
      } else {
        new_skip = data_daily.token_skip_count;
        skip_int = true;
      }

      if (!skip_int) {
        const updateQuery = `
        UPDATE dailytokencount 
        SET 
            recallstatus = $1,
            token_skip_count = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE 
            kiosk_id = $3 AND dep = $4 AND date = $5;`;

        const result2 = await client.query(updateQuery, [
          '0',
          new_skip,
          kiosk,
          department,
          currDt,
        ]);

        const updateToken = `
      UPDATE token_logs 
      SET 
          call_time = $1,
          end_time = $2,
          ack_time = $3,
          ack_status = $4,
          time_interval = CASE 
                              WHEN $4 = true THEN 
                                  CASE 
                                      WHEN time_interval IS NULL THEN ($2::timestamp - $3::timestamp)
                                      ELSE (time_interval::interval + ($2::timestamp - $3::timestamp))
                                  END
                              ELSE 
                                  CASE 
                                      WHEN time_interval IS NOT NULL THEN time_interval
                                      ELSE NULL
                                  END
                          END,
          occurance = CASE 
                          WHEN $4 = true THEN COALESCE(occurance, 0) + 1 
                          ELSE occurance
                      END
      WHERE 
          kiosk_id = $5 AND dep = $6 AND token_id = $7 AND user_id = $8 AND DATE(call_time) = $9;`;

        const resultToken = await client.query(updateToken, [
          new Date(callTime),
          new Date(endTime),
          ackTime ? new Date(ackTime) : null,
          acknowledged,
          kiosk,
          department,
          tokenNumber,
          userId,
          currDt,
        ]);
      }
      res.json({
        message: 'Token log UPDATED successfully',
        log: result.rows[0],
      });
    } else {
      if (!acknowledged) {
        ackTime = null;
        occurance = 0;
      } else {
        occurance = 1;
      }
      try {
        const timeInterval = ackTime
          ? `age(timestamp '${endTime}', timestamp '${ackTime}')`
          : null;

        const result = await client.query(
          `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance) VALUES ($1, $2, $3, $4, $5, $6, ${timeInterval}, $7, $8, $9) RETURNING *`,
          [
            userId,
            tokenNumber,
            new Date(callTime),
            new Date(endTime),
            ackTime ? new Date(ackTime) : null,
            acknowledged,
            department,
            kiosk,
            occurance,
          ]
        );

        var new_skip;
        if (!acknowledged) {
          new_skip = data_daily.token_skip_count + 1;
        } else {
          new_skip = data_daily.token_skip_count;
        }

        const updateQuery = `
            UPDATE dailytokencount 
            SET 
                token_current_count = $1,
                token_skip_count = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE 
                kiosk_id = $3 AND dep = $4 AND date = $5;`;

        const result2 = await client.query(updateQuery, [
          tokenNumber,
          new_skip,
          kiosk,
          department,
          currDt,
        ]);

        res.json({
          message: 'Token log saved successfully',
          log: result.rows[0],
        });
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    }
  }
});

//AJIX QUERY
app.get('/updateData', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
  };

  const currDt = getCurrentDate();
  const queryText2 =
    'SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3';

  const result2 = await client.query(queryText2, [
    userDetails.kioskId,
    userDetails.department,
    currDt,
  ]);

  const queryText3 = `
  SELECT * 
  FROM token_logs 
  WHERE 
    kiosk_id = $1 AND 
    (dep = $2 OR reassign_dep = $2) AND 
    DATE(generated_time) = $3;`;
  const result3 = await client.query(queryText3, [
    userDetails.kioskId,
    userDetails.department,
    currDt,
  ]);

  //console.log("token Logs:");
  //console.log(result3.rows);

  const quey_token_log = result3.rows;

  //console.log("=== END ===");

  const queryText = 'SELECT * FROM departments WHERE kiosk_id = $1';
  const result4 = await client.query(queryText, [userDetails.kioskId]);

  const queryText4 =
    'SELECT * FROM departments WHERE kiosk_id = $1 AND department = $2';
  const result = await client.query(queryText4, [
    userDetails.kioskId,
    userDetails.department,
  ]);

  const departmentPrefix = result4.rows; // Assuming 'dep' is the prefix
  //console.log(departmentPrefix);
  // Step 3: Add prefix to each token log entry
  const updatedTokenLogs = quey_token_log.map((log) => {
    let prefix = '';

    // Find the matching department prefix
    for (let i = 0; i < departmentPrefix.length; i++) {
      if (departmentPrefix[i].department === log.dep) {
        prefix = departmentPrefix[i].dep;
        break;
      } else if (departmentPrefix[i].department === log.reassign_dep) {
        prefix = departmentPrefix[i].dep;
      }
    }

    return {
      ...log,
      prefix: `${prefix}`,
    };
  });

  //console.log("Department Search:");
  //console.log( updatedTokenLogs);
  const prefix = result.rows[0];

  const dummy = [
    {
      id: 27,
      dep: 'ESIC',
      kiosk_id: 'KVAR7423',
      token_current_count: 0,
      token_total_count: 0,
      token_skip_count: 0,
      date: '2024-03-01',
    },
  ];

  if (
    result.rows &&
    result.rows.length > 0 &&
    result2.rows &&
    result2.rows.length > 0
  ) {
    res.json({
      data: result2.rows,
      user: userDetails,
      currDt: currDt,
      prefix: prefix.dep,
      token_log: updatedTokenLogs,
    });
  } else {
    // console.log("NO Data");
    res.json({
      data: dummy,
      user: userDetails,
      currDt: currDt,
      prefix: '',
      token_log: [],
    });
  }
});

function splitToken(tokenNumber) {
  // Use a regular expression to match the optional prefix (letters) and the number part
  const matches = tokenNumber.match(/^([a-zA-Z]*)\s*(\d+)$/);

  if (matches) {
    // matches[1] contains the letters (or an empty string if no prefix), matches[2] contains the numbers
    const prefix = matches[1] || ' '; // Default to an empty string if no prefix
    const number = matches[2];

    return { prefix, number };
  } else {
    // Handle cases where the format does not match the expected pattern
    throw new Error('Invalid token format');
  }
}

app.post('/DISPLAY', async (req, res) => {
  console.log('=================================================');
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
    tokenNumber2: req.query.tokenNumber2,
    priority: req.query.priority || null,
  };

  console.log('Display Data: ' + JSON.stringify(userDetails));
  const currDt = getCurrentDate();

  console.log('DISPLAY');
  console.log(userDetails);

  const queryText = 'SELECT * FROM counterdisplay WHERE counter = $1';

  const result = await client.query(queryText, [userDetails.counter]);
  const data = result.rows[0];
  const final_new_count = padNumberWithZeros(userDetails.tokenNumber, 3); // initaial no of 0

  console.log('Token number: ' + JSON.stringify(data));

  const getPriority = `SELECT * FROM token_logs WHERE token_id = $1 AND dep = $2 AND DATE(call_time) = $3`;

  const resultgetPriority = await client.query(getPriority, [
    userDetails.tokenNumber2,
    userDetails.department,
    currDt,
  ]);

  console.log('Get Priority:', resultgetPriority.rows[0]);

  const priority = resultgetPriority.rows[0] || null;
  console.log('Priority:', priority);

  if (priority.priority) {
    console.log('Pop Priority from stack: ', userDetails.tokenNumber + '*');
    pushToStackCounter(
      userDetails.department + '-' + userDetails.counter,
      userDetails.tokenNumber + '*'
    );
    pushToVoiceStack(userDetails.counter + '-' + userDetails.tokenNumber + '*');
    popFromAnyStack(userDetails.tokenNumber + '*');
  } else {
    console.log('Pop token No: ', userDetails.tokenNumber);
    pushToStackCounter(
      userDetails.department + '-' + userDetails.counter,
      userDetails.tokenNumber
    );
    pushToVoiceStack(userDetails.counter + '-' + userDetails.tokenNumber);
    popFromAnyStack(userDetails.tokenNumber);
  }

  const URL =
    'http://' +
    data.ipaddress +
    '/token' +
    '?TOKENID=' +
    data.displayid +
    '&value=' +
    final_new_count +
    '&buzz=' +
    data.buzzer_active +
    '&blinkCount=' +
    data.blink +
    '&buzzActive=' +
    data.buzzer_time +
    '&priority=' +
    priority.priority;
  console.log(URL);

  //res.redirect(URL);
  //save to daily tokens
  const queryCheck = `SELECT * FROM token_logs WHERE token_id = $1 AND ((user_id = $2 AND dep = $3) OR reassign_dep = $3) AND DATE(call_time) = $4`;

  const resultcheck = await client.query(queryCheck, [
    userDetails.tokenNumber2,
    userDetails.id,
    userDetails.department,
    currDt,
  ]);

  const data_token = resultcheck.rows[0];

  console.log('Data:', data_token);

  const queryCheck2 = `SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2 AND dep = $3`;

  const result3 = await client.query(queryCheck2, [
    userDetails.kioskId,
    currDt,
    userDetails.department,
  ]);

  const data_daily = result3.rows[0];

  console.log('Tokend data : ' + JSON.stringify(data_token));

  if (resultcheck.rows && resultcheck.rows.length > 0) {
    console.log('Call Update');
    const queryCheck7 = `SELECT * FROM departments WHERE department= $1`;

    const result7 = await client.query(queryCheck7, [userDetails.department]);

    const data2 = result7.rows[0];
    //console.log("Department Scan : " + JSON.stringify(data2));
    //console.log('token No:'+ final_new_count); // Output: Prefix: K
    const { prefix, number } = splitToken(final_new_count);
    // console.log('Prefix:', prefix); // Output: Prefix: K

    if (
      prefix !== data2.dep ||
      (prefix === data2.dep && data_daily.reassign_token > 0)
    ) {
      console.log('Reassign Found');
      const reassign_val = parseInt(data_daily.reassign_token) - 1;
      if (reassign_val > -1) {
        const queryCheck8 = `UPDATE dailytokencount SET reassign_token = $1 WHERE kiosk_id = $2 AND date = $3 AND dep = $4`;

        const result8 = await client.query(queryCheck8, [
          reassign_val,
          userDetails.kioskId,
          currDt,
          userDetails.department,
        ]);
      }
    } else {
      console.log('Call');
      const updateQuery = `
      UPDATE dailytokencount
      SET 
          token_current_count = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE 
          kiosk_id = $2 
          AND dep = $3 
          AND date = $4
          AND ABS(token_current_count - $1) = 1; -- Allow only a difference of 1
  `;
      const result2 = await client.query(updateQuery, [
        userDetails.tokenNumber2, // New value to set
        userDetails.kioskId,
        userDetails.department,
        currDt,
      ]);
    }
  } else {
    console.log('Edit Entry');
    const queryCheck3 = `SELECT * FROM token_logs WHERE token_id = $1 AND dep = $2 AND DATE(call_time) = $3`;

    const selectResult = await client.query(queryCheck3, [
      userDetails.tokenNumber2,
      userDetails.department,
      currDt,
    ]);

    if (selectResult.rows.length > 0) {
      console.log('Record already exists, updating user_id.');
      const updateQuery = `UPDATE token_logs SET user_id = $1, call_time = CURRENT_TIMESTAMP WHERE token_id = $2 AND dep = $3 AND DATE(call_time) = $4`;
      const updateValues = [
        userDetails.id,
        userDetails.tokenNumber2,
        userDetails.department,
        currDt,
      ];
      const updateResult = await client.query(updateQuery, updateValues);
      console.log('Record updated:', updateResult.rowCount);
    } else {
      console.log('Add Log');
      const result = await client.query(
        `INSERT INTO token_logs (user_id, token_id, call_time, end_time, ack_time, ack_status, time_interval, dep, kiosk_id, occurance) 
        VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), COALESCE($4, CURRENT_TIMESTAMP), COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10) RETURNING *`,
        [
          userDetails.id,
          userDetails.tokenNumber2,
          null, // call_time
          null, // end_time
          null, // ack_time
          true,
          null, // time_interval
          userDetails.department,
          userDetails.kioskId,
          0, // occurance
        ]
      );
    }
    //console.log(kiosk);
    const updateQuery = `
    UPDATE dailytokencount
    SET 
        token_current_count = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        kiosk_id = $2 
        AND dep = $3 
        AND date = $4
        AND ABS(token_current_count - $1) = 1; -- Allow only a difference of 1
`;

    const result2 = await client.query(updateQuery, [
      userDetails.tokenNumber2, // New value to set
      userDetails.kioskId,
      userDetails.department,
      currDt,
    ]);
  }

  try {
    const response = await axios.get(URL);
    // Handle successful response here
    console.log('Response data:', response.data);
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('Request setup error:', error.message);
    }
  }
  // Send the response received from the URL back to the client
  res.send('OK');
});

app.post('/Recall', async (req, res) => {
  try {
    const userDetails = {
      id: req.query.userId,
      name: req.query.userName,
      department: req.query.userDepartment,
      counter: req.query.counter,
      kioskId: req.query.kioskId,
      tokenNumber: req.query.tokenNumber,
    };

    const currDt = getCurrentDate();

    const updateQuery = `
      UPDATE dailytokencount 
      SET 
          recallstatus = $1,
          recallno = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE 
          kiosk_id = $3 AND dep = $4 AND date = $5;`;

    const result2 = await client.query(updateQuery, [
      '1',
      userDetails.tokenNumber,
      userDetails.kioskId,
      userDetails.department,
      currDt,
    ]);

    // Send acknowledgment
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling recall:', error);
    res.status(500).json({ success: false, error: 'Error handling recall' });
  }
});

app.get('/AllData', async (req, res) => {
  const currDt = getCurrentDate();
  console.log('Get All Data');
  const updateQuery = `
      SELECT * FROM departments;
  `;
  const data_user_counter = await client.query(updateQuery);

  const updateQuery2 = `
      SELECT * FROM dailytokencount WHERE date = $1;
  `;
  const values = [currDt];
  const data_user_counter2 = await client.query(updateQuery2, values);

  let departmentCountMap = {};

  // Check if we have any rows in data_user_counter2
  if (data_user_counter2.rows.length > 0) {
    // Map department to token_current_count
    departmentCountMap = data_user_counter2.rows.reduce((map, item) => {
      map[item.dep] = item.token_total_count;
      return map;
    }, {});
  }

  // Construct the string, ensuring to handle departments with no token count by defaulting to "000"
  const resultArray = data_user_counter.rows.map((item) => {
    const tokenCount = departmentCountMap.hasOwnProperty(item.department)
      ? departmentCountMap[item.department]
      : '000';
    const final_new_count = padNumberWithZeros(tokenCount, 3);
    return `${item.department}:${item.dep + final_new_count}:${item.kiosk_key}`;
  });

  // Join the array into a string
  const resultString = resultArray.join(', ');
  console.log(resultString);
  res.set('Content-Type', 'text/plain').send(resultString);
});

app.get('/userReports', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  try {
    // Query to fetch logs and process data
    const result = await client.query('SELECT * FROM token_logs');
    const processedData = result.rows.map((row) => {
      const callTime = new Date(row.call_time);
      const endTime = new Date(row.end_time);
      const generatedTime = new Date(row.generated_time);
      const dep_origin = row.dep;
      const dep_from = row.dep;
      const dep_to = row.dep;
      const occurance_index = row.occurance;
      const token_no = row.token_id;
      const date = new Date(row.call_time);
      const waiting_timeInMs = callTime.getTime() - generatedTime.getTime();
      const waitingTime = {
        hours: Math.floor(waiting_timeInMs / (1000 * 60 * 60)),
        minutes: Math.floor(
          (waiting_timeInMs % (1000 * 60 * 60)) / (1000 * 60)
        ),
        seconds: Math.floor((waiting_timeInMs % (1000 * 60)) / 1000),
      };

      // Calculate idle time (call time - end time)
      const idleTimeInMs = endTime.getTime() - callTime.getTime();
      const idleTime = {
        hours: Math.floor(idleTimeInMs / (1000 * 60 * 60)),
        minutes: Math.floor((idleTimeInMs % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((idleTimeInMs % (1000 * 60)) / 1000),
      };

      // Calculate total time (generated time - end time)
      const totalTimeInMs = endTime.getTime() - generatedTime.getTime();
      const totalTime = {
        hours: Math.floor(totalTimeInMs / (1000 * 60 * 60)),
        minutes: Math.floor((totalTimeInMs % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((totalTimeInMs % (1000 * 60)) / 1000),
      };

      return {
        ...row,
        idleTime,
        totalTime,
        dep_origin,
        dep_from,
        dep_to,
        token_no,
        date,
        waitingTime,
        occurance_index,
      };
    });

    console.log('Processed Data: ' + JSON.stringify(processedData));

    // Query to fetch departments
    const updateQuery = `SELECT * FROM departments;`;
    const data_user_counter = await client.query(updateQuery);
    const departments = data_user_counter.rows;

    // Query to fetch other data
    const updateQuery1 = `SELECT * FROM dailytokencount;`;
    const data_user_counter1 = await client.query(updateQuery1);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    const result2 = await client.query('SELECT * FROM reassignedTokenData');
    console.log('Result 222: ' + JSON.stringify(result2.rows));

    // Combine reassignedTokenData with processedData
    const combinedData = result2.rows.map((row) => {
      const matchingProcessedData = processedData.find(
        (data) => data.token_id === row.token_id || row.reassign_active === null
      );

      const generated_time = matchingProcessedData
        ? matchingProcessedData.generated_time
        : null;

      const department = departments.find(
        (dep) => dep.department === row.dep_origin
      );
      const token_no = department
        ? department.dep + row.token_id
        : row.token_id;

      return {
        ...row,
        generated_time,
        token_no,
      };
    });

    console.log('Combined Data: ' + JSON.stringify(combinedData));
    // Use processedData if combinedData is empty
    const assignedData = combinedData.length > 0 ? combinedData : processedData;

    res.render('reports', {
      user: userDetails,
      result: processedData,
      data: data_user_counter1.rows,
      assignedData: assignedData,
      combinedData: combinedData,
      departments: departments,
      companies: companies,
      companyName: companyName,
    });

    console.log('PROCESSED DATA =====  ' + JSON.stringify(processedData));
    console.log(
      'data_user_counter1  =====  ' + JSON.stringify(data_user_counter1.rows)
    );
  } catch (err) {
    console.error('Error fetching data:', err);
    res.render('reports', { user: userDetails, result: [], data: [] });
  }
});

app.get('/Reassign', async (req, res) => {
  console.log('Reassign');
  res.send('OK');
});

app.post('/Reassign', async (req, res) => {
  console.log('==== Reassign-POST =====');
  const currDt = getCurrentDate();
  console.log(req.body);

  const userId = req.query.userId;
  const department = req.query.userDepartment;
  const counter = req.query.counter;
  const username = req.query.userName;
  const kioskId = req.query.kioskId;

  console.log('USER ID : ' + userId);
  console.log('DEPARTMENT : ' + department);
  console.log('COUNTER : ' + counter);
  console.log('USERNAME : ' + username);
  console.log('KIOSK ID : ' + kioskId);

  const Details = {
    Tokenid: req.body.tokenId2,
    logid: req.body.logId,
    departmentT: req.body.ReassignDepT,
    departmentF: req.body.ReassignDepF,
  };
  console.log(Details);
  try {
    //========================
    console.log('From Dep: ' + Details.departmentF);
    console.log('To dep: ' + Details.departmentT);

    const query6 = `SELECT * FROM token_logs WHERE log_id = $1`;
    const value6 = [Details.logid];
    var result6;
    try {
      result6 = await client.query(query6, value6);
    } catch (error) {
      console.error('Error saving data:', error);
    }
    const check_data = result6.rows[0];

    const queryCheck = `SELECT * FROM reassignedTokenData WHERE dep_origin = $1 AND date = $2 AND occurance_index =$3 AND token_id= $4`;

    const resultCheck = await client.query(queryCheck, [
      check_data.dep,
      currDt,
      1,
      Details.Tokenid,
    ]);

    console.log('Select Result:', resultCheck.rows);
    console.log(check_data.dep);
    console.log(currDt);

    if (resultCheck.rows.length > 0) {
      console.log('First Reassin LOG Present');
    } else {
      const query53 = `
      INSERT INTO reassignedTokenData (
        log_id, token_id, user_id, dep_origin, dep_from, dep_to, date,occurance_index,time_taken
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

      const values53 = [
        Details.logid,
        Details.Tokenid,
        userId,
        check_data.dep,
        Details.departmentF,
        check_data.dep,
        currDt,
        1,
        check_data.time_interval,
      ];

      const result53 = await client.query(query53, values53);
      console.log(' Reassign : ' + result53);
    }
    const query5 = `
    INSERT INTO reassignedTokenData (
      log_id, token_id, user_id, dep_origin, dep_from, dep_to, date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

    const values5 = [
      Details.logid,
      Details.Tokenid,
      userId,
      check_data.dep,
      Details.departmentF,
      Details.departmentT,
      currDt,
    ];
    try {
      const result5 = await client.query(query5, values5);
      console.log(' Reassign : ' + result5);
    } catch (error) {
      console.error('Error saving data:', error);
      console.log(' Reassign : ' + result5);
    }

    //========================
    const check2 = true;
    const query = `
        UPDATE token_logs
        SET reassign_active = $1, reassign_dep = $2
        WHERE log_id = $3 AND token_id = $4
    `;
    const values = [
      check2,
      Details.departmentT,
      Details.logid,
      Details.Tokenid,
    ];
    const result = await client.query(query, values);

    const getQuery = `
    SELECT * 
    FROM dailytokencount 
    WHERE 
        kiosk_id = $1 AND dep = $2 AND date = $3;`;

    const result2 = await client.query(getQuery, [
      kioskId,
      Details.departmentT,
      currDt,
    ]);

    //console.log("Rowsss2:" + JSON.stringify(result2.rows));
    const check = result2.rows;
    var default_m = parseInt(check.reassign_token);
    let reassign_val = 1; // Default value to use if reassign_token is null or NaN
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

    console.log('Reassign Value: ' + reassign_val);
    const updateQuery = `
    UPDATE dailytokencount 
    SET 
        reassign_token = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        kiosk_id = $2 AND dep = $3 AND date = $4;`;

    const result3 = await client.query(updateQuery, [
      reassign_val,
      kioskId,
      Details.departmentT,
      currDt,
    ]);

    // Assuming you have user session data
    // const user = req.session.user;

    return res.redirect(
      `/dashboard?userId=${userId}&userName=${username}&userDepartment=${department}&counter=${counter}&kioskId=${kioskId}`
    );
  } catch (error) {
    console.error('Error executing query', error);
    res.json('ERR');
  }
});

app.get('/summaryReports', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  const updateQuery = `
  SELECT * FROM dailytokencount ;
  `;
  // console.log("Values" + values);
  const data_user_counter = await client.query(updateQuery);
  //console.log(data_user_counter);

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  res.render('summaryReports', {
    user: userDetails,
    data: data_user_counter.rows,
    companies: companies,
    companyName: companyName,
  });
  console.log(' userDetails :' + JSON.stringify(userDetails));
  console.log(
    'data_user_counter.rows :' + JSON.stringify(data_user_counter.rows)
  );
});

app.get('/reports1', async (req, res) => {
  try {
    const userDetails = {
      id: req.query.userId,
      name: req.query.userName,
      department: req.query.userDepartment,
      counter: req.query.counter,
      kioskId: req.query.kioskId,
      tokenNumber: req.query.tokenNumber,
    };

    const currDt = getCurrentDate();
    const currDtMinusOne = getCurrentDateMinusOne();

    const updateQuery = `SELECT * FROM dailytokencount;`;
    const data_user_counter = await client.query(updateQuery);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    const queryText2 = 'SELECT department FROM departments';
    const result2 = await client.query(queryText2);

    const depNames = result2.rows.map((row) => row.department);

    const queryText = "SELECT name FROM users WHERE adminlevel != 'Admin'";
    const result = await client.query(queryText);

    const usernames = result.rows.map((row) => row.name);

    const countsQuery = `
      SELECT dep, token_skip_count, token_total_count, date
      FROM dailytokencount;
    `;
    const countsResult = await client.query(countsQuery);

    const departmentCounts = countsResult.rows;

    const query = `
      SELECT *, info::json AS info_json
      FROM token_logs 
      WHERE user_id != '0';
    `;
    const result1 = await client.query(query);

    // Extract grievances from the info JSON
    const grievances = new Set();
    result1.rows.forEach((row) => {
      const infoJson = row.info_json;
      if (infoJson && infoJson.grievance) {
        grievances.add(infoJson.grievance);
      }
    });

    res.render('reports1', {
      user: userDetails,
      data: data_user_counter.rows,
      companies: companies,
      companyName: companyName,
      usernames: usernames,
      depNames: depNames,
      departmentCounts: departmentCounts,
      result1: result1.rows,
      grievances: Array.from(grievances), // Pass grievances as an array
      fromDate: currDt,
      toDate: currDt,
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    res.status(500).send('Internal Server Error');
  }
});

function getCurrentDateMinusOne() {
  const today = new Date();
  today.setDate(today.getDate() - 1); // Subtract one day
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`; // Format as YYYY-MM-DD
}

app.get('/reports2', async (req, res) => {
  try {
    const userDetails = {
      id: req.query.userId,
      name: req.query.userName,
      department: req.query.userDepartment,
      counter: req.query.counter,
      kioskId: req.query.kioskId,
      tokenNumber: req.query.tokenNumber,
    };

    const currDt = getCurrentDate();
    const currDtMinusOne = getCurrentDateMinusOne();

    const updateQuery = `SELECT * FROM dailytokencount;`;
    const data_user_counter = await client.query(updateQuery);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    const queryText2 = 'SELECT department FROM departments';
    const result2 = await client.query(queryText2);

    const depNames = result2.rows.map((row) => row.department);

    console.log('DEP ===', depNames);

    const queryText = "SELECT name FROM users WHERE adminlevel != 'Admin'";
    const result = await client.query(queryText);

    const usernames = result.rows.map((row) => row.name);

    // Fetch data with date included
    const countsQuery = `
      SELECT dep, token_skip_count, token_total_count, date
      FROM dailytokencount;
    `;
    const countsResult = await client.query(countsQuery);

    const departmentCounts = countsResult.rows;

    console.log('Department Counts:', departmentCounts);

    const query = `
    SELECT * 
    FROM token_logs 
    WHERE user_id != '0';
  `;

    const result1 = await client.query(query);

    console.log('result1=', result1.rows);

    res.render('reports2', {
      user: userDetails,
      data: data_user_counter.rows,
      companies: companies,
      companyName: companyName,
      usernames: usernames,
      depNames: depNames,
      departmentCounts: departmentCounts,
      result1: result1.rows,
      fromDate: currDt,
      toDate: currDt,
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/reports3', async (req, res) => {
  try {
    const userDetails = {
      id: req.query.userId,
      name: req.query.userName,
      department: req.query.userDepartment,
      counter: req.query.counter,
      kioskId: req.query.kioskId,
      tokenNumber: req.query.tokenNumber,
    };

    const currDt = getCurrentDate();
    const currDtMinusOne = getCurrentDateMinusOne();

    const updateQuery = `SELECT * FROM dailytokencount;`;
    const data_user_counter = await client.query(updateQuery);

    const queryText4 = 'SELECT * FROM companies';
    const result4 = await client.query(queryText4);

    const companies = result4.rows;
    const companyName = companies[0]?.company_name;

    const queryText2 = 'SELECT department FROM departments';
    const result2 = await client.query(queryText2);

    const depNames = result2.rows.map((row) => row.department);

    const queryText = "SELECT name FROM users WHERE adminlevel != 'Admin'";
    const result = await client.query(queryText);

    const usernames = result.rows.map((row) => row.name);

    const countsQuery = `
      SELECT dep, token_skip_count, token_total_count, date
      FROM dailytokencount;
    `;
    const countsResult = await client.query(countsQuery);

    const departmentCounts = countsResult.rows;

    const query = `
      SELECT *, info::json AS info_json
      FROM token_logs 
      WHERE user_id != '0';
    `;
    const result1 = await client.query(query);

    // Extract grievances from the info JSON
    const grievances = new Set();
    result1.rows.forEach((row) => {
      const infoJson = row.info_json;
      if (infoJson && infoJson.grievance) {
        grievances.add(infoJson.grievance);
      }
    });

    res.render('reports3', {
      user: userDetails,
      data: data_user_counter.rows,
      companies: companies,
      companyName: companyName,
      usernames: usernames,
      depNames: depNames,
      departmentCounts: departmentCounts,
      result1: result1.rows,
      grievances: Array.from(grievances), // Pass grievances as an array
      fromDate: currDt,
      toDate: currDt,
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/printerEditor', async (req, res) => {
  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  res.render('printerEditor', {
    user: userDetails,
    companies: companies,
    companyName: companyName,
  });
});

app.get('/printerSummary', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  const directoryPath = path.join(__dirname, '/src/uploads/printerReport/');

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).send('Server error');
      return;
    }

    // Filter out directories from the list of files
    const fileList = files.filter((file) =>
      fs.statSync(path.join(directoryPath, file)).isFile()
    );

    res.render('chooseSummaryReport', {
      user: userDetails,
      fileList: fileList,
      companies: companies,
      companyName: companyName,
    });
  });
});

app.post('/submitSummary', async (req, res) => {
  try {
    const { filename } = req.body; // Extract filename from the request body

    // Validate if filename exists
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    // Check if the filename already exists in the database
    const checkQuery = 'SELECT * FROM summaryreport';
    const checkResult = await client.query(checkQuery);

    if (checkResult.rows.length > 0) {
      // If the filename exists, update the existing entry
      const updateQuery = 'UPDATE summaryreport SET uploadlink = $1';
      await client.query(updateQuery, [filename]);
      res.status(200).send('Filename updated successfully.');
    } else {
      // If the filename doesn't exist, insert a new entry
      const insertQuery = 'INSERT INTO summaryreport (uploadlink) VALUES ($1)';
      await client.query(insertQuery, [filename]);
      res.status(200).send('Filename stored successfully.');
    }
  } catch (err) {
    console.error('Error storing filename:', err);
    res.status(500).send('Server error');
  }
});

app.get('/printerView?', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };
  const checkQuery = 'SELECT * FROM summaryreport';
  const checkResult = await client.query(checkQuery);

  //console.log(checkResult.rows[0]);

  const checkQuery1 = 'SELECT * FROM tokenreport';
  const checkResult1 = await client.query(checkQuery1);

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  //console.log(checkResult1.rows[0]);
  res.render('viewReports', {
    user: userDetails,
    summary: checkResult.rows[0],
    token: checkResult1.rows[0],
    companies: companies,
    companyName: companyName,
  });
});

app.get('/printerToken', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  const directoryPath = path.join(__dirname, '/src/uploads/printerReport/');

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).send('Server error');
      return;
    }

    // Filter out directories from the list of files
    const fileList = files.filter((file) =>
      fs.statSync(path.join(directoryPath, file)).isFile()
    );

    res.render('chooseTokenReport', {
      user: userDetails,
      fileList: fileList,
      companies: companies,
      companyName: companyName,
    });
  });
});

app.get('/chooseOTATV', async (req, res) => {
  const userDetails = {
    id: req.query.userId,
    name: req.query.userName,
    department: req.query.userDepartment,
    counter: req.query.counter,
    kioskId: req.query.kioskId,
    tokenNumber: req.query.tokenNumber,
  };

  const directoryPath = path.join(__dirname, '/src/uploads/OTAForTV/');

  const queryText4 = 'SELECT * FROM companies';
  const result4 = await client.query(queryText4);

  const companies = result4.rows;
  const companyName = companies[0]?.company_name;

  const queryText5 = 'SELECT * FROM waiting_room_displays';
  const result5 = await client.query(queryText5);

  const OTA = result5.rows;
  console.log('Waiting Romm Display:', OTA);

  const queryText6 = 'SELECT * FROM counterdisplay';
  const result6 = await client.query(queryText6);

  const counters = result6.rows;
  console.log('Counter Romm Display:', counters);

  const combinedData = [...OTA, ...counters];

  console.log('Combined Display Data:', combinedData);

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).send('Server error');
      return;
    }

    // Filter out directories from the list of files
    const fileList = files.filter((file) =>
      fs.statSync(path.join(directoryPath, file)).isFile()
    );

    res.render('chooseOTATV', {
      user: userDetails,
      fileList: fileList,
      companies: companies,
      companyName: companyName,
      combinedData: combinedData, // Send combined data to the view
    });
  });
});

app.post('/submitOTA', async (req, res) => {
  console.log('submit OTA request received.');

  try {
    const { filename, displayid, status } = req.body; // Extract values from the request body
    //console.log("Request Body:", req.body);

    // Validate required fields
    if (!filename || !displayid || !status) {
      console.log(
        'Validation failed: All fields (filename, displayid, status) are required.'
      );
      return res
        .status(400)
        .send('Filename, display ID, and status are required.');
    }

    // Check if the display ID already exists in the database
    //console.log("Checking if display ID exists in the database...");
    const checkQuery =
      'SELECT display_id FROM otadisplay WHERE display_id = $1';
    const checkResult = await client.query(checkQuery, [displayid]);
    //console.log("Check Query Result:", checkResult.rows);

    if (checkResult.rows.length > 0) {
      // If the display ID exists, update the record
      //console.log(`Display ID ${displayid} found. Updating entry...`);
      const updateQuery =
        'UPDATE otadisplay SET filename = $1, status = $2 WHERE display_id = $3';
      const updateResult = await client.query(updateQuery, [
        filename,
        status,
        displayid,
      ]);
      //console.log("Update Query Result:", updateResult);

      if (updateResult.rowCount > 0) {
        res.status(200).send('Filename updated successfully.');
      } else {
        //console.log("Update failed: No rows were affected.");
        res.status(500).send('Failed to update the record.');
      }
    } else {
      // If the display ID doesn't exist, insert a new record
      //console.log(`Display ID ${displayid} not found. Inserting new entry...`);
      const insertQuery =
        'INSERT INTO otadisplay (display_id, filename, status) VALUES ($1, $2, $3)';
      const insertResult = await client.query(insertQuery, [
        displayid,
        filename,
        status,
      ]);
      //console.log("Insert Query Result:", insertResult);

      if (insertResult.rowCount > 0) {
        res.status(200).send('Filename stored successfully.');
      } else {
        //console.log("Insert failed: No rows were affected.");
        res.status(500).send('Failed to insert the record.');
      }
    }
  } catch (err) {
    console.error('Error storing filename:', err);
    res.status(500).send('Server error: ' + err.message);
  }
});

app.post('/submitToken', async (req, res) => {
  console.log('submit token:');
  try {
    const { filename } = req.body; // Extract filename from the request body

    // Validate if filename exists
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    // Check if the filename already exists in the database
    const checkQuery = 'SELECT * FROM tokenreport';
    const checkResult = await client.query(checkQuery);

    if (checkResult.rows.length > 0) {
      // If the filename exists, update the existing entry
      const updateQuery = 'UPDATE tokenreport SET uploadlink = $1';
      await client.query(updateQuery, [filename]);
      res.status(200).send('Filename updated successfully.');
    } else {
      // If the filename doesn't exist, insert a new entry
      const insertQuery = 'INSERT INTO tokenreport (uploadlink) VALUES ($1)';
      await client.query(insertQuery, [filename]);
      res.status(200).send('Filename stored successfully.');
    }
  } catch (err) {
    console.error('Error storing filename:', err);
    res.status(500).send('Server error');
  }
});

app.post('/printerEditor', async (req, res) => {
  try {
    const { content, filename } = req.body; // Extract content and filename from the request body

    if (!content || !filename) {
      return res.status(400).send('Content and filename are required.');
    }

    // Ensure the directory exists
    const directoryPath = path.join(__dirname, '/src/uploads/printerReport/');
    ensureDirectoryExistence(directoryPath);

    // Define the file path with the provided filename
    const filePath = path.join(directoryPath, filename);

    // Write the content to the file
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Failed to save template.');
      } else {
        console.log('Template saved successfully:', filePath);
        res.status(200).send('Template saved successfully.');
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

const port = 2001;
server.listen(port, () => {
  console.log(`Server running at https://localhost:${port}`);
});

const HTTPSport = 2000;
app.listen(HTTPSport, () => {
  console.log(`Server running at http://localhost:${HTTPSport}`);
});

// Developed by GIRISH PAWAR & VISHAL PADYAL
