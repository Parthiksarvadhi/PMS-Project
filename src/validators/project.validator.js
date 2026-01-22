const Joi = require("joi");

exports.createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow("", null),
  managerId: Joi.number().integer().allow(null),
  budget: Joi.number().min(0).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().allow(null),
});

exports.assignManagerSchema = Joi.object({
  managerId: Joi.number().integer().required(),
});

exports.updateProjectStatusSchema = Joi.object({
  status: Joi.string().valid("ONGOING", "COMPLETED").required(),
});
