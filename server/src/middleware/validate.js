const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Ошибка валидации', details: messages });
    }
    req.body = value;
    next();
  };
}

// Schemas
const schemas = {
  login: Joi.object({
    username: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(6).max(100).required(),
  }),
  register: Joi.object({
    username: Joi.string().min(2).max(50).pattern(/^[a-zA-Z0-9_]+$/).required(),
    password: Joi.string().min(6).max(100).required(),
    role: Joi.string().valid('admin', 'editor', 'viewer').default('viewer'),
    display_name: Joi.string().max(100).allow('', null),
  }),
  changePassword: Joi.object({
    old_password: Joi.string().required(),
    new_password: Joi.string().min(6).max(100).required(),
  }),
  entityType: Joi.object({
    name: Joi.string().min(1).max(100).pattern(/^[a-z_]+$/).required(),
    name_ru: Joi.string().min(1).max(100).required(),
    icon: Joi.string().max(10).default('📄'),
    color: Joi.string().pattern(/^#[A-Fa-f0-9]{6}$/).default('#6366F1'),
  }),
  entityTypeUpdate: Joi.object({
    name_ru: Joi.string().min(1).max(100),
    icon: Joi.string().max(10),
    color: Joi.string().pattern(/^#[A-Fa-f0-9]{6}$/),
  }),
  fieldDefinition: Joi.object({
    name: Joi.string().min(1).max(100).pattern(/^[a-z_]+$/).required(),
    name_ru: Joi.string().max(100).allow('', null),
    field_type: Joi.string().valid('text', 'number', 'date', 'select', 'boolean').default('text'),
    options: Joi.array().items(Joi.string().max(100)).max(50).allow(null),
    required: Joi.boolean().default(false),
  }),
  entity: Joi.object({
    entity_type_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(255).required(),
    properties: Joi.object().default({}),
    parent_id: Joi.number().integer().positive().allow(null),
  }),
  entityUpdate: Joi.object({
    name: Joi.string().min(1).max(255),
    properties: Joi.object(),
    parent_id: Joi.number().integer().positive().allow(null),
  }),
  relation: Joi.object({
    from_entity_id: Joi.number().integer().positive().required(),
    to_entity_id: Joi.number().integer().positive().required(),
    relation_type: Joi.string().min(1).max(100).required(),
    properties: Joi.object().default({}),
  }),
  relationType: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    name_ru: Joi.string().max(100).allow('', null),
    color: Joi.string().pattern(/^#[A-Fa-f0-9]{6}$/).default('#94A3AF'),
  }),
};

module.exports = { validate, schemas };
