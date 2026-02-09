import { useState, useEffect } from "react";
import { RefreshCw, Palette, Lock, Zap } from "lucide-react";
import { downloads } from "./config";

function App() {
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac")) setDetectedPlatform("mac");
    else if (userAgent.includes("win")) setDetectedPlatform("windows");
    else if (userAgent.includes("linux")) setDetectedPlatform("linux");
  }, []);

  return (
    <div className="app">
      <header>
        <nav className="container">
          <img
            src="/logo.png"
            alt="AWS Profile Manager"
            className="header-logo"
          />
          <h1>AWS Profile Manager</h1>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <img src="/logo.png" alt="" className="hero-logo" aria-hidden />
            <h2>Download for your platform</h2>
            <p className="tagline">
              Switch AWS profiles from your system tray—no{" "}
              <code>--profile</code> flags needed.
            </p>
          </div>
        </section>

        <section className="downloads">
          <div className="container">
            <h3>Download for Your Platform</h3>
            <div className="download-cards">
              {downloads.map((download) => (
                <div
                  key={download.platform}
                  className={`download-card ${detectedPlatform === download.platform ? "detected" : ""}`}
                >
                  <div className="platform-icon">
                    {download.platform === "mac" && (
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="9" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    )}
                    {download.platform === "windows" && (
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    )}
                    {download.platform === "linux" && (
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    )}
                  </div>
                  <h4>
                    {download.platform === "mac"
                      ? "macOS"
                      : download.platform === "windows"
                        ? "Windows"
                        : "Linux"}
                  </h4>
                  <p className="platform-desc">
                    {download.platform === "mac" && "Intel & Apple Silicon"}
                    {download.platform === "windows" && "64-bit"}
                    {download.platform === "linux" && "AppImage"}
                  </p>
                  <a href={download.url} className="download-btn" download>
                    <span className="btn-text">
                      Download{" "}
                      {download.filename.split(".").pop()?.toUpperCase()}
                    </span>
                  </a>
                  <p className="compatibility">
                    {download.platform === "mac" && "macOS 10.15+"}
                    {download.platform === "windows" && "Windows 10+"}
                    {download.platform === "linux" &&
                      "Ubuntu 18.04+, Fedora 30+"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h3>Features</h3>
            <div className="feature-grid">
              <div className="feature">
                <div className="feature-icon">
                  <RefreshCw size={40} strokeWidth={2} />
                </div>
                <h4>Quick Switching</h4>
                <p>
                  Switch between AWS profiles instantly from your system tray
                </p>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <Palette size={40} strokeWidth={2} />
                </div>
                <h4>Custom Logos</h4>
                <p>
                  Set custom logos for each account for easy visual
                  identification
                </p>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <Lock size={40} strokeWidth={2} />
                </div>
                <h4>Secure Storage</h4>
                <p>
                  Uses standard AWS credentials files with automatic backups
                </p>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <Zap size={40} strokeWidth={2} />
                </div>
                <h4>No CLI Flags</h4>
                <p>
                  No need to use <code>--profile</code> flags with every command
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>&copy; 2026 AWS Profile Manager. Open Source Project.</p>
          <p>
            <a
              href="https://github.com/shalev396/AWSProfileManager"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {" · "}
            <a
              href="https://github.com/shalev396/AWSProfileManager/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report Issue
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
