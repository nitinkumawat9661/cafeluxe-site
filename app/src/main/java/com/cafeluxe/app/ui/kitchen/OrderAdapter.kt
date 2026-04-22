package com.cafeluxe.app.ui.kitchen

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cafeluxe.app.data.Order
import com.cafeluxe.app.databinding.ItemOrderBinding

class OrderAdapter(
    private var orders: List<Order>,
    private val onStatusUpdate: (Order, String) -> Unit
) : RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    class OrderViewHolder(val binding: ItemOrderBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        val order = orders[position]
        with(holder.binding) {
            tvTableNumber.text = "Table ${order.tableNumber} (Order #${order.orderNumber})"
            tvItems.text = order.items
            tvInstructions.text = if (order.instructions.isEmpty()) "No instructions" else order.instructions
            
            // Show status and payment
            btnPending.alpha = if (order.status == "pending") 1.0f else 0.5f
            btnPreparing.alpha = if (order.status == "preparing") 1.0f else 0.5f
            btnReady.alpha = if (order.status == "ready") 1.0f else 0.5f
            btnServed.alpha = if (order.status == "served") 1.0f else 0.5f

            btnPending.setOnClickListener { onStatusUpdate(order, "pending") }
            btnPreparing.setOnClickListener { onStatusUpdate(order, "preparing") }
            btnReady.setOnClickListener { onStatusUpdate(order, "ready") }
            btnServed.setOnClickListener { onStatusUpdate(order, "served") }
        }
    }

    override fun getItemCount() = orders.size

    fun updateOrders(newOrders: List<Order>) {
        orders = newOrders
        notifyDataSetChanged()
    }
}
