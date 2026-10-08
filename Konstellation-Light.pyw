# Lanceur graphique Windows — double-clic avec Python 3.10+ et tkinter.
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tools.light_gui import main
if __name__ == "__main__":
    main("welcome")
