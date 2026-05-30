package com.example

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "transactions")
data class CashTransaction(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val amount: Double,
    val type: String, // "ADD" or "WITHDRAW"
    val timestamp: Long = System.currentTimeMillis()
)

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY timestamp DESC")
    fun getAllTransactions(): Flow<List<CashTransaction>>

    @Insert
    suspend fun insertTransaction(transaction: CashTransaction)

    @Query("SELECT SUM(CASE WHEN type = 'ADD' THEN amount ELSE -amount END) FROM transactions")
    fun getBalance(): Flow<Double?>
}
