import { useId, useState, type FormEvent } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputId = useId();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || data.error || 'We could not save your subscription. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-4">
        <label htmlFor={inputId} className="sr-only">Newsletter email address</label>
        <input 
          id={inputId}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="min-w-0 flex-1 px-6 py-4 bg-muted border border-border rounded-lg focus:outline-none focus:border-red-500 transition disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={status === 'loading'}
          className="px-8 py-4 bg-red-500 text-white hover:bg-red-600 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      {message && (
        <p role={status === 'error' ? 'alert' : 'status'} className={`text-center text-sm ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
