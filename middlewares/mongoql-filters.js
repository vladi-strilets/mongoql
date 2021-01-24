exports.filterWithUserId = (req) => ({
  _id: req.user.id,
});
