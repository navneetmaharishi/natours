const express = require("express");
const {
  getOverview,
  getTour,
  getLoginForm,
  getAccount,
} = require("../controllers/viewsControllers");

const { isLoggedIn, protect } = require("../controllers/authControllers");

const router = express.Router();

router.get("/",isLoggedIn, getOverview);
router.get("/tour/:slug",isLoggedIn, getTour);
router.get("/login",isLoggedIn, getLoginForm);
router.get("/me", protect, getAccount);

module.exports = router;
