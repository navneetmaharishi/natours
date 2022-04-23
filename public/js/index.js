import "@babel/polyfill";
import { login, logout } from "./login";
import { updateSettings } from "./updateSettings";

// DOM element
const submitButton = document.querySelector(".form--login");
const logoutButton = document.querySelector(".nav__el--logout");
const userDataForm = document.querySelector(".form-user-data");
const userPasswordForm = document.querySelector(".form-user-password");

submitButton &&
  submitButton.addEventListener("submit", (e) => {
    e.preventDefault();
    let email = document.getElementById("email").value,
      password = document.getElementById("password").value;

    login(email, password);
  });

logoutButton && logoutButton.addEventListener("click", logout);

userDataForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData();

  form.append("name", document.getElementById("name").value);
  form.append("email", document.getElementById("email").value);
  form.append("photo", document.getElementById("photo").files[0]);

  updateSettings(form, "data");
});

userPasswordForm &&
  userPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelector(".btn--save-password").textContent = "Updating...";

    let currentPassword = document.getElementById("password-current").value,
      password = document.getElementById("password").value,
      passwordConfirm = document.getElementById("password-confirm").value;

    await updateSettings(
      { currentPassword, password, passwordConfirm },
      "password"
    );

    document.querySelector(".btn--save-password").textContent = "Save password";

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });
