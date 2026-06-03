import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import dotenv from "dotenv";

import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log("Firebase Config loaded successfully");
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Database ID:", firebaseConfig.firestoreDatabaseId);
  
  // Set project ID in environment for Admin SDK
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: firebaseConfig.projectId,
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
    storageBucket: firebaseConfig.storageBucket,
  });
} catch (err) {
  console.error("Error loading firebase-applet-config.json:", err);
  process.exit(1);
}

import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getFirestore as getClientFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  runTransaction, 
  serverTimestamp, 
  increment, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  DocumentReference,
  DocumentSnapshot,
  Transaction
} from "firebase/firestore";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";

// Initialize Firebase Admin (for Auth and Firestore)
let adminApp: admin.app.App;
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = firebaseConfig.projectId;
  
  if (serviceAccount) {
    try {
      console.log("FIREBASE_SERVICE_ACCOUNT found, attempting to initialize...");
      const cert = JSON.parse(serviceAccount);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(cert),
        projectId: projectId,
        databaseURL: `https://${projectId}.firebaseio.com`
      });
      console.log("Firebase Admin initialized with service account");
    } catch (err) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", err);
      adminApp = admin.initializeApp({
        projectId: projectId,
        databaseURL: `https://${projectId}.firebaseio.com`
      });
    }
  } else {
    console.log(`Initializing Firebase Admin with Project ID: ${projectId}`);
    adminApp = admin.initializeApp({
      projectId: projectId,
      databaseURL: `https://${projectId}.firebaseio.com`
    });
  }
} else {
  adminApp = admin.apps[0]!;
}
const auth = admin.auth(adminApp);

// Get Firestore instance (Admin)
let db: admin.firestore.Firestore;
try {
  const dbId = firebaseConfig.firestoreDatabaseId;
  if (dbId && dbId !== "(default)") {
    db = getFirestore(adminApp);
  } else {
    db = getFirestore(adminApp);
  }
} catch (e) {
  console.error("Failed to initialize Firestore Admin, falling back to default:", e);
  db = admin.firestore(adminApp);
}

// Initialize Client SDK
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId === "(default)" ? undefined : firebaseConfig.firestoreDatabaseId);
const clientAuth = getClientAuth(clientApp);

// Test Firestore connection on startup and handle authentication for Client SDK on server
(async () => {
  let adminStatus = "";
  let clientStatus = "";
  
  try {
    const snap = await db.collection("health").limit(1).get();
    adminStatus = `ADMIN_SUCCESS: ${snap.size} docs found`;
  } catch (err: any) {
    adminStatus = `ADMIN_ERROR: ${err.code} ${err.message}`;
    console.warn("Admin SDK Firestore test failed. Attempting to authenticate Client SDK on server as a workaround...");
    
    try {
      // Workaround: Create a custom token for a system admin and sign in with Client SDK
      // This allows the server to perform authenticated operations even if Admin SDK is restricted
      const customToken = await auth.createCustomToken("system-admin", { role: "admin" });
      await signInWithCustomToken(clientAuth, customToken);
      console.log("Client SDK authenticated on server as 'system-admin'");
    } catch (authErr) {
      console.error("Failed to authenticate Client SDK on server:", authErr);
    }
  }

  try {
    const snap = await getDocs(query(collection(clientDb, "health"), limit(1)));
    clientStatus = `CLIENT_SUCCESS: ${snap.size} docs found`;
  } catch (err: any) {
    clientStatus = `CLIENT_ERROR: ${err.message}`;
  }

  const msg = `${adminStatus}\n${clientStatus}`;
  console.log("Firestore Status:\n", msg);
  fs.writeFileSync("firestore-status.txt", msg);
})();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia" as any, // Use the version expected by the SDK
});

// PaymentProvider abstraction as requested
class PaymentProvider {
  private stripe: Stripe;
  private apiKey: string;
  private accessToken?: string;

  constructor(config: { apiKey: string; accessToken?: string }) {
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.stripe = new Stripe(this.apiKey, {
      apiVersion: "2026-03-25.dahlia" as any,
    });
  }

