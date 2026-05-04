let currentTokenNumber = 0;
let acknowledgmentStatus = false;
let progressBarAnimationRequest;
let modalDisplayed = false;

var current_bypass = false;
var current_not_inc = false;

var call_en_recall =false;
var balance_check =false;

let timerInterval; // Holds the interval ID for the timer

function updateTimerDisplay(minutes, seconds) {
  document.getElementById('timer').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
  let seconds = 0;
  clearInterval(timerInterval); // Clear existing timer
  timerInterval = setInterval(() => {
    seconds++;
    const displayMinutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    updateTimerDisplay(displayMinutes, displaySeconds);
  }, 1000);
}

function resetAndStartTimer() {
  clearInterval(timerInterval); // Clear existing timer
  updateTimerDisplay(0, 0); // Reset timer display
  startTimer(); // Start the timer again
}

function stopAndResetTimer() {
  clearInterval(timerInterval); // Stop the timer
  updateTimerDisplay(0, 0); // Reset timer display
}

function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  const isPM = hours >= 12;
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return `${hours}:${minutes}:${seconds} ${isPM ? "PM" : "AM"}`;
}

function startProgressBar(duration) {
  console.log("Start Progress BAr");
  const elem = document.getElementById("myBar");
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsedTime = timestamp - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    elem.style.width = progress * 100 + "%";

    if (progress < 1) {
      progressBarAnimationRequest = requestAnimationFrame(animate);
    }
  }

  progressBarAnimationRequest = requestAnimationFrame(animate);
}

function resetProgressBar() {
  if (progressBarAnimationRequest) {
    cancelAnimationFrame(progressBarAnimationRequest);
  }
  var elem = document.getElementById("myBar");
  elem.style.width = "0%";
}

function getDuration() {
  const durationInput = document.getElementById("durationInput");
  const duration = parseInt(durationInput.value, 10) * 1000;
  return isNaN(duration) ? 90000 : duration;
}

function padNumberWithZeros(num, size) {
  let numStr = num.toString();
  while (numStr.length < size) {
      numStr = "0" + numStr;
  }
  return numStr;
}


function handleCall() {
  acknowledgmentStatus = false;
  clearTimeout(window.timeoutHandle);
  if(call_en_recall){
    balance_check= true;
  }
  call_en_recall= false ;
  // Increment count
  const currentCountSpan = document.getElementById("current");
  var currentCount;
  if(!current_not_inc){
    currentCount = parseInt(currentCountSpan.innerText, 10) || 0;
    currentCount++;
  }else{
    currentCount = parseInt(currentCountSpan.innerText, 10) || 0;
  }

  var prefix = document.getElementById("prefix").innerText;
  console.log("Prefix: " + prefix);

  if(prefix==""){
    prefix = document.getElementById("prefix_M").innerText
  }
  // const reassign = document.getElementById("prefix").innerText;
  current_bypass = true;
  document.getElementById("generatedToken").innerText = prefix + currentCount;
  document.getElementById("OPTR").innerText =  prefix + currentCount;
  const GEN = document.getElementById("generatedToken").innerText;
  console.log("GEBN token: " + GEN);
  //current_bypass = true;

  currentCountSpan.innerText = currentCount;

  const FnToken = padNumberWithZeros(currentCount,3); //eg: 001

  const callTime = new Date();
  document.getElementById("callTime").value = callTime.toISOString();
  document.getElementById("callTimeDisplay").innerText = formatTime(callTime);

  document.getElementById("acknowledge-button").disabled = false;
  document.getElementById("end-button").disabled = false;
  document.getElementById("acknowledge-button").classList.add("blink");
  document.getElementById("end-button").classList.add("blink");
  document.getElementById("call-button").disabled = true;
  
  const USER = document.getElementById("USER_H").value;
  const USERN = document.getElementById("USERN_H").value;
  const DEP = document.getElementById("DEP_H").value;
  const KIOSK = document.getElementById("KIOSK_H").value;
  const COUNTER = document.getElementById("COUNT_H").value;

  fetch(`/DISPLAY?userId=${USER}&userName=${USERN}&userDepartment=${DEP}&counter=${COUNTER}&kioskId=${KIOSK}&tokenNumber=${prefix + FnToken}&tokenNumber2=${currentCount}`, {
    method: 'POST', // or 'GET'
    headers: {
      'Content-Type': 'application/json',
      // You may need to include additional headers based on your server requirements
    },
    body: JSON.stringify({ data: 'your data payload' }), // if you need to send data
  })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      // Handle the response data as needed
    })
    .catch((error) => {
      console.error('Error:', error);
      // Handle errors here
    });

  const duration = getDuration();
  startProgressBar(duration);
  startTimer(); // Start the timer on call
  //document.getElementById("call-button").disabled = true;

  window.timeoutHandle = setTimeout(function () {
    if (!acknowledgmentStatus) {
      showModal();
    }
  }, duration);
}

