package com.cafeluxe.app.ui.menu

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.cafeluxe.app.data.MenuItem
import com.cafeluxe.app.databinding.FragmentMenuBinding

class MenuFragment : Fragment() {

    private var _binding: FragmentMenuBinding? = null
    private val binding get() = _binding!!

    private val viewModel: MenuViewModel by viewModels()
    private lateinit var adapter: MenuAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMenuBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = MenuAdapter(emptyList(), 
            onEdit = { showEditDialog(it) },
            onDelete = { viewModel.deleteMenuItem(it) }
        )

        binding.rvMenuItems.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@MenuFragment.adapter
        }

        binding.fabAdd.setOnClickListener { showEditDialog(null) }

        viewModel.menuItems.observe(viewLifecycleOwner) { items ->
            adapter.updateItems(items)
        }

        viewModel.fetchMenuItems()
    }

    private fun showEditDialog(item: MenuItem?) {
        val dialogView = LayoutInflater.from(context).inflate(com.cafeluxe.app.R.layout.dialog_edit_menu_item, null)
        val etName = dialogView.findViewById<EditText>(com.cafeluxe.app.R.id.etItemName)
        val etPrice = dialogView.findViewById<EditText>(com.cafeluxe.app.R.id.etItemPrice)
        val etCategory = dialogView.findViewById<EditText>(com.cafeluxe.app.R.id.etItemCategory)

        item?.let {
            etName.setText(it.name)
            etPrice.setText(it.price.toString())
            etCategory.setText(it.categoryId)
        }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Add Item" else "Edit Item")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val newItem = MenuItem(
                    id = item?.id ?: "",
                    name = etName.text.toString(),
                    price = etPrice.text.toString().toDoubleOrNull() ?: 0.0,
                    categoryId = etCategory.text.toString()
                )
                viewModel.saveMenuItem(newItem)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
