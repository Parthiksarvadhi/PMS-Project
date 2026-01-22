'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      role: { type: DataTypes.STRING(20), allowNull: false },
      hourly_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // Admin assigns
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return User;
};
