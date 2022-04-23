const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate fields value: ${err.keyValue.name}, Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  let errors = Object.values(err.errors).map((val) => val.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token please login again", 401);

const handleJWTExpiredError = () =>
  new AppError("Token expired please login again", 401);

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    // A) API
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stsck: err.stack,
    });
  }

  // B) RENDERED WEBSITE
  return res.status(err.statusCode).render("error", {
    title: "Somthing went wrong!",
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith("/api")) {
    // A) Operational, tusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // B) Programing or other unknown error: dont leak error details
    // 1) Log error
    console.error("Error", err);

    // 2) Send generic message
    return res.status(500).json({
      status: "error",
      message: "Somthing went wrong!",
    });
  }
  
  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Somthing went wrong!",
      msg: err.message,
    });
  }

  // Programing or other unknown error: dont leak error details
  // 1) Log error
  console.error("Error", err);

  // 2) Send generic message
  return res.status(err.statusCode).render("error", {
    title: "Somthing went wrong!",
    msg: "Please try again later!",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.assign(err);

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
