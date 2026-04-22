package com.cafeluxe.app.ui.admin

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AdminViewModel : ViewModel() {

    private val _stats = MutableLiveData<AdminStats>()
    val stats: LiveData<AdminStats> = _stats

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    data class AdminStats(
        val categoryCount: Int = 0,
        val menuItemsCount: Int = 0,
        val tableCount: Int = 0,
        val pendingOrdersCount: Int = 0
    )

    fun fetchStats() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val stats = withContext(Dispatchers.IO) {
                    val categories = AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "categories"
                    )
                    val menuItems = AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "menu_items"
                    )
                    val tables = AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "tables"
                    )
                    val orders = AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "orders"
                    )

                    AdminStats(
                        categoryCount = categories.total.toInt(),
                        menuItemsCount = menuItems.total.toInt(),
                        tableCount = tables.total.toInt(),
                        pendingOrdersCount = orders.documents.count { it.data["status"] == "pending" }
                    )
                }
                _stats.value = stats
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }
}
