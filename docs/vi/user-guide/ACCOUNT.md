# Tài khoản & Quyền riêng tư

Quản lý hồ sơ, cá tính AI (AI persona) và các cài đặt bảo mật của bạn trong trang **Account Settings** (truy cập qua biểu tượng hồ sơ ở góc trên bên phải).

---

## 👤 Hồ sơ & Trải nghiệm
Cá nhân hóa tương tác của bạn với ứng dụng:
*   **Danh tính**: Cập nhật tên hiển thị của bạn và tải lên ảnh đại diện tùy chỉnh.
*   **Phản hồi cảm giác**: Bật/tắt **Hiệu ứng âm thanh** và **Phản hồi xúc giác** cho các hoạt động nền (như phân tích email mới hoặc hoàn thành đồng bộ hóa).

---

## 🧬 Cá tính AI của bạn
**Persona** là cài đặt quan trọng nhất để có được các **Smart Drafts** chất lượng cao. Nó đóng vai trò là "Danh tính" mà AI sử dụng khi viết nháp các câu trả lời.

*   **Vai trò & Ngữ cảnh**: Xác định chức danh chuyên môn và ngành nghề bạn đang làm việc.
*   **Giọng điệu (Tone of Voice)**: Chỉ định cách bạn muốn giọng điệu của mình thể hiện (ví dụ: "Chuyên nghiệp nhưng thân thiện", "Ngắn gọn và trực tiếp").
*   **Phong cách trả lời**: Thiết lập các sở thích về độ dài câu trả lời và việc sử dụng chữ ký.
*   **Các thực thể tin cậy**: Liệt kê các người gửi VIP và các miền tin cậy để giúp AI ưu tiên chính xác.

---

## 🗄️ Kết nối Supabase (BYOK)
Là một phần của mô hình **"Bring Your Own Key"**, bạn có thể theo dõi và quản lý kết nối của mình với cơ sở dữ liệu chuyên dụng:
*   **Trạng thái**: Xem URL dự án Supabase và phiên bản Schema hiện tại của bạn.
*   **Trung tâm di chuyển (Migration Center)**: Kiểm tra xem schema cơ sở dữ liệu của bạn có được cập nhật hay không.
*   **Ngắt kết nối**: Nếu bạn cần chuyển đổi dự án, bạn có thể xóa cấu hình của mình tại đây (điều này sẽ đăng xuất bạn và đặt lại trạng thái ứng dụng cục bộ).

---

## 🔐 Bảo mật
*   **Quản lý mật khẩu**: Cập nhật mật khẩu tài khoản cục bộ của bạn bất kỳ lúc nào.
*   **Mã hóa**: Tất cả thông tin xác thực của nhà cung cấp email (token Gmail/Outlook) đều được mã hóa trước khi được lưu trữ trong dự án Supabase của bạn.

---

## 🛡️ Quyền riêng tư & Chủ quyền dữ liệu
Email Automator được thiết kế với kiến trúc **ưu tiên quyền riêng tư**. Dữ liệu của bạn được phân phối như sau:

| Loại dữ liệu | Vị trí | Quyền truy cập |
| :--- | :--- | :--- |
| **Siêu dữ liệu Email & Nhật ký** | Dự án Supabase của bạn | Riêng tư đối với bạn |
| **Tệp Email thô (.eml)** | Máy cục bộ của bạn | Chỉ truy cập ngoại tuyến |
| **Tệp đính kèm quy tắc** | Lưu trữ Supabase của bạn | Riêng tư đối với bạn |
| **Xử lý AI** | RealTimeX Desktop | Cục bộ/API trực tiếp |

**Quan trọng**: Email Automator (công ty) không bao giờ có quyền truy cập vào email, thông tin xác thực hoặc nhật ký AI của bạn. Mọi thứ đều nằm trong cơ sở hạ tầng riêng tư của chính bạn.

---

**Bước tiếp theo:** [Khắc phục sự cố & Hỗ trợ](./TROUBLESHOOTING.md)