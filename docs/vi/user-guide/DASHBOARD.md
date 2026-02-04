# Dashboard & Hoạt động trực tiếp

**Dashboard** là giao diện chính để theo dõi hoạt động của tác nhân AI và quản lý hộp thư đến đã được phân tích. Nó được thiết kế để cung cấp sự minh bạch hoàn toàn về cách AI suy nghĩ và hành động.

---

## 📊 Nguồn cấp dữ liệu phân tích

Khi AI xử lý hộp thư đến của bạn, các email sẽ xuất hiện trong nguồn cấp dữ liệu với các cập nhật trạng thái theo thời gian thực và thông tin chi tiết thông minh.

*   **Tìm kiếm thông minh**: Tìm nhanh email theo từ khóa hoặc người gửi.
*   **Bộ lọc AI**: Lọc chế độ xem của bạn theo Danh mục (ví dụ: Bản tin, Cá nhân), Cảm xúc hoặc Mức độ ưu tiên.
*   **Sắp xếp động**: Chuyển đổi giữa thời gian email được *nhận* và thời gian email được *xử lý* bởi AI.

### 📌 Thanh bên chi tiết Email
Nhấp vào bất kỳ thẻ email nào sẽ mở ra một bảng điều khiển chi tiết bên cạnh chứa:
*   **Tóm tắt AI**: Một cái nhìn tổng quan ngắn gọn về nội dung của email.
*   **Các điểm chính**: Các điểm nổi bật được liệt kê dưới dạng danh sách do AI trích xuất.
*   **Xem trước bản nháp**: Nếu một bản nháp trả lời đã được tạo, bạn có thể xem lại tại đây trước khi nó được gửi.
*   **Liên kết nhanh**: Nhảy trực tiếp đến email gốc trong giao diện web Gmail hoặc Outlook của bạn.

---

## 🛡️ Sự tin tưởng & Tính minh bạch

Email Automator được xây dựng trên nguyên tắc **"Glass Box AI."** Bạn luôn có thể biết *tại sao* một hành động đã được thực hiện.

### 📟 Terminal hoạt động trực tiếp
Nhấp vào nút **Live Activity** ở góc dưới bên phải để mở nguồn cấp dữ liệu xử lý theo thời gian thực.
*   **Nhật ký tư duy (Thinking Logs)**: Xem AI phân tích nội dung, đánh giá các quy tắc và quyết định các hành động.
*   **Chi tiết kỹ thuật**: Xem các cuộc gọi API thô, thời gian xử lý và trạng thái đồng bộ hóa nền.
*   **Điều khiển**: Bạn có thể dừng quá trình đồng bộ hóa đang hoạt động một cách thủ công ngay từ terminal.

### 🕵️ Dấu vết AI (AI Trace)
Nhấp vào **biểu tượng Con mắt** trên bất kỳ thẻ email nào để mở **AI Trace Modal**.
*   **Logic quyết định**: Xem bảng phân tích từng bước về lý do tại sao AI gán một danh mục hoặc mức độ ưu tiên cụ thể.
*   **Dữ liệu thô**: Xem lời nhắc (prompt) chính xác được gửi tới LLM và phản hồi JSON thô mà nó trả về.
*   **Số liệu hiệu suất**: Xem lại việc sử dụng token và thời gian xử lý cho email cụ thể đó.

---

## ⚡ Hành động nhanh

Kiểm soát với các hành động một lần nhấp có sẵn trên mỗi thẻ email:
*   🗑️ **Xóa / 📦 Lưu trữ**: Dọn dẹp tức thì.
*   ⭐ **Gắn sao / Gắn cờ**: Đánh dấu các mục quan trọng để xem sau.
*   🔄 **Xử lý lại**: Nếu bạn đã cập nhật các quy tắc của mình, bạn có thể yêu cầu AI phân tích lại một email.
*   💬 **Phản hồi**: Giúp AI học hỏi bằng cách báo cáo các phân loại hoặc phân tích cảm xúc không chính xác.

---

## 🔔 Thông báo & Phản hồi

Ứng dụng sử dụng phản hồi đa giác quan để thông báo cho bạn về hoạt động nền:
*   **Hình ảnh**: Các huy hiệu trạng thái trực tiếp và thông báo toast.
*   **Âm thanh**: Tiếng chuông tinh tế, chất lượng cao cho email mới, cảnh báo ưu tiên cao và hoàn thành đồng bộ hóa.
*   **Xúc giác**: Phản hồi vật lý trên các thiết bị được hỗ trợ.

> **Lưu ý**: Các cài đặt Âm thanh và Xúc giác có thể được tùy chỉnh trong [**Cài đặt tài khoản**](./ACCOUNT.md).

---

## 📈 Phân tích & Lịch sử

Luôn nắm bắt thông tin về hiệu suất của tác nhân:
*   **Lịch sử đồng bộ hóa**: Xem nhật ký các lần chạy đồng bộ gần đây, bao gồm số lượng email được xử lý và bất kỳ hành động nào được thực hiện.
*   **Thống kê hiệu quả**: Xem tổng số các lần xóa, lưu trữ và bản nháp tự động theo thời gian.

---

**Bước tiếp theo:** [Tạo các quy tắc tự động hóa](./AUTOMATION.md)