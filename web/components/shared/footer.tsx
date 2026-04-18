import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import { VN } from '@/lib/translations';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🚂</span>
              </div>
              <span className="font-bold text-lg">{VN.nav.logo}</span>
            </div>
            <p className="text-gray-400 text-sm">
              {VN.footer.tagline}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">{VN.footer.quickLinks}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition">
                  {VN.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white transition">
                  {VN.nav.bookTickets}
                </Link>
              </li>
              <li>
                <Link href="/tickets" className="text-gray-400 hover:text-white transition">
                  {VN.nav.myTickets}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-400 hover:text-white transition">
                  {VN.nav.profile}
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-4">{VN.footer.policies}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  {VN.footer.cancellationPolicy}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  {VN.footer.privacyPolicy}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  {VN.footer.termsOfService}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  {VN.footer.faq}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{VN.footer.contactUs}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{VN.footer.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{VN.footer.email}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>{VN.footer.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>{VN.footer.copyright}</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition">
                {VN.footer.twitter}
              </a>
              <a href="#" className="hover:text-white transition">
                {VN.footer.facebook}
              </a>
              <a href="#" className="hover:text-white transition">
                {VN.footer.instagram}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
