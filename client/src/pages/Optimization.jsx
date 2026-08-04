import { HiOutlineLightningBolt } from 'react-icons/hi';

export default function Optimization() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tối ưu hóa Phân bổ Nhân sự</h1>
        <p className="page-description">
          Sử dụng thuật toán Genetic Algorithm và CSP để tự động tìm phương án 
          phân bổ nhân sự tối ưu nhất
        </p>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineLightningBolt />
        </div>
        <h3 className="empty-state-title">Sẵn sàng tối ưu hóa</h3>
        <p className="empty-state-text">
          Thêm dự án, công việc và nhân sự trước, sau đó chạy thuật toán tối ưu hóa 
          để hệ thống đề xuất phân bổ nhân sự phù hợp nhất.
        </p>
        <button className="btn btn-accent btn-lg" id="btn-run-optimizer">
          <HiOutlineLightningBolt /> Chạy Tối ưu hóa
        </button>
      </div>
    </div>
  );
}
