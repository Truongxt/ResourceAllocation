/**
 * ============================================================================
 * PANEL CẤU HÌNH THAM SỐ TỐI ƯU HÓA (Optimization Config Card Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép người dùng lựa chọn thuật toán (GA, CSP, Hybrid), chọn dự án cụ thể
 *     hoặc tối ưu toàn hệ thống.
 *   - Cung cấp các nút chọn nhanh cấu hình mẫu (Preset: Cân bằng tải, Khớp kỹ năng).
 *   - Cung cấp các thanh trượt tinh chỉnh trọng số đa mục tiêu (Multi-objective Weights)
 *     và các siêu tham số tiến hóa của Genetic Algorithm (Population, Generations, Crossover, Mutation).
 *
 * Props:
 *   - @param {string} algorithm - Thuật toán đang chọn: 'genetic' | 'csp' | 'hybrid'
 *   - @param {Function} setAlgorithm - Hàm đổi thuật toán
 *   - @param {Object} params - Tham số cấu hình hiện tại
 *   - @param {Function} setParams - Hàm cập nhật tham số
 *   - @param {Array} projects - Danh sách các dự án để lọc
 *   - @param {boolean} running - Trạng thái đang chạy thuật toán
 *   - @param {Function} onRun - Hàm kích hoạt chạy tối ưu hóa
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { Typography, Select, Button, Space, Divider, Row, Col, InputNumber, Slider } from 'antd';
import {
  PlayCircleOutlined,
  SettingOutlined,
  ControlOutlined,
  AimOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { ALGO_VALUES, ALGO_META } from './OptimizationConstants';

const { Title, Text } = Typography;

export default function OptimizationConfigCard({
  algorithm,
  setAlgorithm,
  params,
  setParams,
  projects = [],
  running = false,
  onRun,
  t,
}) {
  return (
    <div className="saas-card" style={{ padding: 20 }}>
      {/* Tiêu đề panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <SettingOutlined style={{ fontSize: 17, color: '#6366f1' }} />
        <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
          {t('optimization.configTitle') || 'Cấu hình Thuật toán'}
        </Title>
      </div>

      {/* Bộ chọn nhanh mẫu cấu hình (Presets) */}
      <div style={{ marginBottom: 16 }}>
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <ControlOutlined style={{ color: '#818cf8' }} />
          <span>{t('optimization.presetTitle') || 'Cấu hình mẫu (Presets)'}</span>
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button
            size="small"
            icon={<ApartmentOutlined style={{ color: '#06b6d4' }} />}
            onClick={() =>
              setParams((p) => ({
                ...p,
                workloadWeight: 0.5,
                skillWeight: 0.2,
                overallocationWeight: 0.3,
              }))
            }
            style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Cân bằng tải
          </Button>
          <Button
            size="small"
            icon={<AimOutlined style={{ color: '#10b981' }} />}
            onClick={() =>
              setParams((p) => ({
                ...p,
                workloadWeight: 0.2,
                skillWeight: 0.6,
                overallocationWeight: 0.2,
              }))
            }
            style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Khớp kỹ năng
          </Button>
        </div>
      </div>

      {/* Lựa chọn thuật toán */}
      <div style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          {t('optimization.chooseAlgo') || 'Thuật toán tối ưu'}
        </Text>
        <Select
          value={algorithm}
          onChange={setAlgorithm}
          style={{ width: '100%' }}
          options={ALGO_VALUES.map((v) => ({
            value: v,
            label: (
              <Space>
                <span>{ALGO_META[v].icon}</span>
                <span>{t(`optimization.algo.${v}.label`) || ALGO_META[v].label}</span>
              </Space>
            ),
          }))}
        />
      </div>

      {/* Bộ lọc theo dự án */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('optimization.filterByProject')}
        </Text>
        <Select
          style={{ width: '100%' }}
          placeholder={t('gantt.allProjects')}
          value={params.projectId || undefined}
          onChange={(val) => setParams((p) => ({ ...p, projectId: val || '' }))}
          allowClear
          options={projects.map((p) => ({
            value: p._id,
            label: `${p.code ? p.code + ' - ' : ''}${p.name}`,
          }))}
        />
      </div>

      {/* Các tham số tiến hóa GA (Chỉ hiển thị khi dùng GA hoặc Hybrid) */}
      {algorithm !== 'csp' && (
        <>
          <Divider style={{ margin: '16px 0' }}>{t('optimization.gaParams')}</Divider>
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col span={12}>
              <Text style={{ fontSize: 12 }}>Population Size</Text>
              <InputNumber
                min={10}
                max={500}
                value={params.populationSize}
                onChange={(val) => setParams((p) => ({ ...p, populationSize: val }))}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12}>
              <Text style={{ fontSize: 12 }}>Max Generations</Text>
              <InputNumber
                min={50}
                max={2000}
                value={params.maxGenerations}
                onChange={(val) => setParams((p) => ({ ...p, maxGenerations: val }))}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Text style={{ fontSize: 12 }}>Crossover Rate</Text>
              <InputNumber
                min={0.1}
                max={1}
                step={0.05}
                value={params.crossoverRate}
                onChange={(val) => setParams((p) => ({ ...p, crossoverRate: val }))}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12}>
              <Text style={{ fontSize: 12 }}>Mutation Rate</Text>
              <InputNumber
                min={0.01}
                max={0.5}
                step={0.01}
                value={params.mutationRate}
                onChange={(val) => setParams((p) => ({ ...p, mutationRate: val }))}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }}>{t('optimization.fitnessWeights')}</Divider>

          {/* Trọng số Cân bằng tải */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12 }}>{t('optimization.weightWorkload')}</Text>
              <Text strong style={{ fontSize: 12 }}>{params.workloadWeight}</Text>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={params.workloadWeight}
              onChange={(val) => setParams((p) => ({ ...p, workloadWeight: val }))}
            />
          </div>

          {/* Trọng số Khớp kỹ năng */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12 }}>{t('optimization.weightSkill')}</Text>
              <Text strong style={{ fontSize: 12 }}>{params.skillWeight}</Text>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={params.skillWeight}
              onChange={(val) => setParams((p) => ({ ...p, skillWeight: val }))}
            />
          </div>

          {/* Trọng số Chống quá tải */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12 }}>{t('optimization.weightOverload')}</Text>
              <Text strong style={{ fontSize: 12 }}>{params.overallocationWeight}</Text>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={params.overallocationWeight}
              onChange={(val) => setParams((p) => ({ ...p, overallocationWeight: val }))}
            />
          </div>
        </>
      )}

      {/* Nút thực thi chạy thuật toán */}
      <Button
        type="primary"
        icon={<PlayCircleOutlined />}
        onClick={onRun}
        loading={running}
        block
        size="large"
        style={{ marginTop: 16, height: 44, borderRadius: 8 }}
      >
        {running ? t('optimization.running') : t('optimization.run')}
      </Button>
    </div>
  );
}
