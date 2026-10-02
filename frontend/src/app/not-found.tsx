import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">404</p>

        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Page not found
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have
          been moved.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Back to Naomatch
        </Link>
      </div>
    </main>
  );
}
