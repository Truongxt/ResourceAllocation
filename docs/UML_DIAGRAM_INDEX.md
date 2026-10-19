# Resource Allocation Optimization — Danh mục sơ đồ UML

File bàn giao mới: [`ResourceAllocation_UML_MotKhung.vpp`](./ResourceAllocation_UML_MotKhung.vpp). File chứa 30 sơ đồ UML, gồm 1.061 phần tử gốc có thể chọn và chỉnh sửa riêng trong Visual Paradigm; không phải ảnh nhúng. Sơ đồ UC-00 đặt đủ 72 use case trong **một khung hệ thống lớn duy nhất**, với 6 actor ở bên ngoài; các quan hệ vẫn là đường nối UML có thể chỉnh sửa. Cả sáu sơ đồ UC-01 đến UC-06 và toàn bộ sơ đồ activity, sequence, class vẫn còn nguyên. Các file [`ResourceAllocation_UML_TongHop.vpp`](./ResourceAllocation_UML_TongHop.vpp), [`ResourceAllocation_UML_ChiTiet.vpp`](./ResourceAllocation_UML_ChiTiet.vpp) và `ResourceAllocation_UML.vpp` cũ cũng được giữ lại, không bị ghi đè.

## Sơ đồ use case

1. UC-00 Tổng hợp toàn bộ hệ thống ResourceAllocation (một khung hệ thống lớn)
2. UC-01 Tổng quan hệ thống
3. UC-02 Xác thực, tài khoản và phân quyền
4. UC-03 Dự án, nhóm và công việc
5. UC-04 Nhân sự, phòng ban và lịch nghỉ
6. UC-05 Tối ưu hóa và benchmark
7. UC-06 Lịch, báo cáo, thông báo và cấu hình

## Sơ đồ activity

1. ACT-01 Đăng nhập và làm mới phiên
2. ACT-02 Vòng đời dự án
3. ACT-03 Vòng đời công việc và cộng tác
4. ACT-04 Quản lý nhân sự và lịch nghỉ
5. ACT-05 Chạy tối ưu hóa
6. ACT-06 Áp dụng và hoàn tác phương án
7. ACT-07 Công việc lặp
8. ACT-08 Thông báo thời gian thực
9. ACT-09 Nhập công việc từ Excel
10. ACT-10 Báo cáo và xuất dữ liệu

## Sơ đồ sequence

1. SEQ-01 Đăng nhập và refresh token
2. SEQ-02 Tạo và cập nhật công việc
3. SEQ-03 Thông báo thời gian thực
4. SEQ-04 Chạy Hybrid CSP–GA
5. SEQ-05 Áp dụng và hoàn tác tối ưu
6. SEQ-06 Quản lý dự án và thành viên
7. SEQ-07 Import Excel công việc
8. SEQ-08 Sinh công việc lặp
9. SEQ-09 Tải dashboard và báo cáo
10. SEQ-10 Lịch và Gantt

## Sơ đồ class

1. CLS-01 Mô hình miền và dữ liệu
2. CLS-02 Kiến trúc lớp backend
3. CLS-03 Kiến trúc lớp frontend

Các use case được nhóm theo vai trò với quan hệ `«include»`/`«extend»`; activity có hai làn người thao tác/hệ thống và các nhánh quyết định; sequence có lifeline, activation và thông điệp độc lập; class có thuộc tính, phương thức, quan hệ và bội số. File đã được kiểm tra cấu trúc và xuất ảnh thử bằng Visual Paradigm 10.0. Khi phiên bản Visual Paradigm mới hơn hỏi nâng cấp định dạng project, nên lưu thành một bản mới để giữ nguyên file bàn giao.
