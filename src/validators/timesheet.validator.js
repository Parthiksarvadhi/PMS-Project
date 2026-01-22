const Joi = require("joi");

exports.startTaskSchema = Joi.object({
  taskId: Joi.number().integer().required(),
  remarks: Joi.string().allow("", null),
});

exports.pushTaskSchema = Joi.object({
  remarks: Joi.string().allow("", null),
});

exports.switchTaskSchema = Joi.object({
  newTaskId: Joi.number().integer().required(),
  remarks: Joi.string().allow("", null),
});
