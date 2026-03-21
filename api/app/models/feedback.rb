class Feedback < ApplicationRecord
  belongs_to :workspace
  belongs_to :project, optional: true

  validates :content, presence: true

  scope :recent,   -> { order(created_at: :desc) }
  scope :positive, -> { where(sentiment: "positive") }
  scope :negative, -> { where(sentiment: "negative") }
end
