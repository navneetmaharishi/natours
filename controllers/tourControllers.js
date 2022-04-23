const multer = require("multer");
const sharp = require("sharp");

const Tour = require("./../models/toursModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFacroty");
const AppError = require("../utils/appError");
// const APIFeatures = require("../utils/apiFeatures");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

// upload.single("image"); // req.file
// upload.array("images", 5); // req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  console.log(req.body)
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: "reviews" });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   console.log("query=>", req.query);
//   const featured = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await featured.query;

//   // send response
//   res.status(200).json({
//     status: "success",
//     requestedAt: req.requestTime,
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params,
//     tour = await Tour.findById(id).populate("reviews");

//   if (!tour) return next(new AppError("No tour found with that ID", 404));

//   res.status(200).json({
//     status: "success",
//     data: {
//       tour,
//     },
//   });
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(200).json({
//     status: "success",
//     data: {
//       tour: newTour,
//     },
//   });
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const tour = await Tour.findByIdAndUpdate(id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) return next(new AppError("No tour found with that ID", 404));

//   res.status(200).json({
//     status: "success",
//     data: {
//       tour,
//     },
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const tour = await Tour.findByIdAndDelete(id);
//   if (!tour) return next(new AppError("No tour found with that ID", 404));

//   res.status(204).json({
//     status: "sucess",
//     data: null,
//   });
// });

exports.getToursStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { rattingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // _id: null,
        _id: "$difficulty",
        // _id: "$rattingsAverage",
        // _id: {$toUpper: "$difficulty"},
        numTours: { $sum: 1 },
        numRatings: { $sum: "$rattingsQunatity" },
        avgRating: { $avg: "$rattingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: {_id: {$ne: 'EASY'}}
    // },
  ]);
  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitide in the format lat,lan"
      )
    );

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitide in the format lat,lan"
      )
    );

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      data: distances,
    },
  });
});

// exports.getAllTours = async (req, res) => {
//   try {
//     // find as in mongoDB query
//     // req.query return a object
//     // const tours = await Tour.find({
//     //   duration: 5,
//     //   difficulty: 'easy',
//     // });

//     // build query
//     // // 1 A) Filtering
//     // const queryObj = { ...req.query };
//     // const excludedFields = ["page", "sort", "limit", "fields"];
//     // excludedFields.forEach((el) => delete queryObj[el]);

//     // // 1 B) Advance filtering
//     // let queryStr = JSON.stringify(queryObj);
//     // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

//     // let query = Tour.find(JSON.parse(queryStr));

//     // 2 Sorting
//     // if (req.query.sort) {
//     //   const sortBy = req.query.sort.split(",").join(" ");
//     //   query = query.sort(sortBy);
//     // } else {
//     //   query = query.sort("-createdAt");
//     // }

//     // 3 Field limiting
//     // if (req.query.fields) {
//     //   const fields = req.query.fields.split(",").join(" ");
//     //   query = query.select(fields);
//     // } else {
//     //   query = query.select("-__v");
//     // }

//     // 4 Pagination
//     // const page = req.query.page * 1 || 1;
//     // const limit = req.query.limit * 1 || 100;
//     // const skip = (page - 1) * limit;

//     // query = query.skip(skip).limit(limit);

//     // if (req.query.page) {
//     //   const numTours = await Tour.countDocuments();
//     //   if (skip >= numTours) throw new Error("This page does not exist");
//     // }

//     // const query = Tour.find()
//     //   .where("duration")
//     //   .equals(5)
//     //   .where("difficulty")
//     //   .equals("easy");

//     // execute query
//     const featured = new APIFeatures(Tour.find(), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     const tours = await featured.query;
//     // const tours = await query;
//     // query.sort().select().skip().limit()

//     // send response
//     res.status(200).json({
//       status: "success",
//       requestedAt: req.requestTime,
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     console.log("hello ji");
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// *********

// exports.getTour = async (req, res) => {
//   try {
//     const { id } = req.params,
//       tour = await Tour.findById(id);
//     // findById this method is provided by mongooes
//     // same as Tour.findOne({_id : id}) in mongoDB qyery

//     res.status(200).json({
//       status: "success",
//       data: {
//         tour,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// exports.createTour = async (req, res) => {
//   try {
//     // const tour = new Tour({});
//     // tour.save();
//     const newTour = await Tour.create(req.body);

//     res.status(200).json({
//       status: "success",
//       data: {
//         tour: newTour,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// exports.updateTour = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const tour = await Tour.findByIdAndUpdate(id, req.body, {
//       new: true,
//       runValidators: true,
//     });
//     res.status(200).json({
//       status: "success",
//       data: {
//         tour,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// exports.deleteTour = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Tour.findByIdAndDelete(id);
//     res.status(204).json({
//       status: "sucess",
//       data: null,
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// exports.getToursStats = async (req, res) => {
//   try {
//     const stats = await Tour.aggregate([
//       {
//         $match: { rattingsAverage: { $gte: 4.5 } },
//       },
//       {
//         $group: {
//           // _id: null,
//           _id: "$difficulty",
//           // _id: "$rattingsAverage",
//           // _id: {$toUpper: "$difficulty"},
//           numTours: { $sum: 1 },
//           numRatings: { $sum: "$rattingsQunatity" },
//           avgRating: { $avg: "$rattingsAverage" },
//           avgPrice: { $avg: "$price" },
//           minPrice: { $min: "$price" },
//           maxPrice: { $max: "$price" },
//         },
//       },
//       {
//         $sort: { avgPrice: 1 },
//       },
//       // {
//       //   $match: {_id: {$ne: 'EASY'}}
//       // },
//     ]);
//     res.status(200).json({
//       status: "success",
//       data: {
//         stats,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };

// exports.getMonthlyPlan = async (req, res) => {
//   try {
//     const year = req.params.year * 1;
//     const plan = await Tour.aggregate([
//       {
//         $unwind: "$startDates",
//       },
//       {
//         $match: {
//           startDates: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: { $month: "$startDates" },
//           numTourStarts: { $sum: 1 },
//           tours: { $push: "$name" },
//         },
//       },
//       {
//         $addFields: { month: "$_id" },
//       },
//       {
//         $project: {
//           _id: 0,
//         },
//       },
//       {
//         $sort: { numTourStarts: -1 },
//       },
//       {
//         $limit: 12,
//       },
//     ]);

//     res.status(200).json({
//       status: "success",
//       data: {
//         plan,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: "fail",
//       message: err,
//     });
//   }
// };
