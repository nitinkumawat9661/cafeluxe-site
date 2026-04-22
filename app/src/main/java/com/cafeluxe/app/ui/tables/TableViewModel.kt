package com.cafeluxe.app.ui.tables

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cafeluxe.app.data.AppwriteManager
import com.cafeluxe.app.data.TableModel
import io.appwrite.ID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TableViewModel : ViewModel() {

    private val _tables = MutableLiveData<List<TableModel>>()
    val tables: LiveData<List<TableModel>> = _tables

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun fetchTables() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    AppwriteManager.databases.listDocuments(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "tables"
                    )
                }
                
                val items = response.documents.map { doc ->
                    TableModel(
                        id = doc.id,
                        name = doc.data["name"].toString(),
                        tableCode = doc.data["tableCode"].toString(),
                        isActive = doc.data["isActive"] as? Boolean ?: true
                    )
                }
                _tables.value = items
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteTable(id: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    AppwriteManager.databases.deleteDocument(
                        databaseId = AppwriteManager.DATABASE_ID,
                        collectionId = "tables",
                        documentId = id
                    )
                }
                fetchTables()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun saveTable(table: TableModel) {
        viewModelScope.launch {
            try {
                val data = mapOf(
                    "name" to table.name,
                    "tableCode" to table.tableCode,
                    "isActive" to table.isActive
                )
                
                withContext(Dispatchers.IO) {
                    if (table.id.isEmpty()) {
                        AppwriteManager.databases.createDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "tables",
                            documentId = ID.unique(),
                            data = data
                        )
                    } else {
                        AppwriteManager.databases.updateDocument(
                            databaseId = AppwriteManager.DATABASE_ID,
                            collectionId = "tables",
                            documentId = table.id,
                            data = data
                        )
                    }
                }
                fetchTables()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
