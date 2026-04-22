package com.cafeluxe.app.ui.categories

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cafeluxe.app.data.Category
import com.cafeluxe.app.databinding.ItemCategoryAdminBinding

class CategoryAdapter(
    private var items: List<Category>,
    private val onEdit: (Category) -> Unit,
    private val onDelete: (String) -> Unit
) : RecyclerView.Adapter<CategoryAdapter.CategoryViewHolder>() {

    class CategoryViewHolder(val binding: ItemCategoryAdminBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CategoryViewHolder {
        val binding = ItemCategoryAdminBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CategoryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CategoryViewHolder, position: Int) {
        val item = items[position]
        with(holder.binding) {
            tvName.text = item.name
            tvOrder.text = "Display Order: \${item.order}"
            tvStatus.text = if (item.isActive) "Active" else "Inactive"
            tvStatus.setTextColor(if (item.isActive) 0xFF4CAF50.toInt() else 0xFFF44336.toInt())

            ivEdit.setOnClickListener { onEdit(item) }
            ivDelete.setOnClickListener { onDelete(item.id) }
        }
    }

    override fun getItemCount() = items.size

    fun updateItems(newItems: List<Category>) {
        items = newItems
        notifyDataSetChanged()
    }
}