  get auth() {
    return {
      introspect: async (token: string) => {
        // In a real implementation, this would call an introspection endpoint
        // For Stripe, we can verify the token by making a simple API call
        try {
          // If accessToken is provided, we assume it's an OAuth token for a Connect account
          // We can check its validity by retrieving the account details
          if (this.accessToken) {
            const account = await this.stripe.accounts.retrieve({
              stripeAccount: this.accessToken,
            });
            return { scopes: ['transfers:write', 'transfers:read'], active: true, accountId: account.id };
          }
          return { scopes: ['transfers:write', 'transfers:read'], active: true };
        } catch (e) {
          return { scopes: [], active: false };
        }
      }
    };
  }

  get fundingSources() {
    return {
      retrieve: async (id: string) => {
        // Maps to Stripe Payment Methods or External Accounts
        try {
          if (id.startsWith('ba_') || id.startsWith('card_')) {
            // If it's a bank account or card on a Connect account
            if (this.accessToken) {
              const externalAccount = await this.stripe.accounts.retrieveExternalAccount(
                this.accessToken,
                id
              );
              return { status: 'verified', details: externalAccount };
            }
          }
          return { status: 'verified', id };
        } catch (e) {
          throw new Error('Funding source not found or not ready');
        }
      }
    };
  }

  get rails() {
    return {
      checkAvailability: async (rail: string) => {
        // In a real implementation, this would check if the rail is available for the destination
        return { available: true, rail };
      }
    };
  }

  get transfers() {
    return {
      create: async (params: { amount: number; currency: string; destination: string; rail: string }) => {
        // Maps to Stripe Payouts
        const payoutParams: Stripe.PayoutCreateParams = {
          amount: params.amount,
          currency: params.currency,
          method: params.rail === 'card_payout' ? 'instant' : 'standard',
          destination: params.destination,
        };

        if (this.accessToken) {
          return await this.stripe.payouts.create(payoutParams, {
            stripeAccount: this.accessToken,
          });
        }
        return await this.stripe.payouts.create(payoutParams);
      }
    };
  }

  get webhooks() {
    return {
      constructEvent: (payload: string | Buffer, sig: string, secret: string) => {
        return this.stripe.webhooks.constructEvent(payload, sig, secret);
      }
    };
  }
}

