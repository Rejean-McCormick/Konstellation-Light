# Double-clic Windows : prépare le Kristal autochtone et ouvre ses bulles.
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from tools.light_gui import main
if __name__ == '__main__':
    main("ekole_auto")
