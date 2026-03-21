class CreateTickets < ActiveRecord::Migration[8.0]
  def change
    create_table :tickets do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.references :spec, foreign_key: true
      t.references :assignee, foreign_key: { to_table: :users, primary_key: :id }, type: :string
      t.references :created_by, null: false, foreign_key: { to_table: :users, primary_key: :id }, type: :string
      t.string :title, null: false
      t.text :description
      t.string :status, null: false, default: "backlog"
      t.string :priority, null: false, default: "medium"
      t.float :priority_score
      t.integer :story_points
      t.integer :position, null: false, default: 0
      t.timestamps
    end
  end
end
