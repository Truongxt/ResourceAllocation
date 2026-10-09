import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import resourceService from '../../services/resourceService';
import SelfSkillEvaluationModal from '../resources/SelfSkillEvaluationModal';

export default function MySkillAssessmentTab() {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await resourceService.getMyEvaluation();
      setResource(response.data.data.resource);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được hồ sơ năng lực của bạn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (skills) => {
    setSubmitting(true);
    try {
      await resourceService.selfEvaluate(skills);
      message.success('Đã gửi bản tự đánh giá để quản lý xem xét');
      setOpen(false);
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không gửi được bản tự đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card loading={loading} title="Năng lực của tôi" extra={<Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>}>
      <Typography.Paragraph type="secondary">
        Thành viên tự chấm kỹ năng tại đây. Quản lý sẽ đối chiếu, phản hồi và phê duyệt trong trang Nhân sự.
        Mức tự chấm chưa được dùng làm mức năng lực chính thức để giao việc.
      </Typography.Paragraph>
      {error ? <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      {resource ? (
        <>
          <Space wrap style={{ marginBottom: 16 }}>
            <Tag>{resource.position || 'Chưa có vị trí'}</Tag>
            <Tag color="blue">{resource.department || 'Chưa có phòng ban'}</Tag>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setOpen(true)}>Tự đánh giá năng lực</Button>
          </Space>
          <Table
            size="small"
            rowKey={(skill) => skill._id || skill.name}
            dataSource={resource.skills || []}
            locale={{ emptyText: <Empty description="Chưa có kỹ năng. Hãy bắt đầu tự đánh giá." /> }}
            pagination={false}
            scroll={{ x: 580 }}
            columns={[
              { title: 'Kỹ năng', dataIndex: 'name' },
              { title: 'Tự đánh giá', dataIndex: 'selfLevel', render: (value, row) => row.evaluationStatus === 'draft' ? '—' : `Mức ${value || '—'}` },
              { title: 'Quản lý duyệt', dataIndex: 'managerLevel', render: (value) => value ? `Mức ${value}` : 'Chưa duyệt' },
              { title: 'Trạng thái', dataIndex: 'evaluationStatus', render: (value) => <Tag color={value === 'approved' ? 'success' : 'warning'}>{value === 'approved' ? 'Đã duyệt' : value === 'self_assessed' ? 'Chờ quản lý' : 'Chưa đánh giá'}</Tag> },
              { title: 'Phản hồi', dataIndex: 'managerFeedback', render: (value) => value || '—' },
            ]}
          />
          <SelfSkillEvaluationModal open={open} onClose={() => setOpen(false)} currentResource={resource} onSubmit={submit} submitting={submitting} />
        </>
      ) : !loading && !error ? <Empty description="Chưa có hồ sơ năng lực" /> : null}
    </Card>
  );
}
