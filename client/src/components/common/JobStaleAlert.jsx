import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'antd';
import dayjs from 'dayjs';
import jobService from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';

/**
 * Cảnh báo job định kỳ quá hạn, cho Owner/Admin.
 *
 * Job do cron bên ngoài gọi (`POST /api/internal/jobs/:name`), nên quên cấu hình cron thì
 * không có lỗi nào nổ ra: việc lặp lại cứ thế không sinh, ảnh chụp workload cứ thế trống.
 *
 * Không tải được trạng thái thì im lặng: đây là thông tin phụ, không được chặn Dashboard.
 */
export default function JobStaleAlert() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canSee = !!user && (user.isOwner || user.role === 'admin');
  const [staleJobs, setStaleJobs] = useState([]);

  useEffect(() => {
    if (!canSee) return undefined;
    let cancelled = false;
    jobService
      .getStatus()
      .then((response) => {
        if (!cancelled) setStaleJobs((response.data.data.jobs || []).filter((job) => job.stale));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canSee]);

  if (!canSee || staleJobs.length === 0) return null;

  const describe = (job) => {
    if (job.lastStatus === 'failed' && job.lastError) {
      return t('workspace.jobs.lastFailed', { error: job.lastError });
    }
    if (!job.lastSuccessAt) return t('workspace.jobs.neverRan');
    return t('workspace.jobs.lastSuccess', { time: dayjs(job.lastSuccessAt).format('DD/MM/YYYY HH:mm') });
  };

  return (
    <Alert
      type="warning"
      showIcon
      className="dashboard-error"
      title={t('workspace.jobs.staleTitle')}
      description={
        <>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            {staleJobs.map((job) => (
              <li key={job.name}>
                <strong>{t(`workspace.jobs.names.${job.name}`, { defaultValue: job.description || job.name })}</strong>
                {': '}
                {describe(job)}
              </li>
            ))}
          </ul>
          {t('workspace.jobs.staleHint')}
        </>
      }
    />
  );
}
