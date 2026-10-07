/**
 * Dựng regex tìm kiếm từ chuỗi người dùng gõ, khớp theo đúng nghĩa đen.
 *
 * `new RegExp(req.query.search)` thẳng từ chuỗi nhập thì gõ `(` là SyntaxError
 * (500), còn một mẫu như `(a+)+$` có thể làm nghẽn cả tiến trình Node (ReDoS).
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex không phân biệt hoa thường, khớp chuỗi con theo nghĩa đen. */
const toSearchRegex = (value) => new RegExp(escapeRegex(value), 'i');

module.exports = { escapeRegex, toSearchRegex };
