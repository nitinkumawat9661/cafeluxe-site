package com.cafeluxe.app.ui.payments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.cafeluxe.app.databinding.FragmentPaymentsBinding

class PaymentsFragment : Fragment() {

    private var _binding: FragmentPaymentsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: PaymentsViewModel by viewModels()
    private lateinit var adapter: PaymentAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPaymentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = PaymentAdapter(emptyList()) { orderId ->
            viewModel.confirmPayment(orderId)
        }

        binding.rvPayments.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@PaymentsFragment.adapter
        }

        viewModel.pendingPayments.observe(viewLifecycleOwner) { payments ->
            adapter.updatePayments(payments)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.loading.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.fetchPendingPayments()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
