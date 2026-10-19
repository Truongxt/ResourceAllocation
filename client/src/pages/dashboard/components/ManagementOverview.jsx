import { Alert, Button, Card, Empty, Progress, Space, Table, Tag, Typography } from 'antd';
import { ArrowRightOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const workloadColor = { red: '#ef4444', yellow: '#f59e0b', green: '#10b981' };
const approvedSkills = (person) => (person.skills || [])
  .filter((skill) => skill.evaluationStatus === 'approved' || skill.managerLevel)
  .slice(0, 3)
  .map((skill) => `${skill.name} L${skill.managerLevel || skill.level}`)
  .join(' · ') || 'Chưa có kỹ năng được duyệt';

export default function ManagementOverview({ projects = [], productivity, loading, error }) {
  const navigate = useNavigate();
  const departments = [...(productivity?.departments || [])]
    .sort((a, b) => (b.overloadedCount - a.overloadedCount) || (b.utilizationRate - a.utilizationRate));
  const personnel = productivity?.personnel || [];
  const totalTasks = projects.reduce((sum, project) => sum + project.total, 0);
  const doneTasks = projects.reduce((sum, project) => sum + project.done, 0);
  const riskCount = projects.filter((project) => project.overdue || project.blocked || project.unassigned).length;
  const overloadedPeople = personnel.filter((person) => person.statusCode === 'red');
  const availablePeople = personnel.filter((person) => person.capacity > 0 && person.utilizationRate < 60 && person.statusCode !== 'red' && person.availability !== 'unavailable' && !person.isOnLeave);

  return (
    <section className="management-overview" aria-label="Tổng quan điều hành">
      <div className="management-overview-heading">
        <div>
          <Typography.Title level={4}>Toàn cảnh điều hành</Typography.Title>
          <Typography.Text type="secondary">Tổng hợp mọi dự án và nhân sự trong phạm vi bạn được quản lý/xem. Các thanh màu thể hiện tải, không phải điểm năng lực.</Typography.Text>
        </div>
        <Button onClick={() => navigate('/resources?tab=productivity')} icon={<ArrowRightOutlined />}>Xem cân bằng tải</Button>
      </div>
      <div className="management-summary-grid">
        <div><span>Tiến độ công việc</span><strong>{totalTasks ? Math.round(doneTasks / totalTasks * 100) : '—'}{totalTasks ? '%' : ''}</strong><small>{doneTasks}/{totalTasks} việc hoàn thành</small></div>
        <div><span>Dự án cần xử lý</span><strong className={riskCount ? 'danger' : ''}>{riskCount}</strong><small>có việc trễ hạn, bị chặn hoặc chưa giao</small></div>
        <div><span>Nhân sự quá tải</span><strong className={overloadedPeople.length ? 'danger' : ''}>{overloadedPeople.length}</strong><small>vượt 100% công suất tuần</small></div>
        <div><span>Còn công suất</span><strong>{availablePeople.length}</strong><small>dưới 60% công suất tuần</small></div>
      </div>
      <div className="management-overview-grid">
        <Card title="Tiến độ theo dự án" extra={<Button type="link" onClick={() => navigate('/projects')}>Tất cả dự án</Button>}>
          {projects.length ? (
            <Table
              size="small"
              rowKey="_id"
              dataSource={projects}
              scroll={{ x: 650 }}
              pagination={{ pageSize: 6, showSizeChanger: true }}
              onRow={(project) => ({ onClick: () => navigate(`/projects/${project._id}`), style: { cursor: 'pointer' } })}
              columns={[
                { title: 'Dự án', dataIndex: 'name', render: (name, row) => <><strong>{name}</strong><br /><Typography.Text type="secondary">{row.code || row.status}</Typography.Text></> },
                { title: 'Hoàn thành việc', width: 160, render: (_, row) => row.taskProgress === null ? <Typography.Text type="secondary">Chưa có công việc</Typography.Text> : <><Progress percent={row.taskProgress} size="small" showInfo={false} status={row.overdue ? 'exception' : 'normal'} />{row.done}/{row.total} ({row.taskProgress}%)</> },
                { title: 'Đang làm', dataIndex: 'inProgress', width: 85 },
                { title: 'Chờ duyệt', dataIndex: 'review', width: 90 },
                { title: 'Cần xử lý', width: 170, render: (_, row) => <Space wrap size={4}>{row.overdue > 0 && <Tag color="error">{row.overdue} trễ</Tag>}{row.blocked > 0 && <Tag color="volcano">{row.blocked} bị chặn</Tag>}{row.unassigned > 0 && <Tag color="gold">{row.unassigned} chưa giao</Tag>}{!row.overdue && !row.blocked && !row.unassigned && '—'}</Space> },
              ]}
            />
          ) : <Empty description="Chưa có dự án trong phạm vi của bạn" />}
        </Card>
        <Card title="Tải theo phòng ban" extra={<Button type="link" onClick={() => navigate('/resources?tab=productivity')}>Xem nhân sự</Button>} loading={loading}>
          {error && <Alert type="warning" showIcon message="Không tải được dữ liệu tải nhân sự" style={{ marginBottom: 12 }} />}
          {!error && departments.length === 0 && !loading ? <Empty description="Chưa có dữ liệu phòng ban" /> : null}
          <div className="management-departments">
            {departments.map((department) => (
              <div key={department.name} className="management-department">
                <div className="management-department-label"><strong>{department.name}</strong><span>{department.utilizationRate}% · {department.totalWorkload}/{department.totalCapacity} giờ/tuần</span></div>
                <div className="management-department-track" role="img" aria-label={`${department.name}: ${department.utilizationRate}% công suất, ${department.overloadedCount} người quá tải`}>
                  <div style={{ width: `${Math.min(department.utilizationRate, 100)}%`, background: workloadColor[department.statusCode] }} />
                </div>
                <small>{department.personnelCount} người · {department.overloadedCount > 0 ? `${department.overloadedCount} quá tải` : department.statusLabel}</small>
              </div>
            ))}
          </div>
          {overloadedPeople.length > 0 && <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginTop: 16 }} message={`${overloadedPeople.length} nhân sự cần san tải`} description={`Cân nhắc điều chuyển từ ${overloadedPeople.slice(0, 3).map((person) => person.name).join(', ')} sang người còn công suất, sau khi kiểm tra kỹ năng đã duyệt và thời hạn việc.`} />}
          <div className="management-people">
            <strong>Ưu tiên điều phối</strong>
            {overloadedPeople.slice(0, 3).map((person) => (
              <div key={person._id} className="management-person-row">
                <span><b>{person.name}</b><small>{person.department} · {person.activeTasks} việc đang nhận · Đúng hạn {person.productivityScore === null ? 'chưa đủ dữ liệu' : `${person.productivityScore}%`}</small></span>
                <Tag color="error">{person.utilizationRate}% tải</Tag>
              </div>
            ))}
            <strong>Người còn công suất để cân nhắc</strong>
            {availablePeople.length ? availablePeople.slice(0, 4).map((person) => (
              <div key={person._id} className="management-person-row">
                <span><b>{person.name}</b><small>{person.department} · {approvedSkills(person)}</small></span>
                <Tag color="gold">{person.utilizationRate}% tải</Tag>
              </div>
            )) : <Typography.Text type="secondary">Chưa có người dưới 60% công suất trong phạm vi xem.</Typography.Text>}
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Xanh: 60–85% · Vàng: dưới 60% hoặc 86–100% · Đỏ: trên 100%. Thanh đo tải dự kiến theo tuần; kết quả làm việc xem riêng ở Nhân sự.
          </Typography.Paragraph>
        </Card>
      </div>
    </section>
  );
}
