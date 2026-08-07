export interface CustomerFeedback {
  id: string;
  order_id: string | null;
  table_number: number | null;
  rating: number;
  tags: string[];
  note: string | null;
  created_at: string;
}

export interface FeedbackSummaryMetrics {
  avgRating: number;
  totalFeedbacks: number;
  ratingCounts: { [key: number]: number };
  topTags: { tag: string; count: number }[];
}
