package com.cafeluxe.app.ui.kitchen

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.data.Order
import io.appwrite.Query
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class KitchenViewModel : ViewModel() {

    private val _orders = MutableLiveData<List<Order>>()
    val orders: LiveData<List<Order>> = _orders

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    init {
        startPolling()
    }

    private fun startPolling() {
        viewModelScope.launch {
            while (true) {
                fetchOrders()
                delay(10000) // Poll every 10 seconds
            }
        }
    }

    fun fetchOrders() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = AppwriteManager.ORDERS_COLLECTION_ID,
                        queries = listOf(Query.orderDesc("\$createdAt"))
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
                _orders.value = orderList
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateOrderStatus(order: Order, newStatus: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    AppwriteManager.databases.updateDocument(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = AppwriteManager.ORDERS_COLLECTION_ID,
                        documentId = order.id,
                        data = mapOf("status" to newStatus)
                    )
                }
                fetchOrders() // Refresh list after update
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
