import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase";
import "./index.css";

function App() {
  const [user, setUser] = useState(null);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {user ? (
          <div>
            <h1>Welcome, {user.displayName}</h1>
            <img
              src={user.photoURL}
              alt="user avatar"
              style={{ borderRadius: "50%", height: "100px", width: "100px" }}
            />
          </div>
        ) : (
          <div>
            <img src="/logo.svg" className="logo" alt="logo" />
            <h1>Welcome Back</h1>
            <p>The simplest way to manage your money.</p>
            <button onClick={handleGoogleSignIn} className="google-sign-in-button">
              Sign In with Google
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
