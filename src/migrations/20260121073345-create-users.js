'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      hourly_rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // CHECK constraints (Postgres)
    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_role"
      CHECK (role IN ('ADMIN','MANAGER','EMPLOYEE'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_hourly_rate"
      CHECK (hourly_rate >= 0);
    `);

    await queryInterface.addIndex('users', ['role'], { name: 'idx_users_role' });
    await queryInterface.addIndex('users', ['is_active'], { name: 'idx_users_is_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
