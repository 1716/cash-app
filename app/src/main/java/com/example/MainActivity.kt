package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.theme.CashBlack
import com.example.ui.theme.CashGreen
import com.example.ui.theme.CashTextSecondary
import com.example.ui.theme.MyApplicationTheme
import java.text.NumberFormat
import java.util.Locale
import java.text.SimpleDateFormat
import java.util.Date

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    var crashLog by mutableStateOf<String?>(null)
    Thread.setDefaultUncaughtExceptionHandler { _, e ->
        val stackTrace = android.util.Log.getStackTraceString(e)
        runOnUiThread {
            crashLog = stackTrace
        }
    }

    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        if (crashLog != null) {
            Surface(modifier = Modifier.fillMaxSize()) {
                LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    item {
                        Text("CRASH:", color = Color.Red, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                        Text(crashLog ?: "", color = Color.Red, fontSize = 12.sp)
                    }
                }
            }
        } else {
            CashAppScreen()
        }
      }
    }
  }
}

@Composable
fun CashAppScreen(viewModel: CashViewModel = viewModel()) {
    var activeTab by remember { mutableStateOf("home") }
    val balance by viewModel.balance.collectAsStateWithLifecycle()
    val transactions by viewModel.transactions.collectAsStateWithLifecycle()
    
    val format = NumberFormat.getCurrencyInstance(Locale.US)
    val formattedBalance = format.format(balance)

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { CashAppBottomBar(activeTab) { activeTab = it } }
    ) { innerPadding ->
        when (activeTab) {
            "home" -> HomeContent(innerPadding, formattedBalance, onAddMoney = { viewModel.addMoney(50.0) }, onWithdraw = { viewModel.withdraw(50.0) })
            "activity" -> ActivityContent(innerPadding, transactions)
            else -> PlaceholderContent(innerPadding, activeTab)
        }
    }
}

@Composable
fun HomeContent(innerPadding: PaddingValues, formattedBalance: String, onAddMoney: () -> Unit, onWithdraw: () -> Unit) {
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        CashAppTopBar()
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Balance Section
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Cash Balance",
                color = CashTextSecondary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = formattedBalance,
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 64.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-1).sp,
                modifier = Modifier.padding(vertical = 8.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Action Buttons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Button(
                onClick = onAddMoney,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onBackground
                )
            ) {
                Text("Add money", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
            
            Button(
                onClick = onWithdraw,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onBackground
                )
            ) {
                Text("Withdraw", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        // Account details section
        SectionHeader("Account details")
        ListCard {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("ROUTING NUMBER", fontSize = 12.sp, color = CashTextSecondary)
                    Text("041 215 663", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("ACCOUNT NUMBER", fontSize = 12.sp, color = CashTextSecondary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("●● ●●● ●●●● 5782", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Show", color = CashGreen, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Direct deposit section
        SectionHeader("Direct deposit")
        ListCard {
            Column(modifier = Modifier.padding(16.dp)) {
                BenefitItem("Paychecks up to 2 days early")
                BenefitItem("Free withdrawals at in-network ATMs*")
                BenefitItem("Free overdraft coverage*")
                BenefitItem("3.25% interest on savings*")
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = { },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(25.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CashGreen,
                        contentColor = CashBlack
                    )
                ) {
                    Text("Set up direct deposit", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Text(
            text = "* When you direct deposit $300+ each month",
            fontSize = 12.sp,
            color = CashTextSecondary,
            modifier = Modifier.padding(horizontal = 24.dp)
        )
        
        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun PlaceholderContent(innerPadding: PaddingValues, tabName: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding),
        contentAlignment = Alignment.Center
    ) {
        Text("Coming Soon: $tabName", fontSize = 24.sp, color = CashTextSecondary)
    }
}

@Composable
fun ActivityContent(innerPadding: PaddingValues, transactions: List<CashTransaction>) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
    ) {
        Text(
            text = "Activity",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 24.dp, top = 24.dp, bottom = 16.dp)
        )

        if (transactions.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No recent activity", color = CashTextSecondary)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(transactions) { tx ->
                    val format = NumberFormat.getCurrencyInstance(Locale.US)
                    val df = SimpleDateFormat("MMM dd, yyyy", Locale.US)
                    val sign = if (tx.type == "SUMMARY") "" else if (tx.type == "WITHDRAW") "-" else "+"
                    val color = if (tx.type == "WITHDRAW") MaterialTheme.colorScheme.onBackground else CashGreen
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { }
                            .padding(horizontal = 24.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(if (tx.type == "WITHDRAW") "💸" else "🏦", fontSize = 24.sp)
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (tx.type == "WITHDRAW") "Cashed Out" else "Added Cash",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Text(
                                text = df.format(Date(tx.timestamp)),
                                fontSize = 14.sp,
                                color = CashTextSecondary
                            )
                        }
                        Text(
                            text = "$sign${format.format(tx.amount)}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = color
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BenefitItem(text: String) {
    Row(
        modifier = Modifier.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.History, 
            contentDescription = null,
            tint = CashGreen,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(text = text, fontSize = 15.sp, color = MaterialTheme.colorScheme.onBackground)
    }
}

@Composable
fun CashAppTopBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.QrCode,
            contentDescription = "Scan",
            tint = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.size(28.dp)
        )
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(CashGreen),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.AccountCircle,
                contentDescription = "Profile",
                tint = CashBlack,
                modifier = Modifier.size(36.dp)
            )
        }
    }
}

@Composable
fun CashAppBottomBar(activeTab: String = "home", onTabSelected: (String) -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { onTabSelected("home") }) {
                Icon(
                    imageVector = Icons.Default.AccountBalance,
                    contentDescription = "Money",
                    tint = if (activeTab == "home") CashGreen else CashTextSecondary,
                    modifier = Modifier.size(30.dp)
                )
            }
            IconButton(onClick = { onTabSelected("card") }) {
                Icon(
                    imageVector = Icons.Default.CreditCard,
                    contentDescription = "Card",
                    tint = if (activeTab == "card") CashGreen else CashTextSecondary,
                    modifier = Modifier.size(30.dp)
                )
            }
            IconButton(onClick = { onTabSelected("search") }) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = if (activeTab == "search") CashGreen else CashTextSecondary,
                    modifier = Modifier.size(30.dp)
                )
            }
            IconButton(onClick = { onTabSelected("activity") }) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = "Activity",
                    tint = if (activeTab == "activity") CashGreen else CashTextSecondary,
                    modifier = Modifier.size(30.dp)
                )
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 18.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onBackground,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
    )
}

@Composable
fun ListCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .clip(RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        content()
    }
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
  MyApplicationTheme {
    CashAppScreen()
  }
}
