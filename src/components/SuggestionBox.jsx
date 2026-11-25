import { useState } from "react";
import { MessageSquareHeart, Send, ShieldCheck } from "lucide-react";
import { SUGGESTION_CATEGORIES, SUGGESTION_MAX_LENGTH } from "../config/brand.js";
import { useApp } from "../store/AppContext.jsx";
import { PrimaryButton } from "./ui.jsx";

const CATEGORY_ICONS = ["🏢", "⚙️", "💡", "🛡️", "💬"];

/**
 * Anonymous suggestion box. Nothing about the submitter is stored —
 * addSuggestion() deliberately records no user id.
 */
export default function SuggestionBox() {
  const { addSuggestion, theme } = useApp();
  const dark = theme.mode === "dark";
  const [category, setCategory] = useState("creative");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const remaining = SUGGESTION_MAX_LENGTH - text.length;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addSuggestion({ category, text });
    setText("");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>Anonymous Suggestion Box</h2>
        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Submitted directly to studio leadership. 100% anonymous.</p>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-2xl ${dark ? "bg-emerald-400/10 border border-emerald-400/20" : "bg-emerald-50 border border-emerald-200"}`}>
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <p className={`text-xs ${dark ? "text-emerald-300" : "text-emerald-700"}`}>
            <span className="font-bold">Strict privacy guarantee:</span> no signature, name, or employee ID is attached to your suggestion.
          </p>
        </div>

        <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Choose a category
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {SUGGESTION_CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-3 rounded-2xl border text-xs font-semibold text-left transition ${
                category === c.id
                  ? "accent-gradient-bg text-white border-transparent shadow"
                  : dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-900/5"
              }`}
            >
              <span className="text-base block mb-1">{CATEGORY_ICONS[i % CATEGORY_ICONS.length]}</span>
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Your suggestion
          </div>
          <textarea
            rows={5}
            maxLength={SUGGESTION_MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your idea, feedback, or concern…"
            className={`w-full px-4 py-3 rounded-2xl border text-sm transition accent-ring ${
              dark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <div className="flex items-center justify-between mt-2 mb-5">
            <span className={`text-[11px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
              <MessageSquareHeart size={12} className="inline mr-1" />
              Anonymous — zero user linkage
            </span>
            <span className={`text-[11px] font-mono ${remaining < 50 ? "text-amber-500" : dark ? "text-slate-500" : "text-slate-400"}`}>
              {remaining} characters left
            </span>
          </div>
          <PrimaryButton type="submit" disabled={!text.trim()} className="w-full flex items-center justify-center gap-2">
            <Send size={15} /> {sent ? "Sent ✓ — thank you!" : "Submit Anonymously"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
