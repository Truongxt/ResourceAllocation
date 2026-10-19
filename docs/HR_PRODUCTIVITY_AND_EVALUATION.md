# 📊 Tài liệu Kỹ thuật: Trực quan hóa Năng suất & Đánh giá Năng lực Nhân sự (HR Productivity & Evaluation System)

> **Dành cho:** Thành viên nhóm phát triển, Quản lý dự án (PM), và Báo cáo Thầy hướng dẫn Khóa luận tốt nghiệp.  
> **Phiên bản:** 2.2 (điều chỉnh luồng Thành viên và góc nhìn tổng hợp ngày 07/10/2026).
> **Trạng thái:** Đã triển khai trong mã nguồn; kiểm thử tích hợp cần MongoDB thử nghiệm.

## Điểm cần đọc trước khi phát triển tiếp

- **Thành viên** không vào `/resources`. Lối tự đánh giá đúng là menu **Tự đánh giá năng lực** → `/account?tab=skills`; tab này đọc `GET /api/resources/me/evaluation` theo tài khoản đăng nhập và gửi `PUT /api/resources/my-evaluation`. Nếu chưa có hồ sơ Resource, giao diện báo liên hệ quản lý, không lấy hồ sơ từ danh sách nhân sự của người khác.
- **Admin/PM** duyệt năng lực trong `/resources` bằng `SkillsMatrixModal`. `selfLevel` chỉ là đề xuất. Kỹ năng mới chưa được duyệt không tham gia kiểm tra giao việc hoặc bộ tối ưu; kỹ năng đã có mức quản lý duyệt tiếp tục dùng mức đó cho tới lần duyệt tiếp theo.
- **Dashboard quản lý** hiển thị toàn cảnh dự án và phòng ban trước các khối chi tiết: tổng việc hoàn thành, dự án có ngoại lệ, nhân sự quá tải/còn công suất; bảng mọi dự án trong phạm vi quyền, thanh tải phòng ban và cảnh báo san tải. Danh sách điều phối phân biệt người quá tải với người còn công suất, loại người đang nghỉ/không khả dụng và chỉ hiển thị kỹ năng chính thức/đã duyệt. `GET /api/analytics/dashboard` có `projectProgress` (tỷ lệ task `done/total`, không phải trường `Project.progress`); `GET /api/resources/productivity/summary` chỉ cho Admin/PM và dùng cùng phạm vi dữ liệu phân tích.
- **Màu thanh chỉ nói về tải**, không đủ để kết luận năng lực/năng suất. Xanh 60–85%, vàng dưới 60% hoặc trên 85–100%, đỏ trên 100%; phòng ban còn đỏ khi từ một nửa nhân sự bị quá tải. Kết quả đúng hạn chỉ tính việc hoàn thành có cả `completedAt` và `endDate`; không có mẫu thì trả `null` và hiển thị **Chưa đủ dữ liệu**. Điểm quản lý chấm là chỉ số khác, không tự trộn với màu tải.
- Khi san tải, quản lý phải kiểm tra kỹ năng đã duyệt, độ khó/yêu cầu kỹ năng của việc và hạn hoàn thành. Hệ thống **gợi ý/cảnh báo**, không tự giao việc chỉ dựa trên màu.

---

## 1. Bối cảnh & Yêu cầu từ Thầy hướng dẫn

Trong quá trình bảo vệ và báo cáo tiến độ với Thầy hướng dẫn, hệ thống phân bổ nguồn lực cần giải quyết triệt để 3 bài toán thực tế sau:

