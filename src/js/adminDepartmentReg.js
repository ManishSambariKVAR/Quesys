let counter = 1;

function copyText() {
  var department = document.getElementById("inputDepartment").value;
  var isCheckboxChecked = document.getElementById("checkbox").checked;
  var display = isCheckboxChecked
    ? document.getElementById("inputDisplay").value
    : "";

  if (!department.trim()) {
    alert("Please fill the Department field.");
    return;
  }

  var newInputContainer = document.createElement("div");
  newInputContainer.classList.add("input-container");
  newInputContainer.style.marginTop = "10px";
  newInputContainer.style.marginRight = "10px";
  newInputContainer.style.display = "flex";
  newInputContainer.style.gap = "10px";

  var hiddenSerialNumber = document.createElement("input");
  hiddenSerialNumber.type = "hidden";
  hiddenSerialNumber.name = "serialNumber[]";
  hiddenSerialNumber.value = counter++;
  newInputContainer.appendChild(hiddenSerialNumber);

  var newDepartmentInput = document.createElement("input");
  newDepartmentInput.type = "text";
  newDepartmentInput.name = "department[]";
  newDepartmentInput.value = department;
  newDepartmentInput.style.textAlign = "center";
  newDepartmentInput.style.width = "80px";
  newDepartmentInput.readOnly = true;
  newInputContainer.appendChild(newDepartmentInput);

  var newDepartmentPrefixInput = document.createElement("input");
  newDepartmentPrefixInput.type = "text";
  newDepartmentPrefixInput.name = "depPrefix[]";
  newDepartmentPrefixInput.value =
    document.getElementById("inputDepPrefix").value;
  newDepartmentPrefixInput.style.textAlign = "center";
  newDepartmentPrefixInput.style.width = "80px";
  newDepartmentPrefixInput.readOnly = true;
  newInputContainer.appendChild(newDepartmentPrefixInput);

  var newKioskKeyInput = document.createElement("input");
  newKioskKeyInput.type = "text";
  newKioskKeyInput.name = "kioskKey[]";
  newKioskKeyInput.value = document.getElementById("inputKioskKey").value;
  newKioskKeyInput.style.textAlign = "center";
  newKioskKeyInput.style.width = "80px";
  newKioskKeyInput.readOnly = true;
  newInputContainer.appendChild(newKioskKeyInput);

  var newCheckbox = document.createElement("input");
  newCheckbox.type = "checkbox";
  newCheckbox.checked = isCheckboxChecked;
  newCheckbox.disabled = true;
  newCheckbox.style.background = "none";
  newInputContainer.appendChild(newCheckbox);
  var newDisplayInput = document.createElement("input");
  newDisplayInput.type = "text";
  newDisplayInput.name = "display[]";
  newDisplayInput.value = display;
  newDisplayInput.style.textAlign = "center";
  newDisplayInput.style.width = "80px";
  newDisplayInput.readOnly = true;
  newDisplayInput.placeholder = "No Display Allocated";
  newInputContainer.appendChild(newDisplayInput);

  var newBuzzerInput = document.createElement("input");
  newBuzzerInput.type = "text";
  newBuzzerInput.name = "buzzer[]";
  newBuzzerInput.value = document.getElementById("inputBuzzer").value;
  newBuzzerInput.style.textAlign = "center";
  newBuzzerInput.style.width = "80px";
  newBuzzerInput.readOnly = true;
  newInputContainer.appendChild(newBuzzerInput);

  var newBuzzerTimeInput = document.createElement("input");
  newBuzzerTimeInput.type = "text";
  newBuzzerTimeInput.name = "buzzerTime[]";
  newBuzzerTimeInput.value = document.getElementById("inputBuzzerTime").value;
  newBuzzerTimeInput.style.textAlign = "center";
  newBuzzerTimeInput.style.width = "80px";
  newBuzzerTimeInput.readOnly = true;
  newInputContainer.appendChild(newBuzzerTimeInput);

  var newFlashInput = document.createElement("input");
  newFlashInput.type = "text";
  newFlashInput.name = "flash[]";
  newFlashInput.value = document.getElementById("inputFlash").value;
  newFlashInput.style.textAlign = "center";
  newFlashInput.style.width = "80px";
  newFlashInput.readOnly = true;
  newInputContainer.appendChild(newFlashInput);

  var container = document.getElementById("newTextBoxesContainer");
  container.appendChild(newInputContainer);

  document.getElementById("inputDepartment").value = "";
  document.getElementById("inputDisplay").value = "";
  document.getElementById("inputKioskKey").value = "";
  document.getElementById("inputBuzzer").value = "";
  document.getElementById("inputBuzzerTime").value = "";
  document.getElementById("inputFlash").value = "";
  document.getElementById("inputDepPrefix").value = "";
  document.getElementById("checkbox").checked = false;
}

document
  .getElementById("nextToDisplayButton")
  .addEventListener("click", copyText);

document.addEventListener("DOMContentLoaded", function () {
  const checkbox = document.getElementById("checkbox");
  const displayInput = document.getElementById("inputDisplay");
  const depPrefixInput = document.getElementById("inputDepPrefix");
  const buzzerInput = document.getElementById("inputBuzzer");
  const buzzerTimeInput = document.getElementById("inputBuzzerTime");
  const flashInput = document.getElementById("inputFlash");

  displayInput.disabled = true;
  depPrefixInput.disabled = true;
  buzzerInput.disabled = true;
  buzzerTimeInput.disabled = true;
  flashInput.disabled = true;

  // Add event listener to checkbox
  checkbox.addEventListener("change", function () {
    if (this.checked) {
      // Enable the other input boxes when the checkbox is checked
      displayInput.disabled = false;
      depPrefixInput.disabled = false;
      buzzerInput.disabled = false;
      buzzerTimeInput.disabled = false;
      flashInput.disabled = false;
    } else {
      // Disable the other input boxes when the checkbox is unchecked
      displayInput.disabled = true;
      depPrefixInput.disabled = true;
      buzzerInput.disabled = true;
      buzzerTimeInput.disabled = true;
      flashInput.disabled = true;
    }
  });
});
