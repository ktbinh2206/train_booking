'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import next from 'next/dist/server/next';

const banners = [
    {
        id: 1,
        image: '/banners/1.jpg',
        title: 'Giảm 15% vé đầu tiên',
        description: 'Dùng mã RAILFIRST15 khi thanh toán',
        href: '/search',
    },
    {
        id: 2,
        image: '/banners/2.jpg',
        title: 'Hà Nội → Đà Nẵng',
        description: 'Ưu đãi chỉ từ 799K',
        href: '/search?from=HN&to=DN',
    },
    {
        id: 3,
        image: '/banners/3.jpg',
        title: 'Du lịch hè',
        description: 'Combo ưu đãi gia đình',
        href: '/search',
    },
];

export function PromoBanner() {
    const [index, setIndex] = useState(0);

    const next = () => {
        setIndex((prev) => (prev + 1) % banners.length);
    };

    const prev = () => {
        setIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const current = banners[index];

    return (
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-2xl shadow-lg group">

            {/* LINK BAO TOÀN BỘ */}
            <Link href={current.href} className="block w-full h-full">

                {/* IMAGE */}
                <img
                    src={current.image}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />

                {/* CONTENT */}
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">
                        {current.title}
                    </h2>
                    <p className="text-sm md:text-lg">
                        {current.description}
                    </p>

                    {/* CTA */}
                    <span className="mt-4 inline-block bg-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Đặt ngay →
                    </span>
                </div>
            </Link>
            {/* 🔥 NÚT PREV */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    prev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full z-10"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 🔥 NÚT NEXT */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    next();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full z-10"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
            {/* DOTS */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {banners.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}