1. **Trực quan hóa Năng suất & Quá tải (Visual Productivity & Workload Management):**
   - Khi Người quản lý (Manager/PM) nhìn vào bảng điều khiển nhân sự hoặc phòng ban, phải **ngay lập tức nhận diện được** nhân sự hoặc phòng ban đó làm việc với năng suất như thế nào, có bị quá tải hay đang rảnh rỗi.
   - Thể hiện rõ ràng qua **sơ đồ cột màu sắc quy chuẩn (Xanh lá 🟢, Vàng 🟡, Đỏ 🔴)**:
     - 🔴 **Cột màu đỏ:** Nhân viên vượt 100% công suất; phòng ban vượt 100% hoặc nhiều thành viên quá tải.
     - 🟡 **Cột màu vàng:** Tải dưới 60% hoặc trên 85–100%.
     - 🟢 **Cột màu xanh lá:** Tải trong khoảng 60–85%; không tự khẳng định năng suất cao.
   - **Tự động hỗ trợ điều chỉnh (San tải):** Nhìn thấy cột màu đỏ, quản lý chỉ cần bấm nút thao tác nhanh để san tải ngay các đầu việc sang các nhân sự/phòng ban khác đang có cột màu xanh/vàng.

2. **Quy trình Đánh giá Năng lực Hai Chiều (Two-Way Competency Evaluation):**
   - Không thể chỉ để một bên áp đặt: Bạn nhân viên có thể **tự đánh giá năng lực của bản thân** (`Self-Assessment`) trên ma trận kỹ năng (thang 1 - 4 sao).
   - Sau đó, Người quản lý sẽ **xem xét, so sánh mức tự đánh giá với thực tế, điều chỉnh và phê duyệt** (`Manager Review & Approval`), kèm theo đánh giá xếp loại hiệu suất (Performance Rating 1 - 5 sao) và nhận xét chi tiết.
   - Điểm năng lực được phê duyệt này sẽ làm đầu vào chính thức cho thuật toán tối ưu (GA & CSP).

3. **Khớp Mức Độ Khó Công Việc với Năng Lực (Task Difficulty & Competency Matching):**
   - Khi giao việc, công việc phải được phân loại theo **mức độ khó** (Dễ / Trung bình / Khó / Chuyên gia - tương ứng Level 1 đến 4).
   - Hệ thống tự động so khớp mức độ khó của task với kỹ năng được phê duyệt của nhân viên và cảnh báo trực tiếp: nếu nhân sự chưa đủ level hoặc đang có dấu hiệu quá tải, hệ thống sẽ bật cảnh báo màu vàng/đỏ ngay trong form giao việc để người quản lý chủ động điều chỉnh.

---

## 2. Kiến trúc Hệ thống & Luồng Dữ liệu (Architecture & Data Flow)

```
+---------------------------------------------------------------------------------------+
|                                    NGƯỜI DÙNG                                         |
|    [Nhân viên: Tự đánh giá Skill]       [Quản lý: Xem Biểu đồ Cột, Duyệt & San tải]   |
+------------------------------------+--------------------------------------------------+
                                     |
                                     v
+---------------------------------------------------------------------------------------+
|                                WEB CLIENT (React + Vite)                              |
|  - WorkloadProductivityChart.jsx (Biểu đồ cột 🟢/🟡/🔴, Lọc Nhân sự & Phòng ban)       |
|  - SelfSkillEvaluationModal.jsx  (Modal Nhân viên tự chấm điểm kỹ năng)               |
|  - SkillsMatrixModal.jsx         (Modal Quản lý đối chiếu, sửa điểm, chấm 1-5 sao)    |
|  - TaskFormModal.jsx             (Bộ chọn Mức độ khó 1-4 + Cảnh báo khớp năng lực)    |
|  - BulkReassignModal.jsx         (Modal San tải việc từ nhân sự đỏ sang xanh)         |
+------------------------------------+--------------------------------------------------+
                                     |  REST API (Axios + JWT)
                                     v
+---------------------------------------------------------------------------------------+
|                                BACKEND SERVER (Node.js + Express)                     |
|  - resource.controller.js:                                                            |
|      * getProductivitySummary()       -> Tính toán chỉ số tải & mã màu 🟢🟡🔴         |
|      * selfEvaluate()                 -> Nhân viên lưu bản tự đánh giá                 |
|      * managerEvaluate()              -> Quản lý phê duyệt & cho điểm hiệu suất        |
|  - analytics.controller.js:                                                           |
|      * getUtilizationBreakdown()      -> Bổ sung statusColor, statusCode, needsRebalance|
|  - task.controller.js:                                                                |
|      * CRUD Task hỗ trợ difficulty & difficultyLevel                                  |
+------------------------------------+--------------------------------------------------+
                                     |  Mongoose ODM
                                     v
+---------------------------------------------------------------------------------------+
|                                MONGODB DATABASE                                       |
|  - Resource Model:                                                                    |
|      * skills[].selfLevel, managerLevel, evaluationStatus, managerFeedback...         |
|      * performanceRating (1-5), performanceNotes, lastEvaluatedAt                     |
|  - Task Model:                                                                        |
|      * difficulty ('easy'|'medium'|'hard'|'expert'), difficultyLevel (1-4)                |
+---------------------------------------------------------------------------------------+
```

