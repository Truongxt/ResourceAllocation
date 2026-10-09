// Quy tắc của tệp đính kèm phía client — phải khớp server (`attachment.controller.js`).
// Chạy: cd client && npm test
//
// Mobile dùng bản chép nguyên của file này; lệch nhau thì một bên bày nút mà bấm vào nhận 403.

import {
  MAX_ATTACHMENT_SIZE,
  formatFileSize,
  canWriteAttachments,
  canDeleteAttachment,
} from '../src/utils/attachmentRules.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n      mong đợi: ${JSON.stringify(expected)}\n      nhận được: ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

section('Cỡ tệp');
check('Trần 10 MB như server', MAX_ATTACHMENT_SIZE, 10 * 1024 * 1024);
check('Dưới 1 KB tính bằng byte', formatFileSize(512), '512 B');
check('KB một chữ số thập phân', formatFileSize(1536), '1.5 KB');
check('MB một chữ số thập phân', formatFileSize(2 * 1024 * 1024), '2.0 MB');

section('Ai được tải lên');
const task = (project = {}) => ({ _id: 't1', project: { _id: 'p1', manager: { _id: 'u-pm' }, ...project } });
check('Có quyền sửa phân hệ Công việc → được', canWriteAttachments(task(), true), true);
check('Chỉ xem → không', canWriteAttachments(task(), false), false);
check('Dự án lưu trữ → không, kể cả admin', canWriteAttachments(task({ isArchived: true }), true), false);

section('Ai được xóa');
const att = { _id: 'a1', uploadedBy: { _id: 'u-me' } };
check('Người tải lên', canDeleteAttachment(att, task(), { _id: 'u-me', role: 'member' }, true), true);
check('uploadedBy chưa populate vẫn đọc được', canDeleteAttachment({ uploadedBy: 'u-me' }, task(), { _id: 'u-me', role: 'member' }, true), true);
check('Người khác → không', canDeleteAttachment(att, task(), { _id: 'u-hoa', role: 'member' }, true), false);
check('Quản lý của dự án', canDeleteAttachment(att, task(), { _id: 'u-pm', role: 'project_manager' }, true), true);
check('PM của dự án khác → không', canDeleteAttachment(att, task(), { _id: 'u-pm2', role: 'project_manager' }, true), false);
check('Admin', canDeleteAttachment(att, task(), { _id: 'u-a', role: 'admin' }, true), true);
check('Owner', canDeleteAttachment(att, task(), { _id: 'u-o', role: 'member', isOwner: true }, true), true);
check('Người tải lên nhưng chỉ còn quyền xem → không', canDeleteAttachment(att, task(), { _id: 'u-me', role: 'member' }, false), false);
check('Dự án lưu trữ → không', canDeleteAttachment(att, task({ isArchived: true }), { _id: 'u-a', role: 'admin' }, true), false);

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
