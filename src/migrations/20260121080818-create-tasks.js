'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      project_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assigned_to: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      estimated_hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'TODO',
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.sequelize.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "chk_tasks_estimated_hours"
      CHECK (estimated_hours > 0);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "chk_tasks_status"
      CHECK (status IN ('TODO','IN_PROGRESS','COMPLETED'));
    `);

    await queryInterface.addIndex('tasks', ['project_id'], { name: 'idx_tasks_project_id' });
    await queryInterface.addIndex('tasks', ['assigned_to'], { name: 'idx_tasks_assigned_to' });
    await queryInterface.addIndex('tasks', ['status'], { name: 'idx_tasks_status' });
    await queryInterface.addIndex('tasks', ['is_active'], { name: 'idx_tasks_is_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
  },
};
