import { HiOutlineFolder, HiOutlinePlus } from 'react-icons/hi';

export default function Projects() {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Dự án</h1>
          <p className="page-description">Theo dõi và quản lý tất cả dự án đang hoạt động</p>
        </div>
        <button className="btn btn-primary" id="btn-create-project">
          <HiOutlinePlus /> Tạo dự án
        </button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineFolder />
        </div>
        <h3 className="empty-state-title">Chưa có dự án nào</h3>
        <p className="empty-state-text">
          Bắt đầu bằng việc tạo dự án đầu tiên. Bạn có thể thêm thành viên, 
          task và theo dõi tiến độ từ đây.
        </p>
        <button className="btn btn-primary" id="btn-create-first-project">
          <HiOutlinePlus /> Tạo dự án đầu tiên
        </button>
      </div>
    </div>
  );
}
