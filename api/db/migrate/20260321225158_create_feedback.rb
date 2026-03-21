class CreateFeedback < ActiveRecord::Migration[8.0]
  def change
    create_table :feedback do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, foreign_key: true
      t.string :source
      t.text :content, null: false
      t.string :sentiment
      t.string :customer_identifier
      t.text :linked_ticket_ids, array: true, default: []
      t.jsonb :metadata, default: {}
      t.timestamps
    end
  end
end
