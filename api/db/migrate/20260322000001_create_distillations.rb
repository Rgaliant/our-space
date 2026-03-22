class CreateDistillations < ActiveRecord::Migration[8.0]
  def change
    create_table :distillations do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :created_by_id, null: false
      t.text :north_star, null: false
      t.text :plan_content
      t.jsonb :proposed_tickets, default: []
      t.integer :misaligned_ticket_ids, array: true, default: []
      t.string :status, default: "generating", null: false
      t.timestamps
    end

    add_foreign_key :distillations, :users, column: :created_by_id, primary_key: :id
    add_index :distillations, :created_by_id
    add_index :distillations, [ :workspace_id, :created_at ]
  end
end
