package com.cafeluxe.app.ui.tables

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cafeluxe.app.data.TableModel
import com.cafeluxe.app.databinding.ItemTableAdminBinding

class TableAdapter(
    private var items: List<TableModel>,
    private val onEdit: (TableModel) -> Unit,
    private val onDelete: (String) -> Unit
) : RecyclerView.Adapter<TableAdapter.TableViewHolder>() {

    class TableViewHolder(val binding: ItemTableAdminBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TableViewHolder {
        val binding = ItemTableAdminBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return TableViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TableViewHolder, position: Int) {
        val item = items[position]
        with(holder.binding) {
            tvName.text = item.name
            tvCode.text = "Code: \${item.tableCode}"
            tvStatus.text = if (item.isActive) "Active" else "Inactive"
            tvStatus.setTextColor(if (item.isActive) 0xFF4CAF50.toInt() else 0xFFF44336.toInt())

            ivEdit.setOnClickListener { onEdit(item) }
            ivDelete.setOnClickListener { onDelete(item.id) }
        }
    }

    override fun getItemCount() = items.size

    fun updateItems(newItems: List<TableModel>) {
        items = newItems
        notifyDataSetChanged()
    }
}
