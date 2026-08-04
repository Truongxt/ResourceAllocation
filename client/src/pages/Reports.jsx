import { HiOutlineDocumentReport } from 'react-icons/hi';

export default function Reports() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Báo cáo & Thống kê</h1>
        <p className="page-description">
          Báo cáo tổng hợp phân bổ nguồn lực, utilization rate và burnout risk
        </p>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineDocumentReport />
        </div>
        <h3 className="empty-state-title">Chưa có dữ liệu báo cáo</h3>
        <p className="empty-state-text">
          Khi hệ thống có đủ dữ liệu, bạn có thể xem các báo cáo phân bổ, 
          xuất PDF/Excel và theo dõi lịch sử tối ưu hóa.
        </p>
      </div>
    </div>
  );
}
