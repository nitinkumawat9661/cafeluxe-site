package com.cafeluxe.app.ui.categories

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.cafeluxe.app.R
import com.cafeluxe.app.data.Category
import com.cafeluxe.app.databinding.FragmentCategoriesBinding

class CategoryFragment : Fragment() {

    private var _binding: FragmentCategoriesBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CategoryViewModel by viewModels()
    private lateinit var adapter: CategoryAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCategoriesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = CategoryAdapter(emptyList(), 
            onEdit = { showEditDialog(it) },
            onDelete = { viewModel.deleteCategory(it) }
        )

        binding.rvCategories.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@CategoryFragment.adapter
        }

        binding.fabAdd.setOnClickListener { showEditDialog(null) }

        viewModel.categories.observe(viewLifecycleOwner) { items ->
            adapter.updateItems(items)
        }

        viewModel.fetchCategories()
    }

    private fun showEditDialog(item: Category?) {
        val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_edit_category, null)
        val etName = dialogView.findViewById<EditText>(R.id.etCategoryName)
        val etOrder = dialogView.findViewById<EditText>(R.id.etCategoryOrder)
        val cbIsActive = dialogView.findViewById<CheckBox>(R.id.cbIsActive)

        item?.let {
            etName.setText(it.name)
            etOrder.setText(it.order.toString())
            cbIsActive.isChecked = it.isActive
        }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Add Category" else "Edit Category")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val newItem = Category(
                    id = item?.id ?: "",
                    name = etName.text.toString(),
                    order = etOrder.text.toString().toIntOrNull() ?: 0,
                    isActive = cbIsActive.isChecked
                )
                viewModel.saveCategory(newItem)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
