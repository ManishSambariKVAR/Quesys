const fs = require('fs');
const path = require('path');

function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function padNumberWithZeros(num, size) {
  let numStr = num.toString();
  while (numStr.length < size) {
    numStr = '0' + numStr;
  }
  return numStr;
}

function findAvailableCounters(allCounters, allUsers) {
  const usedCounters = allUsers.map((user) => user.counter);

  if (usedCounters.includes('undefined')) {
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
function calculateTimeDifference(prevInterval, currentInterval) {
  const prevMilliseconds =
    prevInterval.seconds * 1000 + (prevInterval.milliseconds || 0);
  const currentMilliseconds =
    currentInterval.seconds * 1000 + (currentInterval.milliseconds || 0);
  const diffMilliseconds = currentMilliseconds - prevMilliseconds;
  const diffSeconds = Math.floor(diffMilliseconds / 1000);
  const remainingMilliseconds = diffMilliseconds % 1000;
  return { seconds: diffSeconds, milliseconds: remainingMilliseconds };
}

function ensureDirectoryExistence(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function getFileContentsSync(filename, main) {
  try {
    const directoryPath = path.join(__dirname, '..', '..', main); // Adjusted for moving to utils folder
    const fullPath = path.join(directoryPath, filename);
    let fileContents = fs.readFileSync(fullPath, 'utf8');
    return fileContents.replace(/\n/g, '');
  } catch (err) {
    throw err;
  }
}

function replaceSpecialForDate(inputString) {
  const regex = /\{\{([^}]+)\}\}/g;
  return inputString.replace(regex, (match, value) => {
    if (value.match(/^[0-9A-Fa-f]+$/)) {
      return String.fromCharCode(parseInt(value, 16));
    }
    switch (value) {
      case 'DD/MM/YYYY':
        return new Date()
          .toISOString()
          .slice(0, 10)
          .split('-')
          .reverse()
          .join('/');
      case 'DD/MM/YY':
        return new Date()
          .toLocaleDateString('en-GB')
          .slice(0, 8)
          .split('/')
          .reverse()
          .join('/');
      case 'YYYY/MM/DD':
        return new Date().toISOString().slice(0, 10);
      case 'YY/MM/DD':
        return new Date().toISOString().slice(2, 10);
      case 'HH:MM':
        return new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'HH:MM:SS':
        return new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      default:
        return '{{' + value + '}}';
    }
  });
}

function replaceSpecialForToken(inputString, tokenNo) {
  const regex = /\{\{([^}]+)\}\}/g;
  return inputString.replace(regex, (match, value) => {
    switch (value) {
      case 'TOKEN':
        return tokenNo;
      default:
        return '{{' + value + '}}';
    }
  });
}

function replaceSpecialForSummary(inputString, data) {
  const regex = /\{\{([^}]+)\}\}/g;
  return inputString.replace(regex, (match, value) => {
    if (value === 'TotalAll') {
      return data.reduce((sum, item) => sum + item.token_total_count, 0);
    }
    const [findDep, replaceValue] = value.split(',').map((v) => v.trim());
    const foundData = data.find((item) => item.dep === findDep);
    if (!foundData) return match;
    if (replaceValue === 'Name') return foundData.dep;
    if (replaceValue === 'total') return foundData.token_total_count;
    return match;
  });
}

function splitToken(tokenNumber) {
  const matches = tokenNumber.match(/^([a-zA-Z]*)\s*(\d+)$/);
  if (matches) {
    return { prefix: matches[1] || ' ', number: matches[2] };
  } else {
    throw new Error('Invalid token format');
  }
}

module.exports = {
  getCurrentDate,
  getCurrentTime,
  padNumberWithZeros,
  findAvailableCounters,
  calculateTimeDifference,
  ensureDirectoryExistence,
  getFileContentsSync,
  replaceSpecialForDate,
  replaceSpecialForToken,
  replaceSpecialForSummary,
  splitToken,
};
