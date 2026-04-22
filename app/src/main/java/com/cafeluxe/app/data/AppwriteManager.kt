package com.cafeluxe.app.data

import android.content.Context
import io.appwrite.Client
import io.appwrite.services.Account
import io.appwrite.services.Databases

object AppwriteManager {
    private lateinit var client: Client
    lateinit var account: Account
    lateinit var databases: Databases

    const val DATABASE_ID = "trustfirst-main-db"
    const val ORDERS_COLLECTION_ID = "orders"

    fun init(context: Context) {
        client = Client(context)
            .setEndpoint("https://sgp.cloud.appwrite.io/v1")
            .setProject("trustfirst-core")
            .setSelfSigned(true)

        account = Account(client)
        databases = Databases(client)
    }
}
