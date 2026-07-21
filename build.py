import subprocess
import sys
import os

def build():
    print("Building Personal SOC Dashboard...")
    
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
    
    # We will build as a single file, windowed (no console window) executable.
    cmd = [
        f'"{pyinstaller_path}"',
        "--onefile",
        "--noconsole",
        f"--add-data=frontend{sep}frontend",
        "--name=PersonalSOC",
        "app.py"
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    
    # Run the pyinstaller process
    result = subprocess.run(" ".join(cmd), shell=True)
    
    if result.returncode == 0:
        print("\n==================================================")
        print("BUILD SUCCESSFUL!")
        print("Executable is located at: dist/PersonalSOC.exe")
        print("==================================================")
    else:
        print(f"\nBuild failed with exit code: {result.returncode}")

if __name__ == "__main__":
    build()
