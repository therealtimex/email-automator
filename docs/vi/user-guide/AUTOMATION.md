# Tự động hóa & Auto-Pilot

Tab **Auto-Pilot** là trung tâm quản lý hành vi của tác nhân AI. Nó hợp nhất các "Quy tắc hệ thống" (chế độ chuyển đổi toàn cầu) và một thư viện gồm **26 quy tắc thông minh tích hợp** cùng với các "Quy tắc tùy chỉnh" của riêng bạn.

---

## 🛡️ Quy tắc hệ thống tích hợp

Email Automator đi kèm với 26 quy tắc được cấu hình sẵn do các chuyên gia AI thiết kế để xử lý các thách thức phổ biến trong hộp thư đến. Chúng được sắp xếp thành các danh mục chức năng để giúp bạn luôn ngăn nắp.

### 📧 Tổ chức Email
*   **Newsletter Sweeper**: Tự động lưu trữ các bản tin và email tiếp thị để giữ cho hộp thư đến của bạn sạch sẽ.
*   **Receipt Organizer**: Tự động lưu hồ sơ biên lai và xác nhận đơn hàng.
*   **CC Organizer**: Gán nhãn cho các email mà bạn được gửi kèm (CC) để nhanh chóng phân loại.
*   **Cold Outreach Filter**: Di chuyển các email bán hàng lạ sang một thư mục riêng.
*   **Social Noise**: Giảm thiểu các thông báo từ LinkedIn và mạng xã hội.
*   **Stack Overflow Digests**: Tự động lưu trữ các bản tin kỹ thuật trừ khi chúng yêu cầu sự chú ý ngay lập tức.

### 🚨 Ưu tiên & Cảnh báo
*   **VIP Urgent Messages**: Gắn sao cho các tin nhắn khẩn cấp từ các bên liên quan chính (CEOs, thành viên Hội đồng quản trị).
*   **Critical Alerts**: Làm nổi bật các sự cố sản xuất và các cảnh báo quan trọng P0/P1.
*   **Urgent Support Tickets**: Làm nổi bật các vấn đề của khách hàng có mức độ ưu tiên cao cần hành động ngay lập tức.

### 💻 Phát triển
*   **GitHub Mentions**: Theo dõi khi bạn được nhắc đến cụ thể trong Pull Requests hoặc Issues.
*   **CI/CD Failures**: Làm nổi bật các lỗi xây dựng (build) và triển khai từ các công cụ như CircleCI hoặc GitHub Actions.
*   **Code Review Requests**: Tổ chức các yêu cầu đánh giá mã (code review) gửi đến.
*   **Dependabot Noise**: Tự động lưu trữ các bản cập nhật phụ thuộc có mức độ ưu tiên thấp trong khi vẫn giữ các cảnh báo bảo mật ở chế độ hiển thị.
*   **Monitoring Alerts**: Tổ chức các cảnh báo giám sát và ghi nhật ký không khẩn cấp.

### 💼 Bán hàng & Kinh doanh
*   **Hot Leads**: Ưu tiên các câu trả lời từ khách hàng tiềm năng có ý định cao dựa trên cảm xúc tích cực.
*   **Follow-up Reminders**: Theo dõi các phản hồi từ khách hàng tiềm năng yêu cầu cụ thể việc theo dõi (follow-up).
*   **Referrals & Intros**: Đảm bảo bạn không bao giờ bỏ lỡ một lời giới thiệu hoặc đề cử nồng nhiệt.
*   **Contracts & Proposals**: Làm nổi bật các trao đổi hợp đồng quan trọng và các tài liệu pháp lý.
*   **Objections & Concerns**: Gắn cờ các email bày tỏ mối quan ngại hoặc sự ngần ngại để xử lý cẩn thận.
*   **Nurture Campaigns**: Lưu trữ các email chiến dịch tự động để ưu tiên các câu trả lời cá nhân.
*   **Financial Updates**: Giữ cho các báo cáo doanh thu và cập nhật ngân sách hàng quý dễ dàng truy cập.

### ⚙️ Vận hành
*   **Internal Requests**: Tổ chức các yêu cầu liên nhóm và các đầu mục công việc.
*   **Vendor Communications**: Theo dõi hóa đơn, lô hàng và các cập nhật liên quan đến nhà cung cấp.
*   **System Alerts**: Tổ chức các thông báo về cơ sở hạ tầng và hệ thống.
*   **Meeting Invites**: Tách riêng các lời mời lịch để quản lý lịch trình dễ dàng hơn.
*   **Weekly Reports**: Tự động phân loại các báo cáo tình trạng định kỳ và cập nhật tiến độ.

