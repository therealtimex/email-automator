# Khắc phục sự cố & Hỗ trợ

Nếu bạn gặp sự cố, hướng dẫn này bao gồm các lỗi phổ biến nhất và giải pháp cho chúng.

---

## 📡 Các vấn đề về đồng bộ hóa

### Email không xuất hiện trong Dashboard
*   **Kiểm tra ngày "Sync From"**: AI chỉ xử lý các email nhận được *sau* ngày này.
*   **Đặt lại Checkpoint**: Nếu bạn đã thay đổi ngày bắt đầu và muốn quét lại các email cũ, hãy nhấp vào nút **Reset Checkpoint** trong bảng Sync Scope.
*   **Giới hạn đợt (Batch Limits)**: Cài đặt **Max Emails** giới hạn số lượng email được xử lý trong mỗi lần chạy. Nếu bạn có một lượng lớn thư tồn đọng, có thể mất vài chu kỳ đồng bộ hóa để bắt kịp.
*   **Kích hoạt thủ công**: Nhấp vào **Run Sync Now** trên Dashboard để buộc kiểm tra ngay lập tức.

### "Sync Failed" hoặc "Backend Not Connected"
*   **Máy chủ cục bộ**: Đảm bảo ứng dụng Email Automator đang mở và đang chạy.
*   **Nguồn cấp dữ liệu hoạt động trực tiếp**: Mở terminal **Live Activity**. Nó thường chứa các thông báo lỗi kỹ thuật cụ thể (ví dụ: "Network Error" hoặc "401 Unauthorized").

---

## 🔑 Xác thực & Quyền hạn

### Google/Gmail: `redirect_uri_mismatch`
*   **Cách khắc phục**: Redirect URI của bạn trong Google Cloud Console phải khớp *chính xác* với URI hiển thị trong Email Automator.
*   **Ví dụ**: `https://your-ref.supabase.co/functions/v1/auth-gmail/callback` (đảm bảo không có dấu gạch chéo hoặc dấu cách ở cuối).

### Microsoft/Outlook: Đăng nhập thất bại hoặc hết thời gian
*   **Đăng ký ứng dụng**: Đảm bảo Đăng ký ứng dụng Azure của bạn đã đặt "Allow public client flows" thành **Yes**.
*   **Account Type**: Đảm bảo bạn đã chọn "Accounts in any organizational directory and personal Microsoft accounts" trong quá trình đăng ký.

### Supabase: "Invalid API Key"
*   **Cách khắc phục**: Luôn sử dụng khóa **anon (public)**. Khóa **service_role** sẽ bị ứng dụng từ chối vì lý do bảo mật.

---

## 🤖 Tích hợp AI & RealTimeX

### AI chậm hoặc không phản hồi
*   **Các mô hình cục bộ**: Nếu sử dụng Ollama hoặc LM Studio, hãy đảm bảo máy của bạn có đủ RAM và GPU không bị tải quá nặng.
*   **Khám phá**: Nếu không có mô hình nào xuất hiện trong menu thả xuống, hãy đảm bảo **RealTimeX Desktop** đang chạy và bạn đã cấu hình ít nhất một nhà cung cấp AI trong đó.

### "Smart Drafts" không được tạo
*   **Chuyển đổi hệ thống**: Đảm bảo **Smart Drafts** đã được bật (**ON**) trong tab Auto-Pilot.
*   **Xung đột quy tắc**: Xác minh rằng quy tắc khớp với email thực sự bao gồm hành động **Draft**.
*   **Bộ lọc an toàn**: AI sẽ tự động bỏ qua việc soạn nháp cho các địa chỉ `no-reply` và một số thông báo tự động nhất định để ngăn chặn "vòng lặp bot".

---

## 🗄️ Cơ sở dữ liệu & Di chuyển

### Biểu ngữ "Yêu cầu di chuyển cơ sở dữ liệu" (Database Migration Required)
*   **Tại sao nó xảy ra**: Ứng dụng cục bộ của bạn đã được cập nhật và schema cơ sở dữ liệu Supabase của bạn cần được cập nhật để hỗ trợ các tính năng mới.
*   **Cách khắc phục**: Nhấp vào **Update Now** trong biểu ngữ. Bạn sẽ cần **Supabase Access Token** để chạy cập nhật tự động.

### Live Terminal trống hoặc hiển thị "404"
*   **Quyền Realtime**: Đảm bảo bạn đã chạy các bản di chuyển mới nhất. Bảng `processing_events` phải tồn tại và đã bật các chính sách RLS (Row Level Security) chính xác.

---

## 🆘 Vẫn cần hỗ trợ?

Nếu vấn đề của bạn không được liệt kê ở đây:
1.  Kiểm tra **System Logs** trong Cài đặt tài khoản để xem các dấu vết kỹ thuật (stack traces).
2.  Xem lại [Tài liệu dành cho nhà phát triển](../docs-dev/README.md) để biết chi tiết thiết lập nâng cao.
3.  Mở một yêu cầu (ticket) hoặc thảo luận trong kho lưu trữ dự án.