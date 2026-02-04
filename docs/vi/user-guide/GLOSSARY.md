# Thuật ngữ

Định nghĩa các thuật ngữ phổ biến được sử dụng trong Email Automator và Setup Wizard.

## Supabase
Một nền tảng backend cung cấp cơ sở dữ liệu Postgres được lưu trữ, xác thực, lưu trữ và các API. Email Automator sử dụng Supabase làm lớp cơ sở dữ liệu và xác thực.

## BYOK (Bring Your Own Key)
Một mô hình thiết lập nơi bạn kết nối dự án Supabase của riêng mình thay vì sử dụng một backend chung. Điều này giữ dữ liệu của bạn trong cơ sở hạ tầng của chính bạn.

## Supabase Project ID
Mã định danh duy nhất cho dự án Supabase của bạn (thường được hiển thị trong URL dự án hoặc cài đặt).

## Supabase Project URL
URL cơ sở cho dự án Supabase của bạn, được ứng dụng sử dụng để kết nối với cơ sở dữ liệu và các API.

## Anon Key (Public API Key)
Khóa API công khai cho dự án Supabase của bạn. Nó an toàn để sử dụng ở phía khách hàng nhưng vẫn tuân theo Row Level Security (RLS).

## Access Token
Một token từ tài khoản Supabase của bạn cho phép Setup Wizard tạo hoặc quản lý các dự án thay mặt bạn (được sử dụng trong Quick Start).

## Managed Provisioning (Quick Start)
Setup Wizard sử dụng Access Token của bạn để tự động tạo một dự án Supabase, áp dụng các di chuyển (migrations), triển khai Edge Functions và nạp cơ sở kiến thức.

## Manual Sync (Connect Existing Project)
Bạn kết nối một dự án Supabase hiện có bằng cách cung cấp Project URL và Anon Key. Các di chuyển có thể được chạy bởi wizard nếu Access Token được cung cấp.

## Managed Provisioning vs Manual Sync
**Managed Provisioning** tạo một dự án Supabase mới cho bạn bằng cách sử dụng Access Token.
**Manual Sync** kết nối với một dự án Supabase hiện có bằng Project URL và Anon Key của bạn.

## Migration (Di chuyển)
Các thay đổi cơ sở dữ liệu để tạo hoặc cập nhật các bảng, khung nhìn (views), hàm và chính sách. Các di chuyển giữ cho schema cơ sở dữ liệu của bạn đồng bộ với ứng dụng.

## Schema
Cấu trúc cơ sở dữ liệu của bạn: các bảng, cột, kiểu dữ liệu, chỉ mục, hàm và chính sách.

## SQL
Ngôn ngữ được sử dụng để định nghĩa và truy vấn các cấu trúc và dữ liệu cơ sở dữ liệu.

## Version Mismatch (Lệch phiên bản)
Khi phiên bản schema mong đợi của ứng dụng khác với phiên bản thực tế của cơ sở dữ liệu. Setup Wizard hoặc công cụ di chuyển sẽ nhắc bạn chuẩn hóa.

## Database Version (Cài đặt tài khoản)
Phiên bản chính của cơ sở dữ liệu được hiển thị trong Cài đặt tài khoản. Nó được sử dụng để hướng dẫn các di chuyển và phải khớp với phiên bản Postgres của dự án Supabase của bạn.

## Rollback
Hoàn tác một cuộc di chuyển. Trong Supabase, các lần rollback được thực hiện thủ công và nên được sử dụng cẩn thận.

## RLS (Row Level Security)
Một tính năng bảo mật của Postgres giới hạn hàng nào người dùng có thể đọc hoặc ghi. Supabase sử dụng RLS để bảo vệ dữ liệu.

## Edge Functions
Các hàm không máy chủ (serverless) được lưu trữ bởi Supabase. Email Automator sử dụng chúng cho các luồng OAuth và các hoạt động bảo mật.

## Service Role Key
Một khóa Supabase mạnh mẽ có thể bỏ qua RLS. Nó không bao giờ được để lộ cho khách hàng.

## Anon Key vs Service Role Key
**Anon key** an toàn cho việc sử dụng của khách hàng và tuân thủ RLS. **Service role key** bỏ qua RLS và chỉ được sử dụng trên các máy chủ đáng tin dậy.

## RealTimeX Desktop
Ứng dụng cục bộ cung cấp các dịch vụ AI (LLMs, embeddings, TTS) được sử dụng bởi Email Automator.

## Digital Persona (Cá tính kỹ thuật số)
Một hồ sơ xác định giọng điệu, phong cách và sở thích của bạn cho các bản nháp và câu trả lời do AI tạo ra.

## Persona Tone (Giọng điệu cá tính)
Tính chất cảm xúc của các câu trả lời (ví dụ: thân thiện, trang trọng, trực tiếp).

