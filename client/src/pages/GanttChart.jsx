import { HiOutlineChartBar } from 'react-icons/hi';

export default function GanttChart() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Gantt Chart</h1>
        <p className="page-description">
          Biểu đồ timeline trực quan cho các dự án và công việc
        </p>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <HiOutlineChartBar />
        </div>
        <h3 className="empty-state-title">Chưa có dữ liệu Gantt Chart</h3>
        <p className="empty-state-text">
          Tạo dự án và công việc có ngày bắt đầu/kết thúc để xem biểu đồ 
          Gantt Chart tương tác tại đây.
        </p>
      </div>
    </div>
  );
}
