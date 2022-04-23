const express = require("express");

const { protect, restrictTo } = require("./../controllers/authControllers");
const {
  getAllReview,
  createReview,
  deleteReview,
  updateReview,
  getReview,
  setTourUserIds,
} = require("./../controllers/reviewControllers");

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route("/")
  .get(getAllReview)
  .post(restrictTo("user"), setTourUserIds, createReview);

router
  .route("/:id")
  .get(getReview)
  .patch(restrictTo("admin", "user"), updateReview)
  .delete(restrictTo("admin", "user"), deleteReview);

module.exports = router;
