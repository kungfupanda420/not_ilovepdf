import dynamic from "next/dynamic";
import { Suspense } from "react";

const WordToPdfClient = dynamic(
  () => import("./WordToPdfClient"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Word to PDF</h1>
        <p>Loading converter...</p>
      </div>
    ),
  }
);

export default function WordToPDFPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading converter...</div>}>
      <WordToPdfClient />
    </Suspense>
  );
}