---

## 3. Chi tiết Cơ sở Dữ liệu (Database Schema)

### 3.1. Cập nhật Model `Resource` (`server/src/models/Resource.js`)

Mỗi kỹ năng trong mảng `skills` nay được chuẩn hóa với cơ chế đánh giá 2 chiều:

```javascript
const skillSubSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  level: { type: Number, min: 1, max: 4, default: 1 }, // Level chính thức (dùng cho thuật toán)
  selfLevel: { type: Number, min: 1, max: 4, default: null }, // Nhân viên tự chấm
  managerLevel: { type: Number, min: 1, max: 4, default: null }, // Quản lý chấm duyệt
  evaluationStatus: {
    type: String,
    enum: ['draft', 'self_assessed', 'approved'],
    default: 'approved'
  },
  managerFeedback: { type: String, trim: true, default: '' },
  evaluatedAt: { type: Date, default: null },
  evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });
```

Ngoài ra, ở cấp độ hồ sơ Nhân sự (`Resource`), bổ sung:
- `performanceRating`: Số thực từ 1.0 đến 5.0 (đánh giá năng suất tổng thể từ Quản lý).
- `performanceNotes`: Nhận xét về năng suất và tinh thần làm việc.
- `lastEvaluatedAt`: Thời điểm đánh giá năng suất gần nhất.

### 3.2. Cập nhật Model `Task` (`server/src/models/Task.js`)

Bổ sung 2 trường phân loại độ khó:

```javascript
difficulty: {
  type: String,
  enum: ['easy', 'medium', 'hard', 'expert'],
  default: 'medium'
},
difficultyLevel: {
  type: Number,
  min: 1,
  max: 4,
  default: 2 // 1: Dễ, 2: Trung bình, 3: Khó, 4: Chuyên gia
}
```

---

## 4. Cơ chế Tính toán & Quy chuẩn Màu sắc Biểu đồ (Color Coding & Formulas)

Biểu đồ tại API `GET /api/resources/productivity/summary` và `GET /api/analytics/utilization-breakdown` áp dụng bộ quy tắc phân loại màu sắc thống nhất:

| Mã màu | Trạng thái | Ngưỡng Tỷ lệ Tải (Utilization Rate) | Điều kiện Năng suất | Ý nghĩa & Hành động Quản lý |
|--------|-----------|-------------------------------------|---------------------|-----------------------------|
| 🟢 **Xanh lá** (`#10b981`) | Tải cân bằng | `60% <= Utilization <= 85%` | Xem riêng, không quyết định màu | Có thể nhận việc nếu kỹ năng, lịch và deadline phù hợp. |
| 🟡 **Vàng** (`#f59e0b`) | Cần chú ý | `Utilization < 60%` hoặc `85% < Utilization <= 100%` | Xem riêng | Dư công suất hoặc cận trần; kiểm tra bối cảnh trước khi giao thêm. |
| 🔴 **Đỏ** (`#ef4444`) | Quá tải | `Utilization > 100%`; phòng ban còn đỏ khi ít nhất 1/2 người quá tải | Xem riêng | Cân nhắc san tải; không tự chuyển task. |

