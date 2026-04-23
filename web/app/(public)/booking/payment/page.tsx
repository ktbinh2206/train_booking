'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CreditCard, Lock, Smartphone, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { CountdownTimer } from '@/components/public/countdown-timer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getBooking, payBooking } from '@/lib/api';
import { VN } from '@/lib/translations';
import { formatCurrencyVND } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId') || '';

  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expired, setExpired] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: ''
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!bookingId) {
        setError('Thiếu bookingId.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getBooking(bookingId);
        if (active) {
          setBooking(data);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải thông tin thanh toán.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [bookingId]);

  const canPay = useMemo(() => {
    if (!booking || booking.status !== 'HOLDING') return false;
    if (paymentMethod !== 'card') return true;
    return cardData.cardName && cardData.cardNumber && cardData.cardExpiry && cardData.cardCVV;
  }, [booking, cardData, paymentMethod]);

  const handlePayment = async () => {
    if (!booking || !canPay) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const paid = await payBooking(booking.id);
      router.push(`/booking/success?bookingId=${paid.id}`);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Thanh toán thất bại.';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Đang tải dữ liệu thanh toán...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 mb-4">{error ?? 'Không tìm thấy booking.'}</p>
        <Link href="/search">
          <Button>Quay lại tìm kiếm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.results.searchResults, href: '/results' },
          { label: VN.booking.checkout, href: '/booking/checkout' },
          { label: VN.booking.payment }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <CountdownTimer
            expiresAtISO={booking.holdExpiresAt}
            onExpire={() => {
              setExpired(true);
              setShowExpiredModal(true);
            }}
          />

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{VN.booking.paymentMethods}</h2>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="mb-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-semibold">Thẻ tín dụng/ghi nợ</span>
                  </Label>
                </div>

                {paymentMethod === 'card' && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <Label htmlFor="cardName" className="text-sm mb-2">Tên chủ thẻ</Label>
                      <Input
                        id="cardName"
                        placeholder="Nguyen Van A"
                        value={cardData.cardName}
                        onChange={(event) => setCardData((previous) => ({ ...previous, cardName: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber" className="text-sm mb-2">Số thẻ</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardData.cardNumber}
                        onChange={(event) => setCardData((previous) => ({ ...previous, cardNumber: event.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardExpiry" className="text-sm mb-2">Ngày hết hạn</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={cardData.cardExpiry}
                          onChange={(event) => setCardData((previous) => ({ ...previous, cardExpiry: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardCVV" className="text-sm mb-2">CVV</Label>
                        <Input
                          id="cardCVV"
                          placeholder="123"
                          value={cardData.cardCVV}
                          onChange={(event) => setCardData((previous) => ({ ...previous, cardCVV: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="cursor-pointer flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    <span className="font-semibold">Ví điện tử</span>
                  </Label>
                </div>
              </div>

              <div className="mb-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="netbanking" id="netbanking" />
                  <Label htmlFor="netbanking" className="cursor-pointer flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    <span className="font-semibold">Internet Banking</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm text-green-900">
              <p className="font-semibold mb-1">Thanh toán của bạn được bảo mật</p>
              <p>Chúng tôi dùng mã hóa SSL 256-bit để bảo vệ thông tin thanh toán</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đặt vé</h2>

              <div className="space-y-2 text-sm mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tàu</span>
                  <span className="font-semibold">{booking.trip.trainName ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tuyến đường</span>
                  <span className="font-semibold">{booking.trip.origin} → {booking.trip.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hành khách</span>
                  <span className="font-semibold">{booking.seatCount}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Tổng cộng</span>
                  <span className="font-bold text-blue-600">{formatCurrencyVND(booking.totalAmount)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 mb-4">
                  {error}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900 mb-4 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Ghế của bạn được giữ trong 5 phút</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handlePayment}
                disabled={!canPay || processing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {processing ? 'Đang xử lý...' : `Thanh toán ${formatCurrencyVND(booking.totalAmount)}`}
              </Button>
              <Link href={`/booking/checkout?tripId=${booking.trip.id}&seats=${booking.seatIds.join(',')}`}>
                <Button variant="outline" className="w-full">Quay lại</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={showExpiredModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Booking đã hết hạn giữ chỗ</AlertDialogTitle>
            <AlertDialogDescription>
              Vui lòng quay lại trang tìm kiếm và chọn ghế lại để tiếp tục đặt vé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowExpiredModal(false);
                router.replace('/search');
              }}
            >
              Đồng ý
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>  
    </div>
    
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
