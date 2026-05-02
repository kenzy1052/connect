import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";
export default function AdminFaqTab() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("faq_questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching FAQ questions:", error);
      toast.error("Failed to load questions.");
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }

  async function handleAnswerQuestion(e) {
    e.preventDefault();
    if (!selectedQuestion || !answer.trim()) {
      toast.error("Please select a question and provide an answer.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("faq_questions")
      .update({ answer: answer.trim() })
      .eq("id", selectedQuestion.id);

    if (error) {
      toast.error("Failed to save answer.");
    } else {
      toast.success("Answer saved!");
      setAnswer("");
      setSelectedQuestion(null);
      fetchQuestions();
    }
    setSubmitting(false);
  }

  async function handleDeleteQuestion(id) {
    if (!window.confirm("Delete this question?")) return;

    const { error } = await supabase
      .from("faq_questions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete question.");
    } else {
      toast.success("Question deleted.");
      fetchQuestions();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Manage FAQ Questions</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Questions List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">
            Questions ({questions.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {questions.length === 0 ? (
              <p className="text-slate-500 text-sm">No questions yet.</p>
            ) : (
              questions.map((q) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedQuestion?.id === q.id
                      ? "bg-indigo-600/20 border-indigo-500"
                      : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                  }`}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setAnswer(q.answer || "");
                  }}
                >
                  <p className="text-sm font-bold text-white truncate">
                    {q.question}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {q.answer ? (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        ✓ Answered
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold">
                        ⚠ Pending
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(q.id);
                      }}
                      className="ml-auto text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Answer Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {selectedQuestion ? (
            <form onSubmit={handleAnswerQuestion} className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Question
                </p>
                <p className="text-white font-bold">
                  {selectedQuestion.question}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                  Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none min-h-[150px]"
                  placeholder="Type your answer here..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 w-full"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {submitting ? "Saving..." : "Save Answer"}
              </button>
            </form>
          ) : (
            <p className="text-slate-500 text-center py-12">
              Select a question to answer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
