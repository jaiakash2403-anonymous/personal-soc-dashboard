# AURA - Personal SOC Dashboard

AURA is a lightweight, modern, and visually stunning Security Operations Center (SOC) dashboard designed for personal endpoints (PCs). It scans local configurations, monitors active network socket connections, calculates data throughput, checks password health policies, and provides immediate warnings and alarms when critical threat vectors are detected.

![License](https://img.shields.io/badge/License-MIT-indigo)
![Platform](https://img.shields.io/badge/Platform-Windows-blue)
![Language](https://img.shields.io/badge/Language-Python%20%2F%20HTML%20%2F%20JS-emerald)

---

## 🚀 End-User Installation Guide (Step-by-Step)

Follow these instructions to download, install, and configure AURA on your Windows PC:

### Step 1: Download the Installer Wizard
1. Open your web browser and navigate to the official repository releases page:  
   👉 **[Download AURA Personal SOC](https://github.com/jaiakash2403-anonymous/personal-soc-dashboard/releases/latest)**
2. Under the **Assets** section of the latest release, click on **`PersonalSOC_Setup.exe`** to download the setup file.

### Step 2: Run the Setup Wizard
1. Locate the downloaded **`PersonalSOC_Setup.exe`** file in your Downloads folder and double-click it.
2. The custom AURA Installation Wizard window will open. Click **Next >** on the welcome screen.
3. Select your installation folder (the wizard defaults to `AppData\Local\Programs\AuraPersonalSOC` to install safely without requiring administrator rights).
4. Check the options to create a **Desktop Shortcut** or add it to your **Start Menu Programs** as desired.
5. Click **Install**. The progress bar will load as binaries and configurations are copied.

### Step 3: Complete Installation & Launch
1. Once installation completes successfully, check the **Launch AURA Personal SOC now** box.
2. Click **Finish** to close the setup wizard. The SOC Dashboard login portal will launch automatically.

### Step 4: Accessing the Dashboard (Login Credentials)
To log in as the default administrator and start auditing endpoints:
* **Administrator Email ID:** `jaiakash2403@gmail.com`
* **Default Security Password:** `@123Abc7`

*(Alternatively, you can click **Register Account** inside the interface to set up a new standard user or administrator endpoint account local to your PC database).*

---

## 🛡️ Antivirus Troubleshooting (False Positives)

Because AURA is packaged as a standalone executable and audits host settings (Registry keys, Event logs, active network TCP sockets), Windows Defender or local Antivirus engines might flag it as a heuristic threat. 

If Windows Defender blocks the setup process or blocks the application launch:

1. Right-click the Windows **Start Menu** and select **Terminal (Admin)** or **PowerShell (Administrator)**.
2. Copy and paste the following commands to add Defender exclusions and press **Enter**:
   ```powershell
   Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\Programs\AuraPersonalSOC"
   Add-MpPreference -ExclusionProcess "PersonalSOC.exe"
   ```

---

## 🛠️ Developer Setup & Local Builds

If you wish to modify the source code or build the installer yourself:

### Prerequisites
- Python 3.10+
- Windows OS (designed for host-level telemetry)

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/jaiakash2403-anonymous/personal-soc-dashboard.git
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

### Packaging the Setup Wizard EXE
To re-compile the main application and bundle it inside a new `PersonalSOC_Setup.exe` installer:
```bash
python build.py
```
Outputs will be written to the `dist/` directory.
