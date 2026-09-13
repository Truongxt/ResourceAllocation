// Bộ kiểm thử tính năng Quản lý Department (Phân nhóm / Phòng ban) chuẩn Base Wework
// Tài liệu tham chiếu: https://help.base.vn/support/solutions/articles/63000252551-base-wework-c%C3%A1ch-t%E1%BA%A1o-m%E1%BB%9Bi-1-department

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let memberUserId;
let deptId;
let projectId;

S('Base Wework Department: 1. Đăng nhập & Xác thực vai trò');
{
  const adminLogin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  TOK.admin = adminLogin.data?.token;

  const memberLogin = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = memberLogin.data?.token;
  memberUserId = memberLogin.data?.user?._id;

  const pmLogin = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pmLogin.data?.token;

  ok(!!TOK.admin && !!TOK.member && !!TOK.pm, 'Đăng nhập thành công các tài khoản Admin, Member, PM');
}

S('Base Wework Department: 2. Phân quyền tạo Department');
{
  // Member thử tạo Department -> Bị chặn 403 (Chuẩn Base.vn: chỉ System Owner & App Admin mới được tạo)
  const memberCreate = await call('POST', '/departments', {
    token: TOK.member,
    body: {
      name: 'Phòng ban do Member tạo',
      code: 'MBR',
    },
  });
  ok(memberCreate.status === 403, 'Member tạo Department bị từ chối 403');

  // PM thử tạo Department -> Bị chặn 403
  const pmCreate = await call('POST', '/departments', {
    token: TOK.pm,
    body: {
      name: 'Phòng ban do PM tạo',
      code: 'PMD',
    },
  });
  ok(pmCreate.status === 403, 'PM tạo Department bị từ chối 403');

  // Admin tạo Department với đầy đủ thông tin: name, code, managers tag, color, description
  const rnd = Date.now();
  const adminCreate = await call('POST', '/departments', {
    token: TOK.admin,
    body: {
      name: `Khối Công nghệ Thông tin ${rnd}`,
      code: 'CNTT',
      managers: [memberUserId],
      color: '#10b981',
      description: 'Chịu trách nhiệm phát triển hạ tầng công nghệ và sản phẩm phần mềm',
    },
  });

  ok(adminCreate.status === 201, 'Admin tạo Department thành công 201');
  deptId = adminCreate.data?.department?._id;
  ok(!!deptId, 'Nhận được deptId');
  ok(adminCreate.data?.department?.color === '#10b981', 'Lưu màu sắc nhận diện chính xác');
  ok(adminCreate.data?.department?.managers?.length > 0, 'Gắn tag Quản lý phân nhóm thành công');
}

S('Base Wework Department: 3. Đọc danh sách & Chi tiết Department');
{
  // GET /departments
  const listRes = await call('GET', '/departments', { token: TOK.admin });
  ok(listRes.status === 200, 'Lấy danh sách Department trả 200');
  const found = listRes.data?.departments?.find((d) => d._id === deptId);
  ok(!!found, 'Tìm thấy Department vừa tạo trong danh sách');
  ok(found?.projectCount !== undefined, 'Department có chỉ số projectCount');
  ok(found?.resourceCount !== undefined, 'Department có chỉ số resourceCount');

  // GET /departments/:id
  const detailRes = await call('GET', `/departments/${deptId}`, { token: TOK.admin });
  ok(detailRes.status === 200, 'Lấy chi tiết Department trả 200');
  ok(detailRes.data?.department?._id === deptId, 'Dữ liệu chi tiết trả đúng ID');
  ok(Array.isArray(detailRes.data?.projects), 'Trả về mảng projects trực thuộc Department');
}

S('Base Wework Department: 4. Phân nhóm Department cho Dự án (Tạo mới & Lọc)');
{
  // Admin tạo dự án gắn vào Department vừa tạo
  const projRes = await call('POST', '/projects', {
    token: TOK.admin,
    body: {
      name: `Dự án ERP ${Date.now()}`,
      description: 'Dự án phân nhóm vào Khối CNTT',
      department: deptId,
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    },
  });
  ok(projRes.status === 201, 'Tạo dự án gắn Department thành công 201');
  projectId = projRes.data?.project?._id;
  ok(projRes.data?.project?.department?._id === deptId || projRes.data?.project?.department === deptId, 'Dự án lưu đúng Department');

  // Lọc dự án theo Department
  const filterProj = await call('GET', `/projects?department=${deptId}`, { token: TOK.admin });
  ok(filterProj.status === 200, 'Lọc dự án theo department trả 200');
  const hasProj = filterProj.data?.projects?.some((p) => p._id === projectId);
  ok(hasProj, 'Dự án xuất hiện trong kết quả lọc theo Department');

  // Kiểm tra projectCount trong danh sách department tăng lên
  const listAfterProj = await call('GET', '/departments', { token: TOK.admin });
  const deptAfter = listAfterProj.data?.departments?.find((d) => d._id === deptId);
  ok(deptAfter?.projectCount >= 1, `Chỉ số projectCount phản ánh đúng (${deptAfter?.projectCount} dự án)`);
}

S('Base Wework Department: 5. Chỉnh sửa nhanh Dự án (Quick Edit)');
{
  // Quản lý chỉnh sửa nhanh tên và trạng thái dự án
  const quickRes = await call('PATCH', `/projects/${projectId}/quick-edit`, {
    token: TOK.admin,
    body: {
      name: 'Dự án ERP - Đã Chỉnh Sửa Nhanh',
      status: 'in_progress',
      department: deptId,
    },
  });
  ok(quickRes.status === 200, 'Chỉnh sửa nhanh dự án trả 200');
  ok(quickRes.data?.project?.name === 'Dự án ERP - Đã Chỉnh Sửa Nhanh', 'Tên dự án cập nhật đúng');
  ok(quickRes.data?.project?.status === 'in_progress', 'Trạng thái dự án cập nhật đúng');
}

S('Base Wework Department: 6. Dọn dẹp & Tự động gỡ phân nhóm dự án');
{
  // Xóa Department
  const delDept = await call('DELETE', `/departments/${deptId}`, { token: TOK.admin });
  ok(delDept.status === 200, 'Xóa Department thành công 200');

  // Kiểm tra dự án trước đó: trường department tự động chuyển về null (không bị trỏ rác)
  const projAfter = await call('GET', `/projects/${projectId}`, { token: TOK.admin });
  ok(projAfter.status === 200, 'Lấy lại thông tin dự án trả 200');
  ok(!projAfter.data?.project?.department, 'Dự án tự động chuyển về Chưa phân nhóm (department: null)');

  // Dọn dự án
  await call('DELETE', `/projects/${projectId}?force=true`, { token: TOK.admin });
  ok(true, 'Đã dọn dẹp dự án thử nghiệm');
}

const failed = summary();
process.exit(failed ? 1 : 0);
