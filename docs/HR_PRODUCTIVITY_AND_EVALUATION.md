# 📊 Tài liệu Kỹ thuật: Trực quan hóa Năng suất & Đánh giá Năng lực Nhân sự (HR Productivity & Evaluation System)

> **Dành cho:** Thành viên nhóm phát triển, Quản lý dự án (PM), và Báo cáo Thầy hướng dẫn Khóa luận tốt nghiệp.  
> **Phiên bản:** 2.1 (Cập nhật theo yêu cầu chỉnh sửa từ Thầy hướng dẫn).  
> **Trạng thái:** ✅ Đã hoàn thành triển khai End-to-End (Database, API Backend, Web Client UI).

---

## 1. Bối cảnh & Yêu cầu từ Thầy hướng dẫn

Trong quá trình bảo vệ và báo cáo tiến độ với Thầy hướng dẫn, hệ thống phân bổ nguồn lực cần giải quyết triệt để 3 bài toán thực tế sau:

1. **Trực quan hóa Năng suất & Quá tải (Visual Productivity & Workload Management):**
   - Khi Người quản lý (Manager/PM) nhìn vào bảng điều khiển nhân sự hoặc phòng ban, phải **ngay lập tức nhận diện được** nhân sự hoặc phòng ban đó làm việc với năng suất như thế nào, có bị quá tải hay đang rảnh rỗi.
   - Thể hiện rõ ràng qua **sơ đồ cột màu sắc quy chuẩn (Xanh lá 🟢, Vàng 🟡, Đỏ 🔴)**:
     - 🔴 **Cột màu đỏ:** Nhân viên hoặc phòng ban đang bị quá tải (vượt định mức 100% capacity) hoặc hiệu suất kém (nhiều task quá hạn/thất bại).
     - 🟡 **Cột màu vàng:** Cần lưu ý (đang cận tải 85-100% hoặc dưới mức tải tối ưu <50%).
     - 🟢 **Cột màu xanh lá:** Trạng thái tối ưu, năng suất cao, tải ổn định (60-85%).
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
| 🟢 **Xanh lá** (`#10b981`) | **Tối ưu (Optimal)** | `60% <= Utilization <= 85%` | Tỷ lệ trễ hạn/thất bại <= 15% | Nhân viên/phòng ban làm việc hiệu quả, tải ổn định. Sẵn sàng nhận thêm task nếu cần. |
| 🟡 **Vàng** (`#f59e0b`) | **Cần lưu ý (Warning)** | `Utilization < 50%` (Quá ít việc) **HOẶC** `85% < Utilization <= 100%` (Gần chạm trần) | Tỷ lệ trễ hạn 15% - 30% | Cần theo dõi: nếu non tải (<50%) thì bổ sung task; nếu gần ngưỡng tối đa (>85%) thì hạn chế giao thêm việc khó. |
| 🔴 **Đỏ** (`#ef4444`) | **Quá tải (Overloaded)** | `Utilization > 100%` (Vượt quá 40h/tuần) | Hoặc tỷ lệ trễ hạn > 30% | **Báo động đỏ!** Quản lý cần bấm nút **"San tải việc ➔"** để chuyển ngay các task chưa hoàn thành sang nhân sự màu xanh lá. |

### Công thức tính toán:
1. **Workload Tuần (Giờ):** Tổng thời gian làm việc ước tính của các task đang thực hiện trải trên tuần hiện tại.
2. **Capacity Tuần (Giờ):** `maxCapacity * fte` (chuẩn 40 giờ/tuần cho 1.0 FTE).
3. **Tỷ lệ Tải (%):** `Utilization = (Workload / Capacity) * 100%`.
4. **Năng suất Phòng ban (%):** Trung bình trọng số của toàn bộ nhân sự trong phòng ban đó.

---

## 5. Các Màn hình & Tính năng trên Giao diện (UI Walkthrough)

### 5.1. Tab "Năng suất & Cân bằng tải" (`Resources.jsx` + `WorkloadProductivityChart.jsx`)
- **Vị trí:** Tab thứ 2 tại trang **Nhân sự** (`/resources`).
- **Chế độ xem (Toggle Switch):**
  - **Theo từng Nhân sự:** Hiện từng cột đại diện cho mỗi nhân viên, kèm avatar, chức vụ, số giờ làm và % tải.
  - **Theo Phòng ban:** Gộp theo từng bộ phận (Frontend, Backend, Design, QA...), tính tổng giờ tải và tỷ lệ quá tải của cả phòng.
- **Thanh cảnh báo quá tải:** Nếu có nhân sự rơi vào vùng màu đỏ (>100%), đầu trang sẽ hiện cảnh báo khẩn cấp liệt kê đích danh những nhân sự bị quá tải.
- **Nút "San tải việc ➔":** Xuất hiện ngay trên cột của nhân viên/phòng ban màu đỏ. Bấm vào sẽ mở ngay `BulkReassignModal` để chọn các task cần bàn giao sang người khác.

### 5.2. Modal "Tự đánh giá Năng lực" (`SelfSkillEvaluationModal.jsx`)
- **Dành cho:** Bất kỳ nhân sự nào đang đăng nhập.
- **Thao tác:** Bấm nút **"Tự đánh giá năng lực"** ở góc trên danh sách nhân sự.
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
