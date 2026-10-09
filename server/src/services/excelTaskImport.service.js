const XLSX = require('xlsx');
const Task = require('../models/Task');
const TaskGroup = require('../models/TaskGroup');
const User = require('../models/User');
const { mergeCustomValues } = require('./customFields.service');

// Tám cột cố định của mẫu. Cột thứ 9 trở đi là trường tùy chỉnh của dự án, khớp theo tiêu đề.
const FIXED_COLUMNS = 8;
const REQUIRED_MARK = ' (*)';
const headerOf = (field) => `${field.name}${field.required ? REQUIRED_MARK : ''}`;
const normalizeHeader = (header) => String(header || '').trim().replace(/\s*\(\*\)$/, '').toLowerCase();

/**
 * Sinh file Excel mẫu (.xlsx) theo chuẩn Base Wework
 */
function generateTaskTemplateWorkbook(customFields = []) {
  const fields = [...customFields].sort((a, b) => (a.order || 0) - (b.order || 0));
  const data = [
    [
      'Tên công việc / Nhóm công việc (*)',
      'Người thực hiện (Email/Username)',
      'Người theo dõi (Email, cách nhau bởi dấu phẩy)',
      'Độ ưu tiên (low/medium/high/critical)',
      'Ngày bắt đầu (dd/mm/yyyy)',
      'Hạn chót (dd/mm/yyyy)',
      'Giờ ước tính (h)',
      'Mô tả công việc',
      // Trường tùy chỉnh của dự án (nếu tải mẫu theo dự án). "(*)" là bắt buộc.
      ...fields.map(headerOf),
    ],
    // Hướng dẫn dòng nhóm công việc
    ['1. Giai đoạn Phân tích & Thiết kế:', '', '', '', '', '', '', 'Nhóm công việc phân tích'],
    ['Khảo sát yêu cầu người dùng và vẽ wireframe', '', '', 'high', '15/09/2026', '20/09/2026', 16, 'Phỏng vấn 5 khách hàng mục tiêu'],
    ['# Thiết kế moodboard và bảng màu', '', '', 'medium', '16/09/2026', '18/09/2026', 8, 'Công việc con cấp 1'],
    ['## Xuất các biến Design Tokens CSS', '', '', 'low', '18/09/2026', '19/09/2026', 4, 'Công việc con cấp 2'],
    ['Thiết kế các màn hình chi tiết Figma', '', '', 'critical', '21/09/2026', '28/09/2026', 24, 'Bàn giao cho nhóm frontend'],
    ['2. Giai đoạn Lập trình & Kiểm thử:', '', '', '', '', '', '', 'Nhóm công việc lập trình'],
    ['Xây dựng API Backend với Node.js', '', '', 'high', '25/09/2026', '05/10/2026', 32, 'Xây dựng controllers và models'],
    ['# Viết Unit Test cho Auth và Tasks', '', '', 'medium', '01/10/2026', '04/10/2026', 12, 'Test coverage >= 80%'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Thiết lập độ rộng các cột cho thoáng đẹp
  ws['!cols'] = [
    { wch: 45 }, // Tên
    { wch: 30 }, // Assignee
    { wch: 35 }, // Followers
    { wch: 20 }, // Priority
    { wch: 18 }, // StartDate
    { wch: 18 }, // EndDate
    { wch: 16 }, // Hours
    { wch: 45 }, // Description
    ...fields.map(() => ({ wch: 22 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Cong_Viec_Wework');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Phân tích chuỗi ngày tháng dd/mm/yyyy hoặc ISO sang Date
 */
function parseDateString(str) {
  if (!str) return undefined;
  if (str instanceof Date && !isNaN(str)) return str;
  if (typeof str === 'number') {
    // Excel serial number date conversion
    const utc_days = Math.floor(str - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
  const strVal = String(str).trim();
  const dmyMatch = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(strVal);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Chuẩn hóa độ ưu tiên
 */
function normalizePriority(p) {
  if (!p) return 'medium';
  const val = String(p).toLowerCase().trim();
  if (val.includes('crit') || val.includes('khẩn') || val.includes('gap')) return 'critical';
  if (val.includes('high') || val.includes('cao')) return 'high';
  if (val.includes('low') || val.includes('thấp')) return 'low';
  return 'medium';
}

/**
 * Phân tích buffer file Excel tải lên
 */
function parseTaskExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (!rows || rows.length < 2) {
    throw new Error('File Excel rỗng hoặc không đúng định dạng');
  }

  // Tiêu đề các cột sau tám cột cố định — để `importTasksFromExcel` khớp với trường tùy chỉnh.
  const extraHeaders = rows[0].slice(FIXED_COLUMNS).map((h) => String(h || '').trim());
  const items = [];
  let currentGroup = '';
  let currentParentTitle = '';

  // Bắt đầu từ dòng 1 (bỏ qua dòng tiêu đề dòng 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = String(row[0] || '').trim();
    if (!rawName) continue; // Bỏ qua dòng trống

    // Kiểm tra dòng Nhóm công việc: kết thúc bằng dấu ':'
    if (rawName.endsWith(':')) {
      currentGroup = rawName.slice(0, -1).trim();
      currentParentTitle = '';
      continue;
    }

    // Kiểm tra công việc con (bắt đầu bằng '#' hoặc '##')
    const isSubtask2 = rawName.startsWith('##');
    const isSubtask1 = !isSubtask2 && rawName.startsWith('#');
    const title = rawName.replace(/^#+\s*/, '').trim();

    const assigneeEmail = String(row[1] || '').trim();
    const followersRaw = String(row[2] || '').trim();
    const priority = normalizePriority(row[3]);
    const startDate = parseDateString(row[4]);
    const endDate = parseDateString(row[5]);
    const estimatedHours = parseFloat(row[6]) || 8;
    const description = String(row[7] || '').trim();
    const extra = {};
    extraHeaders.forEach((header, offset) => {
      const value = row[FIXED_COLUMNS + offset];
      if (header && value !== '' && value !== undefined && value !== null) extra[header] = value;
    });

    if (!isSubtask1 && !isSubtask2) {
      currentParentTitle = title;
    }

    items.push({
      rowIndex: i + 1,
      groupName: currentGroup || 'Chung',
      title,
      isSubtask: isSubtask1 || isSubtask2,
      subtaskLevel: isSubtask2 ? 2 : isSubtask1 ? 1 : 0,
      parentTitle: (isSubtask1 || isSubtask2) ? currentParentTitle : null,
      assigneeEmail,
      followersRaw,
      priority,
      startDate,
      endDate,
      estimatedHours,
      description,
      extra,
    });
  }

  return items;
}

/**
 * Thực hiện Import hàng loạt vào Database
 */
/**
 * Ô ngày của Excel → `YYYY-MM-DD`. Excel lưu ngày là số serial (số ngày kể từ 1899-12-30), còn
 * người gõ tay thường viết dd/mm/yyyy. Không nhận dạng được thì trả nguyên để bộ kiểm báo lỗi.
 */
function excelDateToIso(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return text;
}

/**
 * Giá trị trường tùy chỉnh của từng dòng, kiểm hết **trước** khi tạo việc nào: sai một dòng thì
 * báo đúng dòng đó và không nhập gì, thay vì để lại nửa file trong dự án.
 */
function customValuesOfRows(items, customFields = []) {
  const byHeader = new Map(customFields.map((f) => [normalizeHeader(f.name), f]));
  return items.map((item) => {
    const input = {};
    Object.entries(item.extra || {}).forEach(([header, raw]) => {
      const field = byHeader.get(normalizeHeader(header));
      if (!field) return; // cột không phải trường của dự án: bỏ qua
      input[field.key] = field.type === 'date' ? excelDateToIso(raw)
        : field.type === 'number' || typeof raw !== 'number' ? raw : String(raw);
    });
    const result = mergeCustomValues(customFields, input, {});
    if (result.error) {
      throw Object.assign(new Error(`Dòng ${item.rowIndex}: ${result.error}`), { statusCode: 400 });
    }
    return Object.keys(result.values).length ? result.values : undefined;
  });
}

async function importTasksFromExcel({ buffer, projectId, companyName, createdBy, withoutPeople = false, customFields = [] }) {
  const parsedItems = parseTaskExcelBuffer(buffer);
  if (parsedItems.length === 0) {
    throw new Error('Không tìm thấy dòng công việc hợp lệ nào trong file');
  }
  const customValues = customValuesOfRows(parsedItems, customFields);

  // 1. Tải danh sách user trong công ty để map email/username
  const users = await User.find({ companyName }).select('_id email name');
  const userMap = new Map();
  users.forEach((u) => {
    userMap.set(u.email.toLowerCase(), u._id);
    userMap.set(u.name.toLowerCase(), u._id);
  });

  // 2. Tạo hoặc lấy các nhóm công việc (TaskGroups)
  const groupNames = Array.from(new Set(parsedItems.map((item) => item.groupName).filter(Boolean)));
  const groupMap = new Map();

  for (const gName of groupNames) {
    let group = await TaskGroup.findOne({ project: projectId, name: gName });
    if (!group) {
      group = await TaskGroup.create({
        name: gName,
        project: projectId,
        companyName,
        createdBy,
      });
    }
    groupMap.set(gName, group._id);
  }

  // 3. Tiến hành tạo Task và Subtask
  const createdTasksMap = new Map(); // Map parentTitle -> taskId
  const createdTasks = [];

  for (const [index, item] of parsedItems.entries()) {
    const assigneeId = !withoutPeople && item.assigneeEmail ? userMap.get(item.assigneeEmail.toLowerCase()) || null : null;
    const followerIds = !withoutPeople && item.followersRaw
      ? item.followersRaw
          .split(/[,;]/)
          .map((f) => userMap.get(f.trim().toLowerCase()))
          .filter(Boolean)
      : [];

    const groupId = groupMap.get(item.groupName) || null;
    let parentTaskId = null;

    if (item.isSubtask && item.parentTitle) {
      parentTaskId = createdTasksMap.get(item.parentTitle) || null;
    }

    const newTask = await Task.create({
      title: item.title,
      description: item.description,
      project: projectId,
      taskGroup: groupId,
      parentTask: parentTaskId,
      assignee: assigneeId,
      followers: followerIds,
      priority: item.priority,
      startDate: item.startDate || new Date(),
      endDate: item.endDate || new Date(Date.now() + 7 * 24 * 3600 * 1000),
      estimatedHours: item.estimatedHours,
      customValues: customValues[index],
      status: 'todo',
      progress: 0,
      companyName,
      createdBy,
    });

    if (!item.isSubtask) {
      createdTasksMap.set(item.title, newTask._id);
    }
    createdTasks.push(newTask);
  }

  return {
    totalImported: createdTasks.length,
    groupsCreatedOrFound: groupNames.length,
    tasks: createdTasks,
  };
}

module.exports = {
  generateTaskTemplateWorkbook,
  parseTaskExcelBuffer,
  importTasksFromExcel,
};
