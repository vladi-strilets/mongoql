const User = require("../models/User");
const ErrorResponse = require("../utils/ErrorResponse");
const asyncHandler = require("./async");

exports.authorization = asyncHandler(async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return next(new ErrorResponse("Not authorized", 403));
    }

    if (token !== "securityToken") {
      return next(new ErrorResponse("Not authorized", 403));
    }

    req.decodedToken = {
      id: "600dcc9adbf6aba2bc6b3806",
    };

    next();
  } else {
    return next(new ErrorResponse("Not authorized", 403));
  }
});

exports.withUser = asyncHandler(async (req, res, next) => {
  if (!req.decodedToken) {
    return next(new ErrorResponse("decodedToken is null", 400));
  }

  const userId = req.decodedToken.id;

  const user = await User.findById(userId);

  // check if user exists
  if (!user) {
    return next(new ErrorResponse(`No user with the email of ${email}`, 404));
  }

  req.user = user;

  next();
});
