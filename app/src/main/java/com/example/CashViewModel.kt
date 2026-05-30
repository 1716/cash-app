package com.example

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CashViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = AppDatabase.getDatabase(application).transactionDao()

    val balance: StateFlow<Double> = dao.getBalance()
        .map { it ?: 0.0 }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val transactions: StateFlow<List<CashTransaction>> = dao.getAllTransactions()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addMoney(amount: Double) {
        viewModelScope.launch {
            dao.insertTransaction(CashTransaction(amount = amount, type = "ADD"))
        }
    }

    fun withdraw(amount: Double) {
        viewModelScope.launch {
            if (balance.value >= amount) {
                dao.insertTransaction(CashTransaction(amount = amount, type = "WITHDRAW"))
            }
        }
    }
}
