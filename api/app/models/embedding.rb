class Embedding < ApplicationRecord
  belongs_to :workspace

  has_neighbors :embedding, dimensions: 1024

  validates :source_type,  presence: true
  validates :source_id,    presence: true
  validates :content,      presence: true
  validates :chunk_index,  numericality: { greater_than_or_equal_to: 0 }

  scope :for_workspace,    ->(workspace_id) { where(workspace_id: workspace_id) }
  scope :for_source_type,  ->(type) { where(source_type: type) }

  def self.similar_to(vector, limit: 10)
    nearest_neighbors(:embedding, vector, distance: "cosine").limit(limit)
  end
end
