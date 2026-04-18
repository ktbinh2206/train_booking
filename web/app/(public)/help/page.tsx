'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, Search, Phone, Mail, MessageSquare } from 'lucide-react';

const FAQS = [
  {
    category: 'Đặt vé',
    questions: [
      {
        q: 'Làm sao để đặt vé tàu?',
        a: 'Vào trang tìm kiếm, nhập điểm đi, điểm đến và ngày đi, chọn chuyến phù hợp, chọn ghế rồi hoàn tất thanh toán. Bạn sẽ nhận email xác nhận cùng vé điện tử.',
      },
      {
        q: 'Tôi có thể đặt vé cho người khác không?',
        a: 'Có. Bạn có thể đặt cho người thân hoặc bạn bè bằng cách nhập thông tin của họ khi đặt vé. Hành khách cần mang giấy tờ tùy thân hợp lệ khi đi tàu.',
      },
      {
        q: 'Ghế được giữ trong bao lâu?',
        a: 'Ghế đã chọn sẽ được giữ trong 15 phút. Nếu chưa thanh toán trong thời gian này, ghế sẽ tự động mở lại.',
      },
      {
        q: 'Chính sách hủy vé như thế nào?',
        a: 'Có thể hủy trước giờ khởi hành 24 giờ để nhận hoàn 75% giá vé. Hủy trong vòng 24 giờ sẽ không được hoàn tiền.',
      },
    ],
  },
  {
    category: 'Thanh toán',
    questions: [
      {
        q: 'Hỗ trợ những phương thức thanh toán nào?',
        a: 'Chúng tôi hỗ trợ thẻ tín dụng, thẻ ghi nợ, internet banking và ví điện tử.',
      },
      {
        q: 'Thông tin thanh toán có an toàn không?',
        a: 'Có. Tất cả giao dịch đều được mã hóa SSL an toàn. Chúng tôi không lưu thông tin thẻ trên hệ thống.',
      },
      {
        q: 'Tôi có nhận xác nhận ngay không?',
        a: 'Có. Bạn sẽ nhận xác nhận qua SMS và email ngay sau khi thanh toán thành công.',
      },
    ],
  },
  {
    category: 'Hành trình',
    questions: [
      {
        q: 'Cần giấy tờ gì khi đi tàu?',
        a: 'Bạn cần mang theo giấy tờ tùy thân hợp lệ do cơ quan có thẩm quyền cấp, cùng vé điện tử để đối chiếu.',
      },
      {
        q: 'Có thể đổi thông tin chuyến đi sau khi đặt không?',
        a: 'Bạn có thể đổi ngày đi trước 7 ngày, có thể phát sinh phí. Không hỗ trợ đổi điểm đến.',
      },
      {
        q: 'Quy định hành lý ra sao?',
        a: 'Mỗi hành khách được mang hành lý theo quy định của ngành đường sắt. Nên mang gọn nhẹ để thuận tiện di chuyển.',
      },
    ],
  },
  {
    category: 'Tài khoản',
    questions: [
      {
        q: 'Làm sao để tạo tài khoản?',
        a: 'Nhấn Đăng ký, điền thông tin và xác minh email. Sau đó bạn có thể đăng nhập và đặt vé.',
      },
      {
        q: 'Làm sao để đặt lại mật khẩu?',
        a: 'Chọn Quên mật khẩu ở trang đăng nhập, nhập email và làm theo hướng dẫn được gửi về hộp thư.',
      },
      {
        q: 'Làm sao xem lịch sử đặt vé?',
        a: 'Đăng nhập tài khoản và vào mục Vé của tôi để xem toàn bộ đơn đã đặt trước đây và sắp tới.',
      },
    ],
  },
];

export default function HelpPage() {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFAQs = FAQS.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.a.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((category) => category.questions.length > 0);

  const visibleFAQs = searchTerm ? filteredFAQs : FAQS;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Trợ giúp và hỗ trợ</h1>
          <p className="text-blue-100 text-lg">Tìm câu trả lời cho các câu hỏi thường gặp khi đặt vé và đi tàu với RailBook</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm câu trả lời..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-6 mb-12">
          {visibleFAQs.map((category) => (
            <div key={category.category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.category}</h2>
              <div className="space-y-3">
                {category.questions.map((faq, index) => (
                  <Card
                    key={index}
                    className="border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                  >
                    <button
                      onClick={() =>
                        setExpandedQuestion(expandedQuestion === `${category.category}-${index}` ? null : `${category.category}-${index}`)
                      }
                      className="w-full p-6 flex items-center justify-between text-left"
                    >
                      <p className="font-semibold text-gray-900">{faq.q}</p>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedQuestion === `${category.category}-${index}` ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedQuestion === `${category.category}-${index}` && (
                      <div className="px-6 pb-6 pt-0 border-t border-gray-200">
                        <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <Card className="border border-gray-200 bg-blue-50">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bạn vẫn cần hỗ trợ?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Gọi cho chúng tôi</p>
                  <p className="text-gray-600 text-sm">+84 1900-xxx-xxx</p>
                  <p className="text-gray-600 text-sm">Hỗ trợ 24/7</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email hỗ trợ</p>
                  <p className="text-gray-600 text-sm">support@railbook.com</p>
                  <p className="text-gray-600 text-sm">Phản hồi trong 2 giờ</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Chat trực tuyến</p>
                  <p className="text-gray-600 text-sm">Nhắn với tư vấn viên</p>
                  <p className="text-gray-600 text-sm">Thứ 2 - Thứ 6, 9:00 - 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
