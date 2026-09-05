import Page from "@/components/Page";

export const dynamic = "force-dynamic";

export default function Home() {
  // Env is read on the server; only the two booleans cross to the client.
  const configured = Boolean(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY);
  const model = (process.env.MODEL_NAME ?? "gemini-2.5-flash").replace(/^models\//, "");

  return <Page configured={configured} model={model} />;
}
