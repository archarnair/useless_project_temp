<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# Head-Tilt Flappy Bird 🦅📐

> A classic Flappy Bird clone, but your bird's altitude is controlled strictly by how far you tilt your head left or right. 
> 
> **The Joke:** Watching someone aggressively snap their neck back and forth just to dodge a green pipe.

---

## Basic Details
### Team Name: NEBULA

### Team Members
- Member 1: ARCHA R NAIR
- Member 2: VRINDA LAKSHMI 

### Project Description
A hilarious computer-vision webcam game where real-time facial landmark tracking computes the angle between your eyes. Tilting your head left generates upward lift, tilting right dives, and rapid neck snaps trigger comedic chiropractic warnings and sound effects!

### The Problem (that doesn't exist)
Tapping a screen or pressing a spacebar to play Flappy Bird is far too convenient, comfortable, and risk-free. Modern humans have far too little strain on their sternocleidomastoid muscles and look far too dignified sitting at their desks.

### The Solution (that nobody asked for)
Remove all keyboard and touch inputs. Force the player to violently jerk and snap their head side to side at 60 FPS in front of their webcam to navigate through retro green pipes. Includes a real-time "Neck-O-Meter", a cervical whiplash detector, and synthesized 8-bit sound effects.

---

## Technical Details

### Technologies Used
- **Frontend / Graphics:** HTML5 Canvas 2D engine (60 FPS, procedural retro pipes, parallax scrolling skyline & clouds)
- **Computer Vision & Tracking:** MediaPipe Face Mesh running client-side at 60 FPS (eye landmark angle calculation with zero latency)
- **Audio Synthesizer:** Web Audio API (100% code-synthesized 8-bit sounds for flaps, score chimes, collisions, and neck snaps)
- **Styling:** CSS3 retro arcade neon styling with responsive glassmorphism HUD

---

## 🎮 How It Works

1. **Eye Landmark Angle Calculation:**
   Tracks facial landmarks in real time and calculates the angle vector between your eyes:
    θ = atan2(y_right - y_left, x_right - x_left) × 180/π

3. **Flight Controls:**
   - **Tilt Head Left (ear to left shoulder):** Upward lift 🚀 — instant upward impulse, flaps wings, and ascends.
   - **Tilt Head Right (ear to right shoulder):** Dive 🔻 — tucks wings and plunges downward.
   - **Level Pose:** Glide ⏸️ — gentle neutral sink.

4. **Neck-O-Meter & Neck Snap Counter:**
   - Live spirit-level bubble gauge showing calibrated degrees of tilt.
   - Angular velocity detection triggers cartoon pops and bonus "Neck Snaps" when violently flicking your head.
   - Post-game comedic chiropractic diagnosis.

5. **Keyboard Fallback (for testing without camera):**
   - Press **A** / **←** to tilt Left.
   - Press **D** / **→** to tilt Right.
   - Press **Spacebar** to Start / Restart.

---

## 🚀 How to Run

Because the webcam uses modern browser security (`getUserMedia`), run it over `http://localhost` or `https://`:

### Option 1: Double-Click
Double-click `run.bat` to launch the local server and open your browser automatically.

### Option 2: Command Line
```powershell
# From the project folder:
python -m http.server 8080
```
Then open **http://localhost:8080** in your browser.

---

Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)
