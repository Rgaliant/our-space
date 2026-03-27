class Workspace < ApplicationRecord
  PLANS = %w[free pro enterprise].freeze

  belongs_to :owner, class_name: "User"
  has_many :workspace_members, dependent: :destroy
  has_many :members, through: :workspace_members, source: :user
  has_many :projects, dependent: :destroy
  has_many :tickets, through: :projects
  has_many :specs, through: :projects
  has_many :conversations, dependent: :destroy
  has_many :feedback, class_name: "Feedback", dependent: :destroy
  has_many :embeddings, dependent: :destroy
  has_many :distillations, dependent: :destroy
  has_many :ticket_comments, dependent: :destroy
  has_many :cycles, dependent: :destroy
  has_many :labels, dependent: :destroy
  has_many :github_repositories, dependent: :destroy

  validates :name, presence: true, length: { maximum: 100 }
  validates :slug, presence: true, uniqueness: true,
                   format: { with: /\A[a-z0-9-]+\z/, message: "only lowercase letters, numbers, and hyphens" }
  validates :plan, inclusion: { in: PLANS }

  before_validation :generate_slug, on: :create

  scope :for_user, ->(user) { joins(:workspace_members).where(workspace_members: { user: user }) }

  private

  def generate_slug
    self.slug ||= name.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
  end
end
