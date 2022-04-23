import axios from "axios";
import { showAlert } from "./alert";

export const login = (email, password) => {
  axios
    .post("/api/v1/users/login", {
      email,
      password,
    })
    .then(function (res) {
      if (res.data.status === "success") {
        document.cookie = `jwt=${res.data.token}`;
        showAlert("success", "Logged in successfully!");
        window.setTimeout(() => location.assign("/"), 1500);
      }
    })
    .catch(function (error) {
      showAlert("error", error.response.data.message);
    });
};

export const logout = () => {
  axios
    .get("/api/v1/users/logout")
    .then(function (res) {
      if (res.data.status === "success") {
        document.cookie = `jwt=logout`;
        location.reload(true);
      }
    })
    .catch(function (error) {
      showAlert("error", error.response.data.message);
    });
};
