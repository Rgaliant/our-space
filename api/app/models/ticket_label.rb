class TicketLabel < ApplicationRecord
  belongs_to :ticket
  belongs_to :label
end