### Công thức tính toán:
1. **Workload Tuần (Giờ):** Tổng thời gian làm việc ước tính của các task đang thực hiện trải trên tuần hiện tại.
2. **Capacity Tuần (Giờ):** `maxCapacity * fte` (chuẩn 40 giờ/tuần cho 1.0 FTE).
3. **Tỷ lệ Tải (%):** `Utilization = (Workload / Capacity) * 100%`.
4. **Đúng hạn cá nhân (%):** Số việc `done` đúng hạn chia số việc `done` có đủ `completedAt` và `endDate`. Thiếu mẫu là `null`, không phải 100%.
5. **Đúng hạn phòng ban (%):** Trung bình các tỷ lệ cá nhân có mẫu; `null` nếu không có mẫu. Chỉ số này không đo chất lượng hay độ khó công việc.

---

## 5. Các Màn hình & Tính năng trên Giao diện (UI Walkthrough)

### 5.1. Tab "Năng suất & Cân bằng tải" (`Resources.jsx` + `WorkloadProductivityChart.jsx`)
- **Vị trí:** Tab mặc định tại trang **Nhân sự** (`/resources`) cho Admin/PM.
- **Chế độ xem (Toggle Switch):**
  - **Theo từng Nhân sự:** Hiện từng cột đại diện cho mỗi nhân viên, kèm avatar, chức vụ, số giờ làm và % tải.
  - **Theo Phòng ban:** Gộp theo từng bộ phận (Frontend, Backend, Design, QA...), tính tổng giờ tải và tỷ lệ quá tải của cả phòng.
- **Thanh cảnh báo quá tải:** Nếu có nhân sự rơi vào vùng màu đỏ (>100%), đầu trang sẽ hiện cảnh báo khẩn cấp liệt kê đích danh những nhân sự bị quá tải.
- **Nút "San tải việc ➔":** Xuất hiện ngay trên cột của nhân viên/phòng ban màu đỏ. Bấm vào sẽ mở ngay `BulkReassignModal` để chọn các task cần bàn giao sang người khác.

### 5.2. Modal "Tự đánh giá Năng lực" (`SelfSkillEvaluationModal.jsx`)
- **Dành cho:** Bất kỳ nhân sự nào đang đăng nhập.
- **Thao tác:** Bấm menu **"Tự đánh giá năng lực"** hoặc tab **"Năng lực của tôi"** trong Tài khoản của tôi (`/account?tab=skills`). Role Thành viên dùng được.
- **Giao diện:**
  - Danh sách toàn bộ kỹ năng hiện có.
  - Tự chọn số sao (1 sao: Mới bắt đầu, 2 sao: Cơ bản, 3 sao: Thành thạo, 4 sao: Chuyên gia).
  - Có thể thêm kỹ năng mới mà bản thân vừa học được.
  - Gửi bản đánh giá lên hệ thống (chuyển trạng thái sang `self_assessed`).

### 5.3. Modal "Đánh giá & Phê duyệt Năng lực" (`SkillsMatrixModal.jsx`)
- **Dành cho:** Quản lý dự án (Project Manager) hoặc Quản trị viên (Admin).
- **Thao tác:** Bấm nút "Ma trận kỹ năng" tại hàng của nhân sự cần duyệt.
- **Giao diện:**
  - **So sánh trực quan:** Cột "Nhân viên tự đánh giá" vs "Quản lý chấm duyệt".
  - Quản lý có thể đồng ý hoặc điều chỉnh lại số sao theo thực tế làm việc.
  - Nhập nhận xét phản hồi cho nhân viên (`managerFeedback`).
  - **Đánh giá Hiệu suất tổng thể (1 - 5 sao):** Cho điểm đánh giá phong độ làm việc kèm ghi chú.
  - Bấm **"Phê duyệt & Cập nhật"** để chốt năng lực chính thức.

