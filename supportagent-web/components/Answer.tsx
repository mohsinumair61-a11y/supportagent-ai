import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The model writes markdown. Rendering it as plain text leaves literal ** and
 * ### on screen, which is the single most common way an LLM UI looks broken.
 * Element styling is defined here rather than inherited, because Tailwind's
 * preflight strips list and heading defaults.
 */
export default function Answer({
  children,
  streaming = false,
}: {
  children: string;
  streaming?: boolean;
}) {
  return (
    <div className="text-[0.9375rem] leading-relaxed text-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[1rem] font-semibold first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[0.9375rem] font-semibold first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-2 mt-3 text-[0.9375rem] font-semibold first:mt-0">{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-[0.8125rem] text-amber">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-md bg-base p-4 font-mono text-[0.8125rem] last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-edge-lit pl-4 text-dim last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-sky underline underline-offset-2">
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-edge" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-[0.875rem]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-edge bg-raised px-3 py-2 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-edge px-3 py-2">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
      {streaming ? <span className="caret" aria-hidden="true">&nbsp;</span> : null}
    </div>
  );
}
