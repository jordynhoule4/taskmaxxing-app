import Link from 'next/link';
import { Calendar, Check, Target, Repeat, BarChart, Users, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="container mx-auto px-6 py-8">
        <nav className="flex justify-center items-center">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={32} />
            <span className="text-2xl font-bold text-gray-800">Taskmaxxing</span>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          <span className="text-blue-600">Take The Task Pill Today</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track habits, plan out your week, and become the ultimate Taskmaxxer.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Start Taskmaxxing Today
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg"
          >
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}