---

## 🛠️ Xây dựng các quy tắc tùy chỉnh

Các quy tắc tùy chỉnh cho phép bạn tạo ra các quy trình làm việc chính xác, hướng bởi AI. Bạn có thể tạo, chỉnh sửa và quản lý các quy tắc này trực tiếp trong tab **Auto-Pilot**.

### 1. Điều kiện (Cái "Nếu")
Bạn có thể kết hợp các siêu dữ liệu (metadata) và các điều kiện hỗ trợ bởi AI:
*   **Thông tin AI**: Danh mục (ví dụ: Bản tin, Biên lai, Cá nhân), Cảm xúc (Tích cực, Tiêu cực, Trung lập), hoặc Mức độ ưu tiên (Cao, Trung bình, Thấp).
*   **Siêu dữ liệu**: Miền người gửi (ví dụ: `github.com`), các từ khóa cụ thể trong tiêu đề, hoặc tên người gửi.
*   **Bộ lọc lưu trữ**: "Chỉ hành động nếu email cũ hơn X ngày." Điều này hoàn hảo để dọn dẹp các bản tin hoặc thông báo cũ.

### 2. Hành động (Cái "Thì")
Chọn điều gì sẽ xảy ra khi một email khớp với các điều kiện của bạn:
*   **Lưu trữ / Xóa**: Giữ cho hộp thư đến của bạn sạch sẽ một cách tự động.
*   **Gắn sao / Gắn cờ**: Làm nổi bật các mục quan trọng để xem xét thủ công.
*   **Draft (Viết nháp)**: Hành động mạnh mẽ nhất. Nó yêu cầu AI chuẩn bị một câu trả lời.

---

## ✍️ Ngữ cảnh thông minh & Ghostwriting

Khi bạn sử dụng hành động **Draft**, bạn có thể cung cấp cho AI các hướng dẫn cụ thể để đảm bảo câu trả lời phù hợp với nhu cầu của bạn:

*   **Hướng dẫn Ghostwriting**: Nói cho AI biết *cách* trả lời (ví dụ: "Hãy lịch sự nhưng kiên quyết từ chối lời mời," hoặc "Hỏi xem họ có rảnh vào thứ Ba tới không").
*   **Tệp đính kèm quy tắc**: Bạn có thể tải lên các tài liệu chuẩn (như bảng giá hoặc tiểu sử) mà AI sẽ tự động bao gồm dưới dạng tệp đính kèm bất cứ khi nào quy tắc này kích hoạt một bản nháp.

---

## 🚀 Tab Auto-Pilot

Tab **Auto-Pilot** cung cấp cái nhìn toàn cảnh về công cụ tự động hóa của bạn.
*   **Chế độ xem nhóm**: Các quy tắc được sắp xếp theo mục đích chính của chúng.
*   **Chế độ chuyển đổi nhanh**: Bật hoặc tắt các quy tắc ngay lập tức mà không cần xóa chúng.
*   **Chỉ số trạng thái**: Xem quy tắc nào hiện đang hoạt động và chúng đã xử lý bao nhiêu email.

---

## 💡 Các phương pháp hay nhất

*   **Bắt đầu thụ động**: Thiết lập các quy tắc đầu tiên của bạn ở chế độ **Star** hoặc **Archive** thay vì **Delete** cho đến khi bạn tin tưởng vào khả năng phân loại của AI.
*   **Sử dụng Lưu trữ cho Tiếng ồn**: Sử dụng một quy tắc như: `Nếu Danh mục = Bản tin VÀ Tuổi > 30 Ngày THÌ Xóa`. Điều này giữ cho các bản tin "đã đọc" của bạn không làm lộn xộn kho lưu trữ của bạn mãi mãi.
*   **Tinh chỉnh với Phản hồi**: Nếu một quy tắc không khớp chính xác, hãy sử dụng biểu tượng **Feedback** trên Dashboard để cải thiện sự hiểu biết của AI về loại email cụ thể đó.

---

**Bước tiếp theo:** [Quản lý Tài khoản & Bảo mật](./ACCOUNT.md)