'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_status_history', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      task_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      old_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      new_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('task_status_history', ['task_id'], {
      name: 'idx_task_status_history_task_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('task_status_history');
  },
};
