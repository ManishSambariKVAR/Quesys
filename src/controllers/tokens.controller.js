const tokensService = require('../services/tokens.service');
const axios = require('axios');
const {
  getCurrentDate,
  padNumberWithZeros,
  getFileContentsSync,
  replaceSpecialForDate,
  replaceSpecialForToken,
  splitToken,
} = require('../utils/helpers');

const stacks = new Map();

const CounterCurrentstacks = new Map();
const VoiceStacks = [];

function pushToStack(grievance, token) {
  if (!stacks.has(grievance)) {
    stacks.set(grievance, []);
  }
  stacks.get(grievance).push(token);
}

function pushToStackCounter(grievance, token) {
  if (!CounterCurrentstacks.has(grievance)) {
    CounterCurrentstacks.set(grievance, []);
  } else {
    CounterCurrentstacks.set(grievance, []);
  }
  CounterCurrentstacks.get(grievance).push(token);
}

function pushToVoiceStack(token) {
  VoiceStacks.push(token);
}

function popFromAnyStack(value) {
  const normalizedValue = value.replace('*', '');
  for (const [grievance, stack] of stacks.entries()) {
    const index = stack.findIndex((token) => {
      if (typeof token === 'string' && token.includes('-')) {
        const [, suffix] = token.split('-');
        if (suffix) {
          return suffix.replace('*', '') === normalizedValue;
        }
      }
      return false;
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

function getAllCounterStack() {
  const allStacks = {};
  CounterCurrentstacks.forEach((value, key) => {
    allStacks[key] = value;
  });
  return allStacks;
}

function getAllVoiceStacks() {
  return VoiceStacks;
}

function checkAndPop() {
  const checkInterval = setInterval(() => {
    if (VoiceStacks.length > 0) {
      clearInterval(checkInterval);
      setTimeout(() => {
        const poppedElement = VoiceStacks.shift();
        checkAndPop();
      }, 10000);
    }
  }, 1000);
}
checkAndPop();

// ==========================================
// ROUTES
// ==========================================

async function generateToken(req, res) {
  try {
    const { key, counter, kioskId, priority, grevience, tokenType, info } =
      req.query;

    const currDt = getCurrentDate();
    let TokenType = tokenType;

    // Fetch department
    const extracted = await tokensService.getDepartmentByKioskAndKey(
      kioskId,
      key
    );

    if (!extracted) {
      return res.send('ERR');
    }

    // Get daily count
    const dailyCount = await tokensService.getDailyTokenCount(
      kioskId,
      extracted.department,
      currDt
    );

    const tokenReport = await tokensService.getTokenReport();

    const main = '/src/uploads/printerReport/';
    let file_got = getFileContentsSync(tokenReport.uploadlink, main);

    let newCount;

    if (dailyCount) {
      newCount = dailyCount.token_total_count + 1;

      const parsedInfo = JSON.parse(info?.replace(/'/g, '"') || 'null');

      await tokensService.insertTokenLog({
        userId: 0,
        tokenId: newCount,
        dep: extracted.department,
        kioskId,
        priority,
        info: parsedInfo,
      });

      await tokensService.updateDailyTokenCount(
        kioskId,
        extracted.department,
        currDt,
        newCount
      );

      const file_got1 = replaceSpecialForDate(file_got);
      const final_new_count = padNumberWithZeros(newCount, 3);

      const replacedString = replaceSpecialForToken(
        file_got1,
        extracted.dep + final_new_count
      );

      const stackValue =
        TokenType +
        '-' +
        extracted.dep +
        final_new_count +
        (priority === 'True' ? '*' : '');

      pushToStack(extracted.department + '-' + counter, stackValue);

      const responseText = `DEP: ${extracted.department} , CurrToken:${extracted.dep}${final_new_count} , Print:${replacedString}`;

      res.set('Content-Type', 'text/plain').send(responseText);
    } else {
      stacks.clear();
      CounterCurrentstacks.clear();

      const parsedInfo = JSON.parse(info?.replace(/'/g, '"') || 'null');

      await tokensService.insertTokenLog({
        userId: 0,
        tokenId: 1,
        dep: extracted.department,
        kioskId,
        priority,
        info: parsedInfo,
      });

      await tokensService.insertDailyTokenCount(
        kioskId,
        extracted.department,
        currDt
      );

      const file_got1 = replaceSpecialForDate(file_got);
      const final_new_count = padNumberWithZeros(1, 3);

      const replacedString = replaceSpecialForToken(
        file_got1,
        extracted.dep + final_new_count
      );

      const stackValue =
        TokenType +
        '-' +
        extracted.dep +
        final_new_count +
        (priority === 'True' ? '*' : '');

      pushToStack(extracted.department, stackValue);

      const responseText = `DEP: ${extracted.department} , CurrToken: ${extracted.dep}${final_new_count} , Print:${replacedString}`;

      res.set('Content-Type', 'text/plain').send(responseText);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

async function checkStack(req, res) {
  try {
    const currDt = getCurrentDate();
    const stackAll = getAllStacks();
    const counterStack = getAllCounterStack();
    const voice = getAllVoiceStacks();
    const totalToken = await tokensService.getTotalTokenCount(currDt);

    res.status(200).send({
      allStacks: stackAll,
      counterStacks: counterStack,
      voiceStack: voice,
      totalToken: totalToken,
    });
  } catch (error) {
    console.error('Error retrieving stacks:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
}

async function storeToken(req, res) {
  try {
    const { tokenNumber, callTime, endTime, prefix, ackTime, acknowledged } =
      req.body;
    const { userId, userDepartment, kioskId, counter } = req.query;
    const currDt = getCurrentDate();

    const log = await tokensService.processStoreTokenLogic({
      tokenNumber,
      callTime,
      endTime,
      ackTime,
      acknowledged,
      userId,
      department: userDepartment,
      kioskId,
      counter,
      currDt,
      prefix,
    });

    res.json({
      message: 'Token log saved successfully',
      log: log,
    });
  } catch (error) {
    console.error('Error storing token:', error);
    res.status(500).send('Server error');
  }
}

async function displayToken(req, res) {
  try {
    const {
      userId,
      userName,
      userDepartment,
      counter,
      kioskId,
      tokenNumber,
      tokenNumber2,
      priority,
    } = req.query;
    const currDt = getCurrentDate();

    const data = await tokensService.getCounterDisplay(counter);
    const resultgetPriority = await tokensService.getTokenLogById(
      tokenNumber2,
      userDepartment,
      currDt
    );

    const final_new_count = padNumberWithZeros(tokenNumber, 3);
    const priorityData = resultgetPriority || { priority: null };

    if (priorityData.priority) {
      pushToStackCounter(userDepartment + '-' + counter, tokenNumber + '*');
      pushToVoiceStack(counter + '-' + tokenNumber + '*');
      popFromAnyStack(tokenNumber + '*');
    } else {
      pushToStackCounter(userDepartment + '-' + counter, tokenNumber);
      pushToVoiceStack(counter + '-' + tokenNumber);
      popFromAnyStack(tokenNumber);
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
      priorityData.priority;

    await tokensService.updateDisplayTokensDaily(
      tokenNumber2,
      userId,
      userDepartment,
      kioskId,
      currDt,
      final_new_count
    );

    try {
      await axios.get(URL);
    } catch (error) {
      console.error('Hardware Display ping failed');
    }

    res.send('OK');
  } catch (error) {
    console.error('Error displaying token:', error);
    res.status(500).send('Server error');
  }
}

async function recallToken(req, res) {
  try {
    const { userId, userDepartment, counter, kioskId, tokenNumber } = req.query;
    const currDt = getCurrentDate();

    await tokensService.updateRecallStatus(
      kioskId,
      userDepartment,
      currDt,
      tokenNumber
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling recall:', error);
    res.status(500).json({ success: false, error: 'Error handling recall' });
  }
}

async function reassignToken(req, res) {
  try {
    const { tokenId2, logId, ReassignDepT, ReassignDepF } = req.body;
    const { userId, userName, userDepartment, counter, kioskId } = req.query;
    const currDt = getCurrentDate();

    await tokensService.processReassignToken({
      tokenId: tokenId2,
      logId,
      departmentTo: ReassignDepT,
      departmentFrom: ReassignDepF,
      userId,
      kioskId,
      currDt,
    });

    res.json({ success: true, message: 'Token reassigned successfully' });
  } catch (error) {
    console.error('Error reassigning token:', error);
    res.status(500).json({ success: false, error: 'Error reassigning token' });
  }
}

module.exports = {
  generateToken,
  checkStack,
  storeToken,
  displayToken,
  recallToken,
  reassignToken,
};
