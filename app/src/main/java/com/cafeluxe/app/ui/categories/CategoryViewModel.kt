package com.cafeluxe.app.ui.categories

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.data.Category
import io.appwrite.ID
import io.appwrite.Query
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CategoryViewModel : ViewModel() {

    private val _categories = MutableLiveData<List<Category>>()
    val categories: LiveData<List<Category>> = _categories

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun fetchCategories() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "categories",
                        queries = listOf(Query.orderAsc("order"))
                    )
                }
                
                val items = response.documents.map { doc ->
                    Category(
                        id = doc.id,
                        name = doc.data["name"].toString(),
                        order = (doc.data["order"] as? Number)?.toInt() ?: 0,
                        isActive = doc.data["isActive"] as? Boolean ?: true
                    )
                }
                _categories.value = items
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteCategory(id: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    AppwriteManager.databases.deleteDocument(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "categories",
                        documentId = id
                    )
                }
                fetchCategories()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun saveCategory(category: Category) {
        viewModelScope.launch {
            try {
                val data = mapOf(
                    "name" to category.name,
                    "order" to category.order,
                    "isActive" to category.isActive
                )
                
                withContext(Dispatchers.IO) {
                    if (category.id.isEmpty()) {
                        AppwriteManager.databases.createDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "categories",
                            documentId = ID.unique(),
                            data = data
                        )
                    } else {
                        AppwriteManager.databases.updateDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "categories",
                            documentId = category.id,
                            data = data
                        )
                    }
                }
                fetchCategories()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
