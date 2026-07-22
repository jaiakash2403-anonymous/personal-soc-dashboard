import subprocess
import sys
import os

def build():
    print("Building Personal SOC Dashboard (v2.1)...")
    
    # In Windows, we use a semicolon separator. On other systems, we use a colon.
    sep = ';' if sys.platform.startswith('win') else ':'
    
    # Locate pyinstaller within the virtual environment
    pyinstaller_name = "pyinstaller.exe" if sys.platform.startswith('win') else "pyinstaller"
    pyinstaller_path = os.path.join(sys.prefix, 'Scripts', pyinstaller_name)
    
    if not os.path.exists(pyinstaller_path):
        # Fallback to local relative .venv path
        pyinstaller_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.venv', 'Scripts', pyinstaller_name)
        
    if not os.path.exists(pyinstaller_path):
        pyinstaller_path = "pyinstaller" # System path fallback
        
    print(f"Using PyInstaller: {pyinstaller_path}")
    
    # --- PHASE 1: BUILD MAIN SOC APPLICATION ---
    print("\n[PHASE 1] Packaging Main Telemetry Application...")
    cmd_main = [
        f'"{pyinstaller_path}"',
        "--onefile",
        "--noconsole",
        f"--add-data=frontend{sep}frontend",
        "--icon=icon.ico",
        "--version-file=version_info_app.txt",
        "--name=PersonalSOC",
        "app.py"
    ]
    
    print(f"Running command: {' '.join(cmd_main)}")
    result_main = subprocess.run(" ".join(cmd_main), shell=True)
    
    if result_main.returncode != 0:
        print(f"\nPhase 1 failed with exit code: {result_main.returncode}")
        sys.exit(1)
        
    print("\nPhase 1 Succeeded: generated dist/PersonalSOC.exe")

    # --- PHASE 2: BUILD SETUP WIZARD INSTALLER ---
    print("\n[PHASE 2] Packaging Visual Setup Wizard Installer...")
    
    # Bundle both compiled app and seeded database into the installer resource payload
    cmd_setup = [
        f'"{pyinstaller_path}"',
        "--onefile",
        "--noconsole",
        f"--add-data=dist/PersonalSOC.exe{sep}.",
        f"--add-data=dist/soc_dashboard.db{sep}.",
        "--icon=icon.ico",
        "--version-file=version_info_setup.txt",
        "--name=PersonalSOC_Setup",
        "setup_wizard.py"
    ]
    
    print(f"Running command: {' '.join(cmd_setup)}")
    result_setup = subprocess.run(" ".join(cmd_setup), shell=True)
    
    if result_setup.returncode != 0:
        print(f"\nPhase 2 failed with exit code: {result_setup.returncode}")
        sys.exit(1)
        
    print("\n==================================================")
    print("BUILD SUCCESSFUL!")
    print("Main Application: dist/PersonalSOC.exe")
    print("Setup Installer Wizard: dist/PersonalSOC_Setup.exe")
    print("==================================================")

if __name__ == "__main__":
    build()
