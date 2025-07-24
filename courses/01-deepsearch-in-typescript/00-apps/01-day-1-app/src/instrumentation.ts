import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  registerOTel({
    serviceName: "langfuse-vercel-ai-nextjs-deep-research",
    traceExporter: new LangfuseExporter(),
  });
}