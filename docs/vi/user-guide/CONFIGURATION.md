# Cấu hình

Tab **Configuration** là trung tâm điều khiển của Email Automator. Tại đây, bạn kết nối các nhà cung cấp email, xác định hành vi của AI và thiết lập các quy tắc thúc đẩy quá trình tự động hóa.

---

## 📧 Tài khoản Email (BYOK)

Email Automator tuân theo mô hình **"Bring Your Own Key" (BYOK)**. Bạn cung cấp thông tin xác thực OAuth của riêng mình, đảm bảo rằng quyền truy cập dữ liệu hoàn toàn nằm trong tầm kiểm soát của bạn.

### 🔴 Thiết lập Gmail (OAuth 2.0)
1.  **Google Cloud Console**: Tạo một dự án và bật **Gmail API**.
2.  **Consent Screen**: Cấu hình màn hình đồng ý OAuth và thêm email của bạn làm **Test User**.
3.  **Credentials**: Tạo một **OAuth 2.0 Client ID** (Loại: Web Application).
    *   **Authorized Redirect URI**: `https://<your-project-ref>.supabase.co/functions/v1/auth-gmail/callback`
4.  **Kết nối**: Trong Email Automator, nhấp vào **Connect Gmail**.
5.  **Ủy quyền**: Dán Client ID và Secret của bạn (hoặc tải lên tệp JSON), sau đó làm theo liên kết để ủy quyền cho tài khoản của bạn.

### 🔵 Thiết lập Outlook (Device Code)
1.  **Azure Portal**: Đăng ký một ứng dụng mới trong **App Registrations**.
2.  **Account Type**: Chọn "Accounts in any organizational directory and personal Microsoft accounts".
3.  **Authentication**: Đảm bảo "Allow public client flows" được đặt thành **Yes**.
4.  **Kết nối**: Trong Email Automator, nhấp vào **Connect Outlook** và nhập **Client ID** của bạn.
5.  **Ủy quyền**: Làm theo thông báo **Device Code** trong trình duyệt để hoàn tất đăng nhập.

---

## 📅 Phạm vi & Giới hạn đồng bộ

Trước khi bắt đầu lần đồng bộ đầu tiên, hãy cấu hình các giới hạn để đảm bảo hiệu suất và hiệu quả chi phí:

*   **Sync From**: Chọn ngày bắt đầu (ví dụ: "Từ bây giờ" hoặc một ngày cụ thể trong quá khứ).
*   **Max Emails**: Đặt số lượng email tối đa để xử lý trong một đợt (Mặc định: 50).
*   **Sync Interval**: Xác định tần suất bộ lập lịch nền sẽ kiểm tra thư mới (ví dụ: mỗi 15 phút).

> [!TIP]
> **Bắt đầu nhỏ**: Đối với lần chạy đầu tiên, chúng tôi khuyên bạn nên đặt "Sync From" thành "Now" và "Max Emails" thành 10-20 để xác minh các quy tắc của bạn hoạt động như mong đợi.

---

## 🤖 Tự động hóa & Auto-Pilot

Việc quản lý hành vi của AI—bao gồm xây dựng các quy tắc tùy chỉnh, chuyển đổi tự động hóa hệ thống và thiết lập các chính sách lưu trữ—đã được hợp nhất vào tab **[Auto-Pilot](./AUTOMATION.md)**.

---

## 🧠 Cài đặt AI & Hệ thống

### Cấu hình nhà cung cấp
Email Automator phát hiện các mô hình có sẵn thông qua **RealTimeX Desktop**.
*   **LLM Provider**: Chọn công cụ AI ưa thích của bạn (ví dụ: OpenAI, Anthropic hoặc các mô hình cục bộ).
*   **Embedding Model**: Được sử dụng cho hệ thống RAG (Retrieval-Augmented Generation) để giúp AI hiểu ngữ cảnh cụ thể của bạn.

### Giọng nói & Khả năng tiếp cận (TTS)
Bật **Text-to-Speech** để AI đọc to các bản tóm tắt hoặc các cảnh báo quan trọng.
*   **Auto-Speak**: Tự động đọc các thông báo có mức độ ưu tiên cao.
*   **Voice Profile**: Chọn từ nhiều giọng nói chất lượng cao khác nhau có sẵn thông qua RealTimeX.

---

**Bước tiếp theo:** [Theo dõi Dashboard](./DASHBOARD.md)