import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    MapPin,
    Mail,
    Phone,
    Facebook,
    Instagram,
    Linkedin,
    Twitter
} from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand Column */}
                    <div className="flex flex-col gap-6">
                        <Link href="/">
                            <Image
                                src="/images/gwlogo.png"
                                alt="GreatWork Logo"
                                width={160}
                                height={44}
                                className="h-10 w-auto object-contain"
                            />
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            Elevating the way you work with premium flexible workspaces and enterprise-grade office solutions.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-4">
                            <Link href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-[#8B1D1D] hover:text-white transition-all">
                                <Facebook size={18} />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-[#8B1D1D] hover:text-white transition-all">
                                <Instagram size={18} />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-[#8B1D1D] hover:text-white transition-all">
                                <Linkedin size={18} />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-[#8B1D1D] hover:text-white transition-all">
                                <Twitter size={18} />
                            </Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-6">Explore</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="/spaces" className="hover:text-[#8B1D1D] transition-colors">Our Spaces</Link></li>
                            <li><Link href="/solutions" className="hover:text-[#8B1D1D] transition-colors">Enterprise Solutions</Link></li>
                            <li><Link href="/journal" className="hover:text-[#8B1D1D] transition-colors">The Journal</Link></li>
                            <li><Link href="/locations" className="hover:text-[#8B1D1D] transition-colors">Locations</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-6">Support</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="/help" className="hover:text-[#8B1D1D] transition-colors">Help Center</Link></li>
                            <li><Link href="/contact" className="hover:text-[#8B1D1D] transition-colors">Contact Us</Link></li>
                            <li><Link href="/apply" className="hover:text-[#8B1D1D] transition-colors">Apply for Membership</Link></li>
                            <li><Link href="/faqs" className="hover:text-[#8B1D1D] transition-colors">FAQs</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-6">Get in Touch</h4>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-[#8B1D1D] shrink-0" />
                                <span>Metro Manila, Philippines</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Mail size={18} className="text-[#8B1D1D] shrink-0" />
                                <span>hello@greatwork.ph</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone size={18} className="text-[#8B1D1D] shrink-0" />
                                <span>+63 (2) 8000 0000</span>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
                    <p>© {currentYear} GreatWork. All rights reserved.</p>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
                        <Link href="/cookies" className="hover:text-gray-600">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}