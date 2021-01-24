const ErrorResponse = require("../utils/ErrorResponse");
const asyncHandler = require("./async");
const { authorization, withUser } = require("./auth");
const async = require("async");
const User = require("../models/User");

const getFilters = (req, whitelist, select) => {
  if (!select) {
    return {};
  }

  const selectedItems = select.split(" ");

  const filtersList = Object.entries(whitelist).reduce((acum, [key, value]) => {
    if (
      typeof value === "object" &&
      value !== null &&
      "filters" in value &&
      selectedItems.includes(key)
    ) {
      const newFilters = value.filters.filter(
        (filter) => !acum.includes(filter)
      );
      return [...acum, ...newFilters];
    }
    return acum;
  }, []);

  const filters = filtersList.reduce((acum, filter) => {
    const filterValue = filter(req);
    return { ...acum, ...filterValue };
  }, {});

  return filters;
};

const createQuery = (options) =>
  asyncHandler(async (req, res, next) => {
    let mongoQuery;
    const {
      model: modelName,
      query,
      filter,
      populate,
      select,
      sort,
      limit,
      skip,
    } = req.body;
    const { paths, pagination } = options;

    const path = paths.find((path) => path.model.modelName === modelName);
    const model = path.model;

    // filter param
    // TODO: prevent operations with filter on private items
    // TODO: add required filters for specific select
    const filterStr = filter
      ? JSON.stringify(filter).replace(
          /\b(gt|gte|lt|lte|in)\b/g,
          (match) => `$${match}`
        )
      : JSON.stringify({});

    const extraFilters = getFilters(req, path.whitelist, select);

    const mongoQueryFilters = { ...JSON.parse(filterStr), ...extraFilters };

    mongoQuery = model[query](mongoQueryFilters);

    // populate param
    // TODO: allow string format
    // TODO: prevent populate on private items
    if (populate) {
      if (!(Array.isArray(populate) && populate.length)) {
        return next(
          new ErrorResponse(`Populate param should be an array`, 400)
        );
      }
      populate.forEach((populate) => {
        mongoQuery = mongoQuery.populate(populate);
      });
    }

    // select param
    let whitelistItems = [];

    // get whitelist items array
    const selectedWhitelist = path.whitelist;
    if (Array.isArray(selectedWhitelist) && selectedWhitelist.length) {
      whitelistItems = selectedWhitelist;
    } else if (
      typeof selectedWhitelist === "object" &&
      selectedWhitelist !== null
    ) {
      // return array of items with true values, not objects, they are private
      const selectedWhitelistKeys = Object.entries(selectedWhitelist).reduce(
        (acum, [key, value]) => {
          if (value === true) {
            return [...acum, key];
          }
          return acum;
        },
        []
      );
      if (!select) {
        whitelistItems = selectedWhitelistKeys;
      } else {
        whitelistItems = Object.keys(selectedWhitelist);
      }
    }

    // without select return all whitelist items
    if (!select) {
      const whitelistItemsStr = whitelistItems.reduce(
        (acum, current) => acum + current + " ",
        ""
      );
      mongoQuery = mongoQuery.select(whitelistItemsStr);
    } else {
      // convert string to array
      if (typeof select === "string") {
        const selectedItems = select.split(" ");
        // allow whitelisted public and private
        const allowedItems = selectedItems.filter((item) =>
          whitelistItems.includes(item)
        );
        // convert back to string
        const whitelistItemsStr = allowedItems.reduce(
          (acum, current) => acum + current + " ",
          ""
        );
        mongoQuery = mongoQuery.select(whitelistItemsStr);
      }
      // TODO: allow object format for select
      // TODO: allow array format for select
    }

    // sort param
    if (sort) {
      if (typeof sort === "string") {
        // must habe the same string format as mongoose sort
        mongoQuery = mongoQuery.sort(sort);
      }
      // TODO: allow object format
    } else {
      // default sort by date
      mongoQuery = mongoQuery.sort("-createdAt");
    }

    // pagination
    if (query === "find") {
      const startIndex = parseInt(skip, 10) || 0;
      const limitIndex = parseInt(limit, 10) || pagination.limit;

      mongoQuery = mongoQuery.skip(startIndex).limit(limitIndex);
    }

    const results = await mongoQuery;

    res.status(200).json(results);
  });

const getMiddlewares = (whitelist, select) => {
  if (!select) {
    return [];
  }

  // whitelist should be an object
  if (typeof whitelist === "object" && whitelist !== null) {
    // filter keys that are objects
    // example return [{key: "email", middlewares: [autorization, withUser]}]
    const privateItems = Object.entries(whitelist).reduce(
      (acum, [key, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          "middlewares" in value
        ) {
          return [...acum, { key, middlewares: value.middlewares }];
        }
        return acum;
      },
      []
    );

    // merge all middlewares needed to be applied
    // TODO: determine the middlewares aplications order

    if (typeof select === "string") {
      // convert select into array
      const selectArray = select.split(" ");
      // get all middlewares to be applied
      const middlewares = privateItems.reduce((acum, { key, middlewares }) => {
        if (selectArray.includes(key)) {
          const newMiddlewares = middlewares.filter(
            (middleware) => !acum.includes(middleware)
          );
          return [...acum, ...newMiddlewares];
        }

        return acum;
      }, []);

      return middlewares;
    }
    // TODO: allow object format for select param
    // TODO: allow array format for select
  }

  return [];
};

exports.mongoql = (options) => (req, res, next) => {
  const { model, query, select } = req.body;
  const { paths } = options;

  // check if there is model param
  if (!model) {
    return next(new ErrorResponse("Please provide the model name", 400));
  }

  // check for the supporteds model
  const supportedModels = paths.map((path) => path.model.modelName);
  if (!supportedModels.includes(model)) {
    return next(new ErrorResponse(`Model name ${model} is not supported`, 400));
  }

  // check if there is query param
  if (!query) {
    return next(new ErrorResponse("Please provide the query", 400));
  }

  // check for the supported queries
  const supportedQueries = ["find"];
  if (!supportedQueries.includes(query)) {
    return next(new ErrorResponse(`Query ${query} is not supported`, 400));
  }

  // check if we should apply some middlewares
  const whitelist = paths.find((path) => path.model.modelName === model)
    .whitelist;

  const extraMiddlewares = getMiddlewares(whitelist, select);

  const applyMiddlewares = [...extraMiddlewares, createQuery(options)];

  async.eachSeries(
    applyMiddlewares,
    (middleware, callback) => {
      middleware.bind(null, req, res, callback)();
    },
    (err) => {
      if (err) {
        // TODO: handle error with json
        // return res.status(err.status).json({ error: err.message });
        next(err);
      }
    }
  );
};
