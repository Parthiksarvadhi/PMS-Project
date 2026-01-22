'use strict';

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    'Task',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      project_id: { type: DataTypes.BIGINT, allowNull: false },
      title: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      assigned_to: { type: DataTypes.BIGINT, allowNull: true },
      estimated_hours: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'TODO' },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      due_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      tableName: 'tasks',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Task;
};
