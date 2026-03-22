class CreateCycles < ActiveRecord::Migration[8.0]
  def change
    create_table :cycles do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.string :created_by_id, null: false
      t.string :name, null: false
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.string :status, null: false, default: "upcoming"
      t.timestamps
    end

    add_foreign_key :cycles, :users, column: :created_by_id, primary_key: :id
    add_index :cycles, :created_by_id
    add_index :cycles, [ :project_id, :status ]
    add_index :cycles, [ :project_id, :start_date ]
  end
end
