'use strict';

module.exports = (sequelize, DataTypes) => {
  const TaskStatusHistory = sequelize.define(
    'TaskStatusHistory',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      task_id: { type: DataTypes.BIGINT, allowNull: false },
      old_status: { type: DataTypes.STRING(20), allowNull: false },
      new_status: { type: DataTypes.STRING(20), allowNull: false },
      changed_by: { type: DataTypes.BIGINT, allowNull: true },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      tableName: 'task_status_history',
      underscored: true,
      timestamps: false,
    }
  );

  return TaskStatusHistory;
};