## Persona Style (Phong cách cá tính)
Các sở thích về phong cách viết (ví dụ: ngắn gọn, chi tiết, các điểm đầu dòng).

## Persona Voice (Tiếng nói cá tính)
"Âm thanh" tổng thể trong văn phong của bạn, bao gồm cách diễn đạt và nhịp điệu.

## Persona Signature (Chữ ký cá tính)
Một lời chào kết chuẩn hóa được sử dụng trong các câu trả lời (tên, chức danh, công ty).

## Persona Role (Vai trò cá tính)
Chức danh công việc hoặc vai trò của bạn, được sử dụng để định hình khung câu trả lời.

## Persona Company (Công ty cá tính)
Tên tổ chức được sử dụng trong các câu trả lời khi thích hợp.

## Persona Language (Ngôn ngữ cá tính)
Ngôn ngữ chính cho các bản nháp được tạo ra.

## Express API
Backend cục bộ xử lý việc đồng bộ hóa email, xử lý AI và thực thi tự động hóa.

## Realtime (Supabase)
Các cập nhật trực tiếp từ cơ sở dữ liệu đến ứng dụng. Được sử dụng để phản ánh các email mới, trạng thái đồng bộ hóa hoặc hoạt động mà không cần tải lại trang.

## LLM (Large Language Model)
Một mô hình AI được sử dụng để phân tích và tạo phản hồi (ví dụ: phân loại, soạn thảo câu trả lời).

## Embedding Model
Một mô hình chuyển đổi văn bản thành các vectơ để tìm kiếm ngữ nghĩa. Được sử dụng bởi cơ sở kiến thức và RAG.

## Embeddings
Các biểu diễn vectơ của văn bản được sử dụng để tìm kiếm ngữ nghĩa trong cơ sở kiến thức.

## RAG (Retrieval-Augmented Generation)
Một phương pháp truy xuất các tài liệu liên quan và cung cấp chúng cho AI để các câu trả lời bám sát vào tài liệu của bạn.

## Knowledge Base Ingestion (Nạp cơ sở kiến thức)
Quá trình chuyển đổi tài liệu thành các embeddings có thể tìm kiếm và lưu trữ chúng trong cơ sở dữ liệu.

## TTS (Text-to-Speech)
Chuyển đổi các phản hồi của AI thành âm thanh nói.

## TTS Provider vs Voice
Nhà cung cấp là dịch vụ tạo ra lời nói; giọng nói là người nói/cá tính cụ thể trong nhà cung cấp đó.

## OAuth
Một tiêu chuẩn ủy quyền cho phép ứng dụng truy cập tài khoản email của bạn mà không cần lưu trữ mật khẩu của bạn.

## OAuth Consent Screen
Màn hình nơi bạn cấp quyền cho Email Automator truy cập tài khoản email của bạn.

## Access Token (OAuth)
Một token ngắn hạn được sử dụng để gọi các API của nhà cung cấp email. Nó sẽ hết hạn và được làm mới tự động.

## Refresh Token
Một token dài hạn được sử dụng để nhận các access token mới mà không cần xác thực lại.

## Gmail API
API chính thức của Google để truy cập dữ liệu Gmail và gửi email.

## Microsoft Graph
API của Microsoft cho dữ liệu Outlook và Microsoft 365 (thư, lịch, danh bạ).

## IMAP / SMTP
Các giao thức email. IMAP đọc thư; SMTP gửi thư. (Email Automator sử dụng các API của nhà cung cấp thay vì IMAP/SMTP thô.)

## App Registration (Microsoft)
Một cấu hình ứng dụng trong Azure cung cấp thông tin xác thực cho quyền truy cập Microsoft Graph.

## Client ID
Mã định danh công khai cho ứng dụng OAuth của bạn (Google/Microsoft).

## Client Secret
Một bí mật riêng tư cho ứng dụng OAuth của bạn. Hãy coi nó như một mật khẩu.

## Redirect URI
URL gọi lại nơi nhà cung cấp email gửi người dùng đến sau khi ủy quyền OAuth.

## Device Code Flow
Một luồng OAuth nơi bạn xác thực trong trình duyệt bằng một mã ngắn, thường được sử dụng cho các ứng dụng máy để bàn.

## Tenant ID
Mã định danh đối tượng thuê (tenant) của Microsoft. Sử dụng "common" cho đa đối tượng thuê hoặc một ID đối tượng thuê cụ thể cho quyền truy cập chỉ dành cho tổ chức.

## Sync Scope
Xác định lượng lịch sử cần đồng bộ hóa (ví dụ: X ngày qua) và những tài khoản nào được bao gồm.

## Labels (Gmail) / Folders (Outlook)
Các cấu trúc tổ chức trong các nhà cung cấp email. Các nhãn (Labels) gắn thẻ cho các tin nhắn; các thư mục (folders) tổ chức chúng vào các thùng chứa.