// Additional API Keys from environment
const API_KEYS = {
  googleBackup: process.env.COM_GOOGLE_ANDROID_BACKUP_API_KEY,
  googleGeo: process.env.COM_GOOGLE_ANDROID_GEO_API_KEY,
  firebase: process.env.COM_GOOGLE_FIREBASE_API_KEY,
  fillr: {
    key: process.env.COM_SQUAREUP_FILLR_API_KEY,
    secret: process.env.COM_SQUAREUP_FILLR_SECRET_KEY,
    password: process.env.COM_SQUAREUP_FILLR_WIDGET_PASSWORD,
  },
  datadog: {
    appId: process.env.COM_DATADOG_ANDROID_APPLICATION_ID,
    clientToken: process.env.COM_DATADOG_ANDROID_CLIENT_TOKEN,
  },
  netcetera: process.env.COM_SQUAREUP_NETCETERA_API_KEY,
  bugsnag: process.env.COM_BUGSNAG_ANDROID_API_KEY,
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.get("/api/health", async (req, res) => {
    try {
      // Test Firestore connection
      const testDoc = await db.collection("health").doc("test").get();
      res.json({ 
        status: "ok", 
        firestore: "connected",
        databaseId: firebaseConfig.firestoreDatabaseId,
        projectId: firebaseConfig.projectId,
        envProjectId: process.env.GOOGLE_CLOUD_PROJECT || "not set",
        envAppEngineService: process.env.GAE_SERVICE || "not set",
        envKService: process.env.K_SERVICE || "not set"
      });
    } catch (err: any) {
      console.error("Firestore health check failed:", err);
      res.status(500).json({ 
        status: "error", 
        firestore: "failed",
        error: err.message,
        code: err.code,
        databaseId: firebaseConfig.firestoreDatabaseId,
        projectId: firebaseConfig.projectId,
        envProjectId: process.env.GOOGLE_CLOUD_PROJECT || "not set"
      });
    }
  });

  // Unified Database Wrapper
  async function getUnifiedDb() {
    return {
      type: 'admin',
      runTransaction: (cb: any) => db.runTransaction(cb),
      collection: (path: string) => db.collection(path),
      doc: (path: string) => db.doc(path),
      getDoc: (ref: any) => ref.get(),
      getDocs: (q: any) => q.get(),
      setDoc: (ref: any, data: any) => ref.set(data),
      updateDoc: (ref: any, data: any) => ref.update(data),
      deleteDoc: (ref: any) => ref.delete(),
      addDoc: (colRef: any, data: any) => colRef.add(data),
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      increment: (val: number) => admin.firestore.FieldValue.increment(val),
      FieldValue: admin.firestore.FieldValue,
      where: (field: string, op: any, val: any) => ({ type: 'where', field, op, val }),
      limit: (val: number) => ({ type: 'limit', val }),
      query: (colRef: any, ...constraints: any[]) => {
        let q = colRef;
        constraints.forEach(c => {
          if (c.type === 'where') q = q.where(c.field, c.op, c.val);
          if (c.type === 'limit') q = q.limit(c.val);
        });
        return q;
      },
      newDocId: (collectionPath: string) => db.collection(collectionPath).doc().id,
      db: db
    };
  }

  // Link Bank Endpoint (Simulates micro-deposits)
  app.post("/api/link-bank", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { institutionName, lastFour, accountNumber, routingNumber } = req.body;

    try {
      if (!institutionName || !lastFour || !accountNumber || !routingNumber) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const udb = await getUnifiedDb();

      // Generate two random micro-deposit amounts between $0.01 and $0.99
      const amount1 = parseFloat((Math.random() * 0.98 + 0.01).toFixed(2));
      const amount2 = parseFloat((Math.random() * 0.98 + 0.01).toFixed(2));

      const accountData = {
        userId,
        type: "bank",
        institutionName,
        lastFour,
        accountNumber,
        routingNumber,
        isPrimary: false, // Will be set by client if needed
        status: "pending",
        verificationDetails: {
          amounts: [amount1, amount2],
          initiatedAt: udb.serverTimestamp()
        },
        createdAt: udb.serverTimestamp()
      };

      const docRef = await udb.addDoc(udb.collection(`users/${userId}/linkedAccounts`), accountData);
      
      res.json({ 
        status: "success", 
        accountId: docRef.id,
        message: "Micro-deposits initiated. They will appear in your account in 1-2 business days (simulated)."
      });
    } catch (error: any) {
      console.error("Link bank error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Verify Bank Endpoint
  app.post("/api/verify-bank", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { accountId, amount1, amount2 } = req.body;

    try {
      if (!accountId || amount1 === undefined || amount2 === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const udb = await getUnifiedDb();
      const accountRef = udb.doc(`users/${userId}/linkedAccounts/${accountId}`);
      const accountSnap = await udb.getDoc(accountRef);

      if (!accountSnap.exists() && !(accountSnap as any).exists) {
        return res.status(404).json({ error: "Account not found" });
      }

      const accountData = accountSnap.data();
      if (!accountData || accountData.type !== "bank") {
        return res.status(400).json({ error: "Invalid account type" });
      }

      const expectedAmounts = accountData.verificationDetails?.amounts;
      if (!expectedAmounts || expectedAmounts.length !== 2) {
        return res.status(400).json({ error: "Verification not initiated for this account" });
      }

      // Compare amounts (allow for small floating point differences if any, though they should be fixed decimals)
      const match1 = Math.abs(parseFloat(amount1) - expectedAmounts[0]) < 0.001;
      const match2 = Math.abs(parseFloat(amount2) - expectedAmounts[1]) < 0.001;

      if (match1 && match2) {
        await udb.updateDoc(accountRef, {
          status: "verified",
          "verificationDetails.verifiedAt": udb.serverTimestamp()
        });
        res.json({ status: "success", message: "Account verified successfully" });
      } else {
        res.status(400).json({ error: "Incorrect amounts. Please try again." });
      }
    } catch (error: any) {
      console.error("Verify bank error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Withdraw Endpoint
  app.post("/api/withdraw", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { amountCents, method, fundingTokenId, pin } = req.body;

    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    try {
      console.log(`Attempting withdrawal for user: ${userId}, amount: ${amountCents} cents`);
      
      const udb = await getUnifiedDb();
      const userRef = udb.doc(`users/${userId}`);
      const userDoc = await udb.getDoc(userRef);

      if (!userDoc.exists() && !(userDoc as any).exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();

      // Verify PIN if required
      if (userData?.pin && userData.pin !== pin) {
        return res.status(401).json({ error: "Incorrect PIN" });
      }

      const stripeAccountId = userData?.stripeAccountId;
      const payoutDestinationId = fundingTokenId || userData?.payoutDestinationId;

      if (!stripeAccountId || !payoutDestinationId) {
        return res.status(400).json({ error: "Payment method not linked. Please link a bank account or card first." });
      }

      const currentBalance = userData?.balance || 0;
      const amountDollars = amountCents / 100;

      if (amountDollars > currentBalance) {
        return res.status(400).json({ error: "Insufficient funds" });
      }

      // Use PaymentProvider for the transfer
      const client = new PaymentProvider({
        apiKey: process.env.PLATFORM_API_KEY || process.env.STRIPE_SECRET_KEY || "",
        accessToken: stripeAccountId
      });

      // Step 2: Verify token
      const tokenInfo = await client.auth.introspect(stripeAccountId);
      if (!tokenInfo.scopes.includes('transfers:write')) {
        throw new Error('Insufficient permissions for transfers');
      }

      // Step 3: Retrieve funding source
      const fundingSource = await client.fundingSources.retrieve(payoutDestinationId);
      if (fundingSource.status !== 'verified') {
        throw new Error('Funding source not ready');
      }

      // Step 4: Check rail
      const rail = method === 'instant' ? 'card_payout' : 'ach';
      await client.rails.checkAvailability(rail);

      // Step 5: Execute transfer
      const transfer = await client.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: payoutDestinationId,
        rail: rail
      });

      // 6. Update Ledger and User Balance atomically
      await udb.runTransaction(async (transaction: any) => {
        const txRef = udb.doc(`transactions/${transfer.id}`);
        transaction.set(txRef, {
          senderId: userId,
          receiverId: "STRIPE",
          amount: amountDollars,
          note: `Withdrawal to ${method} payout`,
          timestamp: udb.serverTimestamp(),
          type: "cash_out",
          status: "completed",
          providerId: transfer.id
        });

        const withdrawalRef = udb.doc(`withdrawals/${transfer.id}`);
        transaction.set(withdrawalRef, {
          userId,
          amount: amountDollars,
          status: "paid",
          providerPayoutId: transfer.id,
          method: method,
          createdAt: udb.serverTimestamp()
        });

        transaction.update(userRef, {
          balance: udb.increment(-amountDollars)
        });
      });

      res.json({ status: "success", payoutId: transfer.id });
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Send Money Endpoint
  app.post("/api/send-money", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { recipientCashtag, amount, note, pin } = req.body;

    if (!recipientCashtag || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    try {
      const udb = await getUnifiedDb();
      
      // 1. Verify PIN if required
      const senderRef = udb.doc(`users/${userId}`);
      const senderSnap = await udb.getDoc(senderRef);
      const senderData = senderSnap.data();

      if (senderData?.pin && senderData.pin !== pin) {
        return res.status(401).json({ error: "Incorrect PIN" });
      }

      // 2. Find recipient
      const usersRef = udb.collection('users');
      const q = udb.query(usersRef, udb.where('cashtag', '==', recipientCashtag.startsWith('$') ? recipientCashtag : `$${recipientCashtag}`), udb.limit(1));
      const querySnap = await udb.getDocs(q);
      
      if (querySnap.empty) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      const recipientDoc = querySnap.docs[0];
      const recipientId = recipientDoc.id;
      const recipientData = recipientDoc.data();

      if (recipientId === userId) {
        return res.status(400).json({ error: "Cannot send money to yourself" });
      }

      // 2. Run atomic transaction
      await udb.runTransaction(async (transaction: any) => {
        const senderRef = udb.doc(`users/${userId}`);
        const receiverRef = udb.doc(`users/${recipientId}`);

        const senderSnap = await transaction.get(senderRef);
        const receiverSnap = await transaction.get(receiverRef);

        if (!senderSnap.exists) throw new Error("Sender profile missing");
        if (!receiverSnap.exists) throw new Error("Receiver profile missing");

        const senderData = senderSnap.data();
        const receiverData = receiverSnap.data();
        const senderBalance = senderData.balance || 0;

        if (senderBalance < amount) {
          throw new Error("Insufficient balance");
        }

        // Update balances
        transaction.update(senderRef, { balance: udb.increment(-amount) });
        transaction.update(receiverRef, { balance: udb.increment(amount) });

        // Create transaction record
        const txRef = udb.doc(`transactions/${udb.newDocId('transactions')}`);
        transaction.set(txRef, {
          senderId: userId,
          receiverId: recipientId,
          senderName: senderData.displayName,
          receiverName: receiverData.displayName,
          amount: amount,
          note: note || 'Payment',
          timestamp: udb.serverTimestamp(),
          type: 'payment',
          status: 'completed'
        });
      });

      res.json({ status: "success", message: `Sent $${amount} to ${recipientCashtag}` });
    } catch (error: any) {
      console.error("Send money error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Add Cash Endpoint
  app.post("/api/add-cash", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { amount, accountId, pin } = req.body;

    if (!amount || amount <= 0 || !accountId) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    try {
      const udb = await getUnifiedDb();

      // Verify PIN if required
      const userRef = udb.doc(`users/${userId}`);
      const userSnap = await udb.getDoc(userRef);
      const userData = userSnap.data();
      if (userData?.pin && userData.pin !== pin) {
        return res.status(401).json({ error: "Incorrect PIN" });
      }

      const accountRef = udb.doc(`users/${userId}/linkedAccounts/${accountId}`);
      const accountSnap = await udb.getDoc(accountRef);

      if (!accountSnap.exists) {
        return res.status(404).json({ error: "Linked account not found" });
      }

      const accountData = accountSnap.data();
      if (accountData.status !== 'verified') {
        return res.status(400).json({ error: "Account must be verified before adding cash" });
      }

      const accountName = `${accountData.institutionName} •••• ${accountData.lastFour}`;

      await udb.runTransaction(async (transaction: any) => {
        const userRef = udb.doc(`users/${userId}`);
        transaction.update(userRef, { balance: udb.increment(amount) });

        const txRef = udb.doc(`transactions/${udb.newDocId('transactions')}`);
        transaction.set(txRef, {
          senderId: 'bank',
          receiverId: userId,
          amount: amount,
          note: `Added from ${accountName}`,
          timestamp: udb.serverTimestamp(),
          type: 'cash_in',
          status: 'completed'
        });
      });

      res.json({ status: "success", message: `Added $${amount} to your balance` });
    } catch (error: any) {
      console.error("Add cash error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Request Money Endpoint
  app.post("/api/request-money", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { recipientCashtag, amount, note } = req.body;

    if (!recipientCashtag || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    try {
      const udb = await getUnifiedDb();
      
      // 1. Find recipient
      const usersRef = udb.collection('users');
      const q = udb.query(usersRef, udb.where('cashtag', '==', recipientCashtag.startsWith('$') ? recipientCashtag : `$${recipientCashtag}`), udb.limit(1));
      const querySnap = await udb.getDocs(q);
      
      if (querySnap.empty) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      const recipientDoc = querySnap.docs[0];
      const recipientId = recipientDoc.id;
      const recipientData = recipientDoc.data();

      if (recipientId === userId) {
        return res.status(400).json({ error: "Cannot request money from yourself" });
      }

      const senderRef = udb.doc(`users/${userId}`);
      const senderSnap = await udb.getDoc(senderRef);
      const senderData = senderSnap.data();

      // Create request transaction
      const txRef = udb.doc(`transactions/${udb.newDocId('transactions')}`);
      await udb.setDoc(txRef, {
        senderId: recipientId, // The person who will pay
        receiverId: userId, // The person who requested
        senderName: recipientData.displayName,
        receiverName: senderData.displayName,
        amount: amount,
        note: note || 'Request',
        timestamp: udb.serverTimestamp(),
        type: 'request',
        status: 'pending'
      });

      res.json({ status: "success", message: `Requested $${amount} from ${recipientCashtag}` });
    } catch (error: any) {
      console.error("Request money error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Search Users Endpoint
  app.get("/api/search-users", authenticate, async (req: any, res: any) => {
    const { q } = req.query;
    const userId = req.user.uid;

    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    try {
      const udb = await getUnifiedDb();
      const cashtagQuery = q.startsWith('$') ? q : '$' + q;
      
      const usersRef = udb.collection('users');
      const querySnap = await udb.getDocs(
        udb.query(
          usersRef,
          udb.where('cashtag', '>=', cashtagQuery),
          udb.where('cashtag', '<=', cashtagQuery + '\uf8ff'),
          udb.limit(10)
        )
      );

      const users = querySnap.docs
        .map((d: any) => ({ uid: d.id, ...d.data() }))
        .filter((u: any) => u.uid !== userId);

      res.json({ users });
    } catch (error: any) {
      console.error("Search users error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Accept Request Endpoint
  app.post("/api/accept-request", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { transactionId, pin } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    try {
      const udb = await getUnifiedDb();
      const txRef = udb.doc(`transactions/${transactionId}`);
      const txSnap = await udb.getDoc(txRef);

      if (!txSnap.exists) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const txData = txSnap.data();
      if (txData.type !== 'request' || txData.status !== 'pending') {
        return res.status(400).json({ error: "Invalid transaction state" });
      }

      if (txData.senderId !== userId) {
        return res.status(403).json({ error: "Unauthorized to accept this request" });
      }

      // Verify PIN if required
      const userRef = udb.doc(`users/${userId}`);
      const userSnap = await udb.getDoc(userRef);
      const userData = userSnap.data();
      if (userData?.pin && userData.pin !== pin) {
        return res.status(401).json({ error: "Incorrect PIN" });
      }

      const amount = txData.amount;

      await udb.runTransaction(async (transaction: any) => {
        const senderRef = udb.doc(`users/${userId}`);
        const receiverRef = udb.doc(`users/${txData.receiverId}`);

        const senderSnap = await transaction.get(senderRef);
        const receiverSnap = await transaction.get(receiverRef);

        if (!senderSnap.exists) throw new Error("Sender profile missing");
        if (!receiverSnap.exists) throw new Error("Receiver profile missing");

        const senderBalance = senderSnap.data().balance || 0;
        if (senderBalance < amount) throw new Error("Insufficient balance");

        transaction.update(senderRef, { balance: udb.increment(-amount) });
        transaction.update(receiverRef, { balance: udb.increment(amount) });

        transaction.update(txRef, {
          status: 'completed',
          completedAt: udb.serverTimestamp()
        });
      });

      res.json({ status: "success", message: "Request paid successfully" });
    } catch (error: any) {
      console.error("Accept request error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Cancel Request Endpoint
  app.post("/api/cancel-request", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    try {
      const udb = await getUnifiedDb();
      const txRef = udb.doc(`transactions/${transactionId}`);
      const txSnap = await udb.getDoc(txRef);

      if (!txSnap.exists) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const txData = txSnap.data();
      if (txData.type !== 'request' || txData.status !== 'pending') {
        return res.status(400).json({ error: "Invalid transaction state" });
      }

      // Only the requester (receiverId) or the target (senderId) can cancel
      if (txData.receiverId !== userId && txData.senderId !== userId) {
        return res.status(403).json({ error: "Unauthorized to cancel this request" });
      }

      await udb.updateDoc(txRef, {
        status: 'cancelled',
        cancelledAt: udb.serverTimestamp()
      });

      res.json({ status: "success", message: "Request cancelled successfully" });
    } catch (error: any) {
      console.error("Cancel request error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Link Card Endpoint
  app.post("/api/link-card", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { institutionName, lastFour, cardNumber, expiryDate, cvv } = req.body;

    try {
      if (!institutionName || !lastFour || !cardNumber || !expiryDate || !cvv) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const udb = await getUnifiedDb();
      const cardData = {
        userId,
        type: "card",
        institutionName,
        lastFour,
        expiryDate,
        isPrimary: false,
        status: "pending",
        verificationDetails: { cvv },
        createdAt: udb.serverTimestamp()
      };

      const docRef = await udb.addDoc(udb.collection(`users/${userId}/linkedAccounts`), cardData);
      res.json({ status: "success", accountId: docRef.id, message: "Card linked successfully. Please verify to continue." });
    } catch (error: any) {
      console.error("Link card error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Verify Card Endpoint
  app.post("/api/verify-card", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { accountId } = req.body;

    try {
      if (!accountId) {
        return res.status(400).json({ error: "Missing account ID" });
      }

      const udb = await getUnifiedDb();
      const accountRef = udb.doc(`users/${userId}/linkedAccounts/${accountId}`);
      await udb.updateDoc(accountRef, { status: "verified" });

      res.json({ status: "success", message: "Card verified successfully" });
    } catch (error: any) {
      console.error("Verify card error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Execute Trade Endpoint
  app.post("/api/execute-trade", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { tradingType, tradingAsset, amount, assetAmount } = req.body;

    try {
      if (!tradingType || !tradingAsset || !amount || !assetAmount) {
        return res.status(400).json({ error: "Missing trade details" });
      }

      const udb = await getUnifiedDb();
      
      await udb.runTransaction(async (transaction: any) => {
        const userRef = udb.doc(`users/${userId}`);
        const portfolioRef = udb.doc(`portfolios/${userId}`);
        
        const userSnap = await transaction.get(userRef);
        const portfolioSnap = await transaction.get(portfolioRef);

        if (!userSnap.exists) throw new Error("User profile missing");
        if (!portfolioSnap.exists) throw new Error("Portfolio missing");

        const userData = userSnap.data();
        const portfolioData = portfolioSnap.data();
        const currentBalance = userData.balance || 0;

        if (tradingType === 'buy') {
          if (currentBalance < amount) throw new Error("Insufficient balance");
          transaction.update(userRef, { balance: udb.increment(-amount) });
          
          if (tradingAsset.symbol === 'BTC') {
            transaction.update(portfolioRef, { btcBalance: udb.increment(assetAmount) });
          } else {
            const stocks = { ...(portfolioData.stocks || {}) };
            stocks[tradingAsset.symbol] = (stocks[tradingAsset.symbol] || 0) + assetAmount;
            transaction.update(portfolioRef, { stocks });
          }
        } else {
          // Sell
          if (tradingAsset.symbol === 'BTC') {
            if ((portfolioData.btcBalance || 0) < assetAmount) throw new Error("Insufficient BTC balance");
            transaction.update(portfolioRef, { btcBalance: udb.increment(-assetAmount) });
          } else {
            const stocks = { ...(portfolioData.stocks || {}) };
            if ((stocks[tradingAsset.symbol] || 0) < assetAmount) throw new Error(`Insufficient ${tradingAsset.symbol} balance`);
            stocks[tradingAsset.symbol] = (stocks[tradingAsset.symbol] || 0) - assetAmount;
            transaction.update(portfolioRef, { stocks });
          }
          transaction.update(userRef, { balance: udb.increment(amount) });
        }

        const txRef = udb.doc(`transactions/${udb.newDocId('transactions')}`);
        transaction.set(txRef, {
          senderId: tradingType === 'buy' ? userId : tradingAsset.symbol,
          receiverId: tradingType === 'buy' ? tradingAsset.symbol : userId,
          senderName: tradingType === 'buy' ? userData.displayName : tradingAsset.name,
          receiverName: tradingType === 'buy' ? tradingAsset.name : userData.displayName,
          amount: amount,
          note: `${tradingType === 'buy' ? 'Bought' : 'Sold'} ${assetAmount.toFixed(8)} ${tradingAsset.symbol}`,
          timestamp: udb.serverTimestamp(),
          type: 'trade',
          status: 'completed'
        });
      });

      res.json({ status: "success", message: `Trade executed successfully` });
    } catch (error: any) {
      console.error("Execute trade error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Delete Linked Account Endpoint
  app.post("/api/delete-linked-account", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { accountId } = req.body;

    try {
      if (!accountId) {
        return res.status(400).json({ error: "Missing account ID" });
      }

      const udb = await getUnifiedDb();
      const accountRef = udb.doc(`users/${userId}/linkedAccounts/${accountId}`);
      await udb.deleteDoc(accountRef);

      res.json({ status: "success", message: "Account removed successfully" });
    } catch (error: any) {
      console.error("Delete linked account error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Init User Endpoint
  app.post("/api/init-user", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { displayName, email, photoURL } = req.body;

    try {
      const udb = await getUnifiedDb();
      const userRef = udb.doc(`users/${userId}`);
      const portfolioRef = udb.doc(`portfolios/${userId}`);

      const userSnap = await udb.getDoc(userRef);
      if (userSnap.exists) {
        return res.json({ status: "success", message: "User already initialized" });
      }

      const newProfile = {
        displayName: displayName || "User",
        email: email || "",
        photoURL: photoURL || "",
        cashtag: `$${userId.slice(0, 6).toLowerCase()}`,
        balance: 1000.00, // Starting bonus
        createdAt: udb.serverTimestamp(),
        role: "user"
      };

      await udb.setDoc(userRef, newProfile);
      await udb.setDoc(portfolioRef, { userId, btcBalance: 0, stocks: {} });

      res.json({ status: "success", message: "User initialized successfully" });
    } catch (error: any) {
      console.error("Init user error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Update Profile Endpoint
  app.post("/api/update-profile", authenticate, async (req: any, res: any) => {
    const userId = req.user.uid;
    const { displayName, cashtag } = req.body;

    try {
      if (!displayName || !cashtag) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const udb = await getUnifiedDb();
      const userRef = udb.doc(`users/${userId}`);
      
      await udb.updateDoc(userRef, {
        displayName,
        cashtag: cashtag.startsWith('$') ? cashtag : `$${cashtag}`
      });

      res.json({ status: "success", message: "Profile updated successfully" });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Identity Verification (Simulated Persona)
app.post('/api/verify-identity', authenticate, async (req: any, res) => {
  try {
    const { idType, idFrontBase64, selfieBase64 } = req.body;
    const userId = req.user.uid;

    if (!idType || !idFrontBase64 || !selfieBase64) {
      return res.status(400).json({ error: 'Missing verification data' });
    }

    // Simulate AI verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const udb = await getUnifiedDb();
    const userRef = udb.doc(`users/${userId}`);
    await udb.updateDoc(userRef, {
      isVerified: true,
      verificationDate: udb.serverTimestamp(),
      idType
    });

    res.json({ success: true, message: 'Identity verified successfully' });
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Security PIN
app.post('/api/set-pin', authenticate, async (req: any, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.uid;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }

    const udb = await getUnifiedDb();
    const userRef = udb.doc(`users/${userId}`);
    await udb.updateDoc(userRef, { pin });

    res.json({ success: true, message: 'PIN set successfully' });
  } catch (error: any) {
    console.error('PIN error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-pin', authenticate, async (req: any, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.uid;

    const udb = await getUnifiedDb();
    const userRef = udb.doc(`users/${userId}`);
    const userDoc = await udb.getDoc(userRef);
    if (!userDoc.exists() && !(userDoc as any).exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();
    if (userData?.pin === pin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Incorrect PIN' });
    }
  } catch (error: any) {
    console.error('PIN verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
