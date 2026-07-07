export const successResponse = (res, data, message = 'OK', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message, statusCode = 500, code = 'INTERNAL_ERROR') => {
  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};
