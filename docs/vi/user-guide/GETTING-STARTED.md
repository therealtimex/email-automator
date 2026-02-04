# Bắt đầu

Chào mừng bạn đến với **Email Automator**, trợ lý email cá nhân hỗ trợ bởi AI của bạn. Hướng dẫn này sẽ giúp bạn thiết lập ứng dụng bằng mô hình **"Bring Your Own Key" (BYOK)**, đảm bảo dữ liệu của bạn luôn nằm trong tầm kiểm soát của bạn trong cơ sở hạ tầng Supabase của riêng bạn.

## 🛠 Điều kiện tiên quyết

Trước khi bắt đầu, hãy đảm bảo bạn có các thứ sau:

1.  **RealTimeX Desktop**: Đã được cài đặt và đang chạy. Đây là yêu cầu bắt buộc cho việc xử lý AI (LLMs) và các tính năng Chuyển văn bản thành giọng nói (TTS).
2.  **Tài khoản Supabase**: Một tài khoản miễn phí hoặc trả phí tại [supabase.com](https://supabase.com).

---

## 🚀 Thiết lập nhanh với Wizard

**Setup Wizard** tích hợp sẵn là cách được khuyến nghị để bắt đầu. Nó tự động hóa các công việc kỹ thuật nặng nhọc.

### 1. Mua & Khởi chạy
*   Mở **RealTimeX Desktop**.
*   Đi tới tab **Marketplace** → **Local Apps**.
*   Tìm kiếm **"Email Automator"** và mua nó (hoặc kích hoạt nếu đã sở hữu).
*   Sau khi mua, nhấp vào **Launch** từ danh sách Local Apps của bạn.

### 2. Chạy Setup Wizard
Trong lần khởi chạy đầu tiên, ứng dụng sẽ hướng dẫn bạn qua cấu hình ban đầu:

*   **Chọn đường dẫn thiết lập**:
    *   **Managed Provisioning (Khuyến nghị)**: Cung cấp **Supabase Access Token**. Wizard sẽ tự động tạo một dự án mới, chạy các di chuyển cơ sở dữ liệu (migrations), triển khai Edge Functions và nạp cơ sở kiến thức ban đầu.
    *   **Connect Existing Project**: Sử dụng một dự án Supabase hiện có bằng cách cung cấp **Project URL** và **Anon Key**. Bạn cũng có thể tùy chọn cung cấp Access Token để Wizard chạy các di chuyển cho bạn.

### 3. Tạo tài khoản của bạn
Sau khi cơ sở dữ liệu đã sẵn sàng, bạn sẽ được nhắc tạo tài khoản người dùng cục bộ và đăng nhập để truy cập **Dashboard**.

---

## 🔍 Tìm thông tin xác thực Supabase của bạn

Nếu bạn chọn kết nối thủ công một dự án hiện có, bạn có thể tìm thấy thông tin xác thực của mình trong [Supabase Dashboard](https://supabase.com/dashboard):

1.  Chọn dự án của bạn.
2.  Điều hướng đến **Settings** → **API**.
3.  **Project URL**: Sao chép URL tìm thấy trong mục "Project URL".
4.  **API Key**: Sao chép khóa **anon (public)** trong mục "Project API keys".

> [!WARNING]
> **Lưu ý bảo mật**: Không bao giờ sử dụng khóa `service_role`. Nó có toàn quyền quản trị và không bao giờ được để lộ trong các ứng dụng phía khách hàng (client-side).

---

## 🪪 Tạo Access Token

Access Token cho phép Setup Wizard quản lý các dự án Supabase của bạn (tạo, di chuyển, triển khai chức năng) thay mặt bạn.

1.  Trong Supabase Dashboard, đi tới **Account** → **Access Tokens**.
2.  Nhấp vào **Generate new token**, đặt tên cho nó (ví dụ: "Email Automator") và sao chép kết quả.
3.  Dán token này vào Setup Wizard khi được nhắc.

---

**Bước tiếp theo:** [Cấu hình tài khoản Email của bạn](./CONFIGURATION.md)  
**Thuật ngữ:** [Các thuật ngữ phổ biến](./GLOSSARY.md)