### 5.4. Khớp Mức độ khó khi Giao việc (`TaskFormModal.jsx`)
- Khi tạo mới hoặc chỉnh sửa task, quản lý chọn **Mức độ khó**:
  - `Dễ (Level 1)` | `Trung bình (Level 2)` | `Khó (Level 3)` | `Chuyên gia (Level 4)`.
- Khi chọn người thực hiện (`assignee`), hệ thống tự động kiểm tra:
  1. **Kiểm tra Mức độ khó:** Nếu task yêu cầu Level 3 mà nhân sự chỉ đạt Level 1-2, hiển thị cảnh báo:  
     ⚠️ *"Kỹ năng của nhân sự (Level X) thấp hơn mức độ khó của task (Level Y). Công việc có thể bị chậm tiến độ!"*
  2. **Kiểm tra Tải công việc:** Nếu nhân sự đó đang ở cột màu đỏ (tải > 100%), hiển thị cảnh báo:  
     🔴 *"Nhân sự này hiện đang quá tải (X%). Khuyến nghị chọn nhân sự khác hoặc san bớt tải!"*

---

## 6. Hướng dẫn Dành cho Lập trình viên tiếp tục phát triển (Developer Guide)

Nếu bạn là thành viên nhóm tiếp tục làm việc trên module này, vui lòng tham khảo các tệp tin sau:

### 6.1. Danh sách tệp nguồn cốt lõi:

| Đường dẫn tệp | Vai trò |
|---------------|---------|
| `server/src/models/Resource.js` | Schema lưu trữ thông tin kỹ năng, selfLevel, managerLevel, rating. |
| `server/src/models/Task.js` | Schema lưu trữ mức độ khó (`difficulty`, `difficultyLevel`). |
| `server/src/controllers/resource.controller.js` | Chứa `getProductivitySummary`, `selfEvaluate`, `managerEvaluate`. |
| `server/src/routes/resource.routes.js` | Khai báo các endpoints `/productivity/summary`, `/my-evaluation`, `/:id/manager-evaluation`. |
| `client/src/services/resourceService.js` | Hàm client gọi axios tương ứng với các API trên. |
| `client/src/components/resources/WorkloadProductivityChart.jsx` | Component vẽ biểu đồ thanh năng suất, phân loại màu và nút san tải. |
| `client/src/components/resources/SelfSkillEvaluationModal.jsx` | Component form tự chấm điểm kỹ năng của nhân viên. |
| `client/src/components/resources/SkillsMatrixModal.jsx` | Component modal duyệt kỹ năng 2 chiều & chấm sao hiệu suất. |
| `client/src/pages/tasks/components/TaskFormModal.jsx` | Logic kiểm tra độ khớp năng lực & cảnh báo quá tải khi giao việc. |

### 6.2. Các hướng phát triển tiếp theo gợi ý (Next Steps):
1. **Mobile App Synchronization:**
   - Đưa màn hình Biểu đồ Năng suất cột màu lên ứng dụng di động React Native (`mobile/src/screens/resources/`).
   - Bổ sung màn hình Tự đánh giá năng lực cho nhân viên thao tác trực tiếp trên điện thoại.
2. **Notification Automation:**
   - Bắn Socket.IO notification thông báo cho Quản lý khi có nhân viên vừa gửi bản tự đánh giá năng lực (`self_assessed`).
   - Bắn notification thông báo cho Nhân viên khi Quản lý đã phê duyệt kỹ năng và gửi phản hồi.
3. **Tích hợp sâu hơn vào thuật toán Tối ưu hóa (Genetic Algorithm):**
   - Trọng số đánh giá hiệu suất (`performanceRating`) có thể được đưa thêm vào hàm thích nghi (`fitness function`) của GA để ưu tiên giao việc quan trọng cho nhân sự có rating cao.

---
*Tài liệu được lập ngày 23/09/2026 bởi Đội ngũ Phát triển Hệ thống Resource Allocation.*
