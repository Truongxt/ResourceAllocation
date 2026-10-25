// Ô nhập trường tùy chỉnh trên mobile: chuỗi người dùng gõ ↔ giá trị gửi server.
// Chạy: cd mobile && npm test
//
// Mobile không có thư viện chọn ngày, nên ngày gõ tay dạng dd/mm/yyyy; số gõ theo thói quen Việt
// (dấu chấm ngăn nghìn, dấu phẩy thập phân). Server vẫn kiểm lại, ở đây để báo lỗi ngay tại chỗ.

import { inputsFromValues, valuesFromInputs } from '../src/utils/customFieldInputs.js';

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

const channel = { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 0 };
const budget = { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', order: 1 };
const release = { key: 'f_cccccccc', name: 'Ngày phát hành', type: 'date', order: 2 };
const note = { key: 'f_dddddddd', name: 'Ghi chú', type: 'text', order: 3 };
const project = { customFields: [note, release, budget, channel] };

section('Giá trị đã lưu → ô nhập');
check('Mỗi kiểu thành chuỗi gõ được; ngày dd/mm/yyyy theo phần ngày ISO', inputsFromValues(project, {
  [channel.key]: 'TikTok', [budget.key]: 1500.5, [release.key]: '2026-11-20T00:00:00.000Z', [note.key]: 'x',
}), { [channel.key]: 'TikTok', [budget.key]: '1500,5', [release.key]: '20/11/2026', [note.key]: 'x' });
check('Chưa có giá trị → ô trống', inputsFromValues(project, {}), {
  [channel.key]: '', [budget.key]: '', [release.key]: '', [note.key]: '',
});

section('Ô nhập → giá trị gửi server');
check('Đủ và đúng', valuesFromInputs(project, {
  [channel.key]: 'TikTok', [budget.key]: '15.000.000', [release.key]: '5/1/2027', [note.key]: '  Ưu tiên video  ',
}), { values: { [channel.key]: 'TikTok', [budget.key]: 15000000, [release.key]: '2027-01-05', [note.key]: 'Ưu tiên video' } });
check('Số có phần thập phân bằng dấu phẩy', valuesFromInputs(project, { [channel.key]: 'TikTok', [budget.key]: '1.234,5' }).values[budget.key], 1234.5);
check('Số chỉ có một dấu chấm là phần thập phân', valuesFromInputs(project, { [channel.key]: 'TikTok', [budget.key]: '2.5' }).values[budget.key], 2.5);
check('Ô trống gửi null để xóa giá trị cũ', valuesFromInputs(project, { [channel.key]: 'TikTok' }).values, {
  [channel.key]: 'TikTok', [budget.key]: null, [release.key]: null, [note.key]: null,
});
check('Thiếu trường bắt buộc', valuesFromInputs(project, { [budget.key]: '1' }), { error: 'Chưa điền "Kênh"' });
check('Số không đọc được', valuesFromInputs(project, { [channel.key]: 'TikTok', [budget.key]: 'nhiều' }), { error: '"Ngân sách" phải là một số' });
check('Ngày sai dạng', valuesFromInputs(project, { [channel.key]: 'TikTok', [release.key]: '2027-01-05' }), { error: '"Ngày phát hành" phải có dạng dd/mm/yyyy' });
check('Ngày không có thật', valuesFromInputs(project, { [channel.key]: 'TikTok', [release.key]: '31/02/2027' }), { error: '"Ngày phát hành" không phải ngày có thật' });
check('Lựa chọn lạ', valuesFromInputs(project, { [channel.key]: 'Zalo' }), { error: '"Kênh" phải là một trong: Facebook, TikTok' });
check('Văn bản quá 1000 ký tự', valuesFromInputs(project, { [channel.key]: 'TikTok', [note.key]: 'x'.repeat(1001) }), { error: '"Ghi chú" dài quá 1000 ký tự' });
check('Dự án không có trường → không gửi gì', valuesFromInputs({ customFields: [] }, {}), { values: {} });

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
