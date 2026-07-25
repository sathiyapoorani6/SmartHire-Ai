import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="container">
      <div className="card">
        <h1>SmartHire AI</h1>
        <p>AI Powered Recruitment Portal</p>

        <Link to="/admin">
          <button>Admin Login</button>
        </Link>

        <Link to="/company">
          <button>Company Login</button>
        </Link>

        <Link to="/candidate">
          <button>Candidate Login</button>
        </Link>
      </div>
    </div>
  );
}

export default Home;