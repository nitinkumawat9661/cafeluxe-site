package com.cafeluxe.app.data

data class Order(
    val id: String,
    val tableNumber: String,
    val orderNumber: String,
    val items: String,
    val instructions: String,
    val paymentStatus: String,
    val status: String
)
