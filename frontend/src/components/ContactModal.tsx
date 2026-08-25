import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('ARCHER Research Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg('Name, email, and message are all required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await api.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName('');
        setEmail('');
        setMessage('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 z-10 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Contact & Support
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send research queries, feedback, or collaboration requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Email Banner */}
        <div className="p-3 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/60 text-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Direct Developer Email:</span>
            <a
              href="mailto:tapashidhar2004@gmail.com"
              className="block font-mono text-brand-700 dark:text-brand-300 hover:underline font-bold"
            >
              tapashidhar2004@gmail.com
            </a>
          </div>
          <a
            href="mailto:tapashidhar2004@gmail.com"
            className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-[11px] font-bold shadow-xs transition-colors shrink-0"
          >
            Mail Now
          </a>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Message Dispatched</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your message has been emailed directly to tapashidhar2004@gmail.com. We will review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="contact-name" className="font-semibold text-slate-700 dark:text-slate-300">Your Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Dr. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-email" className="font-semibold text-slate-700 dark:text-slate-300">Your Email Address</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-message" className="font-semibold text-slate-700 dark:text-slate-300">Message</label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={4}
                placeholder="Write your research query, feature request, or feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
