/**
 * ============================================================================
 * TRANG GIỚI THIỆU HỆ THỐNG RAO STUDIO (Landing Page)
 * ============================================================================
 *
 * Mục đích:
 *   - Trang chủ chính của hệ thống RAO Studio phong cách Enterprise SaaS (Jira/Atlassian).
 *   - Trình diễn các ưu thế công nghệ, thuật toán tối ưu hóa nguồn lực AI,
 *     bảng đối chứng thực nghiệm, hộp cát tương tác trực tiếp (Live Sandbox),
 *     và thông tin bảo vệ đồ án tốt nghiệp.
 *
 * Cấu trúc các module con:
 *   - LandingNavbar: Thanh thông báo đề tài & Header điều hướng chính
 *   - LandingHero: Tiêu đề giới thiệu, CTA buttons, cửa sổ mô phỏng Kanban & AI Solver
 *   - LandingSandbox: Hộp cát kéo thả thực nghiệm thuật toán thời gian thực
 *   - LandingFeatures: Khối 5 tính năng cốt lõi (Tối ưu hóa, Gantt CPM, Skill Matrix, Burnout, Benchmark)
 *   - LandingComparison: Bảng so sánh trực tiếp với Jira / Trello & Hệ sinh thái Mobile Expo
 *   - LandingFooter: Thông tin đồ án, CTA cuối trang và Chân trang bản quyền
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LandingNavbar from './components/LandingNavbar';
import LandingHero from './components/LandingHero';
import LandingSandbox from './components/LandingSandbox';
import LandingFeatures from './components/LandingFeatures';
import LandingComparison from './components/LandingComparison';
import LandingFooter from './components/LandingFooter';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Trạng thái cho khối Live Sandbox
  const [sandboxTasks, setSandboxTasks] = useState(60);
  const [sandboxResources, setSandboxResources] = useState(15);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResult, setSandboxResult] = useState({
    fitness: 0.942,
    runtime: 18,
    skillMatch: 96,
    workloadStdDev: 3.4,
    violations: 0,
    solvedCount: 60,
  });

  // Tab tính năng đang chọn
  const [activeTab, setActiveTab] = useState('optimization');

  /**
   * Tính toán mô phỏng giải thuật khi người dùng kéo thanh trượt trong Sandbox
   */
  const runSandboxCalculation = () => {
    setSandboxRunning(true);
    setTimeout(() => {
      const estimatedRuntime = Math.round(
        Math.max(4, (sandboxTasks * sandboxResources) / 45 + Math.random() * 8)
      );
      const estimatedFitness = parseFloat((0.91 + Math.random() * 0.06).toFixed(3));
      const estimatedSkillMatch = Math.round(92 + Math.random() * 6);
      const estimatedStdDev = parseFloat((2.8 + (sandboxTasks / sandboxResources) * 0.4).toFixed(1));

      setSandboxResult({
        fitness: estimatedFitness,
        runtime: estimatedRuntime,
        skillMatch: estimatedSkillMatch,
        workloadStdDev: estimatedStdDev,
        violations: 0,
        solvedCount: sandboxTasks,
      });
      setSandboxRunning(false);
    }, 400);
  };

  /**
   * Cuộn mượt mà đến phần nội dung tương ứng
   */
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-wrapper ${isDark ? 'theme-dark' : 'theme-light'}`}>
      {/* 1. Thanh điều hướng & Thông báo */}
      <LandingNavbar
        isAuthenticated={isAuthenticated}
        user={user}
        isDark={isDark}
        toggleTheme={toggleTheme}
        scrollToSection={scrollToSection}
        navigate={navigate}
      />

      {/* 2. Phần Hero Banner & Mockup trực quan */}
      <LandingHero
        isAuthenticated={isAuthenticated}
        user={user}
        navigate={navigate}
        scrollToSection={scrollToSection}
      />

      {/* 3. Khối Mô Phỏng Giải Thuật Tương Tác (Live Sandbox) */}
      <LandingSandbox
        sandboxTasks={sandboxTasks}
        setSandboxTasks={setSandboxTasks}
        sandboxResources={sandboxResources}
        setSandboxResources={setSandboxResources}
        sandboxRunning={sandboxRunning}
        sandboxResult={sandboxResult}
        onRunSandbox={runSandboxCalculation}
      />

      {/* 4. Khối Tính năng Vượt trội (Tabbed Features) */}
      <LandingFeatures
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 5. Bảng So sánh Năng lực & Hệ sinh thái Web/Mobile */}
      <LandingComparison />

      {/* 6. Thông tin Đồ án Tốt nghiệp & Chân trang */}
      <LandingFooter
        isAuthenticated={isAuthenticated}
        navigate={navigate}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
