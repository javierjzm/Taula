import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Star, Send, Loader2, MessageCircle } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  createdAt: string;
  user: { name: string | null; avatar: string | null; email: string };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200',
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onReply,
}: {
  review: Review;
  onReply: (id: string, text: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.ownerReply ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSend() {
    if (!replyText.trim()) return;
    setSaving(true);
    await onReply(review.id, replyText.trim());
    setSaving(false);
    setReplying(false);
  }

  const userName = review.user.name || review.user.email;

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.user.avatar ? (
            <img
              src={review.user.avatar}
              alt={userName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-taula-primary/10 text-taula-primary font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-400">
              {format(new Date(review.createdAt), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
      )}

      {review.ownerReply && !replying && (
        <div className="ml-4 rounded-lg border-l-2 border-taula-primary bg-taula-primary/5 px-4 py-3">
          <p className="text-xs font-semibold text-taula-primary mb-1">La teva resposta</p>
          <p className="text-sm text-gray-700">{review.ownerReply}</p>
        </div>
      )}

      {replying ? (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escriu la teva resposta..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none resize-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReplying(false)}
              className="rounded-lg border px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel·lar
            </button>
            <button
              onClick={handleSend}
              disabled={saving || !replyText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-taula-primary px-4 py-2 text-xs font-semibold text-white hover:bg-taula-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setReplying(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-taula-primary hover:underline"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {review.ownerReply ? 'Editar resposta' : 'Respondre'}
        </button>
      )}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/reviews');
        setReviews(res.data.data ?? []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleReply(id: string, text: string) {
    try {
      await api.post(`/reviews/${id}/reply`, { reply: text });
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ownerReply: text } : r)),
      );
    } catch (err) {
      console.error('Error replying to review', err);
    }
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ressenyes</h1>
          <p className="text-sm text-gray-500">
            Gestiona les ressenyes dels teus clients
          </p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
              <Stars rating={Math.round(avgRating)} />
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <p className="text-sm text-gray-500">{reviews.length} ressenyes</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-taula-primary border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl bg-white border shadow-sm py-16 text-center">
          <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-400">Encara no tens ressenyes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onReply={handleReply} />
          ))}
        </div>
      )}
    </div>
  );
}
