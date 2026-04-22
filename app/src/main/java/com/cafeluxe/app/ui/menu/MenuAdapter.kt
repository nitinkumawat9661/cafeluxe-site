package com.cafeluxe.app.ui.menu

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cafeluxe.app.data.MenuItem
import com.cafeluxe.app.databinding.ItemMenuAdminBinding

class MenuAdapter(
    private var items: List<MenuItem>,
    private val onEdit: (MenuItem) -> Unit,
    private val onDelete: (String) -> Unit
) : RecyclerView.Adapter<MenuAdapter.MenuViewHolder>() {

    class MenuViewHolder(val binding: ItemMenuAdminBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MenuViewHolder {
        val binding = ItemMenuAdminBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return MenuViewHolder(binding)
    }

    override fun onBindViewHolder(holder: MenuViewHolder, position: Int) {
        val item = items[position]
        with(holder.binding) {
            tvName.text = item.name
            tvCategory.text = "Category ID: ${item.categoryId}"
            tvPrice.text = "$\${String.format(\"%.2f\", item.price)}"
            tvStatus.text = if (item.isActive) "Active" else "Inactive"
            tvStatus.setTextColor(if (item.isActive) 0xFF4CAF50.toInt() else 0xFFF44336.toInt())

            ivEdit.setOnClickListener { onEdit(item) }
            ivDelete.setOnClickListener { onDelete(item.id) }
        }
    }

    override fun getItemCount() = items.size

    fun updateItems(newItems: List<MenuItem>) {
        items = newItems
        notifyDataSetChanged()
    }
}
