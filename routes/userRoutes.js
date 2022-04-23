const express = require("express");

const {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
} = require("./../controllers/userControllers");

const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  restrictTo,
  logout,
} = require("./../controllers/authControllers");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logout);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);

// router.use(protect); We can add this middleware to add protect to all the routes after this line

router.patch("/updatePassword", protect, updatePassword);

router.get("/me", protect, getMe, getUser);
router.patch("/updateMe", protect, uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete("/deleteMe", protect, deleteMe);

// router.use( restrictTo("admin")); We can add this middleware to add  restrictTo("admin") to all the routes after this line

router
  .route("/")
  .get(protect, restrictTo("admin"), getAllUsers)
  .post(protect, restrictTo("admin"), createUser);

router
  .route("/:id")
  .get(protect, restrictTo("admin"), getUser)
  .patch(protect, restrictTo("admin"), updateUser)
  .delete(protect, restrictTo("admin"), deleteUser);

module.exports = router;
