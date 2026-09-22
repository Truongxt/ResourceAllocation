const Department = require('../models/Department');
const Resource = require('../models/Resource');
const Project = require('../models/Project');
const CompanySetting = require('../models/CompanySetting');
const { logActivity } = require('../services/activityLog.service');

const DEFAULT_COMPANY = 'Công ty Công nghệ RAO';

/** Bản ghi thiếu `companyName` là dữ liệu cũ, thuộc về công ty mặc định. */
const companyOfDept = (department) => department.companyName || DEFAULT_COMPANY;

const getDepartments = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

    // Multi-tenant: mỗi công ty chỉ truy xuất và quản lý phòng ban của chính công ty mình.
    //
    // Công ty mặc định nhận luôn bản ghi **thiếu** `companyName`: đó là dữ liệu
    // tạo trước khi model có giá trị mặc định, và toàn bộ nó vốn thuộc về công ty
    // này. Đây cũng đúng idiom mà `getProjects`/`getResources` đang dùng.
    //
    // Lọc khớp chính xác như trước khiến những bản ghi cũ đó không khớp bộ lọc
    // nào — mà nhánh nhân bản phòng ban mẫu bên dưới lại bỏ qua công ty mặc định,
    // nên trang Phòng ban trống trơn và không có gì tự chữa.
    filter.companyName =
      userCompany === DEFAULT_COMPANY
        ? { $in: [userCompany, null, undefined] }
        : userCompany;

    let departments = await Department.find(filter)
      .populate('managers', 'name email avatar jobTitle department')
      .sort('name');

    // Nếu công ty chưa có phòng ban nào (công ty mới khởi tạo), tự động nhân bản/seed bộ phòng ban mẫu cho công ty này
    if (departments.length === 0 && userCompany !== 'Công ty Công nghệ RAO') {
      const templateDepts = await Department.find({
        companyName: 'Công ty Công nghệ RAO',
      }).lean();

      if (templateDepts.length > 0) {
        const newDepts = templateDepts.map((td) => ({
          name: td.name,
          code: td.code,
          description: td.description,
          color: td.color,
          isActive: td.isActive !== false,
          companyName: userCompany,
          managers: [],
        }));
        await Department.insertMany(newDepts);
        departments = await Department.find(filter)
          .populate('managers', 'name email avatar jobTitle department')
          .sort('name');
      }
    }

    const [counts, projectCounts] = await Promise.all([
      Resource.aggregate([
        { $match: { isActive: true, companyName: userCompany } },
        { $group: { _id: '$department', resourceCount: { $sum: 1 } } },
      ]),
      Project.aggregate([
        { $match: { companyName: userCompany, department: { $ne: null } } },
        { $group: { _id: '$department', projectCount: { $sum: 1 } } },
      ]),
    ]);

    const countMap = counts.reduce((map, item) => {
      if (item._id) map[item._id] = item.resourceCount;
      return map;
    }, {});

    const projectCountMap = projectCounts.reduce((map, item) => {
      if (item._id) map[item._id.toString()] = item.projectCount;
      return map;
    }, {});

    res.json({
      success: true,
      count: departments.length,
      data: {
        departments: departments.map((department) => ({
          ...department.toObject(),
          resourceCount: countMap[department.name] || 0,
          projectCount: projectCountMap[department._id.toString()] || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('managers', 'name email avatar jobTitle department');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban' });
    }

    // Chỉ công ty của chính mình. Endpoint này trả kèm danh sách dự án của phòng
    // ban — gồm cả ngân sách và người quản lý — nên đọc nhầm công ty là rò rỉ
    // thật, không phải chuyện hiển thị.
    //
    // Không mở ngoại lệ cho phòng ban "mẫu": `getDepartments` **nhân bản** bộ mẫu
    // vào từng công ty ngay lần liệt kê đầu tiên, nên không luồng nào cần đọc
    // bản gốc theo id. Mà bản gốc lại thuộc công ty mặc định — cũng là một tenant
    // thật, có dự án và ngân sách thật.
    // Bản ghi thiếu `companyName` được quy về công ty mặc định, không phải
    // "ai cũng xem được" — nếu không, dữ liệu cũ thành cửa mở cho mọi công ty.
    const userCompany = (req.user && req.user.companyName) || DEFAULT_COMPANY;
    if (companyOfDept(department) !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên phòng ban của công ty khác',
      });
    }

    const projects = await Project.find({ department: department._id })
      .select('name code status priority progress manager startDate endDate budget')
      .populate('manager', 'name email avatar')
      .sort('-createdAt');

    res.json({
      success: true,
      data: {
        department: {
          ...department.toObject(),
          projectCount: projects.length,
        },
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const isOwner = Boolean(req.user?.isOwner);
    const isAdmin = req.user?.role === 'admin';
    const isWeworkAdmin = req.user?.appAdmins?.includes('work');

    let canCreate = isOwner || isAdmin || isWeworkAdmin;

    // Kiểm tra cấu hình hệ thống Base Wework của công ty
    if (!canCreate) {
      const settings = await CompanySetting.findOne({ companyName: userCompany });
      if (settings?.createDepartmentPermission === 'all_members') {
        canCreate = true;
      }
    }

    if (!canCreate) {
      return res.status(403).json({
        success: false,
        message: 'Theo cài đặt hệ thống của công ty, chỉ Quản trị viên (Admin & App Admin) mới có quyền tạo Department mới.',
      });
    }

    const department = await Department.create({
      ...req.body,
      companyName: userCompany,
    });

    const populated = await Department.findById(department._id)
      .populate('managers', 'name email avatar jobTitle department');

    await logActivity({
      req,
      action: 'CREATE_DEPARTMENT',
      entityType: 'department',
      entityId: department._id,
      entityTitle: department.name,
      description: `Tạo phòng ban ${department.name}`,
    });

    res.status(201).json({
      success: true,
      data: { department: populated },
      message: 'Thêm phòng ban thành công',
    });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban' });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    // Trường hợp 1: Phòng ban thuộc đúng công ty của user hoặc superadmin
    if (department.companyName === userCompany || req.user.role === 'superadmin') {
      const isDeptManager = department.managers && department.managers.some((m) => m.toString() === req.user._id.toString());
      if (req.user.role !== 'admin' && !req.user.isOwner && !isDeptManager) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa Department này.',
        });
      }

      const updatedDepartment = await Department.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate('managers', 'name email avatar jobTitle department');

      await logActivity({
        req,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'department',
        entityId: department._id,
        entityTitle: updatedDepartment.name,
        description: `Cập nhật phòng ban ${updatedDepartment.name}`,
      });

      return res.json({
        success: true,
        data: { department: updatedDepartment },
        message: 'Cập nhật phòng ban thành công',
      });
    }

    // Trường hợp 2: CEO / Admin của công ty đang cập nhật phòng ban mẫu (template) kế thừa từ RAO
    if ((req.user.isOwner || req.user.role === 'admin') && department.companyName === 'Công ty Công nghệ RAO') {
      // Tìm xem công ty đã có phòng ban cùng tên chưa
      let targetDept = await Department.findOne({
        companyName: userCompany,
        name: department.name,
      });

      if (targetDept) {
        if (req.body.code !== undefined) targetDept.code = req.body.code;
        if (req.body.description !== undefined) targetDept.description = req.body.description;
        if (req.body.color !== undefined) targetDept.color = req.body.color;
        if (req.body.managers !== undefined) targetDept.managers = req.body.managers;
        await targetDept.save();
      } else {
        targetDept = await Department.create({
          ...req.body,
          name: req.body.name || department.name,
          code: req.body.code || department.code,
          description: req.body.description !== undefined ? req.body.description : department.description,
          color: req.body.color || department.color,
          managers: req.body.managers || [],
          companyName: userCompany,
        });
      }

      const populated = await Department.findById(targetDept._id)
        .populate('managers', 'name email avatar jobTitle department');

      await logActivity({
        req,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'department',
        entityId: targetDept._id,
        entityTitle: targetDept.name,
        description: `Cập nhật và sở hữu phòng ban ${targetDept.name} cho ${userCompany}`,
      });

      return res.json({
        success: true,
        data: { department: populated },
        message: 'Cập nhật phòng ban thành công',
      });
    }

    return res.status(403).json({ success: false, message: 'Không có quyền thao tác trên phòng ban của công ty khác' });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban' });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (department.companyName && department.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Không có quyền thao tác trên phòng ban của công ty khác' });
    }

    if (req.user.role !== 'admin' && !req.user.isOwner) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên mới có quyền xóa phòng ban.' });
    }

    const resourceCount = await Resource.countDocuments({
      department: department.name,
      companyName: userCompany,
      isActive: true,
    });
    if (resourceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa phòng ban đang có nhân sự. Hãy chuyển nhân sự sang phòng ban khác trước.',
      });
    }

    // Gỡ phân nhóm khỏi các dự án thuộc department này
    await Project.updateMany({ department: department._id }, { $set: { department: null } });

    await department.deleteOne();

    await logActivity({
      req,
      action: 'DELETE_DEPARTMENT',
      entityType: 'department',
      entityId: req.params.id,
      entityTitle: department.name,
      description: `Xóa phòng ban ${department.name}`,
      details: { code: department.code },
    });

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Xóa phòng ban thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
