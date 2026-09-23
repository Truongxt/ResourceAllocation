/**
 * Middleware: Handle 404 - Route not found
 */
const notFound = (req, res, next) => {
  const error = new Error(`Không tìm thấy route: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Middleware: Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // Không phải thứ ném ra cũng là `Error` có `message` — có chỗ ném chuỗi, có
  // chỗ ném object rỗng. Thiếu bước này thì `res.json` bỏ luôn khóa `message`,
  // client nhận `{success:false}` trống trơn và không biết nói gì với người dùng.
  let message = err.message || 'Đã xảy ra lỗi không xác định';

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'ID không hợp lệ';
  }

  // Mongoose duplicate key
  //
  // `keyValue` chỉ có ở lỗi ghi MỘT bản ghi. Lỗi ghi hàng loạt
  // (`MongoBulkWriteError` từ `insertMany`) cũng mang `code: 11000` nhưng KHÔNG
  // có `keyValue` — và `Object.keys(undefined)` ném lỗi ngay bên trong chính bộ
  // bắt lỗi này. Express thấy handler lỗi ném lỗi thì rơi về handler mặc định:
  // client nhận **500 rỗng**, không `success`, không `message`.
  //
  // Đó là cách một lỗi chỉ mục ở collection departments biến thành "500 không rõ
  // nguyên nhân" trên cả web lẫn mobile, và tốn khá nhiều công mới lần ra.
  if (err.code === 11000) {
    statusCode = 400;
    const keyValue = err.keyValue || err.writeErrors?.[0]?.err?.keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : null;
    message = field
      ? `Giá trị '${field}' đã tồn tại`
      : 'Dữ liệu bị trùng với bản ghi đã có';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((val) => val.message);
    message = messages.join('. ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
