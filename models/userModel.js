const mongoose = require("mongoose");
const crypto = require("crypto");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide us your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: { type: String, default: "default.jpg" },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // Only works on CREATE and SAVE!!!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Password are not the same!",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  active: {
    type: String,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  // Only run this function if password is actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the password confim field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimeStamp < changedTimeStamp;
  }

  // False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
