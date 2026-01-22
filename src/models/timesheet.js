'use strict';

module.exports = (sequelize, DataTypes) => {
  const Timesheet = sequelize.define(
    'Timesheet',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.BIGINT, allowNull: false },
      task_id: { type: DataTypes.BIGINT, allowNull: false },
      work_date: { type: DataTypes.DATEONLY, allowNull: false },

      // Start/Push feature
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: true },
      duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      hours_logged: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },

      remarks: { type: DataTypes.TEXT, allowNull: true },
      is_running: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'timesheets',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Timesheet;
};
