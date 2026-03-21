class CreateEmbeddings < ActiveRecord::Migration[8.0]
  def change
    create_table :embeddings do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :source_type, null: false
      t.bigint :source_id, null: false
      t.integer :chunk_index, null: false, default: 0
      t.text :content, null: false
      t.vector :embedding, limit: 1024
      t.timestamps
    end

    add_index :embeddings, [ :workspace_id, :source_type ]
    add_index :embeddings, [ :source_type, :source_id ]
    execute "CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)"
  end
end
