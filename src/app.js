require("dotenv").config();
const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");
const errorMiddleware = require("./middleware/error.middleware");

const userRoutes = require("./routes/user.routes");
const projectRoutes = require("./routes/project.routes");

const taskRoutes = require("./routes/task.routes");
const timesheetRoutes = require("./routes/timesheet.routes");
const reportRoutes = require("./routes/report.routes");


app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/", taskRoutes);
app.use("/", timesheetRoutes);

app.use("/", reportRoutes);


// Error handler
app.use(errorMiddleware);

module.exports = app;
