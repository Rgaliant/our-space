class CreatePullRequests < ActiveRecord::Migration[8.0]
  def change
    create_table :pull_requests do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :workspace, null: false, foreign_key: true
      t.string :url, null: false
      t.string :title
      t.string :repo
      t.integer :pr_number
      t.string :status, null: false, default: "open"

      t.timestamps
    end

    add_index :pull_requests, [ :ticket_id, :pr_number, :repo ], unique: true, where: "pr_number IS NOT NULL AND repo IS NOT NULL"
  end
end
