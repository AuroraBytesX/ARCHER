import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 1. Remove <think>...</think> tags if any
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Parse text blocks, tables, lists, and headers
  const lines = cleanContent.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushTable = (key: number) => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((l, idx) => {
        elements.push(<p key={`${key}-fallback-${idx}`} className="my-1">{formatInline(l)}</p>);
      });
      tableBuffer = [];
      return;
    }

    const headerLine = tableBuffer[0];
    const dataLines = tableBuffer.slice(2); // skip separator line (|---|---|)

    const parseRow = (line: string) => {
      return line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
    };

    const headers = parseRow(headerLine);

    elements.push(
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="p-2.5 font-semibold text-slate-900 dark:text-slate-100 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataLines.map((rowLine, rIdx) => {
              const cells = parseRow(rowLine);
              return (
                <tr key={rIdx} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300 align-top border-r last:border-r-0 border-slate-100 dark:border-slate-800/50">
                      {formatInline(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const flushCode = (key: number) => {
    elements.push(
      <pre key={`code-${key}`} className="my-2 p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto border border-slate-800">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
    codeBuffer = [];
    inCodeBlock = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode(idx);
      } else {
        if (tableBuffer.length > 0) flushTable(idx);
        inCodeBlock = true;
        codeBuffer = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Markdown Table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(idx);
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1 flex items-center gap-1.5">
          {formatInline(trimmed.replace('### ', ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
          {formatInline(trimmed.replace('## ', ''))}
        </h2>
      );
      return;
    }

    // Bullet items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^(\*|-|•)\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
          <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{formatInline(itemText)}</span>
        </div>
      );
      return;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="font-bold text-brand-600 dark:text-brand-400 text-[11px] shrink-0 min-w-4">
            {numMatch[1]}.
          </span>
          <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{formatInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Empty lines
    if (!trimmed) {
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed my-0.5">
        {formatInline(line)}
      </p>
    );
  });

  if (tableBuffer.length > 0) flushTable(lines.length);
  if (inCodeBlock && codeBuffer.length > 0) flushCode(lines.length);

  return <div className="space-y-1 text-xs">{elements}</div>;
};

function formatInline(text: string): React.ReactNode {
  // Replace <br> with newlines if present
  const parts = text.split(/(<br\s*\/?>)/gi);
  return parts.map((part, pIdx) => {
    if (part.toLowerCase().startsWith('<br')) {
      return <br key={pIdx} />;
    }

    // Handle **bold** and `code`
    const subParts = part.split(/(\*\*.*?\*\*|`.*?`|\[.*?,\s*p\.\s*\d+\])/g);
    return subParts.map((sub, sIdx) => {
      if (sub.startsWith('**') && sub.endsWith('**')) {
        return <strong key={sIdx} className="font-bold text-slate-900 dark:text-slate-100">{sub.slice(2, -2)}</strong>;
      }
      if (sub.startsWith('`') && sub.endsWith('`')) {
        return <code key={sIdx} className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-brand-600 dark:text-brand-400 font-mono text-[11px]">{sub.slice(1, -1)}</code>;
      }
      if (sub.match(/\[.*?,\s*p\.\s*\d+\]/)) {
        return <span key={sIdx} className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-brand-400 border border-emerald-500/20 font-mono text-[10px] mx-0.5">{sub}</span>;
      }
      return sub;
    });
  });
}
