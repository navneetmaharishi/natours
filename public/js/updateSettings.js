import axios from "axios";
import { showAlert } from "./alert";

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  const url =
    type === "password"
      ? "http://127.0.0.1:3000/api/v1/users/updatePassword"
      : "http://127.0.0.1:3000/api/v1/users/updateMe";
  axios
    .patch(url, data)
    .then(function (res) {
      if (res.data.status === "success") {
        showAlert("success", `${type.toUpperCase()} updated successfully!`);
      }
    })
    .catch(function (error) {
      showAlert("error", error.response.data.message);
    });
};