function handleAcknowledge() {
  if (!acknowledgmentStatus) {
    const ackTime = new Date();
    document.getElementById("ackTime").value = ackTime.toISOString();
    document.getElementById("acknowledgeTimeDisplay").innerText =
      formatTime(ackTime);

    acknowledgmentStatus = true;
  }

  document.getElementById("acknowledge-button").classList.remove("blink");
  document.getElementById("end-button").classList.add("blink");
  document.getElementById("acknowledge-button").disabled = true;
  

  resetProgressBar();
  resetAndStartTimer(); // Reset and restart the timer on acknowledge
  clearTimeout(window.timeoutHandle);

}

function addTime(additionalTime) {
  clearTimeout(window.timeoutHandle);
  resetProgressBar();

  window.timeoutHandle = setTimeout(function () {
    if (!acknowledgmentStatus) {
      showModal();
    }
  }, additionalTime);
}

function handleEnd() {
  const endTime = new Date();
  balance_check = false;
  clearTimeout(window.timeoutHandle);
  // Get values of input elements
  const USER = document.getElementById("USER_H").value;
  const USERN = document.getElementById("USERN_H").value;
  const DEP = document.getElementById("DEP_H").value;
  const KIOSK = document.getElementById("KIOSK_H").value;
  const COUNTER = document.getElementById("COUNT_H").value;
  var prefix = document.getElementById("prefix").innerText;
  if(prefix==""){
    prefix = document.getElementById("prefix_M").innerText
  }
  console.log("Prefix: "+ prefix);

  const callTimeDisplay = document.getElementById("callTimeDisplay");
  const acknowledgeTimeDisplay = document.getElementById(
    "acknowledgeTimeDisplay"
  );
  const endTimeDisplay = document.getElementById("endTimeDisplay");

  document.getElementById("endTime").value = endTime.toISOString();
  endTimeDisplay.innerText = formatTime(endTime);

  setTimeout(function () {
    if (callTimeDisplay) callTimeDisplay.innerText = "00:00:00 AM";
    if (acknowledgeTimeDisplay)
      acknowledgeTimeDisplay.innerText = "00:00:00 AM";
    if (endTimeDisplay) endTimeDisplay.innerText = "00:00:00 AM";
  }, 2000);

  document.getElementById("acknowledge-button").classList.remove("blink");
  document.getElementById("end-button").classList.remove("blink");
  document.getElementById("call-button").disabled = false;
  document.getElementById("end-button").disabled = true;
  document.getElementById("acknowledge-button").disabled = true;

  currentTokenNumber = document.getElementById("current").innerText;

  const data = {
    tokenNumber: currentTokenNumber,
    callTime: document.getElementById("callTime").value,
    endTime: document.getElementById("endTime").value,
    acknowledged: acknowledgmentStatus,
    prefix: prefix,
  };

  if (acknowledgmentStatus) {
    data.ackTime = document.getElementById("ackTime").value;
  }
  document.getElementById("prefix").innerText = document.getElementById("prefix_M").innerText
  // Use the actual values retrieved above
  fetch(
    `/storeToken?userId=${USER}&userName=${USERN}&userDepartment=${DEP}&counter=${COUNTER}&kioskId=${KIOSK}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });

    

  acknowledgmentStatus = false;

  current_bypass = false;
  current_not_inc = false;
  call_en_recall= false ;

  resetProgressBar();
  stopAndResetTimer(); // Stop and reset the timer on end
  var modal = document.getElementById("timeoutModal");
  //console.log("1");
  var span = document.getElementById("end-button");
  modal.style.display = "block";

  if (span) {
    modal.style.display = "none";
  }
}

window.timeoutHandle = setTimeout(function () {
  if (!acknowledgmentStatus) {
    showModal();
  }
}, duration);

function showModal() {
  var modal = document.getElementById("timeoutModal");
  var span = document.getElementsByClassName("close")[0];

  modal.style.display = "block";

  span.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

function handelRecall(token_id, prefix) {
  console.log("Re-call Called");
  console.log(token_id);

  current_not_inc = true;
  call_en_recall = true;

  document.getElementById("current").innerText = token_id;
  document.getElementById("generatedToken").innerText = prefix + token_id;

  document.getElementById("OPTR").innerText =  prefix + token_id;

  document.getElementById("prefix").innerText = prefix;

  current_bypass = true;
  const USER = document.getElementById("USER_H").value;
  const USERN = document.getElementById("USERN_H").value;
  const DEP = document.getElementById("DEP_H").value;
  const KIOSK = document.getElementById("KIOSK_H").value;
  const COUNTER = document.getElementById("COUNT_H").value;
  // document.getElementById("prefix").innerText = document.getElementById("prefix_M").innerText
  fetch(`/Recall?userId=${USER}&userName=${USERN}&userDepartment=${DEP}&counter=${COUNTER}&kioskId=${KIOSK}&tokenNumber=${token_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      console.log("Recall response:", data);
      // Handle success response here if needed
    })
    .catch((error) => {
      console.error("Error:", error);
      // Handle error here
    });
}





