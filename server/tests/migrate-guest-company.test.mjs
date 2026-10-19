/**
 * Kiểm thử đơn vị cho quyết định của `src/utils/migrate-guest-company.js`.
 * Không cần server hay database.
 *
 * Khách tạo trước bản vá `15aad4f` mang tên đối tác trong `companyName` — trường đó là
 * khóa phân lập, nên không công ty nào nhìn thấy họ nữa, trong khi họ vẫn đăng nhập
 * được. Không có trường nào ghi ai đã tạo họ, nên dấu vết duy nhất đáng tin là dự án
 * họ được thêm vào. Bộ này chốt: chỉ quy về công ty khi dấu vết KHÔNG mơ hồ, còn lại
 * phải báo ra để người chạy quyết, không được đoán.
 */
import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { planGuestMigration } = require('../src/utils/migrate-guest-company');

const A = 'Công ty A';
const B = 'Công ty B';
const users = [
  { _id: 'a1', companyName: A },
  { _id: 'b1', companyName: B },
  { _id: 'g-ok', companyName: A, isGuest: true, guestCompany: 'Đối tác X' },
  { _id: 'g-one', email: 'one@x.com', companyName: 'Đối tác Một', isGuest: true },
  { _id: 'g-two', email: 'two@x.com', companyName: 'Đối tác Hai', isGuest: true },
  { _id: 'g-none', email: 'none@x.com', companyName: 'Đối tác Ba', isGuest: true },
];
const projects = [
  { companyName: A, members: [{ user: 'g-one' }, { user: 'g-two' }] },
  { companyName: A, members: [{ user: 'g-one' }] },
  { companyName: B, members: [{ user: 'g-two' }] },
];

const plan = planGuestMigration({ users, projects });
const byId = (id) => [...plan.fixes, ...plan.unresolved].find((p) => p.id === id);

// ══════════════════════════════════════════════
S('Nhận diện khách mồ côi');
ok(!byId('g-ok'), 'Khách đã thuộc một công ty thật thì không đụng tới');
ok(!byId('a1') && !byId('b1'), 'Tài khoản thường không bao giờ nằm trong kế hoạch');

// ══════════════════════════════════════════════
S('Quy về công ty theo dự án');
{
  const one = byId('g-one');
  ok(plan.fixes.includes(one) && one.to === A,
    'Thuộc dự án của đúng một công ty (dù nhiều dự án) → quy về công ty đó', JSON.stringify(one));
  ok(one.guestCompany === 'Đối tác Một', 'Tên đối tác cũ chuyển sang guestCompany', one.guestCompany);
}

// ══════════════════════════════════════════════
S('Không đoán khi dấu vết mơ hồ');
ok(plan.unresolved.some((p) => p.id === 'g-two'), 'Thuộc dự án của hai công ty → để người chạy quyết');
ok(plan.unresolved.some((p) => p.id === 'g-none'), 'Không thuộc dự án nào → để người chạy quyết');

// ══════════════════════════════════════════════
S('Công ty mặc định do người chạy chỉ định');
{
  const withDefault = planGuestMigration({ users, projects, defaultCompany: A });
  const none = withDefault.fixes.find((p) => p.id === 'g-none');
  ok(none?.to === A, 'Khách không có dấu vết → gán vào công ty được chỉ định');
  ok(withDefault.unresolved.some((p) => p.id === 'g-two'),
    'Nhưng khách thuộc HAI công ty vẫn không bị gán ép — đó là mâu thuẫn, không phải thiếu dữ liệu');

  const bogus = planGuestMigration({ users, projects, defaultCompany: 'Công ty Không Tồn Tại' });
  ok(bogus.error && bogus.fixes.length === 0, 'Công ty chỉ định không tồn tại → từ chối cả kế hoạch', bogus.error);
}

process.exit(summary() ? 1 : 0);
