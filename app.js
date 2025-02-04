const path = require("path")
const express = require("express")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const helmet = require("helmet")
const mongoSanitize = require("express-mongo-sanitize")
const xss = require("xss-clean")
const hpp = require("hpp")
const cookieParser = require("cookie-parser")

const globalErrorHandler = require("./controllers/errorController")
const AppError = require("./utils/appError")
const tourRouter = require("./routes/tourRoutes")
const userRouter = require("./routes/userRoutes")
const reviewRouter = require("./routes/reviewRoutes")
const viewRouter = require("./routes/viewRoutes")

const app = express()

//Define view engine
app.set("view engine", "pug")
app.set("views", path.join(__dirname, "views"))

// Global Middleware
// Serving static files
app.use(express.static(path.join(__dirname, "public")))

// Set Security HTTP headers
app.use(helmet.contentSecurityPolicy({ reportOnly: true }))

// Development logs
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")) // HTTP request logger
}

// limit requests from same IP
const limiter = rateLimit({
  max: 100, // allow 100 requests from same IP
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests form this IP, please try again in an hour.",
})

// Limit access to "/api" route
app.use("/api", limiter)

// Body parser => reading data from body to req.body
app.use(
  express.json({
    limit: "10kb", // limit data coming from body
  }),
)

//urlEncoded => parse data form "<form>" element to req.body
app.use(express.urlencoded({ extended: true, limit: "10kb" }))

//cookieParser => parse the data form cookies (jwt)
app.use(cookieParser())

// Data sanitization against NoSQL query injection ("email": {"$gt": "" }, + password)
app.use(mongoSanitize()) // remove all "$" and "."

// Data sanitization against XSS (Cross Site Scripting Attacks)
app.use(xss())

// protect against HTTP Parameter Pollution attacks (return only last parameter by default)
app.use(
  hpp({
    whitelist: [
      "duration",
      "difficulty",
      "ratingsAverage",
      "ratingsQuantity",
      "maxGroupSize",
      "price",
    ], // add allowed params
  }),
) // use last parameter by default(without arguments)

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  // console.log("\ncookie: ", req.cookies)
  next()
})

//ROUTES
app.use("/", viewRouter)
app.use("/api/v1/tours", tourRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/reviews", reviewRouter)

//this code only be reached if was NOT handled on previous routers
// .all("*", ...) => all HTTP methods(get, post, patch, put, delete)
app.all("*", (req, res, next) => {
  //pass args to the Error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server`))
})

//Error handling middleware in one place
app.use(globalErrorHandler)

module.exports = app


// test issue #2
// this coment fixes issue #2 
// second atempt
// pull req2 from PugaDen
// text from pull request
