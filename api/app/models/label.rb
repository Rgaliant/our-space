class Label < ApplicationRecord
  belongs_to :workspace
  has_many :ticket_labels, dependent: :destroy
  has_many :tickets, through: :ticket_labels

  validates :name, presence: true, length: { maximum: 50 }
  validates :name, uniqueness: { scope: :workspace_id, case_sensitive: false }
  validates :color, presence: true,
            format: { with: /\A#[0-9A-Fa-f]{6}\z/, message: "must be a valid hex color" }

  scope :alphabetical, -> { order(:name) }
end
