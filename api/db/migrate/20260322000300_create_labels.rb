class CreateLabels < ActiveRecord::Migration[8.0]
  def change
    create_table :labels do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.string :color, null: false, default: "#6B7280"
      t.timestamps
    end

    add_index :labels, [ :workspace_id, :name ], unique: true
  end
end
