import { HiOutlineClipboardList, HiOutlinePlus } from 'react-icons/hi';

export default function Tasks() {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Công việc</h1>
          <p className="page-description">Quản lý và phân công công việc cho các dự án</p>
        </div>
        <button className="btn btn-primary" id="btn-create-task">
          <HiOutlinePlus /> Tạo công việc
        </button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineClipboardList />
        </div>
        <h3 className="empty-state-title">Chưa có công việc nào</h3>
        <p className="empty-state-text">
          Tạo task mới và gán cho dự án. Hệ thống sẽ hỗ trợ bạn phân bổ 
          nhân sự phù hợp dựa trên kỹ năng và availability.
        </p>
        <button className="btn btn-primary" id="btn-create-first-task">
          <HiOutlinePlus /> Tạo công việc đầu tiên
        </button>
      </div>
    </div>
  );
}
