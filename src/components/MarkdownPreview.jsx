import React from "react";
import ReactMarkdown from "react-markdown";

export default function MarkdownPreview({ content }) {
  return (
    <div className="text-sm text-slate-700">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-slate-900 mt-5 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-slate-900 mt-3 mb-1.5" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
          table: ({ node, ...props }) => <table className="w-full border border-slate-200 rounded-lg mb-3 overflow-hidden" {...props} />,
          thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
          th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200" {...props} />,
          td: ({ node, ...props }) => <td className="px-3 py-2 text-slate-600 border-b border-slate-100" {...props} />,
          hr: ({ node, ...props }) => <hr className="border-slate-200 my-4" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-600 mb-3" {...props} />,
        }}
      >
        {content || "*Nothing to preview*"}
      </ReactMarkdown>
    </div>
  );
}