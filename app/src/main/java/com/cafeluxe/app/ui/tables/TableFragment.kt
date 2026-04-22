package com.cafeluxe.app.ui.tables

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
import com.cafeluxe.app.data.TableModel
import com.cafeluxe.app.databinding.FragmentTablesBinding

class TableFragment : Fragment() {

    private var _binding: FragmentTablesBinding? = null
    private val binding get() = _binding!!

    private val viewModel: TableViewModel by viewModels()
    private lateinit var adapter: TableAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTablesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = TableAdapter(emptyList(), 
            onEdit = { showEditDialog(it) },
            onDelete = { viewModel.deleteTable(it) }
        )

        binding.rvTables.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@TableFragment.adapter
        }

        binding.fabAdd.setOnClickListener { showEditDialog(null) }

        viewModel.tables.observe(viewLifecycleOwner) { items ->
            adapter.updateItems(items)
        }

        viewModel.fetchTables()
    }

    private fun showEditDialog(item: TableModel?) {
        val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_edit_table, null)
        val etName = dialogView.findViewById<EditText>(R.id.etTableName)
        val etCode = dialogView.findViewById<EditText>(R.id.etTableCode)
        val cbIsActive = dialogView.findViewById<CheckBox>(R.id.cbIsActive)

        item?.let {
            etName.setText(it.name)
            etCode.setText(it.tableCode)
            cbIsActive.isChecked = it.isActive
        }

        AlertDialog.Builder(requireContext())
            .setTitle(if (item == null) "Add Table" else "Edit Table")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val newItem = TableModel(
                    id = item?.id ?: "",
                    name = etName.text.toString(),
                    tableCode = etCode.text.toString(),
                    isActive = cbIsActive.isChecked
                )
                viewModel.saveTable(newItem)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
