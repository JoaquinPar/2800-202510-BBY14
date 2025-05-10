/**
 * lockAccount resets inputs and disabled inputs
 */
function lockAccount() {
  // Clear unsaved inputs on page load (refresh doesnt clear them)
  document.getElementById("account-form").reset();

  document.getElementById("save-account").disabled = true;
  document.getElementById("email").disabled = true;
  document.getElementById("name").disabled = true;
  document.getElementById("password").disabled = true;
  document.getElementById("repassword").disabled = true;
  document.getElementById("save-account").classList.add("cursor-not-allowed");

  document.getElementById("edit-account").innerHTML = "Edit";
  document.getElementById("edit-account").onclick = unlockAccount;
}

/**
 * lockPersonal resets inputs and disabled inputs
 */
function lockPersonal() {
  // Clear unsaved inputs on page load (refresh doesnt clear them)
  document.getElementById("personal-form").reset();

  document.getElementById("save-personal").disabled = true;
  document.getElementById("dob").disabled = true;
  document.getElementById("education").disabled = true;
  document.getElementById("ms-single").disabled = true;
  document.getElementById("ms-married").disabled = true;
  document.getElementById("ms-divorced").disabled = true;
  document.getElementById("ms-widowed").disabled = true;
  document.getElementById("save-personal").classList.add("cursor-not-allowed");

  document.getElementById("edit-personal").innerHTML = "Edit";
  document.getElementById("edit-personal").onclick = unlockPersonal;
}

/**
 * unlockAccount removes disabled from inputs and
 * allows users to edit their profile.
 */
function unlockAccount() {
  document.getElementById("save-account").disabled = false;
  // document.getElementById("email").disabled = false;
  document.getElementById("name").disabled = false;
  document.getElementById("password").disabled = false;
  document.getElementById("repassword").disabled = false;
  document.getElementById("save-account").classList.remove("cursor-not-allowed");

  document.getElementById("edit-account").innerHTML = "Cancel changes";
  document.getElementById("edit-account").onclick = lockAccount;
}

/**
 * unlocPersonal removes disabled from inputs and
 * allows users to edit their personal information.
 */
function unlockPersonal() {
  document.getElementById("save-personal").disabled = false;
  document.getElementById("dob").disabled = false;
  document.getElementById("education").disabled = false;
  document.getElementById("ms-single").disabled = false;
  document.getElementById("ms-married").disabled = false;
  document.getElementById("ms-divorced").disabled = false;
  document.getElementById("ms-widowed").disabled = false;
  document.getElementById("save-personal").classList.remove("cursor-not-allowed");

  document.getElementById("edit-personal").innerHTML = "Cancel changes";
  document.getElementById("edit-personal").onclick = lockPersonal;
}

// On page load, ensure forms are locked and reset
lockAccount();
// lockPersonal();
