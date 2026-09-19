import { Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

export default function LandingHero({ isAuthenticated, navigate, scrollToSection }) {
  return <section className="product-intro">
    <div className="product-intro-copy">
      <span className="product-eyebrow">RAO / ĐIỀU PHỐI NGUỒN LỰC</span>
      <h1>Đúng người.<br />Rõ việc.<br /><span>Vừa sức đội ngũ.</span></h1>
      <p>Nắm tiến độ từng dự án, biết ai còn thời gian và ai đang quá tải. Xem phương án phân công trước khi áp dụng cho nhóm.</p>
      <div className="product-intro-actions">
        <Button type="primary" size="large" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}>{isAuthenticated ? 'Mở không gian làm việc' : 'Tạo không gian làm việc'} <ArrowRightOutlined /></Button>
        <Button type="text" size="large" onClick={() => scrollToSection('sandbox')}>Xem cách phân bổ →</Button>
      </div>
      <p className="product-intro-note">Dự án · Công việc · Nhân sự · Phân bổ</p>
    </div>
    <figure className="allocation-preview">
      <figcaption><strong>Phân bổ trong tuần</strong><span>Dữ liệu minh họa</span></figcaption>
      <div className="allocation-preview-summary"><span>Nhóm sản phẩm</span><strong>108 / 120 <small>giờ</small></strong></div>
      <div className="allocation-preview-columns"><span>Nhân sự / Công việc</span><span>Tải công việc</span></div>
      {[
        { name: 'Minh Anh', task: 'Thiết kế luồng đặt hàng', hours: 32, percent: 80 },
        { name: 'Hoàng Nam', task: 'Tích hợp thanh toán', hours: 48, percent: 120 },
        { name: 'Thu Hà', task: 'Kiểm thử và bàn giao', hours: 28, percent: 70 },
      ].map(person => <div className="allocation-person" key={person.name}>
        <div><strong>{person.name}</strong><span>{person.task}</span></div>
        <div className={person.percent > 100 ? 'allocation-load is-overloaded' : 'allocation-load'}><span>{person.hours} / 40 giờ</span><div className="allocation-track"><i style={{ width: Math.min(person.percent, 100) + '%' }} /></div></div>
      </div>)}
      <div className="allocation-preview-note"><strong>01 người vượt khả năng làm việc</strong><p>Xem kỹ năng và thời gian còn trống trước khi điều chuyển công việc.</p></div>
      <div className="allocation-preview-footer"><span>Phương án được kiểm tra trước khi áp dụng</span><ArrowRightOutlined /></div>
    </figure>
  </section>;
}
