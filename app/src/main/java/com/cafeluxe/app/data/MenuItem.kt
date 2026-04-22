package com.cafeluxe.app.data

data class MenuItem(
    val id: String = "",
    val name: String = "",
    val categoryId: String = "",
    val categoryName: String = "",
    val price: Double = 0.0,
    val isActive: Boolean = true
)
