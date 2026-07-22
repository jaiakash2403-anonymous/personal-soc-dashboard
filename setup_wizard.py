import os
import sys
import shutil
import subprocess
import tkinter as tk
from tkinter import messagebox, filedialog
from tkinter import ttk

class SetupWizard:
    def __init__(self, root):
        self.root = root
        self.root.title("AURA Personal SOC - Setup Wizard (v2.0)")
        self.root.geometry("540x380")
        self.root.resizable(False, False)
        
        # Design system styles (matching Aura SOC Dashboard light premium look)
        self.root.configure(bg="#f8fafc")
        
        # Style configurations
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.style.configure('TProgressbar', thickness=14, troughcolor='#f1f5f9', background='#4f46e5')
        
        # Install settings
        self.default_dir = os.path.join(os.environ.get("LOCALAPPDATA", "C:\\"), "Programs", "AuraPersonalSOC")
        self.install_dir = self.default_dir
        self.create_desktop_shortcut = tk.BooleanVar(value=True)
        self.create_start_shortcut = tk.BooleanVar(value=True)
        self.launch_after = tk.BooleanVar(value=True)
        
        # Tracking installer screens (0: Welcome, 1: Folder Selection, 2: Installing, 3: Success)
        self.current_step = 0
        self.frames = []
        
        self.init_frames()
        self.show_step(0)

    def get_resource_path(self, relative_path):
        """Locates bundled assets if running under PyInstaller container"""
        if hasattr(sys, '_MEIPASS'):
            return os.path.join(sys._MEIPASS, relative_path)
        return os.path.join(os.path.abspath("."), relative_path)

    def init_frames(self):
        # Step 0: Welcome Frame
        f0 = tk.Frame(self.root, bg="#f8fafc", padx=24, pady=24)
        lbl_welcome_title = tk.Label(f0, text="Welcome to the AURA Personal SOC Setup Wizard", font=("Outfit", 15, "bold"), fg="#0f172a", bg="#f8fafc", justify="left")
        lbl_welcome_title.pack(anchor="w", pady=(0, 12))
        
        lbl_welcome_desc = tk.Label(f0, text="This setup wizard will install AURA Personal SOC (v2.0) on your computer.\n\nIt is recommended to close all other applications before continuing.\n\nClick Next to proceed with the installation.", font=("Inter", 10), fg="#475569", bg="#f8fafc", justify="left", wraplength=480)
        lbl_welcome_desc.pack(anchor="w", pady=(0, 24))
        self.frames.append(f0)
        
        # Step 1: Folder Selection Frame
        f1 = tk.Frame(self.root, bg="#f8fafc", padx=24, pady=24)
        lbl_folder_title = tk.Label(f1, text="Select Installation Folder", font=("Outfit", 14, "bold"), fg="#0f172a", bg="#f8fafc")
        lbl_folder_title.pack(anchor="w", pady=(0, 12))
        
        lbl_folder_desc = tk.Label(f1, text="Setup will install AURA Personal SOC in the following folder. To install in a different folder, click Browse and select another folder path.", font=("Inter", 9), fg="#475569", bg="#f8fafc", justify="left", wraplength=480)
        lbl_folder_desc.pack(anchor="w", pady=(0, 16))
        
        # Dir Selection Box
        dir_frame = tk.Frame(f1, bg="#f8fafc")
        dir_frame.pack(fill="x", pady=(0, 16))
        self.ent_dir = tk.Entry(dir_frame, font=("JetBrains Mono", 9), bg="#ffffff", fg="#0f172a", bd=1, relief="solid", highlightthickness=0)
        self.ent_dir.insert(0, self.install_dir)
        self.ent_dir.pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))
        
        btn_browse = tk.Button(dir_frame, text="Browse...", font=("Inter", 9, "bold"), bg="#f1f5f9", fg="#0f172a", relief="flat", command=self.browse_folder, padx=12, pady=4)
        btn_browse.pack(side="right")
        
        # Shortcut Options
        chk_desktop = tk.Checkbutton(f1, text="Create Desktop Shortcut", variable=self.create_desktop_shortcut, font=("Inter", 9), fg="#475569", bg="#f8fafc", activebackground="#f8fafc")
        chk_desktop.pack(anchor="w", pady=4)
        chk_start = tk.Checkbutton(f1, text="Add to Start Menu Programs", variable=self.create_start_shortcut, font=("Inter", 9), fg="#475569", bg="#f8fafc", activebackground="#f8fafc")
        chk_start.pack(anchor="w", pady=4)
        self.frames.append(f1)
        
        # Step 2: Installing Frame
        f2 = tk.Frame(self.root, bg="#f8fafc", padx=24, pady=24)
        lbl_installing_title = tk.Label(f2, text="Installing AURA Personal SOC...", font=("Outfit", 14, "bold"), fg="#0f172a", bg="#f8fafc")
        lbl_installing_title.pack(anchor="w", pady=(0, 16))
        
        self.lbl_status = tk.Label(f2, text="Preparing installation scripts...", font=("Inter", 9), fg="#475569", bg="#f8fafc")
        self.lbl_status.pack(anchor="w", pady=(0, 8))
        
        self.progress = ttk.Progressbar(f2, orient="horizontal", mode="determinate", length=480, style='TProgressbar')
        self.progress.pack(anchor="w", pady=(0, 12))
        self.frames.append(f2)
        
        # Step 3: Success Frame
        f3 = tk.Frame(self.root, bg="#f8fafc", padx=24, pady=24)
        lbl_success_title = tk.Label(f3, text="Installation Completed Successfully", font=("Outfit", 15, "bold"), fg="#10b981", bg="#f8fafc")
        lbl_success_title.pack(anchor="w", pady=(0, 12))
        
        lbl_success_desc = tk.Label(f3, text="AURA Personal SOC (v2.0) has been installed on your PC.\n\nClick Finish to exit this wizard.", font=("Inter", 10), fg="#475569", bg="#f8fafc", justify="left", wraplength=480)
        lbl_success_desc.pack(anchor="w", pady=(0, 24))
        
        chk_launch = tk.Checkbutton(f3, text="Launch AURA Personal SOC now", variable=self.launch_after, font=("Inter", 10, "bold"), fg="#4f46e5", bg="#f8fafc", activebackground="#f8fafc")
        chk_launch.pack(anchor="w")
        self.frames.append(f3)
        
        # Navigation Bar (Footer)
        self.nav_bar = tk.Frame(self.root, bg="#f1f5f9", height=52)
        self.nav_bar.pack(side="bottom", fill="x")
        self.nav_bar.pack_propagate(False)
        
        self.btn_cancel = tk.Button(self.nav_bar, text="Cancel", font=("Inter", 9), bg="#ffffff", fg="#64748b", relief="flat", command=self.root.quit, padx=16, pady=4)
        self.btn_cancel.pack(side="right", padx=16, pady=12)
        
        self.btn_next = tk.Button(self.nav_bar, text="Next >", font=("Inter", 9, "bold"), bg="#4f46e5", fg="#ffffff", relief="flat", command=self.go_next, padx=20, pady=4)
        self.btn_next.pack(side="right", pady=12)
        
        self.btn_back = tk.Button(self.nav_bar, text="< Back", font=("Inter", 9), bg="#ffffff", fg="#475569", relief="flat", command=self.go_back, padx=16, pady=4)
        self.btn_back.pack(side="right", padx=8, pady=12)

    def show_step(self, step_idx):
        # Hide all frames
        for f in self.frames:
            f.pack_forget()
        
        # Display active frame
        self.frames[step_idx].pack(fill="both", expand=True)
        self.current_step = step_idx
        
        # Configure Footer navigation buttons
        if step_idx == 0:
            self.btn_back.config(state="disabled")
            self.btn_next.config(text="Next >", state="normal")
            self.btn_cancel.config(state="normal")
        elif step_idx == 1:
            self.btn_back.config(state="normal")
            self.btn_next.config(text="Install", state="normal")
            self.btn_cancel.config(state="normal")
        elif step_idx == 2:
            self.btn_back.config(state="disabled")
            self.btn_next.config(state="disabled")
            self.btn_cancel.config(state="disabled")
        elif step_idx == 3:
            self.btn_back.config(state="disabled")
            self.btn_next.config(text="Finish", state="normal")
            self.btn_cancel.config(state="disabled")

    def go_back(self):
        if self.current_step > 0:
            self.show_step(self.current_step - 1)

    def go_next(self):
        if self.current_step == 0:
            self.show_step(1)
        elif self.current_step == 1:
            self.install_dir = self.ent_dir.get().strip()
            self.show_step(2)
            self.root.after(100, self.perform_installation)
        elif self.current_step == 3:
            if self.launch_after.get():
                target_exe = os.path.join(self.install_dir, "PersonalSOC.exe")
                if os.path.exists(target_exe):
                    subprocess.Popen([target_exe], cwd=self.install_dir)
            self.root.quit()

    def browse_folder(self):
        chosen = filedialog.askdirectory(initialdir=self.install_dir, title="Choose Installation Folder")
        if chosen:
            self.install_dir = os.path.normpath(chosen)
            self.ent_dir.delete(0, tk.END)
            self.ent_dir.insert(0, self.install_dir)

    def write_shortcut(self, target_path, working_dir, shortcut_path):
        """Uses temporary VBScript script to safely write shortcuts without requiring extra libs"""
        vbs_path = os.path.join(working_dir, "create_lnk.vbs")
        vbs_content = f"""
Set shell = CreateObject("WScript.Shell")
Set shortcut = shell.CreateShortcut("{shortcut_path}")
shortcut.TargetPath = "{target_path}"
shortcut.WorkingDirectory = "{working_dir}"
shortcut.Save()
"""
        try:
            with open(vbs_path, 'w', encoding='utf-8') as f:
                f.write(vbs_content.strip())
            
            # Execute VBScript silently
            subprocess.run(["wscript.exe", vbs_path], check=True)
            os.remove(vbs_path)
        except Exception as e:
            print(f"Error creating shortcut link: {e}")

    def perform_installation(self):
        try:
            # 0. Check if target executable is locked/running
            try:
                tasklist_out = subprocess.check_output('tasklist /FI "IMAGENAME eq PersonalSOC.exe"', shell=True, text=True, creationflags=0x08000000)
                if "PersonalSOC.exe" in tasklist_out:
                    ans = messagebox.askyesno("Process Running", "AURA Personal SOC (PersonalSOC.exe) is currently running.\n\nWould you like the installer to automatically close it to proceed?")
                    if ans:
                        subprocess.run("taskkill /F /IM PersonalSOC.exe", shell=True, creationflags=0x08000000)
                        import time
                        time.sleep(1.5)
                    else:
                        raise PermissionError("Installation cancelled because target file is in use. Please close Personal SOC and retry.")
            except Exception as e:
                if isinstance(e, PermissionError):
                    raise e

            # 1. Create target directory
            self.lbl_status.config(text="Creating target folders...")
            self.progress['value'] = 20
            self.root.update()
            os.makedirs(self.install_dir, exist_ok=True)
            
            # 2. Copy Executable
            self.lbl_status.config(text="Copying executable binaries...")
            self.progress['value'] = 45
            self.root.update()
            
            # Try to grab executable from resources or source directory
            src_exe = self.get_resource_path("PersonalSOC.exe")
            if not os.path.exists(src_exe):
                # Fallback to local dist directory if running in dev folder
                src_exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "PersonalSOC.exe")
                
            if not os.path.exists(src_exe):
                raise FileNotFoundError("Compiled executable PersonalSOC.exe not found. Please build it first.")
                
            dest_exe = os.path.join(self.install_dir, "PersonalSOC.exe")
            shutil.copy2(src_exe, dest_exe)

            # 3. Copy Database if exists, otherwise initialize it next to the binary
            self.lbl_status.config(text="Initializing local telemetry database...")
            self.progress['value'] = 65
            self.root.update()
            
            src_db = self.get_resource_path("soc_dashboard.db")
            if not os.path.exists(src_db):
                src_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "soc_dashboard.db")
                
            if os.path.exists(src_db):
                shutil.copy2(src_db, os.path.join(self.install_dir, "soc_dashboard.db"))

            # 4. Generate Windows Shortcuts
            self.lbl_status.config(text="Configuring registry and shortcuts...")
            self.progress['value'] = 85
            self.root.update()
            
            if self.create_desktop_shortcut.get():
                desktop = os.path.join(os.path.expanduser("~"), "Desktop")
                shortcut_path = os.path.join(desktop, "Personal SOC Dashboard.lnk")
                self.write_shortcut(dest_exe, self.install_dir, shortcut_path)
                
            if self.create_start_shortcut.get():
                start_menu = os.path.join(os.environ.get("APPDATA", "C:\\"), "Microsoft", "Windows", "Start Menu", "Programs")
                shortcut_path = os.path.join(start_menu, "Personal SOC Dashboard.lnk")
                self.write_shortcut(dest_exe, self.install_dir, shortcut_path)

            self.lbl_status.config(text="Finishing setup...")
            self.progress['value'] = 100
            self.root.update()
            
            # Switch to Success view
            self.root.after(300, lambda: self.show_step(3))
            
        except Exception as e:
            messagebox.showerror("Installation Error", f"The installation failed with error:\n\n{str(e)}")
            self.show_step(1)

def main():
    root = tk.Tk()
    app = SetupWizard(root)
    root.mainloop()

if __name__ == "__main__":
    main()
