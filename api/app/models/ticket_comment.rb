class TicketComment < ApplicationRecord
  belongs_to :ticket
  belongs_to :workspace
  belongs_to :author, class_name: "User", foreign_key: :author_id, primary_key: :id

  validates :body, presence: true, length: { maximum: 10_000 }

  scope :chronological, -> { order(:created_at) }
end
