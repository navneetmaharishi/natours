const mongoose = require("mongoose");
const Tour = require("./toursModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "review can not be empty"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a User"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// This creating Tour population which is causing extra query and bad for the performance
// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "tour",
//     select: "name",
//   }).populate({
//     path: "user",
//     select: "name photo",
//   });
//   next();
// });

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

reviewSchema.statics.calcAverageRating = async function (tourId) {
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  await Tour.findByIdAndUpdate(tourId, {
    rattingsQunatity: stats[0].nRating,
    rattingsAverage: stats[0].avgRating,
  });
};

reviewSchema.post("save", function () {
  // this points to current review
  this.constructor.calcAverageRating(this.tour);
});

// findByIdAndUpdate
// findByIdAndUDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does not work here, query has already executed
  await this.r.constructor.calcAverageRating(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
