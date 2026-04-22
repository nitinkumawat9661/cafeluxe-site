package com.cafeluxe.app.ui.login

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.cafeluxe.app.R
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.databinding.FragmentLoginBinding
import kotlinx.coroutines.*

class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnLogin.setOnClickListener {
            performLogin()
        }
    }

    private fun performLogin() {
        val email = binding.etEmail.text.toString()
        val password = binding.etPassword.text.toString()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(context, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }

        binding.loading.visibility = View.VISIBLE
        binding.btnLogin.isEnabled = false

        MainScope().launch {
            try {
                // In real app, we'd check roles. For now, simple routing logic based on email
                withContext(Dispatchers.IO) {
                    AppwriteManager.account.createEmailPasswordSession(email, password)
                }
                
                // Demo logic: email containing 'admin' goes to Admin, else Kitchen
                if (email.contains("admin")) {
                    findNavController().navigate(R.id.action_loginFragment_to_adminFragment)
                } else {
                    findNavController().navigate(R.id.action_loginFragment_to_kitchenFragment)
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Login failed: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.loading.visibility = View.GONE
                binding.btnLogin.isEnabled = true
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
