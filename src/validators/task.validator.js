const Joi = require("joi");

exports.createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow("", null),
  assignedTo: Joi.number().integer().required(),
  estimatedHours: Joi.number().positive().required(),
  dueDate: Joi.date().allow(null),
});

exports.updateTaskStatusSchema = Joi.object({
  status: Joi.string().valid("TODO", "IN_PROGRESS", "COMPLETED").required(),
});

exports.reassignTaskSchema = Joi.object({
  assignedTo: Joi.number().integer().required(),
});

exports.reopenTaskSchema = Joi.object({
  status: Joi.string().valid("TODO", "IN_PROGRESS").required(),
});
