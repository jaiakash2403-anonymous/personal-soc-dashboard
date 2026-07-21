# AURA - Personal SOC Dashboard

AURA is a lightweight, modern, and visually stunning Security Operations Center (SOC) dashboard designed for personal endpoints (PCs). It scans local configurations, monitors active network socket connections, calculates data throughput, checks password health policies, and provides immediate warnings and alarms when critical threat vectors are detected.

![License](https://img.shields.io/badge/License-MIT-indigo)
![Platform](https://img.shields.io/badge/Platform-Windows-blue)
![Language](https://img.shields.io/badge/Language-Python%20%2F%20HTML%20%2F%20JS-emerald)

---

## ✨ Features

- 🛡️ **Endpoint Audits**: Scans active Windows Defender Firewall profiles and validates Guest account permissions.
- 🔑 **Credentials Auditing**: Flags plaintext files on your Desktop or Documents containing passwords or credentials (e.g. `passwords.txt`).
- 🌐 **Live Sockets Diagnostics**: Lists active TCP network connections mapped directly to their process owners (e.g., `chrome.exe`, `discord.exe`).
- 📉 **Real-Time Bandwidth**: Plots live CPU, RAM, and Network upload/download throughput speeds.
- 🔌 **Hardware Auditing**: Lists historical USB storage devices mounted to the computer.
- 🚨 **Alarms & Threat Scoring**: Deducts scores based on threat severity, showing warning grades. Triggers modal popups and plays synthesized audio warning chimes for critical threats.
- 👥 **Role-Based Access Control (RBAC)**: Supports admin and standard user accounts. Administrators can audit the scores and registration metrics of all user endpoints on the device.

---

## 🛠️ Installation & Local Development

### Prerequisites
- Python 3.10+
- Windows OS (designed for host-level telemetry)

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/personal-soc-dashboard.git
   cd personal-soc-dashboard
   ```
2. Initialize virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install pywebview pyinstaller psutil
   ```
4. Run in Developer Mode:
   ```bash
   python app.py
   ```

---

## 📦 Bundling the Standalone Executable (.exe)

To compile the application into a single, windowed Windows executable:
1. Ensure the virtual environment is active.
2. Run the build script:
   ```bash
   python build.py
   ```
3. The standalone executable will be generated at **`dist/PersonalSOC.exe`**.

---

## 🚀 How to Share and Distribute (GitHub Releases)

We recommend sharing the compiled application using **GitHub Releases** rather than committing the large binary `.exe` to source history:

1. Create a repository on GitHub.
2. Commit and push the source code (the included `.gitignore` will safely exclude virtual environments, database credentials, and build outputs).
3. On GitHub, navigate to **Releases** > **Draft a new release**.
4. Set a tag (e.g., `v1.0.0`) and title (e.g., `Release v1.0.0`).
5. Drag and drop the compiled **`dist/PersonalSOC.exe`** into the release assets area.
6. Publish the release. Users can now download the executable directly from your GitHub page with a single click!
