const express = require("express");
const reviewRouter = require("./reviewRoutes");

const {
  checkId,
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  // checkBody,
  aliasTopTours,
  getToursStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages,
} = require("./../controllers/tourControllers");

const { protect, restrictTo } = require("./../controllers/authControllers");

const router = express.Router();

//POST /tours/222/reviews
//GET /tours/222/reviews
//GET /tours/222/reviews/3344

router.use("/:tourId/reviews", reviewRouter);

// router.param('id', checkId);
router.route("/top-5-cheap").get(aliasTopTours, getAllTours);

router.route("/tours-stats").get(getToursStats);
router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin", "lead-guide", "guide"), getMonthlyPlan);

// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(getToursWithin);

router.route("/distances/:latlng/unit/:unit").get(getDistances);

router
  .route("/")
  .get(getAllTours)
  // .post(checkBody ,createTour);
  .post(protect, restrictTo("admin", "lead-guide"), createTour);

router
  .route("/:id")
  .get(getTour)
  .patch(
    protect,
    restrictTo("admin", "lead-guide"),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(protect, restrictTo("admin", "lead-guide"), deleteTour);

module.exports = router;
