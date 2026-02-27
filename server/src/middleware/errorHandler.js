const logger = require('../logger');
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, _next) {
  logger.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Don't leak stack traces to client
  if (err.isJoi) {
    return res.status(400).json({ error: 'Ошибка валидации', details: err.details?.map(d => d.message) });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ error: 'Запись уже существует' });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Связанная запись не найдена' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message,
  });
}

module.exports = { asyncHandler, errorHandler };
