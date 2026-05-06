import Link from "next/link";
import { Languages } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Languages className="w-16 h-16 text-[#0891B2] mb-6" />
      <h1 className="text-4xl font-bold text-[#0891B2] mb-4">DClaw Translate</h1>
      <p className="text-lg text-gray-600 mb-8">Real-time translation & localization</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-[#0891B2] text-white rounded-lg hover:bg-[#0E7490] transition"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
