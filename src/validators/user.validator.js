const Joi = require("joi");

exports.createUserSchema = Joi.object({
  name: Joi.string().min(3).max(120).required(),
  email: Joi.string().email().max(150).required(),
  password: Joi.string().min(6).max(50).required(),
  role: Joi.string().valid("MANAGER", "EMPLOYEE").required(), // Admin creates only these
});

exports.updateActiveSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

exports.updateHourlyRateSchema = Joi.object({
  hourlyRate: Joi.number().min(0).required(),
});