"""Upgrade all 10 Sequence Diagrams (SEQ-01..10) and 10 Activity Diagrams (ACT-01..10)
in ResourceAllocation_UML_MotKhung.vpp to the detailed multi-tier academic UML style.
"""

from __future__ import annotations

import hashlib
import re
import shutil
import sqlite3
import sys
from pathlib import Path

from test_vp10_detailed_style import (
    CF_REL_CONTAINER,
    MSG_REL_CONTAINER,
    build_act_node_model,
    build_act_node_shape,
    build_activation_embed,
    build_activation_shape,
    build_combined_fragment,
    build_control_flow,
    build_lifeline_model,
    build_lifeline_shape,
    build_message_model,
    build_message_shape,
    clean_label,
    ensure_stereotypes,
    insert_model_row,
    insert_shape_row,
    vp_id,
)

ROOT = Path(r"D:\ResourceAllocation\docs")
TARGET_VPP = ROOT / "ResourceAllocation_UML_MotKhung.vpp"


# ============================================================================
# 10 DETAILED SEQUENCE DIAGRAM SPECIFICATIONS (SEQ-01 .. SEQ-10)
# ============================================================================
SEQUENCE_SPECS: dict[str, dict] = {
    "SEQ-01": {
        "lifelines": [
            ("Người dùng", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Auth_GUI", "boundary"),
            ("Auth_BUS", "control"),
            ("Token_Service", "control"),
            ("User_DAO", "control"),
            ("User", "entity"),
            ("Session_DAO", "control"),
            ("Session", "entity"),
        ],
        "alt_guards": ("Thông tin hợp lệ", "Sai thông tin / Tài khoản khóa"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng đăng nhập", False, 0),
            ("1.1", 1, 2, "Mở giao diện đăng nhập", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện đăng nhập", False, 0),
            ("2", 0, 3, "Nhập email và mật khẩu", False, 0),
            ("2.1", 3, 4, "Gửi thông tin đăng nhập", False, 0),
            ("2.1.1", 4, 6, "Tìm tài khoản theo email", False, 0),
            ("2.1.1.1", 6, 7, "Lấy thông tin người dùng", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin người dùng & passwordHash", True, 0),
            ("2.1.2", 6, 4, "Hồ sơ người dùng", True, 0),
            ("2.1.3", 4, 3, "Hiển thị trạng thái kiểm tra", False, 0),
            ("3", 0, 3, "Xác nhận đăng nhập / mã 2FA", False, 0),
            ("3.1", 3, 4, "Kiểm tra bcrypt và trạng thái", False, 0),
            ("3.1.1", 4, 6, "Đối chiếu thông tin xác thực", False, 0),
            ("3.1.1.1", 6, 7, "Lấy mã nhân sự, vai trò và trạng thái", False, 1),
            ("3.1.1.2", 7, 6, "Mã nhân sự, vai trò, isActive", True, 1),
            ("2.1.4", 4, 3, "Hiển thị tên, vai trò, thời gian phiên", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo sai thông tin / tài khoản khóa", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo đăng nhập thất bại", False, 2),
            ("4", 0, 3, "Yêu cầu khởi tạo phiên làm việc", False, 0),
            ("4.1", 3, 4, "Tạo cặp Access & Refresh Token", False, 0),
            ("4.1.1", 4, 5, "Ký JWT Access Token & Refresh Token", False, 0),
            ("4.1.2", 5, 4, "Chuỗi token và thời hạn", True, 0),
            ("4.1.3", 4, 3, "Hiển thị thông tin phiên đăng nhập", False, 0),
            ("5", 0, 3, "Chọn 'Lưu phiên & Vào hệ thống'", False, 0),
            ("5.1", 3, 4, "Chuẩn bị dữ liệu phiên và cookie", False, 0),
            ("5.1.1", 4, 3, "Hiển thị chi tiết quyền và tenant", False, 0),
            ("6", 0, 3, "Xác nhận vào Dashboard", False, 0),
            ("6.1", 3, 4, "Lưu phiên đăng nhập", False, 0),
            ("6.1.1", 4, 8, "Tạo bản ghi phiên làm việc", False, 0),
            ("6.1.1.1", 8, 9, "Lưu refreshToken và lastLoginAt", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo tạo phiên thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo đăng nhập thành công", False, 0),
        ],
    },
    "SEQ-02": {
        "lifelines": [
            ("Quản lý dự án", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Task_GUI", "boundary"),
            ("Task_BUS", "control"),
            ("Workload_Service", "control"),
            ("Project_DAO", "control"),
            ("Project", "entity"),
            ("Task_DAO", "control"),
            ("Task", "entity"),
        ],
        "alt_guards": ("Dữ liệu & phụ thuộc DAG hợp lệ", "Phụ thuộc vòng / Vượt khung dự án"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý dự án", False, 0),
            ("1.1", 1, 2, "Mở giao diện chi tiết dự án", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện quản lý công việc", False, 0),
            ("2", 0, 3, "Chọn tạo / cập nhật công việc", False, 0),
            ("2.1", 3, 4, "Yêu cầu thông tin dự án và nhóm", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin dự án và thành viên", False, 0),
            ("2.1.1.1", 6, 7, "Đọc khung thời gian và danh sách thành viên", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin dự án, thành viên, nhóm", True, 0),
            ("2.1.2", 6, 4, "Dữ liệu dự án và thành viên", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã dự án, danh sách nhân sự", False, 0),
            ("3", 0, 3, "Nhập người phụ trách và công việc tiền nhiệm", False, 0),
            ("3.1", 3, 4, "Kiểm tra thành viên và đồ thị DAG", False, 0),
            ("3.1.1", 4, 6, "Kiểm tra ràng buộc dự án và phụ thuộc", False, 0),
            ("3.1.1.1", 6, 7, "Lấy mã nhân sự và mốc thời gian hợp lệ", False, 1),
            ("3.1.1.2", 7, 6, "Mã nhân sự, khung ngày hợp lệ", True, 1),
            ("2.1.4", 4, 3, "Hiển thị người phụ trách và tiền nhiệm hợp lệ", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo lỗi phụ thuộc vòng hoặc quá hạn", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo dữ liệu không hợp lệ", False, 2),
            ("4", 0, 3, "Chọn độ ưu tiên và nhập giờ ước tính", False, 0),
            ("4.1", 3, 4, "Tính toán thời lượng và tải nhân sự", False, 0),
            ("4.1.1", 4, 5, "Tính tổng giờ công và phần trăm tải", False, 0),
            ("4.1.2", 5, 4, "Kết quả tải dự kiến của nhân sự", True, 0),
            ("4.1.3", 4, 3, "Hiển thị tổng giờ công và cảnh báo tải", False, 0),
            ("5", 0, 3, "Chọn 'Lưu công việc'", False, 0),
            ("5.1", 3, 4, "Tổng hợp dữ liệu công việc", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết công việc", False, 0),
            ("6", 0, 3, "Xác nhận lưu", False, 0),
            ("6.1", 3, 4, "Tạo / cập nhật bản ghi công việc", False, 0),
            ("6.1.1", 4, 8, "Ghi dữ liệu công việc vào CSDL", False, 0),
            ("6.1.1.1", 8, 9, "Lưu thông tin Task và lịch sử hoạt động", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo lưu công việc thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo lưu công việc thành công", False, 0),
        ],
    },
    "SEQ-03": {
        "lifelines": [
            ("Người dùng", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Notif_GUI", "boundary"),
            ("Notif_BUS", "control"),
            ("Socket_Service", "control"),
            ("User_DAO", "control"),
            ("User", "entity"),
            ("Notif_DAO", "control"),
            ("Notification", "entity"),
        ],
        "alt_guards": ("Tìm thấy người nhận trực tuyến", "Người nhận ngoại tuyến / Không tồn tại"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn biểu tượng chuông thông báo", False, 0),
            ("1.1", 1, 2, "Mở khung thông báo thời gian thực", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện danh sách thông báo", False, 0),
            ("2", 0, 3, "Yêu cầu đồng bộ kênh thông báo", False, 0),
            ("2.1", 3, 4, "Lấy thông tin phiên người nhận", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin người dùng hiện tại", False, 0),
            ("2.1.1.1", 6, 7, "Đọc mã người dùng và cài đặt nhận tin", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin người dùng và phòng Socket", True, 0),
            ("2.1.2", 6, 4, "Hồ sơ người nhận thông báo", True, 0),
            ("2.1.3", 4, 3, "Hiển thị trạng thái kết nối và số chưa đọc", False, 0),
            ("3", 0, 3, "Kích hoạt sự kiện nghiệp vụ / lọc thông báo", False, 0),
            ("3.1", 3, 4, "Tìm người nhận theo mã sự kiện", False, 0),
            ("3.1.1", 4, 6, "Tra cứu danh sách người nhận", False, 0),
            ("3.1.1.1", 6, 7, "Lấy mã, tên người nhận và kênh user:<id>", False, 1),
            ("3.1.1.2", 7, 6, "Mã, tên người nhận, trạng thái kênh", True, 1),
            ("2.1.4", 4, 3, "Hiển thị thông báo mới và thời gian phát", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo người nhận chưa kết nối Socket", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị trạng thái chờ đồng bộ khi đăng nhập", False, 2),
            ("4", 0, 3, "Chọn thông báo cần đọc / đánh dấu", False, 0),
            ("4.1", 3, 4, "Tính toán lại số lượng thông báo chưa đọc", False, 0),
            ("4.1.1", 4, 5, "Phát sự kiện đồng bộ badge qua Socket.IO", False, 0),
            ("4.1.2", 5, 4, "Kết quả phát sự kiện tới các tab", True, 0),
            ("4.1.3", 4, 3, "Hiển thị số lượng chưa đọc mới trên chuông", False, 0),
            ("5", 0, 3, "Chọn 'Đánh dấu đã đọc & Lưu'", False, 0),
            ("5.1", 3, 4, "Tổng hợp trạng thái đọc của thông báo", False, 0),
            ("5.1.1", 4, 3, "Hiển thị chi tiết nội dung và liên kết đích", False, 0),
            ("6", 0, 3, "Xác nhận cập nhật thông báo", False, 0),
            ("6.1", 3, 4, "Lưu bản ghi thông báo", False, 0),
            ("6.1.1", 4, 8, "Cập nhật trạng thái vào CSDL", False, 0),
            ("6.1.1.1", 8, 9, "Lưu isRead=true và thời điểm đọc", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo cập nhật trạng thái thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo đã đồng bộ hoàn tất", False, 0),
        ],
    },
    "SEQ-04": {
        "lifelines": [
            ("Quản lý dự án", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Optimize_GUI", "boundary"),
            ("Optimize_BUS", "control"),
            ("Hybrid_Solver", "control"),
            ("Project_DAO", "control"),
            ("Project", "entity"),
            ("OptResult_DAO", "control"),
            ("OptimizationResult", "entity"),
        ],
        "alt_guards": ("Miền nghiệm CSP khả thi", "Vi phạm ràng buộc cứng / Miền rỗng"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng tối ưu hóa phân bổ", False, 0),
            ("1.1", 1, 2, "Mở giao diện tối ưu hóa nguồn lực", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện cấu hình Hybrid CSP-GA", False, 0),
            ("2", 0, 3, "Chọn dự án cần tối ưu phân bổ", False, 0),
            ("2.1", 3, 4, "Yêu cầu dữ liệu bài toán phân bổ", False, 0),
            ("2.1.1", 4, 6, "Lấy danh sách công việc và nhân sự dự án", False, 0),
            ("2.1.1.1", 6, 7, "Đọc kỹ năng, giờ công, phụ thuộc và lịch nghỉ", False, 0),
            ("2.1.1.2", 7, 6, "Dữ liệu Tasks, Resources, Dependencies", True, 0),
            ("2.1.2", 6, 4, "Tập dữ liệu đầu vào bài toán tối ưu", True, 0),
            ("2.1.3", 4, 3, "Hiển thị số công việc, nhân sự và ràng buộc", False, 0),
            ("3", 0, 3, "Nhập tham số CSP-GA và kiểm tra miền nghiệm", False, 0),
            ("3.1", 3, 4, "Sàng lọc miền giá trị bằng AC-3, MRV, LCV", False, 0),
            ("3.1.1", 4, 6, "Đối chiếu kỹ năng, công suất và lịch nghỉ", False, 0),
            ("3.1.1.1", 6, 7, "Lấy tập ứng viên hợp lệ cho từng công việc", False, 1),
            ("3.1.1.2", 7, 6, "Miền ứng viên khả thi và điểm phù hợp", True, 1),
            ("2.1.4", 4, 3, "Hiển thị miền nghiệm hợp lệ và thời gian bắt đầu", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo không tìm thấy ứng viên thỏa ràng buộc", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị cảnh báo công việc thiếu nhân sự phù hợp", False, 2),
            ("4", 0, 3, "Chọn trọng số mục tiêu và kích thước quần thể", False, 0),
            ("4.1", 3, 4, "Thực thi tiến hóa Genetic Algorithm", False, 0),
            ("4.1.1", 4, 5, "Chạy chọn lọc, lai ghép, đột biến & chấm Fitness", False, 0),
            ("4.1.2", 5, 4, "Cá thể tốt nhất và điểm Fitness hội tụ", True, 0),
            ("4.1.3", 4, 3, "Hiển thị điểm Fitness và biểu đồ hội tụ", False, 0),
            ("5", 0, 3, "Chọn 'Hoàn tất & Xem phương án'", False, 0),
            ("5.1", 3, 4, "Tính toán chỉ số cân bằng tải và chi phí", False, 0),
            ("5.1.1", 4, 3, "Hiển thị chi tiết bảng phân công tối ưu", False, 0),
            ("6", 0, 3, "Xác nhận lưu phương án tối ưu", False, 0),
            ("6.1", 3, 4, "Tạo bản ghi kết quả tối ưu hóa", False, 0),
            ("6.1.1", 4, 8, "Lưu phương án phân bổ vào CSDL", False, 0),
            ("6.1.1.1", 8, 9, "Lưu allocations, metrics và parameters", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo lưu kết quả tối ưu thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo tạo phương án tối ưu thành công", False, 0),
        ],
    },
    "SEQ-05": {
        "lifelines": [
            ("Quản lý dự án", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("OptApply_GUI", "boundary"),
            ("OptApply_BUS", "control"),
            ("Workload_Service", "control"),
            ("OptResult_DAO", "control"),
            ("OptimizationResult", "entity"),
            ("Task_DAO", "control"),
            ("Task", "entity"),
        ],
        "alt_guards": ("Tìm thấy phương án / Snapshot hợp lệ", "Không tìm thấy phương án / Đã hoàn tác"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý phương án tối ưu", False, 0),
            ("1.1", 1, 2, "Mở giao diện lịch sử tối ưu hóa", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện áp dụng và hoàn tác", False, 0),
            ("2", 0, 3, "Chọn phiên tối ưu cần xem xét", False, 0),
            ("2.1", 3, 4, "Thông tin phiên tối ưu hóa", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin bản ghi kết quả tối ưu", False, 0),
            ("2.1.1.1", 6, 7, "Đọc danh sách allocations và trạng thái", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin phương án và điểm đánh giá", True, 0),
            ("2.1.2", 6, 4, "Chi tiết phương án phân bổ", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã phương án, điểm số, trạng thái", False, 0),
            ("3", 0, 3, "Nhập mã phương án / yêu cầu kiểm tra", False, 0),
            ("3.1", 3, 4, "Kiểm tra điều kiện áp dụng hoặc hoàn tác", False, 0),
            ("3.1.1", 4, 6, "Tra cứu snapshot và trạng thái áp dụng", False, 0),
            ("3.1.1.1", 6, 7, "Lấy danh sách phân công và snapshot gốc", False, 1),
            ("3.1.1.2", 7, 6, "Danh sách phân công và previousAssignments", True, 1),
            ("2.1.4", 4, 3, "Hiển thị bảng so sánh trước - sau áp dụng", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo phương án không hợp lệ hoặc thiếu snapshot", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo không thể thực hiện thao tác", False, 2),
            ("4", 0, 3, "Chọn danh sách công việc cần áp dụng", False, 0),
            ("4.1", 3, 4, "Tính toán chênh lệch tải nhân sự", False, 0),
            ("4.1.1", 4, 5, "Mô phỏng tải nhân sự sau khi gán mới", False, 0),
            ("4.1.2", 5, 4, "Bảng phân bố tải mới của từng nhân sự", True, 0),
            ("4.1.3", 4, 3, "Hiển thị tổng tải nhân sự sau điều chỉnh", False, 0),
            ("5", 0, 3, "Chọn 'Áp dụng / Hoàn tác phương án'", False, 0),
            ("5.1", 3, 4, "Tổng hợp danh sách cập nhật phân công", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết phiếu áp dụng", False, 0),
            ("6", 0, 3, "Xác nhận thực thi", False, 0),
            ("6.1", 3, 4, "Cập nhật phân công và lưu snapshot", False, 0),
            ("6.1.1", 4, 8, "Cập nhật trường assignedTo cho các Task", False, 0),
            ("6.1.1.1", 8, 9, "Lưu thông tin phân công mới vào Task", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo cập nhật phân công thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo áp dụng phương án thành công", False, 0),
        ],
    },
    "SEQ-06": {
        "lifelines": [
            ("Quản trị / PM", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Project_GUI", "boundary"),
            ("Project_BUS", "control"),
            ("Resource_DAO", "control"),
            ("Resource", "entity"),
            ("Project_DAO", "control"),
            ("Project", "entity"),
        ],
        "alt_guards": ("Tìm thấy nhân sự trong công ty", "Không tìm thấy nhân sự / Đã thuộc dự án"),
        "alt_covered": (3, 6),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý dự án", False, 0),
            ("1.1", 1, 2, "Mở giao diện danh sách dự án", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện quản lý dự án", False, 0),
            ("2", 0, 3, "Chọn khởi tạo / chỉnh sửa dự án", False, 0),
            ("2.1", 3, 4, "Thông tin hồ sơ dự án", False, 0),
            ("2.1.1", 4, 5, "Lấy thông tin người quản lý dự án", False, 0),
            ("2.1.1.1", 5, 6, "Lấy thông tin nhân sự chủ nhiệm", False, 0),
            ("2.1.1.2", 6, 5, "Thông tin mã, tên và phòng ban PM", True, 0),
            ("2.1.2", 5, 4, "Hồ sơ nhân sự chủ nhiệm", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã, tên người quản lý dự án", False, 0),
            ("3", 0, 3, "Nhập mã nhân viên thêm vào dự án", False, 0),
            ("3.1", 3, 4, "Tìm nhân sự theo mã trong tenant", False, 0),
            ("3.1.1", 4, 5, "Tra cứu hồ sơ nhân sự theo mã", False, 0),
            ("3.1.1.1", 5, 6, "Lấy mã, tên, kỹ năng và công suất tuần", False, 1),
            ("3.1.1.2", 6, 5, "Mã, tên nhân sự, kỹ năng, maxHours", True, 1),
            ("2.1.4", 4, 3, "Hiển thị mã, tên thành viên và ngày tham gia", False, 1),
            ("3.1.1.1.1", 5, 4, "Thông báo không tìm thấy nhân sự hợp lệ", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo không tìm thấy nhân sự", False, 2),
            ("4", 0, 3, "Chọn vai trò dự án và nhập định mức giờ", False, 0),
            ("4.1", 3, 4, "Tính toán tổng ngân sách và định mức giờ", False, 0),
            ("4.1.1", 4, 3, "Hiển thị tổng ngân sách và công suất đội", False, 0),
            ("5", 0, 3, "Chọn 'Lưu & Đóng'", False, 0),
            ("5.1", 3, 4, "Tổng hợp thông tin dự án và thành viên", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết hồ sơ dự án", False, 0),
            ("6", 0, 3, "Xác nhận lưu dự án", False, 0),
            ("6.1", 3, 4, "Tạo / cập nhật hồ sơ dự án", False, 0),
            ("6.1.1", 4, 7, "Khởi tạo bản ghi dự án và nhóm mặc định", False, 0),
            ("6.1.1.1", 7, 8, "Lưu thông tin Project và danh sách members", False, 0),
            ("6.1.1.1.1", 7, 4, "Thông báo lưu dự án thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo lưu dự án thành công", False, 0),
        ],
    },
    "SEQ-07": {
        "lifelines": [
            ("Quản lý dự án", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Import_GUI", "boundary"),
            ("Import_BUS", "control"),
            ("Excel_Parser", "control"),
            ("Resource_DAO", "control"),
            ("Resource", "entity"),
            ("Task_DAO", "control"),
            ("Task", "entity"),
        ],
        "alt_guards": ("Dữ liệu dòng Excel & nhân sự hợp lệ", "Lỗi định dạng cột / Nhân sự không tồn tại"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý công việc dự án", False, 0),
            ("1.1", 1, 2, "Mở giao diện nhập dữ liệu công việc", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện Import Excel công việc", False, 0),
            ("2", 0, 3, "Chọn dự án đích và tải biểu mẫu", False, 0),
            ("2.1", 3, 4, "Yêu cầu danh mục nhân sự của dự án", False, 0),
            ("2.1.1", 4, 6, "Lấy danh sách nhân sự thuộc dự án", False, 0),
            ("2.1.1.1", 6, 7, "Đọc mã nhân viên, email và kỹ năng", False, 0),
            ("2.1.1.2", 7, 6, "Danh sách nhân sự và ánh xạ mã/email", True, 0),
            ("2.1.2", 6, 4, "Thông tin nhân sự hợp lệ của dự án", True, 0),
            ("2.1.3", 4, 3, "Hiển thị thông tin dự án và cấu trúc cột mẫu", False, 0),
            ("3", 0, 3, "Tải lên tệp Excel (.xlsx) danh sách công việc", False, 0),
            ("3.1", 3, 4, "Đối chiếu mã nhân sự và cấu trúc dòng", False, 0),
            ("3.1.1", 4, 6, "Tìm nhân sự phụ trách theo mã / email", False, 0),
            ("3.1.1.1", 6, 7, "Lấy mã và tên nhân sự khớp dòng Excel", False, 1),
            ("3.1.1.2", 7, 6, "Mã, tên nhân sự và trạng thái hợp lệ", True, 1),
            ("2.1.4", 4, 3, "Hiển thị danh sách dòng hợp lệ trên bảng xem trước", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo dòng lỗi định dạng hoặc sai mã nhân sự", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị danh sách dòng lỗi cần chỉnh sửa", False, 2),
            ("4", 0, 3, "Chọn nhóm công việc và quy tắc gán mặc định", False, 0),
            ("4.1", 3, 4, "Chuẩn hóa thời lượng và kỹ năng từ tệp Excel", False, 0),
            ("4.1.1", 4, 5, "Phân tích cú pháp ngày tháng và mảng kỹ năng", False, 0),
            ("4.1.2", 5, 4, "Danh sách đối tượng Task đã chuẩn hóa", True, 0),
            ("4.1.3", 4, 3, "Hiển thị tổng số công việc và tổng giờ công", False, 0),
            ("5", 0, 3, "Chọn 'Lưu & Nhập vào dự án'", False, 0),
            ("5.1", 3, 4, "Tổng hợp lô công việc cần khởi tạo", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết lô nhập Excel", False, 0),
            ("6", 0, 3, "Xác nhận nhập dữ liệu", False, 0),
            ("6.1", 3, 4, "Tạo hàng loạt công việc từ Excel", False, 0),
            ("6.1.1", 4, 8, "Ghi danh sách công việc vào CSDL", False, 0),
            ("6.1.1.1", 8, 9, "Lưu hàng loạt bản ghi Task (insertMany)", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo nhập công việc thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo Import Excel thành công", False, 0),
        ],
    },
    "SEQ-08": {
        "lifelines": [
            ("Quản lý dự án", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Recurring_GUI", "boundary"),
            ("Recurring_BUS", "control"),
            ("Cron_Scheduler", "control"),
            ("Recurring_DAO", "control"),
            ("RecurringTask", "entity"),
            ("Task_DAO", "control"),
            ("Task", "entity"),
        ],
        "alt_guards": ("Tìm thấy mẫu lặp đến hạn & hợp lệ", "Mẫu lặp tạm dừng / Hết hiệu lực"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý công việc định kỳ", False, 0),
            ("1.1", 1, 2, "Mở giao diện công việc lặp", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện cấu hình công việc lặp", False, 0),
            ("2", 0, 3, "Chọn mẫu công việc định kỳ", False, 0),
            ("2.1", 3, 4, "Thông tin mẫu công việc lặp", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin mẫu công việc định kỳ", False, 0),
            ("2.1.1.1", 6, 7, "Đọc chu kỳ lặp, nextRunAt và người phụ trách", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin mẫu RecurringTask", True, 0),
            ("2.1.2", 6, 4, "Chi tiết mẫu công việc lặp", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã mẫu, tên mẫu, chu kỳ lặp", False, 0),
            ("3", 0, 3, "Nhập / kiểm tra điều kiện sinh công việc", False, 0),
            ("3.1", 3, 4, "Kiểm tra trạng thái hoạt động và mốc đến hạn", False, 0),
            ("3.1.1", 4, 6, "Tìm mẫu lặp hợp lệ theo mã và thời gian", False, 0),
            ("3.1.1.1", 6, 7, "Lấy thông số mẫu, người nhận và hạn hoàn thành", False, 1),
            ("3.1.1.2", 7, 6, "Thông số mẫu, assignedTo, estimatedHours", True, 1),
            ("2.1.4", 4, 3, "Hiển thị thông tin bản sao công việc sắp sinh", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo mẫu lặp đã ngưng hoặc chưa đến hạn", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo không đủ điều kiện sinh việc", False, 2),
            ("4", 0, 3, "Chọn tần suất lặp và nhập thời lượng", False, 0),
            ("4.1", 3, 4, "Tính toán mốc chạy tiếp theo (nextRunAt)", False, 0),
            ("4.1.1", 4, 5, "Tính ngày chạy kế tiếp theo lịch daily/weekly/monthly", False, 0),
            ("4.1.2", 5, 4, "Mốc thời gian nextRunAt và dueDate mới", True, 0),
            ("4.1.3", 4, 3, "Hiển thị mốc chạy tiếp theo và hạn hoàn thành", False, 0),
            ("5", 0, 3, "Chọn 'Lưu & Sinh công việc'", False, 0),
            ("5.1", 3, 4, "Chuẩn bị bản ghi Task mới từ mẫu lặp", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết công việc được sinh", False, 0),
            ("6", 0, 3, "Xác nhận sinh công việc", False, 0),
            ("6.1", 3, 4, "Tạo công việc mới và cập nhật mẫu lặp", False, 0),
            ("6.1.1", 4, 8, "Khởi tạo bản ghi Task định kỳ", False, 0),
            ("6.1.1.1", 8, 9, "Lưu thông tin Task mới vào CSDL", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo tạo công việc lặp thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo sinh công việc lặp thành công", False, 0),
        ],
    },
    "SEQ-09": {
        "lifelines": [
            ("Người quản lý", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Report_GUI", "boundary"),
            ("Report_BUS", "control"),
            ("Export_Service", "control"),
            ("Project_DAO", "control"),
            ("Project", "entity"),
            ("Resource_DAO", "control"),
            ("Resource", "entity"),
        ],
        "alt_guards": ("Tìm thấy dữ liệu dự án & nhân sự trong kỳ", "Không tìm thấy dữ liệu khớp bộ lọc"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý báo cáo & thống kê", False, 0),
            ("1.1", 1, 2, "Mở giao diện Dashboard và báo cáo", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện phân tích hiệu suất", False, 0),
            ("2", 0, 3, "Chọn loại báo cáo utilization / tiến độ", False, 0),
            ("2.1", 3, 4, "Thông tin phiếu yêu cầu báo cáo", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin danh mục dự án hiện hành", False, 0),
            ("2.1.1.1", 6, 7, "Lấy mã, tên dự án và tiến độ tổng thể", False, 0),
            ("2.1.1.2", 7, 6, "Danh sách dự án và chỉ số cơ bản", True, 0),
            ("2.1.2", 6, 4, "Thông tin tổng quan các dự án", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã, tên dự án và kỳ báo cáo", False, 0),
            ("3", 0, 3, "Nhập bộ lọc dự án, phòng ban và kỳ thống kê", False, 0),
            ("3.1", 3, 4, "Tìm dữ liệu công việc và dự án theo bộ lọc", False, 0),
            ("3.1.1", 4, 6, "Truy vấn dữ liệu tiến độ dự án theo mã", False, 0),
            ("3.1.1.1", 6, 7, "Lấy số lượng công việc hoàn thành, trễ hạn, giờ công", False, 1),
            ("3.1.1.2", 7, 6, "Số liệu Burnup, CFD và phân bố trạng thái", True, 1),
            ("2.1.4", 4, 3, "Hiển thị biểu đồ KPI, thời gian và tiến độ dự án", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo không có dữ liệu dự án trong kỳ", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo không tìm thấy dữ liệu thống kê", False, 2),
            ("4", 0, 3, "Chọn chỉ số utilization và định dạng xuất", False, 0),
            ("4.1", 3, 4, "Tính toán hệ số sử dụng nguồn lực (Utilization)", False, 0),
            ("4.1.1", 4, 8, "Tổng hợp giờ phân bổ và công suất từng nhân sự", False, 0),
            ("4.1.1.1", 8, 9, "Đọc allocatedHours và maxHoursPerWeek", False, 0),
            ("4.1.2", 4, 3, "Hiển thị bảng tổng hợp utilization theo phòng ban", False, 0),
            ("5", 0, 3, "Chọn 'Tổng hợp & Xuất báo cáo'", False, 0),
            ("5.1", 3, 4, "Chuẩn bị dữ liệu chi tiết báo cáo", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết báo cáo phân tích", False, 0),
            ("6", 0, 3, "Xác nhận xuất báo cáo", False, 0),
            ("6.1", 3, 4, "Khởi tạo tệp báo cáo CSV / PDF", False, 0),
            ("6.1.1", 4, 5, "Kết xuất dữ liệu bảng biểu ra tệp báo cáo", False, 0),
            ("6.1.1.1", 5, 4, "Thông báo tạo tệp báo cáo thành công", False, 0),
            ("6.1.1.1.1", 4, 3, "Hiển thị thông báo xuất báo cáo thành công", False, 0),
        ],
    },
    "SEQ-10": {
        "lifelines": [
            ("Quản lý / Nhân sự", "actor"),
            ("Main_GUI", "boundary"),
            ("Main_BUS", "control"),
            ("Gantt_GUI", "boundary"),
            ("Gantt_BUS", "control"),
            ("CPM_Service", "control"),
            ("Resource_DAO", "control"),
            ("Resource", "entity"),
            ("Task_DAO", "control"),
            ("Task", "entity"),
        ],
        "alt_guards": ("Lịch trình & lịch nghỉ nhân sự hợp lệ", "Trùng lịch nghỉ phép / Vi phạm phụ thuộc"),
        "alt_covered": (3, 7),
        "messages": [
            ("1", 0, 1, "Chọn chức năng quản lý lịch & sơ đồ Gantt", False, 0),
            ("1.1", 1, 2, "Mở giao diện Lịch biểu và Gantt", False, 0),
            ("1.1.1", 2, 3, "Hiển thị giao diện sơ đồ Gantt và đường găng", False, 0),
            ("2", 0, 3, "Chọn chế độ xem lịch dự án", False, 0),
            ("2.1", 3, 4, "Thông tin lịch trình và nhân sự", False, 0),
            ("2.1.1", 4, 6, "Lấy thông tin nhân sự và lịch nghỉ phép", False, 0),
            ("2.1.1.1", 6, 7, "Lấy thông tin nhân sự và danh sách ngày nghỉ", False, 0),
            ("2.1.1.2", 7, 6, "Thông tin nhân sự và availabilityCalendar", True, 0),
            ("2.1.2", 6, 4, "Dữ liệu lịch làm việc nhân sự", True, 0),
            ("2.1.3", 4, 3, "Hiển thị mã, tên nhân sự và dòng thời gian", False, 0),
            ("3", 0, 3, "Chọn công việc và điều chỉnh mốc ngày trên Gantt", False, 0),
            ("3.1", 3, 4, "Kiểm tra lịch nghỉ nhân sự và phụ thuộc ngày", False, 0),
            ("3.1.1", 4, 6, "Đối chiếu khung ngày mới với lịch nhân sự", False, 0),
            ("3.1.1.1", 6, 7, "Lấy mã, tên nhân sự và khung giờ khả dụng", False, 1),
            ("3.1.1.2", 7, 6, "Mã, tên nhân sự và xác nhận không trùng nghỉ phép", True, 1),
            ("2.1.4", 4, 3, "Hiển thị mốc bắt đầu, kết thúc mới trên thanh Gantt", False, 1),
            ("3.1.1.1.1", 6, 4, "Thông báo trùng ngày nghỉ hoặc vi phạm tiền nhiệm", False, 2),
            ("3.1.1.1.1.1", 4, 3, "Hiển thị cảnh báo xung đột lịch trình trên Gantt", False, 2),
            ("4", 0, 3, "Chọn tính toán lại đường găng (Critical Path)", False, 0),
            ("4.1", 3, 4, "Tính toán tổng thời gian dự án và độ trễ (Slack)", False, 0),
            ("4.1.1", 4, 5, "Phân tích mạng Pert/CPM xác định công việc găng", False, 0),
            ("4.1.2", 5, 4, "Danh sách công việc trên đường găng và ngày kết thúc", True, 0),
            ("4.1.3", 4, 3, "Hiển thị đường găng màu đỏ và tổng thời lượng dự án", False, 0),
            ("5", 0, 3, "Chọn 'Lưu lịch trình Gantt'", False, 0),
            ("5.1", 3, 4, "Tổng hợp các thay đổi mốc thời gian", False, 0),
            ("5.1.1", 4, 3, "Hiển thị thông tin chi tiết lịch trình cập nhật", False, 0),
            ("6", 0, 3, "Xác nhận lưu lịch trình", False, 0),
            ("6.1", 3, 4, "Cập nhật mốc thời gian công việc", False, 0),
            ("6.1.1", 4, 8, "Cập nhật startDate và dueDate cho Task", False, 0),
            ("6.1.1.1", 8, 9, "Lưu thông tin lịch trình mới vào Task", False, 0),
            ("6.1.1.1.1", 8, 4, "Thông báo lưu lịch trình thành công", False, 0),
            ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo cập nhật sơ đồ Gantt thành công", False, 0),
        ],
    },
}


# ============================================================================
# 10 DETAILED ACTIVITY DIAGRAM SPECIFICATIONS (ACT-01 .. ACT-10)
# Each spec populates the 24-node template in the two-column swimlane layout
# (Người dùng | Hệ thống) matching the exact visual style of the reference image.
# ============================================================================
ACTIVITY_SPECS: dict[str, dict[str, str]] = {
    "ACT-01": {
        "choose_fn": "Chọn chức năng đăng nhập",
        "show_ui": "Hiển thị giao diện đăng nhập",
        "show_init": "Hiển thị thông tin máy chủ và tổ chức",
        "input_lookup": "Nhập email tài khoản đăng nhập",
        "dec_lookup": "Tìm kiếm tài khoản người dùng trong cơ sở dữ liệu",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại tài khoản",
        "user_ack_nf": "Người dùng xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã và trạng thái tài khoản",
        "choose_item": "Chọn phương thức xác thực",
        "input_detail": "Nhập mật khẩu và mã xác thực",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra mật khẩu và mã xác thực",
        "g_invalid": "không hợp lệ",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo mật khẩu hoặc mã xác thực không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Khởi tạo quyền truy cập và mã phiên JWT",
        "dec_complete": "Xác nhận hoàn tất bước xác thực",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Đăng nhập & Lưu phiên'",
        "sys_end_time": "Ghi nhận thời gian đăng nhập và thiết bị",
        "sys_calc_total": "Lưu Refresh Token và khởi tạo kết nối Socket",
        "sys_show_detail": "Hiển thị thông tin chi tiết phiên và Dashboard",
        "user_ack_done": "Xác nhận",
    },
    "ACT-02": {
        "choose_fn": "Chọn chức năng quản lý dự án",
        "show_ui": "Hiển thị giao diện khởi tạo dự án",
        "show_init": "Hiển thị tên và mã của người quản lý dự án (PM)",
        "input_lookup": "Nhập mã nhân viên của thành viên tham gia dự án",
        "dec_lookup": "Tìm kiếm nhân sự cùng công ty trong cơ sở dữ liệu",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại nhân sự trong công ty",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã và kỹ năng của nhân sự",
        "choose_item": "Chọn hạng mục / nhóm công việc dự án",
        "input_detail": "Nhập ngân sách và định mức giờ công dự kiến",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra ngân sách và định mức giờ công",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo ngân sách hoặc định mức giờ không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán tổng giờ công và ngân sách hạng mục",
        "dec_complete": "Xác nhận hoàn tất thiết lập dự án",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Save & Exit'",
        "sys_end_time": "Hiển thị khung thời gian bắt đầu và kết thúc dự án",
        "sys_calc_total": "Tính toán tổng ngân sách và công suất đội dự án",
        "sys_show_detail": "Hiển thị thông tin chi tiết hồ sơ dự án",
        "user_ack_done": "Xác nhận",
    },
    "ACT-03": {
        "choose_fn": "Chọn chức năng quản lý công việc",
        "show_ui": "Hiển thị giao diện chi tiết công việc",
        "show_init": "Hiển thị tên và mã dự án cùng người tạo việc",
        "input_lookup": "Nhập mã nhân sự phụ trách và công việc tiền nhiệm",
        "dec_lookup": "Tìm kiếm nhân sự phụ trách và kiểm tra đồ thị DAG",
        "g_not_found": "không hợp lệ",
        "g_found": "hợp lệ",
        "err_not_found": "Hiển thị thông báo nhân sự không thuộc dự án hoặc lặp vòng",
        "user_ack_nf": "Người dùng xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã nhân sự và công việc tiền nhiệm",
        "choose_item": "Chọn hạng mục checklist / kỹ năng yêu cầu",
        "input_detail": "Nhập số giờ ước tính và tiến độ hoàn thành",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra số giờ ước tính và hạn hoàn thành",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo số giờ ước tính hoặc ngày hạn không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán thời lượng công việc và tải nhân sự",
        "dec_complete": "Xác nhận hoàn tất cập nhật công việc",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Lưu & Gửi duyệt'",
        "sys_end_time": "Hiển thị thời gian cập nhật và trạng thái phê duyệt",
        "sys_calc_total": "Tính toán tổng tiến độ dự án và đồng bộ tải nhân sự",
        "sys_show_detail": "Hiển thị thông tin chi tiết phiếu công việc",
        "user_ack_done": "Xác nhận",
    },
    "ACT-04": {
        "choose_fn": "Chọn chức năng quản lý nhân sự & lịch nghỉ",
        "show_ui": "Hiển thị giao diện hồ sơ năng lực nhân sự",
        "show_init": "Hiển thị tên và mã của quản trị viên thao tác",
        "input_lookup": "Nhập mã nhân viên hoặc phòng ban cần cập nhật",
        "dec_lookup": "Tìm kiếm hồ sơ nhân sự trong cơ sở dữ liệu công ty",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại hồ sơ nhân sự",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã, phòng ban và tải hiện tại",
        "choose_item": "Chọn kỹ năng chuyên môn / đợt nghỉ phép",
        "input_detail": "Nhập mức thông thạo (1-5) và định mức giờ tuần",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra định mức giờ tuần và mức kỹ năng",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo định mức giờ hoặc điểm kỹ năng không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán công suất khả dụng của nhân sự trong tuần",
        "dec_complete": "Xác nhận hoàn tất khai báo năng lực & lịch nghỉ",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Save & Exit'",
        "sys_end_time": "Hiển thị thời gian hiệu lực của lịch làm việc mới",
        "sys_calc_total": "Tính toán lại hệ số tải (Workload) toàn phòng ban",
        "sys_show_detail": "Hiển thị thông tin chi tiết hồ sơ nhân sự",
        "user_ack_done": "Xác nhận",
    },
    "ACT-05": {
        "choose_fn": "Chọn chức năng chạy tối ưu hóa phân bổ",
        "show_ui": "Hiển thị giao diện cấu hình thuật toán Hybrid CSP-GA",
        "show_init": "Hiển thị tên dự án, số công việc và nhân sự khả dụng",
        "input_lookup": "Chọn tập công việc chưa gán và ràng buộc kỹ năng",
        "dec_lookup": "Kiểm tra miền nghiệm khả thi CSP (AC-3, MRV, LCV)",
        "g_not_found": "miền rỗng",
        "g_found": "khả thi",
        "err_not_found": "Hiển thị thông báo vi phạm ràng buộc cứng / thiếu nhân sự",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị miền ứng viên hợp lệ cho từng việc",
        "choose_item": "Chọn trọng số mục tiêu và toán tử tiến hóa GA",
        "input_detail": "Nhập kích thước quần thể và số thế hệ tiến hóa",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra tham số quần thể, thế hệ và xác suất đột biến",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo tham số thuật toán GA không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Đánh giá hàm thích nghi (Fitness) của thế hệ hiện tại",
        "dec_complete": "Xác nhận hoàn tất hội tụ thuật toán",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Lưu phương án tối ưu'",
        "sys_end_time": "Hiển thị thời gian thực thi thuật toán (ms)",
        "sys_calc_total": "Tính toán điểm Fitness tối ưu và độ cân bằng tải",
        "sys_show_detail": "Hiển thị thông tin chi tiết phương án phân bổ tối ưu",
        "user_ack_done": "Xác nhận",
    },
    "ACT-06": {
        "choose_fn": "Chọn chức năng áp dụng / hoàn tác phương án",
        "show_ui": "Hiển thị giao diện đối chiếu phương án tối ưu",
        "show_init": "Hiển thị tên và mã của người quản lý phê duyệt",
        "input_lookup": "Nhập hoặc chọn mã phương án tối ưu cần áp dụng",
        "dec_lookup": "Tìm kiếm bản ghi phương án tối ưu trong cơ sở dữ liệu",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại phương án hoặc thiếu snapshot",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị mã phương án, điểm Fitness và danh sách gán",
        "choose_item": "Chọn công việc trong bảng đề xuất phân công",
        "input_detail": "Nhập điều chỉnh giờ công hoặc xác nhận người nhận",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra giới hạn tải nhân sự sau khi gán",
        "g_invalid": "vượt ngưỡng",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo nhân sự bị quá tải công suất tuần",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán mức thay đổi tải của nhân sự được chọn",
        "dec_complete": "Xác nhận hoàn tất rà soát danh sách phân công",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Áp dụng / Hoàn tác & Lưu'",
        "sys_end_time": "Hiển thị thời gian áp dụng phương án và lưu Snapshot",
        "sys_calc_total": "Cập nhật người phụ trách các Task và tính lại tổng tải",
        "sys_show_detail": "Hiển thị thông tin chi tiết kết quả áp dụng phương án",
        "user_ack_done": "Xác nhận",
    },
    "ACT-07": {
        "choose_fn": "Chọn chức năng quản lý công việc lặp",
        "show_ui": "Hiển thị giao diện thiết lập mẫu công việc định kỳ",
        "show_init": "Hiển thị tên và mã dự án cùng người thiết lập",
        "input_lookup": "Nhập mã nhân viên phụ trách mặc định cho mẫu lặp",
        "dec_lookup": "Tìm kiếm nhân sự phụ trách trong cơ sở dữ liệu dự án",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại nhân sự phụ trách",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã và lịch khả dụng của nhân sự",
        "choose_item": "Chọn chu kỳ lặp (Hằng ngày / Tuần / Tháng)",
        "input_detail": "Nhập khoảng cách chu kỳ và số giờ ước tính mỗi lần",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra bước lặp và thời lượng công việc định kỳ",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo chu kỳ lặp hoặc số giờ không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán mốc thời gian sinh việc tiếp theo (nextRunAt)",
        "dec_complete": "Xác nhận hoàn tất cấu hình mẫu công việc lặp",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Save & Exit'",
        "sys_end_time": "Hiển thị mốc thời gian bắt đầu và kết thúc lịch lặp",
        "sys_calc_total": "Khởi tạo bản sao công việc đến hạn và cập nhật nextRunAt",
        "sys_show_detail": "Hiển thị thông tin chi tiết mẫu công việc định kỳ",
        "user_ack_done": "Xác nhận",
    },
    "ACT-08": {
        "choose_fn": "Chọn chức năng thông báo thời gian thực",
        "show_ui": "Hiển thị giao diện trung tâm thông báo",
        "show_init": "Hiển thị tên, mã người dùng và trạng thái kênh Socket",
        "input_lookup": "Chọn sự kiện nghiệp vụ hoặc người nhận thông báo",
        "dec_lookup": "Tìm kiếm người nhận thông báo trong cơ sở dữ liệu",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại người nhận hợp lệ",
        "user_ack_nf": "Người dùng xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã người nhận và kênh user:<id>",
        "choose_item": "Chọn phân loại thông báo cần xem / xử lý",
        "input_detail": "Nhập thao tác đánh dấu đã đọc hoặc phản hồi nhanh",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra quyền truy cập và trạng thái bản ghi thông báo",
        "g_invalid": "không hợp lệ",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo bản ghi đã xóa hoặc không thuộc quyền xử lý",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán lại số lượng thông báo chưa đọc (Unread Badge)",
        "dec_complete": "Xác nhận hoàn tất duyệt thông báo",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Đồng bộ & Đóng'",
        "sys_end_time": "Hiển thị thời gian đồng bộ trạng thái đã đọc",
        "sys_calc_total": "Phát sự kiện đồng bộ thời gian thực qua Socket.IO",
        "sys_show_detail": "Hiển thị thông tin chi tiết danh sách thông báo",
        "user_ack_done": "Xác nhận",
    },
    "ACT-09": {
        "choose_fn": "Chọn chức năng nhập công việc từ Excel",
        "show_ui": "Hiển thị giao diện Import Excel công việc",
        "show_init": "Hiển thị tên dự án đích và cấu trúc biểu mẫu chuẩn",
        "input_lookup": "Tải lên tệp Excel (.xlsx) chứa mã nhân sự phụ trách",
        "dec_lookup": "Tìm kiếm nhân sự phụ trách các dòng Excel trong CSDL",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại nhân sự trong dự án",
        "user_ack_nf": "Quản lý xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã nhân sự và bảng xem trước",
        "choose_item": "Chọn dòng công việc trên bảng xem trước",
        "input_detail": "Nhập chỉnh sửa số giờ ước tính và ngày hoàn thành",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra số giờ ước tính và định dạng ngày của dòng",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo số giờ hoặc ngày tháng dòng Excel không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán tổng giờ công của nhóm công việc nhập",
        "dec_complete": "Xác nhận hoàn tất kiểm tra dữ liệu Excel",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Save & Import'",
        "sys_end_time": "Hiển thị thời gian hoàn tất nhập lô công việc",
        "sys_calc_total": "Lưu hàng loạt công việc và tính tổng giờ công dự án",
        "sys_show_detail": "Hiển thị thông tin chi tiết kết quả nhập Excel",
        "user_ack_done": "Xác nhận",
    },
    "ACT-10": {
        "choose_fn": "Chọn chức năng báo cáo & xuất dữ liệu",
        "show_ui": "Hiển thị giao diện báo cáo và phân tích nguồn lực",
        "show_init": "Hiển thị tên và mã của người lập báo cáo",
        "input_lookup": "Nhập mã dự án hoặc phòng ban cần thống kê",
        "dec_lookup": "Tìm kiếm dữ liệu dự án và nhân sự trong cơ sở dữ liệu",
        "g_not_found": "không tồn tại",
        "g_found": "tồn tại",
        "err_not_found": "Hiển thị thông báo không tồn tại dữ liệu trong kỳ lọc",
        "user_ack_nf": "Người dùng xác nhận",
        "sys_show_found": "Hệ thống hiển thị tên, mã dự án và số lượng nhân sự",
        "choose_item": "Chọn chỉ số thống kê (Utilization / Burnup / CFD)",
        "input_detail": "Nhập kỳ thống kê và ngưỡng cảnh báo quá tải (%)",
        "click_ok": "Chọn 'OK'",
        "dec_validate": "Kiểm tra khoảng thời gian và ngưỡng công suất thống kê",
        "g_invalid": "<= 0",
        "g_valid": "hợp lệ",
        "err_invalid": "Thông báo khoảng ngày hoặc ngưỡng thống kê không hợp lệ",
        "user_ack_inv": "Xác nhận",
        "sys_calc_item": "Tính toán hệ số sử dụng nguồn lực của từng nhóm",
        "dec_complete": "Xác nhận hoàn tất chọn chỉ số báo cáo",
        "g_incomplete": "Chưa hoàn tất",
        "g_complete": "Hoàn tất",
        "click_save": "Chọn 'Xuất báo cáo CSV / PDF'",
        "sys_end_time": "Hiển thị thời gian chốt số liệu báo cáo",
        "sys_calc_total": "Tính toán tổng giờ phân bổ và hiệu suất toàn hệ thống",
        "sys_show_detail": "Hiển thị thông tin chi tiết phiếu báo cáo phân tích",
        "user_ack_done": "Xác nhận",
    },
}


def upgrade_sequence_diagram(
    cur: sqlite3.Cursor,
    prefix: str,
    spec: dict,
    stereo_ids: dict[str, str],
) -> None:
    drow = cur.execute(
        "SELECT ID, NAME, DEFINITION FROM DIAGRAM WHERE NAME LIKE ?",
        (f"{prefix}%",),
    ).fetchone()
    if not drow:
        raise ValueError(f"Diagram not found for {prefix}")
    did, dname, dblob = drow[0], drow[1], drow[2].decode("utf-8")
    frame_match = re.search(r"_rootFrame=<([^>]+)>", dblob)
    frame_id = frame_match.group(1) if frame_match else "81N2lSCGAqAKZh1v"

    old_rows = cur.execute(
        "SELECT ID, MODEL_ELEMENT_ID, SHAPE_TYPE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?",
        (did,),
    ).fetchall()
    old_model_ids = {r[1] for r in old_rows if r[1]}
    cur.execute("DELETE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,))
    for mid in old_model_ids:
        cur.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (mid,))

    lifelines: list[tuple[str, str]] = spec["lifelines"]
    messages: list[tuple[str, int, int, str, bool, int]] = spec["messages"]
    alt_guards: tuple[str, str] = spec["alt_guards"]
    cov_start, cov_end = spec["alt_covered"]

    life_y = 45
    base_msg_y = 140
    msg_step = 42
    life_xs = [60 + i * 185 for i in range(len(lifelines))]
    life_widths = [70 if kind == "actor" else 110 for _, kind in lifelines]

    msg_ys: list[int] = []
    cur_y = base_msg_y
    prev_op = 0
    for _, _, _, _, _, op_idx in messages:
        if op_idx != prev_op:
            cur_y += 28
        msg_ys.append(cur_y)
        cur_y += msg_step
        prev_op = op_idx

    life_height = cur_y - life_y + 70
    life_model_ids = [vp_id(f"{did}:life_m:{i}") for i in range(len(lifelines))]
    life_shape_ids = [vp_id(f"{did}:life_s:{i}") for i in range(len(lifelines))]

    life_msg_ys: dict[int, list[int]] = {i: [] for i in range(len(lifelines))}
    for m_idx, (_, f_idx, t_idx, _, _, _) in enumerate(messages):
        y_val = msg_ys[m_idx]
        life_msg_ys[f_idx].append(y_val)
        life_msg_ys[t_idx].append(y_val)

    life_bars: dict[int, list[tuple[int, int, str, str]]] = {i: [] for i in range(len(lifelines))}
    for i in range(len(lifelines)):
        ys = sorted(set(life_msg_ys[i]))
        if not ys:
            continue
        if i in (0, 1, 2):
            start_y = ys[0] - 8
            end_y = (msg_ys[-6] if i in (1, 2) else ys[-1]) + 18
            act_m = vp_id(f"{did}:act_m:{i}:0")
            act_s = vp_id(f"{did}:act_s:{i}:0")
            life_bars[i].append((start_y, end_y, act_m, act_s))
        elif i in (3, 4):
            start_y = ys[0] - 8
            end_y = ys[-1] + 22
            act_m = vp_id(f"{did}:act_m:{i}:0")
            act_s = vp_id(f"{did}:act_s:{i}:0")
            life_bars[i].append((start_y, end_y, act_m, act_s))
        else:
            clusters: list[list[int]] = [[ys[0]]]
            for yv in ys[1:]:
                if yv - clusters[-1][-1] <= msg_step * 3 + 35:
                    clusters[-1].append(yv)
                else:
                    clusters.append([yv])
            for c_idx, cluster in enumerate(clusters):
                start_y = cluster[0] - 8
                end_y = cluster[-1] + 20
                act_m = vp_id(f"{did}:act_m:{i}:{c_idx}")
                act_s = vp_id(f"{did}:act_s:{i}:{c_idx}")
                life_bars[i].append((start_y, end_y, act_m, act_s))

    def find_act_model(life_idx: int, y_val: int) -> str:
        for sy, ey, am, _ in life_bars[life_idx]:
            if sy - 15 <= y_val <= ey + 15:
                return am
        return life_bars[life_idx][0][2]

    life_act_embeds: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    act_shape_rows: list[tuple[str, str, str, str]] = []
    for i in range(len(lifelines)):
        cx = life_xs[i] + life_widths[i] // 2 - 5
        for sy, ey, am, a_s in life_bars[i]:
            life_act_embeds[i].append(build_activation_embed(am, a_s, did))
            act_shape_rows.append(
                (
                    a_s,
                    am,
                    "Activation",
                    build_activation_shape(a_s, life_model_ids[i], am, cx, sy, max(24, ey - sy)),
                )
            )

    from_rels: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    to_rels: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    msg_model_rows: list[tuple[str, str, str]] = []
    msg_shape_rows: list[tuple[str, str, str]] = []
    op1_msgs: list[str] = []
    op2_msgs: list[str] = []

    for m_idx, (seq_no, f_idx, t_idx, label, is_ret, op_idx) in enumerate(messages):
        y_val = msg_ys[m_idx]
        mm_id = vp_id(f"{did}:msg_m:{m_idx}")
        ms_id = vp_id(f"{did}:msg_s:{m_idx}")
        f_act = find_act_model(f_idx, y_val)
        t_act = find_act_model(t_idx, y_val)
        m_def, f_ref, t_ref = build_message_model(
            mm_id,
            ms_id,
            did,
            label,
            seq_no,
            life_model_ids[f_idx],
            life_model_ids[t_idx],
            f_act,
            t_act,
            is_return=is_ret,
        )
        from_rels[f_idx].append(f_ref)
        to_rels[t_idx].append(t_ref)
        msg_model_rows.append((mm_id, clean_label(label), m_def))
        s_def = build_message_shape(
            ms_id,
            mm_id,
            did,
            life_shape_ids[f_idx],
            life_shape_ids[t_idx],
            life_xs[f_idx],
            life_xs[t_idx],
            life_y,
            y_val,
            clean_label(label),
            seq_no,
            life_widths[f_idx],
            life_widths[t_idx],
        )
        msg_shape_rows.append((ms_id, mm_id, s_def))
        if op_idx == 1:
            op1_msgs.append(mm_id)
        elif op_idx == 2:
            op2_msgs.append(mm_id)

    op1_ys = [msg_ys[idx] for idx, m in enumerate(messages) if m[5] == 1]
    op2_ys = [msg_ys[idx] for idx, m in enumerate(messages) if m[5] == 2]
    hdr_offset = 18
    cf_y = min(op1_ys) - 34 - hdr_offset
    op1_h = (max(op1_ys) + 24) - (cf_y + hdr_offset)
    op2_h = (max(op2_ys) + 28) - (cf_y + hdr_offset + op1_h)
    cf_h = hdr_offset + op1_h + op2_h
    cf_x = life_xs[cov_start] - 40
    cf_w = (life_xs[cov_end] + life_widths[cov_end] + 35) - cf_x
    cf_model_id = vp_id(f"{did}:cf_m:alt")
    cf_shape_id = vp_id(f"{did}:cf_s:alt")
    cf_model_def, cf_shape_def, op_entries = build_combined_fragment(
        cf_model_id,
        cf_shape_id,
        did,
        frame_id,
        life_model_ids[cov_start : cov_end + 1],
        [
            (alt_guards[0], hdr_offset, op1_h, op1_msgs),
            (alt_guards[1], hdr_offset + op1_h, op2_h, op2_msgs),
        ],
        cf_x,
        cf_y,
        cf_w,
        cf_h,
    )

    child_shape_ids: list[str] = []

    insert_model_row(cur, cf_model_id, "", "CombinedFragment", frame_id, cf_model_def)
    insert_shape_row(cur, cf_shape_id, did, None, "CombinedFragment", cf_shape_def, cf_model_id)

    for idx, (op_m_id, op_s_id, op_m_def, op_s_def) in enumerate(op_entries, 1):
        insert_model_row(cur, op_m_id, f"Operand{idx}", "InteractionOperand", cf_model_id, op_m_def)
        insert_shape_row(cur, op_s_id, did, cf_shape_id, "InteractionOperand", op_s_def, op_m_id)
        child_shape_ids.append(op_s_id)

    child_shape_ids.append(cf_shape_id)

    for i, (lname, lkind) in enumerate(lifelines):
        m_type, m_def = build_lifeline_model(
            life_model_ids[i],
            life_shape_ids[i],
            did,
            lname,
            lkind,
            stereo_ids,
            life_act_embeds[i],
            from_rels[i],
            to_rels[i],
        )
        s_type, s_def = build_lifeline_shape(
            life_shape_ids[i],
            life_model_ids[i],
            lname,
            lkind,
            life_xs[i],
            life_y,
            life_widths[i],
            life_height,
        )
        insert_model_row(cur, life_model_ids[i], lname, m_type, None, m_def)
        insert_shape_row(cur, life_shape_ids[i], did, None, s_type, s_def, life_model_ids[i])
        child_shape_ids.append(life_shape_ids[i])

    for a_s, _, _, a_def in act_shape_rows:
        comp_m = re.search(r"metaModelElement=<([^>]+)>", a_def)
        comp_addr = comp_m.group(1) if comp_m else None
        insert_shape_row(cur, a_s, did, None, "Activation", a_def, None, comp_addr)
        child_shape_ids.append(a_s)

    msg_container_id = "kUk7SByGAqAKbSFt"
    msg_model_refs = []
    for mm_id, label, m_def in msg_model_rows:
        insert_model_row(cur, mm_id, label, "Message", msg_container_id, m_def)
        msg_model_refs.append(f"<{msg_container_id}:{mm_id}>")
    for ms_id, mm_id, s_def in msg_shape_rows:
        insert_shape_row(cur, ms_id, did, None, "Message", s_def, mm_id)
        child_shape_ids.append(ms_id)

    crow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (msg_container_id,)).fetchone()
    if crow:
        ctext = crow[0].decode("utf-8")
        cm = re.search(r"(?s)\bChild=\((.*?)\);", ctext)
        crefs = re.findall(r"<[^>]+>", cm.group(1)) if cm else []
        crefs = [r for r in crefs if r.rsplit(":", 1)[-1][:-1] not in old_model_ids]
        crefs.extend(msg_model_refs)
        ctext = re.sub(
            r"(?s)\bChild=\(.*?\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(crefs) + "\r\n\t);",
            ctext,
            count=1,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ctext.encode("utf-8"), msg_container_id))

    children_block = "Child=(\r\n" + ",\r\n".join(f"\t\t<{did}:{cid}>" for cid in child_shape_ids) + "\r\n\t);"
    dblob = re.sub(r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);", children_block, dblob)
    cur.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (dblob.encode("utf-8"), did))


def upgrade_activity_diagram(
    cur: sqlite3.Cursor,
    prefix: str,
    labels: dict[str, str],
) -> None:
    drow = cur.execute(
        "SELECT ID, NAME, DEFINITION FROM DIAGRAM WHERE NAME LIKE ?",
        (f"{prefix}%",),
    ).fetchone()
    if not drow:
        raise ValueError(f"Diagram not found for {prefix}")
    did, dname, dblob = drow[0], drow[1], drow[2].decode("utf-8")

    old_rows = cur.execute(
        "SELECT ID, MODEL_ELEMENT_ID, SHAPE_TYPE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?",
        (did,),
    ).fetchall()
    old_model_ids = {r[1] for r in old_rows if r[1]}
    cur.execute("DELETE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,))
    for mid in old_model_ids:
        if mid != "qMv6lSCGAqAKZhmF":
            cur.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (mid,))

    sw_m_id = vp_id(f"{did}:swim_m")
    sw_s_id = vp_id(f"{did}:swim_s")
    p_user_m = vp_id(f"{did}:part_user_m")
    p_sys_m = vp_id(f"{did}:part_sys_m")
    h_user_s = vp_id(f"{did}:hdr_user_s")
    h_sys_s = vp_id(f"{did}:hdr_sys_s")
    c_user_s = vp_id(f"{did}:comp_user_s")
    c_sys_s = vp_id(f"{did}:comp_sys_s")

    sw_x, sw_y = 40, 25
    user_w, sys_w = 480, 680
    sw_w = user_w + sys_w
    hdr_h = 30
    sw_h = 1360

    nodes_spec = [
        ("start", "user", "InitialNode", "Bắt đầu", 240, 80, 26, 26),
        ("choose_login", "user", "ActivityAction", labels["choose_fn"], 240, 145, 250, 44),
        ("show_form", "sys", "ActivityAction", labels["show_ui"], 340, 145, 275, 44),
        ("show_tenant", "sys", "ActivityAction", labels["show_init"], 340, 220, 320, 44),
        ("input_email", "user", "ActivityAction", labels["input_lookup"], 240, 290, 290, 44),
        ("dec_find_user", "sys", "DecisionNode", labels["dec_lookup"], 380, 298, 54, 28),
        ("err_not_found", "sys", "ActivityAction", labels["err_not_found"], 165, 385, 265, 52),
        ("user_ack_nf", "user", "ActivityAction", labels["user_ack_nf"], 240, 390, 185, 44),
        ("end_early", "user", "ActivityFinalNode", "Kết thúc sớm", 240, 470, 26, 26),
        ("sys_show_user", "sys", "ActivityAction", labels["sys_show_found"], 505, 385, 275, 52),
        ("choose_method", "user", "ActivityAction", labels["choose_item"], 240, 545, 240, 44),
        ("input_pwd", "user", "ActivityAction", labels["input_detail"], 240, 635, 255, 44),
        ("click_ok", "user", "ActivityAction", labels["click_ok"], 240, 710, 130, 40),
        ("dec_check_pwd", "sys", "DecisionNode", labels["dec_validate"], 380, 716, 54, 28),
        ("err_invalid_pwd", "sys", "ActivityAction", labels["err_invalid"], 195, 805, 305, 44),
        ("user_ack_pwd", "user", "ActivityAction", labels["user_ack_inv"], 240, 805, 130, 42),
        ("calc_token", "sys", "ActivityAction", labels["sys_calc_item"], 510, 805, 275, 44),
        ("dec_complete", "user", "DecisionNode", labels["dec_complete"], 240, 910, 54, 28),
        ("click_save", "user", "ActivityAction", labels["click_save"], 240, 1005, 235, 44),
        ("sys_log_time", "sys", "ActivityAction", labels["sys_end_time"], 340, 1065, 315, 44),
        ("sys_save_token", "sys", "ActivityAction", labels["sys_calc_total"], 340, 1140, 330, 44),
        ("sys_show_dash", "sys", "ActivityAction", labels["sys_show_detail"], 340, 1215, 335, 44),
        ("user_ack_done", "user", "ActivityAction", labels["user_ack_done"], 240, 1215, 130, 44),
        ("end_final", "user", "ActivityFinalNode", "Kết thúc", 240, 1305, 26, 26),
    ]

    edges_spec = [
        ("start", "choose_login", "", "v"),
        ("choose_login", "show_form", "", "h"),
        ("show_form", "show_tenant", "", "v"),
        ("show_tenant", "input_email", "", "vh_down"),
        ("input_email", "dec_find_user", "", "h"),
        ("dec_find_user", "err_not_found", labels["g_not_found"], "hv_left"),
        ("err_not_found", "user_ack_nf", "", "h"),
        ("user_ack_nf", "end_early", "", "v"),
        ("dec_find_user", "sys_show_user", labels["g_found"], "hv_right"),
        ("sys_show_user", "choose_method", "", "vh_to_right"),
        ("choose_method", "input_pwd", "", "v"),
        ("input_pwd", "click_ok", "", "v"),
        ("click_ok", "dec_check_pwd", "", "h"),
        ("dec_check_pwd", "err_invalid_pwd", labels["g_invalid"], "hv_left"),
        ("err_invalid_pwd", "user_ack_pwd", "", "h"),
        ("user_ack_pwd", "input_pwd", "", "loop_left_inner"),
        ("dec_check_pwd", "calc_token", labels["g_valid"], "hv_right"),
        ("calc_token", "dec_complete", "", "vh_to_right"),
        ("dec_complete", "choose_method", labels["g_incomplete"], "loop_left_outer"),
        ("dec_complete", "click_save", labels["g_complete"], "v"),
        ("click_save", "sys_log_time", "", "hv_right"),
        ("sys_log_time", "sys_save_token", "", "v"),
        ("sys_save_token", "sys_show_dash", "", "v"),
        ("sys_show_dash", "user_ack_done", "", "h"),
        ("user_ack_done", "end_final", "", "v"),
    ]

    node_m_ids: dict[str, str] = {}
    node_s_ids: dict[str, str] = {}
    node_boxes: dict[str, dict[str, int]] = {}
    from_cfs: dict[str, list[str]] = {n[0]: [] for n in nodes_spec}
    to_cfs: dict[str, list[str]] = {n[0]: [] for n in nodes_spec}

    for key, lane, stype, label, rel_cx, abs_y, w, h in nodes_spec:
        node_m_ids[key] = vp_id(f"{did}:nm:{key}")
        node_s_ids[key] = vp_id(f"{did}:ns:{key}")
        lane_x = sw_x if lane == "user" else (sw_x + user_w)
        abs_x = lane_x + rel_cx - w // 2
        node_boxes[key] = {
            "x": abs_x,
            "y": abs_y,
            "width": w,
            "height": h,
            "lane": lane,
            "rel_x": rel_cx - w // 2,
            "rel_y": abs_y - (sw_y + hdr_h),
        }

    cf_rows: list[tuple[str, str, str, str, str]] = []
    for e_idx, (fk, tk, guard, hint) in enumerate(edges_spec):
        cf_m = vp_id(f"{did}:cfm:{e_idx}")
        cf_s = vp_id(f"{did}:cfs:{e_idx}")
        from_cfs[fk].append(cf_m)
        to_cfs[tk].append(cf_m)
        fb = node_boxes[fk]
        tb = node_boxes[tk]
        fcx, fcy = fb["x"] + fb["width"] // 2, fb["y"] + fb["height"] // 2
        tcx, tcy = tb["x"] + tb["width"] // 2, tb["y"] + tb["height"] // 2

        cap_off = None
        if hint == "v":
            wps = [(fcx, fb["y"] + fb["height"]), (tcx, tb["y"])]
            if guard:
                cap_off = (14, (tb["y"] - (fb["y"] + fb["height"])) // 2 - 8)
        elif hint == "h":
            if tcx > fcx:
                wps = [(fb["x"] + fb["width"], fcy), (tb["x"], tcy)]
            else:
                wps = [(fb["x"], fcy), (tb["x"] + tb["width"], tcy)]
        elif hint == "vh_down":
            mid_y = (fb["y"] + fb["height"] + tb["y"]) // 2
            wps = [
                (fcx, fb["y"] + fb["height"]),
                (fcx, mid_y),
                (tcx, mid_y),
                (tcx, tb["y"]),
            ]
        elif hint == "vh_to_right":
            # Exact L-bend down to target's vertical center and left into target's right edge!
            wps = [
                (fcx, fb["y"] + fb["height"]),
                (fcx, tcy),
                (tb["x"] + tb["width"], tcy),
            ]
        elif hint == "hv_left":
            wps = [
                (fb["x"], fcy),
                (tcx, fcy),
                (tcx, tb["y"]),
            ]
            if guard:
                cap_off = ((tcx - fb["x"]) // 2 - 35, -20)
        elif hint == "hv_right":
            wps = [
                (fb["x"] + fb["width"], fcy),
                (tcx, fcy),
                (tcx, tb["y"]),
            ]
            if guard:
                cap_off = ((tcx - fb["x"]) // 2 - 10, -20)
        elif hint == "loop_left_inner":
            lx = sw_x + 55
            wps = [
                (fb["x"], fcy),
                (lx, fcy),
                (lx, tcy),
                (tb["x"], tcy),
            ]
        elif hint == "loop_left_outer":
            lx = sw_x + 25
            wps = [
                (fb["x"], fcy),
                (lx, fcy),
                (lx, tcy),
                (tb["x"], tcy),
            ]
            if guard:
                cap_off = (-125, 8)
        else:
            wps = [(fcx, fcy), (tcx, tcy)]

        cf_m_def, cf_s_def = build_control_flow(
            cf_m,
            cf_s,
            did,
            clean_label(guard),
            node_m_ids[fk],
            node_m_ids[tk],
            node_s_ids[fk],
            node_s_ids[tk],
            fb,
            tb,
            wps,
            cap_off,
        )
        cf_rows.append((cf_m, cf_s, clean_label(guard), cf_m_def, cf_s_def))

    p_user_nodes = [node_m_ids[n[0]] for n in nodes_spec if n[1] == "user"]
    p_sys_nodes = [node_m_ids[n[0]] for n in nodes_spec if n[1] == "sys"]
    c_user_shapes = [f"<{did}:{node_s_ids[n[0]]}>" for n in nodes_spec if n[1] == "user"]
    c_sys_shapes = [f"<{did}:{node_s_ids[n[0]]}>" for n in nodes_spec if n[1] == "sys"]

    def build_partition_model(pm_id: str, hs_id: str, pname: str, c_nodes: list[str]) -> str:
        vid = vp_id(f"mv:{pm_id}")
        c_joined = ", \r\n\t\t".join(f"<{m}>" for m in c_nodes)
        return f"""{pm_id}:"{pname}":ActivityPartition {{\r
\t_modelEditable=T;\r
\t_masterViewId="{hs_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240415";\r
\t_modelViews=(\r
\t\t{{{vid}:"View":ModelView {{\r
\t\t\tcontainer=<{did}>;\r
\t\t\tview="{hs_id}";\r
\t\t}}}}\r
\t);\r
\tcontainedElements=(\r
\t\t{c_joined}\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241683";\r
}}"""

    sw_vid = vp_id(f"mv:{sw_m_id}")
    sw_m_def = f"""{sw_m_id}:"":ActivitySwimlane2 {{\r
\t_modelEditable=T;\r
\t_masterViewId="{sw_s_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240415";\r
\t_modelViews=(\r
\t\t{{{sw_vid}:"View":ModelView {{\r
\t\t\tcontainer=<{did}>;\r
\t\t\tview="{sw_s_id}";\r
\t\t}}}}\r
\t);\r
\tChild=(\r
\t\t<{sw_m_id}:{p_user_m}>, \r
\t\t<{sw_m_id}:{p_sys_m}>\r
\t);\r
\tverticalPartitions=(\r
\t\t<{sw_m_id}:{p_user_m}>, \r
\t\t<{sw_m_id}:{p_sys_m}>\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241683";\r
}}"""

    def build_hdr_shape(hs_id: str, pm_id: str, pname: str, hx: int, hw: int) -> str:
        return f"""{hs_id}:"{pname}":ActivityPartitionHeader {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty=0;\r
\tx={hx};\r
\tmetaModelElement=<{sw_m_id}:{pm_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={hdr_h};\r
\tdisplayStereotypeIcon=F;\r
\thorizontal=F;\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={hw};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{did}:{sw_s_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width={hw};, \r
\t\t@height={hdr_h};, \r
\t\t@side=6;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""

    def build_comp_shape(cs_id: str, hs_id: str, cx: int, cw: int, c_shapes: list[str]) -> str:
        c_joined = ", \r\n\t\t".join(c_shapes)
        return f"""{cs_id}:"":ActivitySwimlane2Compartment {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={hdr_h};\r
\tx={cx};\r
\tmetaModelElement=NULL;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={sw_h - hdr_h};\r
\tdisplayStereotypeIcon=F;\r
\tverticalPartitionId="{hs_id}";\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={cw};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{did}:{sw_s_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width=40;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
\tContainedDiagramElements=(\r
\t\t{c_joined}\r
\t);\r
}}"""

    sw_s_def = f"""{sw_s_id}:"":ActivitySwimlane2 {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={sw_y};\r
\tx={sw_x};\r
\tmetaModelElement=<{sw_m_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={sw_h};\r
\tdisplayStereotypeIcon=F;\r
\tverticalPartitionIds=(\r
\t\t"{h_user_s}", \r
\t\t"{h_sys_s}"\r
\t);\r
\tcompartmentIds=(\r
\t\t"{c_user_s}", \r
\t\t"{c_sys_s}"\r
\t);\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={sw_w};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@style=0;, \r
\t\t@size=11;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width=60;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
\tContainedDiagramElements=(\r
\t\t<{did}:{h_user_s}>, \r
\t\t<{did}:{h_sys_s}>, \r
\t\t<{did}:{c_user_s}>, \r
\t\t<{did}:{c_sys_s}>\r
\t);\r
}}"""

    child_ids: list[str] = []
    insert_model_row(cur, sw_m_id, "", "ActivitySwimlane2", None, sw_m_def)
    insert_shape_row(cur, sw_s_id, did, None, "ActivitySwimlane2", sw_s_def, sw_m_id)
    child_ids.append(sw_s_id)

    insert_model_row(
        cur,
        p_user_m,
        "Người dùng",
        "ActivityPartition",
        sw_m_id,
        build_partition_model(p_user_m, h_user_s, "Người dùng", p_user_nodes),
    )
    insert_model_row(
        cur,
        p_sys_m,
        "Hệ thống",
        "ActivityPartition",
        sw_m_id,
        build_partition_model(p_sys_m, h_sys_s, "Hệ thống", p_sys_nodes),
    )

    insert_shape_row(
        cur,
        h_user_s,
        did,
        sw_s_id,
        "ActivityPartitionHeader",
        build_hdr_shape(h_user_s, p_user_m, "Người dùng", 0, user_w),
        p_user_m,
    )
    insert_shape_row(
        cur,
        h_sys_s,
        did,
        sw_s_id,
        "ActivityPartitionHeader",
        build_hdr_shape(h_sys_s, p_sys_m, "Hệ thống", user_w, sys_w),
        p_sys_m,
    )
    child_ids.extend([h_user_s, h_sys_s])

    insert_shape_row(
        cur,
        c_user_s,
        did,
        sw_s_id,
        "ActivitySwimlane2Compartment",
        build_comp_shape(c_user_s, h_user_s, 0, user_w, c_user_shapes),
        None,
    )
    insert_shape_row(
        cur,
        c_sys_s,
        did,
        sw_s_id,
        "ActivitySwimlane2Compartment",
        build_comp_shape(c_sys_s, h_sys_s, user_w, sys_w, c_sys_shapes),
        None,
    )
    child_ids.extend([c_user_s, c_sys_s])

    for key, lane, stype, label, rel_cx, abs_y, w, h in nodes_spec:
        nm = node_m_ids[key]
        ns = node_s_ids[key]
        nb = node_boxes[key]
        parent_comp = c_user_s if lane == "user" else c_sys_s
        m_def = build_act_node_model(nm, ns, did, label, stype, from_cfs[key], to_cfs[key])
        s_def = build_act_node_shape(
            ns,
            nm,
            did,
            parent_comp,
            label,
            stype,
            nb["rel_x"],
            nb["rel_y"],
            w,
            h,
        )
        insert_model_row(cur, nm, clean_label(label), stype, None, m_def)
        insert_shape_row(cur, ns, did, parent_comp, stype, s_def, nm)
        child_ids.append(ns)

    cf_container_id = "4Uk7SByGAqAKbSFr"
    cf_model_refs = []
    for cf_m, cf_s, guard, cf_m_def, cf_s_def in cf_rows:
        insert_model_row(cur, cf_m, guard, "ControlFlow", cf_container_id, cf_m_def)
        insert_shape_row(cur, cf_s, did, None, "ControlFlow", cf_s_def, cf_m)
        cf_model_refs.append(f"<{cf_container_id}:{cf_m}>")
        child_ids.append(cf_s)

    crow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (cf_container_id,)).fetchone()
    if crow:
        ctext = crow[0].decode("utf-8")
        cm = re.search(r"(?s)\bChild=\((.*?)\);", ctext)
        crefs = re.findall(r"<[^>]+>", cm.group(1)) if cm else []
        crefs = [r for r in crefs if r.rsplit(":", 1)[-1][:-1] not in old_model_ids]
        crefs.extend(cf_model_refs)
        ctext = re.sub(
            r"(?s)\bChild=\(.*?\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(crefs) + "\r\n\t);",
            ctext,
            count=1,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ctext.encode("utf-8"), cf_container_id))

    children_block = "Child=(\r\n" + ",\r\n".join(f"\t\t<{did}:{cid}>" for cid in child_ids) + "\r\n\t);"
    dblob = re.sub(r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);", children_block, dblob)
    cur.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (dblob.encode("utf-8"), did))


def upgrade_vpp_file(vpp_path: Path) -> None:
    conn = sqlite3.connect(vpp_path)
    cur = conn.cursor()
    stereo_ids = ensure_stereotypes(cur)

    for prefix, spec in SEQUENCE_SPECS.items():
        upgrade_sequence_diagram(cur, prefix, spec, stereo_ids)

    for prefix, labels in ACTIVITY_SPECS.items():
        upgrade_activity_diagram(cur, prefix, labels)

    # Also update Frame Child list to include all CombinedFragments
    frame_id = "81N2lSCGAqAKZh1v"
    cf_ids = [
        r[0]
        for r in cur.execute(
            "SELECT ID FROM MODEL_ELEMENT WHERE MODEL_TYPE='CombinedFragment' AND PARENT_ID=?",
            (frame_id,),
        ).fetchall()
    ]
    frow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (frame_id,)).fetchone()
    if frow and cf_ids:
        ftext = frow[0].decode("utf-8")
        f_refs = [f"<{frame_id}:{cid}>" for cid in cf_ids]
        ftext = re.sub(
            r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(f_refs) + "\r\n\t);",
            ftext,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ftext.encode("utf-8"), frame_id))

    conn.commit()
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    total_shapes = conn.execute("SELECT COUNT(*) FROM DIAGRAM_ELEMENT").fetchone()[0]
    conn.close()
    print(f"Upgraded {vpp_path.name}: integrity={integrity}, total_native_shapes={total_shapes}")


if __name__ == "__main__":
    targets = [Path(arg) for arg in sys.argv[1:]] if len(sys.argv) > 1 else [TARGET_VPP]
    for target in targets:
        upgrade_vpp_file(target)
