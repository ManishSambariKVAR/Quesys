let currentTokenNumber = 0;
let acknowledgmentStatus = false;
let progressBarAnimationRequest;
let modalDisplayed = false;

var current_bypass = false;

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



function handleCall() {
  acknowledgmentStatus = false;
  clearTimeout(window.timeoutHandle);

  // Increment count
  const currentCountSpan = document.getElementById("current");
  let currentCount = parseInt(currentCountSpan.innerText, 10) || 0;
  currentCount++;


  const prefix = document.getElementById("prefix").innerText;
  current_bypass = true;
  document.getElementById("generatedToken").innerText = prefix + currentCount;

  //current_bypass = true;

  currentCountSpan.innerText = currentCount;

  const callTime = new Date();
  document.getElementById("callTime").value = callTime.toISOString();
  document.getElementById("callTimeDisplay").innerText = formatTime(callTime);

  document.getElementById("acknowledge-button").disabled = false;
  document.getElementById("end-button").disabled = false;
  document.getElementById("acknowledge-button").classList.add("blink");
  document.getElementById("end-button").classList.add("blink");
  document.getElementById("call-button").disabled = true;

  const duration = getDuration();
  startProgressBar(duration);

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

  // Get values of input elements
  const USER = document.getElementById("USER_H").value;
  const USERN = document.getElementById("USERN_H").value;
  const DEP = document.getElementById("DEP_H").value;
  const KIOSK = document.getElementById("KIOSK_H").value;
  const COUNTER = document.getElementById("COUNT_H").value;

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
  document.getElementById("end-button").disabled = true;

  currentTokenNumber = document.getElementById("current").innerText;

  const data = {
    tokenNumber: currentTokenNumber,
    callTime: document.getElementById("callTime").value,
    endTime: document.getElementById("endTime").value,
    acknowledged: acknowledgmentStatus,
  };

  if (acknowledgmentStatus) {
    data.ackTime = document.getElementById("ackTime").value;
  }

  // Use the actual values retrieved above
  fetch(
    `/storeToken?userId=${USER}&userName=${USERN}&userDepartment=${DEP}&counter=${KIOSK}&kioskId=${COUNTER}`,
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

  resetProgressBar();

  var modal = document.getElementById("timeoutModal");
  console.log("1");
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
