package com.cafeluxe.app.ui.menu

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.data.MenuItem
import io.appwrite.ID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MenuViewModel : ViewModel() {

    private val _menuItems = MutableLiveData<List<MenuItem>>()
    val menuItems: LiveData<List<MenuItem>> = _menuItems

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun fetchMenuItems() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "menu_items"
                    )
                }
                
                val items = response.documents.map { doc ->
                    MenuItem(
                        id = doc.id,
                        name = doc.data["name"].toString(),
                        categoryId = doc.data["categoryId"].toString(),
                        price = (doc.data["price"] as? Number)?.toDouble() ?: 0.0,
                        isActive = doc.data["isActive"] as? Boolean ?: true
                    )
                }
                _menuItems.value = items
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteMenuItem(id: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    AppwriteManager.databases.deleteDocument(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "menu_items",
                        documentId = id
                    )
                }
                fetchMenuItems()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun saveMenuItem(item: MenuItem) {
        viewModelScope.launch {
            try {
                val data = mapOf(
                    "name" to item.name,
                    "categoryId" to item.categoryId,
                    "price" to item.price,
                    "isActive" to item.isActive
                )
                
                withContext(Dispatchers.IO) {
                    if (item.id.isEmpty()) {
                        AppwriteManager.databases.createDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "menu_items",
                            documentId = ID.unique(),
                            data = data
                        )
                    } else {
                        AppwriteManager.databases.updateDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "menu_items",
                            documentId = item.id,
                            data = data
                        )
                    }
                }
                fetchMenuItems()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
