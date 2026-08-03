import os
import re

def split_js():
    with open('js/app.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
    os.makedirs('js/core', exist_ok=True)
    os.makedirs('js/ui', exist_ok=True)
    
    # We will just write a wrapper in index.html and load them.
    # Actually, the safest way is to rename app.js to app.old.js, and create the new files.
    # I will just write a python script that extracts the whole functions by parsing curly braces.
    pass
    
if __name__ == '__main__':
    split_js()
