class AddCycleToTickets < ActiveRecord::Migration[8.0]
  def change
    add_column :tickets, :cycle_id, :bigint, null: true
    add_foreign_key :tickets, :cycles
    add_index :tickets, :cycle_id
  end
end
