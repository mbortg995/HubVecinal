// Captura 404 para rutas no definidas.
export function notFound(req, res, next) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` });
}

// Manejador central de errores.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  // Error de duplicado de Mongo (p.ej. email ya registrado).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ message: `Ya existe un registro con ese ${field}` });
  }

  // Error de subida de archivos (multer), p.ej. fichero demasiado grande.
  if (err.name === 'MulterError') {
    const msg =
      err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo permitido' : err.message;
    return res.status(400).json({ message: msg });
  }

  // Error de validación de Mongoose.
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join('. ') });
  }

  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
}
