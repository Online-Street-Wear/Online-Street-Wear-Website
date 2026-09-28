import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [feedback, setFeedback] = useState<'copied' | 'unavailable' | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setFeedback('copied'); }
    catch { setFeedback('unavailable'); }
  }
  return <span className="inline-flex flex-wrap items-center gap-2">
    <button type="button" aria-label={`Copy ${label}`} onClick={() => void copy()} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-red-500">
      {feedback === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {feedback === 'copied' ? 'Copied' : 'Copy'}
    </button>
    <span role="status" className="text-xs text-muted-foreground">{feedback === 'unavailable' ? 'Select and copy the number manually.' : feedback === 'copied' ? `${label} copied.` : ''}</span>
  </span>;
}
