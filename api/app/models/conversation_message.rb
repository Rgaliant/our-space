class ConversationMessage < ApplicationRecord
  ROLES = %w[user assistant].freeze

  belongs_to :conversation

  validates :role, inclusion: { in: ROLES }
  validates :content, presence: true

  scope :chronological, -> { order(:created_at) }
end
