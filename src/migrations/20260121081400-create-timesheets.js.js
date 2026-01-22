'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('timesheets', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      task_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      work_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      hours_logged: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_running: {
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

    // CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE "timesheets"
      ADD CONSTRAINT "chk_timesheets_duration"
      CHECK (duration_minutes >= 0);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "timesheets"
      ADD CONSTRAINT "chk_timesheets_hours_logged"
      CHECK (hours_logged >= 0);
    `);

    // ✅ Only 1 running task per employee (Postgres partial unique index)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "uniq_one_running_task_per_employee"
      ON "timesheets" ("employee_id")
      WHERE is_running = true;
    `);

    await queryInterface.addIndex('timesheets', ['employee_id', 'work_date'], {
      name: 'idx_timesheets_employee_work_date',
    });
    await queryInterface.addIndex('timesheets', ['task_id'], { name: 'idx_timesheets_task_id' });
    await queryInterface.addIndex('timesheets', ['work_date'], { name: 'idx_timesheets_work_date' });
    await queryInterface.addIndex('timesheets', ['is_running'], { name: 'idx_timesheets_is_running' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timesheets');
  },
};
