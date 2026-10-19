/**
 * Đưa tài khoản khách cũ về đúng công ty đã tạo ra họ.
 *
 *   npm run migrate:guest-company                                    chỉ liệt kê, KHÔNG sửa gì
 *   npm run migrate:guest-company -- --apply                         sửa những khách xác định được
 *   npm run migrate:guest-company -- --apply --default-company="X"   gán phần còn lại vào công ty X
 *
 * Vì sao cần: trước bản vá `15aad4f`, `createGuest` ghi tên tổ chức đối tác vào
 * `companyName` — mà đó là khóa phân lập. Khách tạo khi ấy không thuộc công ty nào: không
 * admin nào nhìn thấy hay quản lý được họ, trong khi họ **vẫn đăng nhập được**.
 *
 * Không có trường nào ghi ai đã tạo khách, nên dấu vết duy nhất đáng tin là **dự án họ
 * được thêm vào**. Chỉ quy về công ty khi dấu vết đó trỏ về đúng một công ty; mơ hồ thì
 * liệt kê ra để người chạy quyết, không đoán. Tên đối tác cũ chuyển sang `guestCompany`.
 *
 * Đây là script một lần. Sau khi mọi môi trường đã chạy xong thì xóa được.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const toId = (v) => String((v && v._id) || v);

/**
 * Quyết định thuần, không chạm DB — để kiểm thử được.
 *
 * @returns {{ fixes: Array, unresolved: Array, error?: string }}
 */
function planGuestMigration({ users, projects, defaultCompany = null }) {
  // "Công ty thật" = công ty có ít nhất một tài khoản không phải khách
  const realCompanies = new Set(users.filter((u) => !u.isGuest).map((u) => u.companyName));

  if (defaultCompany && !realCompanies.has(defaultCompany)) {
    return { fixes: [], unresolved: [], error: `Không có công ty "${defaultCompany}" trong hệ thống` };
  }

  const companiesByMember = new Map();
  for (const project of projects) {
    for (const member of project.members || []) {
      const id = toId(member.user);
      if (!companiesByMember.has(id)) companiesByMember.set(id, new Set());
      companiesByMember.get(id).add(project.companyName);
    }
  }

  const fixes = [];
  const unresolved = [];

  for (const user of users) {
    if (!user.isGuest || realCompanies.has(user.companyName)) continue;

    const id = toId(user._id);
    const base = {
      id,
      email: user.email,
      from: user.companyName,
      guestCompany: user.guestCompany || user.companyName,
    };
    const companies = [...(companiesByMember.get(id) || [])].filter((c) => realCompanies.has(c));

    if (companies.length === 1) {
      fixes.push({ ...base, to: companies[0], reason: 'thành viên dự án của công ty này' });
    } else if (companies.length > 1) {
      // Mâu thuẫn chứ không phải thiếu dữ liệu: công ty mặc định cũng không được gán ép
      unresolved.push({ ...base, reason: `thành viên dự án của ${companies.length} công ty: ${companies.join(', ')}` });
    } else if (defaultCompany) {
      fixes.push({ ...base, to: defaultCompany, reason: 'không thuộc dự án nào — gán theo --default-company' });
    } else {
      unresolved.push({ ...base, reason: 'không thuộc dự án nào' });
    }
  }

  return { fixes, unresolved };
}

async function run() {
  dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
  const User = require('../models/User');
  const Project = require('../models/Project');

  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
  const APPLY = process.argv.includes('--apply');
  const defaultArg = process.argv.find((a) => a.startsWith('--default-company='));
  const defaultCompany = defaultArg ? defaultArg.split('=').slice(1).join('=').trim() : null;

  await mongoose.connect(MONGO_URI);
  console.log(`Đã kết nối ${MONGO_URI}\n`);

  const users = await User.find({}).select('email companyName isGuest guestCompany').lean();
  const projects = await Project.find({}).select('companyName members.user').lean();
  const plan = planGuestMigration({ users, projects, defaultCompany });

  if (plan.error) {
    console.error(plan.error);
    process.exitCode = 1;
    return;
  }
  if (!plan.fixes.length && !plan.unresolved.length) {
    console.log('Không có tài khoản khách nào nằm ngoài công ty. Không cần làm gì.');
    return;
  }

  if (plan.fixes.length) {
    console.log(`${plan.fixes.length} khách xác định được công ty:\n`);
    for (const f of plan.fixes) console.log(`  - ${f.email}: "${f.from}" → "${f.to}" (${f.reason})`);
  }
  if (plan.unresolved.length) {
    console.log(`\n${plan.unresolved.length} khách KHÔNG xác định được — cần người quyết:\n`);
    for (const u of plan.unresolved) console.log(`  - ${u.email}: "${u.from}" (${u.reason})`);
    console.log('\n  Gán phần không thuộc dự án nào bằng --default-company="<tên công ty>", hoặc sửa tay.');
  }

  if (!APPLY) {
    console.log('\nĐây là chạy khô. Thêm `-- --apply` để sửa thật.');
    return;
  }

  for (const f of plan.fixes) {
    await User.updateOne({ _id: f.id }, { $set: { companyName: f.to, guestCompany: f.guestCompany } });
  }
  console.log(`\nĐã sửa ${plan.fixes.length} tài khoản khách.`);
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('Lỗi:', err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { planGuestMigration };
