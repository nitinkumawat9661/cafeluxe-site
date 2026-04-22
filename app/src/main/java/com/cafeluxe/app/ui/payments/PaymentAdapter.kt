package com.cafeluxe.app.ui.payments

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cafeluxe.app.data.Order
import com.cafeluxe.app.databinding.ItemPaymentBinding

class PaymentAdapter(
    private var payments: List<Order>,
    private val onConfirm: (String) -> Unit
) : RecyclerView.Adapter<PaymentAdapter.PaymentViewHolder>() {

    class PaymentViewHolder(val binding: ItemPaymentBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PaymentViewHolder {
        val binding = ItemPaymentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return PaymentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PaymentViewHolder, position: Int) {
        val payment = payments[position]
        with(holder.binding) {
            tvOrderInfo.text = "Table #${payment.tableNumber} (Order #${payment.orderNumber})"
            tvAmount.text = "Status: ${payment.paymentStatus.uppercase()}"
            tvPaymentMethod.text = "Items: ${payment.items}"
            tvStatus.text = "Kitchen Status: ${payment.status.uppercase()}"
            
            btnConfirmPayment.setOnClickListener {
                onConfirm(payment.id)
            }
        }
    }

    override fun getItemCount() = payments.size

    fun updatePayments(newPayments: List<Order>) {
        payments = newPayments
        notifyDataSetChanged()
    }
}
