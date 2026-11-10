import { useState } from 'react';
import { Button } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';

export default function LandingHero({ isAuthenticated, navigate, scrollToSection }) {
  const [balanced, setBalanced] = useState(false);

  const initialRows = [
    { name: 'Minh Anh', task: 'Thiết kế giao diện thanh toán', hours: 32, percent: 80 },
    { name: 'Hoàng Nam', task: 'Tích hợp cổng thanh toán & bảo mật', hours: 48, percent: 120 },
    { name: 'Thu Hà', task: 'Kiểm thử hộp đen & bàn giao', hours: 28, percent: 70 },
  ];

  const balancedRows = [
    { name: 'Minh Anh', task: 'Thiết kế giao diện thanh toán', hours: 36, percent: 90 },
    { name: 'Hoàng Nam', task: 'Kiểm thử & bảo mật cổng thanh toán', hours: 36, percent: 90 },
    { name: 'Thu Hà', task: 'Tích hợp API phụ & kiểm thử hộp đen', hours: 36, percent: 90 },
  ];

  const currentRows = balanced ? balancedRows : initialRows;

  return (
    <section className="product-intro">
      <div className="product-intro-copy">
        <h1>Điều phối nguồn lực.<br />Chính xác từng dự án.</h1>
        <p>
          Tự động cân bằng tải công việc theo thời gian thực. Phát hiện người quá tải, 
          khớp đúng kỹ năng và xem trước phương án phân công trước khi áp dụng.
        </p>
        <div className="product-intro-actions">
          <Button
            type="primary"
            size="large"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
          >
            {isAuthenticated ? 'Mở không gian làm việc' : 'Bắt đầu sử dụng'} <ArrowRightOutlined />
          </Button>
          <Button
            type="default"
            size="large"
            onClick={() => scrollToSection('sandbox')}
          >
            Thử nghiệm phân bổ →
          </Button>
        </div>
        <p className="product-intro-note">
          Thuật toán tối ưu hóa đa mục tiêu · Tiến độ Gantt CPM · Ma trận năng lực
        </p>
      </div>

      <figure className="allocation-preview" data-ui>
        <figcaption>
          <div>
            <strong>Phân bổ nhân sự tuần hiện tại</strong>
            <span>Đội ngũ kỹ thuật 3 thành viên</span>
          </div>
          <div className="allocation-preview-toggle">
            <button
              type="button"
              className={`toggle-opt-btn ${!balanced ? 'is-active' : ''}`}
              onClick={() => setBalanced(false)}
            >
              Chưa tối ưu
            </button>
            <button
              type="button"
              className={`toggle-opt-btn ${balanced ? 'is-active' : ''}`}
              onClick={() => setBalanced(true)}
            >
              Đã cân bằng
            </button>
          </div>
        </figcaption>

        <div className="allocation-preview-summary">
          <span>Tổng số giờ công việc đã giao</span>
          <strong>108 / 120 <small>giờ (90% công suất)</small></strong>
        </div>

        <div className="allocation-preview-columns">
          <span>Nhân sự & Công việc giao</span>
          <span>Tải tuần (chuẩn 40h)</span>
        </div>

        {currentRows.map((person) => (
          <div className="allocation-person" key={person.name}>
            <div>
              <strong>{person.name}</strong>
              <span>{person.task}</span>
            </div>
            <div className={person.percent > 100 ? 'allocation-load is-overloaded' : 'allocation-load'}>
              <span>{person.hours} / 40 giờ ({person.percent}%)</span>
              <div className="allocation-track">
                <i style={{ width: Math.min(person.percent, 100) + '%' }} />
              </div>
            </div>
          </div>
        ))}

        <div className="allocation-preview-note">
          {!balanced ? (
            <>
              <strong className="status-warning-text">
                <AlertOutlined style={{ marginRight: 6 }} />
                1 nhân sự quá tải 120% (Hoàng Nam)
              </strong>
              <p>Thuật toán phát hiện phân công vượt ngưỡng 40 giờ. Nhấn 'Đã cân bằng' để xem phương án san tải.</p>
            </>
          ) : (
            <>
              <strong className="status-success-text">
                <CheckCircleOutlined style={{ marginRight: 6 }} />
                Toàn bộ đội ngũ đạt tải cân bằng 90% (36h/người)
              </strong>
              <p>Công việc được điều chuyển hợp lý dựa trên độ khớp kỹ năng kiểm thử và thời gian trống.</p>
            </>
          )}
        </div>

        <div className="allocation-preview-footer">
          <span>Mô hình phân bổ tự động dựa trên thuật toán tối ưu hóa đa mục tiêu</span>
          <ArrowRightOutlined />
        </div>
      </figure>
    </section>
  );
}
