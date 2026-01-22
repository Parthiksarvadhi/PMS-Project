'use strict';

const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL;

let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, { dialect: 'postgres', logging: false });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
    }
  );
}

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./user')(sequelize, Sequelize.DataTypes);
db.Project = require('./project')(sequelize, Sequelize.DataTypes);
db.Task = require('./task')(sequelize, Sequelize.DataTypes);
db.Timesheet = require('./timesheet')(sequelize, Sequelize.DataTypes);
db.TaskStatusHistory = require('./taskStatusHistory')(sequelize, Sequelize.DataTypes);

// Associations
db.User.hasMany(db.Project, { foreignKey: 'manager_id', as: 'managedProjects' });
db.Project.belongsTo(db.User, { foreignKey: 'manager_id', as: 'manager' });

db.User.hasMany(db.Project, { foreignKey: 'created_by', as: 'createdProjects' });
db.Project.belongsTo(db.User, { foreignKey: 'created_by', as: 'creator' });

db.Project.hasMany(db.Task, { foreignKey: 'project_id', as: 'tasks' });
db.Task.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });

db.User.hasMany(db.Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
db.Task.belongsTo(db.User, { foreignKey: 'assigned_to', as: 'assignee' });

db.User.hasMany(db.Task, { foreignKey: 'created_by', as: 'createdTasks' });
db.Task.belongsTo(db.User, { foreignKey: 'created_by', as: 'taskCreator' });

db.User.hasMany(db.Timesheet, { foreignKey: 'employee_id', as: 'timesheets' });
db.Timesheet.belongsTo(db.User, { foreignKey: 'employee_id', as: 'employee' });

db.Task.hasMany(db.Timesheet, { foreignKey: 'task_id', as: 'timesheets' });
db.Timesheet.belongsTo(db.Task, { foreignKey: 'task_id', as: 'task' });

db.Task.hasMany(db.TaskStatusHistory, { foreignKey: 'task_id', as: 'statusHistory' });
db.TaskStatusHistory.belongsTo(db.Task, { foreignKey: 'task_id', as: 'task' });

db.User.hasMany(db.TaskStatusHistory, { foreignKey: 'changed_by', as: 'taskStatusChanges' });
db.TaskStatusHistory.belongsTo(db.User, { foreignKey: 'changed_by', as: 'changedByUser' });

module.exports = db;
