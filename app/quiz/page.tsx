import QuizClient from "./_client";

export const metadata = { title: "Quiz bien-être — K-Kouma" };

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const params = await searchParams;
  return <QuizClient initialTopic={params.topic ?? null} />;
}
