class Conversation < ApplicationRecord
  belongs_to :workspace
  belongs_to :project, optional: true
  belongs_to :user
  has_many :messages, class_name: "ConversationMessage", dependent: :destroy

  validates :title, presence: true

  scope :recent, -> { order(updated_at: :desc) }
end
