package com.cafeluxe.app.ui.payments

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.data.Order
import io.appwrite.Query
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PaymentsViewModel : ViewModel() {

    private val _pendingPayments = MutableLiveData<List<Order>>()
    val pendingPayments: LiveData<List<Order>> = _pendingPayments

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun fetchPendingPayments() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = AppwriteManager.ORDERS_COLLECTION_ID,
                        queries = listOf(
                            Query.notEqual("paymentStatus", "paid"),
                            Query.orderDesc("\$createdAt")
                        )
                    )
                }
                
                val orderList = response.documents.map { doc ->
                    Order(
                        id = doc.id,
                        tableNumber = (doc.data["tableNumber"] ?: "N/A").toString(),
                        orderNumber = (doc.data["orderNumber"] ?: "").toString(),
                        items = (doc.data["summary"] ?: "No items").toString(),
                        instructions = (doc.data["notes"] ?: "").toString(),
                        paymentStatus = (doc.data["paymentStatus"] ?: "unpaid").toString(),
                        status = (doc.data["status"] ?: "pending").toString()
                    )
                }
                _pendingPayments.value = orderList
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun confirmPayment(orderId: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    AppwriteManager.databases.updateDocument(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = AppwriteManager.ORDERS_COLLECTION_ID,
                        documentId = orderId,
                        data = mapOf("paymentStatus" to "paid")
                    )
                }
                fetchPendingPayments()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
