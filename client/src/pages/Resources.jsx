import { HiOutlineUserGroup, HiOutlinePlus } from 'react-icons/hi';

export default function Resources() {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Nhân sự</h1>
          <p className="page-description">Quản lý thông tin, kỹ năng và lịch trình làm việc của nhân sự</p>
        </div>
        <button className="btn btn-primary" id="btn-add-member">
          <HiOutlinePlus /> Thêm nhân sự
        </button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineUserGroup />
        </div>
        <h3 className="empty-state-title">Chưa có nhân sự nào</h3>
        <p className="empty-state-text">
          Thêm nhân sự vào hệ thống kèm theo Skill Matrix để thuật toán 
          có thể đề xuất phân bổ tối ưu.
        </p>
        <button className="btn btn-primary" id="btn-add-first-member">
          <HiOutlinePlus /> Thêm nhân sự đầu tiên
        </button>
      </div>
    </div>
  );
}
